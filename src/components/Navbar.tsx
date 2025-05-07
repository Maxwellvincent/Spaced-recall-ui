"use client";

import { useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth";
import { useTheme } from "@/contexts/theme-context";
import { useEffect, useState } from "react";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import Link from "next/link";
import { Home, BookOpen, Clock, Gift, LogOut, LogIn, User, Brain } from "lucide-react";
import { ThemedAvatar } from "./ui/themed-components";
import { getRankFromXP } from "@/lib/xpSystem";
import { themeConfig } from "@/config/themeConfig";

export default function Navbar() {
  const router = useRouter();
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();
  const [userXP, setUserXP] = useState(0);
  const [userRank, setUserRank] = useState("");
  const [loading, setLoading] = useState(true);
  const [userTheme, setUserTheme] = useState(theme);

  useEffect(() => {
    // Fetch user's XP and theme from Firestore when the user changes
    const fetchUserData = async () => {
      if (!user) {
        setLoading(false);
        return;
      }
      
      try {
        setLoading(true);
        console.log("Navbar: Fetching user data");
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        
        if (userDoc.exists()) {
          const userData = userDoc.data();
          const totalXP = userData.totalXP || 0;
          setUserXP(totalXP);
          
          // Get user's theme from Firestore
          const userThemeFromDB = userData.theme || 'classic';
          console.log("Navbar: User theme from DB:", userThemeFromDB);
          
          // Update context theme if different
          if (userThemeFromDB !== theme) {
            console.log("Navbar: Updating theme context to:", userThemeFromDB);
            setTheme(userThemeFromDB);
          }
          
          setUserTheme(userThemeFromDB);
          
          // Get the appropriate rank based on the theme and XP
          if (userThemeFromDB in themeConfig) {
            // Use the xpTiers directly from themeConfig for the current theme
            const tiers = Object.entries(themeConfig[userThemeFromDB].xpTiers)
              .sort(([a], [b]) => Number(a) - Number(b));
            
            // Find the highest tier that the user's XP exceeds
            let userRankName = "";
            for (let i = tiers.length - 1; i >= 0; i--) {
              const [, tier] = tiers[i];
              if (totalXP >= tier.xpRequired) {
                userRankName = tier.name;
                break;
              }
            }
            
            // If no tier found, use the first one
            if (!userRankName && tiers.length > 0) {
              userRankName = tiers[0][1].name;
            }
            
            console.log("Navbar: Setting user rank to", userRankName, "for theme", userThemeFromDB);
            setUserRank(userRankName);
          }
        }
      } catch (error) {
        console.error("Navbar: Error fetching user data:", error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchUserData();
  }, [user, setTheme]);

  // Update rank when theme changes (from context)
  useEffect(() => {
    if (!user || theme === userTheme) return;
    
    console.log("Navbar: Theme changed to", theme, "updating rank");
    setUserTheme(theme);
    
    // Update rank based on new theme
    if (theme in themeConfig && userXP > 0) {
      const tiers = Object.entries(themeConfig[theme].xpTiers)
        .sort(([a], [b]) => Number(a) - Number(b));
      
      let userRankName = "";
      for (let i = tiers.length - 1; i >= 0; i--) {
        const [, tier] = tiers[i];
        if (userXP >= tier.xpRequired) {
          userRankName = tier.name;
          break;
        }
      }
      
      if (!userRankName && tiers.length > 0) {
        userRankName = tiers[0][1].name;
      }
      
      setUserRank(userRankName);
      
      // Save theme preference to Firestore
      if (user && user.uid) {
        updateDoc(doc(db, 'users', user.uid), { theme }).catch(err => 
          console.error("Error updating theme in Firestore:", err)
        );
      }
    }
  }, [theme, userTheme, userXP, user]);

  const handleLogout = async () => {
    await signOut(auth);
    router.push("/login");
  };

  const themeLabels = {
    dbz: "Dragon Ball Z",
    naruto: "Naruto",
    hogwarts: "Hogwarts",
    classic: "Classic"
  };

  return (
    <nav className="flex justify-between items-center px-6 py-4 bg-slate-800/50 backdrop-blur-sm text-white shadow-lg sticky top-0 z-50">
      <div className="flex items-center gap-6">
        <Link href="/dashboard" className="text-xl font-bold hover:text-blue-300 transition">
          Spaced Recall
        </Link>
        {user && (
          <div className="flex items-center gap-4">
            <Link
              href="/dashboard"
              className="flex items-center gap-2 text-slate-200 hover:text-blue-300 transition"
            >
              <Home className="h-4 w-4" />
              <span>Dashboard</span>
            </Link>
            <Link
              href="/subjects"
              className="flex items-center gap-2 text-slate-200 hover:text-blue-300 transition"
            >
              <BookOpen className="h-4 w-4" />
              <span>Subjects</span>
            </Link>
            <Link
              href="/study-logger"
              className="flex items-center gap-2 text-slate-200 hover:text-blue-300 transition"
            >
              <Clock className="h-4 w-4" />
              <span>Study Logger</span>
            </Link>
            <Link
              href="/spaced-recall"
              className="flex items-center gap-2 text-slate-200 hover:text-blue-300 transition"
            >
              <Brain className="h-4 w-4" />
              <span>Spaced Recall</span>
            </Link>
            <Link
              href="/rewards"
              className="flex items-center gap-2 text-slate-200 hover:text-blue-300 transition"
            >
              <Gift className="h-4 w-4" />
              <span>Rewards</span>
            </Link>
          </div>
        )}
      </div>
      <div className="flex items-center gap-4">
        {user && (
          <>
            <div className="flex items-center gap-2 text-slate-200">
              {!loading && (
                <ThemedAvatar 
                  theme={userTheme} 
                  xp={userXP} 
                  size="sm" 
                />
              )}
              <div className="flex flex-col">
                <span className="text-xs text-slate-300">{themeLabels[userTheme as keyof typeof themeLabels] || "Classic"}</span>
                {userRank && <span className="text-xs font-medium text-yellow-300">{userRank}</span>}
              </div>
            </div>
            <Link
              href="/profile"
              className="flex items-center gap-2 text-slate-200 hover:text-blue-300 transition"
            >
              <User className="h-4 w-4" />
              <span>Profile</span>
            </Link>
          </>
        )}
        {user ? (
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 bg-red-600/80 hover:bg-red-700 px-4 py-2 rounded-lg transition-colors"
          >
            <LogOut className="h-4 w-4" />
            <span>Logout</span>
          </button>
        ) : (
          <button
            onClick={() => router.push("/login")}
            className="flex items-center gap-2 bg-blue-600/80 hover:bg-blue-700 px-4 py-2 rounded-lg transition-colors"
          >
            <LogIn className="h-4 w-4" />
            <span>Login</span>
          </button>
        )}
      </div>
    </nav>
  );
}
