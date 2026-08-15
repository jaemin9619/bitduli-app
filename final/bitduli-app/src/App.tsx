import React, { useEffect, useState } from "react";
import SplashView from "./components/SplashView";
import LoginView from "./components/LoginView";
import CustomizationView from "./components/CustomizationView";
import CalendarDashboard from "./components/CalendarDashboard";
import { UserProfile } from "./types";
import { auth, db } from "./lib/firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";

type Step = "splash" | "login" | "customization" | "dashboard";

export default function App() {
  const [step, setStep] = useState<Step>("splash");
  const [email, setEmail] = useState("");
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setLoading(true);
      setError("");
      setProfile(null);

      if (!user?.email) {
        setEmail("");
        setStep("splash");
        setLoading(false);
        return;
      }

      const userEmail = user.email.toLowerCase();
      setEmail(userEmail);
      localStorage.setItem("bbiddul_user_email", userEmail);

      try {
        const profileRef = doc(db, "users", userEmail);
        const profileSnap = await getDoc(profileRef);
        if (profileSnap.exists()) {
          const loadedProfile = profileSnap.data() as UserProfile;
          setProfile(loadedProfile);
          localStorage.setItem(`bbiddul_profile_${userEmail}`, JSON.stringify(loadedProfile));
          setStep("dashboard");
        } else {
          setStep("customization");
        }
      } catch (loadError) {
        console.error("failed to load profile", loadError);
        setError("프로필을 불러오지 못했습니다. Firebase 연결과 Firestore 규칙을 확인하세요.");
        setStep("customization");
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const handleSplashNext = () => {
    if (profile) setStep("dashboard");
    else if (email) setStep("customization");
    else setStep("login");
  };

  const handleLoginSuccess = async (userEmail: string) => {
    const normalizedEmail = userEmail.toLowerCase();
    setEmail(normalizedEmail);
    localStorage.setItem("bbiddul_user_email", normalizedEmail);

    try {
      const profileRef = doc(db, "users", normalizedEmail);
      const profileSnap = await getDoc(profileRef);
      if (profileSnap.exists()) {
        const loadedProfile = profileSnap.data() as UserProfile;
        setProfile(loadedProfile);
        localStorage.setItem(`bbiddul_profile_${normalizedEmail}`, JSON.stringify(loadedProfile));
        setStep("dashboard");
      } else {
        setStep("customization");
      }
    } catch (loadError) {
      console.error("failed to fetch profile after login", loadError);
      setError("로그인 후 프로필 확인에 실패했습니다. 프로필을 새로 설정하세요.");
      setStep("customization");
    }
  };

  const handleCustomizationComplete = async (newProfile: UserProfile) => {
    const normalizedProfile: UserProfile = {
      ...newProfile,
      email: newProfile.email.toLowerCase()
    };

    try {
      await setDoc(doc(db, "users", normalizedProfile.email), {
        ...normalizedProfile,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }, { merge: true });
      setProfile(normalizedProfile);
      localStorage.setItem(`bbiddul_profile_${normalizedProfile.email}`, JSON.stringify(normalizedProfile));
      setStep("dashboard");
    } catch (saveError) {
      console.error("failed to save profile", saveError);
      setError("프로필 저장에 실패했습니다. Firestore 쓰기 권한을 확인하세요.");
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (logoutError) {
      console.error("logout failed", logoutError);
    }
    localStorage.removeItem("bbiddul_user_email");
    setProfile(null);
    setEmail("");
    setStep("login");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F0EFEA] flex items-center justify-center font-sans">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-700" />
          <span className="text-slate-600 font-medium">불러오는 중...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F0EFEA] flex items-center justify-center font-sans">
      <div className="w-full max-w-md h-screen md:h-[850px] bg-white md:rounded-[40px] md:shadow-2xl md:my-8 overflow-hidden relative border border-slate-200 flex flex-col justify-between">
        {error && <div className="absolute top-3 left-3 right-3 z-50 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">{error}</div>}

        {step === "splash" && <SplashView onNext={handleSplashNext} />}
        {step === "login" && <LoginView onLoginSuccess={handleLoginSuccess} userEmail={email} />}
        {step === "customization" && <CustomizationView email={email} onComplete={handleCustomizationComplete} />}
        {step === "dashboard" && profile && <CalendarDashboard profile={profile} onLogout={handleLogout} />}
      </div>
    </div>
  );
}
