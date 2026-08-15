import React from "react";
import Logo from "./Logo";

interface SplashViewProps {
  onNext: () => void;
}

export default function SplashView({ onNext }: SplashViewProps) {
  return (
    <div 
      onClick={onNext}
      className="fixed inset-0 bg-[#FFE068] flex flex-col items-center justify-center cursor-pointer select-none overflow-hidden"
    >
      {/* Background visual detail */}
      <div className="absolute inset-0 opacity-10 paper-pattern pointer-events-none" />
      
      {/* Centered Smiling Face Logo */}
      <div className="flex flex-col items-center justify-center space-y-6 animate-soft-bounce">
        <Logo color="#333333" size={160} animate={false} />
      </div>

      <div className="absolute bottom-16 text-slate-700/60 font-hand text-lg animate-pulse">
        화면을 터치해서 시작해보세요 ✏️
      </div>
    </div>
  );
}
