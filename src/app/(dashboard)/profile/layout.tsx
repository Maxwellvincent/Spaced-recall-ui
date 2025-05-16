"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { useTheme } from "@/contexts/theme-context";
import { User, Settings, Link2 } from "lucide-react";

export default function ProfileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { theme } = useTheme();

  // Navigation links for the profile sidebar
  const profileNavLinks = [
    { 
      href: "/profile", 
      label: "Profile", 
      icon: <User className="h-5 w-5" /> 
    },
    { 
      href: "/profile/integrations", 
      label: "Integrations", 
      icon: <Link2 className="h-5 w-5" /> 
    },
    { 
      href: "/profile/settings", 
      label: "Settings", 
      icon: <Settings className="h-5 w-5" /> 
    },
  ];

  // Get theme-specific color for the sidebar
  const getThemeColor = () => {
    switch (theme?.toLowerCase()) {
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

  // Check if a link is active (exact match or nested route)
  const isLinkActive = (href: string) => {
    // Exact match for profile page
    if (href === '/profile' && pathname === '/profile') {
      return true;
    }
    
    // For other pages, check if pathname starts with href
    if (href !== '/profile' && pathname.startsWith(href)) {
      return true;
    }
    
    return false;
  };

  return (
    <div className="container max-w-6xl mx-auto py-8 px-4">
      <div className="flex flex-col md:flex-row gap-6">
        {/* Sidebar for profile navigation */}
        <div className="md:w-64 flex-shrink-0">
          <div className="bg-slate-900/50 rounded-lg border border-slate-800 overflow-hidden">
            <div className="p-4 bg-slate-800">
              <h2 className="text-lg font-semibold">Profile Menu</h2>
            </div>
            <nav className="p-2">
              {profileNavLinks.map((link, index) => {
                const isActive = isLinkActive(link.href);
                return (
                  <Link
                    key={index}
                    href={link.href}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg text-base font-medium mb-1 transition-colors ${
                      isActive 
                        ? `${getThemeColor()} text-white` 
                        : 'text-slate-200 hover:bg-slate-800'
                    }`}
                  >
                    <div className={`${isActive ? 'bg-white/20' : 'bg-slate-700'} p-2 rounded-full`}>
                      {link.icon}
                    </div>
                    {link.label}
                  </Link>
                );
              })}
            </nav>
          </div>
        </div>
        
        {/* Main content area */}
        <div className="flex-grow">
          {children}
        </div>
      </div>
    </div>
  );
} 