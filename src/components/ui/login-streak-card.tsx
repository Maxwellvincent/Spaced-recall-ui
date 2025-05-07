import { Flame } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface LoginStreakCardProps {
  streak: number;
  highestStreak: number;
  theme: string;
  className?: string;
  variant?: "default" | "compact";
}

const themeStyles = {
  dbz: {
    container: "bg-yellow-950/30 border-2 border-yellow-600/30",
    title: "text-yellow-400",
    accent: "text-yellow-300",
    badge: "bg-yellow-500/20 text-yellow-300 border border-yellow-500/30",
    border: "border-yellow-500/30",
    gradient: "from-yellow-500/60 to-orange-500/60",
    icon: "text-yellow-400",
    streakName: "Power Login Streak"
  },
  naruto: {
    container: "bg-orange-950/30 border-2 border-orange-600/30",
    title: "text-orange-400",
    accent: "text-orange-300",
    badge: "bg-orange-500/20 text-orange-300 border border-orange-500/30",
    border: "border-orange-500/30",
    gradient: "from-orange-500/60 to-red-500/60",
    icon: "text-orange-400",
    streakName: "Ninja Login Streak"
  },
  hogwarts: {
    container: "bg-purple-950/30 border-2 border-purple-600/30",
    title: "text-purple-400",
    accent: "text-purple-300",
    badge: "bg-purple-500/20 text-purple-300 border border-purple-500/30",
    border: "border-purple-500/30",
    gradient: "from-purple-500/60 to-violet-500/60",
    icon: "text-purple-400",
    streakName: "Magical Login Streak"
  },
  classic: {
    container: "bg-blue-950/30 border-2 border-blue-600/30",
    title: "text-blue-400",
    accent: "text-blue-300",
    badge: "bg-blue-500/20 text-blue-300 border border-blue-500/30",
    border: "border-blue-500/30",
    gradient: "from-blue-500/60 to-cyan-500/60",
    icon: "text-blue-400",
    streakName: "Login Streak"
  }
};

// Milestone messages for login streaks
const streakMilestones = [
  { days: 3, message: "Getting started!" },
  { days: 7, message: "One week strong!" },
  { days: 14, message: "Two weeks dedicated!" },
  { days: 30, message: "Monthly commitment!" },
  { days: 60, message: "Incredible dedication!" },
  { days: 90, message: "Legendary consistency!" },
  { days: 180, message: "Unstoppable habit!" },
  { days: 365, message: "Yearly champion!" }
];

export function LoginStreakCard({ streak, highestStreak, theme, className, variant = "default" }: LoginStreakCardProps) {
  const styles = themeStyles[theme?.toLowerCase() as keyof typeof themeStyles] || themeStyles.classic;
  
  console.log("LoginStreakCard: Received props:", { streak, highestStreak, theme, variant });
  
  // Ensure streak values are numbers and at least 1 (never show 0)
  const safeStreak = typeof streak === 'number' && streak > 0 ? streak : 1;
  const safeHighestStreak = typeof highestStreak === 'number' && highestStreak > 0 ? highestStreak : 1;
  
  // Find next milestone
  const nextMilestone = streakMilestones.find(milestone => milestone.days > safeStreak) || streakMilestones[streakMilestones.length - 1];
  const prevMilestone = [...streakMilestones].reverse().find(milestone => milestone.days <= safeStreak) || { days: 0, message: "Just starting!" };
  
  // Calculate progress to next milestone
  const progress = nextMilestone.days === prevMilestone.days 
    ? 100 
    : Math.round(((safeStreak - prevMilestone.days) / (nextMilestone.days - prevMilestone.days)) * 100);

  // Compact variant for dashboard
  if (variant === "compact") {
    return (
      <div className={cn("rounded-lg p-3", styles.container, className)}>
        <div className="flex items-center justify-between">
          <div className={cn("text-sm font-medium flex items-center gap-1.5", styles.title)}>
            <Flame className={cn("h-4 w-4", styles.icon)} />
            <span>Login Streak</span>
          </div>
          
          <div className={cn("px-2 py-0.5 text-xs rounded-full", styles.badge)}>
            Best: {safeHighestStreak}
          </div>
        </div>
        
        <div className="flex items-center justify-between mt-2">
          <span className={cn("text-2xl font-bold", styles.accent)}>{safeStreak}</span>
          <div className="flex-1 mx-3">
            <div className="h-2 bg-slate-800/50 rounded-full overflow-hidden">
              <motion.div
                className={cn("h-full bg-gradient-to-r", styles.gradient)}
                style={{ width: `${progress}%` }}
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
          </div>
          <span className={cn("text-xs", styles.title)}>Next: {nextMilestone.days}</span>
        </div>
      </div>
    );
  }

  // Default full-sized variant
  return (
    <div className={cn("rounded-lg p-4", styles.container, className)}>
      <div className="flex items-center justify-between mb-3">
        <div className={cn("text-lg font-medium flex items-center gap-2", styles.title)}>
          <Flame className={cn("h-5 w-5", styles.icon)} />
          <span>{styles.streakName}</span>
        </div>
        
        <div className={cn("px-2 py-1 text-xs rounded-full", styles.badge)}>
          Best: {safeHighestStreak} days
        </div>
      </div>
      
      <div className="flex items-baseline justify-between mb-2">
        <span className={cn("text-3xl font-bold", styles.accent)}>{safeStreak}</span>
        <span className={cn("text-sm", styles.title)}>days</span>
      </div>
      
      {prevMilestone.days > 0 && (
        <div className={cn("text-sm mb-2", styles.accent)}>
          Milestone: {prevMilestone.days} days - {prevMilestone.message}
        </div>
      )}
      
      <div className="mb-1">
        <div className="flex justify-between text-xs mb-1">
          <span className={styles.title}>Progress to next milestone</span>
          <span className={styles.accent}>{progress}%</span>
        </div>
        <div className="h-2 bg-slate-800/50 rounded-full overflow-hidden">
          <motion.div
            className={cn("h-full bg-gradient-to-r", styles.gradient)}
            style={{ width: `${progress}%` }}
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
      </div>
      
      <div className={cn("text-xs mt-2", styles.title)}>
        Next milestone: {nextMilestone.days} days
      </div>
    </div>
  );
} 