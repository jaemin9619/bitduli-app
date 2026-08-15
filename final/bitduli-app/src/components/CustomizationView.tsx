import React, { useState } from "react";
import Logo from "./Logo";
import { ThemeColor, UserProfile } from "../types";

interface CustomizationViewProps {
  email: string;
  onComplete: (profile: UserProfile) => void;
}

// Exactly matching colors in the provided screenshots (Pictures 3 & 4)
const CORE_THEME_COLORS: ThemeColor[] = [
  { name: "빨강", hex: "#FF5A5F", bgClass: "bg-[#FF5A5F]", textClass: "text-[#FF5A5F]", borderClass: "border-[#FF5A5F]" },
  { name: "주황", hex: "#FFA655", bgClass: "bg-[#FFA655]", textClass: "text-[#FFA655]", borderClass: "border-[#FFA655]" },
  { name: "노랑", hex: "#FFF275", bgClass: "bg-[#FFF275]", textClass: "text-[#FFF275]", borderClass: "border-[#FFF275]" },
  { name: "초록", hex: "#7BEF87", bgClass: "bg-[#7BEF87]", textClass: "text-[#7BEF87]", borderClass: "border-[#7BEF87]" },
  { name: "파랑", hex: "#82B3FF", bgClass: "bg-[#82B3FF]", textClass: "text-[#82B3FF]", borderClass: "border-[#82B3FF]" },
  { name: "보라", hex: "#D384FF", bgClass: "bg-[#D384FF]", textClass: "text-[#D384FF]", borderClass: "border-[#D384FF]" },
  { name: "숯색", hex: "#404040", bgClass: "bg-[#404040]", textClass: "text-[#404040]", borderClass: "border-[#404040]" },
];

export default function CustomizationView({ email, onComplete }: CustomizationViewProps) {
  const [nickname, setNickname] = useState("");
  const [selectedColor, setSelectedColor] = useState<ThemeColor>(CORE_THEME_COLORS[2]); // Default yellow (Yellow is #FFF275)
  const [showPicker, setShowPicker] = useState(false);
  const [customHex, setCustomHex] = useState("#FF6B6B");

  const handleStart = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nickname.trim()) return;
    
    onComplete({
      nickname: nickname.trim(),
      profileColorName: selectedColor.name,
      profileColorHex: selectedColor.hex,
      email: email
    });
  };

  const handleCustomColorSelect = (hex: string) => {
    const customColor: ThemeColor = {
      name: "나만의 색",
      hex: hex,
      bgClass: `bg-[${hex}]`,
      textClass: `text-[${hex}]`,
      borderClass: `border-[${hex}]`
    };
    setSelectedColor(customColor);
  };

  return (
    <div className="h-full flex-1 bg-white flex flex-col justify-between items-center py-12 px-6 relative max-w-md mx-auto w-full">
      <div className="flex-1 flex flex-col justify-center items-center w-full max-w-sm space-y-10 my-6">
        {/* Dynamic Color Smiley Logo - OUTLINE DYNAMICALLY UPDATES! */}
        <div className="flex flex-col items-center">
          <Logo color={selectedColor.hex} size={130} />
          <h2 className="mt-4 text-xl font-bold text-center text-slate-800 font-sans tracking-tight">
            삐뚤에 온 것을 환영해요!
          </h2>
        </div>

        {/* Customization Form */}
        <form onSubmit={handleStart} className="w-full space-y-8">
          {/* Nickname input */}
          <div className="space-y-2">
            <label className="text-slate-700 text-lg font-bold font-sans self-start">닉네임</label>
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="삐뚤빼뚤 닉네임을 적어주세요"
              maxLength={12}
              required
              className="w-full h-14 px-4 bg-[#FCFDFE] border-2 border-slate-200 hover:border-slate-300 focus:border-slate-800 focus:outline-none rounded-xl text-lg transition-all"
            />
          </div>

          {/* Profile color selector circles */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <label className="text-slate-700 text-lg font-bold font-sans">프로필 색상</label>
              {selectedColor.name && (
                <span className="text-xs px-2 py-0.5 rounded-full font-sans font-semibold border" style={{ borderColor: selectedColor.hex, color: selectedColor.hex }}>
                  {selectedColor.name}
                </span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {CORE_THEME_COLORS.map((color) => {
                const isSelected = selectedColor.hex === color.hex;
                return (
                  <button
                    key={color.hex}
                    type="button"
                    onClick={() => {
                      setSelectedColor(color);
                      setShowPicker(false);
                    }}
                    className={`w-9 h-9 rounded-full relative cursor-pointer hover:scale-110 active:scale-95 transition-all flex items-center justify-center`}
                    style={{ backgroundColor: color.hex }}
                    title={color.name}
                  >
                    {isSelected && (
                      <span className="w-3 h-3 rounded-full bg-white shadow-sm" />
                    )}
                  </button>
                );
              })}

              {/* More circle (...) */}
              <button
                type="button"
                onClick={() => setShowPicker(!showPicker)}
                className={`w-9 h-9 rounded-full border-2 border-slate-300 border-dashed hover:border-slate-800 flex items-center justify-center text-slate-500 hover:text-slate-800 cursor-pointer transition-all ${showPicker ? "bg-slate-100" : ""}`}
                title="더 많은 색상"
              >
                <span className="text-xs font-bold font-mono">···</span>
              </button>
            </div>

            {/* Custom color picker popup */}
            {showPicker && (
              <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl flex items-center space-x-4 animate-fade-in">
                <input
                  type="color"
                  value={customHex}
                  onChange={(e) => {
                    setCustomHex(e.target.value);
                    handleCustomColorSelect(e.target.value);
                  }}
                  className="w-10 h-10 border-0 rounded cursor-pointer"
                />
                <div className="flex-1 text-xs font-sans">
                  <p className="text-slate-600 font-medium">나만의 특별한 색상을 직접 골라보세요!</p>
                  <p className="text-slate-400 font-mono mt-1 uppercase">{customHex}</p>
                </div>
              </div>
            )}
          </div>
        </form>
      </div>

      {/* Yellow Start Button matching Picture 3 */}
      <div className="w-full max-w-sm mt-4">
        <button
          onClick={handleStart}
          disabled={!nickname.trim()}
          className="w-full h-14 bg-[#FFE177] hover:bg-[#FFDB55] active:scale-98 disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed rounded-full text-lg font-bold font-sans text-slate-800 shadow-sm cursor-pointer hover:shadow transition-all flex items-center justify-center"
        >
          시작
        </button>
      </div>
    </div>
  );
}
