export const SPECIAL_CHAR_REGEX = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?~`]/;

export function validatePasswordPolicy(password: string): { valid: boolean; error?: string } {
  if (!password) {
    return { valid: false, error: "Password is required." };
  }

  if (password.length < 8 || password.length > 64) {
    return { valid: false, error: "Password must be between 8 and 64 characters long." };
  }

  if (!SPECIAL_CHAR_REGEX.test(password)) {
    return {
      valid: false,
      error: "Password must include at least one special symbol (e.g. ! @ # $ % ^ & *).",
    };
  }

  return { valid: true };
}

export function getPasswordPolicyRequirements(password: string) {
  const lengthValid = password.length >= 8 && password.length <= 64;
  const specialValid = SPECIAL_CHAR_REGEX.test(password);

  return {
    lengthValid,
    specialValid,
    isValid: lengthValid && specialValid,
  };
}
