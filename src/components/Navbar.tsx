"use client";

import { useRouter, usePathname } from "next/navigation";
import { signOut } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth";
import { useTheme } from "@/contexts/theme-context";
import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import Link from "next/link";
import { Home, BookOpen, Clock, Gift, LogOut, LogIn, User, Brain, BarChart, Menu, X, CheckCircle, ChevronDown, Plus } from "lucide-react";
import { ThemedAvatar } from "./ui/themed-components";
import { themeConfig } from "@/config/themeConfig";
import { ContentSidebarMobile } from './ContentSidebar';
import { getUserContentTree, createFolder, deleteContentItem } from '@/lib/contentService';
import { toast } from 'sonner';

export default function Navbar() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { theme, setTheme } = useTheme();
  const [userXP, setUserXP] = useState(0);
  const [userRank, setUserRank] = useState("");
  const [loading, setLoading] = useState(true);
  const [userTheme, setUserTheme] = useState(theme);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [contentTree, setContentTree] = useState(null);
  const [sidebarLoading, setSidebarLoading] = useState(false);
  const pathname = usePathname();

  // Extract currentItemId from /content/[itemId] route
  let currentItemId = undefined;
  if (pathname && pathname.startsWith('/content/')) {
    const parts = pathname.split('/');
    if (parts.length > 2 && parts[2]) {
      currentItemId = parts[2];
    }
  }

  // Load content tree for sidebar
  useEffect(() => {
    if (!user) return;
    setSidebarLoading(true);
    getUserContentTree(user.uid)
      .then(tree => setContentTree(tree))
      .catch(() => toast.error('Failed to load content structure'))
      .finally(() => setSidebarLoading(false));
  }, [user]);

  // Handlers for sidebar actions
  const handleCreateItem = async (parentId, type) => {
    if (type === 'folder') {
      // For demo, just create a folder and reload tree
      try {
        await createFolder('New Folder', '', parentId);
        toast.success('Folder created');
        if (user) {
          const tree = await getUserContentTree(user.uid);
          setContentTree(tree);
        }
      } catch {
        toast.error('Failed to create folder');
      }
    } else {
      // For other types, navigate to create page
      router.push(`/content/create?type=${type}${parentId ? `&parentId=${parentId}` : ''}`);
    }
  };

  const handleDeleteItem = async (itemId) => {
    try {
      await deleteContentItem(itemId);
      toast.success('Item deleted');
      if (user) {
        const tree = await getUserContentTree(user.uid);
        setContentTree(tree);
      }
    } catch {
      toast.error('Failed to delete item');
    }
  };

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
    {
      label: "Pathways",
      icon: <Brain className="h-5 w-5 text-blue-400" />,
      children: [
        { href: "/dashboard/pathways/explore", label: "Explore Pathways", icon: <Brain className="h-5 w-5 text-blue-400" /> },
        { href: "/dashboard/pathways", label: "Your Pathways", icon: <Brain className="h-5 w-5 text-blue-400" /> },
        { href: "/dashboard/subjects", label: "Subjects", icon: <BookOpen className="h-5 w-5" /> },
      ]
    },
    {
      label: "Activities",
      icon: <CheckCircle className="h-5 w-5" />,
      children: [
        { href: "/dashboard/activities", label: "All Activities", icon: <CheckCircle className="h-5 w-5" /> },
        {
          label: "Habits",
          icon: <BookOpen className="h-5 w-5" />,
          children: [
            { href: "/dashboard/activities?tab=habits", label: "Habits", icon: <BookOpen className="h-5 w-5" /> },
          ]
        },
        {
          label: "Todos",
          icon: <CheckCircle className="h-5 w-5" />,
          children: [
            { href: "/dashboard/activities?tab=todos", label: "Todos", icon: <CheckCircle className="h-5 w-5" /> },
          ]
        },
        {
          label: "Projects",
          icon: <BarChart className="h-5 w-5" />,
          children: [
            { href: "/dashboard/activities?tab=projects", label: "Projects", icon: <BarChart className="h-5 w-5" /> },
          ]
        },
        { href: "/dashboard/activities/quick-timer", label: "Quick Timer", icon: <Clock className="h-5 w-5" /> },
        { href: "/dashboard/activities/new/timed", label: "New Timed Activity", icon: <Plus className="h-5 w-5" /> },
      ]
    },
    { href: "/dashboard/study-logger", label: "Study Logger", icon: <Clock className="h-5 w-5" /> },
    { href: "/dashboard/study-overview", label: "Study Overview", icon: <BarChart className="h-5 w-5" /> },
    { href: "/dashboard/spaced-recall", label: "Spaced Recall", icon: <Brain className="h-5 w-5" /> },
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
    setMobileMenuOpen(!mobileMenuOpen);
  };

  const toggleDropdown = (label: string) => {
    if (activeDropdown === label) {
      setActiveDropdown(null);
    } else {
      setActiveDropdown(label);
    }
  };

  const handleNavigation = (href: string) => {
    router.push(href);
    setActiveDropdown(null);
    setMobileMenuOpen(false);
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
              {/* Mobile sidebar toggle button */}
              <button
                onClick={() => setSidebarOpen(true)}
                className="md:hidden relative flex items-center justify-center focus:outline-none"
                aria-label="Open Sidebar"
              >
                <div className="rounded-full transition-all">
                  <ThemedAvatar
                    theme={userTheme}
                    xp={userXP}
                    size="lg"
                  />
                </div>
                <div className={`absolute bottom-0 right-0 ${getThemeColor()} rounded-full w-6 h-6 flex items-center justify-center border border-slate-800`}>
                  <Menu className="h-4 w-4" />
                </div>
              </button>
              
              <Link href="/" className="text-xl font-bold hover:text-blue-300 transition">
                Spaced Recall
              </Link>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-4">
              {user && navLinks.slice(1, 7).map((link, index) => (
                link.children ? (
                  <div 
                    key={index} 
                    className="relative group"
                    onMouseEnter={() => setActiveDropdown(link.label)}
                    onMouseLeave={() => setActiveDropdown(null)}
                  >
                    <button 
                      className="px-3 py-2 rounded-md text-sm font-medium text-slate-200 hover:text-blue-300 transition flex items-center"
                    >
                      {link.label}
                      <ChevronDown className={`ml-1 h-4 w-4 transition-transform duration-200 ${activeDropdown === link.label ? 'rotate-180' : ''}`} />
                    </button>
                    <div 
                      className={`
                        absolute left-0 mt-0 w-56 rounded-md shadow-lg bg-slate-800 ring-1 ring-black ring-opacity-5
                        transition-all duration-200 origin-top-left
                        ${activeDropdown === link.label ? 'opacity-100 visible translate-y-0' : 'opacity-0 invisible -translate-y-2'}
                      `}
                    >
                      {/* Add a pseudo-element to cover the gap */}
                      <div className="absolute h-2 w-full -top-2"></div>
                      <div className="py-1">
                        {link.children.map((childLink, childIndex) => (
                          childLink.type === "separator" ? (
                            <div key={childIndex} className="h-px bg-slate-700 my-1" />
                          ) : childLink.children ? (
                            <div key={childIndex} className="relative">
                              <div className="group/menu relative">
                                <button
                                  className="flex items-center w-full px-4 py-2 text-left text-sm text-slate-200 hover:bg-slate-700"
                                  onMouseEnter={e => e.stopPropagation()}
                                >
                                  {childLink.icon && <span className="mr-2">{childLink.icon}</span>}
                                  {childLink.label}
                                  <ChevronDown className="ml-1 h-3 w-3" />
                                </button>
                                <div className="absolute left-full top-0 mt-0 w-48 rounded-md shadow-lg bg-slate-800 ring-1 ring-black ring-opacity-5 opacity-0 invisible group-hover/menu:opacity-100 group-hover/menu:visible transition-all duration-200 z-50">
                                  <div className="py-1">
                                    {childLink.children.map((subLink, subIndex) => (
                                      <button
                                        key={subIndex}
                                        onClick={() => handleNavigation(subLink.href)}
                                        className="block w-full px-4 py-2 text-left text-sm text-slate-200 hover:bg-slate-700"
                                      >
                                        <div className="flex items-center">
                                          {subLink.icon && <span className="mr-2">{subLink.icon}</span>}
                                          {subLink.label}
                                        </div>
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <button
                              key={childIndex}
                              onClick={() => handleNavigation(childLink.href)}
                              className="block w-full px-4 py-2 text-left text-sm text-slate-200 hover:bg-slate-700"
                            >
                              <div className="flex items-center">
                                {childLink.icon && <span className="mr-2">{childLink.icon}</span>}
                                {childLink.label}
                              </div>
                            </button>
                          )
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <Link
                    key={index}
                    href={link.href}
                    className={`px-3 py-2 rounded-md text-sm font-medium transition ${link.label === 'Pathways' ? 'text-blue-400 font-bold bg-slate-700/60' : 'text-slate-200 hover:text-blue-300'}`}
                  >
                    {link.label}
                  </Link>
                )
              ))}
              
              {user ? (
                <div className="flex items-center gap-3">
                  <Link
                    href="/dashboard/profile"
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

      {/* Mobile luxury sidebar (left sheet) */}
      <div className="md:hidden">
        <ContentSidebarMobile
          open={sidebarOpen}
          onOpenChange={setSidebarOpen}
          tree={contentTree || { rootItems: [], itemsById: {} }}
          currentItemId={currentItemId}
          onCreateItem={handleCreateItem}
          onDeleteItem={handleDeleteItem}
        />
      </div>
    </>
  );
}