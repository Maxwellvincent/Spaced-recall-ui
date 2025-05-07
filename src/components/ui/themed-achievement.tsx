import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface ThemedAchievementProps {
  theme: string;
  title: string;
  description: string;
  icon: string;
  progress?: number;
  isUnlocked?: boolean;
  className?: string;
}

const themeStyles = {
  dbz: {
    container: {
      locked: "bg-yellow-950/20 border-2 border-yellow-800/20 opacity-70",
      unlocked: "bg-gradient-to-br from-yellow-900/40 to-orange-800/40 border-2 border-yellow-500/40 shadow-[0_0_20px_rgba(234,179,8,0.25)]"
    },
    title: {
      locked: "text-yellow-600",
      unlocked: "text-yellow-400"
    },
    description: {
      locked: "text-yellow-700/60",
      unlocked: "text-yellow-300/80"
    },
    badge: {
      locked: "bg-yellow-800/30 text-yellow-600",
      unlocked: "bg-yellow-500/40 text-yellow-300"
    },
    progress: {
      bg: "bg-yellow-900/50",
      fill: "bg-gradient-to-r from-yellow-600 to-orange-500"
    }
  },
  naruto: {
    container: {
      locked: "bg-orange-950/20 border-2 border-orange-800/20 opacity-70",
      unlocked: "bg-gradient-to-br from-orange-900/40 to-red-800/40 border-2 border-orange-500/40 shadow-[0_0_20px_rgba(249,115,22,0.25)]"
    },
    title: {
      locked: "text-orange-600",
      unlocked: "text-orange-400"
    },
    description: {
      locked: "text-orange-700/60",
      unlocked: "text-orange-300/80"
    },
    badge: {
      locked: "bg-orange-800/30 text-orange-600",
      unlocked: "bg-orange-500/40 text-orange-300"
    },
    progress: {
      bg: "bg-orange-900/50",
      fill: "bg-gradient-to-r from-orange-600 to-red-500"
    }
  },
  hogwarts: {
    container: {
      locked: "bg-purple-950/20 border-2 border-purple-800/20 opacity-70",
      unlocked: "bg-gradient-to-br from-purple-900/40 to-indigo-800/40 border-2 border-purple-500/40 shadow-[0_0_20px_rgba(168,85,247,0.25)]"
    },
    title: {
      locked: "text-purple-600",
      unlocked: "text-purple-400"
    },
    description: {
      locked: "text-purple-700/60",
      unlocked: "text-purple-300/80"
    },
    badge: {
      locked: "bg-purple-800/30 text-purple-600",
      unlocked: "bg-purple-500/40 text-purple-300"
    },
    progress: {
      bg: "bg-purple-900/50",
      fill: "bg-gradient-to-r from-purple-600 to-violet-500"
    }
  },
  classic: {
    container: {
      locked: "bg-blue-950/20 border-2 border-blue-800/20 opacity-70",
      unlocked: "bg-gradient-to-br from-blue-900/40 to-cyan-800/40 border-2 border-blue-500/40 shadow-[0_0_20px_rgba(59,130,246,0.25)]"
    },
    title: {
      locked: "text-blue-600",
      unlocked: "text-blue-400"
    },
    description: {
      locked: "text-blue-700/60",
      unlocked: "text-blue-300/80"
    },
    badge: {
      locked: "bg-blue-800/30 text-blue-600",
      unlocked: "bg-blue-500/40 text-blue-300"
    },
    progress: {
      bg: "bg-blue-900/50",
      fill: "bg-gradient-to-r from-blue-600 to-cyan-500"
    }
  }
};

export function ThemedAchievement({
  theme,
  title,
  description,
  icon,
  progress = 0,
  isUnlocked = false,
  className
}: ThemedAchievementProps) {
  const styles = themeStyles[theme as keyof typeof themeStyles] || themeStyles.classic;
  const state = isUnlocked ? 'unlocked' : 'locked';
  
  return (
    <motion.div
      className={cn(
        "rounded-lg p-4",
        styles.container[state as keyof typeof styles.container],
        className
      )}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      whileHover={{ scale: 1.02 }}
    >
      <div className="flex items-start gap-3">
        <div className={cn(
          "flex items-center justify-center w-10 h-10 rounded-full text-xl",
          styles.badge[state as keyof typeof styles.badge]
        )}>
          {icon}
        </div>
        
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <h3 className={cn(
              "font-semibold",
              styles.title[state as keyof typeof styles.title]
            )}>
              {title}
            </h3>
            
            {isUnlocked && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className={cn(
                  "px-2 py-0.5 text-xs rounded-full",
                  styles.badge.unlocked
                )}
              >
                Unlocked!
              </motion.div>
            )}
          </div>
          
          <p className={cn(
            "text-sm mt-1",
            styles.description[state as keyof typeof styles.description]
          )}>
            {description}
          </p>
          
          {!isUnlocked && progress > 0 && progress < 100 && (
            <div className="mt-2">
              <div className={cn("h-2 w-full rounded-full overflow-hidden", styles.progress.bg)}>
                <motion.div
                  className={styles.progress.fill}
                  style={{ width: `${progress}%`, height: '100%', borderRadius: '9999px' }}
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                />
              </div>
              <p className={cn(
                "text-xs mt-1 text-right",
                styles.description[state as keyof typeof styles.description]
              )}>
                {progress}% Complete
              </p>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
} 