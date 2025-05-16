"use client";

import { useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth";
import { useTheme } from "@/contexts/theme-context";
import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import Link from "next/link";
import { Home, BookOpen, Clock, Gift, LogOut, LogIn, User, Brain, BarChart, Menu, X, CheckCircle } from "lucide-react";
import { ThemedAvatar } from "./ui/themed-components";
import { themeConfig } from "@/config/themeConfig";

export default function Navbar() {
  const router = useRouter();
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();
  const [userXP, setUserXP] = useState(0);
  const [userRank, setUserRank] = useState("");
  const [loading, setLoading] = useState(true);
  const [userTheme, setUserTheme] = useState(theme);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  console.log("Mobile menu state:", mobileMenuOpen); // Debug log

  useEffect(() => {
    // Fetch user's XP and theme from Firestore when the user changes
    const fetchUserData = async () => {
      if (!user) {
        setLoading(false);
        return;
      }
      
      try {
        setLoading(true);
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        
        if (userDoc.exists()) {
          const userData = userDoc.data();
          const totalXP = userData.totalXP || 0;
          setUserXP(totalXP);
          
          // Get user's theme from Firestore
          const userThemeFromDB = userData.theme || 'classic';
          
          // Update context theme if different
          if (userThemeFromDB !== theme) {
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
            
            setUserRank(userRankName);
          }
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchUserData();
  }, [user, setTheme, theme]);

  const handleLogout = async () => {
    await signOut(auth);
    router.push("/login");
    setMobileMenuOpen(false);
  };

  const themeLabels = {
    dbz: "Dragon Ball Z",
    naruto: "Naruto",
    hogwarts: "Hogwarts",
    classic: "Classic"
  };

  // Navigation links for both desktop and mobile
  const navLinks = [
    { href: "/", label: "Home", icon: <Home className="h-5 w-5" /> },
    { href: "/dashboard", label: "Dashboard", icon: <Home className="h-5 w-5" /> },
    { href: "/subjects", label: "Subjects", icon: <BookOpen className="h-5 w-5" /> },
    { href: "/activities", label: "Activities", icon: <CheckCircle className="h-5 w-5" /> },
    { href: "/todos", label: "Todos", icon: <CheckCircle className="h-5 w-5" /> },
    { href: "/projects", label: "Projects", icon: <BarChart className="h-5 w-5" /> },
    { href: "/study-logger", label: "Study Logger", icon: <Clock className="h-5 w-5" /> },
    { href: "/study-overview", label: "Study Overview", icon: <BarChart className="h-5 w-5" /> },
    { href: "/spaced-recall", label: "Spaced Recall", icon: <Brain className="h-5 w-5" /> },
    { href: "/rewards", label: "Rewards", icon: <Gift className="h-5 w-5" /> },
  ];

  // Get theme-specific color for the hamburger menu
  const getThemeColor = () => {
    switch (userTheme?.toLowerCase()) {
      case 'dbz':
        return 'bg-yellow-600 hover:bg-yellow-700';
      case 'naruto':
        return 'bg-orange-600 hover:bg-orange-700';
      case 'hogwarts':
        return 'bg-purple-600 hover:bg-purple-700';
      default:
        return 'bg-blue-600 hover:bg-blue-700';
    }
  };

  const toggleMobileMenu = () => {
    console.log("Toggling mobile menu, current state:", mobileMenuOpen);
    setMobileMenuOpen(!mobileMenuOpen);
  };

  return (
    <>
      {/* Top spacing - separate from navbar */}
      <div className="h-6 bg-gradient-to-r from-slate-900 to-slate-800"></div>
      
      {/* Navbar with position relative instead of sticky */}
      <div className="bg-slate-800 text-white shadow-lg relative z-40">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center h-16">
            {/* Logo Area with Avatar Menu Button */}
            <div className="flex items-center gap-4">
              <button 
                onClick={toggleMobileMenu}
                className="relative flex items-center justify-center focus:outline-none"
                aria-label="Toggle Menu"
              >
                <div className={`${mobileMenuOpen ? 'ring-2 ring-white' : ''} rounded-full transition-all`}>
                  <ThemedAvatar 
                    theme={userTheme} 
                    xp={userXP} 
                    size="lg" 
                  />
                </div>
                <div className={`absolute bottom-0 right-0 ${getThemeColor()} rounded-full w-6 h-6 flex items-center justify-center border border-slate-800`}>
                  {mobileMenuOpen ? (
                    <X className="h-4 w-4" />
                  ) : (
                    <Menu className="h-4 w-4" />
                  )}
                </div>
              </button>
              
              <Link href="/" className="text-xl font-bold hover:text-blue-300 transition">
                Spaced Recall
              </Link>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-4">
              {user && navLinks.slice(1, 8).map((link, index) => (
                <Link
                  key={index}
                  href={link.href}
                  className="px-3 py-2 rounded-md text-sm font-medium text-slate-200 hover:text-blue-300 transition"
                >
                  {link.label}
                </Link>
              ))}
              
              {user ? (
                <div className="flex items-center gap-3">
                  <Link
                    href="/profile"
                    className="px-3 py-2 rounded-md text-sm font-medium text-slate-200 hover:text-blue-300"
                  >
                    Profile
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-2 bg-red-600 hover:bg-red-700 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>Logout</span>
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => router.push("/login")}
                  className={`flex items-center gap-2 ${getThemeColor()} px-4 py-2 rounded-md transition-colors`}
                >
                  <LogIn className="h-4 w-4" />
                  <span>Login</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 top-[88px] z-50 bg-black/60">
          <div className="bg-slate-900 w-64 h-full overflow-y-auto">
            <div className="p-4">
              {navLinks.map((link, index) => (
                <Link
                  key={index}
                  href={link.href}
                  className="flex items-center gap-3 px-4 py-3 rounded-lg text-base font-medium text-white hover:bg-slate-800 mb-2"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <div className={`${getThemeColor()} bg-opacity-30 p-2 rounded-full`}>
                    {link.icon}
                  </div>
                  {link.label}
                </Link>
              ))}
              
              {user && (
                <>
                  <div className="border-t border-slate-700 my-4"></div>
                  
                  <Link
                    href="/profile"
                    className="flex items-center gap-3 px-4 py-3 rounded-lg text-base font-medium text-white hover:bg-slate-800 mb-2"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <div className={`${getThemeColor()} bg-opacity-30 p-2 rounded-full`}>
                      <User className="h-5 w-5" />
                    </div>
                    Profile
                  </Link>
                  
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-3 w-full px-4 py-3 rounded-lg text-base font-medium text-white bg-red-600 hover:bg-red-700 mb-2"
                  >
                    <div className="bg-red-700/70 p-2 rounded-full">
                      <LogOut className="h-5 w-5" />
                    </div>
                    Logout
                  </button>
                </>
              )}
              
              {!user && (
                <>
                  <div className="border-t border-slate-700 my-4"></div>
                  
                  <button
                    onClick={() => {
                      router.push("/login");
                      setMobileMenuOpen(false);
                    }}
                    className={`flex items-center gap-3 w-full px-4 py-3 rounded-lg text-base font-medium text-white ${getThemeColor()} mb-2`}
                  >
                    <div className={`${getThemeColor()} bg-opacity-70 p-2 rounded-full`}>
                      <LogIn className="h-5 w-5" />
                    </div>
                    Login
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
