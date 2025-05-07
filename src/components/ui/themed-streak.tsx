import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface ThemedStreakProps {
  theme: string;
  streak: number;
  highestStreak: number;
  className?: string;
}

const themeStyles = {
  dbz: {
    container: "bg-yellow-950/30 border-2 border-yellow-600/30",
    title: "text-yellow-400",
    accent: "text-yellow-300",
    badge: "bg-yellow-500/20 text-yellow-300 border border-yellow-500/30",
    border: "border-yellow-500/30",
    gradient: "from-yellow-500/60 to-orange-500/60",
    icon: "🔥",
    streakName: "Power Streak"
  },
  naruto: {
    container: "bg-orange-950/30 border-2 border-orange-600/30",
    title: "text-orange-400",
    accent: "text-orange-300",
    badge: "bg-orange-500/20 text-orange-300 border border-orange-500/30",
    border: "border-orange-500/30",
    gradient: "from-orange-500/60 to-red-500/60",
    icon: "🍃",
    streakName: "Ninja Way"
  },
  hogwarts: {
    container: "bg-purple-950/30 border-2 border-purple-600/30",
    title: "text-purple-400",
    accent: "text-purple-300",
    badge: "bg-purple-500/20 text-purple-300 border border-purple-500/30",
    border: "border-purple-500/30",
    gradient: "from-purple-500/60 to-violet-500/60",
    icon: "✨",
    streakName: "Magical Streak"
  },
  classic: {
    container: "bg-blue-950/30 border-2 border-blue-600/30",
    title: "text-blue-400",
    accent: "text-blue-300",
    badge: "bg-blue-500/20 text-blue-300 border border-blue-500/30",
    border: "border-blue-500/30",
    gradient: "from-blue-500/60 to-cyan-500/60",
    icon: "📚",
    streakName: "Study Streak"
  }
};

const streakMilestones = [
  { days: 3, xp: 50, message: "Warming up!" },
  { days: 7, xp: 100, message: "One week strong!" },
  { days: 14, xp: 250, message: "Fortnight focus!" },
  { days: 30, xp: 500, message: "Monthly mastery!" },
  { days: 60, xp: 1000, message: "Incredible discipline!" },
  { days: 90, xp: 2500, message: "Legendary commitment!" },
  { days: 180, xp: 5000, message: "Unstoppable scholar!" },
  { days: 365, xp: 10000, message: "Yearly champion!" }
];

// Theme-specific milestone messages
const themeMilestoneMessages = {
  dbz: {
    3: "Ki is building!",
    7: "Saiyan strength growing!",
    14: "Power level rising fast!",
    30: "Super Saiyan potential!",
    60: "Achieved Super Saiyan!",
    90: "Super Saiyan 2 unlocked!",
    180: "Super Saiyan 3 mastered!",
    365: "Ultra Instinct activated!"
  },
  naruto: {
    3: "Chakra flowing!",
    7: "Shadow Clone mastered!",
    14: "Rasengan formed!",
    30: "Sage training begun!",
    60: "Sage Mode achieved!",
    90: "Tailed Beast power unlocked!",
    180: "Six Paths awakened!",
    365: "Hokage level reached!"
  },
  hogwarts: {
    3: "First spells mastered!",
    7: "House points earned!",
    14: "Potion brewing success!",
    30: "Quidditch team member!",
    60: "Prefect status achieved!",
    90: "Head student nominated!",
    180: "Advanced magic mastered!",
    365: "Order of Merlin awarded!"
  },
  classic: {
    3: "Habit forming!",
    7: "Weekly goal achieved!",
    14: "Solid foundation built!",
    30: "Monthly excellence!",
    60: "Impressive consistency!",
    90: "Expert level discipline!",
    180: "Half-year mastery!",
    365: "Yearly champion!"
  }
};

export function ThemedStreak({
  theme,
  streak,
  highestStreak,
  className
}: ThemedStreakProps) {
  const styles = themeStyles[theme as keyof typeof themeStyles] || themeStyles.classic;
  
  // Find next milestone
  const nextMilestone = streakMilestones.find(milestone => milestone.days > streak) || streakMilestones[streakMilestones.length - 1];
  const prevMilestone = [...streakMilestones].reverse().find(milestone => milestone.days <= streak) || { days: 0, xp: 0, message: "Just starting!" };
  
  // Calculate progress to next milestone
  const progress = nextMilestone.days === prevMilestone.days 
    ? 100 
    : Math.round(((streak - prevMilestone.days) / (nextMilestone.days - prevMilestone.days)) * 100);
  
  // Get theme-specific milestone message
  const themeMessages = themeMilestoneMessages[theme as keyof typeof themeMilestoneMessages] || themeMilestoneMessages.classic;
  const currentMilestoneMessage = prevMilestone.days > 0 && themeMessages[prevMilestone.days as keyof typeof themeMessages] 
    ? themeMessages[prevMilestone.days as keyof typeof themeMessages]
    : prevMilestone.message;

  return (
    <motion.div
      className={cn("rounded-lg p-4", styles.container, className)}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex items-center justify-between mb-4">
        <div className={cn("text-xl font-bold flex items-center gap-2", styles.title)}>
          <span>{styles.icon}</span>
          <span>{styles.streakName}: <span className={styles.accent}>{streak}</span> days</span>
        </div>
        
        <div className={cn("px-3 py-1 rounded-full text-sm", styles.badge)}>
          Best: {highestStreak} days
        </div>
      </div>
      
      {prevMilestone.days > 0 && (
        <motion.div 
          className={cn("p-3 rounded-lg bg-gradient-to-r mb-4", styles.gradient)}
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xl">🏆</span>
              <span className="font-medium text-white">
                {prevMilestone.days} Day Milestone Reached!
              </span>
            </div>
            <div className="text-white/90 text-sm">
              +{prevMilestone.xp} XP
            </div>
          </div>
          <p className="text-white/80 text-sm mt-1">
            {currentMilestoneMessage}
          </p>
        </motion.div>
      )}
      
      <div className="mb-2 flex justify-between items-baseline">
        <div className={cn("text-sm font-medium", styles.title)}>
          Next milestone: {nextMilestone.days} days
        </div>
        <div className={cn("text-xs", styles.accent)}>
          {streak} / {nextMilestone.days} days ({progress}%)
        </div>
      </div>
      
      <div className={cn("h-2 w-full rounded-full bg-black/20 overflow-hidden mb-4", styles.border)}>
        <motion.div
          className={cn("h-full bg-gradient-to-r", styles.gradient)}
          style={{ width: `${progress}%` }}
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        />
      </div>
      
      <div className={cn("text-sm", styles.accent)}>
        <div className="flex justify-between items-center border-t border-dashed pt-2" style={{ borderColor: `rgba(255,255,255,0.1)` }}>
          <span>Reward at {nextMilestone.days} days:</span>
          <span className="font-semibold">+{nextMilestone.xp} XP</span>
        </div>
      </div>
    </motion.div>
  );
} 