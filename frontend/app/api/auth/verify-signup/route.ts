import { NextRequest, NextResponse } from "next/server";
import { verifyRegistrationCode } from "@/lib/verificationStore";
import { createUser, ensureUsersLoaded, getUserByEmailOrUsername, toUserProfile, type UserProfile } from "@/lib/userStore";
import { syncUserToGoogleSheet } from "@/lib/googleSheetService";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email = (body.email || "").trim().toLowerCase();
    const code = (body.code || "").trim();
    const verificationToken = typeof body.verificationToken === "string" ? body.verificationToken.trim() : undefined;

    if (!email || !code) {
      return NextResponse.json(
        { message: "Email and verification code are required." },
        { status: 400 }
      );
    }

    if (code.length !== 6) {
      return NextResponse.json(
        { message: "Verification code must be 6 digits." },
        { status: 400 }
      );
    }

    // Verify code against store (stateless HMAC token or local store)
    const verifyResult = verifyRegistrationCode(email, code, verificationToken);
    if (!verifyResult.success || !verifyResult.registration) {
      return NextResponse.json(
        { message: verifyResult.error || "Verification failed." },
        { status: 400 }
      );
    }

    const { registration } = verifyResult;

    // Ensure users are fresh from GitHub / disk
    await ensureUsersLoaded(true);

    // Get or create the persistent user account
    let storedUser = getUserByEmailOrUsername(registration.email);
    let userProfile: UserProfile;

    if (storedUser) {
      userProfile = toUserProfile(storedUser);
    } else {
      const createResult = await createUser({
        email: registration.email,
        username: registration.username,
        passwordHash: registration.passwordHash,
        passwordSalt: registration.passwordSalt,
      });

      if (!createResult.success || !createResult.user) {
        return NextResponse.json(
          { message: createResult.error || "Failed to create account." },
          { status: 400 }
        );
      }
      userProfile = createResult.user;
    }

    // Sync new user details to Google Sheet in background
    syncUserToGoogleSheet(userProfile).catch((err) => {
      console.error("Google Sheet background sync error:", err);
    });

    // Generate authenticated session token
    const token = `streamix_tok_${userProfile.id}_${Date.now()}`;

    return NextResponse.json(
      {
        success: true,
        token,
        user: userProfile,
        message: "Account verified and created successfully!",
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("verify-signup error:", err);
    return NextResponse.json(
      { message: "Verification processing failed. Please try again." },
      { status: 500 }
    );
  }
}
