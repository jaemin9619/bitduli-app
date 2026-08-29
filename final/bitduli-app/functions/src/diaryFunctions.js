import { FieldValue } from "firebase-admin/firestore";
import { onCall } from "firebase-functions/v2/https";
import {
  cleanDiarySummary,
  createAiClient,
  generateDiaryImage,
  generateDiarySummary
} from "./aiService.js";
import { db, geminiApiKey } from "./config.js";
import { fallbackImageDataUrl, fallbackSummary } from "./fallbackDrawing.js";
import { requireDiaryText, requireEmail } from "./validation.js";

/** Summarizes an authenticated user's diary and returns a local fallback on AI failure. */
export const summarizeDiary = onCall({ secrets: [geminiApiKey] }, async (request) => {
  const ownerEmail = requireEmail(request);
  const diaryText = requireDiaryText(request.data?.diaryText);
  const feeling = request.data?.feeling || "Happy";
  const ai = createAiClient(geminiApiKey.value() || process.env.GEMINI_API_KEY);

  if (!ai) {
    return { summary: fallbackSummary(feeling), isMock: true };
  }

  let responseText;
  try {
    responseText = await generateDiarySummary(ai, diaryText, feeling);
  } catch (error) {
    console.error("summarizeDiary generation failed", error);
    return { summary: fallbackSummary(feeling), isMock: true };
  }

  const summary = cleanDiarySummary(responseText) || cleanDiarySummary(fallbackSummary(feeling));
  await recordAiUsage(ownerEmail, "summary");
  return { summary, isMock: false };
});

/** Generates an authenticated user's diary drawing with the existing runtime limits. */
export const generateDiaryDrawing = onCall(
  { secrets: [geminiApiKey], timeoutSeconds: 120, memory: "1GiB" },
  async (request) => {
    const ownerEmail = requireEmail(request);
    const diaryText = requireDiaryText(request.data?.diaryText);
    const profileColorHex = typeof request.data?.profileColorHex === "string"
      ? request.data.profileColorHex
      : "#FFF275";
    const feeling = request.data?.feeling || "Happy";
    const ai = createAiClient(geminiApiKey.value() || process.env.GEMINI_API_KEY);

    if (!ai) {
      return { imageDataUrl: fallbackImageDataUrl(profileColorHex, feeling, diaryText), isMock: true };
    }

    let response;
    try {
      response = await generateDiaryImage(ai, diaryText, feeling, profileColorHex);
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

    await recordAiUsage(ownerEmail, "drawing-image");
    return { imageBase64: imageBytes, mimeType, isMock: false };
  }
);

async function recordAiUsage(ownerEmail, type) {
  await db.collection("aiUsage").add({
    ownerEmail,
    type,
    createdAt: FieldValue.serverTimestamp()
  });
}
