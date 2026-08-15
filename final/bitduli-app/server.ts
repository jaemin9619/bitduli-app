import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.json());

const PORT = 3000;

// Lazy initialization of Gemini client
let aiClient: GoogleGenAI | null = null;

function getGeminiClient() {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn("WARNING: GEMINI_API_KEY environment variable is not set. API calls will fail.");
    }
    aiClient = new GoogleGenAI({
      apiKey: apiKey || "MOCK_API_KEY",
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

// Wrap the fallback SVG as a data URL so the client can render it in an <img>
function svgToDataUrl(svg: string): string {
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}

// API to generate a REAL AI picture-diary image (raster PNG) from diary text
app.post("/api/generate-drawing", async (req, res) => {
  try {
    const { diaryText, profileColorHex, feeling } = req.body;

    if (!diaryText) {
      return res.status(400).json({ error: "Diary text is required" });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      // No key configured: keep the app fully usable with a built-in mock drawing.
      console.log("No GEMINI_API_KEY found, returning simulated hand-drawn image.");
      const fallbackSvg = generateMockSvg(diaryText, profileColorHex || "#FFDD66", feeling || "Happy");
      return res.json({ imageDataUrl: svgToDataUrl(fallbackSvg), isMock: true });
    }

    const ai = getGeminiClient();

    // Kindergarten crayon picture-diary style. No text/stamp inside the image.
    const prompt = [
      "Create ONE square children's picture-diary drawing, exactly as if a 6-7 year old Korean kindergartener drew it with crayons on rough off-white sketch paper.",
      "Style: extremely naive, clumsy, wobbly and imperfect childlike drawing (유치원생이 그린 듯 삐뚤빼뚤하고 어리숙하며 엉성한 그림체). Thick uneven crayon strokes with visible wax texture.",
      "Color bleeding: the crayon colors MUST intentionally bleed, spill and slide OUTSIDE the outlines (색이 선 바깥으로 삐져나오게 칠한 느낌), like a child who cannot color inside the lines.",
      "The overall mood should feel awkward, simple and endearing, like a real scanned kindergarten paper drawing.",
      "ABSOLUTELY NO text, letters, numbers, words, captions, title, watermark, stamp or seal (도장) anywhere in the image.",
      "Depict the SPECIFIC scene of this diary — the actual place, people, objects, weather, action and emotion. Do NOT default to a playground, park, picnic or sunny sky unless the diary says so.",
      `Diary: ${diaryText}`,
      `Mood: ${feeling || "Happy"}`,
      `Main crayon color hint: ${profileColorHex || "#FFF275"}`
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
        },
      });
    } catch (genErr: any) {
      console.error("Imagen generation failed, using mock:", genErr?.message || genErr);
      const fallbackSvg = generateMockSvg(diaryText, profileColorHex || "#FFDD66", feeling || "Happy");
      return res.json({ imageDataUrl: svgToDataUrl(fallbackSvg), isMock: true });
    }

    const image = response.generatedImages?.[0]?.image;
    const imageBase64 = image?.imageBytes;
    if (!imageBase64) {
      console.warn("No image returned from Imagen, falling back to mock drawing.");
      const fallbackSvg = generateMockSvg(diaryText, profileColorHex || "#FFDD66", feeling || "Happy");
      return res.json({ imageDataUrl: svgToDataUrl(fallbackSvg), isMock: true });
    }

    res.json({ imageBase64, mimeType: image?.mimeType || "image/png", isMock: false });
  } catch (error: any) {
    console.error("Error generating drawing:", error);
    res.status(500).json({ error: error.message || "Failed to generate drawing" });
  }
});

// API to generate cute summary from diary text
app.post("/api/summarize-diary", async (req, res) => {
  try {
    const { diaryText, feeling } = req.body;

    if (!diaryText) {
      return res.status(400).json({ error: "Diary text is required" });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      // Warm mock summary fallback
      const feelingWords: Record<string, string> = {
        Happy: "신나고 기쁜",
        Excited: "두근두근 설레는",
        Sad: "조금은 속상한",
        Angry: "울컥 화가 났던",
        Tired: "노곤노곤 피곤했던",
        Normal: "평범하고 소소한"
      };
      const word = feelingWords[feeling as string] || "새로운 마음의";
      const mockSummary = `오늘 하루도 ${word} 마음으로 보냈구나! 내일은 더 맑을 거야 ☀️🌱`;
      return res.json({ summary: mockSummary, isMock: true });
    }

    const ai = getGeminiClient();
    const systemPrompt = `You are a warm, cute, friendly elementary school buddy or a kindergarten teacher's voice.
Summarize the user's diary text into a single, short, warm, and cute sentence in Korean (under 30 characters), starting with or containing cute elements or emojis. Use children's cute colloquial Korean ("~했구나!", "~했어!"). Always keep the tone warm, comforting, and playful. Do NOT use formal or robotic language.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: `Diary text: "${diaryText}"\nMood: "${feeling || 'Normal'}"`,
      config: {
        systemInstruction: systemPrompt,
        temperature: 0.8,
      },
    });

    const summary = (response.text || "").trim();
    res.json({ summary, isMock: false });
  } catch (error: any) {
    console.error("Error summarizing diary:", error);
    res.status(500).json({ error: error.message || "Failed to summarize diary" });
  }
});

// Helper to generate a cute mock SVG if API key is not configured or fails
function generateMockSvg(text: string, colorHex: string, feeling: string): string {
  // Determine an icon to draw based on diary contents
  // We separate the fills and outlines, shifting the fills slightly (e.g. offset by +8px, -6px) to simulate a child coloring outside the lines
  let objectIcon = `
    <!-- Clumsy circle color bleed -->
    <circle cx="208" cy="124" r="40" fill="${colorHex}" opacity="0.6" />
    <circle cx="200" cy="130" r="40" stroke="#333" stroke-width="4.5" stroke-dasharray="3 3" fill="none" />
  `;

  const lowerText = text.toLowerCase();
  if (lowerText.includes("밥") || lowerText.includes("먹") || lowerText.includes("음식") || lowerText.includes("카페") || lowerText.includes("맛")) {
    // Draw a cute sketchy cup or dish with color bleeding outside the outline
    objectIcon = `
      <!-- Bleeding color fill (offset) -->
      <path d="M 168 104 Q 170 154 208 154 Q 246 154 248 104 Z" fill="${colorHex}" opacity="0.6" />
      <circle cx="248" cy="135" r="14" fill="${colorHex}" opacity="0.4" />
      
      <!-- Charcoal shaky outlines -->
      <path d="M 160 110 Q 162 160 200 160 Q 238 160 240 110" stroke="#333333" stroke-width="4.5" fill="none" stroke-linecap="round" stroke-linejoin="round" />
      <path d="M 150 110 L 250 110" stroke="#333333" stroke-width="4.5" stroke-linecap="round" />
      <path d="M 240 120 Q 260 120 260 135 Q 260 150 240 150" stroke="#333333" stroke-width="4" fill="none" stroke-linecap="round" />
      
      <!-- Clumsy Steam -->
      <path d="M 178 88 Q 183 78 178 68" stroke="#333333" stroke-width="3" fill="none" stroke-linecap="round" />
      <path d="M 198 88 Q 203 76 198 68" stroke="#333333" stroke-width="3" fill="none" stroke-linecap="round" />
      <path d="M 218 88 Q 223 78 218 68" stroke="#333333" stroke-width="3" fill="none" stroke-linecap="round" />
    `;
  } else if (lowerText.includes("공부") || lowerText.includes("책") || lowerText.includes("학교") || lowerText.includes("일") || lowerText.includes("작업")) {
    // Draw a sketchy open book with offset fills
    objectIcon = `
      <!-- Bleeding color fill (offset) -->
      <path d="M 208 106 Q 168 96 128 111 L 128 161 Q 168 146 208 156 Z" fill="${colorHex}" opacity="0.5" />
      <path d="M 208 106 Q 248 96 288 111 L 288 161 Q 248 146 208 156 Z" fill="${colorHex}" opacity="0.5" />
      
      <!-- Charcoal shaky outlines -->
      <path d="M 200 160 L 200 100" stroke="#333333" stroke-width="4.5" stroke-linecap="round" />
      <path d="M 200 100 Q 160 90 120 105 L 120 155 Q 160 140 200 150" stroke="#333333" stroke-width="4" fill="none" stroke-linecap="round" />
      <path d="M 200 100 Q 240 90 280 105 L 280 155 Q 240 140 200 150" stroke="#333333" stroke-width="4" fill="none" stroke-linecap="round" />
      
      <!-- Shaky Sparkles -->
      <path d="M 140 75 L 140 85 M 135 80 L 145 80" stroke="#333333" stroke-width="2.5" stroke-linecap="round" />
      <path d="M 260 70 L 260 80 M 255 75 L 265 75" stroke="#333333" stroke-width="2.5" stroke-linecap="round" />
    `;
  } else if (lowerText.includes("운동") || lowerText.includes("산책") || lowerText.includes("달리기") || lowerText.includes("헬스") || lowerText.includes("걷")) {
    // Draw sketchy mountain/sun with offset bleeding colors
    objectIcon = `
      <!-- Bleeding color fill (offset) -->
      <circle cx="206" cy="94" r="25" fill="#FFAE34" opacity="0.75" />
      <path d="M 118 154 Q 158 114 208 144 Q 258 104 298 154 Z" fill="#4ADE80" opacity="0.5" />
      
      <!-- Charcoal shaky outlines -->
      <circle cx="200" cy="100" r="25" stroke="#333333" stroke-width="4.5" fill="none" stroke-dasharray="3 2" />
      <path d="M 110 160 Q 150 120 200 150 Q 250 110 290 160" stroke="#333333" stroke-width="4.5" fill="none" stroke-linecap="round" />
      
      <!-- Shaky Cloud -->
      <path d="M 250 85 Q 260 75 275 80 Q 290 80 290 90 Q 290 100 270 98 L 250 98" stroke="#333333" stroke-width="3" fill="none" stroke-linecap="round" />
    `;
  } else if (lowerText.includes("비") || lowerText.includes("우산") || lowerText.includes("장마") || lowerText.includes("흐림")) {
    // Draw sketchy umbrella with offset bleeding rain
    objectIcon = `
      <!-- Bleeding color fill (offset) -->
      <path d="M 158 114 Q 208 64 258 114 Z" fill="${colorHex}" opacity="0.6" />
      <path d="M 148 114 L 258 114" stroke="${colorHex}" stroke-width="12" stroke-linecap="round" opacity="0.3" />
      
      <!-- Charcoal shaky outlines -->
      <path d="M 150 120 Q 200 70 250 120" stroke="#333333" stroke-width="4.5" fill="none" stroke-linecap="round" />
      <path d="M 150 120 L 250 120" stroke="#333333" stroke-width="4" stroke-linecap="round" />
      <path d="M 200 120 L 200 155 Q 200 165 210 165" stroke="#333333" stroke-width="4.5" fill="none" stroke-linecap="round" />
      
      <!-- Clumsy Raindrops -->
      <path d="M 130 60 L 125 75" stroke="#3B82F6" stroke-width="3.5" stroke-linecap="round" />
      <path d="M 170 50 L 165 65" stroke="#3B82F6" stroke-width="3.5" stroke-linecap="round" />
      <path d="M 230 50 L 225 65" stroke="#3B82F6" stroke-width="3.5" stroke-linecap="round" />
      <path d="M 270 60 L 265 75" stroke="#3B82F6" stroke-width="3.5" stroke-linecap="round" />
    `;
  } else {
    // Default: Cute drawing of a smiling face character with offset hair & face fills
    let eyePath = `<circle cx="175" cy="115" r="4.5" fill="#333333" /><circle cx="225" cy="115" r="4.5" fill="#333333" />`;
    let mouthPath = `<path d="M 185 140 Q 200 155 215 140" stroke="#333333" stroke-width="4.5" fill="none" stroke-linecap="round" />`;
    
    if (feeling === "Happy" || feeling === "Excited") {
      mouthPath = `<path d="M 180 135 Q 200 160 220 135" stroke="#333333" stroke-width="4.5" fill="none" stroke-linecap="round" />`;
      eyePath = `
        <path d="M 165 118 Q 175 108 185 118" stroke="#333333" stroke-width="3.5" fill="none" stroke-linecap="round" />
        <path d="M 215 118 Q 225 108 235 118" stroke="#333333" stroke-width="3.5" fill="none" stroke-linecap="round" />
      `;
    } else if (feeling === "Sad" || feeling === "Tired") {
      mouthPath = `<path d="M 185 145 Q 200 135 215 145" stroke="#333333" stroke-width="4" fill="none" stroke-linecap="round" />`;
      eyePath = `
        <path d="M 165 112 Q 175 120 185 115" stroke="#333333" stroke-width="3.5" fill="none" stroke-linecap="round" />
        <path d="M 215 112 Q 225 120 235 115" stroke="#333333" stroke-width="3.5" fill="none" stroke-linecap="round" />
        <!-- Clumsy Tears -->
        <path d="M 175 122 L 173 133" stroke="#3B82F6" stroke-width="3" fill="none" stroke-linecap="round" />
      `;
    } else if (feeling === "Angry") {
      mouthPath = `<path d="M 185 140 L 215 140" stroke="#333333" stroke-width="4.5" fill="none" stroke-linecap="round" />`;
      eyePath = `
        <path d="M 165 118 L 180 110" stroke="#333333" stroke-width="4" stroke-linecap="round" />
        <path d="M 235 118 L 220 110" stroke="#333333" stroke-width="4" stroke-linecap="round" />
        <circle cx="175" cy="120" r="3.5" fill="#333333" />
        <circle cx="225" cy="120" r="3.5" fill="#333333" />
      `;
    }

    objectIcon = `
      <!-- Bleeding color fill for face (offset drastically to show kid color bleed style!) -->
      <path d="M 163 114 Q 158 154 208 159 Q 258 154 253 114 Q 248 79 208 79 Q 168 79 163 114" fill="${colorHex}" opacity="0.6" />
      
      <!-- Charcoal shaky outlines -->
      <path d="M 155 120 Q 150 160 200 165 Q 250 160 245 120 Q 240 85 200 85 Q 160 85 155 120" stroke="#333333" stroke-width="4.5" fill="none" stroke-linecap="round" />
      
      <!-- 3 Shaky Hair strands -->
      <path d="M 195 85 Q 192 73 192 70" stroke="#333333" stroke-width="3.5" stroke-linecap="round" />
      <path d="M 200 85 Q 200 71 201 68" stroke="#333333" stroke-width="3.5" stroke-linecap="round" />
      <path d="M 205 85 Q 210 74 213 72" stroke="#333333" stroke-width="3.5" stroke-linecap="round" />
      
      ${eyePath}
      ${mouthPath}
    `;
  }

  return `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" width="100%" height="100%">
      <!-- Hand-drawn background card with cream-canvas -->
      <rect x="10" y="10" width="380" height="280" rx="15" fill="#FCF9F2" stroke="#333333" stroke-width="2.5" stroke-dasharray="6 4" />
      
      <!-- Main visual element -->
      <g transform="translate(0, 10)">
        ${objectIcon}
      </g>
      
      <!-- Adorable, clumsy crayon star/flower decorations on the margins with color bleeding -->
      <!-- Clumsy Star 1 (Left-top) -->
      <g transform="translate(45, 45)">
        <polygon points="10,2 12,8 18,8 13,12 15,18 10,14 5,18 7,12 2,8 8,8" fill="#FFF275" opacity="0.6" />
        <polygon points="10,2 12,8 18,8 13,12 15,18 10,14 5,18 7,12 2,8 8,8" stroke="#333" stroke-width="1.8" fill="none" stroke-linejoin="round" />
      </g>
      
      <!-- Clumsy Flower 2 (Right-bottom) -->
      <g transform="translate(330, 230)">
        <!-- Petals bleeding -->
        <circle cx="14" cy="10" r="7" fill="#FFA3A6" opacity="0.6" />
        <circle cx="22" cy="14" r="7" fill="#FFA3A6" opacity="0.6" />
        <circle cx="14" cy="18" r="7" fill="#FFA3A6" opacity="0.6" />
        <circle cx="6" cy="14" r="7" fill="#FFA3A6" opacity="0.6" />
        <circle cx="14" cy="14" r="5" fill="#FFF275" opacity="0.7" />
        <!-- Outlines -->
        <circle cx="14" cy="14" r="12" stroke="#333" stroke-width="2" fill="none" stroke-dasharray="3 3" />
      </g>
      
      <!-- Tiny colorful blobs -->
      <circle cx="330" cy="50" r="5" fill="#B9D5FF" opacity="0.7" />
      <circle cx="70" cy="240" r="4" fill="#CBD5E1" opacity="0.7" />
    </svg>
  `.trim();
}

async function startServer() {
  // Vite dev server integration
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server is running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
