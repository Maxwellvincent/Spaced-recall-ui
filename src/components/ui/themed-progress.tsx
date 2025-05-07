import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface ThemedProgressProps {
  theme: string;
  progress: number;
  currentXP: number;
  neededXP: number;
  className?: string;
}

const themeStyles = {
  dbz: {
    container: "bg-yellow-950/30 border-2 border-yellow-600/30",
    bar: "bg-gradient-to-r from-yellow-500 via-orange-500 to-red-500",
    text: "text-yellow-400",
    aura: "shadow-[0_0_15px_rgba(234,179,8,0.3)]"
  },
  naruto: {
    container: "bg-orange-950/30 border-2 border-orange-600/30",
    bar: "bg-gradient-to-r from-blue-500 via-cyan-500 to-orange-500",
    text: "text-orange-400",
    aura: "shadow-[0_0_15px_rgba(249,115,22,0.3)]"
  },
  hogwarts: {
    container: "bg-purple-950/30 border-2 border-purple-600/30",
    bar: "bg-gradient-to-r from-purple-500 via-violet-500 to-fuchsia-500",
    text: "text-purple-400",
    aura: "shadow-[0_0_15px_rgba(168,85,247,0.3)]"
  },
  classic: {
    container: "bg-blue-950/30 border-2 border-blue-600/30",
    bar: "bg-gradient-to-r from-blue-500 to-cyan-500",
    text: "text-blue-400",
    aura: "shadow-[0_0_15px_rgba(59,130,246,0.3)]"
  }
};

const powerLevelEffects = {
  dbz: [
    { threshold: 0, effect: "🌟 Power Level Rising!" },
    { threshold: 5000, effect: "💪 Saiyan Power Unleashed!" },
    { threshold: 25000, effect: "⚡ Super Saiyan Awakened!" },
    { threshold: 100000, effect: "🔥 Super Saiyan 2 Achieved!" },
    { threshold: 250000, effect: "⚔️ Super Saiyan 3 Mastered!" },
    { threshold: 1000000, effect: "✨ Super Saiyan God Attained!" }
  ],
  naruto: [
    { threshold: 0, effect: "📚 Academy Training" },
    { threshold: 5000, effect: "🌀 Chakra Flowing" },
    { threshold: 25000, effect: "🍃 Nature Energy Mastered" },
    { threshold: 100000, effect: "🔮 Sage Mode Activated" },
    { threshold: 250000, effect: "⚡ Tailed Beast Power" },
    { threshold: 1000000, effect: "🌟 Six Paths Sage Mode" }
  ],
  hogwarts: [
    { threshold: 0, effect: "📖 First Spells" },
    { threshold: 5000, effect: "🪄 Magic Flowing" },
    { threshold: 25000, effect: "🎯 Spells Mastered" },
    { threshold: 100000, effect: "🔮 Advanced Magic" },
    { threshold: 250000, effect: "⚡ Powerful Wizard" },
    { threshold: 1000000, effect: "✨ Master of Magic" }
  ],
  classic: [
    { threshold: 0, effect: "📚 Learning" },
    { threshold: 5000, effect: "💡 Understanding" },
    { threshold: 25000, effect: "🎯 Mastering" },
    { threshold: 100000, effect: "⭐ Excelling" },
    { threshold: 250000, effect: "🏆 Expertise" },
    { threshold: 1000000, effect: "👑 Legendary" }
  ]
};

export function ThemedProgress({
  theme,
  progress,
  currentXP,
  neededXP,
  className
}: ThemedProgressProps) {
  const styles = themeStyles[theme as keyof typeof themeStyles] || themeStyles.classic;
  const effects = powerLevelEffects[theme as keyof typeof powerLevelEffects] || powerLevelEffects.classic;
  
  // Find current power level effect
  const currentEffect = [...effects].reverse().find(effect => currentXP >= effect.threshold);

  return (
    <div className={cn("w-full space-y-2", className)}>
      <div className="flex justify-between items-center">
        <div className={cn("text-sm font-medium", styles.text)}>
          {currentEffect?.effect}
        </div>
        <div className={cn("text-sm font-medium", styles.text)}>
          {currentXP.toLocaleString()} / {neededXP.toLocaleString()} XP
        </div>
      </div>
      
      <div className={cn("h-4 w-full rounded-full overflow-hidden", styles.container, styles.aura)}>
        <motion.div
          className={cn("h-full rounded-full", styles.bar)}
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        />
      </div>
    </div>
  );
} 