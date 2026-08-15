export type FeelingType = "Happy" | "Sad" | "Angry" | "Excited" | "Tired" | "Calm";

export interface UserProfile {
  nickname: string;
  profileColorName: string;
  profileColorHex: string;
  email: string;
}

export interface DiaryEntry {
  date: string; // YYYY-MM-DD
  text: string;
  imageUrl?: string; // Generated diary image URL
  imageStoragePath?: string;
  svgDrawing?: string; // Legacy SVG drawing code
  feeling: FeelingType;
  title?: string;
  weather?: string;
  isPublic?: boolean;
  createdAt: string;
  summary?: string; // Optional child-like summary for manuscript mode
}

export interface ThemeColor {
  name: string;
  hex: string;
  bgClass: string;
  textClass: string;
  borderClass: string;
}
