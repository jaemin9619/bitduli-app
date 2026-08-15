import { GoogleGenAI } from "@google/genai";
import { initializeApp } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import { setGlobalOptions } from "firebase-functions/v2";

initializeApp();
setGlobalOptions({ region: "asia-northeast3", maxInstances: 10 });

const db = getFirestore();
const geminiApiKey = defineSecret("GEMINI_API_KEY");

function requireEmail(request) {
  const email = request.auth?.token?.email;
  if (!email || typeof email !== "string") {
    throw new HttpsError("unauthenticated", "Google login is required.");
  }
  return email.toLowerCase();
}

function normalizeEmail(value) {
  if (typeof value !== "string") {
    throw new HttpsError("invalid-argument", "Email is required.");
  }
  const email = value.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new HttpsError("invalid-argument", "Valid email is required.");
  }
  return email;
}

function requireDiaryText(value) {
  if (typeof value !== "string" || value.trim().length < 2) {
    throw new HttpsError("invalid-argument", "Diary text is required.");
  }
  return value.trim().slice(0, 4000);
}

function getAi(apiKey) {
  if (!apiKey) return null;
  return new GoogleGenAI({ apiKey });
}

function fallbackSummary(feeling = "Happy") {
  const words = {
    Happy: "\uAE30\uBD84\uC774 \uBC29\uAE0B\uD588\uB2E4",
    Excited: "\uB450\uADFC\uB450\uADFC\uD588\uB2E4",
    Sad: "\uB9C8\uC74C\uC774 \uC2DC\uBB34\uB8E9\uD588\uB2E4",
    Angry: "\uC18D\uC0C1\uD558\uACE0 \uD654\uAC00 \uB0AC\uB2E4",
    Tired: "\uD798\uB4E4\uC5C8\uC9C0\uB9CC \uC798\uD588\uB2E4",
    Calm: "\uB9C8\uC74C\uC774 \uD3EC\uADFC\uD588\uB2E4"
  };
  return words[feeling] || "\uC624\uB298\uB3C4 \uC18C\uC911\uD55C \uD558\uB8E8\uC600\uB2E4";
}
function fallbackImageDataUrl(colorHex = "#FFF275", feeling = "Happy", diaryText = "") {
  const text = String(diaryText || "").toLowerCase();
  const isSad = feeling === "Sad" || feeling === "Angry";
  const mouth = isSad
    ? '<path d="M 175 155 Q 200 137 225 155" stroke="#333333" stroke-width="5" fill="none" stroke-linecap="round" />'
    : '<path d="M 175 145 Q 200 170 225 145" stroke="#333333" stroke-width="5" fill="none" stroke-linecap="round" />';

  const has = (...words) => words.some((word) => text.includes(word));
  let scene = "";
  if (has("\uBE44", "\uC6B0\uC0B0", "rain", "umbrella")) {
    scene = '<path d="M40 45 L360 45" stroke="#7CB7E8" stroke-width="5" stroke-linecap="round"/><path d="M80 80 l-12 28 M140 75 l-12 28 M260 80 l-12 28 M320 75 l-12 28" stroke="#4FA3D8" stroke-width="5" stroke-linecap="round"/><path d="M120 120 Q200 65 280 120" fill="#F7A8C8" stroke="#333" stroke-width="5"/><path d="M200 120 L200 202" stroke="#333" stroke-width="5" stroke-linecap="round"/>';
  } else if (has("\uB208", "snow", "\uB208\uC0AC\uB78C")) {
    scene = '<circle cx="78" cy="70" r="8" fill="#BFE8FF"/><circle cx="320" cy="90" r="7" fill="#BFE8FF"/><circle cx="275" cy="62" r="6" fill="#BFE8FF"/><circle cx="95" cy="228" r="28" fill="#FFF" stroke="#333" stroke-width="4"/><circle cx="95" cy="184" r="22" fill="#FFF" stroke="#333" stroke-width="4"/><path d="M55 238 C135 220 250 245 350 220" stroke="#BFE8FF" stroke-width="18" stroke-linecap="round" opacity="0.7"/>';
  } else if (has("\uC218\uBC15", "\uBC25", "\uBA39", "\uAC04\uC2DD", "\uCF00\uC774\uD06C", "\uB5A1\uBCF6\uC774", "\uD53C\uC790", "food", "cake")) {
    scene = '<ellipse cx="200" cy="210" rx="95" ry="25" fill="#D9A66A" stroke="#333" stroke-width="4"/><path d="M145 170 Q200 250 255 170 Z" fill="#FF5B6E" stroke="#333" stroke-width="4"/><path d="M155 170 Q200 205 245 170" stroke="#33A852" stroke-width="10" fill="none" stroke-linecap="round"/><circle cx="188" cy="188" r="3" fill="#333"/><circle cx="210" cy="198" r="3" fill="#333"/>';
  } else if (has("\uB3C4\uC11C\uAD00", "\uCC45", "\uACF5\uBD80", "\uC219\uC81C", "\uD559\uAD50", "library", "book", "school")) {
    scene = '<rect x="55" y="82" width="105" height="135" fill="#F6D365" stroke="#333" stroke-width="5"/><rect x="240" y="82" width="105" height="135" fill="#A8D8FF" stroke="#333" stroke-width="5"/><path d="M72 115 H145 M72 148 H145 M72 181 H145 M257 115 H330 M257 148 H330 M257 181 H330" stroke="#333" stroke-width="4"/><path d="M165 220 Q200 185 235 220" fill="#FFF" stroke="#333" stroke-width="4"/>';
  } else if (has("\uACF5\uC6D0", "\uB180\uC774\uD130", "\uADF8\uB124", "\uBBF8\uB044\uB7FC\uD2C0", "\uCE5C\uAD6C", "\uC18C\uD48D", "park", "playground", "friend")) {
    scene = '<path d="M55 225 C120 190 170 230 235 205 S320 220 365 195" stroke="#79C267" stroke-width="14" fill="none" stroke-linecap="round"/><path d="M80 210 L160 112 L240 210" fill="none" stroke="#333" stroke-width="5"/><path d="M160 112 L160 210" stroke="#E85656" stroke-width="10" stroke-linecap="round"/><path d="M260 95 L335 95 L330 210 L270 210 Z" fill="none" stroke="#333" stroke-width="5"/><path d="M280 95 V205 M315 95 V205" stroke="#333" stroke-width="3"/>';
  } else if (has("\uC5C4\uB9C8", "\uC544\uBE60", "\uAC00\uC871", "\uC9D1", "family", "home")) {
    scene = '<path d="M80 155 L200 65 L320 155" fill="#F6A5A5" stroke="#333" stroke-width="5"/><rect x="105" y="155" width="190" height="90" fill="#FFE8A3" stroke="#333" stroke-width="5"/><rect x="180" y="190" width="40" height="55" fill="#C7E8FF" stroke="#333" stroke-width="4"/><rect x="125" y="175" width="35" height="30" fill="#FFF" stroke="#333" stroke-width="4"/>';
  } else {
    scene = '<circle cx="72" cy="64" r="30" fill="#FFE45C" stroke="#E9B300" stroke-width="5"/><path d="M35 230 C100 205 160 235 235 210 S340 220 370 195" stroke="#79C267" stroke-width="14" fill="none" stroke-linecap="round" opacity="0.8"/><path d="M288 82 C320 58 350 78 354 108 C326 101 310 116 286 104" fill="none" stroke="#7CB7E8" stroke-width="5" stroke-linecap="round"/>';
  }

  const svg = [
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" width="100%" height="100%">',
    '<rect width="400" height="300" rx="24" fill="#FCF9F2"/>',
    '<rect x="14" y="14" width="372" height="272" rx="18" fill="none" stroke="#333333" stroke-width="3" stroke-dasharray="8 5"/>',
    scene,
    `<circle cx="200" cy="135" r="38" fill="${colorHex}" opacity="0.35"/>`,
    '<path d="M 150 128 Q 154 72 204 78 Q 254 84 250 132 Q 246 185 195 180 Q 145 176 150 128 Z" fill="none" stroke="#333333" stroke-width="5" stroke-linecap="round"/>',
    '<circle cx="180" cy="123" r="5" fill="#333333"/><circle cx="222" cy="123" r="5" fill="#333333"/>',
    mouth,
    '</svg>'
  ].join("");
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}

async function buildVisualSceneBrief(ai, diaryText, feeling) {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Diary text: ${diaryText}\nMood: ${feeling}`,
      config: {
        systemInstruction: [
          "Extract a concrete image-generation scene brief from the child diary.",
          "Return 2 short English sentences only.",
          "Mention the actual place, people, objects, weather, action, and emotion from the diary.",
          "Do not invent a playground, picnic, sun, friends, food, animals, or props unless the diary implies them.",
          "Do not include text to be drawn in the image."
        ].join(" "),
        temperature: 0.2
      }
    });
    return (response.text || "").trim().slice(0, 600) || diaryText;
  } catch (error) {
    console.warn("visual scene brief generation failed", error);
    return diaryText;
  }
}

function cleanDiarySummary(value = "") {
  return String(value)
    .replace(/[\*_#~`>\[\]{}|\\]/g, "")
    .replace(/[?(]\s*\d+\s*$/g, "")
    .replace(/[?(]\s*\d+\s*[)?]?\s*$/g, "")
    .replace(/[)?]\s*$/g, "")
    .replace(/^[\-??\d.\s]+/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 60)
    .replace(/[?(]\s*\d*\s*$/g, "")
    .trim();
}

export const summarizeDiary = onCall({ secrets: [geminiApiKey] }, async (request) => {
  const ownerEmail = requireEmail(request);
  const diaryText = requireDiaryText(request.data?.diaryText);
  const feeling = request.data?.feeling || "Happy";
  const ai = getAi(geminiApiKey.value() || process.env.GEMINI_API_KEY);

  if (!ai) {
    return { summary: fallbackSummary(feeling), isMock: true };
  }

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: `Diary text: "${diaryText}"\nMood: "${feeling}"`,
    config: {
      systemInstruction:
        "Write one concise Korean sentence that summarizes the actual event and emotion in the diary. Use a cute, warm child diary tone while keeping the meaning clear. Prefer this shape: main event + simple feeling. Example styles: \uD574\uCEE4\uD1A4\uC744 \uC5F4\uC2EC\uD788 \uD574\uC11C 1\uB4F1\uD558\uACE0 \uC2F6\uC5B4 \uB450\uADFC\uAC70\uB838\uB2E4. / \uB3D9\uB8CC\uC640 \uC0AC\uC18C\uD55C \uB2E4\uD23C\uC73C\uB85C \uC11C\uC6B4\uD558\uACE0 \uD654\uAC00 \uB0AC\uB2E4. Do not sound formal, report-like, or adult. Never start with \uC694\uC57D: or any label. Do not use markdown, bullets, quotes, labels, parentheses, character counts, or explanations. Write it exactly as if a 7-year-old kindergarten child wrote it: very simple, cute, childlike Korean words and spelling. Keep it to 60 Korean characters or fewer.",
      temperature: 0.35
    }
  });

  const summary = cleanDiarySummary(response.text || "") || cleanDiarySummary(fallbackSummary(feeling));
  await db.collection("aiUsage").add({
    ownerEmail,
    type: "summary",
    createdAt: FieldValue.serverTimestamp()
  });

  return { summary, isMock: false };
});

export const generateDiaryDrawing = onCall({ secrets: [geminiApiKey], timeoutSeconds: 120, memory: "1GiB" }, async (request) => {
  const ownerEmail = requireEmail(request);
  const diaryText = requireDiaryText(request.data?.diaryText);
  const profileColorHex = typeof request.data?.profileColorHex === "string" ? request.data.profileColorHex : "#FFF275";
  const feeling = request.data?.feeling || "Happy";
  const ai = getAi(geminiApiKey.value() || process.env.GEMINI_API_KEY);

  if (!ai) {
    return { imageDataUrl: fallbackImageDataUrl(profileColorHex, feeling, diaryText), isMock: true };
  }

  const sceneBrief = await buildVisualSceneBrief(ai, diaryText, feeling);

  const prompt = [
    "Create ONE square children's picture-diary drawing, exactly as if a 6-7 year old Korean kindergartener drew it with crayons on rough off-white sketch paper.",
    "Style: extremely naive, clumsy, wobbly and imperfect childlike drawing. Thick uneven crayon strokes with visible wax texture.",
    "Color bleeding: the crayon colors MUST intentionally bleed, spill and slide OUTSIDE the outlines, like a child who cannot color inside the lines.",
    "Composition: fill the whole square sheet with the exact place, action, objects, people, weather and emotion described below. Do NOT default to a playground, park, picnic or sunny day unless stated.",
    "ABSOLUTELY NO text, letters, numbers, words, captions, title, watermark, stamp or seal anywhere in the image.",
    `Specific scene brief to depict: ${sceneBrief}`,
    `Original diary text: ${diaryText}`,
    `Mood: ${feeling}`,
    `Main crayon color hint: ${profileColorHex}`
  ].join("\n");

  let response;
  try {
    response = await ai.models.generateImages({
      model: "imagen-4.0-generate-001",
      prompt,
      config: {
        numberOfImages: 1,
        aspectRatio: "1:1",
        outputMimeType: "image/png",
        personGeneration: "ALLOW_ALL",
        includeRaiReason: true
      }
    });
  } catch (error) {
    console.error("generateDiaryDrawing image generation failed", error);
    return { imageDataUrl: fallbackImageDataUrl(profileColorHex, feeling, diaryText), isMock: true };
  }

  const generated = response.generatedImages?.[0]?.image;
  const imageBytes = generated?.imageBytes;
  const mimeType = generated?.mimeType || "image/png";
  if (!imageBytes) {
    return { imageDataUrl: fallbackImageDataUrl(profileColorHex, feeling, diaryText), isMock: true };
  }

  await db.collection("aiUsage").add({
    ownerEmail,
    type: "drawing-image",
    createdAt: FieldValue.serverTimestamp()
  });

  return { imageBase64: imageBytes, mimeType, isMock: false };
});

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

export const declineFriendRequest = onCall(async (request) => {
  const ownerEmail = requireEmail(request);
  const targetEmail = normalizeEmail(request.data?.targetEmail);
  await Promise.all([
    db.collection("users").doc(ownerEmail).collection("friends").doc(targetEmail).delete(),
    db.collection("users").doc(targetEmail).collection("friends").doc(ownerEmail).delete()
  ]);
  return { ok: true };
});

export const removeFriend = onCall(async (request) => {
  const ownerEmail = requireEmail(request);
  const targetEmail = normalizeEmail(request.data?.targetEmail);
  await Promise.all([
    db.collection("users").doc(ownerEmail).collection("friends").doc(targetEmail).delete(),
    db.collection("users").doc(targetEmail).collection("friends").doc(ownerEmail).delete()
  ]);
  return { ok: true };
});
