import { cn } from "@/lib/utils";
import Image from "next/image";
import { motion } from "framer-motion";
import { themeConfig } from "@/config/themeConfig";
import { useEffect, useState } from "react";

interface ThemedAvatarProps {
  theme: string;
  xp: number;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

// Default avatar stages as fallback - updated with correct image paths
const defaultAvatarStages = {
  dbz: [
    { threshold: 0, image: "/avatars/dbz/goku-base.svg", name: "Earthling", aura: "shadow-none" },
    { threshold: 5000, image: "/avatars/dbz/goku-base.svg", name: "Saiyan", aura: "shadow-[0_0_15px_rgba(234,179,8,0.3)]" },
    { threshold: 25000, image: "/avatars/dbz/goku-ssj.svg", name: "Super Saiyan", aura: "shadow-[0_0_25px_rgba(234,179,8,0.5)]" },
    { threshold: 100000, image: "/avatars/dbz/goku-ssj.svg", name: "Super Saiyan 2", aura: "shadow-[0_0_35px_rgba(234,179,8,0.7)]" },
    { threshold: 250000, image: "/avatars/dbz/goku-blue.svg", name: "Super Saiyan 3", aura: "shadow-[0_0_45px_rgba(234,179,8,0.8)]" },
    { threshold: 1000000, image: "/avatars/dbz/goku-ui.svg", name: "Ultra Instinct", aura: "shadow-[0_0_60px_rgba(234,179,8,1)]" }
  ],
  naruto: [
    { threshold: 0, image: "/avatars/naruto/academy.svg", name: "Academy Student", aura: "shadow-none" },
    { threshold: 100, image: "/avatars/naruto/genin.svg", name: "Genin", aura: "shadow-[0_0_15px_rgba(249,115,22,0.3)]" },
    { threshold: 500, image: "/avatars/naruto/chunin.svg", name: "Chunin", aura: "shadow-[0_0_25px_rgba(249,115,22,0.5)]" },
    { threshold: 1000, image: "/avatars/naruto/jonin.svg", name: "Jonin", aura: "shadow-[0_0_35px_rgba(249,115,22,0.7)]" },
    { threshold: 2000, image: "/avatars/naruto/jonin.svg", name: "ANBU", aura: "shadow-[0_0_45px_rgba(249,115,22,0.8)]" },
    { threshold: 5000, image: "/avatars/naruto/hokage.svg", name: "Hokage", aura: "shadow-[0_0_60px_rgba(249,115,22,1)]" }
  ],
  hogwarts: [
    { threshold: 0, image: "/avatars/hogwarts/first-year.svg", name: "First Year", aura: "shadow-none" },
    { threshold: 100, image: "/avatars/hogwarts/prefect.svg", name: "Second Year", aura: "shadow-[0_0_15px_rgba(168,85,247,0.3)]" },
    { threshold: 300, image: "/avatars/hogwarts/prefect.svg", name: "Third Year", aura: "shadow-[0_0_20px_rgba(168,85,247,0.4)]" },
    { threshold: 600, image: "/avatars/hogwarts/head-student.svg", name: "Fourth Year", aura: "shadow-[0_0_25px_rgba(168,85,247,0.5)]" },
    { threshold: 1000, image: "/avatars/hogwarts/head-student.svg", name: "Fifth Year", aura: "shadow-[0_0_30px_rgba(168,85,247,0.6)]" },
    { threshold: 1500, image: "/avatars/hogwarts/head-student.svg", name: "Sixth Year", aura: "shadow-[0_0_35px_rgba(168,85,247,0.7)]" },
    { threshold: 2000, image: "/avatars/hogwarts/master.svg", name: "Seventh Year", aura: "shadow-[0_0_40px_rgba(168,85,247,0.8)]" },
    { threshold: 5000, image: "/avatars/hogwarts/master.svg", name: "Master Wizard", aura: "shadow-[0_0_50px_rgba(168,85,247,1)]" }
  ],
  classic: [
    { threshold: 0, image: "/avatars/classic/novice.svg", name: "Beginner", aura: "shadow-none" },
    { threshold: 100, image: "/avatars/classic/novice.svg", name: "Intermediate", aura: "shadow-[0_0_15px_rgba(59,130,246,0.3)]" },
    { threshold: 500, image: "/avatars/classic/apprentice.svg", name: "Advanced", aura: "shadow-[0_0_25px_rgba(59,130,246,0.5)]" },
    { threshold: 1000, image: "/avatars/classic/apprentice.svg", name: "Expert", aura: "shadow-[0_0_35px_rgba(59,130,246,0.7)]" },
    { threshold: 2000, image: "/avatars/classic/master.svg", name: "Master", aura: "shadow-[0_0_45px_rgba(59,130,246,0.8)]" },
    { threshold: 5000, image: "/avatars/classic/master.svg", name: "Grandmaster", aura: "shadow-[0_0_60px_rgba(59,130,246,1)]" }
  ]
};

// Theme-specific background colors for avatar containers
const themeBackgroundColors = {
  dbz: "bg-yellow-900/50",
  naruto: "bg-orange-900/50",
  hogwarts: "bg-purple-900/50",
  classic: "bg-blue-900/50"
};

const sizeClasses = {
  sm: "w-12 h-12",
  md: "w-16 h-16",
  lg: "w-24 h-24",
  xl: "w-32 h-32"
};

// Create avatar stages based on themeConfig
function getAvatarStages(theme: string) {
  // If theme exists in themeConfig, sync with its xpTiers
  if (theme in themeConfig) {
    const config = themeConfig[theme];
    const stages = [];
    
    // Convert xpTiers to avatar stages
    const tiers = Object.entries(config.xpTiers)
      .sort(([a], [b]) => Number(a) - Number(b));
    
    for (let i = 0; i < tiers.length; i++) {
      const [, tier] = tiers[i];
      // Try to match avatar image with tier name, use default if no match
      const defaultStages = defaultAvatarStages[theme as keyof typeof defaultAvatarStages] || defaultAvatarStages.classic;
      const matchingStage = defaultStages.find(s => s.name === tier.name) || defaultStages[Math.min(i, defaultStages.length - 1)];
      
      stages.push({
        threshold: tier.xpRequired,
        image: matchingStage.image,
        name: tier.name,
        aura: matchingStage.aura
      });
    }
    
    return stages.length > 0 ? stages : defaultAvatarStages[theme as keyof typeof defaultAvatarStages] || defaultAvatarStages.classic;
  }
  
  return defaultAvatarStages[theme as keyof typeof defaultAvatarStages] || defaultAvatarStages.classic;
}

export function ThemedAvatar({
  theme,
  xp,
  size = "md",
  className
}: ThemedAvatarProps) {
  const [stages, setStages] = useState(defaultAvatarStages[theme as keyof typeof defaultAvatarStages] || defaultAvatarStages.classic);
  const bgColor = themeBackgroundColors[theme as keyof typeof themeBackgroundColors] || themeBackgroundColors.classic;
  
  useEffect(() => {
    // Update stages when theme changes
    setStages(getAvatarStages(theme));
  }, [theme]);
  
  // Find current avatar stage
  const currentStage = [...stages].reverse().find(stage => xp >= stage.threshold);
  
  if (!currentStage) return null;

  return (
    <motion.div
      className={cn(
        "relative rounded-full overflow-hidden",
        sizeClasses[size],
        currentStage.aura,
        bgColor,
        className
      )}
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div className="absolute inset-0 flex items-center justify-center">
        <Image
          src={currentStage.image}
          alt={currentStage.name}
          fill
          className="object-contain p-1"
          onError={(e) => {
            // Fallback if image fails to load
            const target = e.target as HTMLImageElement;
            target.style.display = 'none';
          }}
        />
        {/* Fallback text if image fails */}
        <span className="text-white text-xs font-bold z-10">
          {currentStage.name.charAt(0)}
        </span>
      </div>
      <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 p-1 text-xs text-center text-white/90 bg-black/30">
        {currentStage.name}
      </div>
    </motion.div>
  );
} 