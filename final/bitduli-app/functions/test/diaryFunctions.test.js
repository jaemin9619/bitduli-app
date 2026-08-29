import assert from "node:assert/strict";
import test from "node:test";

process.env.GEMINI_API_KEY = "";

const {
  createDiaryHandlers,
  generateDiaryDrawing,
  summarizeDiary
} = await import("../src/diaryFunctions.js");

const auth = { token: { email: "reviewer@example.com" } };

test("callables reject unauthenticated requests", async () => {
  await assert.rejects(
    () => summarizeDiary.run({ auth: null, data: { diaryText: "오늘 즐거웠다" } }),
    (error) => error.code === "unauthenticated"
  );
});

test("callables return compatible fallback fields without a Secret", async () => {
  const summary = await summarizeDiary.run({
    auth,
    data: { diaryText: "오늘 즐거웠다", feeling: "Happy" }
  });
  const drawing = await generateDiaryDrawing.run({
    auth,
    data: { diaryText: "비 오는 날 우산을 썼다", feeling: "Calm", profileColorHex: "#a1b2c3" }
  });

  assert.deepEqual(Object.keys(summary).sort(), ["isMock", "summary"]);
  assert.equal(summary.isMock, true);
  assert.deepEqual(Object.keys(drawing).sort(), ["imageDataUrl", "isMock"]);
  assert.equal(drawing.isMock, true);
});

test("drawing rejects invalid feeling and color before AI use", async () => {
  await assert.rejects(
    () => generateDiaryDrawing.run({
      auth,
      data: { diaryText: "오늘 즐거웠다", feeling: "Normal", profileColorHex: "#FFF275" }
    }),
    (error) => error.code === "invalid-argument"
  );
  await assert.rejects(
    () => generateDiaryDrawing.run({
      auth,
      data: { diaryText: "오늘 즐거웠다", feeling: "Happy", profileColorHex: "red" }
    }),
    (error) => error.code === "invalid-argument"
  );
});

test("AI failures return the established fallback responses", async () => {
  const handlers = createDiaryHandlers({
    readApiKey: () => "test-key",
    createAi: () => ({ models: {} }),
    summarizeWithAi: async () => { throw new Error("simulated summary failure"); },
    drawWithAi: async () => { throw new Error("simulated drawing failure"); },
    logError: () => {}
  });

  const summary = await handlers.summarizeDiaryHandler({
    auth,
    data: { diaryText: "오늘 즐거웠다", feeling: "Happy" }
  });
  const drawing = await handlers.generateDiaryDrawingHandler({
    auth,
    data: { diaryText: "오늘 즐거웠다", feeling: "Happy", profileColorHex: "#FFF275" }
  });

  assert.equal(summary.isMock, true);
  assert.equal(typeof summary.summary, "string");
  assert.equal(drawing.isMock, true);
  assert.match(drawing.imageDataUrl, /^data:image\/svg\+xml;base64,/);
});

test("aiUsage failures do not discard successful AI responses", async () => {
  const warnings = [];
  const dbClient = {
    collection: () => ({
      add: async () => { throw new Error("simulated usage failure"); }
    })
  };
  const handlers = createDiaryHandlers({
    dbClient,
    readApiKey: () => "test-key",
    createAi: () => ({ models: {} }),
    summarizeWithAi: async () => "친구와 재미있게 놀아서 신났다.",
    drawWithAi: async () => ({
      generatedImages: [{ image: { imageBytes: "base64-image", mimeType: "image/png" } }]
    }),
    logWarning: (message, fields) => warnings.push({ message, fields })
  });

  const summary = await handlers.summarizeDiaryHandler({
    auth,
    data: { diaryText: "친구와 재미있게 놀았다", feeling: "Excited" }
  });
  const drawing = await handlers.generateDiaryDrawingHandler({
    auth,
    data: { diaryText: "친구와 재미있게 놀았다", feeling: "Excited", profileColorHex: "#FFF275" }
  });

  assert.deepEqual(summary, { summary: "친구와 재미있게 놀아서 신났다.", isMock: false });
  assert.deepEqual(drawing, {
    imageBase64: "base64-image",
    mimeType: "image/png",
    isMock: false
  });
  assert.deepEqual(warnings.map((entry) => entry.fields), [
    { usageType: "summary" },
    { usageType: "drawing-image" }
  ]);
  assert.equal(JSON.stringify(warnings).includes("reviewer@example.com"), false);
});
