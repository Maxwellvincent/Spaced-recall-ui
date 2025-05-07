import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";

interface ThemedMilestoneProps {
  theme: string;
  milestone: {
    title: string;
    description: string;
    xpAwarded: number;
    type: 'level' | 'streak' | 'mastery' | 'achievement';
  };
  open: boolean;
  onClose: () => void;
  className?: string;
}

const themeStyles = {
  dbz: {
    container: "bg-gradient-to-br from-yellow-950 to-orange-900 border-4 border-yellow-500",
    title: "text-yellow-300",
    description: "text-yellow-200/90",
    xp: "bg-yellow-500/30 text-yellow-300 border border-yellow-400/40",
    confetti: ["bg-yellow-300", "bg-orange-300", "bg-red-300"],
    icon: {
      level: "⚡",
      streak: "🔥",
      mastery: "👊",
      achievement: "🏆"
    },
    celebration: {
      level: "Power Level Increased!",
      streak: "Training Streak Extended!",
      mastery: "New Technique Mastered!",
      achievement: "Saiyan Pride Achieved!"
    }
  },
  naruto: {
    container: "bg-gradient-to-br from-orange-950 to-red-900 border-4 border-orange-500",
    title: "text-orange-300",
    description: "text-orange-200/90",
    xp: "bg-orange-500/30 text-orange-300 border border-orange-400/40",
    confetti: ["bg-orange-300", "bg-blue-300", "bg-red-300"],
    icon: {
      level: "🍃",
      streak: "🔄",
      mastery: "👊",
      achievement: "📜"
    },
    celebration: {
      level: "Chakra Increased!",
      streak: "Ninja Way Extended!",
      mastery: "New Jutsu Mastered!",
      achievement: "Way of the Ninja!"
    }
  },
  hogwarts: {
    container: "bg-gradient-to-br from-purple-950 to-indigo-900 border-4 border-purple-500",
    title: "text-purple-300",
    description: "text-purple-200/90",
    xp: "bg-purple-500/30 text-purple-300 border border-purple-400/40",
    confetti: ["bg-purple-300", "bg-violet-300", "bg-indigo-300"],
    icon: {
      level: "✨",
      streak: "🪄",
      mastery: "🔮",
      achievement: "📚"
    },
    celebration: {
      level: "Magical Power Increased!",
      streak: "Magical Studies Continued!",
      mastery: "New Spell Mastered!",
      achievement: "House Points Earned!"
    }
  },
  classic: {
    container: "bg-gradient-to-br from-blue-950 to-cyan-900 border-4 border-blue-500",
    title: "text-blue-300",
    description: "text-blue-200/90",
    xp: "bg-blue-500/30 text-blue-300 border border-blue-400/40",
    confetti: ["bg-blue-300", "bg-cyan-300", "bg-indigo-300"],
    icon: {
      level: "📚",
      streak: "⏱️",
      mastery: "🧠",
      achievement: "🏆"
    },
    celebration: {
      level: "Level Up!",
      streak: "Streak Extended!",
      mastery: "Knowledge Mastered!",
      achievement: "Achievement Unlocked!"
    }
  }
};

// Generate confetti for celebration
const Confetti = ({ colors }: { colors: string[] }) => {
  const confettiItems = Array.from({ length: 50 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: -10 - Math.random() * 100,
    size: 5 + Math.random() * 10,
    color: colors[Math.floor(Math.random() * colors.length)],
    rotation: Math.random() * 360,
    delay: Math.random() * 0.5
  }));

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {confettiItems.map((item) => (
        <motion.div
          key={item.id}
          className={cn("absolute rounded-sm opacity-70", item.color)}
          style={{
            width: item.size,
            height: item.size,
            left: `${item.x}%`,
            top: `${item.y}%`,
            rotate: `${item.rotation}deg`
          }}
          animate={{
            y: "120vh",
            rotate: `${item.rotation + 360 * 2}deg`,
            opacity: [0.7, 0.7, 0]
          }}
          transition={{
            duration: 4 + Math.random() * 2,
            ease: "easeOut",
            delay: item.delay
          }}
        />
      ))}
    </div>
  );
};

export function ThemedMilestone({
  theme,
  milestone,
  open,
  onClose,
  className
}: ThemedMilestoneProps) {
  const styles = themeStyles[theme as keyof typeof themeStyles] || themeStyles.classic;
  const [xpCounter, setXpCounter] = useState(0);
  
  useEffect(() => {
    if (open && milestone.xpAwarded > 0) {
      let start = 0;
      const increment = Math.max(1, Math.floor(milestone.xpAwarded / 40));
      const timer = setInterval(() => {
        start += increment;
        if (start > milestone.xpAwarded) {
          setXpCounter(milestone.xpAwarded);
          clearInterval(timer);
        } else {
          setXpCounter(start);
        }
      }, 20);
      
      return () => clearInterval(timer);
    } else {
      setXpCounter(0);
    }
  }, [open, milestone.xpAwarded]);
  
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 flex items-center justify-center z-50 bg-black/60 p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <Confetti colors={styles.confetti} />
          
          <motion.div
            className={cn(
              "rounded-xl shadow-2xl p-6 max-w-md w-full z-10 relative overflow-hidden",
              styles.container,
              className
            )}
            initial={{ scale: 0.8, y: 20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.8, y: 20, opacity: 0 }}
            transition={{ type: "spring", duration: 0.5 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-center relative z-10">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-white/10 text-3xl mb-4">
                {styles.icon[milestone.type as keyof typeof styles.icon]}
              </div>
              
              <h2 className={cn("text-2xl font-bold mb-1", styles.title)}>
                {styles.celebration[milestone.type as keyof typeof styles.celebration]}
              </h2>
              
              <h3 className={cn("text-xl font-semibold mb-4", styles.title)}>
                {milestone.title}
              </h3>
              
              <div className={cn("px-4 py-3 rounded-lg mb-4 mx-auto inline-block", styles.xp)}>
                <div className={cn("text-sm mb-1", styles.description)}>XP Awarded</div>
                <div className={cn("text-3xl font-bold transition-all", styles.title)}>
                  +{xpCounter}
                </div>
              </div>
              
              <p className={cn("text-lg mb-6", styles.description)}>
                {milestone.description}
              </p>
              
              <motion.button
                className="px-6 py-2 rounded-full bg-white/20 text-white hover:bg-white/30 transition-colors"
                onClick={onClose}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Continue
              </motion.button>
            </div>
            
            {/* Background effects */}
            <motion.div
              className="absolute inset-0 opacity-20"
              initial={{ scale: 0 }}
              animate={{ scale: 2 }}
              transition={{ duration: 2, repeat: Infinity, repeatType: "reverse" }}
              style={{
                background: "radial-gradient(circle, rgba(255,255,255,0.3) 0%, rgba(255,255,255,0) 70%)",
                transformOrigin: "center"
              }}
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
} 