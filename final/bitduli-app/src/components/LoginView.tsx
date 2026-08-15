import React, { useState } from "react";
import Logo from "./Logo";
import { auth, googleProvider, signInWithPopup } from "../lib/firebase";

interface LoginViewProps {
  onLoginSuccess: (email: string) => void;
  userEmail: string;
}

export default function LoginView({ onLoginSuccess }: LoginViewProps) {
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [error, setError] = useState("");

  const handleGoogleLogin = async () => {
    setIsLoggingIn(true);
    setError("");
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const email = result.user?.email?.toLowerCase();
      if (!email) throw new Error("Google 계정에서 이메일을 확인하지 못했습니다.");
      onLoginSuccess(email);
    } catch (e) {
      console.error("Google sign-in failed", e);
      setError("Google 로그인이 실패했습니다. Firebase Authentication의 Google 제공자와 승인 도메인을 확인하세요.");
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <div className="h-full flex-1 bg-[#FFE068] flex flex-col justify-between items-center py-12 px-6 relative max-w-md mx-auto w-full">
      <div className="flex-1 flex flex-col justify-center items-center w-full max-w-xs space-y-12">
        <div className="flex flex-col items-center">
          <Logo color="#1e293b" size={130} />
          <h1 className="mt-6 text-3xl font-bold font-sans tracking-wide text-slate-800">회원가입</h1>
        </div>

        <button
          onClick={handleGoogleLogin}
          disabled={isLoggingIn}
          className="w-full h-14 bg-white border border-slate-200 hover:border-slate-400 active:bg-slate-50 rounded-xl flex items-center justify-center space-x-3 shadow cursor-pointer transition-all disabled:opacity-75 disabled:cursor-wait"
        >
          <span className="font-sans font-medium text-lg text-slate-700">{isLoggingIn ? "로그인 중..." : "Google로 계속하기"}</span>
        </button>

        {error && <div className="text-center text-xs text-red-600 font-sans bg-red-50 p-3 rounded-lg border border-red-200">{error}</div>}
      </div>

      <div className="text-slate-500 text-xs font-sans tracking-wide text-center">
        로그인 후 새 계정은 Firestore에 프로필을 만든 뒤 일기장을 시작합니다.
      </div>
    </div>
  );
}
