import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import Logo from "./Logo";
import { UserProfile, DiaryEntry, FeelingType } from "../types";
import { db } from "../lib/firebase";
import { collection, doc, getDoc, getDocs, setDoc, deleteDoc, onSnapshot, query, where } from "firebase/firestore";
import { generateDiaryDrawing, summarizeDiary } from "../lib/backend";
import { 
  Calendar as CalendarIcon, 
  Book, 
  Pencil, 
  Home, 
  Users, 
  Settings, 
  LogOut, 
  ChevronLeft, 
  ChevronRight, 
  Trash2, 
  HelpCircle, 
  Heart,
  Share2,
  Download,
  Copy,
  Folder,
  Monitor,
  PlusCircle,
  Smartphone,
  UserPlus
} from "lucide-react";

interface CalendarDashboardProps {
  profile: UserProfile;
  onLogout: () => void;
}

const FEELINGS_LIST: { type: FeelingType; label: string; emoji: string; color: string; bgClass: string; borderClass: string }[] = [
  { type: "Happy", label: "기쁨", emoji: "😊", color: "#FFF275", bgClass: "bg-[#FFF275]", borderClass: "border-[#FFF275]" },
  { type: "Tired", label: "졸림", emoji: "🥱", color: "#E2D2FF", bgClass: "bg-[#E2D2FF]", borderClass: "border-[#E2D2FF]" },
  { type: "Calm", label: "무표정", emoji: "😐", color: "#CBD5E1", bgClass: "bg-[#CBD5E1]", borderClass: "border-[#CBD5E1]" },
  { type: "Sad", label: "슬픔", emoji: "😢", color: "#B9D5FF", bgClass: "bg-[#B9D5FF]", borderClass: "border-[#B9D5FF]" },
  { type: "Angry", label: "화남", emoji: "😡", color: "#FFA3A6", bgClass: "bg-[#FFA3A6]", borderClass: "border-[#FFA3A6]" },
];

// Reusable mini mood face component to match the screenshot perfectly
export function MiniMoodLogo({ feeling, size = 30 }: { feeling: FeelingType; size?: number }) {
  let eyes = <><circle cx="34" cy="44" r="3.5" fill="#333333" /><circle cx="66" cy="44" r="3.5" fill="#333333" /></>;
  let mouth = <path d="M 43 58 Q 50 66 57 57" stroke="#333333" strokeWidth="5.5" strokeLinecap="round" fill="none" />;
  let extras = null;
  let faceColor = "#FFF275"; // Default happy yellow

  if (feeling === "Happy" || feeling === "Excited") {
    faceColor = "#FFF275";
    // Wide crooked smile on the right side
    eyes = <><circle cx="34" cy="44" r="3.5" fill="#333333" /><circle cx="66" cy="44" r="3.5" fill="#333333" /></>;
    mouth = <path d="M 43 58 Q 55 64 68 53" stroke="#333333" strokeWidth="5.5" strokeLinecap="round" fill="none" />;
  } else if (feeling === "Tired") {
    faceColor = "#E2D2FF";
    // Left-down tilted single-stroke eyes (like closed eyes tilting left/right)
    eyes = <>
      <path d="M 28 40 L 40 40" stroke="#333333" strokeWidth="4.5" strokeLinecap="round" />
      <path d="M 60 40 L 72 48" stroke="#333333" strokeWidth="4.5" strokeLinecap="round" />
    </>;
    // Slightly open oval/horizontal mouth
    mouth = <ellipse cx="50" cy="62" rx="6" ry="8" stroke="#333333" strokeWidth="4" fill="none" />;
  } else if (feeling === "Calm") {
    faceColor = "#CBD5E1";
    // Straight brows, dot eyes, completely straight horizontal line mouth
    eyes = <>
      <path d="M 26 36 L 40 36" stroke="#333333" strokeWidth="4" strokeLinecap="round" />
      <path d="M 60 36 L 74 36" stroke="#333333" strokeWidth="4" strokeLinecap="round" />
      <circle cx="33" cy="46" r="3.5" fill="#333333" />
      <circle cx="67" cy="46" r="3.5" fill="#333333" />
    </>;
    mouth = <path d="M 40 58 L 60 58" stroke="#333333" strokeWidth="5" strokeLinecap="round" />;
  } else if (feeling === "Sad") {
    faceColor = "#B9D5FF";
    // Crying face, downturned mouth and blue tears
    eyes = <><circle cx="34" cy="44" r="3.5" fill="#333333" /><circle cx="66" cy="44" r="3.5" fill="#333333" /></>;
    mouth = <path d="M 40 60 Q 50 50 60 60" stroke="#333333" strokeWidth="5.5" strokeLinecap="round" fill="none" />;
    extras = <>
      {/* Cascading tears light blue/cyan */}
      <path d="M 34 50 L 34 76" stroke="#7FE0F9" strokeWidth="4" strokeLinecap="round" fill="none" />
      <path d="M 66 50 L 66 76" stroke="#7FE0F9" strokeWidth="4" strokeLinecap="round" fill="none" />
    </>;
  } else if (feeling === "Angry") {
    faceColor = "#FFA3A6";
    // Angled brows, dot eyes, downturned mouth
    eyes = <>
      <path d="M 24 35 L 38 41" stroke="#333333" strokeWidth="4.5" strokeLinecap="round" />
      <path d="M 76 35 L 62 41" stroke="#333333" strokeWidth="4.5" strokeLinecap="round" />
      <circle cx="33" cy="48" r="3.5" fill="#333333" />
      <circle cx="67" cy="48" r="3.5" fill="#333333" />
    </>;
    mouth = <path d="M 40 60 Q 50 48 60 60" stroke="#333333" strokeWidth="5.5" strokeLinecap="round" fill="none" />;
  }

  return (
    <svg viewBox="0 0 100 100" style={{ width: size, height: size }} fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Crooked head background colored fill */}
      <path
        d="M 50 15 Q 82 17 85 50 Q 88 83 50 85 Q 13 83 15 50 Q 17 17 50 15 Z"
        fill={faceColor}
        stroke="#333333"
        strokeWidth="4.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M 52 17 Q 84 20 83 48 Q 82 81 48 83 Q 16 80 18 52 Q 20 20 52 17 Z"
        stroke="#333333"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.8"
      />
      {/* 3 Hair Strands */}
      <path d="M 45 16 Q 43 6 43 4" stroke="#333333" strokeWidth="3.6" strokeLinecap="round" />
      <path d="M 51 15 Q 52 5 53 3" stroke="#333333" strokeWidth="3.6" strokeLinecap="round" />
      <path d="M 57 16 Q 61 7 64 5" stroke="#333333" strokeWidth="3.6" strokeLinecap="round" />
      {eyes}
      {mouth}
      {extras}
    </svg>
  );
}

export function summarizeTextLocally(text: string, feeling: FeelingType): string {
  if (!text) return "";
  const clean = text.replace(/\s+/g, " ").trim();
  
  // Custom manual mappings for all standard/seeded entries to ensure perfect layout!
  const manualMap: Record<string, string> = {
    // July 1
    "오늘은 삐뚤 그림일기를 쓰기 시작한 첫날이다. 날씨도 화창하고 아침 산책도 다녀와서 너무 기분 좋은 수요일이었다. 앞으로 좋은 일들을 많이 채우고 싶다.": "오늘 처음으로 삐뚤 그림일기를 써서 아주 신났다!",
    // July 2
    "하루 종일 바빠서 온몸이 뻐근하다. 밤늦게까지 야근을 하고 들어와 씻으니 꼼짝도 하기 싫을 정도로 엄청 피곤했다. 하지만 보람찬 구석도 있었다.": "오늘 일하느라 온몸이 찌뿌둥하고 엄청 피곤했다.",
    // July 3
    "비도 그치고 선선해서 카페 창가 자리에 앉아 흘러가는 구름을 보며 오랜 시간 책을 읽었다. 복잡했던 생각들이 가라앉고 평온해진 하루.": "비가 그쳐서 선선한 바람 쐬며 책을 읽어 평온했다.",
    // July 4
    "주말이라 친구들과 소풍을 갔다. 공원에서 함께 샌드위치를 나누어 먹고 실컷 수다를 떨었더니 온갖 스트레스가 날아가는 느낌이었다. 기분 최고!": "친구들이랑 맛있는 소풍을 가서 기분 최고였다!",
    // July 5
    "갑자기 오랜 추억이 깃든 장소가 떠올라 조금 쓸쓸한 기분이 들었다. 비도 내리기 시작하고, 흘러나오는 멜로디에 조용히 젖어들었던 하루.": "창밖 비 오는 걸 보며 노래 들어 왠지 쓸쓸했다.",
    // July 6
    "기획안 문제로 동료와 사소하게 마음 상할 일이 있었다. 속상하고 화도 나서 일기를 끄적이며 감정을 다스리려 노력해 본다. 조금 화가 났던 하루.": "동료와 사소한 다툼 때문에 서운하고 화가 났다.",
     "갑작스러운 소나기가 양동이 붓듯 내렸는데 하필이면 우산을 가방에 안 챙겨 나왔다. 신발이랑 양말까지 다 젖어서 엄청 시무룩하고 슬펐다.": "갑자기 소나기가 내려 우산 없이 다 젖어 슬펐다.",
    
    // Friends Seeded Entries
    "날씨가 엄청 더워서 지민이네 집 마루에 모여 시원한 수박을 잘라 먹었다! 빨갛고 달콤한 수박 한 입 베어 물자 머리가 띵할 정도로 시원했다.": "친구들이랑 달콤하고 시원한 수박을 먹었다!",
    "오늘 가위바위보 내기로 찬우가 우리에게 더블 스쿱 초코 베리 아이스크림을 샀다. 달콤하고 사르르 녹아 기분이 완전히 날아갈 것 같았다!": "찬우가 내기 져서 사준 아이스크림 먹고 날아갈 뻔!",
    "새벽 2시까지 만화책을 보느라 너무 늦게 잤더니 아침 1교시부터 졸음이 쏟아졌다. 책상에 머리를 대자마자 꿀잠을 잤다.": "만화책 늦게 봐서 학교 1교시에 꿀잠을 잤다.",
    "비가 오길래 실내인 시립도서관에 친구들과 피신했다. 조용한 열람실에서 소리 안 나게 키득거리며 추리 만화책을 읽었는데 흥미진진했다.": "비 피해 도서관 가서 흥미진진 만화책 정독했다.",
    "일요일 아침 일찍 귀여운 강아지 초코의 목줄을 채워 공원으로 향했다. 신선한 공기를 쐬며 풀숲을 달리니 강아지도 나도 기분이 맑아졌다.": "귀여운 강아지 초코와 신나게 산책을 다녀왔다!",
    "동생이 내 소중한 한정판 프라모델 로봇을 가지고 놀다가 팔을 부러뜨렸다! 정말 속상하고 화가 머리끝까지 솟아올랐지만 꾹 참았다.": "동생이 내 프라모델 로봇을 망가뜨려 정말 화났다.",
    "오늘은 빅데이터 캠프 마지막날! 프로젝트 완성을 위해 밤낮없이 고생했는데 드디어 완성했다. 지민, 찬우, 예은 모두 다 수고했어!": "빅데이터 캠프 프로젝트 멋지게 수료해서 해피!"
  };

  if (manualMap[clean]) {
    return manualMap[clean];
  }

  // Fallback heuristic: keep the event clear, but phrase it like a child's picture diary.
  const normalized = clean
    .replace(/\uC694\uC57D\s*[:\uFF1A]\s*/gi, "")
    .replace(/^\uC624\uB298[\uC740\uB294]?\s*/, "")
    .replace(/\s+/g, " ")
    .trim();

  if (/(\uD574\uCEE4\uD1A4|\uBE45\uB370\uC774\uD130|\uCEA0\uD504|\uD504\uB85C\uC81D\uD2B8)/.test(normalized)) {
    if (/1\s*\uB4F1/.test(normalized)) {
      return "\uD574\uCEE4\uD1A4 1\uB4F1\uC744 \uAFC8\uAFB8\uBA70 \uB450\uADFC\uAC70\uB838\uB2E4.";
    }
    return "\uD574\uCEE4\uD1A4\uC744 \uC5F4\uC2EC\uD788 \uD574\uC11C \uB450\uADFC\uAC70\uB838\uB2E4.";
  }

  const diarySentences = normalized.split(/[.!?]+/).map(s => s.trim()).filter(Boolean);
  const eventText = diarySentences.find(s =>
    /(\uC88B|\uC2E0\uB0A8|\uAE30\uBD84|\uC18D\uC0C1|\uD654|\uC2AC\uD514|\uC11C\uC6B4|\uD798\uB4E4|\uD53C\uACE4|\uB450\uADFC|\uC644\uC131|\uB9CC\uB4E4|\uBA39|\uB180|\uAC14|\uD588)/.test(s)
  ) || diarySentences[0] || normalized;
  const shortEvent = eventText.length > 16 ? eventText.slice(0, 16) : eventText;

  const emotionPhrase: Record<FeelingType, string> = {
    Happy: " \uAE30\uBD84\uC774 \uBC29\uAE0B\uD588\uB2E4.",
    Excited: " \uB450\uADFC\uB450\uADFC\uD588\uB2E4.",
    Tired: " \uD798\uB4E4\uC5C8\uC9C0\uB9CC \uC798\uD588\uB2E4.",
    Calm: " \uB9C8\uC74C\uC774 \uD3EC\uADFC\uD588\uB2E4.",
    Sad: " \uB9C8\uC74C\uC774 \uC2DC\uBB34\uB8E9\uD588\uB2E4.",
    Angry: " \uC18D\uC0C1\uD558\uACE0 \uD654\uAC00 \uB0AC\uB2E4."
  };

  return `${shortEvent}${emotionPhrase[feeling]}`;

  // Fallback heuristic: shorten the text to a child-like summary
  let ending = "했다!";
  if (feeling === "Happy" || feeling === "Excited") ending = " 정말 신났다!";
  else if (feeling === "Tired") ending = " 아주 피곤했다.";
  else if (feeling === "Calm") ending = " 참 조용했다.";
  else if (feeling === "Sad") ending = " 엄청 슬펐다.";
  else if (feeling === "Angry") ending = " 너무 화났다!";

  if (clean.length <= 32) return clean;

  const sentences = clean.split(/[.!?]+/).map(s => s.trim()).filter(Boolean);
  if (sentences.length > 0) {
    const first = sentences[0];
    if (first.length <= 26) {
      return first + ending;
    } else {
      return first.slice(0, 24) + " " + ending;
    }
  }

  return clean.slice(0, 25) + " " + ending;
}

interface Friend {
  id: string;
  name: string;
  email: string;
  avatar: string;
  avatarBg: string;
  profileColorHex: string;
  entries: DiaryEntry[];
}

const FRIENDS_DATA: Friend[] = [
  {
    id: "jimin",
    name: "지민이",
    email: "jimin@iceu.kr",
    avatar: "🧸",
    avatarBg: "bg-amber-100",
    profileColorHex: "#FFAE34",
    entries: [
      {
        date: "2026-07-01",
        title: "시원한 수박 파티 🍉",
        text: "날씨가 엄청 더워서 지민이네 집 마루에 모여 시원한 수박을 잘라 먹었다! 빨갛고 달콤한 수박 한 입 베어 물자 머리가 띵할 정도로 시원했다.",
        feeling: "Happy",
        weather: "Sunny",
        createdAt: "2026-07-01T18:00:00.000Z",
        isPublic: true,
        svgDrawing: `
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" width="100%" height="100%">
            <rect x="10" y="10" width="380" height="280" rx="15" fill="#FCF9F2" stroke="#22C55E" stroke-width="3" stroke-dasharray="6 3" />
            <path d="M 120 120 A 80 80 0 0 0 280 120 Z" fill="#EF4444" stroke="#333" stroke-width="3" />
            <path d="M 120 120 A 80 80 0 0 0 280 120" fill="none" stroke="#22C55E" stroke-width="8" />
            <circle cx="170" cy="140" r="3" fill="#333" />
            <circle cx="200" cy="155" r="3" fill="#333" />
            <circle cx="230" cy="140" r="3" fill="#333" />
            <circle cx="200" cy="130" r="3" fill="#333" />
            <text x="200" y="245" font-family="'Gamja Flower', cursive" font-size="22" fill="#333333" text-anchor="middle" font-weight="bold">시원하고 달달한 수박 파티 🍉</text>
          </svg>
        `.trim()
      },
      {
        date: "2026-07-02",
        title: "아이스크림 내기 🍦",
        text: "오늘 가위바위보 내기로 찬우가 우리에게 더블 스쿱 초코 베리 아이스크림을 샀다. 달콤하고 사르르 녹아 기분이 완전히 날아갈 것 같았다!",
        feeling: "Happy",
        weather: "Sunny",
        createdAt: "2026-07-02T18:00:00.000Z",
        isPublic: true,
        svgDrawing: `
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" width="100%" height="100%">
            <rect x="10" y="10" width="380" height="280" rx="15" fill="#FCF9F2" stroke="#EC4899" stroke-width="3" stroke-dasharray="6 3" />
            <polygon points="200,210 170,140 230,140" fill="#F59E0B" stroke="#333" stroke-width="3" />
            <circle cx="200" cy="120" r="30" fill="#EC4899" stroke="#333" stroke-width="3" />
            <circle cx="200" cy="85" r="25" fill="#78350F" stroke="#333" stroke-width="3" />
            <text x="200" y="250" font-family="'Gamja Flower', cursive" font-size="22" fill="#333333" text-anchor="middle" font-weight="bold">달콤 시원 아이스크림 🍦</text>
          </svg>
        `.trim()
      },
      {
        date: "2026-07-03",
        title: "피곤한 학교 종소리 💤",
        text: "새벽 2시까지 만화책을 보느라 너무 늦게 잤더니 아침 1교시부터 졸음이 쏟아졌다. 책상에 머리를 대자마자 꿀잠을 잤다.",
        feeling: "Tired",
        weather: "Cloudy",
        createdAt: "2026-07-03T18:00:00.000Z",
        isPublic: true,
        svgDrawing: `
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" width="100%" height="100%">
            <rect x="10" y="10" width="380" height="280" rx="15" fill="#FCF9F2" stroke="#6366F1" stroke-width="3" stroke-dasharray="6 3" />
            <rect x="100" y="100" width="200" height="80" rx="5" fill="#A5B4FC" stroke="#333" stroke-width="3" />
            <rect x="110" y="85" width="40" height="20" rx="4" fill="#FFF" stroke="#333" stroke-width="2.5" />
            <path d="M 170 120 C 190 100, 210 130, 240 110" fill="none" stroke="#4F46E5" stroke-width="4.5" stroke-linecap="round" />
            <text x="260" y="80" font-family="'Gamja Flower', cursive" font-size="24" fill="#4F46E5" font-weight="bold">Zzz</text>
            <text x="200" y="245" font-family="'Gamja Flower', cursive" font-size="22" fill="#333333" text-anchor="middle" font-weight="bold">하루 종일 노곤노곤.. 💤</text>
          </svg>
        `.trim()
      },
      {
        date: "2026-07-04",
        title: "도서관 모험기 📚",
        text: "비가 오길래 실내인 시립도서관에 친구들과 피신했다. 조용한 열람실에서 소리 안 나게 키득거리며 추리 만화책을 읽었는데 흥미진진했다.",
        feeling: "Calm",
        weather: "Cloudy",
        createdAt: "2026-07-04T18:00:00.000Z",
        isPublic: true,
        svgDrawing: `
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" width="100%" height="100%">
            <rect x="10" y="10" width="380" height="280" rx="15" fill="#FCF9F2" stroke="#14B8A6" stroke-width="3" stroke-dasharray="6 3" />
            <rect x="130" y="100" width="60" height="90" rx="4" fill="#0D9488" stroke="#333" stroke-width="3" transform="rotate(-15 130 100)" />
            <rect x="210" y="90" width="60" height="90" rx="4" fill="#06B6D4" stroke="#333" stroke-width="3" />
            <path d="M 225 110 L 255 110 M 225 130 L 255 130" stroke="#FFF" stroke-width="3" stroke-linecap="round" />
            <text x="200" y="245" font-family="'Gamja Flower', cursive" font-size="22" fill="#333333" text-anchor="middle" font-weight="bold">도서관에서 마음의 양식 📚</text>
          </svg>
        `.trim()
      },
      {
        date: "2026-07-05",
        title: "강아지와 숲 속 산책 🌳",
        text: "일요일 아침 일찍 귀여운 강아지 초코의 목줄을 채워 공원으로 향했다. 신선한 공기를 쐬며 풀숲을 달리니 강아지도 나도 기분이 맑아졌다.",
        feeling: "Happy",
        weather: "Sunny",
        createdAt: "2026-07-05T18:00:00.000Z",
        isPublic: true,
        svgDrawing: `
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" width="100%" height="100%">
            <rect x="10" y="10" width="380" height="280" rx="15" fill="#FCF9F2" stroke="#22C55E" stroke-width="3" stroke-dasharray="6 3" />
            <rect x="150" y="130" width="15" height="50" fill="#78350F" stroke="#333" stroke-width="3" />
            <path d="M 120 130 C 120 90, 195 90, 195 130 Z" fill="#22C55E" stroke="#333" stroke-width="3" />
            <rect x="230" y="120" width="15" height="60" fill="#78350F" stroke="#333" stroke-width="3" />
            <path d="M 200 120 C 200 80, 275 80, 275 120 Z" fill="#16A34A" stroke="#333" stroke-width="3" />
            <text x="200" y="245" font-family="'Gamja Flower', cursive" font-size="22" fill="#333333" text-anchor="middle" font-weight="bold">푸르른 숲 속 힐링 산책 🌳</text>
          </svg>
        `.trim()
      },
      {
        date: "2026-07-06",
        title: "부서진 내 장난감 로봇 🤖",
        text: "동생이 내 소중한 한정판 프라모델 로봇을 가지고 놀다가 팔을 부러뜨렸다! 정말 속상하고 화가 머리끝까지 솟아올랐지만 꾹 참았다.",
        feeling: "Angry",
        weather: "Cloudy",
        createdAt: "2026-07-06T18:00:00.000Z",
        isPublic: true,
        svgDrawing: `
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" width="100%" height="100%">
            <rect x="10" y="10" width="380" height="280" rx="15" fill="#FCF9F2" stroke="#EF4444" stroke-width="3" stroke-dasharray="6 3" />
            <rect x="160" y="100" width="80" height="80" rx="8" fill="#94A3B8" stroke="#333" stroke-width="3" />
            <rect x="180" y="60" width="40" height="40" rx="4" fill="#CBD5E1" stroke="#333" stroke-width="3" />
            <rect x="110" y="170" width="15" height="40" rx="3" fill="#64748B" stroke="#333" stroke-width="3" transform="rotate(45 110 170)" />
            <path d="M 180 120 L 200 130 L 195 145" stroke="#EF4444" stroke-width="3" fill="none" />
            <text x="200" y="245" font-family="'Gamja Flower', cursive" font-size="22" fill="#333333" text-anchor="middle" font-weight="bold">장난감이 부서져 속상했던 날 🤖💔</text>
          </svg>
        `.trim()
      },
      {
        date: "2026-07-07",
        title: "비를 쫄딱 맞은 오후 ☔️",
        text: "갑작스러운 소나기가 양동이 붓듯 내렸는데 하필이면 우산을 가방에 안 챙겨 나왔다. 신발이랑 양말까지 다 젖어서 엄청 시무룩하고 슬펐다.",
        feeling: "Sad",
        weather: "Rainy",
        createdAt: "2026-07-07T18:00:00.000Z",
        isPublic: true,
        svgDrawing: `
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" width="100%" height="100%">
            <rect x="10" y="10" width="380" height="280" rx="15" fill="#FCF9F2" stroke="#3B82F6" stroke-width="3" stroke-dasharray="6 3" />
            <path d="M 150 100 C 130 100, 120 120, 140 140 C 140 160, 260 160, 260 140 C 280 120, 270 100, 250 100 C 240 80, 160 80, 150 100 Z" fill="#94A3B8" stroke="#333" stroke-width="3" />
            <path d="M 160 170 L 155 185 M 200 170 L 195 185 M 240 170 L 235 185" stroke="#3B82F6" stroke-width="4.5" stroke-linecap="round" />
            <text x="200" y="245" font-family="'Gamja Flower', cursive" font-size="22" fill="#333333" text-anchor="middle" font-weight="bold">비 오는 날의 추적추적 오후 ☔️</text>
          </svg>
        `.trim()
      },
      {
        date: "2026-07-08",
        title: "드디어 캠프 수료! 🎉",
        text: "오늘은 빅데이터 캠프 마지막날! 프로젝트 완성을 위해 밤낮없이 고생했는데 드디어 완성했다. 지민, 찬우, 예은 모두 다 수고했어!",
        feeling: "Happy",
        weather: "Sunny",
        createdAt: "2026-07-08T18:00:00.000Z",
        isPublic: true,
        svgDrawing: `
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" width="100%" height="100%">
            <rect x="10" y="10" width="380" height="280" rx="15" fill="#FCF9F2" stroke="#F59E0B" stroke-width="3" stroke-dasharray="6 3" />
            <rect x="130" y="80" width="140" height="90" rx="8" fill="#1E293B" stroke="#333" stroke-width="3" />
            <rect x="145" y="95" width="110" height="60" rx="4" fill="#38BDF8" stroke="#333" stroke-width="2.5" />
            <text x="200" y="130" font-family="monospace" font-size="12" fill="#1E293B" text-anchor="middle" font-weight="bold">CAMP COMPLETED!</text>
            <polygon points="100,80 105,95 120,95 110,105 115,120 100,110 85,120 90,105 80,95 95,95" fill="#FBBF24" stroke="#333" stroke-width="2" />
            <polygon points="300,120 305,135 320,135 310,145 315,160 300,150 285,160 290,145 280,135 295,135" fill="#F43F5E" stroke="#333" stroke-width="2" />
            <text x="200" y="245" font-family="'Gamja Flower', cursive" font-size="22" fill="#333333" text-anchor="middle" font-weight="bold">빅데이터 캠프 수료 및 프로젝트 성공! 🎉</text>
          </svg>
        `.trim()
      }
    ]
  },
  {
    id: "chanwoo",
    name: "찬우",
    email: "chanwoo@iceu.kr",
    avatar: "🦖",
    avatarBg: "bg-emerald-100",
    profileColorHex: "#4ADE80",
    entries: [
      {
        date: "2026-07-01",
        title: "시원한 수박 파티 🍉",
        text: "날씨가 엄청 더워서 지민이네 집 마루에 모여 시원한 수박을 잘라 먹었다! 빨갛고 달콤한 수박 한 입 베어 물자 머리가 띵할 정도로 시원했다.",
        feeling: "Happy",
        weather: "Sunny",
        createdAt: "2026-07-01T18:00:00.000Z",
        isPublic: true,
        svgDrawing: `
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" width="100%" height="100%">
            <rect x="10" y="10" width="380" height="280" rx="15" fill="#FCF9F2" stroke="#22C55E" stroke-width="3" stroke-dasharray="6 3" />
            <path d="M 120 120 A 80 80 0 0 0 280 120 Z" fill="#EF4444" stroke="#333" stroke-width="3" />
            <path d="M 120 120 A 80 80 0 0 0 280 120" fill="none" stroke="#22C55E" stroke-width="8" />
            <circle cx="170" cy="140" r="3" fill="#333" />
            <circle cx="200" cy="155" r="3" fill="#333" />
            <circle cx="230" cy="140" r="3" fill="#333" />
            <circle cx="200" cy="130" r="3" fill="#333" />
            <text x="200" y="245" font-family="'Gamja Flower', cursive" font-size="22" fill="#333333" text-anchor="middle" font-weight="bold">시원하고 달달한 수박 파티 🍉</text>
          </svg>
        `.trim()
      },
      {
        date: "2026-07-02",
        title: "아이스크림 내기 🍦",
        text: "오늘 가위바위보 내기로 찬우가 우리에게 더블 스쿱 초코 베리 아이스크림을 샀다. 달콤하고 사르르 녹아 기분이 완전히 날아갈 것 같았다!",
        feeling: "Happy",
        weather: "Sunny",
        createdAt: "2026-07-02T18:00:00.000Z",
        isPublic: true,
        svgDrawing: `
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" width="100%" height="100%">
            <rect x="10" y="10" width="380" height="280" rx="15" fill="#FCF9F2" stroke="#EC4899" stroke-width="3" stroke-dasharray="6 3" />
            <polygon points="200,210 170,140 230,140" fill="#F59E0B" stroke="#333" stroke-width="3" />
            <circle cx="200" cy="120" r="30" fill="#EC4899" stroke="#333" stroke-width="3" />
            <circle cx="200" cy="85" r="25" fill="#78350F" stroke="#333" stroke-width="3" />
            <text x="200" y="250" font-family="'Gamja Flower', cursive" font-size="22" fill="#333333" text-anchor="middle" font-weight="bold">달콤 시원 아이스크림 🍦</text>
          </svg>
        `.trim()
      },
      {
        date: "2026-07-03",
        title: "피곤한 학교 종소리 💤",
        text: "새벽 2시까지 만화책을 보느라 너무 늦게 잤더니 아침 1교시부터 졸음이 쏟아졌다. 책상에 머리를 대자마자 꿀잠을 잤다.",
        feeling: "Tired",
        weather: "Cloudy",
        createdAt: "2026-07-03T18:00:00.000Z",
        isPublic: true,
        svgDrawing: `
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" width="100%" height="100%">
            <rect x="10" y="10" width="380" height="280" rx="15" fill="#FCF9F2" stroke="#6366F1" stroke-width="3" stroke-dasharray="6 3" />
            <rect x="100" y="100" width="200" height="80" rx="5" fill="#A5B4FC" stroke="#333" stroke-width="3" />
            <rect x="110" y="85" width="40" height="20" rx="4" fill="#FFF" stroke="#333" stroke-width="2.5" />
            <path d="M 170 120 C 190 100, 210 130, 240 110" fill="none" stroke="#4F46E5" stroke-width="4.5" stroke-linecap="round" />
            <text x="260" y="80" font-family="'Gamja Flower', cursive" font-size="24" fill="#4F46E5" font-weight="bold">Zzz</text>
            <text x="200" y="245" font-family="'Gamja Flower', cursive" font-size="22" fill="#333333" text-anchor="middle" font-weight="bold">하루 종일 노곤노곤.. 💤</text>
          </svg>
        `.trim()
      },
      {
        date: "2026-07-04",
        title: "도서관 모험기 📚",
        text: "비가 오길래 실내인 시립도서관에 친구들과 피신했다. 조용한 열람실에서 소리 안 나게 키득거리며 추리 만화책을 읽었는데 흥미진진했다.",
        feeling: "Calm",
        weather: "Cloudy",
        createdAt: "2026-07-04T18:00:00.000Z",
        isPublic: true,
        svgDrawing: `
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" width="100%" height="100%">
            <rect x="10" y="10" width="380" height="280" rx="15" fill="#FCF9F2" stroke="#14B8A6" stroke-width="3" stroke-dasharray="6 3" />
            <rect x="130" y="100" width="60" height="90" rx="4" fill="#0D9488" stroke="#333" stroke-width="3" transform="rotate(-15 130 100)" />
            <rect x="210" y="90" width="60" height="90" rx="4" fill="#06B6D4" stroke="#333" stroke-width="3" />
            <path d="M 225 110 L 255 110 M 225 130 L 255 130" stroke="#FFF" stroke-width="3" stroke-linecap="round" />
            <text x="200" y="245" font-family="'Gamja Flower', cursive" font-size="22" fill="#333333" text-anchor="middle" font-weight="bold">도서관에서 마음의 양식 📚</text>
          </svg>
        `.trim()
      },
      {
        date: "2026-07-05",
        title: "강아지와 숲 속 산책 🌳",
        text: "일요일 아침 일찍 귀여운 강아지 초코의 목줄을 채워 공원으로 향했다. 신선한 공기를 쐬며 풀숲을 달리니 강아지도 나도 기분이 맑아졌다.",
        feeling: "Happy",
        weather: "Sunny",
        createdAt: "2026-07-05T18:00:00.000Z",
        isPublic: true,
        svgDrawing: `
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" width="100%" height="100%">
            <rect x="10" y="10" width="380" height="280" rx="15" fill="#FCF9F2" stroke="#22C55E" stroke-width="3" stroke-dasharray="6 3" />
            <rect x="150" y="130" width="15" height="50" fill="#78350F" stroke="#333" stroke-width="3" />
            <path d="M 120 130 C 120 90, 195 90, 195 130 Z" fill="#22C55E" stroke="#333" stroke-width="3" />
            <rect x="230" y="120" width="15" height="60" fill="#78350F" stroke="#333" stroke-width="3" />
            <path d="M 200 120 C 200 80, 275 80, 275 120 Z" fill="#16A34A" stroke="#333" stroke-width="3" />
            <text x="200" y="245" font-family="'Gamja Flower', cursive" font-size="22" fill="#333333" text-anchor="middle" font-weight="bold">푸르른 숲 속 힐링 산책 🌳</text>
          </svg>
        `.trim()
      },
      {
        date: "2026-07-06",
        title: "부서진 내 장난감 로봇 🤖",
        text: "동생이 내 소중한 한정판 프라모델 로봇을 가지고 놀다가 팔을 부러뜨렸다! 정말 속상하고 화가 머리끝까지 솟아올랐지만 꾹 참았다.",
        feeling: "Angry",
        weather: "Cloudy",
        createdAt: "2026-07-06T18:00:00.000Z",
        isPublic: true,
        svgDrawing: `
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" width="100%" height="100%">
            <rect x="10" y="10" width="380" height="280" rx="15" fill="#FCF9F2" stroke="#EF4444" stroke-width="3" stroke-dasharray="6 3" />
            <rect x="160" y="100" width="80" height="80" rx="8" fill="#94A3B8" stroke="#333" stroke-width="3" />
            <rect x="180" y="60" width="40" height="40" rx="4" fill="#CBD5E1" stroke="#333" stroke-width="3" />
            <rect x="110" y="170" width="15" height="40" rx="3" fill="#64748B" stroke="#333" stroke-width="3" transform="rotate(45 110 170)" />
            <path d="M 180 120 L 200 130 L 195 145" stroke="#EF4444" stroke-width="3" fill="none" />
            <text x="200" y="245" font-family="'Gamja Flower', cursive" font-size="22" fill="#333333" text-anchor="middle" font-weight="bold">장난감이 부서져 속상했던 날 🤖💔</text>
          </svg>
        `.trim()
      },
      {
        date: "2026-07-07",
        title: "비를 쫄딱 맞은 오후 ☔️",
        text: "갑작스러운 소나기가 양동이 붓듯 내렸는데 하필이면 우산을 가방에 안 챙겨 나왔다. 신발이랑 양말까지 다 젖어서 엄청 시무룩하고 슬펐다.",
        feeling: "Sad",
        weather: "Rainy",
        createdAt: "2026-07-07T18:00:00.000Z",
        isPublic: true,
        svgDrawing: `
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" width="100%" height="100%">
            <rect x="10" y="10" width="380" height="280" rx="15" fill="#FCF9F2" stroke="#3B82F6" stroke-width="3" stroke-dasharray="6 3" />
            <path d="M 150 100 C 130 100, 120 120, 140 140 C 140 160, 260 160, 260 140 C 280 120, 270 100, 250 100 C 240 80, 160 80, 150 100 Z" fill="#94A3B8" stroke="#333" stroke-width="3" />
            <path d="M 160 170 L 155 185 M 200 170 L 195 185 M 240 170 L 235 185" stroke="#3B82F6" stroke-width="4.5" stroke-linecap="round" />
            <text x="200" y="245" font-family="'Gamja Flower', cursive" font-size="22" fill="#333333" text-anchor="middle" font-weight="bold">비 오는 날의 추적추적 오후 ☔️</text>
          </svg>
        `.trim()
      },
      {
        date: "2026-07-08",
        title: "드디어 캠프 수료! 🎉",
        text: "오늘은 빅데이터 캠프 마지막날! 프로젝트 완성을 위해 밤낮없이 고생했는데 드디어 완성했다. 지민, 찬우, 예은 모두 다 수고했어!",
        feeling: "Happy",
        weather: "Sunny",
        createdAt: "2026-07-08T18:00:00.000Z",
        isPublic: true,
        svgDrawing: `
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" width="100%" height="100%">
            <rect x="10" y="10" width="380" height="280" rx="15" fill="#FCF9F2" stroke="#F59E0B" stroke-width="3" stroke-dasharray="6 3" />
            <rect x="130" y="80" width="140" height="90" rx="8" fill="#1E293B" stroke="#333" stroke-width="3" />
            <rect x="145" y="95" width="110" height="60" rx="4" fill="#38BDF8" stroke="#333" stroke-width="2.5" />
            <text x="200" y="130" font-family="monospace" font-size="12" fill="#1E293B" text-anchor="middle" font-weight="bold">CAMP COMPLETED!</text>
            <polygon points="100,80 105,95 120,95 110,105 115,120 100,110 85,120 90,105 80,95 95,95" fill="#FBBF24" stroke="#333" stroke-width="2" />
            <polygon points="300,120 305,135 320,135 310,145 315,160 300,150 285,160 290,145 280,135 295,135" fill="#F43F5E" stroke="#333" stroke-width="2" />
            <text x="200" y="245" font-family="'Gamja Flower', cursive" font-size="22" fill="#333333" text-anchor="middle" font-weight="bold">빅데이터 캠프 수료 및 프로젝트 성공! 🎉</text>
          </svg>
        `.trim()
      }
    ]
  },
  {
    id: "yeeun",
    name: "예은이",
    email: "yeeun@iceu.kr",
    avatar: "🦊",
    avatarBg: "bg-orange-100",
    profileColorHex: "#FF8B3D",
    entries: [
      {
        date: "2026-07-01",
        title: "시원한 수박 파티 🍉",
        text: "날씨가 엄청 더워서 지민이네 집 마루에 모여 시원한 수박을 잘라 먹었다! 빨갛고 달콤한 수박 한 입 베어 물자 머리가 띵할 정도로 시원했다.",
        feeling: "Happy",
        weather: "Sunny",
        createdAt: "2026-07-01T18:00:00.000Z",
        isPublic: true,
        svgDrawing: `
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" width="100%" height="100%">
            <rect x="10" y="10" width="380" height="280" rx="15" fill="#FCF9F2" stroke="#22C55E" stroke-width="3" stroke-dasharray="6 3" />
            <path d="M 120 120 A 80 80 0 0 0 280 120 Z" fill="#EF4444" stroke="#333" stroke-width="3" />
            <path d="M 120 120 A 80 80 0 0 0 280 120" fill="none" stroke="#22C55E" stroke-width="8" />
            <circle cx="170" cy="140" r="3" fill="#333" />
            <circle cx="200" cy="155" r="3" fill="#333" />
            <circle cx="230" cy="140" r="3" fill="#333" />
            <circle cx="200" cy="130" r="3" fill="#333" />
            <text x="200" y="245" font-family="'Gamja Flower', cursive" font-size="22" fill="#333333" text-anchor="middle" font-weight="bold">시원하고 달달한 수박 파티 🍉</text>
          </svg>
        `.trim()
      },
      {
        date: "2026-07-02",
        title: "아이스크림 내기 🍦",
        text: "오늘 가위바위보 내기로 찬우가 우리에게 더블 스쿱 초코 베리 아이스크림을 샀다. 달콤하고 사르르 녹아 기분이 완전히 날아갈 것 같았다!",
        feeling: "Happy",
        weather: "Sunny",
        createdAt: "2026-07-02T18:00:00.000Z",
        isPublic: true,
        svgDrawing: `
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" width="100%" height="100%">
            <rect x="10" y="10" width="380" height="280" rx="15" fill="#FCF9F2" stroke="#EC4899" stroke-width="3" stroke-dasharray="6 3" />
            <polygon points="200,210 170,140 230,140" fill="#F59E0B" stroke="#333" stroke-width="3" />
            <circle cx="200" cy="120" r="30" fill="#EC4899" stroke="#333" stroke-width="3" />
            <circle cx="200" cy="85" r="25" fill="#78350F" stroke="#333" stroke-width="3" />
            <text x="200" y="250" font-family="'Gamja Flower', cursive" font-size="22" fill="#333333" text-anchor="middle" font-weight="bold">달콤 시원 아이스크림 🍦</text>
          </svg>
        `.trim()
      },
      {
        date: "2026-07-03",
        title: "피곤한 학교 종소리 💤",
        text: "새벽 2시까지 만화책을 보느라 너무 늦게 잤더니 아침 1교시부터 졸음이 쏟아졌다. 책상에 머리를 대자마자 꿀잠을 잤다.",
        feeling: "Tired",
        weather: "Cloudy",
        createdAt: "2026-07-03T18:00:00.000Z",
        isPublic: true,
        svgDrawing: `
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" width="100%" height="100%">
            <rect x="10" y="10" width="380" height="280" rx="15" fill="#FCF9F2" stroke="#6366F1" stroke-width="3" stroke-dasharray="6 3" />
            <rect x="100" y="100" width="200" height="80" rx="5" fill="#A5B4FC" stroke="#333" stroke-width="3" />
            <rect x="110" y="85" width="40" height="20" rx="4" fill="#FFF" stroke="#333" stroke-width="2.5" />
            <path d="M 170 120 C 190 100, 210 130, 240 110" fill="none" stroke="#4F46E5" stroke-width="4.5" stroke-linecap="round" />
            <text x="260" y="80" font-family="'Gamja Flower', cursive" font-size="24" fill="#4F46E5" font-weight="bold">Zzz</text>
            <text x="200" y="245" font-family="'Gamja Flower', cursive" font-size="22" fill="#333333" text-anchor="middle" font-weight="bold">하루 종일 노곤노곤.. 💤</text>
          </svg>
        `.trim()
      },
      {
        date: "2026-07-04",
        title: "도서관 모험기 📚",
        text: "비가 오길래 실내인 시립도서관에 친구들과 피신했다. 조용한 열람실에서 소리 안 나게 키득거리며 추리 만화책을 읽었는데 흥미진진했다.",
        feeling: "Calm",
        weather: "Cloudy",
        createdAt: "2026-07-04T18:00:00.000Z",
        isPublic: true,
        svgDrawing: `
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" width="100%" height="100%">
            <rect x="10" y="10" width="380" height="280" rx="15" fill="#FCF9F2" stroke="#14B8A6" stroke-width="3" stroke-dasharray="6 3" />
            <rect x="130" y="100" width="60" height="90" rx="4" fill="#0D9488" stroke="#333" stroke-width="3" transform="rotate(-15 130 100)" />
            <rect x="210" y="90" width="60" height="90" rx="4" fill="#06B6D4" stroke="#333" stroke-width="3" />
            <path d="M 225 110 L 255 110 M 225 130 L 255 130" stroke="#FFF" stroke-width="3" stroke-linecap="round" />
            <text x="200" y="245" font-family="'Gamja Flower', cursive" font-size="22" fill="#333333" text-anchor="middle" font-weight="bold">도서관에서 마음의 양식 📚</text>
          </svg>
        `.trim()
      },
      {
        date: "2026-07-05",
        title: "강아지와 숲 속 산책 🌳",
        text: "일요일 아침 일찍 귀여운 강아지 초코의 목줄을 채워 공원으로 향했다. 신선한 공기를 쐬며 풀숲을 달리니 강아지도 나도 기분이 맑아졌다.",
        feeling: "Happy",
        weather: "Sunny",
        createdAt: "2026-07-05T18:00:00.000Z",
        isPublic: true,
        svgDrawing: `
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" width="100%" height="100%">
            <rect x="10" y="10" width="380" height="280" rx="15" fill="#FCF9F2" stroke="#22C55E" stroke-width="3" stroke-dasharray="6 3" />
            <rect x="150" y="130" width="15" height="50" fill="#78350F" stroke="#333" stroke-width="3" />
            <path d="M 120 130 C 120 90, 195 90, 195 130 Z" fill="#22C55E" stroke="#333" stroke-width="3" />
            <rect x="230" y="120" width="15" height="60" fill="#78350F" stroke="#333" stroke-width="3" />
            <path d="M 200 120 C 200 80, 275 80, 275 120 Z" fill="#16A34A" stroke="#333" stroke-width="3" />
            <text x="200" y="245" font-family="'Gamja Flower', cursive" font-size="22" fill="#333333" text-anchor="middle" font-weight="bold">푸르른 숲 속 힐링 산책 🌳</text>
          </svg>
        `.trim()
      },
      {
        date: "2026-07-06",
        title: "부서진 내 장난감 로봇 🤖",
        text: "동생이 내 소중한 한정판 프라모델 로봇을 가지고 놀다가 팔을 부러뜨렸다! 정말 속상하고 화가 머리끝까지 솟아올랐지만 꾹 참았다.",
        feeling: "Angry",
        weather: "Cloudy",
        createdAt: "2026-07-06T18:00:00.000Z",
        isPublic: true,
        svgDrawing: `
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" width="100%" height="100%">
            <rect x="10" y="10" width="380" height="280" rx="15" fill="#FCF9F2" stroke="#EF4444" stroke-width="3" stroke-dasharray="6 3" />
            <rect x="160" y="100" width="80" height="80" rx="8" fill="#94A3B8" stroke="#333" stroke-width="3" />
            <rect x="180" y="60" width="40" height="40" rx="4" fill="#CBD5E1" stroke="#333" stroke-width="3" />
            <rect x="110" y="170" width="15" height="40" rx="3" fill="#64748B" stroke="#333" stroke-width="3" transform="rotate(45 110 170)" />
            <path d="M 180 120 L 200 130 L 195 145" stroke="#EF4444" stroke-width="3" fill="none" />
            <text x="200" y="245" font-family="'Gamja Flower', cursive" font-size="22" fill="#333333" text-anchor="middle" font-weight="bold">장난감이 부서져 속상했던 날 🤖💔</text>
          </svg>
        `.trim()
      },
      {
        date: "2026-07-07",
        title: "비를 쫄딱 맞은 오후 ☔️",
        text: "갑작스러운 소나기가 양동이 붓듯 내렸는데 하필이면 우산을 가방에 안 챙겨 나왔다. 신발이랑 양말까지 다 젖어서 엄청 시무룩하고 슬펐다.",
        feeling: "Sad",
        weather: "Rainy",
        createdAt: "2026-07-07T18:00:00.000Z",
        isPublic: true,
        svgDrawing: `
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" width="100%" height="100%">
            <rect x="10" y="10" width="380" height="280" rx="15" fill="#FCF9F2" stroke="#3B82F6" stroke-width="3" stroke-dasharray="6 3" />
            <path d="M 150 100 C 130 100, 120 120, 140 140 C 140 160, 260 160, 260 140 C 280 120, 270 100, 250 100 C 240 80, 160 80, 150 100 Z" fill="#94A3B8" stroke="#333" stroke-width="3" />
            <path d="M 160 170 L 155 185 M 200 170 L 195 185 M 240 170 L 235 185" stroke="#3B82F6" stroke-width="4.5" stroke-linecap="round" />
            <text x="200" y="245" font-family="'Gamja Flower', cursive" font-size="22" fill="#333333" text-anchor="middle" font-weight="bold">비 오는 날의 추적추적 오후 ☔️</text>
          </svg>
        `.trim()
      },
      {
        date: "2026-07-08",
        title: "드디어 캠프 수료! 🎉",
        text: "오늘은 빅데이터 캠프 마지막날! 프로젝트 완성을 위해 밤낮없이 고생했는데 드디어 완성했다. 지민, 찬우, 예은 모두 다 수고했어!",
        feeling: "Happy",
        weather: "Sunny",
        createdAt: "2026-07-08T18:00:00.000Z",
        isPublic: true,
        svgDrawing: `
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" width="100%" height="100%">
            <rect x="10" y="10" width="380" height="280" rx="15" fill="#FCF9F2" stroke="#F59E0B" stroke-width="3" stroke-dasharray="6 3" />
            <rect x="130" y="80" width="140" height="90" rx="8" fill="#1E293B" stroke="#333" stroke-width="3" />
            <rect x="145" y="95" width="110" height="60" rx="4" fill="#38BDF8" stroke="#333" stroke-width="2.5" />
            <text x="200" y="130" font-family="monospace" font-size="12" fill="#1E293B" text-anchor="middle" font-weight="bold">CAMP COMPLETED!</text>
            <polygon points="100,80 105,95 120,95 110,105 115,120 100,110 85,120 90,105 80,95 95,95" fill="#FBBF24" stroke="#333" stroke-width="2" />
            <polygon points="300,120 305,135 320,135 310,145 315,160 300,150 285,160 290,145 280,135 295,135" fill="#F43F5E" stroke="#333" stroke-width="2" />
            <text x="200" y="245" font-family="'Gamja Flower', cursive" font-size="22" fill="#333333" text-anchor="middle" font-weight="bold">빅데이터 캠프 수료 및 프로젝트 성공! 🎉</text>
          </svg>
        `.trim()
      }
    ]
  }
];

// Downscale + JPEG-compress a base64 raster image (from Imagen, ~2MB PNG) into a
// compact data URL that fits inside a Firestore document (~100KB), so no Firebase
// Storage bucket is required. Falls back to the raw data URL if canvas is missing.
async function rasterToCompressedDataUrl(base64: string, mimeType: string, maxSize = 768, quality = 0.85): Promise<string> {
  const srcUrl = `data:${mimeType};base64,${base64}`;
  const img = new Image();
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = () => reject(new Error("생성된 이미지를 불러오지 못했습니다."));
    img.src = srcUrl;
  });
  const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
  const w = Math.max(1, Math.round(img.width * scale));
  const h = Math.max(1, Math.round(img.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return srcUrl;
  ctx.drawImage(img, 0, 0, w, h);
  return canvas.toDataURL("image/jpeg", quality);
}

// Renders a diary's artwork: a real AI image (imageUrl) via <img>, or a legacy
// hand-drawn SVG string (svgDrawing) for seeded/friend sample entries.
function DiaryArt({ entry, className }: { entry: { imageUrl?: string; svgDrawing?: string }; className?: string }) {
  if (entry.imageUrl) {
    return (
      <div className={className}>
        <img src={entry.imageUrl} alt="AI 그림일기" className="w-full h-full object-cover" />
      </div>
    );
  }
  if (entry.svgDrawing) {
    return <div className={className} dangerouslySetInnerHTML={{ __html: entry.svgDrawing }} />;
  }
  return <div className={className} />;
}

export default function CalendarDashboard({ profile, onLogout }: CalendarDashboardProps) {
  // Setup currentDate initially to July 2026 to match the exact mockup screenshot date
  const [currentDate, setCurrentDate] = useState(new Date(2026, 6, 8)); // July 2026
  const [selectedDateStr, setSelectedDateStr] = useState<string>("2026-07-08");
  const [diaryEntries, setDiaryEntries] = useState<DiaryEntry[]>([]);
  const [activeTab, setActiveTab] = useState<"calendar" | "book" | "write" | "view" | "friends" | "settings">("calendar");
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  
  // Writing Form State
  const [diaryText, setDiaryText] = useState("");
  const [diaryTitle, setDiaryTitle] = useState("");
  const [diaryWeather, setDiaryWeather] = useState("Sunny"); // Sunny, Cloudy, Rainy, Snowy
  const [selectedFeeling, setSelectedFeeling] = useState<FeelingType>("Happy");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string>("");
  const [generatedSummary, setGeneratedSummary] = useState<string>("");
  const [isSummarizing, setIsSummarizing] = useState(false);
  
  // Active viewing state
  const [viewingEntry, setViewingEntry] = useState<DiaryEntry | null>(null);
  const [showTextDiary, setShowTextDiary] = useState(false);
  const [isWritePublic, setIsWritePublic] = useState(false);
  const [isShareSheetOpen, setIsShareSheetOpen] = useState(false);
  const [diaryStyleMode, setDiaryStyleMode] = useState<"normal" | "summary">("normal");

  // New Monthly Picture Book navigation & detail view states
  const [bookDate, setBookDate] = useState(new Date(2026, 6, 8)); // Month book selector date
  const [bookViewingEntry, setBookViewingEntry] = useState<DiaryEntry | null>(null);
  const [bookShowTextDiary, setBookShowTextDiary] = useState(false);

  // Profile customization inside settings
  const [editNickname, setEditNickname] = useState(profile.nickname);
  const [editColor, setEditColor] = useState(profile.profileColorHex);

  // Friend viewing states
  const [selectedFriend, setSelectedFriend] = useState<Friend | null>(null);
  const [friendSubView, setFriendSubView] = useState<"calendar" | "view" | null>(null);
  const [friendViewingEntry, setFriendViewingEntry] = useState<DiaryEntry | null>(null);

  // Settings inner tab/subview state
  const [settingsTab, setSettingsTab] = useState<"main" | "profile" | "friends_menu" | "invite" | "approve" | "delete">("main");
  
  // Friend list and invitations states
  const [friendsList, setFriendsList] = useState<Friend[]>([]);
  const [pendingSentRequests, setPendingSentRequests] = useState<{ name: string; email: string; profileColorHex: string; date: string }[]>([]);
  const [pendingReceivedRequests, setPendingReceivedRequests] = useState<{ name: string; email: string; profileColorHex: string }[]>([]);

  // Friends invite form states
  const [inviteName, setInviteName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");

  // Load diaries from Firestore on mount
  useEffect(() => {
    const loadDiariesFromFirestore = async () => {
      try {
        const diariesCol = collection(db, "users", profile.email, "diaries");
        const snapshot = await getDocs(diariesCol);
        if (!snapshot.empty) {
          const fetched: DiaryEntry[] = [];
          snapshot.forEach((doc) => {
            fetched.push(doc.data() as DiaryEntry);
          });
          fetched.sort((a, b) => a.date.localeCompare(b.date));
          setDiaryEntries(fetched);
          localStorage.setItem(`bbiddul_diaries_${profile.email}`, JSON.stringify(fetched));
        } else {
          // If Firestore is empty, check localStorage
          const key = `bbiddul_diaries_${profile.email}`;
          const stored = localStorage.getItem(key);
          if (stored) {
            const parsed = JSON.parse(stored) as DiaryEntry[];
            setDiaryEntries(parsed);
            // Save local cache to Firestore
            for (const entry of parsed) {
              await setDoc(doc(db, "users", profile.email, "diaries", entry.date), entry);
            }
          } else {
            // Seed initial dummy entries matching the EXACT DAYS shown in the screenshot for extreme high fidelity!
            const initialEntries: DiaryEntry[] = [
              {
                date: "2026-07-01",
                text: "오늘은 삐뚤 그림일기를 쓰기 시작한 첫날이다. 날씨도 화창하고 아침 산책도 다녀와서 너무 기분 좋은 수요일이었다. 앞으로 좋은 일들을 많이 채우고 싶다.",
                feeling: "Happy",
                title: "설레는 첫 시작",
                weather: "Sunny",
                svgDrawing: `
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" width="100%" height="100%">
                    <rect x="10" y="10" width="380" height="280" rx="15" fill="#FCF9F2" stroke="#FFF275" stroke-width="2" stroke-dasharray="6 3" />
                    <path d="M 155 120 Q 150 160 200 165 Q 250 160 245 120 Q 240 85 200 85" stroke="#FFF275" stroke-width="5" fill="none" stroke-linecap="round" />
                    <circle cx="175" cy="115" r="4.5" fill="#333333" />
                    <circle cx="225" cy="115" r="4.5" fill="#333333" />
                    <path d="M 185 140 Q 200 155 215 140" stroke="#FFF275" stroke-width="5" fill="none" stroke-linecap="round" />
                    <text x="200" y="240" font-family="'Gamja Flower', cursive" font-size="22" fill="#333333" text-anchor="middle" font-weight="bold">설레는 첫 시작</text>
                  </svg>
                `.trim(),
                createdAt: new Date().toISOString()
              },
              {
                date: "2026-07-02",
                text: "하루 종일 바빠서 온몸이 뻐근하다. 밤늦게까지 야근을 하고 들어와 씻으니 꼼짝도 하기 싫을 정도로 엄청 피곤했다. 하지만 보람찬 구석도 있었다.",
                feeling: "Tired",
                title: "노곤노곤 피곤한 밤",
                weather: "Cloudy",
                svgDrawing: `
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" width="100%" height="100%">
                    <rect x="10" y="10" width="380" height="280" rx="15" fill="#FCF9F2" stroke="#D384FF" stroke-width="2" stroke-dasharray="6 3" />
                    <path d="M 28 44 L 40 44" stroke="#333333" stroke-width="4" stroke-linecap="round" />
                    <path d="M 60 44 L 72 44" stroke="#333333" stroke-width="4" stroke-linecap="round" />
                    <path d="M 185 145 Q 200 135 215 145" stroke="#D384FF" stroke-width="5" fill="none" stroke-linecap="round" />
                    <text x="200" y="240" font-family="'Gamja Flower', cursive" font-size="22" fill="#333333" text-anchor="middle" font-weight="bold">노곤노곤 피곤한 밤</text>
                  </svg>
                `.trim(),
                createdAt: new Date().toISOString()
              },
              {
                date: "2026-07-03",
                text: "비도 그치고 선선해서 카페 창가 자리에 앉아 흘러가는 구름을 보며 오랜 시간 책을 읽었다. 복잡했던 생각들이 가라앉고 평온해진 하루.",
                feeling: "Calm",
                title: "생각을 끄는 시간",
                weather: "Sunny",
                svgDrawing: `
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" width="100%" height="100%">
                    <rect x="10" y="10" width="380" height="280" rx="15" fill="#FCF9F2" stroke="#404040" stroke-width="2" stroke-dasharray="6 3" />
                    <path d="M 120 105 L 200 100 L 280 105" stroke="#404040" stroke-width="4.5" fill="none" stroke-linecap="round" />
                    <text x="200" y="240" font-family="'Gamja Flower', cursive" font-size="22" fill="#333333" text-anchor="middle" font-weight="bold">생각을 끄는 시간</text>
                  </svg>
                `.trim(),
                createdAt: new Date().toISOString()
              },
              {
                date: "2026-07-04",
                text: "주말이라 친구들과 소풍을 갔다. 공원에서 함께 샌드위치를 나누어 먹고 실컷 수다를 떨었더니 온갖 스트레스가 날아가는 느낌이었다. 기분 최고!",
                feeling: "Happy",
                title: "친구들과 피크닉",
                weather: "Sunny",
                svgDrawing: `
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" width="100%" height="100%">
                    <rect x="10" y="10" width="380" height="280" rx="15" fill="#FCF9F2" stroke="#FFF275" stroke-width="2" stroke-dasharray="6 3" />
                    <circle cx="200" cy="110" r="30" stroke="#FFF275" stroke-width="4.5" fill="none" />
                    <text x="200" y="240" font-family="'Gamja Flower', cursive" font-size="22" fill="#333333" text-anchor="middle" font-weight="bold">친구들과 피크닉</text>
                  </svg>
                `.trim(),
                createdAt: new Date().toISOString()
              },
              {
                date: "2026-07-05",
                text: "갑자기 오랜 추억이 깃든 장소가 떠올라 조금 쓸쓸한 기분이 들었다. 비도 내리기 시작하고, 흘러나오는 멜로디에 조용히 젖어들었던 하루.",
                feeling: "Sad",
                title: "창밖 비 내리는 저녁",
                weather: "Rainy",
                svgDrawing: `
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" width="100%" height="100%">
                    <rect x="10" y="10" width="380" height="280" rx="15" fill="#FCF9F2" stroke="#82B3FF" stroke-width="2" stroke-dasharray="6 3" />
                    <path d="M 130 60 L 125 75 M 270 60 L 265 75" stroke="#82B3FF" stroke-width="3.5" stroke-linecap="round" />
                    <text x="200" y="240" font-family="'Gamja Flower', cursive" font-size="22" fill="#333333" text-anchor="middle" font-weight="bold">창밖 비 내리는 저녁</text>
                  </svg>
                `.trim(),
                createdAt: new Date().toISOString()
              },
              {
                date: "2026-07-06",
                text: "기획안 문제로 동료와 사소하게 마음 상할 일이 있었다. 속상하고 화도 나서 일기를 끄적이며 감정을 다스리려 노력해 본다. 조금 화가 났던 하루.",
                feeling: "Angry",
                title: "부글부글 서운해",
                weather: "Cloudy",
                svgDrawing: `
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" width="100%" height="100%">
                    <rect x="10" y="10" width="380" height="280" rx="15" fill="#FCF9F2" stroke="#FF5A5F" stroke-width="2" stroke-dasharray="6 3" />
                    <path d="M 165 118 L 180 110 M 235 118 L 220 110" stroke="#333333" stroke-width="4" stroke-linecap="round" />
                    <text x="200" y="240" font-family="'Gamja Flower', cursive" font-size="22" fill="#333333" text-anchor="middle" font-weight="bold">부글부글 서운해</text>
                  </svg>
                `.trim(),
                createdAt: new Date().toISOString()
              },
              {
                date: "2026-07-07",
                text: "어제의 다툼을 풀기 위해 맛있는 디저트를 같이 먹으며 허심탄회하게 수다를 나눴다. 서로 한 걸음 양보해 주어서 다시 활짝 웃을 수 있었다.",
                feeling: "Happy",
                title: "화해와 웃음",
                weather: "Sunny",
                svgDrawing: `
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" width="100%" height="100%">
                    <rect x="10" y="10" width="380" height="280" rx="15" fill="#FCF9F2" stroke="#FFF275" stroke-width="2" stroke-dasharray="6 3" />
                    <text x="200" y="240" font-family="'Gamja Flower', cursive" font-size="22" fill="#333333" text-anchor="middle" font-weight="bold">화해와 웃음</text>
                  </svg>
                `.trim(),
                createdAt: new Date().toISOString()
              },
              {
                date: "2026-07-08",
                text: "나만의 그림일기 '삐뚤' 앱을 개발하고 있는 날! 프로필 색상을 실시간으로 연동하고 캘린더에 감정 손그림을 띄우니 너무나 귀엽고 보람차다.",
                feeling: "Happy",
                title: "삐뚤빼뚤 즐거운 코딩",
                weather: "Sunny",
                svgDrawing: `
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" width="100%" height="100%">
                    <rect x="10" y="10" width="380" height="280" rx="15" fill="#FCF9F2" stroke="#FFF275" stroke-width="2" stroke-dasharray="6 3" />
                    <circle cx="200" cy="110" r="35" stroke="#FFF275" stroke-width="4.5" fill="none" />
                    <text x="200" y="240" font-family="'Gamja Flower', cursive" font-size="22" fill="#333333" text-anchor="middle" font-weight="bold">삐뚤빼뚤 즐거운 코딩</text>
                  </svg>
                `.trim(),
                createdAt: new Date().toISOString()
              }
            ];
            // New account: start with an EMPTY diary DB. The sample entries above
            // are intentionally NOT seeded — a new person's diary builds up only as
            // they write their own entries.
            void initialEntries;
            setDiaryEntries([]);
            localStorage.setItem(key, JSON.stringify([]));
          }
        }
      } catch (err) {
        console.error("Error loading diaries from Firestore:", err);
        const stored = localStorage.getItem(`bbiddul_diaries_${profile.email}`);
        if (stored) {
          setDiaryEntries(JSON.parse(stored));
        }
      }
    };

    loadDiariesFromFirestore();
  }, [profile.email]);

  // Scroll active year & month into view in the customized date picker
  useEffect(() => {
    if (isDatePickerOpen) {
      setTimeout(() => {
        const yearContainer = document.getElementById("year-scroll-container");
        const monthContainer = document.getElementById("month-scroll-container");
        
        if (yearContainer) {
          const selected = yearContainer.querySelector("[data-selected='true']");
          if (selected) {
            yearContainer.scrollTop = (selected as HTMLElement).offsetTop - yearContainer.offsetTop - 40;
          }
        }
        if (monthContainer) {
          const selected = monthContainer.querySelector("[data-selected='true']");
          if (selected) {
            monthContainer.scrollTop = (selected as HTMLElement).offsetTop - monthContainer.offsetTop - 40;
          }
        }
      }, 80);
    }
  }, [isDatePickerOpen, currentDate.getFullYear(), currentDate.getMonth()]);

  const saveEntries = (updated: DiaryEntry[]) => {
    setDiaryEntries(updated);
    localStorage.setItem(`bbiddul_diaries_${profile.email}`, JSON.stringify(updated));
  };

  // Real-time Friends list and Invitations loading from Firestore
  useEffect(() => {
    const friendsCol = collection(db, "users", profile.email, "friends");
    
    const unsubscribe = onSnapshot(friendsCol, async (snapshot) => {
      const dbFriends: Friend[] = [];
      const dbSent: any[] = [];
      const dbReceived: any[] = [];

      for (const docSnap of snapshot.docs) {
        const data = docSnap.data();
        const fEmail = docSnap.id;
        
        if (data.status === "accepted") {
          let friendEntries: DiaryEntry[] = [];
          try {
            // Must filter to isPublic==true so the query matches the Firestore
            // security rule (rules are not filters — an unconstrained query over
            // a friend's diaries would be rejected wholesale as permission-denied).
            const diariesCol = collection(db, "users", fEmail, "diaries");
            const publicDiariesQuery = query(diariesCol, where("isPublic", "==", true));
            const dSnap = await getDocs(publicDiariesQuery);
            dSnap.forEach(deDoc => {
              friendEntries.push(deDoc.data() as DiaryEntry);
            });
            friendEntries.sort((a, b) => b.date.localeCompare(a.date));
          } catch (e) {
            console.warn(`Could not load diaries for friend ${fEmail}:`, e);
          }

          dbFriends.push({
            id: fEmail.split("@")[0],
            name: data.friendNickname || fEmail.split("@")[0],
            email: fEmail,
            avatar: "😊",
            avatarBg: "bg-slate-100",
            profileColorHex: data.friendColorHex || "#404040",
            entries: friendEntries
          });
        } else if (data.status === "sent") {
          dbSent.push({
            name: data.friendNickname || fEmail.split("@")[0],
            email: fEmail,
            profileColorHex: data.friendColorHex || "#404040",
            date: data.updatedAt ? data.updatedAt.split("T")[0] : new Date().toISOString().split("T")[0]
          });
        } else if (data.status === "received") {
          dbReceived.push({
            name: data.friendNickname || fEmail.split("@")[0],
            email: fEmail,
            profileColorHex: data.friendColorHex || "#404040"
          });
        }
      }

      setFriendsList(dbFriends);
      setPendingSentRequests(dbSent);
      setPendingReceivedRequests(dbReceived);

      localStorage.setItem(`bbiddul_friends_${profile.email}`, JSON.stringify(dbFriends));
      localStorage.setItem(`bbiddul_sent_invites_${profile.email}`, JSON.stringify(dbSent));
      localStorage.setItem(`bbiddul_received_invites_${profile.email}`, JSON.stringify(dbReceived));
    }, (error) => {
      console.error("Error listening to friends collection in Firestore:", error);
    });

    return () => unsubscribe();
  }, [profile.email]);

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetEmail = inviteEmail.toLowerCase().trim();
    if (!targetEmail) return;
    
    if (targetEmail === profile.email.toLowerCase()) {
      alert("자기 자신에게는 친구 신청을 보낼 수 없습니다!");
      return;
    }

    if (friendsList.some(f => f.email.toLowerCase() === targetEmail)) {
      alert("이미 친구로 등록된 사용자입니다!");
      return;
    }

    if (pendingSentRequests.some(r => r.email.toLowerCase() === targetEmail)) {
      alert("이미 초대를 보낸 사용자입니다!");
      return;
    }

    setIsGenerating(true);
    try {
      const userRef = doc(db, "users", targetEmail);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        alert("가입되지 않은 이메일 주소입니다. 삐뚤에 가입한 친구의 이메일을 적어주세요!");
        setIsGenerating(false);
        return;
      }

      const friendData = userSnap.data();
      const friendNickname = friendData.nickname;
      const friendColorHex = friendData.profileColorHex;

      const now = new Date().toISOString();
      
      await setDoc(doc(db, "users", profile.email, "friends", targetEmail), {
        friendEmail: targetEmail,
        friendNickname: friendNickname,
        friendColorHex: friendColorHex,
        status: "sent",
        updatedAt: now
      });

      await setDoc(doc(db, "users", targetEmail, "friends", profile.email), {
        friendEmail: profile.email,
        friendNickname: profile.nickname,
        friendColorHex: profile.profileColorHex,
        status: "received",
        updatedAt: now
      });

      setInviteEmail("");
      setInviteName("");
      alert(`${friendNickname}님에게 친구 신청을 보냈습니다!`);
    } catch (err) {
      console.error("Failed to send friend request:", err);
      alert("친구 초대를 전송하지 못했습니다. 다시 시도해 주세요.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleApproveFriend = async (req: { name: string; email: string; profileColorHex: string }) => {
    const targetEmail = req.email.toLowerCase().trim();
    setIsGenerating(true);
    try {
      const now = new Date().toISOString();

      await setDoc(doc(db, "users", profile.email, "friends", targetEmail), {
        friendEmail: targetEmail,
        friendNickname: req.name,
        friendColorHex: req.profileColorHex,
        status: "accepted",
        updatedAt: now
      });

      await setDoc(doc(db, "users", targetEmail, "friends", profile.email), {
        friendEmail: profile.email,
        friendNickname: profile.nickname,
        friendColorHex: profile.profileColorHex,
        status: "accepted",
        updatedAt: now
      });

      alert(`${req.name}님과 친구가 되었습니다! 👥`);
    } catch (err) {
      console.error("Failed to approve friend:", err);
      alert("친구 수락에 실패했습니다. 다시 시도해 주세요.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDeclineFriend = async (req: { name: string; email: string }) => {
    const targetEmail = req.email.toLowerCase().trim();
    setIsGenerating(true);
    try {
      await deleteDoc(doc(db, "users", profile.email, "friends", targetEmail));
      await deleteDoc(doc(db, "users", targetEmail, "friends", profile.email));
      alert("친구 신청을 거절했습니다.");
    } catch (err) {
      console.error("Failed to decline friend request:", err);
      alert("친구 신청 처리 중 오류가 발생했습니다.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDeleteFriend = async (friend: Friend) => {
    if (window.confirm(`정말 ${friend.name} 친구를 삭제하시겠습니까?`)) {
      setIsGenerating(true);
      try {
        await deleteDoc(doc(db, "users", profile.email, "friends", friend.email));
        await deleteDoc(doc(db, "users", friend.email, "friends", profile.email));
        alert("친구 삭제가 완료되었습니다.");
      } catch (err) {
        console.error("Failed to delete friend:", err);
        alert("친구 삭제 중 오류가 발생했습니다.");
      } finally {
        setIsGenerating(false);
      }
    }
  };

  function formatDate(d: Date): string {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  // Get days in current month (always July 2026 for first view)
  const getDaysInMonth = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDayIndex = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();
    
    const days: (Date | null)[] = [];
    // Add empty slots for offset
    for (let i = 0; i < firstDayIndex; i++) {
      days.push(null);
    }
    // Add actual dates
    for (let d = 1; d <= totalDays; d++) {
      days.push(new Date(year, month, d));
    }
    return days;
  };

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const handleDayClick = (date: Date) => {
    const dateStr = formatDate(date);
    setSelectedDateStr(dateStr);
    setShowTextDiary(false);
    
    // Check if entry already exists
    const existing = diaryEntries.find(e => e.date === dateStr);
    if (existing) {
      setViewingEntry(existing);
      setActiveTab("view");
    } else {
      setDiaryText("");
      setDiaryTitle("");
      setDiaryWeather("Sunny");
      setSelectedFeeling("Happy");
      setGeneratedImageUrl("");
      setIsWritePublic(false);
      setActiveTab("write");
    }
  };

  const handleCreateNewDiary = () => {
    setSelectedDateStr(formatDate(new Date()));
    setDiaryText("");
    setDiaryTitle("");
    setDiaryWeather("Sunny");
    setSelectedFeeling("Happy");
    setGeneratedImageUrl("");
    setGeneratedSummary("");
    setIsWritePublic(false);
    setShowTextDiary(false);
    setActiveTab("write");
  };

  const deleteEntry = async (dateStr: string) => {
    if (window.confirm("정말 이 일기를 삭제할까요?")) {
      setIsGenerating(true);
      try {
        await deleteDoc(doc(db, "users", profile.email, "diaries", dateStr));
        const updated = diaryEntries.filter(e => e.date !== dateStr);
        setDiaryEntries(updated);
        localStorage.setItem(`bbiddul_diaries_${profile.email}`, JSON.stringify(updated));
        setShowTextDiary(false);
        setActiveTab("calendar");
        setViewingEntry(null);
        alert("일기가 삭제되었습니다.");
      } catch (err) {
        console.error("Failed to delete diary from Firestore:", err);
        alert("일기 삭제에 실패했습니다.");
      } finally {
        setIsGenerating(false);
      }
    }
  };

  // 회원탈퇴: 로그인된 계정의 Firestore 데이터(일기·친구·프로필)를 전부 삭제해 초기화한다.
  const handleDeleteAccount = async () => {
    const ok = window.confirm(
      "정말 회원탈퇴하시겠어요?\n로그인된 계정의 모든 일기·친구·프로필 데이터가 삭제되고 되돌릴 수 없습니다."
    );
    if (!ok) return;

    setIsGenerating(true);
    try {
      // 1) 내 일기 전부 삭제
      const diariesSnap = await getDocs(collection(db, "users", profile.email, "diaries"));
      await Promise.all(diariesSnap.docs.map((d) => deleteDoc(d.ref)));

      // 2) 내 친구 관계를 양쪽에서 모두 삭제
      const friendsSnap = await getDocs(collection(db, "users", profile.email, "friends"));
      await Promise.all(
        friendsSnap.docs.flatMap((d) => {
          const otherEmail = d.id;
          return [
            deleteDoc(doc(db, "users", profile.email, "friends", otherEmail)),
            deleteDoc(doc(db, "users", otherEmail, "friends", profile.email))
          ];
        })
      );

      // 3) 내 프로필 문서 삭제
      await deleteDoc(doc(db, "users", profile.email));

      // 4) 로컬 캐시 정리
      Object.keys(localStorage)
        .filter((k) => k.includes(profile.email))
        .forEach((k) => localStorage.removeItem(k));
      localStorage.removeItem("bbiddul_user_email");

      alert("회원탈퇴가 완료되었어요. 모든 데이터가 초기화되었습니다.");
      onLogout();
    } catch (err) {
      console.error("account deletion failed", err);
      alert("회원탈퇴 처리 중 오류가 발생했습니다. 다시 시도해 주세요.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGeneratePictureDiary = async () => {
    if (!diaryText.trim()) return;
    setIsGenerating(true);
    setGeneratedSummary("");
    setIsSummarizing(true);

    try {
      // Cloud Function (callable) — works on Firebase Hosting where there is no Express /api.
      const data = await generateDiaryDrawing({
        diaryText,
        profileColorHex: profile.profileColorHex,
        profileColorName: profile.profileColorName,
        feeling: selectedFeeling
      });

      if (data.imageBase64) {
        // Real AI raster image (~2MB PNG). Downscale + compress client-side to a
        // small JPEG data URL so it fits comfortably inside a Firestore document
        // (no Firebase Storage bucket required).
        const compressed = await rasterToCompressedDataUrl(data.imageBase64, data.mimeType || "image/png");
        setGeneratedImageUrl(compressed);
      } else if (data.imageDataUrl) {
        // Built-in mock drawing (small SVG data URL) — used inline when no paid key
        setGeneratedImageUrl(data.imageDataUrl);
      } else {
        throw new Error("No image was returned");
      }
    } catch (e) {
      console.error(e);
      // Last-resort local fallback so the user is never blocked
      const fallbackSvg = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" width="100%" height="100%">
          <rect x="10" y="10" width="380" height="280" rx="15" fill="#FCF9F2" stroke="${profile.profileColorHex}" stroke-width="2" stroke-dasharray="6 3" />
          <path d="M 155 120 Q 150 160 200 165 Q 250 160 245 120 Q 240 85 200 85" stroke="${profile.profileColorHex}" stroke-width="4.5" fill="none" stroke-linecap="round" />
          <circle cx="175" cy="115" r="4" fill="#333333" />
          <circle cx="225" cy="115" r="4" fill="#333333" />
          <path d="M 185 140 Q 200 155 215 140" stroke="${profile.profileColorHex}" stroke-width="4.5" fill="none" stroke-linecap="round" />
        </svg>
      `;
      const dataUrl = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(fallbackSvg)))}`;
      setGeneratedImageUrl(dataUrl);
    }

    // Childlike, 60-characters-or-less summary of what the child wrote — shown on
    // the picture-diary manuscript (원고지) instead of the full text.
    try {
      const sumData = await summarizeDiary({ diaryText, feeling: selectedFeeling });
      const s = (sumData.summary || "").trim().slice(0, 60);
      setGeneratedSummary(s || summarizeTextLocally(diaryText, selectedFeeling).slice(0, 60));
    } catch (sumErr) {
      console.warn("Could not fetch diary summary:", sumErr);
      setGeneratedSummary(summarizeTextLocally(diaryText, selectedFeeling).slice(0, 60));
    } finally {
      setIsSummarizing(false);
      setIsGenerating(false);
    }
  };

  const handleSaveDiary = async () => {
    if (!diaryText.trim() || !generatedImageUrl) return;

    setIsGenerating(true);
    const summaryText = generatedSummary || summarizeTextLocally(diaryText, selectedFeeling).slice(0, 60);

    const newEntry: DiaryEntry = {
      date: selectedDateStr,
      text: diaryText,
      imageUrl: generatedImageUrl,
      feeling: selectedFeeling,
      title: diaryTitle.trim() || "오늘의 일기",
      weather: diaryWeather,
      isPublic: isWritePublic,
      createdAt: new Date().toISOString(),
      summary: summaryText || undefined
    };

    try {
      await setDoc(doc(db, "users", profile.email, "diaries", selectedDateStr), newEntry);

      const filtered = diaryEntries.filter(e => e.date !== selectedDateStr);
      const updated = [...filtered, newEntry];
      setDiaryEntries(updated);
      localStorage.setItem(`bbiddul_diaries_${profile.email}`, JSON.stringify(updated));

      setViewingEntry(newEntry);
      setActiveTab("view");
    } catch (err) {
      console.error("Failed to save diary to Firestore:", err);
      alert("일기를 저장하지 못했습니다.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleToggleViewingPublic = async () => {
    if (!viewingEntry) return;
    const updatedIsPublic = !viewingEntry.isPublic;
    const updatedEntry = { ...viewingEntry, isPublic: updatedIsPublic };
    
    setIsGenerating(true);
    try {
      await setDoc(doc(db, "users", profile.email, "diaries", viewingEntry.date), updatedEntry, { merge: true });

      const updatedEntries = diaryEntries.map(e => e.date === viewingEntry.date ? updatedEntry : e);
      setDiaryEntries(updatedEntries);
      localStorage.setItem(`bbiddul_diaries_${profile.email}`, JSON.stringify(updatedEntries));
      
      setViewingEntry(updatedEntry);
    } catch (err) {
      console.error("Failed to toggle public visibility in Firestore:", err);
      alert("공개 상태 변경에 실패했습니다.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    const updatedProfile = {
      ...profile,
      nickname: editNickname,
      profileColorHex: editColor,
    };
    setIsGenerating(true);
    try {
      await setDoc(doc(db, "users", profile.email), updatedProfile, { merge: true });
      localStorage.setItem(`bbiddul_profile_${profile.email}`, JSON.stringify(updatedProfile));
      alert("프로필 정보가 저장되었습니다!");
      window.location.reload();
    } catch (err) {
      console.error("Failed to update profile in Firestore:", err);
      alert("프로필 수정에 실패했습니다.");
    } finally {
      setIsGenerating(false);
    }
  };

  // Render children's manuscript grid format
  const renderTextInManuscriptGrid = (text: string) => {
    const chars = text.slice(0, 40).split("");
    return (
      <div className="grid grid-cols-10 gap-1 px-3 py-2 bg-[#FFFDF9] rounded-xl border border-[#e5dec9]">
        {Array.from({ length: 40 }).map((_, i) => {
          const char = chars[i] || "";
          return (
            <div 
              key={i} 
              className="aspect-square border border-dashed border-[#e5dec9]/40 text-slate-800 font-pen text-2xl flex items-center justify-center relative bg-[#FFFDF9]"
            >
              <span className="relative z-10">{char}</span>
              <div className="absolute inset-0 pointer-events-none border border-[#e5dec9]/10" />
            </div>
          );
        })}
      </div>
    );
  };

  const days = getDaysInMonth();
  const currentMonthDiaries = diaryEntries.filter(e => {
    const entryDate = new Date(e.date);
    return entryDate.getFullYear() === currentDate.getFullYear() && entryDate.getMonth() === currentDate.getMonth();
  });

  return (
    <div className="flex-1 bg-[#FAF9F5] flex flex-col w-full overflow-hidden relative">
      
      {/* Safe-area spacer so content sits below the real device status bar (PWA standalone) */}
      <div className="w-full bg-white shrink-0" style={{ height: "env(safe-area-inset-top, 0px)" }} />

      {/* Styled header exactly matching first picture */}
      <header className="px-6 py-4 bg-white border-b border-slate-100 sticky top-0 z-20 flex justify-between items-center relative min-h-[72px] select-none">
        {/* Dynamic customized logo and back button container */}
        <div className="flex items-center space-x-2 z-10">
          {(activeTab === "write" || activeTab === "view" || (activeTab === "friends" && selectedFriend) || (activeTab === "book" && bookViewingEntry) || (activeTab === "settings" && settingsTab !== "main")) && (
            <button 
              onClick={() => {
                if (activeTab === "friends") {
                  if (friendSubView === "view") {
                    setFriendSubView("calendar");
                    setFriendViewingEntry(null);
                  } else {
                    setSelectedFriend(null);
                    setFriendSubView(null);
                  }
                } else if (activeTab === "book" && bookViewingEntry) {
                  setBookViewingEntry(null);
                } else if (activeTab === "write") {
                  setGeneratedImageUrl("");
                  setActiveTab("calendar");
                } else if (activeTab === "settings") {
                  if (settingsTab === "invite" || settingsTab === "approve" || settingsTab === "delete") {
                    setSettingsTab("friends_menu");
                  } else {
                    setSettingsTab("main");
                  }
                } else {
                  setViewingEntry(null);
                  setActiveTab("calendar");
                }
              }}
              className="p-1 -ml-1 text-slate-600 hover:text-slate-900 cursor-pointer"
            >
              <ChevronLeft size={24} strokeWidth={2.5} />
            </button>
          )}
          <Logo color={profile.profileColorHex} size={42} animate={false} />
        </div>
        
        {/* Centered Page title */}
        <h1 className="text-xl font-bold text-slate-800 font-sans tracking-tight absolute left-1/2 -translate-x-1/2 pointer-events-none whitespace-nowrap">
          {activeTab === "calendar" && "달력"}
          {activeTab === "book" && (bookViewingEntry ? `${new Date(bookViewingEntry.date).getMonth() + 1}월 그림책` : "한달 그림책")}
          {activeTab === "write" && "일기 작성"}
          {activeTab === "view" && "오늘의 일기"}
          {activeTab === "friends" && (selectedFriend ? `${selectedFriend.name}의 달력` : "친구 소식")}
          {activeTab === "settings" && (
            settingsTab === "main" ? "내 설정" :
            settingsTab === "profile" ? "프로필 설정" :
            settingsTab === "friends_menu" ? "친구 설정" :
            settingsTab === "invite" ? "친구 초대하기" :
            settingsTab === "approve" ? "친구 승인하기" :
            settingsTab === "delete" ? "친구 삭제하기" : "내 설정"
          )}
        </h1>

        {/* Right side action icons to keep it beautifully functional */}
        <div className="flex items-center space-x-2 z-10">
          {activeTab === "view" && viewingEntry && (
            <>
              <button 
                onClick={() => setIsShareSheetOpen(true)}
                className="p-2 text-slate-500 hover:text-slate-800 cursor-pointer"
                title="공유"
              >
                <Share2 size={18} />
              </button>
              <button 
                onClick={() => deleteEntry(viewingEntry.date)}
                className="p-2 text-slate-400 hover:text-rose-500 rounded-lg cursor-pointer"
                title="삭제"
              >
                <Trash2 size={18} />
              </button>
            </>
          )}
          {activeTab === "write" && generatedImageUrl && (
            <button
              onClick={() => setIsShareSheetOpen(true)}
              className="p-2 text-slate-500 hover:text-slate-800 cursor-pointer"
              title="공유"
            >
              <Share2 size={18} />
            </button>
          )}
          {activeTab === "friends" && !selectedFriend && (
            <button
              onClick={() => { setActiveTab("settings"); setSettingsTab("friends_menu"); }}
              className="p-2 -mr-1 text-slate-600 hover:text-slate-900 cursor-pointer"
              title="친구 추가 / 친구 설정"
            >
              <UserPlus size={24} strokeWidth={2.2} />
            </button>
          )}
          {activeTab !== "view" && !(activeTab === "write" && generatedImageUrl) && !(activeTab === "friends" && !selectedFriend) && <div className="w-10"></div>}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 p-5 overflow-y-auto pb-[calc(6rem+env(safe-area-inset-bottom,0px))]">
        
        {/* TAB 1: CALENDAR VIEW */}
        {activeTab === "calendar" && (
          <div className="space-y-6 animate-fade-in">
            {/* Calendar Widget precisely matching Picture 1 */}
            <div className="bg-white rounded-[28px] p-5 border border-[#EBE7DC] shadow-sm relative overflow-hidden">
              
              {/* Centered Cute Header precisely matching Picture 1 */}
              <div className="flex flex-col items-center justify-center mb-6 relative select-none">
                <button 
                  onClick={() => setIsDatePickerOpen(!isDatePickerOpen)}
                  className="font-hand font-bold text-3xl text-slate-800 tracking-tight leading-none hover:opacity-80 transition-opacity flex items-center space-x-1.5 cursor-pointer"
                  title="날짜 선택기 열기"
                >
                  <span>{currentDate.getFullYear()}년 {currentDate.getMonth() + 1}월</span>
                </button>
                <div className="flex items-center space-x-1.5 mt-2.5">
                  <span className="text-[11px] text-slate-400 font-sans block">
                    💡 좌우로 쓸어넘겨(드래그) 월을 변경할 수 있어요
                  </span>
                </div>
              </div>

              {/* Weekly Day Headers - precisely styled matching picture */}
              <div className="grid grid-cols-7 gap-2 text-center text-xs font-semibold mb-4 font-sans select-none">
                <span className="text-[#FF5A5F]">Sun</span>
                <span className="text-slate-400">Mon</span>
                <span className="text-slate-400">Tue</span>
                <span className="text-slate-400">Wed</span>
                <span className="text-slate-400">Thu</span>
                <span className="text-slate-400">Fri</span>
                <span className="text-[#82B3FF]">Sat</span>
              </div>

              {/* Days Grid - with Drag Swipe & Smooth Animation */}
              <div className="relative min-h-[290px]">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={`${currentDate.getFullYear()}-${currentDate.getMonth()}`}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.2, ease: "easeInOut" }}
                    drag="x"
                    dragConstraints={{ left: 0, right: 0 }}
                    dragElastic={0.25}
                    onDragEnd={(e, info) => {
                      const swipeThreshold = 40;
                      if (info.offset.x > swipeThreshold) {
                        handlePrevMonth();
                      } else if (info.offset.x < -swipeThreshold) {
                        handleNextMonth();
                      }
                    }}
                    className="relative cursor-grab active:cursor-grabbing select-none"
                  >
                    <div className="grid grid-cols-7 gap-y-4 gap-x-2">
                      {days.map((day, idx) => {
                        if (!day) {
                          // Fill dummy previous month dates visually exactly as picture
                          const prevDaysCount = new Date(currentDate.getFullYear(), currentDate.getMonth(), 0).getDate();
                          const startDayOfWeek = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();
                          const dummyDayNum = prevDaysCount - (startDayOfWeek - idx - 1);
                          return (
                            <div 
                              key={`empty-${idx}`} 
                              className="aspect-[1/1.3] flex flex-col justify-start p-1 pl-1.5 relative text-slate-200/50 text-sm font-sans font-medium"
                            >
                              <span className="text-[11px] font-bold text-slate-200">{dummyDayNum}</span>
                            </div>
                          );
                        }
                        
                        const dateStr = formatDate(day);
                        const isToday = formatDate(new Date(2026, 6, 8)) === dateStr;
                        const hasDiary = diaryEntries.find(e => e.date === dateStr);
                        
                        // Sunday / Saturday coloring
                        const isSunday = day.getDay() === 0;
                        const isSaturday = day.getDay() === 6;
                        
                        let dayTextColor = "text-slate-700";
                        if (isSunday) dayTextColor = "text-[#FF5A5F]";
                        if (isSaturday) dayTextColor = "text-[#82B3FF]";

                        // Highlight selected
                        const isSelected = selectedDateStr === dateStr;

                        if (hasDiary) {
                          // Emotion colors configuration matching picture 1
                          let feelingBg = "bg-[#FFF275]";
                          let feelingBorder = "border-transparent";
                          if (hasDiary.feeling === "Tired") {
                            feelingBg = "bg-[#E2D2FF]";
                          } else if (hasDiary.feeling === "Calm") {
                            feelingBg = "bg-[#CBD5E1]";
                          } else if (hasDiary.feeling === "Sad") {
                            feelingBg = "bg-[#B9D5FF]";
                          } else if (hasDiary.feeling === "Angry") {
                            feelingBg = "bg-[#FFA3A6]";
                          }

                          return (
                            <button
                              key={dateStr}
                              onClick={() => handleDayClick(day)}
                              className={`aspect-[1/1.3] rounded-2xl p-1 relative cursor-pointer border flex flex-col justify-between items-center transition-all shadow-sm ${feelingBg} ${feelingBorder}`}
                            >
                              {/* Day number */}
                              <span className={`text-[11px] font-bold self-start pl-1 pt-0.5 ${dayTextColor}`}>{day.getDate()}</span>
                              
                              {/* Precise Hand-drawn Smiley representing mood inside the cell */}
                              <div className="w-8 h-8 flex items-center justify-center pb-1">
                                <MiniMoodLogo feeling={hasDiary.feeling} size={32} />
                              </div>

                              {/* Dot representation for selected highlight */}
                              {isSelected && (
                                <span className="w-1.5 h-1.5 rounded-full bg-[#FBBC05] absolute top-1 right-1" />
                              )}
                            </button>
                          );
                        }
                        
                        return (
                          <button
                            key={dateStr}
                            onClick={() => handleDayClick(day)}
                            className={`aspect-[1/1.3] rounded-2xl p-1 relative cursor-pointer flex flex-col justify-between items-center transition-all border ${
                              isSelected 
                                ? "border-[#EBE7DC] bg-[#FFFDF9]" 
                                : "border-transparent hover:bg-slate-50/50"
                            }`}
                          >
                            <span className={`text-[11px] font-bold self-start pl-1 pt-0.5 ${dayTextColor}`}>{day.getDate()}</span>

                            {/* Spacer to match height of smiley cells */}
                            <div className="w-8 h-8" />
                            
                            {isSelected && (
                              <span className="w-1.5 h-1.5 rounded-full bg-[#FBBC05] absolute top-1 right-1" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </motion.div>
                </AnimatePresence>
              </div>

              {/* Custom Scrollable Date Selector Modal Overlay precisely matching Picture 1 */}
              <AnimatePresence>
                {isDatePickerOpen && (
                  <div className="absolute inset-0 z-40 bg-[#333333]/15 backdrop-blur-xs rounded-[28px] flex items-center justify-center p-4">
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ type: "spring", damping: 25, stiffness: 350 }}
                      className="bg-white rounded-[28px] border border-[#EBE7DC] shadow-xl p-5 w-full max-w-[270px] relative z-50 select-none flex flex-col items-center"
                    >
                      {/* Grid for Headers */}
                      <div className="grid grid-cols-2 gap-4 w-full text-center font-bold text-slate-400 text-sm mb-3 font-sans">
                        <div className="font-sans text-xs text-slate-400 font-bold">연도</div>
                        <div className="font-sans text-xs text-slate-400 font-bold">월</div>
                      </div>

                      {/* Two columns inside a border or box */}
                      <div className="grid grid-cols-2 gap-3.5 w-full h-44">
                        {/* Left Column: Year Scroll with arrow indicators */}
                        <div className="border border-slate-200 rounded-2xl p-1.5 flex flex-col justify-between items-center h-full overflow-hidden bg-[#FFFDF9]/60 relative shadow-inner">
                          <span className="text-[10px] text-slate-400 select-none">▲</span>
                          <div className="overflow-y-auto w-full flex-1 py-1 space-y-1.5 select-none scroll-smooth picker-scrollbar max-h-[110px]" id="year-scroll-container">
                            {Array.from({ length: 15 }, (_, i) => 2020 + i).map((yr) => {
                              const isSel = currentDate.getFullYear() === yr;
                              return (
                                <button
                                  key={yr}
                                  data-selected={isSel ? "true" : "false"}
                                  onClick={() => {
                                    const newDate = new Date(currentDate);
                                    newDate.setFullYear(yr);
                                    setCurrentDate(newDate);
                                  }}
                                  className={`w-full py-1 text-center rounded-xl font-hand text-base cursor-pointer transition-all ${
                                    isSel 
                                      ? "bg-[#FFE068] text-slate-800 font-bold shadow-xs" 
                                      : "text-slate-500 hover:bg-slate-50"
                                  }`}
                                >
                                  {yr}년
                                </button>
                              );
                            })}
                          </div>
                          <span className="text-[10px] text-slate-400 select-none">▼</span>
                        </div>

                        {/* Right Column: Month Scroll with arrow indicators */}
                        <div className="border border-slate-200 rounded-2xl p-1.5 flex flex-col justify-between items-center h-full overflow-hidden bg-[#FFFDF9]/60 relative shadow-inner">
                          <span className="text-[10px] text-slate-400 select-none">▲</span>
                          <div className="overflow-y-auto w-full flex-1 py-1 space-y-1.5 select-none scroll-smooth picker-scrollbar max-h-[110px]" id="month-scroll-container">
                            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => {
                              const isSel = currentDate.getMonth() + 1 === m;
                              return (
                                <button
                                  key={m}
                                  data-selected={isSel ? "true" : "false"}
                                  onClick={() => {
                                    const newDate = new Date(currentDate);
                                    newDate.setMonth(m - 1);
                                    setCurrentDate(newDate);
                                  }}
                                  className={`w-full py-1 text-center rounded-xl font-hand text-base cursor-pointer transition-all ${
                                    isSel 
                                      ? "bg-[#FFE068] text-slate-800 font-bold shadow-xs" 
                                      : "text-slate-500 hover:bg-slate-50"
                                  }`}
                                >
                                  {m}월
                                </button>
                              );
                            })}
                          </div>
                          <span className="text-[10px] text-slate-400 select-none">▼</span>
                        </div>
                      </div>

                      {/* Confirm Button */}
                      <button 
                        onClick={() => setIsDatePickerOpen(false)}
                        className="w-full mt-4 py-3 bg-[#FFE068] hover:bg-[#FFE27D] text-slate-800 font-bold rounded-2xl text-xs font-sans transition-colors cursor-pointer shadow-xs border border-[#EBE7DC]"
                      >
                        확인
                      </button>
                    </motion.div>
                  </div>
                )}
              </AnimatePresence>
            </div>
          </div>
        )}

        {/* TAB 2: 한달 그림책 VIEW (BOOK TAB) */}
        {activeTab === "book" && (
          <div className="space-y-6 animate-fade-in pb-12">
            {!bookViewingEntry ? (
              <>
                {/* Monthly selector panel */}
                <div className="bg-[#FFFDF9] p-4 rounded-2xl border border-[#e5dec9] text-center flex items-center justify-between">
                  <button 
                    onClick={() => setBookDate(new Date(bookDate.getFullYear(), bookDate.getMonth() - 1, 1))}
                    className="w-10 h-10 rounded-full border border-yellow-200 bg-white flex items-center justify-center text-yellow-500 hover:bg-yellow-50 shadow-xs cursor-pointer transition-all shrink-0"
                  >
                    <ChevronLeft size={20} strokeWidth={2.5} />
                  </button>
                  
                  <div className="flex-1 px-4">
                    <span className="text-2xl">📖</span>
                    <h3 className="text-sm font-bold text-slate-800 mt-1 font-sans">나만의 {bookDate.getMonth() + 1}월 그림책첩</h3>
                    <p className="text-xs text-slate-400 font-sans mt-0.5">매일매일 한땀한땀 그려진 감성 일기 목록</p>
                  </div>

                  <button 
                    onClick={() => setBookDate(new Date(bookDate.getFullYear(), bookDate.getMonth() + 1, 1))}
                    className="w-10 h-10 rounded-full border border-yellow-200 bg-white flex items-center justify-center text-yellow-500 hover:bg-yellow-50 shadow-xs cursor-pointer transition-all shrink-0"
                  >
                    <ChevronRight size={20} strokeWidth={2.5} />
                  </button>
                </div>

                {(() => {
                  const filtered = diaryEntries.filter(entry => {
                    const parts = entry.date.split("-");
                    const year = parseInt(parts[0], 10);
                    const month = parseInt(parts[1], 10) - 1;
                    return year === bookDate.getFullYear() && month === bookDate.getMonth();
                  }).sort((a, b) => a.date.localeCompare(b.date));

                  if (filtered.length === 0) {
                    return (
                      <div className="text-center py-12 text-slate-400 text-xs bg-white rounded-2xl border border-slate-100 p-8 shadow-sm">
                        아직 {bookDate.getMonth() + 1}월에 완료된 그림일기가 없어요. 
                        <br />달력 탭에서 새로운 일기를 작성해 볼까요?
                      </div>
                    );
                  }

                  return (
                    <div className="grid grid-cols-2 gap-4">
                      {filtered.map((entry) => (
                        <div 
                          key={entry.date}
                          onClick={() => {
                            setBookViewingEntry(entry);
                            setBookShowTextDiary(false);
                          }}
                          className="bg-white p-3 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col justify-between space-y-3"
                        >
                          <DiaryArt entry={entry} className="w-full aspect-[4/3] rounded-xl overflow-hidden bg-[#FCF9F2]" />
                          <div className="space-y-1">
                            <div className="flex justify-between items-center text-[10px] text-slate-400">
                              <span>{entry.date}</span>
                              <span>{FEELINGS_LIST.find(f => f.type === entry.feeling)?.emoji}</span>
                            </div>
                            <p className="text-xs text-slate-700 font-sans font-medium line-clamp-2 leading-relaxed">
                              {entry.text}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </>
            ) : (
              // Detailed Picture Book Slide View matching Picture 3 perfectly!
              <div className="space-y-4 animate-fade-in">
                {(() => {
                  const currentMonthEntries = diaryEntries.filter(entry => {
                    const parts = entry.date.split("-");
                    const year = parseInt(parts[0], 10);
                    const month = parseInt(parts[1], 10) - 1;
                    return year === bookDate.getFullYear() && month === bookDate.getMonth();
                  }).sort((a, b) => a.date.localeCompare(b.date));

                  const currentIndex = currentMonthEntries.findIndex(e => e.date === bookViewingEntry.date);
                  const isFirstEntry = currentIndex <= 0;
                  const isLastEntry = currentIndex >= currentMonthEntries.length - 1;

                  const handlePrevBookEntry = () => {
                    if (currentIndex > 0) {
                      setBookViewingEntry(currentMonthEntries[currentIndex - 1]);
                    }
                  };

                  const handleNextBookEntry = () => {
                    if (currentIndex < currentMonthEntries.length - 1) {
                      setBookViewingEntry(currentMonthEntries[currentIndex + 1]);
                    }
                  };

                  return (
                    <>
                      {/* Swipe / Navigation controls directly above the framed diary */}
                      <div className="flex justify-between items-center max-w-sm mx-auto px-2">
                        <button 
                          onClick={handlePrevBookEntry}
                          disabled={isFirstEntry}
                          className="w-10 h-10 rounded-full border border-yellow-200 bg-white flex items-center justify-center text-yellow-500 hover:bg-yellow-50 shadow-xs cursor-pointer transition-all disabled:opacity-30 disabled:cursor-not-allowed shrink-0"
                        >
                          <ChevronLeft size={20} strokeWidth={2.5} />
                        </button>
                        
                        <div className="text-xs font-bold text-slate-400 font-sans">
                          {currentIndex + 1} / {currentMonthEntries.length}
                        </div>

                        <button 
                          onClick={handleNextBookEntry}
                          disabled={isLastEntry}
                          className="w-10 h-10 rounded-full border border-yellow-200 bg-white flex items-center justify-center text-yellow-500 hover:bg-yellow-50 shadow-xs cursor-pointer transition-all disabled:opacity-30 disabled:cursor-not-allowed shrink-0"
                        >
                          <ChevronRight size={20} strokeWidth={2.5} />
                        </button>
                      </div>

                      {/* The framed Picture Diary Frame */}
                      <div className="border-[3px] border-slate-800 bg-[#FFFDF9] rounded-2xl shadow-xl overflow-hidden max-w-sm mx-auto flex flex-col font-sans relative">
                        {/* Header: Date & Weather */}
                        <div className="flex justify-between items-center px-4 py-2 border-b-[3px] border-slate-800 text-xs font-bold text-slate-800 bg-white">
                          <span>{(() => {
                            const parts = bookViewingEntry.date.split("-");
                            return `${parts[0]}년 ${parseInt(parts[1], 10)}월 ${parseInt(parts[2], 10)}일`;
                          })()}</span>
                          <div className="flex flex-col items-end gap-1.5 select-none">
                            <div className="flex items-center gap-1">
                              <span>날씨</span>
                              <div className="flex gap-1 ml-1">
                                {["Sunny", "Cloudy", "Rainy", "Snowy"].map((wId) => {
                                  const isMatched = (bookViewingEntry.weather || "Sunny") === wId;
                                  const emojiMap: Record<string, string> = { Sunny: "☀️", Cloudy: "☁️", Rainy: "☔️", Snowy: "☃️" };
                                  return (
                                    <span 
                                      key={wId} 
                                      className={`p-0.5 inline-flex items-center justify-center text-sm ${
                                        isMatched ? "border-2 border-slate-800 rounded-full bg-yellow-100/50 font-bold scale-110" : "opacity-30"
                                      }`}
                                      style={{ width: "24px", height: "24px" }}
                                    >
                                      {emojiMap[wId]}
                                    </span>
                                  );
                                })}
                              </div>
                            </div>
                            {/* Selected Feeling marked with Circle (날씨 아래에) */}
                            <div className="flex items-center gap-1">
                              <span>기분</span>
                              <div className="flex gap-1 ml-1">
                                {FEELINGS_LIST.map((f) => {
                                  const isMatched = bookViewingEntry.feeling === f.type;
                                  return (
                                    <span 
                                      key={f.type} 
                                      title={f.label}
                                      className={`p-0.5 inline-flex items-center justify-center transition-all rounded-full ${
                                        isMatched ? "border-2 border-slate-800 bg-[#FFFDF9] scale-110 opacity-100" : "opacity-30"
                                      }`}
                                      style={{ width: "24px", height: "24px" }}
                                    >
                                      <MiniMoodLogo feeling={f.type} size={20} />
                                    </span>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        {/* Picture-diary artwork */}
                        <DiaryArt entry={bookViewingEntry} className="w-full aspect-[4/3] bg-[#FCF9F2] overflow-hidden border-b-[3px] border-slate-800" />

                        {/* Title */}
                        <div className="px-4 py-2 border-b-[3px] border-slate-800 font-bold text-slate-800 bg-white text-sm" style={{ fontFamily: "'Gamja Flower', cursive, sans-serif" }}>
                          제목 : {bookViewingEntry.title || "신나는 하루"}
                        </div>

                        {/* Manuscript layout (원고지) */}
                        <div className="p-3 bg-white">
                          {(() => {
                            const summaryText = bookViewingEntry.summary || summarizeTextLocally(bookViewingEntry.text, bookViewingEntry.feeling);
                            const chars = summaryText.split("");
                            const totalCells = Math.max(40, Math.ceil(chars.length / 10) * 10);
                            return (
                              <div className="grid grid-cols-10 gap-0 border-t-2 border-l-2 border-slate-800 bg-[#FFFDF9] rounded-sm overflow-hidden">
                                {Array.from({ length: totalCells }).map((_, idx) => {
                                  const char = chars[idx] || "";
                                  return (
                                    <div 
                                      key={idx} 
                                      className="aspect-square border-r-2 border-b-2 border-slate-800 flex items-center justify-center text-lg text-slate-800 font-bold bg-[#FFFDF9]"
                                      style={{ fontFamily: "'Gamja Flower', cursive, sans-serif" }}
                                    >
                                      {char}
                                    </div>
                                  );
                                })}
                              </div>
                            );
                          })()}
                        </div>
                      </div>

                      {/* Toggle button for text-only diary */}
                      <div className="flex flex-col items-center py-1">
                        <button
                          type="button"
                          onClick={() => setBookShowTextDiary(!bookShowTextDiary)}
                          className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold rounded-full text-xs cursor-pointer shadow-sm transition-all animate-none"
                        >
                          <span>📄 글 일기 {bookShowTextDiary ? "숨기기" : "보기"}</span>
                        </button>

                        {bookShowTextDiary && (
                          <div className="w-full max-w-sm mt-3 bg-[#FFFDF9] border-2 border-slate-800 rounded-2xl p-5 shadow-md animate-fade-in relative overflow-hidden text-left mx-auto">
                            {/* Notebook spine red line decoration */}
                            <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-red-200 pointer-events-none"></div>
                            <div className="pl-6 font-sans space-y-3">
                              <p className="text-[10px] font-bold text-emerald-600 tracking-wider">📄 글 일기 상세 내역</p>
                              
                              <div className="border-b border-dashed border-slate-200 pb-2">
                                <p className="text-[10px] text-slate-400 font-bold">제목</p>
                                <p className="text-sm font-bold text-slate-800" style={{ fontFamily: "'Gamja Flower', cursive, sans-serif", fontSize: "1.2rem" }}>
                                  {bookViewingEntry.title || "오늘의 일기"}
                                </p>
                              </div>

                              <div className="grid grid-cols-2 gap-2 border-b border-dashed border-slate-200 pb-2">
                                <div>
                                  <p className="text-[10px] text-slate-400 font-bold">날씨</p>
                                  <p className="text-xs font-bold text-slate-700">
                                    {bookViewingEntry.weather === "Sunny" && "☀️ 맑음"}
                                    {bookViewingEntry.weather === "Cloudy" && "☁️ 흐림"}
                                    {bookViewingEntry.weather === "Rainy" && "☔️ 비"}
                                    {bookViewingEntry.weather === "Snowy" && "☃️ 눈"}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-[10px] text-slate-400 font-bold">오늘의 기분</p>
                                  <p className="text-xs font-bold text-slate-700">
                                    {bookViewingEntry.feeling === "Happy" && "🌸 행복해요"}
                                    {bookViewingEntry.feeling === "Calm" && "🍃 평온해요"}
                                    {bookViewingEntry.feeling === "Tired" && "💤 피곤해요"}
                                    {bookViewingEntry.feeling === "Sad" && "💧 슬퍼요"}
                                    {bookViewingEntry.feeling === "Angry" && "🔥 화나요"}
                                  </p>
                                </div>
                              </div>

                              <div>
                                <p className="text-[10px] text-slate-400 font-bold mb-1">일기 내용</p>
                                <p className="text-sm font-bold text-slate-800 leading-relaxed whitespace-pre-wrap" style={{ fontFamily: "'Gamja Flower', cursive, sans-serif", fontSize: "1.15rem" }}>
                                  {bookViewingEntry.text}
                                </p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </>
                  );
                })()}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: WRITE DIARY VIEW */}
        {activeTab === "write" && (
          <div className="space-y-4 animate-fade-in pb-8">

            {!generatedImageUrl ? (
              <div className="space-y-4">
                {/* Simulated Lined Notepad Paper layout */}
                <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm space-y-3 flex flex-col">
                  {/* Date line */}
                  <div className="text-center font-bold text-slate-700 text-sm border-t border-b border-slate-100 py-3">
                    {(() => {
                      const dateObj = new Date(selectedDateStr);
                      const weekDays = ["일요일", "월요일", "화요일", "수요일", "목요일", "금요일", "토요일"];
                      const dayOfWeek = weekDays[dateObj.getDay()] || "";
                      const parts = selectedDateStr.split("-");
                      return `${parts[0]}년 ${parts[1]}월 ${parts[2]}일 ${dayOfWeek}`;
                    })()}
                  </div>

                  {/* Weather selector row */}
                  <div className="flex items-center gap-3 py-1 border-b border-slate-100 text-sm">
                    <span className="font-bold text-slate-500 shrink-0">날씨 :</span>
                    <div className="flex gap-1.5 w-full justify-between">
                      {[
                        { id: "Sunny", label: "맑음", emoji: "☀️" },
                        { id: "Cloudy", label: "흐림", emoji: "☁️" },
                        { id: "Rainy", label: "비", emoji: "☔️" },
                        { id: "Snowy", label: "눈", emoji: "☃️" },
                      ].map((w) => {
                        const isSelected = diaryWeather === w.id;
                        return (
                          <button
                            key={w.id}
                            type="button"
                            onClick={() => setDiaryWeather(w.id)}
                            className={`flex-1 py-1 px-2 rounded-full border text-xs font-semibold flex items-center justify-center gap-1 transition-all cursor-pointer ${
                              isSelected 
                                ? "border-slate-800 bg-slate-50 text-slate-800 scale-105 shadow-sm font-bold" 
                                : "border-slate-100 text-slate-400 hover:text-slate-600"
                            }`}
                          >
                            <span>{w.emoji}</span>
                            <span>{w.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Diary Title Field */}
                  <div className="py-2 border-b border-slate-100 flex items-center gap-2 text-sm">
                    <span className="font-bold text-slate-500 shrink-0">일기 제목 :</span>
                    <input
                      type="text"
                      value={diaryTitle}
                      onChange={(e) => setDiaryTitle(e.target.value)}
                      placeholder="오늘 하루의 제목을 적어주세요"
                      maxLength={20}
                      className="w-full bg-transparent outline-none font-bold text-slate-800 placeholder-slate-300 text-sm focus:ring-0 border-0 p-0"
                    />
                  </div>

                  {/* Today's Mood Selector */}
                  <div className="py-3 border-b border-slate-100">
                    <p className="text-xs font-bold text-slate-400 mb-2">오늘 기분 (첫번째 사진 참고) :</p>
                    <div className="grid grid-cols-5 gap-1.5">
                      {FEELINGS_LIST.map((f) => {
                        const isSelected = selectedFeeling === f.type;
                        return (
                          <button
                            key={f.type}
                            type="button"
                            onClick={() => setSelectedFeeling(f.type)}
                            className={`py-2 rounded-xl border flex flex-col items-center transition-all cursor-pointer ${
                              isSelected 
                                ? "border-slate-800 bg-[#FFFDF9] shadow-sm scale-105 font-bold" 
                                : "border-slate-100 opacity-50 hover:opacity-100"
                            }`}
                          >
                            <MiniMoodLogo feeling={f.type} size={36} />
                            <span className="text-[10px] text-slate-600 mt-1">{f.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Diary Content area with notebook lines background */}
                  <div className="py-3">
                    <p className="text-xs font-bold text-slate-400 mb-2">일기 내용 :</p>
                    <div
                      className="relative rounded-2xl border border-slate-100 p-4 bg-white shadow-inner h-[180px]"
                      style={{
                        backgroundImage: "linear-gradient(#f1f5f9 1px, transparent 1px)",
                        backgroundSize: "100% 2rem",
                        lineHeight: "2rem"
                      }}
                    >
                      <textarea
                        value={diaryText}
                        onChange={(e) => setDiaryText(e.target.value)}
                        maxLength={500}
                        placeholder="일기 내용을 텍스트로 작성해보세요... (최대 500자)"
                        className="w-full h-full resize-none overflow-y-auto bg-transparent outline-none text-slate-800 placeholder-slate-300 border-0 focus:ring-0 leading-[2rem] text-sm font-medium"
                        style={{ lineHeight: "2rem" }}
                      />
                    </div>
                    <div className="text-right text-[10px] text-slate-300 mt-1 font-mono">
                      {diaryText.length} / 500 자
                    </div>
                  </div>
                </div>

                {/* Bottom yellow button matching Screenshot 2 */}
                <button
                  onClick={handleGeneratePictureDiary}
                  disabled={!diaryText.trim() || !diaryTitle.trim() || isGenerating}
                  className="w-full h-12 bg-[#FFE69A] hover:bg-[#FFE27D] disabled:bg-slate-100 disabled:text-slate-400 text-slate-800 rounded-full flex items-center justify-center space-x-2 transition-all font-sans font-bold shadow cursor-pointer disabled:cursor-not-allowed text-sm"
                >
                  {isGenerating ? (
                    <>
                      <svg className="animate-spin h-5 w-5 text-slate-600" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      <span>그림을 삐뚤빼뚤 그리는 중... 🎨</span>
                    </>
                  ) : (
                    <span>그림 일기 만들기</span>
                  )}
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm space-y-4">
                  <p className="text-xs font-bold font-sans text-emerald-600">🎉 아래와 같이 그림일기가 생성되었습니다!</p>
                  
                  {/* Public/Private switch — replaced by a progress indicator while the childlike summary is being generated */}
                  <div className="flex items-center justify-end px-1 py-1 max-w-sm mx-auto">
                    {isSummarizing ? (
                      <div className="flex items-center gap-2 bg-amber-50 py-1.5 px-3 rounded-full border border-amber-200 shadow-sm select-none">
                        <svg className="animate-spin h-3.5 w-3.5 text-amber-500" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        <span className="text-xs font-bold text-amber-600 font-sans">요약 만드는 중...</span>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2 bg-slate-50 py-1 px-3 rounded-full border border-slate-200 shadow-sm select-none">
                        <button
                          type="button"
                          onClick={() => setIsWritePublic(!isWritePublic)}
                          className={`w-10 h-5.5 rounded-full transition-colors relative focus:outline-none flex items-center cursor-pointer ${
                            isWritePublic ? "bg-[#7BEF87]" : "bg-slate-300"
                          }`}
                        >
                          <span
                            className={`absolute top-0.5 left-0.5 bg-white w-4.5 h-4.5 rounded-full transition-transform shadow-md ${
                              isWritePublic ? "translate-x-4.5" : "translate-x-0"
                            }`}
                          />
                        </button>
                        <span className="text-xs font-bold text-slate-700 font-sans min-w-[32px]">
                          {isWritePublic ? "공개" : "비공개"}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* High-fidelity Picture Diary Frame matching Screenshot 3 */}
                  <div className="border-[3px] border-slate-800 bg-[#FFFDF9] rounded-2xl shadow-xl overflow-hidden max-w-sm mx-auto flex flex-col font-sans">
                    {/* Header: Date & Weather */}
                    <div className="flex justify-between items-center px-4 py-2 border-b-[3px] border-slate-800 text-xs font-bold text-slate-800 bg-white">
                      <span>{(() => {
                        const parts = selectedDateStr.split("-");
                        return `${parts[0]}년 ${parseInt(parts[1], 10)}월 ${parseInt(parts[2], 10)}일`;
                      })()}</span>
                      <div className="flex flex-col items-end gap-1.5 select-none">
                        <div className="flex items-center gap-1">
                          <span>날씨</span>
                          <div className="flex gap-1 ml-1">
                            {["Sunny", "Cloudy", "Rainy", "Snowy"].map((wId) => {
                              const isMatched = diaryWeather === wId;
                              const emojiMap: Record<string, string> = { Sunny: "☀️", Cloudy: "☁️", Rainy: "☔️", Snowy: "☃️" };
                              return (
                                <span 
                                  key={wId} 
                                  className={`p-0.5 inline-flex items-center justify-center text-sm ${
                                    isMatched ? "border-2 border-slate-800 rounded-full bg-yellow-100/50 font-bold scale-110" : "opacity-30"
                                  }`}
                                  style={{ width: "24px", height: "24px" }}
                                >
                                  {emojiMap[wId]}
                                </span>
                              );
                            })}
                          </div>
                        </div>
                        {/* Selected Feeling marked with Circle (날씨 아래에) */}
                        <div className="flex items-center gap-1">
                          <span>기분</span>
                          <div className="flex gap-1 ml-1">
                            {FEELINGS_LIST.map((f) => {
                              const isMatched = selectedFeeling === f.type;
                              return (
                                <span 
                                  key={f.type} 
                                  title={f.label}
                                  className={`p-0.5 inline-flex items-center justify-center transition-all rounded-full ${
                                    isMatched ? "border-2 border-slate-800 bg-[#FFFDF9] scale-110 opacity-100" : "opacity-30"
                                  }`}
                                  style={{ width: "24px", height: "24px" }}
                                >
                                  <MiniMoodLogo feeling={f.type} size={20} />
                                </span>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Generated picture-diary image */}
                    <div className="w-full aspect-[4/3] bg-[#FCF9F2] overflow-hidden border-b-[3px] border-slate-800">
                      <img src={generatedImageUrl} alt="AI 그림일기" className="w-full h-full object-cover" />
                    </div>

                    {/* Title */}
                    <div className="px-4 py-2 border-b-[3px] border-slate-800 font-bold text-slate-800 bg-white text-sm" style={{ fontFamily: "'Gamja Flower', cursive, sans-serif" }}>
                      제목 : {diaryTitle || "오늘의 일기"}
                    </div>

                    {/* Manuscript layout (원고지) */}
                    <div className="p-3 bg-white">
                      {(() => {
                        const chars = generatedSummary ? generatedSummary.split("") : [];
                        const totalCells = Math.max(40, Math.ceil(chars.length / 10) * 10);
                        return (
                          <div className="grid grid-cols-10 gap-0 border-t-2 border-l-2 border-slate-800 bg-[#FFFDF9] rounded-sm overflow-hidden">
                            {Array.from({ length: totalCells }).map((_, idx) => {
                              const char = chars[idx] || "";
                              return (
                                <div 
                                  key={idx} 
                                  className="aspect-square border-r-2 border-b-2 border-slate-800 flex items-center justify-center text-lg text-slate-800 font-bold bg-[#FFFDF9]"
                                  style={{ fontFamily: "'Gamja Flower', cursive, sans-serif" }}
                                >
                                  {char}
                                </div>
                              );
                            })}
                          </div>
                        );
                      })()}
                    </div>
                  </div>

                  {/* Toggle button for text-only diary */}
                  <div className="flex flex-col items-center py-1">
                    <button
                      type="button"
                      onClick={() => setShowTextDiary(!showTextDiary)}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold rounded-full text-xs cursor-pointer shadow-sm transition-all"
                    >
                      <span>📄 글 일기 {showTextDiary ? "숨기기" : "보기"}</span>
                    </button>

                    {showTextDiary && (
                      <div className="w-full max-w-sm mt-3 bg-[#FFFDF9] border-2 border-slate-800 rounded-2xl p-5 shadow-md animate-fade-in relative overflow-hidden text-left">
                        {/* Notebook spine red line decoration */}
                        <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-red-200 pointer-events-none"></div>
                        <div className="pl-6 font-sans space-y-3">
                          <p className="text-[10px] font-bold text-emerald-600 tracking-wider">📄 글 일기 상세 내역</p>
                          
                          <div className="border-b border-dashed border-slate-200 pb-2">
                            <p className="text-[10px] text-slate-400 font-bold">제목</p>
                            <p className="text-sm font-bold text-slate-800" style={{ fontFamily: "'Gamja Flower', cursive, sans-serif", fontSize: "1.2rem" }}>
                              {diaryTitle || "오늘의 일기"}
                            </p>
                          </div>

                          <div className="grid grid-cols-2 gap-2 border-b border-dashed border-slate-200 pb-2">
                            <div>
                              <p className="text-[10px] text-slate-400 font-bold">날씨</p>
                              <p className="text-xs font-bold text-slate-700">
                                {diaryWeather === "Sunny" && "☀️ 맑음"}
                                {diaryWeather === "Cloudy" && "☁️ 흐림"}
                                {diaryWeather === "Rainy" && "☔️ 비"}
                                {diaryWeather === "Snowy" && "☃️ 눈"}
                              </p>
                            </div>
                            <div>
                              <p className="text-[10px] text-slate-400 font-bold">오늘의 기분</p>
                              <p className="text-xs font-bold text-slate-700">
                                {selectedFeeling === "Happy" && "🌸 행복해요"}
                                {selectedFeeling === "Calm" && "🍃 평온해요"}
                                {selectedFeeling === "Tired" && "💤 피곤해요"}
                                {selectedFeeling === "Sad" && "💧 슬퍼요"}
                                {selectedFeeling === "Angry" && "🔥 화나요"}
                              </p>
                            </div>
                          </div>

                          <div>
                            <p className="text-[10px] text-slate-400 font-bold mb-1">일기 내용</p>
                            <p className="text-sm font-bold text-slate-800 leading-relaxed whitespace-pre-wrap" style={{ fontFamily: "'Gamja Flower', cursive, sans-serif", fontSize: "1.15rem" }}>
                              {diaryText}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex space-x-3 pt-2">
                    <button
                      onClick={() => { setGeneratedImageUrl(""); setGeneratedSummary(""); }}
                      className="flex-1 py-3 border border-slate-200 text-slate-700 font-semibold rounded-full text-xs hover:bg-slate-50 cursor-pointer text-center"
                    >
                      다시 만들기 🔄
                    </button>
                    <button
                      onClick={handleSaveDiary}
                      className="flex-1 py-3 text-slate-800 font-bold rounded-full text-xs cursor-pointer text-center bg-[#FFE69A] hover:bg-[#FFE27D] shadow"
                    >
                      저장하고 완료 💾
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: VIEW SPECIFIC DIARY CARD */}
        {activeTab === "view" && viewingEntry && (
          <div className="space-y-4 animate-fade-in pb-12">

            {/* Public/Private sharing switch (Screenshot 1 replication) */}
            <div className="flex items-center justify-end px-1 py-1 max-w-sm mx-auto">
              <div className="flex items-center space-x-2 bg-slate-50 py-1 px-3 rounded-full border border-slate-200 shadow-sm select-none">
                <button
                  type="button"
                  onClick={handleToggleViewingPublic}
                  className={`w-10 h-5.5 rounded-full transition-colors relative focus:outline-none flex items-center cursor-pointer ${
                    viewingEntry.isPublic ? "bg-[#7BEF87]" : "bg-slate-300"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 bg-white w-4.5 h-4.5 rounded-full transition-transform shadow-md ${
                      viewingEntry.isPublic ? "translate-x-4.5" : "translate-x-0"
                    }`}
                  />
                </button>
                <span className="text-xs font-bold text-slate-700 font-sans min-w-[32px]">
                  {viewingEntry.isPublic ? "공개" : "비공개"}
                </span>
              </div>
            </div>

            {/* The framed Picture Diary Frame matching Screenshot 3 */}
            <div className="border-[3px] border-slate-800 bg-[#FFFDF9] rounded-2xl shadow-xl overflow-hidden max-w-sm mx-auto flex flex-col font-sans">
              {/* Header: Date & Weather */}
              <div className="flex justify-between items-center px-4 py-2 border-b-[3px] border-slate-800 text-xs font-bold text-slate-800 bg-white">
                <span>{(() => {
                  const parts = viewingEntry.date.split("-");
                  return `${parts[0]}년 ${parseInt(parts[1], 10)}월 ${parseInt(parts[2], 10)}일`;
                })()}</span>
                <div className="flex flex-col items-end gap-1.5 select-none">
                  <div className="flex items-center gap-1">
                    <span>날씨</span>
                    <div className="flex gap-1 ml-1">
                      {["Sunny", "Cloudy", "Rainy", "Snowy"].map((wId) => {
                        const isMatched = (viewingEntry.weather || "Sunny") === wId;
                        const emojiMap: Record<string, string> = { Sunny: "☀️", Cloudy: "☁️", Rainy: "☔️", Snowy: "☃️" };
                        return (
                          <span 
                            key={wId} 
                            className={`p-0.5 inline-flex items-center justify-center text-sm ${
                              isMatched ? "border-2 border-slate-800 rounded-full bg-yellow-100/50 font-bold scale-110" : "opacity-30"
                            }`}
                            style={{ width: "24px", height: "24px" }}
                          >
                            {emojiMap[wId]}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                  {/* Selected Feeling marked with Circle (날씨 아래에) */}
                  <div className="flex items-center gap-1">
                    <span>기분</span>
                    <div className="flex gap-1 ml-1">
                      {FEELINGS_LIST.map((f) => {
                        const isMatched = viewingEntry.feeling === f.type;
                        return (
                          <span 
                            key={f.type} 
                            title={f.label}
                            className={`p-0.5 inline-flex items-center justify-center transition-all rounded-full ${
                              isMatched ? "border-2 border-slate-800 bg-[#FFFDF9] scale-110 opacity-100" : "opacity-30"
                            }`}
                            style={{ width: "24px", height: "24px" }}
                          >
                            <MiniMoodLogo feeling={f.type} size={20} />
                          </span>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Picture-diary artwork */}
              <DiaryArt entry={viewingEntry} className="w-full aspect-[4/3] bg-[#FCF9F2] overflow-hidden border-b-[3px] border-slate-800" />

              {/* Title */}
              <div className="px-4 py-2 border-b-[3px] border-slate-800 font-bold text-slate-800 bg-white text-sm" style={{ fontFamily: "'Gamja Flower', cursive, sans-serif" }}>
                제목 : {viewingEntry.title || "신나는 하루"}
              </div>

              {/* Manuscript layout (원고지) */}
              <div className="p-3 bg-white">
                {(() => {
                  const summaryText = viewingEntry.summary || summarizeTextLocally(viewingEntry.text, viewingEntry.feeling);
                  const chars = summaryText.split("");
                  const totalCells = Math.max(40, Math.ceil(chars.length / 10) * 10);
                  return (
                    <div className="grid grid-cols-10 gap-0 border-t-2 border-l-2 border-slate-800 bg-[#FFFDF9] rounded-sm overflow-hidden">
                      {Array.from({ length: totalCells }).map((_, idx) => {
                        const char = chars[idx] || "";
                        return (
                          <div 
                            key={idx} 
                            className="aspect-square border-r-2 border-b-2 border-slate-800 flex items-center justify-center text-lg text-slate-800 font-bold bg-[#FFFDF9]"
                            style={{ fontFamily: "'Gamja Flower', cursive, sans-serif" }}
                          >
                            {char}
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Toggle button for text-only diary in VIEW mode */}
            <div className="flex flex-col items-center py-1">
              <button
                type="button"
                onClick={() => setShowTextDiary(!showTextDiary)}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 font-bold rounded-full text-xs cursor-pointer shadow-sm transition-all"
              >
                <span>📄 글 일기 {showTextDiary ? "숨기기" : "보기"}</span>
              </button>

              {showTextDiary && (
                <div className="w-full max-w-sm mt-3 bg-[#FFFDF9] border-2 border-slate-800 rounded-2xl p-5 shadow-md animate-fade-in relative overflow-hidden text-left">
                  {/* Notebook spine red line decoration */}
                  <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-red-200 pointer-events-none"></div>
                  <div className="pl-6 font-sans space-y-3">
                    <p className="text-[10px] font-bold text-emerald-600 tracking-wider">📄 글 일기 상세 내역</p>
                    
                    <div className="border-b border-dashed border-slate-200 pb-2">
                      <p className="text-[10px] text-slate-400 font-bold">제목</p>
                      <p className="text-sm font-bold text-slate-800" style={{ fontFamily: "'Gamja Flower', cursive, sans-serif", fontSize: "1.2rem" }}>
                        {viewingEntry.title || "오늘의 일기"}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-2 border-b border-dashed border-slate-200 pb-2">
                      <div>
                        <p className="text-[10px] text-slate-400 font-bold">날씨</p>
                        <p className="text-xs font-bold text-slate-700">
                          {viewingEntry.weather === "Sunny" && "☀️ 맑음"}
                          {viewingEntry.weather === "Cloudy" && "☁️ 흐림"}
                          {viewingEntry.weather === "Rainy" && "☔️ 비"}
                          {viewingEntry.weather === "Snowy" && "☃️ 눈"}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] text-slate-400 font-bold">오늘의 기분</p>
                        <p className="text-xs font-bold text-slate-700">
                          {viewingEntry.feeling === "Happy" && "🌸 행복해요"}
                          {viewingEntry.feeling === "Calm" && "🍃 평온해요"}
                          {viewingEntry.feeling === "Tired" && "💤 피곤해요"}
                          {viewingEntry.feeling === "Sad" && "💧 슬퍼요"}
                          {viewingEntry.feeling === "Angry" && "🔥 화나요"}
                        </p>
                      </div>
                    </div>

                    <div>
                      <p className="text-[10px] text-slate-400 font-bold mb-1">일기 내용</p>
                      <p className="text-sm font-bold text-slate-800 leading-relaxed whitespace-pre-wrap" style={{ fontFamily: "'Gamja Flower', cursive, sans-serif", fontSize: "1.15rem" }}>
                        {viewingEntry.text}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 5: FRIENDS LIST (PEOPLE TAB) */}
        {activeTab === "friends" && (
          <div className="space-y-6 animate-fade-in pb-12">
            
            {/* VIEW 1: Main Friends List (No selected friend) */}
            {!selectedFriend && (
              <div className="space-y-6">
                <div className="bg-white p-5 rounded-[28px] border border-[#EBE7DC] shadow-sm space-y-1.5">
                  <h3 className="text-lg font-bold text-slate-800 font-sans">내 친구들 👥</h3>
                  <p className="text-xs text-slate-500 font-sans">내 도란도란 메이트 ({friendsList.length}명)</p>
                </div>

                <div className="space-y-3">
                  {friendsList.length === 0 && (
                    <p className="text-xs text-slate-400 text-center py-6 font-sans">아직 친구가 없어요. 오른쪽 위 친구 추가 버튼으로 친구를 초대해 보세요!</p>
                  )}
                  {friendsList.map((friend) => (
                    <button
                      key={friend.id}
                      onClick={() => {
                        setSelectedFriend(friend);
                        setFriendSubView("calendar");
                        setShowTextDiary(false);
                      }}
                      className="w-full text-left bg-white p-4 rounded-2xl border border-slate-100 flex items-center justify-between shadow-xs hover:border-slate-300 transition-all cursor-pointer"
                    >
                      <div className="flex items-center space-x-3.5">
                        <div 
                          className="w-12 h-12 rounded-full border border-slate-200/80 flex items-center justify-center shadow-xs overflow-hidden"
                          style={{ backgroundColor: `${friend.profileColorHex}15` }}
                        >
                          <Logo color={friend.profileColorHex} size={38} animate={false} />
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <h4 className="text-sm font-bold text-slate-800">{friend.name}</h4>
                            
                          </div>
                          <p className="text-[10px] text-slate-400 font-sans mt-0.5">{friend.email}</p>
                        </div>
                      </div>
                      <ChevronRight size={16} className="text-slate-400" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* VIEW 2: Friend's Calendar view */}
            {selectedFriend && friendSubView === "calendar" && (
              <div className="space-y-6">
                <div className="bg-white rounded-[28px] p-5 border border-[#EBE7DC] shadow-sm">
                  
                  {/* Friend Calendar Header */}
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <h2 className="font-display font-bold text-2xl text-slate-800 tracking-tight leading-none">
                        July <span className="font-normal text-slate-300 font-mono text-xl">2026</span>
                      </h2>
                      <span className="text-xs text-slate-400 font-sans mt-1.5 block">
                        2026년 7월 • {selectedFriend.name}의 달력
                      </span>
                    </div>
                    {/* Back button to friend list */}
                    <button
                      onClick={() => {
                        setSelectedFriend(null);
                        setFriendSubView(null);
                      }}
                      className="px-3.5 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 rounded-full text-xs font-bold font-sans cursor-pointer transition-colors"
                    >
                      친구 목록
                    </button>
                  </div>

                  {/* Calendar Grid of days */}
                  <div className="grid grid-cols-7 gap-y-3 gap-x-2">
                    {/* Weekdays */}
                    {["S", "M", "T", "W", "T", "F", "S"].map((w, idx) => (
                      <div 
                        key={`friend-week-${idx}`} 
                        className={`text-center font-mono text-[10px] font-bold pb-2 ${
                          idx === 0 ? "text-[#FF5A5F]" : idx === 6 ? "text-[#82B3FF]" : "text-slate-400"
                        }`}
                      >
                        {w}
                      </div>
                    ))}

                    {/* Days */}
                    {days.map((day, idx) => {
                      if (!day) {
                        // Fill dummy previous month dates visually exactly as picture
                        const prevDaysCount = new Date(2026, 5, 0).getDate();
                        const dummyDayNum = prevDaysCount - (new Date(2026, 6, 1).getDay() - idx - 1);
                        return (
                          <div 
                            key={`friend-empty-${idx}`} 
                            className="aspect-[1/1.3] flex flex-col justify-start p-1 pl-1.5 relative text-slate-200/50 text-sm font-sans font-medium"
                          >
                            <span className="text-[11px] font-bold text-slate-200">{dummyDayNum}</span>
                          </div>
                        );
                      }

                      const dateStr = formatDate(day);
                      const friendEntry = selectedFriend.entries.find(e => e.date === dateStr);
                      
                      // Sunday / Saturday coloring
                      const isSunday = day.getDay() === 0;
                      const isSaturday = day.getDay() === 6;
                      
                      let dayTextColor = "text-slate-700";
                      if (isSunday) dayTextColor = "text-[#FF5A5F]";
                      if (isSaturday) dayTextColor = "text-[#82B3FF]";

                      if (friendEntry) {
                        // Friend has diary entry
                        let feelingBg = "bg-[#FFF275]";
                        let feelingBorder = "border-[#333333]";
                        if (friendEntry.feeling === "Tired") {
                          feelingBg = "bg-[#E2D2FF]";
                        } else if (friendEntry.feeling === "Calm") {
                          feelingBg = "bg-[#CBD5E1]";
                        } else if (friendEntry.feeling === "Sad") {
                          feelingBg = "bg-[#B9D5FF]";
                        } else if (friendEntry.feeling === "Angry") {
                          feelingBg = "bg-[#FFA3A6]";
                        }

                        return (
                          <button
                            key={`friend-cell-${dateStr}`}
                            onClick={() => {
                              setFriendViewingEntry(friendEntry);
                              setFriendSubView("view");
                              setShowTextDiary(false);
                            }}
                            className={`aspect-[1/1.3] rounded-2xl p-1 relative cursor-pointer border-2 flex flex-col justify-between items-center transition-all shadow-sm ${feelingBg} ${feelingBorder}`}
                          >
                            <span className={`text-[11px] font-bold self-start pl-1 pt-0.5 ${dayTextColor}`}>{day.getDate()}</span>
                            <div className="w-8 h-8 flex items-center justify-center pb-1">
                              <MiniMoodLogo feeling={friendEntry.feeling} size={32} />
                            </div>
                          </button>
                        );
                      }

                      return (
                        <div
                          key={`friend-cell-${dateStr}`}
                          className="aspect-[1/1.3] rounded-2xl p-1 relative flex flex-col justify-between items-center border border-transparent"
                        >
                          <span className={`text-[11px] font-bold self-start pl-1 pt-0.5 ${dayTextColor}`}>{day.getDate()}</span>
                          <div className="w-8 h-8" />
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* VIEW 3: Friend's Diary View (Picture diary only by default) */}
            {selectedFriend && friendSubView === "view" && friendViewingEntry && (
              <div className="space-y-4 animate-fade-in pb-12">
                
                {/* Back button row */}
                <div className="flex justify-between items-center px-1 max-w-sm mx-auto">
                  <button
                    onClick={() => {
                      setFriendViewingEntry(null);
                      setFriendSubView("calendar");
                      setShowTextDiary(false);
                    }}
                    className="inline-flex items-center space-x-1 px-3.5 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-bold rounded-full text-xs shadow-xs cursor-pointer transition-colors"
                  >
                    <ChevronLeft size={14} strokeWidth={2.5} />
                    <span>친구 달력</span>
                  </button>
                  <span className="text-xs font-bold text-slate-400 font-sans">
                    {selectedFriend.name}의 그림일기
                  </span>
                </div>

                {/* The framed Picture Diary Frame */}
                <div className="border-[3px] border-slate-800 bg-[#FFFDF9] rounded-2xl shadow-xl overflow-hidden max-w-sm mx-auto flex flex-col font-sans">
                  {/* Header: Date & Weather */}
                  <div className="flex justify-between items-center px-4 py-2 border-b-[3px] border-slate-800 text-xs font-bold text-slate-800 bg-white">
                    <span>{(() => {
                      const parts = friendViewingEntry.date.split("-");
                      return `${parts[0]}년 ${parseInt(parts[1], 10)}월 ${parseInt(parts[2], 10)}일`;
                    })()}</span>
                    <div className="flex flex-col items-end gap-1.5 select-none">
                      <div className="flex items-center gap-1">
                        <span>날씨</span>
                        <div className="flex gap-1 ml-1">
                          {["Sunny", "Cloudy", "Rainy", "Snowy"].map((wId) => {
                            const isMatched = (friendViewingEntry.weather || "Sunny") === wId;
                            const emojiMap: Record<string, string> = { Sunny: "☀️", Cloudy: "☁️", Rainy: "☔️", Snowy: "☃️" };
                            return (
                              <span 
                                key={wId} 
                                className={`p-0.5 inline-flex items-center justify-center text-sm ${
                                  isMatched ? "border-2 border-slate-800 rounded-full bg-yellow-100/50 font-bold scale-110" : "opacity-30"
                                }`}
                                style={{ width: "24px", height: "24px" }}
                              >
                                {emojiMap[wId]}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                      {/* Selected Feeling marked with Circle (날씨 아래에) */}
                      <div className="flex items-center gap-1">
                        <span>기분</span>
                        <div className="flex gap-1 ml-1">
                          {FEELINGS_LIST.map((f) => {
                            const isMatched = friendViewingEntry.feeling === f.type;
                            return (
                              <span 
                                key={f.type} 
                                title={f.label}
                                className={`p-0.5 inline-flex items-center justify-center transition-all rounded-full ${
                                  isMatched ? "border-2 border-slate-800 bg-[#FFFDF9] scale-110 opacity-100" : "opacity-30"
                                }`}
                                style={{ width: "24px", height: "24px" }}
                              >
                                <MiniMoodLogo feeling={f.type} size={20} />
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Picture-diary artwork */}
                  <DiaryArt entry={friendViewingEntry} className="w-full aspect-[4/3] bg-[#FCF9F2] overflow-hidden border-b-[3px] border-slate-800" />

                  {/* Title */}
                  <div className="px-4 py-2 border-b-[3px] border-slate-800 font-bold text-slate-800 bg-white text-sm animate-fade-in" style={{ fontFamily: "'Gamja Flower', cursive, sans-serif" }}>
                    제목 : {friendViewingEntry.title || "신나는 하루"}
                  </div>

                  {/* Manuscript layout (원고지) */}
                  <div className="p-3 bg-white">
                    {(() => {
                      const summaryText = friendViewingEntry.summary || summarizeTextLocally(friendViewingEntry.text, friendViewingEntry.feeling);
                      const chars = summaryText.split("");
                      const totalCells = Math.max(40, Math.ceil(chars.length / 10) * 10);
                      return (
                        <div className="grid grid-cols-10 gap-0 border-t-2 border-l-2 border-slate-800 bg-[#FFFDF9] rounded-sm overflow-hidden">
                          {Array.from({ length: totalCells }).map((_, idx) => {
                            const char = chars[idx] || "";
                            return (
                              <div 
                                key={idx} 
                                className="aspect-square border-r-2 border-b-2 border-slate-800 flex items-center justify-center text-lg text-slate-800 font-bold bg-[#FFFDF9]"
                                style={{ fontFamily: "'Gamja Flower', cursive, sans-serif" }}
                              >
                                {char}
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </div>
            )}
            
          </div>
        )}

        {/* TAB 6: SETTINGS VIEW */}
        {activeTab === "settings" && (
          <div className="space-y-6 animate-fade-in pb-12">
            {settingsTab === "main" && (
              <div className="space-y-4">
                {/* User Profile Card */}
                <div className="bg-white p-5 rounded-[28px] border border-[#EBE7DC] shadow-sm flex items-center space-x-4">
                  <div 
                    className="w-14 h-14 rounded-full border border-slate-200/80 flex items-center justify-center overflow-hidden"
                    style={{ backgroundColor: `${profile.profileColorHex}15` }}
                  >
                    <Logo color={profile.profileColorHex} size={46} animate={false} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-800 font-sans">{profile.nickname}</h3>
                    <p className="text-xs text-slate-400 font-sans">{profile.email}</p>
                  </div>
                </div>

                {/* Settings list items */}
                <div className="bg-white rounded-[28px] border border-[#EBE7DC] shadow-sm overflow-hidden">
                  {/* Item 1: Profile customization */}
                  <button
                    onClick={() => setSettingsTab("profile")}
                    className="w-full px-5 py-4 flex items-center justify-between border-b border-slate-100 hover:bg-slate-50 transition-colors text-left"
                  >
                    <div className="flex items-center space-x-3 text-slate-700">
                      <span className="text-sm font-bold font-sans"> 프로필 설정</span>
                    </div>
                    <ChevronRight size={16} className="text-slate-400" />
                  </button>

                  {/* Item 2: Friends Settings */}
                  <button
                    onClick={() => setSettingsTab("friends_menu")}
                    className="w-full px-5 py-4 flex items-center justify-between border-b border-slate-100 hover:bg-slate-50 transition-colors text-left"
                  >
                    <div className="flex items-center space-x-3 text-slate-700">
                      <span className="text-sm font-bold font-sans"> 친구 설정</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      {pendingReceivedRequests.length > 0 && (
                        <span className="w-5 h-5 bg-rose-500 text-white rounded-full text-[10px] font-bold flex items-center justify-center">
                          {pendingReceivedRequests.length}
                        </span>
                      )}
                      <ChevronRight size={16} className="text-slate-400" />
                    </div>
                  </button>

                  {/* Item 3: Notification Settings (Mock) */}
                  <div className="w-full px-5 py-4 flex items-center justify-between border-b border-slate-100 text-left">
                    <div className="flex items-center space-x-3 text-slate-700">
                      <span className="text-sm font-bold font-sans"> 알림 설정</span>
                    </div>
                    <div className="flex items-center">
                      <span className="text-[10px] text-[#A855F7] font-bold mr-2">활성화됨</span>
                      <div className="w-8 h-4 bg-emerald-400 rounded-full relative">
                        <div className="w-3.5 h-3.5 bg-white rounded-full absolute right-0.5 top-0.5 shadow-xs" />
                      </div>
                    </div>
                  </div>

                  {/* Item 4: General screen setting (Mock) */}
                  <div className="w-full px-5 py-4 flex items-center justify-between border-b border-slate-100 text-left">
                    <div className="flex items-center space-x-3 text-slate-700">
                      <span className="text-sm font-bold font-sans"> 화면 테마 설정</span>
                    </div>
                    <span className="text-xs font-bold text-slate-400 font-sans">종이 질감</span>
                  </div>

                  {/* Item 5: Customer support (Mock) */}
                  <div className="w-full px-5 py-4 flex items-center justify-between text-left">
                    <div className="flex items-center space-x-3 text-slate-700">
                      <span className="text-sm font-bold font-sans"> 고객센터 & 피드백</span>
                    </div>
                    <ChevronRight size={16} className="text-slate-400" />
                  </div>
                </div>

                {/* Logout Action */}
                <div className="bg-white p-4 rounded-[28px] border border-[#EBE7DC] shadow-sm flex justify-between items-center">
                  <div>
                    <h4 className="text-xs font-bold text-slate-800 font-sans">계정 로그아웃</h4>
                    <p className="text-[10px] text-slate-400 mt-0.5">안전하게 기기에서 로그아웃합니다</p>
                  </div>
                  <button
                    onClick={onLogout}
                    className="flex items-center space-x-1 px-3 py-1.5 border border-rose-100 hover:bg-rose-50 hover:border-rose-200 text-rose-500 rounded-xl text-xs font-sans font-semibold transition-all cursor-pointer shadow-sm"
                  >
                    <LogOut size={13} />
                    <span>로그아웃</span>
                  </button>
                </div>

                {/* 회원탈퇴 (데이터 초기화) */}
                <button
                  onClick={handleDeleteAccount}
                  disabled={isGenerating}
                  className="w-full py-3.5 bg-rose-500 hover:bg-rose-600 disabled:opacity-60 text-white font-bold rounded-2xl text-sm shadow-sm cursor-pointer transition-colors flex items-center justify-center gap-2"
                >
                  <Trash2 size={16} />
                  회원탈퇴 (데이터 초기화)
                </button>
                <p className="text-[10px] text-slate-400 text-center -mt-2 font-sans leading-relaxed">
                  회원탈퇴 시 이 계정의 모든 일기·친구·프로필이 삭제되고 되돌릴 수 없어요.
                </p>
              </div>
            )}

            {settingsTab === "profile" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => setSettingsTab("main")}
                    className="inline-flex items-center space-x-1 px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-bold rounded-full text-xs shadow-xs cursor-pointer transition-colors"
                  >
                    <ChevronLeft size={14} strokeWidth={2.5} />
                    <span>설정</span>
                  </button>
                  <span className="text-xs font-bold text-slate-400 font-sans">프로필 설정</span>
                </div>

                <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm">
                  <h3 className="text-sm font-bold text-slate-800 mb-4 font-sans">내 프로필 설정</h3>
                  
                  <form onSubmit={handleProfileUpdate} className="space-y-4">
                    <div>
                      <label className="text-xs text-slate-400 font-sans font-semibold block mb-1">닉네임 변경</label>
                      <input
                        type="text"
                        value={editNickname}
                        onChange={(e) => setEditNickname(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-slate-800 font-sans text-sm"
                        required
                      />
                    </div>

                    <div>
                      <label className="text-xs text-slate-400 font-sans font-semibold block mb-1">내 메인 컬러</label>
                      <div className="flex items-center space-x-3 mt-1">
                        <input
                          type="color"
                          value={editColor}
                          onChange={(e) => setEditColor(e.target.value)}
                          className="w-12 h-10 border border-slate-200 cursor-pointer rounded-xl bg-transparent"
                        />
                        <span className="text-xs text-slate-500 font-mono uppercase font-bold">{editColor}</span>
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl text-xs transition-colors cursor-pointer shadow-sm"
                    >
                      변경사항 저장 💾
                    </button>
                  </form>
                </div>
              </div>
            )}

            {settingsTab === "friends_menu" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => setSettingsTab("main")}
                    className="inline-flex items-center space-x-1 px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-bold rounded-full text-xs shadow-xs cursor-pointer transition-colors"
                  >
                    <ChevronLeft size={14} strokeWidth={2.5} />
                    <span>설정</span>
                  </button>
                  <span className="text-xs font-bold text-slate-400 font-sans">친구 설정</span>
                </div>

                <div className="bg-white p-5 rounded-[28px] border border-[#EBE7DC] shadow-sm space-y-4">
                  <div className="text-center py-2">
                    <h3 className="text-sm font-bold text-slate-800 mt-2 font-sans">나만의 도란도란 친구 관리</h3>
                    <p className="text-[11px] text-slate-400 mt-0.5">그림일기를 함께 나누어 볼 친구들을 관리해보세요</p>
                  </div>

                  <div className="grid grid-cols-1 gap-2.5 pt-2">
                    <button
                      onClick={() => setSettingsTab("invite")}
                      className="w-full py-3.5 px-4 bg-[#FFE69A] hover:bg-[#FFE27D] text-slate-800 font-bold rounded-2xl text-xs transition-all flex items-center justify-between shadow-sm cursor-pointer"
                    >
                      <span className="flex items-center space-x-2">
                        <span>친구 초대하기</span>
                      </span>
                      <ChevronRight size={14} />
                    </button>

                    <button
                      onClick={() => setSettingsTab("approve")}
                      className="w-full py-3.5 px-4 bg-[#FFE69A] hover:bg-[#FFE27D] text-slate-800 font-bold rounded-2xl text-xs transition-all flex items-center justify-between shadow-sm cursor-pointer relative"
                    >
                      <span className="flex items-center space-x-2">
                        <span>친구 승인하기</span>
                      </span>
                      <div className="flex items-center space-x-1.5">
                        {pendingReceivedRequests.length > 0 && (
                          <span className="w-5 h-5 bg-rose-500 text-white rounded-full text-[10px] font-bold flex items-center justify-center">
                            {pendingReceivedRequests.length}
                          </span>
                        )}
                        <ChevronRight size={14} />
                      </div>
                    </button>

                    <button
                      onClick={() => setSettingsTab("delete")}
                      className="w-full py-3.5 px-4 bg-[#FFE69A] hover:bg-[#FFE27D] text-slate-800 font-bold rounded-2xl text-xs transition-all flex items-center justify-between shadow-sm cursor-pointer"
                    >
                      <span className="flex items-center space-x-2">
                        <span>친구 삭제하기</span>
                      </span>
                      <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {settingsTab === "invite" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => setSettingsTab("friends_menu")}
                    className="inline-flex items-center space-x-1 px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-bold rounded-full text-xs shadow-xs cursor-pointer transition-colors"
                  >
                    <ChevronLeft size={14} strokeWidth={2.5} />
                    <span>친구 설정</span>
                  </button>
                  <span className="text-xs font-bold text-slate-400 font-sans">친구 초대하기</span>
                </div>

                {/* Input form */}
                <form onSubmit={handleInviteSubmit} className="bg-white p-5 rounded-[28px] border border-[#EBE7DC] shadow-sm space-y-4">
                  <div className="flex items-center space-x-2">
                    <h3 className="text-sm font-bold text-slate-800 font-sans">새로운 친구 초대</h3>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="text-[10px] text-slate-400 font-sans font-bold block mb-1">친구 이름 (별명)</label>
                      <input
                        type="text"
                        value={inviteName}
                        onChange={(e) => setInviteName(e.target.value)}
                        placeholder="예: 길동이"
                        className="w-full px-3.5 py-2.5 border border-slate-100 bg-slate-50/50 rounded-xl focus:outline-none focus:border-slate-800 focus:bg-white font-sans text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 font-sans font-bold block mb-1">친구 이메일</label>
                      <input
                        type="email"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        placeholder="friend@iceu.kr"
                        className="w-full px-3.5 py-2.5 border border-slate-100 bg-slate-50/50 rounded-xl focus:outline-none focus:border-slate-800 focus:bg-white font-sans text-sm"
                        required
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={!inviteEmail.trim()}
                    className="w-full py-3.5 bg-[#FFE69A] hover:bg-[#FFE27D] disabled:bg-slate-50 disabled:text-slate-400 text-slate-800 font-bold rounded-xl text-xs transition-colors cursor-pointer shadow-xs"
                  >
                    초대장 전송하기 ✉️
                  </button>
                </form>

                {/* Sent history list */}
                <div className="bg-white p-5 rounded-[28px] border border-[#EBE7DC] shadow-sm space-y-4">
                  <h4 className="text-xs font-bold text-slate-500 font-sans">보낸 초대 현황 ({pendingSentRequests.length}건)</h4>
                  
                  {pendingSentRequests.length === 0 ? (
                    <p className="text-[11px] text-slate-400 text-center py-6 font-sans">보낸 초대장이 없습니다.</p>
                  ) : (
                    <div className="space-y-3.5">
                      {pendingSentRequests.map((req, idx) => (
                        <div 
                          key={`sent-${idx}`}
                          className="flex items-center justify-between p-3.5 bg-slate-50/50 rounded-2xl border border-slate-100"
                        >
                          <div className="flex items-center space-x-3">
                            <div 
                              className="w-10 h-10 rounded-full border border-slate-200/60 flex items-center justify-center overflow-hidden"
                              style={{ backgroundColor: `${req.profileColorHex}15` }}
                            >
                              <Logo color={req.profileColorHex} size={32} animate={false} />
                            </div>
                            <div>
                              <p className="text-xs font-bold text-slate-800">{req.name}</p>
                              <p className="text-[9px] text-slate-400 font-sans">{req.email}</p>
                            </div>
                          </div>
                          
                          <div className="text-right">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-50 text-amber-500 border border-amber-100">
                              대기 중
                            </span>
                            <p className="text-[9px] text-slate-300 font-mono mt-1">{req.date}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {settingsTab === "approve" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => setSettingsTab("friends_menu")}
                    className="inline-flex items-center space-x-1 px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-bold rounded-full text-xs shadow-xs cursor-pointer transition-colors"
                  >
                    <ChevronLeft size={14} strokeWidth={2.5} />
                    <span>친구 설정</span>
                  </button>
                  <span className="text-xs font-bold text-slate-400 font-sans">친구 승인 대기함</span>
                </div>

                <div className="bg-white p-5 rounded-[28px] border border-[#EBE7DC] shadow-sm space-y-4">
                  <div className="flex items-center space-x-2">
                    <span className="text-xl">✅</span>
                    <h3 className="text-sm font-bold text-slate-800 font-sans">받은 친구 신청 ({pendingReceivedRequests.length}건)</h3>
                  </div>

                  {pendingReceivedRequests.length === 0 ? (
                    <div className="text-center py-10">
                      <span className="text-3xl">📭</span>
                      <p className="text-xs text-slate-400 font-sans mt-3">지금은 대기 중인 친구 신청이 없어요.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {pendingReceivedRequests.map((req, idx) => (
                        <div 
                          key={`received-${idx}`}
                          className="p-4 bg-slate-50/50 rounded-2xl border border-slate-100 flex flex-col space-y-3"
                        >
                          <div className="flex items-center space-x-3">
                            <div 
                              className="w-11 h-11 rounded-full border border-slate-200/80 flex items-center justify-center overflow-hidden"
                              style={{ backgroundColor: `${req.profileColorHex}15` }}
                            >
                              <Logo color={req.profileColorHex} size={35} animate={false} />
                            </div>
                            <div>
                              <h4 className="text-xs font-bold text-slate-800">{req.name}</h4>
                              <p className="text-[10px] text-slate-400 font-sans mt-0.5">{req.email}</p>
                            </div>
                          </div>

                          <div className="flex space-x-2">
                            <button
                              onClick={() => handleDeclineFriend(req)}
                              className="flex-1 py-2 border border-slate-200 text-slate-500 hover:bg-rose-50 hover:text-rose-500 font-bold rounded-xl text-[10px] transition-colors cursor-pointer"
                            >
                              거절하기
                            </button>
                            <button
                              onClick={() => handleApproveFriend(req)}
                              className="flex-1 py-2 bg-[#FFE69A] hover:bg-[#FFE27D] text-slate-800 font-bold rounded-xl text-[10px] transition-colors cursor-pointer shadow-xs"
                            >
                              승인하고 수락
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {settingsTab === "delete" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => setSettingsTab("friends_menu")}
                    className="inline-flex items-center space-x-1 px-3 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-bold rounded-full text-xs shadow-xs cursor-pointer transition-colors"
                  >
                    <ChevronLeft size={14} strokeWidth={2.5} />
                    <span>친구 설정</span>
                  </button>
                  <span className="text-xs font-bold text-slate-400 font-sans">친구 삭제하기</span>
                </div>

                <div className="bg-white p-5 rounded-[28px] border border-[#EBE7DC] shadow-sm space-y-4">
                  <div className="flex items-center space-x-2">
                    <span className="text-xl">👥</span>
                    <h3 className="text-sm font-bold text-slate-800 font-sans">내 친구 목록 ({friendsList.length}명)</h3>
                  </div>

                  {friendsList.length === 0 ? (
                    <p className="text-xs text-slate-400 text-center py-8 font-sans">아직 추가된 친구가 없습니다.</p>
                  ) : (
                    <div className="space-y-2.5">
                      {friendsList.map((friend) => (
                        <div 
                          key={friend.id}
                          className="p-3.5 bg-slate-50/50 rounded-2xl border border-slate-100 flex items-center justify-between"
                        >
                          <div className="flex items-center space-x-3.5">
                            <div 
                              className="w-10 h-10 rounded-full border border-slate-200/80 flex items-center justify-center overflow-hidden"
                              style={{ backgroundColor: `${friend.profileColorHex}15` }}
                            >
                              <Logo color={friend.profileColorHex} size={32} animate={false} />
                            </div>
                            <div>
                              <h4 className="text-xs font-bold text-slate-800">{friend.name}</h4>
                              <p className="text-[9px] text-slate-400 font-sans">{friend.email}</p>
                            </div>
                          </div>

                          <button
                            onClick={() => handleDeleteFriend(friend)}
                            className="px-3 py-1.5 border border-rose-100 hover:bg-rose-50 text-rose-500 rounded-lg text-[10px] font-bold font-sans cursor-pointer transition-colors"
                          >
                            삭제
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

      </main>

      {/* Fixed Bottom Navigation bar - docked to the absolute bottom of the mobile viewport container */}
      <nav
        className="absolute bottom-0 left-0 w-full bg-white border-t border-slate-200 flex justify-around items-start px-2 pt-2.5 z-30 select-none"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 10px)" }}
      >
        {/* 1. 그림책 (Book tab) */}
        <button
          onClick={() => {
            setViewingEntry(null);
            setShowTextDiary(false);
            setBookViewingEntry(null);
            setBookShowTextDiary(false);
            setActiveTab("book");
          }}
          className="flex-1 flex flex-col items-center gap-1 cursor-pointer"
          title="한달 그림책"
        >
          <span className={`px-5 py-1.5 rounded-full transition-colors ${activeTab === "book" ? "bg-slate-100 text-slate-900" : "text-slate-400"}`}>
            <Book size={26} strokeWidth={2.2} />
          </span>
          <span className={`text-[11px] font-bold font-sans ${activeTab === "book" ? "text-slate-900" : "text-slate-400"}`}>그림책</span>
        </button>

        {/* 2. 쓰기 (Write today's diary) */}
        <button
          onClick={handleCreateNewDiary}
          className="flex-1 flex flex-col items-center gap-1 cursor-pointer"
          title="오늘 일기 쓰기"
        >
          <span className={`px-5 py-1.5 rounded-full transition-colors ${activeTab === "write" ? "bg-slate-100 text-slate-900" : "text-slate-400"}`}>
            <Pencil size={26} strokeWidth={2.2} />
          </span>
          <span className={`text-[11px] font-bold font-sans ${activeTab === "write" ? "text-slate-900" : "text-slate-400"}`}>쓰기</span>
        </button>

        {/* 3. 홈 (Home calendar) */}
        <button
          onClick={() => {
            setViewingEntry(null);
            setShowTextDiary(false);
            setActiveTab("calendar");
          }}
          className="flex-1 flex flex-col items-center gap-1 cursor-pointer"
          title="캘린더 홈"
        >
          <span className={`px-5 py-1.5 rounded-full transition-colors ${activeTab === "calendar" ? "bg-slate-100 text-slate-900" : "text-slate-400"}`}>
            <Home size={26} strokeWidth={2.2} />
          </span>
          <span className={`text-[11px] font-bold font-sans ${activeTab === "calendar" ? "text-slate-900" : "text-slate-400"}`}>홈</span>
        </button>

        {/* 4. 친구 (Friends tab) */}
        <button
          onClick={() => {
            setViewingEntry(null);
            setShowTextDiary(false);
            setSelectedFriend(null);
            setFriendSubView(null);
            setFriendViewingEntry(null);
            setActiveTab("friends");
          }}
          className="flex-1 flex flex-col items-center gap-1 cursor-pointer"
          title="친구 소식"
        >
          <span className={`px-5 py-1.5 rounded-full transition-colors ${activeTab === "friends" ? "bg-slate-100 text-slate-900" : "text-slate-400"}`}>
            <Users size={26} strokeWidth={2.2} />
          </span>
          <span className={`text-[11px] font-bold font-sans ${activeTab === "friends" ? "text-slate-900" : "text-slate-400"}`}>친구</span>
        </button>

        {/* 5. 설정 (Settings tab) */}
        <button
          onClick={() => {
            setViewingEntry(null);
            setShowTextDiary(false);
            setSettingsTab("main");
            setActiveTab("settings");
          }}
          className="flex-1 flex flex-col items-center gap-1 cursor-pointer"
          title="내 설정"
        >
          <span className={`px-5 py-1.5 rounded-full transition-colors ${activeTab === "settings" ? "bg-slate-100 text-slate-900" : "text-slate-400"}`}>
            <Settings size={26} strokeWidth={2.2} />
          </span>
          <span className={`text-[11px] font-bold font-sans ${activeTab === "settings" ? "text-slate-900" : "text-slate-400"}`}>설정</span>
        </button>

      </nav>

      {/* iOS-Style Share Bottom Sheet (Screenshot 2 replication) */}
      {isShareSheetOpen && (
        <>
          {/* Backdrop overlay */}
          <div 
            className="fixed inset-0 bg-black/45 backdrop-blur-xs z-40 animate-fade-in cursor-pointer"
            onClick={() => setIsShareSheetOpen(false)}
          />

          {/* Bottom Sheet Frame */}
          <div className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-[#F2F2F7] rounded-t-3xl shadow-2xl z-50 p-4 pb-8 border-t border-white/20 select-none animate-slide-up font-sans overflow-hidden">
            {/* Grab bar indicator */}
            <div 
              className="w-12 h-1 bg-slate-300 rounded-full mx-auto mb-3 cursor-pointer" 
              onClick={() => setIsShareSheetOpen(false)} 
            />

            {/* Title */}
            <p className="text-[11px] font-bold text-slate-400 text-center uppercase tracking-wider mb-4">그림일기 공유 및 저장</p>

            {/* App quick share row (Horizontal scroll list) */}
            <div className="flex space-x-4 overflow-x-auto pb-4 px-2 scrollbar-none border-b border-slate-200">
              {/* AirDrop */}
              <button 
                onClick={() => {
                  alert("AirDrop 공유:\n주변 기기(아이패드, 맥북 등)를 검색 중입니다. 선택 시 전송을 시작합니다!");
                  setIsShareSheetOpen(false);
                }}
                className="flex flex-col items-center flex-shrink-0 cursor-pointer space-y-1 w-16"
              >
                <div className="w-13 h-13 bg-gradient-to-b from-[#5AC8FA] to-[#007AFF] rounded-2xl flex items-center justify-center shadow-sm text-white text-xl">
                  🌀
                </div>
                <span className="text-[10px] font-medium text-slate-500">AirDrop</span>
              </button>

              {/* Messages */}
              <button 
                onClick={() => {
                  alert("메시지 전송:\n그림일기 링크를 메시지로 첨부하여 전송합니다. 주소록을 선택해 주세요.");
                  setIsShareSheetOpen(false);
                }}
                className="flex flex-col items-center flex-shrink-0 cursor-pointer space-y-1 w-16"
              >
                <div className="w-13 h-13 bg-[#34C759] rounded-2xl flex items-center justify-center shadow-sm text-white text-xl">
                  💬
                </div>
                <span className="text-[10px] font-medium text-slate-500">메시지</span>
              </button>

              {/* KakaoTalk */}
              <button 
                onClick={() => {
                  alert("카카오톡 공유:\n카카오톡 친구 선택 창을 열었습니다. 그림일기 사진과 함께 링크가 전송됩니다!");
                  setIsShareSheetOpen(false);
                }}
                className="flex flex-col items-center flex-shrink-0 cursor-pointer space-y-1 w-16"
              >
                <div className="w-13 h-13 bg-[#FEE500] rounded-2xl flex flex-col items-center justify-center shadow-sm text-[#3C1E1E] font-bold text-[10px]">
                  <span>TALK</span>
                </div>
                <span className="text-[10px] font-medium text-slate-500">카카오톡</span>
              </button>

              {/* Memo */}
              <button 
                onClick={() => {
                  alert("메모 앱에 저장 완료:\n메모 앱에 오늘의 그림일기 미디어 카드가 임시 보관되었습니다.");
                  setIsShareSheetOpen(false);
                }}
                className="flex flex-col items-center flex-shrink-0 cursor-pointer space-y-1 w-16"
              >
                <div className="w-13 h-13 bg-amber-400 rounded-2xl flex items-center justify-center shadow-sm text-white text-xl">
                  📝
                </div>
                <span className="text-[10px] font-medium text-slate-500">메모</span>
              </button>
            </div>

            {/* Actions Block 1 (Phone local features) */}
            <div className="bg-white rounded-2xl divide-y divide-slate-100 overflow-hidden text-left mt-4 shadow-xs">
              <button 
                onClick={() => {
                  alert("클립보드 복사 완료:\n그림일기 이미지가 성공적으로 복사되었습니다. 원하는 곳에 붙여넣으세요!");
                  setIsShareSheetOpen(false);
                }}
                className="w-full px-4 py-3 flex items-center justify-between text-slate-800 hover:bg-slate-50 text-xs font-semibold cursor-pointer"
              >
                <span className="font-sans">사진 복사</span>
                <Copy size={15} className="text-slate-400" />
              </button>

              <button 
                onClick={() => {
                  alert("공유 앨범 추가:\n'가족 일기 앨범'에 이 그림일기 파일이 영구 등록되었습니다!");
                  setIsShareSheetOpen(false);
                }}
                className="w-full px-4 py-3 flex items-center justify-between text-slate-800 hover:bg-slate-50 text-xs font-semibold cursor-pointer"
              >
                <span className="font-sans">공유 앨범에 추가</span>
                <Users size={15} className="text-slate-400" />
              </button>

              <button 
                onClick={() => {
                  alert("내 갤러리에 저장 완료!\n성공적으로 내 갤러리에 그림일기 사진이 다운로드되어 보관되었습니다. 📸");
                  setIsShareSheetOpen(false);
                }}
                className="w-full px-4 py-3 flex items-center justify-between text-[#007AFF] hover:bg-slate-50 text-xs font-bold cursor-pointer"
              >
                <span className="font-sans">앨범에 추가 (내 갤러리에 사진 저장)</span>
                <PlusCircle size={15} className="text-[#007AFF]" />
              </button>

              <button 
                onClick={() => {
                  alert("AirPlay 실행:\n인근 스마트 TV, 빔 프로젝터 등 화면 미러링 수신 기기를 탐색하고 있습니다...");
                  setIsShareSheetOpen(false);
                }}
                className="w-full px-4 py-3 flex items-center justify-between text-slate-800 hover:bg-slate-50 text-xs font-semibold cursor-pointer"
              >
                <span className="font-sans">AirPlay</span>
                <Monitor size={15} className="text-slate-400" />
              </button>
            </div>

            {/* Actions Block 2 (System features) */}
            <div className="bg-white rounded-2xl divide-y divide-slate-100 overflow-hidden text-left mt-3 shadow-xs">
              <button 
                onClick={() => {
                  alert("배경화면 설정:\n오늘의 그림일기가 홈 화면 및 잠금화면 배경으로 등록되었습니다. 기분 좋은 하루를 기억해봐요!");
                  setIsShareSheetOpen(false);
                }}
                className="w-full px-4 py-3 flex items-center justify-between text-slate-800 hover:bg-slate-50 text-xs font-semibold cursor-pointer"
              >
                <span className="font-sans">배경화면 지정</span>
                <Smartphone size={15} className="text-slate-400" />
              </button>

              <button 
                onClick={() => {
                  alert("iCloud 링크 복사 완료:\niCloud 클라우드 임시 공유 링크 주소가 복사되었습니다. (30일 유효)");
                  setIsShareSheetOpen(false);
                }}
                className="w-full px-4 py-3 flex items-center justify-between text-slate-800 hover:bg-slate-50 text-xs font-semibold cursor-pointer"
              >
                <span className="font-sans">iCloud 링크 복사</span>
                <Copy size={15} className="text-slate-400" />
              </button>

              <button 
                onClick={() => {
                  alert("무수정 원본 벡터 파일 내보내기 완료:\n그림일기 고품질 원본 SVG 파일이 스마트폰 내 파일 폴더로 즉시 내보내기 되었습니다!");
                  setIsShareSheetOpen(false);
                }}
                className="w-full px-4 py-3 flex items-center justify-between text-slate-800 hover:bg-slate-50 text-xs font-semibold cursor-pointer"
              >
                <span className="font-sans">무수정 원본 내보내기</span>
                <Folder size={15} className="text-slate-400" />
              </button>
            </div>

            {/* Cancel bar */}
            <button 
              onClick={() => setIsShareSheetOpen(false)}
              className="w-full bg-white text-red-500 font-bold py-3.5 rounded-2xl mt-4 cursor-pointer text-center text-sm shadow-xs hover:bg-slate-50 transition-colors"
            >
              취소
            </button>
          </div>
        </>
      )}

    </div>
  );
}
