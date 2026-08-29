import { FieldValue } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { db } from "./config.js";
import { normalizeEmail, requireEmail } from "./validation.js";

/** Sends a mirrored friend request after validating both user profiles. */
export const sendFriendRequest = onCall(async (request) => {
  const fromEmail = requireEmail(request);
  const targetEmail = normalizeEmail(request.data?.targetEmail);
  if (fromEmail === targetEmail) {
    throw new HttpsError("failed-precondition", "You cannot add yourself.");
  }

  const fromRef = db.collection("users").doc(fromEmail);
  const targetRef = db.collection("users").doc(targetEmail);
  const [fromSnap, targetSnap] = await Promise.all([fromRef.get(), targetRef.get()]);
  if (!fromSnap.exists || !targetSnap.exists) {
    throw new HttpsError("not-found", "User profile was not found.");
  }

  const from = fromSnap.data();
  const target = targetSnap.data();
  const now = FieldValue.serverTimestamp();

  await db.runTransaction(async (tx) => {
    const fromFriendRef = fromRef.collection("friends").doc(targetEmail);
    const targetFriendRef = targetRef.collection("friends").doc(fromEmail);
    const fromFriend = await tx.get(fromFriendRef);
    if (fromFriend.exists && ["sent", "received", "accepted"].includes(fromFriend.data()?.status)) {
      throw new HttpsError("already-exists", "Friend request already exists.");
    }

    tx.set(fromFriendRef, {
      friendEmail: targetEmail,
      friendNickname: target.nickname || targetEmail.split("@")[0],
      friendColorHex: target.profileColorHex || "#404040",
      status: "sent",
      createdAt: now,
      updatedAt: now
    });
    tx.set(targetFriendRef, {
      friendEmail: fromEmail,
      friendNickname: from.nickname || fromEmail.split("@")[0],
      friendColorHex: from.profileColorHex || "#404040",
      status: "received",
      createdAt: now,
      updatedAt: now
    });
  });

  return { ok: true, friendNickname: target.nickname || targetEmail.split("@")[0] };
});

/** Accepts a received request and updates both users in one transaction. */
export const acceptFriendRequest = onCall(async (request) => {
  const ownerEmail = requireEmail(request);
  const targetEmail = normalizeEmail(request.data?.targetEmail);
  const ownerRef = db.collection("users").doc(ownerEmail);
  const targetRef = db.collection("users").doc(targetEmail);
  const [ownerSnap, targetSnap] = await Promise.all([ownerRef.get(), targetRef.get()]);
  if (!ownerSnap.exists || !targetSnap.exists) {
    throw new HttpsError("not-found", "User profile was not found.");
  }

  const owner = ownerSnap.data();
  const target = targetSnap.data();
  const ownerFriendRef = ownerRef.collection("friends").doc(targetEmail);
  const targetFriendRef = targetRef.collection("friends").doc(ownerEmail);
  const now = FieldValue.serverTimestamp();

  await db.runTransaction(async (tx) => {
    const pending = await tx.get(ownerFriendRef);
    if (!pending.exists || pending.data()?.status !== "received") {
      throw new HttpsError("failed-precondition", "No received request exists.");
    }
    tx.set(ownerFriendRef, {
      friendEmail: targetEmail,
      friendNickname: target.nickname || targetEmail.split("@")[0],
      friendColorHex: target.profileColorHex || "#404040",
      status: "accepted",
      updatedAt: now
    }, { merge: true });
    tx.set(targetFriendRef, {
      friendEmail: ownerEmail,
      friendNickname: owner.nickname || ownerEmail.split("@")[0],
      friendColorHex: owner.profileColorHex || "#404040",
      status: "accepted",
      updatedAt: now
    }, { merge: true });
  });

  return { ok: true };
});

/** Declines a friend request by deleting both mirrored relationship records. */
export const declineFriendRequest = onCall(async (request) => {
  const ownerEmail = requireEmail(request);
  const targetEmail = normalizeEmail(request.data?.targetEmail);
  await deleteMirroredFriendRecords(ownerEmail, targetEmail);
  return { ok: true };
});

/** Removes an accepted friend by deleting both mirrored relationship records. */
export const removeFriend = onCall(async (request) => {
  const ownerEmail = requireEmail(request);
  const targetEmail = normalizeEmail(request.data?.targetEmail);
  await deleteMirroredFriendRecords(ownerEmail, targetEmail);
  return { ok: true };
});

async function deleteMirroredFriendRecords(ownerEmail, targetEmail) {
  await Promise.all([
    db.collection("users").doc(ownerEmail).collection("friends").doc(targetEmail).delete(),
    db.collection("users").doc(targetEmail).collection("friends").doc(ownerEmail).delete()
  ]);
}
