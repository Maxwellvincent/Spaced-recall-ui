import { type } from "os";

export interface Avatar {
  level: number;
  name: string;
  image: string;
  description?: string;
}

export interface ThemeConfig {
  label: string;
  description: string;
  progressBarClass: string;
  cardClass: string;
  badgeClass: string;
  textClass: string;
  borderClass: string;
  avatars: Avatar[];
  ranks: string[];
  xpTiers: {
    [key: number]: {
      name: string;
      xpRequired: number;
    };
  };
}

export type ThemeConfigMap = {
  [key: string]: ThemeConfig;
};

export const themeConfig: ThemeConfigMap = {
  dbz: {
    label: "Dragon Ball Z",
    description: "Power up like a Saiyan warrior!",
    progressBarClass: "bg-gradient-to-r from-yellow-400 to-red-500",
    cardClass: "bg-yellow-500/10 border-yellow-500/20",
    badgeClass: "bg-yellow-500/20 text-yellow-400",
    textClass: "text-yellow-400",
    borderClass: "border-yellow-500",
    ranks: ["Earthling", "Saiyan", "Super Saiyan", "Super Saiyan 2", "Super Saiyan 3", "Super Saiyan God"],
    avatars: [
      { level: 1, name: "Kid Goku", image: "/avatars/dbz/kid-goku.png", description: "Starting your journey" },
      { level: 5, name: "Goku", image: "/avatars/dbz/goku.png", description: "Mastering the basics" },
      { level: 10, name: "Super Saiyan", image: "/avatars/dbz/ssj.png", description: "Breaking your limits" },
      { level: 20, name: "Ultra Instinct", image: "/avatars/dbz/ui.png", description: "Achieved mastery" }
    ],
    xpTiers: {
      0: { name: "Earthling", xpRequired: 0 },
      100: { name: "Saiyan", xpRequired: 100 },
      500: { name: "Super Saiyan", xpRequired: 500 },
      1000: { name: "Super Saiyan 2", xpRequired: 1000 },
      2000: { name: "Super Saiyan 3", xpRequired: 2000 },
      5000: { name: "Super Saiyan God", xpRequired: 5000 }
    }
  },
  naruto: {
    label: "Naruto",
    description: "Follow the ninja way to become Hokage!",
    progressBarClass: "bg-gradient-to-r from-orange-400 to-yellow-500",
    cardClass: "bg-orange-500/10 border-orange-500/20",
    badgeClass: "bg-orange-500/20 text-orange-400",
    textClass: "text-orange-400",
    borderClass: "border-orange-500",
    ranks: ["Genin", "Chunin", "Jonin", "ANBU", "Kage", "Hokage"],
    avatars: [
      { level: 1, name: "Academy Student", image: "/avatars/naruto/kid.png", description: "Learning the basics" },
      { level: 5, name: "Genin", image: "/avatars/naruto/genin.png", description: "Beginning ninja" },
      { level: 10, name: "Sage Mode", image: "/avatars/naruto/sage.png", description: "Mastering nature energy" },
      { level: 20, name: "Six Paths", image: "/avatars/naruto/sixpaths.png", description: "Legendary power" }
    ],
    xpTiers: {
      0: { name: "Academy Student", xpRequired: 0 },
      100: { name: "Genin", xpRequired: 100 },
      500: { name: "Chunin", xpRequired: 500 },
      1000: { name: "Jonin", xpRequired: 1000 },
      2000: { name: "ANBU", xpRequired: 2000 },
      5000: { name: "Hokage", xpRequired: 5000 }
    }
  },
  hogwarts: {
    label: "Hogwarts",
    description: "Master the magical arts at Hogwarts School of Witchcraft and Wizardry",
    progressBarClass: "bg-gradient-to-r from-purple-400 to-purple-600",
    cardClass: "bg-purple-500/10 border-purple-500/20",
    badgeClass: "bg-purple-500/20 text-purple-400",
    textClass: "text-purple-400",
    borderClass: "border-purple-500",
    ranks: ["First Year", "Second Year", "Third Year", "Fourth Year", "Fifth Year", "Sixth Year", "Seventh Year", "Master Wizard"],
    avatars: [
      { level: 1, name: "First Year", image: "/avatars/hogwarts/first-year.png", description: "Beginning your magical journey" },
      { level: 5, name: "Prefect", image: "/avatars/hogwarts/prefect.png", description: "Leading by example" },
      { level: 10, name: "Head Student", image: "/avatars/hogwarts/head-student.png", description: "Mastering advanced magic" },
      { level: 20, name: "Master Wizard", image: "/avatars/hogwarts/master.png", description: "Achieved magical mastery" }
    ],
    xpTiers: {
      0: { name: "First Year", xpRequired: 0 },
      100: { name: "Second Year", xpRequired: 100 },
      300: { name: "Third Year", xpRequired: 300 },
      600: { name: "Fourth Year", xpRequired: 600 },
      1000: { name: "Fifth Year", xpRequired: 1000 },
      1500: { name: "Sixth Year", xpRequired: 1500 },
      2000: { name: "Seventh Year", xpRequired: 2000 },
      5000: { name: "Master Wizard", xpRequired: 5000 }
    }
  },
  classic: {
    label: "Classic",
    description: "Traditional progression system with classic ranks",
    progressBarClass: "bg-gradient-to-r from-blue-400 to-blue-600",
    cardClass: "bg-blue-500/10 border-blue-500/20",
    badgeClass: "bg-blue-500/20 text-blue-400",
    textClass: "text-blue-400",
    borderClass: "border-blue-500",
    ranks: ["Beginner", "Intermediate", "Advanced", "Expert", "Master", "Grandmaster"],
    avatars: [
      { level: 1, name: "Beginner", image: "/avatars/classic/beginner.png", description: "Starting your journey" },
      { level: 5, name: "Intermediate", image: "/avatars/classic/intermediate.png", description: "Building knowledge" },
      { level: 10, name: "Advanced", image: "/avatars/classic/advanced.png", description: "Mastering concepts" },
      { level: 20, name: "Expert", image: "/avatars/classic/expert.png", description: "Achieved expertise" }
    ],
    xpTiers: {
      0: { name: "Beginner", xpRequired: 0 },
      100: { name: "Intermediate", xpRequired: 100 },
      500: { name: "Advanced", xpRequired: 500 },
      1000: { name: "Expert", xpRequired: 1000 },
      2000: { name: "Master", xpRequired: 2000 },
      5000: { name: "Grandmaster", xpRequired: 5000 }
    }
  }
}; 