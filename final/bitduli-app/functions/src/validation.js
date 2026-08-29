import { HttpsError } from "firebase-functions/v2/https";

export const ALLOWED_FEELINGS = Object.freeze([
  "Happy",
  "Excited",
  "Sad",
  "Angry",
  "Tired",
  "Calm"
]);

/** Returns the signed-in user's normalized email or rejects the request. */
export function requireEmail(request) {
  const email = request.auth?.token?.email;
  if (!email || typeof email !== "string") {
    throw new HttpsError("unauthenticated", "Google login is required.");
  }
  return email.toLowerCase();
}

/** Validates and normalizes an email supplied in callable request data. */
export function normalizeEmail(value) {
  if (typeof value !== "string") {
    throw new HttpsError("invalid-argument", "Email is required.");
  }
  const email = value.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new HttpsError("invalid-argument", "Valid email is required.");
  }
  return email;
}

/** Validates diary text and enforces the existing 4,000-character limit. */
export function requireDiaryText(value) {
  if (typeof value !== "string" || value.trim().length < 2) {
    throw new HttpsError("invalid-argument", "Diary text is required.");
  }
  return value.trim().slice(0, 4000);
}

/** Returns a supported feeling, using Happy only when the value is omitted. */
export function normalizeFeeling(value) {
  if (value === undefined || value === null) {
    return "Happy";
  }
  if (typeof value !== "string" || !ALLOWED_FEELINGS.includes(value)) {
    throw new HttpsError("invalid-argument", "Valid feeling is required.");
  }
  return value;
}

/** Returns a normalized #RRGGBB color, using the existing default when omitted. */
export function normalizeProfileColorHex(value) {
  if (value === undefined || value === null) {
    return "#FFF275";
  }
  if (typeof value !== "string" || !/^#[0-9a-fA-F]{6}$/.test(value)) {
    throw new HttpsError("invalid-argument", "Valid profile color is required.");
  }
  return value.toUpperCase();
}
