import assert from "node:assert/strict";
import { after, beforeEach, test } from "node:test";

process.env.GCLOUD_PROJECT = "demo-bitduli";
process.env.FIRESTORE_EMULATOR_HOST ||= "127.0.0.1:8085";

const { db } = await import("../src/config.js");
const {
  acceptFriendRequest,
  declineFriendRequest,
  removeFriend,
  sendFriendRequest
} = await import("../src/friendFunctions.js");

const alice = "alice@example.com";
const bob = "bob@example.com";

beforeEach(async () => {
  await db.recursiveDelete(db.collection("users"));
});

after(async () => {
  await db.terminate();
});

test("self requests are rejected", async () => {
  await assert.rejects(
    () => call(sendFriendRequest, alice, { targetEmail: alice }),
    (error) => error.code === "failed-precondition"
  );
});

test("missing user profiles are rejected", async () => {
  await seedUser(alice, "Alice");
  await assert.rejects(
    () => call(sendFriendRequest, alice, { targetEmail: bob }),
    (error) => error.code === "not-found"
  );
});

test("friend requests create sent and received records atomically", async () => {
  await seedUsers();
  const result = await call(sendFriendRequest, alice, { targetEmail: bob });
  const [aliceFriend, bobFriend] = await readPair();

  assert.deepEqual(result, { ok: true, friendNickname: "Bob" });
  assert.equal(aliceFriend.status, "sent");
  assert.equal(bobFriend.status, "received");
});

test("duplicate and reverse-direction requests are rejected without overwriting records", async () => {
  await seedUsers();
  await call(sendFriendRequest, alice, { targetEmail: bob });

  await assert.rejects(
    () => call(sendFriendRequest, alice, { targetEmail: bob }),
    (error) => error.code === "already-exists"
  );
  await assert.rejects(
    () => call(sendFriendRequest, bob, { targetEmail: alice }),
    (error) => error.code === "already-exists"
  );

  const [aliceFriend, bobFriend] = await readPair();
  assert.equal(aliceFriend.status, "sent");
  assert.equal(bobFriend.status, "received");
});

test("accepting requires matching received and sent records", async () => {
  await seedUsers();
  await call(sendFriendRequest, alice, { targetEmail: bob });
  await call(acceptFriendRequest, bob, { targetEmail: alice });

  const [aliceFriend, bobFriend] = await readPair();
  assert.equal(aliceFriend.status, "accepted");
  assert.equal(bobFriend.status, "accepted");
});

test("accepting an inconsistent pair fails without partial writes", async () => {
  await seedUsers();
  await aliceFriendRef().set({ friendEmail: bob, status: "sent" });
  await bobFriendRef().set({ friendEmail: alice, status: "received" });
  await aliceFriendRef().delete();

  await assert.rejects(
    () => call(acceptFriendRequest, bob, { targetEmail: alice }),
    (error) => error.code === "failed-precondition"
  );

  assert.equal((await aliceFriendRef().get()).exists, false);
  assert.equal((await bobFriendRef().get()).data().status, "received");
});

test("declining a pending request deletes both records atomically", async () => {
  await seedUsers();
  await call(sendFriendRequest, alice, { targetEmail: bob });
  await call(declineFriendRequest, bob, { targetEmail: alice });
  await assertPairMissing();
});

test("removing an accepted friend deletes both records atomically", async () => {
  await seedUsers();
  await call(sendFriendRequest, alice, { targetEmail: bob });
  await call(acceptFriendRequest, bob, { targetEmail: alice });
  await call(removeFriend, alice, { targetEmail: bob });
  await assertPairMissing();
});

test("invalid decline and remove states fail without deleting either side", async () => {
  await seedUsers();
  await call(sendFriendRequest, alice, { targetEmail: bob });
  await assert.rejects(
    () => call(removeFriend, alice, { targetEmail: bob }),
    (error) => error.code === "failed-precondition"
  );
  let [aliceFriend, bobFriend] = await readPair();
  assert.equal(aliceFriend.status, "sent");
  assert.equal(bobFriend.status, "received");

  await call(acceptFriendRequest, bob, { targetEmail: alice });
  await assert.rejects(
    () => call(declineFriendRequest, bob, { targetEmail: alice }),
    (error) => error.code === "failed-precondition"
  );
  [aliceFriend, bobFriend] = await readPair();
  assert.equal(aliceFriend.status, "accepted");
  assert.equal(bobFriend.status, "accepted");
});

function call(callable, email, data) {
  return callable.run({ auth: { token: { email } }, data });
}

async function seedUsers() {
  await Promise.all([
    seedUser(alice, "Alice"),
    seedUser(bob, "Bob")
  ]);
}

function seedUser(email, nickname) {
  return db.collection("users").doc(email).set({
    email,
    nickname,
    profileColorHex: "#FFF275"
  });
}

function aliceFriendRef() {
  return db.collection("users").doc(alice).collection("friends").doc(bob);
}

function bobFriendRef() {
  return db.collection("users").doc(bob).collection("friends").doc(alice);
}

async function readPair() {
  const [aliceFriend, bobFriend] = await Promise.all([
    aliceFriendRef().get(),
    bobFriendRef().get()
  ]);
  return [aliceFriend.data(), bobFriend.data()];
}

async function assertPairMissing() {
  const [aliceFriend, bobFriend] = await Promise.all([
    aliceFriendRef().get(),
    bobFriendRef().get()
  ]);
  assert.equal(aliceFriend.exists, false);
  assert.equal(bobFriend.exists, false);
}
