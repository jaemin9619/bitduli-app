import { FieldValue } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { db } from "./config.js";
import { normalizeEmail, requireEmail } from "./validation.js";

const ACTIVE_FRIEND_STATUSES = new Set(["sent", "received", "accepted"]);

/** Sends a mirrored friend request after validating both user profiles. */
export const sendFriendRequest = onCall(async (request) => {
  const fromEmail = requireEmail(request);
  const targetEmail = normalizeEmail(request.data?.targetEmail);
  if (fromEmail === targetEmail) {
    throw new HttpsError("failed-precondition", "You cannot add yourself.");
  }

  const fromRef = db.collection("users").doc(fromEmail);
  const targetRef = db.collection("users").doc(targetEmail);
  let friendNickname;

  await db.runTransaction(async (tx) => {
    const fromFriendRef = fromRef.collection("friends").doc(targetEmail);
    const targetFriendRef = targetRef.collection("friends").doc(fromEmail);
    const [fromSnap, targetSnap, fromFriend, targetFriend] = await Promise.all([
      tx.get(fromRef),
      tx.get(targetRef),
      tx.get(fromFriendRef),
      tx.get(targetFriendRef)
    ]);
    if (!fromSnap.exists || !targetSnap.exists) {
      throw new HttpsError("not-found", "User profile was not found.");
    }
    if (hasActiveRelationship(fromFriend) || hasActiveRelationship(targetFriend)) {
      throw new HttpsError("already-exists", "Friend request already exists.");
    }

    const from = fromSnap.data();
    const target = targetSnap.data();
    const now = FieldValue.serverTimestamp();
    friendNickname = target.nickname || targetEmail.split("@")[0];

    tx.set(fromFriendRef, {
      friendEmail: targetEmail,
      friendNickname,
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

  return { ok: true, friendNickname };
});

/** Accepts a received request and updates both users in one transaction. */
export const acceptFriendRequest = onCall(async (request) => {
  const ownerEmail = requireEmail(request);
  const targetEmail = normalizeEmail(request.data?.targetEmail);
  const ownerRef = db.collection("users").doc(ownerEmail);
  const targetRef = db.collection("users").doc(targetEmail);
  const ownerFriendRef = ownerRef.collection("friends").doc(targetEmail);
  const targetFriendRef = targetRef.collection("friends").doc(ownerEmail);

  await db.runTransaction(async (tx) => {
    const [ownerSnap, targetSnap, ownerFriend, targetFriend] = await Promise.all([
      tx.get(ownerRef),
      tx.get(targetRef),
      tx.get(ownerFriendRef),
      tx.get(targetFriendRef)
    ]);
    if (!ownerSnap.exists || !targetSnap.exists) {
      throw new HttpsError("not-found", "User profile was not found.");
    }
    if (ownerFriend.data()?.status !== "received" || targetFriend.data()?.status !== "sent") {
      throw new HttpsError("failed-precondition", "No received request exists.");
    }

    const owner = ownerSnap.data();
    const target = targetSnap.data();
    const now = FieldValue.serverTimestamp();
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
  await deleteMirroredFriendRecords(ownerEmail, targetEmail, "pending");
  return { ok: true };
});

/** Removes an accepted friend by deleting both mirrored relationship records. */
export const removeFriend = onCall(async (request) => {
  const ownerEmail = requireEmail(request);
  const targetEmail = normalizeEmail(request.data?.targetEmail);
  await deleteMirroredFriendRecords(ownerEmail, targetEmail, "accepted");
  return { ok: true };
});

async function deleteMirroredFriendRecords(ownerEmail, targetEmail, expectedState) {
  const ownerFriendRef = db.collection("users").doc(ownerEmail).collection("friends").doc(targetEmail);
  const targetFriendRef = db.collection("users").doc(targetEmail).collection("friends").doc(ownerEmail);

  await db.runTransaction(async (tx) => {
    const [ownerFriend, targetFriend] = await Promise.all([
      tx.get(ownerFriendRef),
      tx.get(targetFriendRef)
    ]);
    const ownerStatus = ownerFriend.data()?.status;
    const targetStatus = targetFriend.data()?.status;
    const isExpected = expectedState === "accepted"
      ? ownerStatus === "accepted" && targetStatus === "accepted"
      : (ownerStatus === "received" && targetStatus === "sent")
        || (ownerStatus === "sent" && targetStatus === "received");

    if (!isExpected) {
      const message = expectedState === "accepted"
        ? "No accepted friendship exists."
        : "No pending friend request exists.";
      throw new HttpsError("failed-precondition", message);
    }

    tx.delete(ownerFriendRef);
    tx.delete(targetFriendRef);
  });
}

function hasActiveRelationship(snapshot) {
  return snapshot.exists && ACTIVE_FRIEND_STATUSES.has(snapshot.data()?.status);
}
