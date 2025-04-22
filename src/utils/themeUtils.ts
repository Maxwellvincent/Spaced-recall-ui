import { themeConfig, type ThemeConfig, type Avatar } from "@/config/themeConfig";

export interface Avatar {
  name: string;
  imageUrl: string;
  requiredLevel: number;
}

export interface ThemeLevel {
  name: string;
  requiredXp: number;
  color: string;
}

export interface ThemeConfig {
  name: string;
  description: string;
  avatars: Avatar[];
  levels: ThemeLevel[];
  classes: {
    card: string;
    badge: string;
    text: string;
    border: string;
    progressBar: string;
  };
}

const themes: Record<string, ThemeConfig> = {
  classic: {
    name: "Classic",
    description: "The original spaced recall theme",
    avatars: [
      {
        name: "Novice Scholar",
        imageUrl: "/avatars/classic/novice.svg",
        requiredLevel: 0
      },
      {
        name: "Apprentice Scholar",
        imageUrl: "/avatars/classic/apprentice.svg",
        requiredLevel: 5
      },
      {
        name: "Master Scholar",
        imageUrl: "/avatars/classic/master.svg",
        requiredLevel: 10
      }
    ],
    levels: [
      { name: "Beginner", requiredXp: 0, color: "bg-gray-500" },
      { name: "Novice", requiredXp: 100, color: "bg-blue-500" },
      { name: "Intermediate", requiredXp: 300, color: "bg-green-500" },
      { name: "Advanced", requiredXp: 600, color: "bg-yellow-500" },
      { name: "Expert", requiredXp: 1000, color: "bg-purple-500" },
      { name: "Master", requiredXp: 1500, color: "bg-red-500" }
    ],
    classes: {
      card: "bg-white shadow-md",
      badge: "bg-blue-100 text-blue-800",
      text: "text-blue-800",
      border: "border-blue-200",
      progressBar: "bg-blue-500"
    }
  },
  nature: {
    name: "Nature",
    description: "A nature-inspired learning journey",
    avatars: [
      {
        name: "Seedling",
        imageUrl: "/avatars/nature/seedling.svg",
        requiredLevel: 0
      },
      {
        name: "Sapling",
        imageUrl: "/avatars/nature/sapling.svg",
        requiredLevel: 5
      },
      {
        name: "Mighty Oak",
        imageUrl: "/avatars/nature/oak.svg",
        requiredLevel: 10
      }
    ],
    levels: [
      { name: "Seed", requiredXp: 0, color: "bg-emerald-500" },
      { name: "Sprout", requiredXp: 100, color: "bg-green-500" },
      { name: "Sapling", requiredXp: 300, color: "bg-lime-500" },
      { name: "Young Tree", requiredXp: 600, color: "bg-teal-500" },
      { name: "Mature Tree", requiredXp: 1000, color: "bg-cyan-500" },
      { name: "Ancient Tree", requiredXp: 1500, color: "bg-blue-500" }
    ],
    classes: {
      card: "bg-emerald-50 shadow-md",
      badge: "bg-emerald-100 text-emerald-800",
      text: "text-emerald-800",
      border: "border-emerald-200",
      progressBar: "bg-emerald-500"
    }
  },
  dbz: {
    name: "Dragon Ball Z",
    description: "Power up and reach new levels of mastery",
    avatars: [
      {
        name: "Goku (Base)",
        imageUrl: "/avatars/dbz/kid-goku.svg",
        requiredLevel: 0
      },
      {
        name: "Super Saiyan Goku",
        imageUrl: "/avatars/dbz/goku.svg",
        requiredLevel: 5
      },
      {
        name: "Super Saiyan Blue",
        imageUrl: "/avatars/dbz/ssj.svg",
        requiredLevel: 10
      },
      {
        name: "Ultra Instinct",
        imageUrl: "/avatars/dbz/ui.svg",
        requiredLevel: 15
      }
    ],
    levels: [
      { name: "Saiyan Warrior", requiredXp: 0, color: "#FF6B6B" },
      { name: "Super Saiyan", requiredXp: 100, color: "#FFD93D" },
      { name: "Super Saiyan 2", requiredXp: 300, color: "#4D96FF" },
      { name: "Super Saiyan 3", requiredXp: 600, color: "#6BCB77" },
      { name: "Super Saiyan God", requiredXp: 1000, color: "#FF6B6B" },
      { name: "Super Saiyan Blue", requiredXp: 1500, color: "#4D96FF" },
      { name: "Ultra Instinct", requiredXp: 2000, color: "#C8B6E2" }
    ],
    classes: {
      card: "bg-slate-800 shadow-lg",
      badge: "bg-blue-100 text-blue-800",
      text: "text-white",
      border: "border-blue-500",
      progressBar: "bg-blue-500"
    }
  },
  hogwarts: {
    name: "Harry Potter",
    description: "Master the magical arts at Hogwarts",
    avatars: [
      {
        name: "First Year Student",
        imageUrl: "/avatars/hp/first-year.svg",
        requiredLevel: 0
      },
      {
        name: "Prefect",
        imageUrl: "/avatars/hp/prefect.svg",
        requiredLevel: 5
      },
      {
        name: "Head Student",
        imageUrl: "/avatars/hp/head-student.svg",
        requiredLevel: 10
      },
      {
        name: "Master Wizard",
        imageUrl: "/avatars/hp/master.svg",
        requiredLevel: 15
      }
    ],
    levels: [
      { name: "First Year", requiredXp: 0, color: "#9CA3AF" },
      { name: "Second Year", requiredXp: 100, color: "#60A5FA" },
      { name: "Third Year", requiredXp: 300, color: "#34D399" },
      { name: "Fourth Year", requiredXp: 600, color: "#FBBF24" },
      { name: "Fifth Year", requiredXp: 1000, color: "#EC4899" },
      { name: "Sixth Year", requiredXp: 1500, color: "#8B5CF6" },
      { name: "Seventh Year", requiredXp: 2000, color: "#F43F5E" }
    ],
    classes: {
      card: "bg-stone-800 shadow-lg",
      badge: "bg-amber-100 text-amber-800",
      text: "text-amber-50",
      border: "border-amber-500",
      progressBar: "bg-amber-500"
    }
  },
  naruto: {
    name: "Naruto",
    description: "Follow the ninja way and become Hokage",
    avatars: [
      {
        name: "Academy Student",
        imageUrl: "/avatars/naruto/kid.svg",
        requiredLevel: 0
      },
      {
        name: "Genin",
        imageUrl: "/avatars/naruto/genin.svg",
        requiredLevel: 5
      },
      {
        name: "Sage Mode",
        imageUrl: "/avatars/naruto/sage.svg",
        requiredLevel: 10
      },
      {
        name: "Six Paths",
        imageUrl: "/avatars/naruto/sixpaths.svg",
        requiredLevel: 15
      }
    ],
    levels: [
      { name: "Academy Student", requiredXp: 0, color: "#4B5563" },
      { name: "Genin", requiredXp: 100, color: "#2563EB" },
      { name: "Chunin", requiredXp: 300, color: "#059669" },
      { name: "Jonin", requiredXp: 600, color: "#9333EA" },
      { name: "ANBU", requiredXp: 1000, color: "#DC2626" },
      { name: "Sage", requiredXp: 1500, color: "#EA580C" },
      { name: "Hokage", requiredXp: 2000, color: "#F59E0B" }
    ],
    classes: {
      card: "bg-orange-900 shadow-lg",
      badge: "bg-orange-100 text-orange-800",
      text: "text-orange-50",
      border: "border-orange-500",
      progressBar: "bg-orange-500"
    }
  }
};

export function getThemeConfig(theme: string): ThemeConfig {
  return themes[theme] || themes.classic;
}

export function getCurrentAvatar(theme: string, level: number): Avatar {
  const config = getThemeConfig(theme);
  return [...config.avatars]
    .reverse()
    .find(avatar => level >= avatar.requiredLevel) || config.avatars[0];
}

export function getCurrentLevel(theme: string, xp: number): string {
  const config = getThemeConfig(theme);
  const level = [...config.levels]
    .reverse()
    .find(level => xp >= level.requiredXp);
  return level?.name || config.levels[0].name;
}

export function getNextLevel(theme: string, xp: number): { 
  name: string;
  requiredXp: number;
  progress: number;
} {
  const config = getThemeConfig(theme);
  const currentLevelIndex = config.levels.findIndex(
    (level, index, levels) => {
      const nextLevel = levels[index + 1];
      return !nextLevel || xp < nextLevel.requiredXp;
    }
  );
  
  const currentLevel = config.levels[currentLevelIndex];
  const nextLevel = config.levels[currentLevelIndex + 1];
  
  if (!nextLevel) {
    return {
      name: currentLevel.name,
      requiredXp: currentLevel.requiredXp,
      progress: 100
    };
  }
  
  const xpForCurrentLevel = xp - currentLevel.requiredXp;
  const xpRequiredForNextLevel = nextLevel.requiredXp - currentLevel.requiredXp;
  const progress = (xpForCurrentLevel / xpRequiredForNextLevel) * 100;
  
  return {
    name: nextLevel.name,
    requiredXp: nextLevel.requiredXp,
    progress: Math.min(Math.max(progress, 0), 100)
  };
}

export function getProgressBarClass(theme: string): string {
  return getThemeConfig(theme).classes.progressBar;
}

export function getThemeClasses(theme: string): ThemeConfig["classes"] {
  return getThemeConfig(theme).classes;
} 