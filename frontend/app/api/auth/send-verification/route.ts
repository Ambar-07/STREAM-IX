import { NextRequest, NextResponse } from "next/server";
import { ensureUsersLoaded, generateSalt, getUserByEmailOrUsername, hashPassword } from "@/lib/userStore";
import { createSignedVerificationToken, storePendingRegistration } from "@/lib/verificationStore";
import { generateVerificationCode, sendVerificationEmail } from "@/lib/emailService";
import { validatePasswordPolicy } from "@/lib/passwordPolicy";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email = (body.email || "").trim().toLowerCase();
    const username = (body.username || "").trim();
    const password = body.password || "";

    if (!email || !email.includes("@") || !email.includes(".")) {
      return NextResponse.json({ message: "Please provide a valid email address." }, { status: 400 });
    }

    if (!username || username.length < 2) {
      return NextResponse.json({ message: "Username must be at least 2 characters long." }, { status: 400 });
    }

    const policyCheck = validatePasswordPolicy(password);
    if (!policyCheck.valid) {
      return NextResponse.json({ message: policyCheck.error }, { status: 400 });
    }

    // Ensure users are fresh from GitHub / disk
    await ensureUsersLoaded(true);

    // Check if account already exists
    const existingEmail = getUserByEmailOrUsername(email);
    if (existingEmail) {
      return NextResponse.json({ message: "An account with this email already exists. Please login instead." }, { status: 409 });
    }

    const existingUsername = getUserByEmailOrUsername(username);
    if (existingUsername) {
      return NextResponse.json({ message: "This username is already taken. Please choose another." }, { status: 409 });
    }

    // Generate code and hash password
    const code = generateVerificationCode();
    const salt = generateSalt();
    const passwordHash = hashPassword(password, salt);

    const storeResult = storePendingRegistration({
      email,
      username,
      passwordHash,
      passwordSalt: salt,
      code,
    });

    if (!storeResult.success) {
      return NextResponse.json(
        {
          message: `Please wait ${storeResult.cooldownRemaining || 45} seconds before requesting a new code.`,
          cooldownRemaining: storeResult.cooldownRemaining,
        },
        { status: 429 }
      );
    }

    // Dispatch email via Gmail SMTP (in background if needed, but wait for result)
    const emailResult = await sendVerificationEmail({
      toEmail: email,
      code,
      username,
    });

    const verificationToken = createSignedVerificationToken({
      email,
      username,
      passwordHash,
      passwordSalt: salt,
      code,
      expiresAt: Date.now() + 10 * 60 * 1000,
    });

    return NextResponse.json({
      success: true,
      message: `A 6-digit verification code has been dispatched to ${email}.`,
      verificationToken,
    });
  } catch (err) {
    console.error("send-verification error:", err);
    return NextResponse.json({ message: "Failed to dispatch verification code. Please try again." }, { status: 500 });
  }
}
