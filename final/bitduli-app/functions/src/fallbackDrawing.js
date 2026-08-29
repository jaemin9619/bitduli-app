/** Returns the existing deterministic summary when Gemini is unavailable. */
export function fallbackSummary(feeling = "Happy") {
  const words = {
    Happy: "기분이 방긋했다",
    Excited: "두근두근했다",
    Sad: "마음이 시무룩했다",
    Angry: "속상하고 화가 났다",
    Tired: "힘들었지만 잘했다",
    Calm: "마음이 포근했다"
  };
  return words[feeling] || "오늘도 소중한 하루였다";
}

/** Builds a local SVG data URL tailored to simple diary keywords. */
export function fallbackImageDataUrl(colorHex = "#FFF275", feeling = "Happy", diaryText = "") {
  const text = String(diaryText || "").toLowerCase();
  const isSad = feeling === "Sad" || feeling === "Angry";
  const mouth = isSad
    ? '<path d="M 175 155 Q 200 137 225 155" stroke="#333333" stroke-width="5" fill="none" stroke-linecap="round" />'
    : '<path d="M 175 145 Q 200 170 225 145" stroke="#333333" stroke-width="5" fill="none" stroke-linecap="round" />';

  const has = (...words) => words.some((word) => text.includes(word));
  let scene = "";
  if (has("비", "우산", "rain", "umbrella")) {
    scene = '<path d="M40 45 L360 45" stroke="#7CB7E8" stroke-width="5" stroke-linecap="round"/><path d="M80 80 l-12 28 M140 75 l-12 28 M260 80 l-12 28 M320 75 l-12 28" stroke="#4FA3D8" stroke-width="5" stroke-linecap="round"/><path d="M120 120 Q200 65 280 120" fill="#F7A8C8" stroke="#333" stroke-width="5"/><path d="M200 120 L200 202" stroke="#333" stroke-width="5" stroke-linecap="round"/>';
  } else if (has("눈", "snow", "눈사람")) {
    scene = '<circle cx="78" cy="70" r="8" fill="#BFE8FF"/><circle cx="320" cy="90" r="7" fill="#BFE8FF"/><circle cx="275" cy="62" r="6" fill="#BFE8FF"/><circle cx="95" cy="228" r="28" fill="#FFF" stroke="#333" stroke-width="4"/><circle cx="95" cy="184" r="22" fill="#FFF" stroke="#333" stroke-width="4"/><path d="M55 238 C135 220 250 245 350 220" stroke="#BFE8FF" stroke-width="18" stroke-linecap="round" opacity="0.7"/>';
  } else if (has("수박", "밥", "먹", "간식", "케이크", "떡볶이", "피자", "food", "cake")) {
    scene = '<ellipse cx="200" cy="210" rx="95" ry="25" fill="#D9A66A" stroke="#333" stroke-width="4"/><path d="M145 170 Q200 250 255 170 Z" fill="#FF5B6E" stroke="#333" stroke-width="4"/><path d="M155 170 Q200 205 245 170" stroke="#33A852" stroke-width="10" fill="none" stroke-linecap="round"/><circle cx="188" cy="188" r="3" fill="#333"/><circle cx="210" cy="198" r="3" fill="#333"/>';
  } else if (has("도서관", "책", "공부", "숙제", "학교", "library", "book", "school")) {
    scene = '<rect x="55" y="82" width="105" height="135" fill="#F6D365" stroke="#333" stroke-width="5"/><rect x="240" y="82" width="105" height="135" fill="#A8D8FF" stroke="#333" stroke-width="5"/><path d="M72 115 H145 M72 148 H145 M72 181 H145 M257 115 H330 M257 148 H330 M257 181 H330" stroke="#333" stroke-width="4"/><path d="M165 220 Q200 185 235 220" fill="#FFF" stroke="#333" stroke-width="4"/>';
  } else if (has("공원", "놀이터", "그네", "미끄럼틀", "친구", "소풍", "park", "playground", "friend")) {
    scene = '<path d="M55 225 C120 190 170 230 235 205 S320 220 365 195" stroke="#79C267" stroke-width="14" fill="none" stroke-linecap="round"/><path d="M80 210 L160 112 L240 210" fill="none" stroke="#333" stroke-width="5"/><path d="M160 112 L160 210" stroke="#E85656" stroke-width="10" stroke-linecap="round"/><path d="M260 95 L335 95 L330 210 L270 210 Z" fill="none" stroke="#333" stroke-width="5"/><path d="M280 95 V205 M315 95 V205" stroke="#333" stroke-width="3"/>';
  } else if (has("엄마", "아빠", "가족", "집", "family", "home")) {
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
