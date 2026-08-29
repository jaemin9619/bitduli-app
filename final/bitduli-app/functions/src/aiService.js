import { GoogleGenAI } from "@google/genai";

/** Creates a request-scoped Gemini client when an API key is available. */
export function createAiClient(apiKey) {
  if (!apiKey) return null;
  return new GoogleGenAI({ apiKey });
}

/** Removes formatting noise and keeps diary summaries within the API limit. */
export function cleanDiarySummary(value = "") {
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

/** Generates the childlike one-sentence diary summary. */
export async function generateDiarySummary(ai, diaryText, feeling) {
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: `Diary text: "${diaryText}"\nMood: "${feeling}"`,
    config: {
      systemInstruction:
        "Write one concise Korean sentence that summarizes the actual event and emotion in the diary. Use a cute, warm child diary tone while keeping the meaning clear. Prefer this shape: main event + simple feeling. Example styles: 해커톤을 열심히 해서 1등하고 싶어 두근거렸다. / 동료와 사소한 다툼으로 서운하고 화가 났다. Do not sound formal, report-like, or adult. Never start with 요약: or any label. Do not use markdown, bullets, quotes, labels, parentheses, character counts, or explanations. Write it exactly as if a 7-year-old kindergarten child wrote it: very simple, cute, childlike Korean words and spelling. Keep it to 60 Korean characters or fewer.",
      temperature: 0.35
    }
  });

  return response.text || "";
}

/** Extracts concrete visual details while falling back to the original diary. */
export async function buildVisualSceneBrief(ai, diaryText, feeling) {
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

/** Generates one square diary image and returns the SDK image payload. */
export async function generateDiaryImage(ai, diaryText, feeling, profileColorHex) {
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

  return ai.models.generateImages({
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
}
