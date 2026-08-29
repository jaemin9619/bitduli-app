import { FieldValue } from "firebase-admin/firestore";
import * as logger from "firebase-functions/logger";
import { onCall } from "firebase-functions/v2/https";
import {
  cleanDiarySummary,
  createAiClient,
  generateDiaryImage,
  generateDiarySummary
} from "./aiService.js";
import { db, geminiApiKey } from "./config.js";
import { fallbackImageDataUrl, fallbackSummary } from "./fallbackDrawing.js";
import {
  normalizeFeeling,
  normalizeProfileColorHex,
  requireDiaryText,
  requireEmail
} from "./validation.js";

/** Creates the diary handlers with injectable AI and Firestore dependencies for tests. */
export function createDiaryHandlers({
  dbClient = db,
  readApiKey = () => geminiApiKey.value() || process.env.GEMINI_API_KEY,
  createAi = createAiClient,
  summarizeWithAi = generateDiarySummary,
  drawWithAi = generateDiaryImage,
  logError = (message, fields) => logger.error(message, fields),
  logWarning = (message, fields) => logger.warn(message, fields)
} = {}) {
  return {
    summarizeDiaryHandler: async (request) => {
      const ownerEmail = requireEmail(request);
      const diaryText = requireDiaryText(request.data?.diaryText);
      const feeling = normalizeFeeling(request.data?.feeling);
      const ai = createAi(readApiKey());

      if (!ai) {
        return { summary: fallbackSummary(feeling), isMock: true };
      }

      let responseText;
      try {
        responseText = await summarizeWithAi(ai, diaryText, feeling);
      } catch (error) {
        logError("summarizeDiary generation failed", { errorType: getErrorType(error) });
        return { summary: fallbackSummary(feeling), isMock: true };
      }

      const summary = cleanDiarySummary(responseText) || cleanDiarySummary(fallbackSummary(feeling));
      await recordAiUsageBestEffort(dbClient, ownerEmail, "summary", logWarning);
      return { summary, isMock: false };
    },

    generateDiaryDrawingHandler: async (request) => {
      const ownerEmail = requireEmail(request);
      const diaryText = requireDiaryText(request.data?.diaryText);
      const profileColorHex = normalizeProfileColorHex(request.data?.profileColorHex);
      const feeling = normalizeFeeling(request.data?.feeling);
      const ai = createAi(readApiKey());

      if (!ai) {
        return { imageDataUrl: fallbackImageDataUrl(profileColorHex, feeling, diaryText), isMock: true };
      }

      let response;
      try {
        response = await drawWithAi(ai, diaryText, feeling, profileColorHex);
      } catch (error) {
        logError("generateDiaryDrawing image generation failed", { errorType: getErrorType(error) });
        return { imageDataUrl: fallbackImageDataUrl(profileColorHex, feeling, diaryText), isMock: true };
      }

      const generated = response.generatedImages?.[0]?.image;
      const imageBytes = generated?.imageBytes;
      const mimeType = generated?.mimeType || "image/png";
      if (!imageBytes) {
        return { imageDataUrl: fallbackImageDataUrl(profileColorHex, feeling, diaryText), isMock: true };
      }

      await recordAiUsageBestEffort(dbClient, ownerEmail, "drawing-image", logWarning);
      return { imageBase64: imageBytes, mimeType, isMock: false };
    }
  };
}

const diaryHandlers = createDiaryHandlers();

/** Summarizes an authenticated user's diary and returns a local fallback on AI failure. */
export const summarizeDiary = onCall(
  { secrets: [geminiApiKey] },
  diaryHandlers.summarizeDiaryHandler
);

/** Generates an authenticated user's diary drawing with the existing runtime limits. */
export const generateDiaryDrawing = onCall(
  { secrets: [geminiApiKey], timeoutSeconds: 120, memory: "1GiB" },
  diaryHandlers.generateDiaryDrawingHandler
);

/** Records AI usage without failing an otherwise successful callable response. */
export async function recordAiUsageBestEffort(dbClient, ownerEmail, type, logWarning) {
  try {
    await dbClient.collection("aiUsage").add({
      ownerEmail,
      type,
      createdAt: FieldValue.serverTimestamp()
    });
  } catch {
    logWarning("AI usage logging failed", { usageType: type });
  }
}

function getErrorType(error) {
  return error instanceof Error ? error.name : typeof error;
}
