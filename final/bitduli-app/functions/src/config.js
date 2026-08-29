import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { defineSecret } from "firebase-functions/params";
import { setGlobalOptions } from "firebase-functions/v2";

setGlobalOptions({ region: "asia-northeast3", maxInstances: 10 });

const app = initializeApp();

/** Shared Firestore Admin client for callable function modules. */
export const db = getFirestore(app);

/** Gemini API key managed by Firebase Functions Secret Manager. */
export const geminiApiKey = defineSecret("GEMINI_API_KEY");
