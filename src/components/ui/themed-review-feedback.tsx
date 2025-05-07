import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";

interface ThemedReviewFeedbackProps {
  theme: string;
  score: number;
  xpGained: number;
  reviewStatus: "mastered" | "improving" | "revise";
  feedback?: string;
  onClose?: () => void;
  className?: string;
}

const themeStyles = {
  dbz: {
    container: {
      mastered: "bg-gradient-to-br from-yellow-900/70 to-orange-800/70 border-2 border-yellow-500/50",
      improving: "bg-gradient-to-br from-yellow-950/70 to-orange-900/70 border-2 border-yellow-600/50",
      revise: "bg-gradient-to-br from-red-950/70 to-orange-950/70 border-2 border-red-700/50"
    },
    title: {
      mastered: "text-yellow-300",
      improving: "text-yellow-400",
      revise: "text-red-400"
    },
    text: {
      mastered: "text-yellow-100/90",
      improving: "text-yellow-200/80",
      revise: "text-red-200/80"
    },
    xpContainer: "bg-yellow-500/20 border border-yellow-500/30",
    xpText: "text-yellow-300"
  },
  naruto: {
    container: {
      mastered: "bg-gradient-to-br from-blue-900/70 to-cyan-800/70 border-2 border-blue-500/50",
      improving: "bg-gradient-to-br from-orange-950/70 to-red-900/70 border-2 border-orange-600/50",
      revise: "bg-gradient-to-br from-red-950/70 to-orange-950/70 border-2 border-red-700/50"
    },
    title: {
      mastered: "text-blue-300",
      improving: "text-orange-400",
      revise: "text-red-400"
    },
    text: {
      mastered: "text-blue-100/90",
      improving: "text-orange-200/80",
      revise: "text-red-200/80"
    },
    xpContainer: "bg-orange-500/20 border border-orange-500/30",
    xpText: "text-orange-300"
  },
  hogwarts: {
    container: {
      mastered: "bg-gradient-to-br from-purple-900/70 to-violet-800/70 border-2 border-purple-500/50",
      improving: "bg-gradient-to-br from-purple-950/70 to-indigo-900/70 border-2 border-purple-600/50",
      revise: "bg-gradient-to-br from-red-950/70 to-purple-950/70 border-2 border-red-700/50"
    },
    title: {
      mastered: "text-purple-300",
      improving: "text-purple-400",
      revise: "text-red-400"
    },
    text: {
      mastered: "text-purple-100/90",
      improving: "text-purple-200/80",
      revise: "text-red-200/80"
    },
    xpContainer: "bg-purple-500/20 border border-purple-500/30",
    xpText: "text-purple-300"
  },
  classic: {
    container: {
      mastered: "bg-gradient-to-br from-blue-900/70 to-cyan-800/70 border-2 border-blue-500/50",
      improving: "bg-gradient-to-br from-blue-950/70 to-cyan-900/70 border-2 border-blue-600/50",
      revise: "bg-gradient-to-br from-red-950/70 to-blue-950/70 border-2 border-red-700/50"
    },
    title: {
      mastered: "text-blue-300",
      improving: "text-blue-400",
      revise: "text-red-400"
    },
    text: {
      mastered: "text-blue-100/90",
      improving: "text-blue-200/80",
      revise: "text-red-200/80"
    },
    xpContainer: "bg-blue-500/20 border border-blue-500/30",
    xpText: "text-blue-300"
  }
};

const themeFeedbackMessages = {
  dbz: {
    mastered: {
      title: "Super Saiyan Mastery!",
      message: "Your power level is over 9000! You've mastered this technique."
    },
    improving: {
      title: "Training Progress!",
      message: "You're growing stronger. Keep training to increase your power level!"
    },
    revise: {
      title: "Need More Training!",
      message: "You need more time in the Hyperbolic Time Chamber. Focus your ki and try again."
    }
  },
  naruto: {
    mastered: {
      title: "Jutsu Mastered!",
      message: "You've completely mastered this jutsu. Your chakra control is impressive!"
    },
    improving: {
      title: "Chakra Building!",
      message: "Your chakra control is improving. Continue your training on the path to Hokage!"
    },
    revise: {
      title: "More Practice Needed!",
      message: "You need to focus your chakra. Return to the Academy for more training!"
    }
  },
  hogwarts: {
    mastered: {
      title: "Spell Mastered!",
      message: "Outstanding! You've fully mastered this magical knowledge."
    },
    improving: {
      title: "Magical Progress!",
      message: "Your magical abilities are growing. Continue practicing to perfect your spells!"
    },
    revise: {
      title: "Needs Review!",
      message: "You need to review your spellbooks. Return to your studies and try again!"
    }
  },
  classic: {
    mastered: {
      title: "Knowledge Mastered!",
      message: "Excellent work! You've demonstrated a complete understanding of this material."
    },
    improving: {
      title: "Good Progress!",
      message: "You're making solid progress. Keep practicing to improve your understanding!"
    },
    revise: {
      title: "Review Needed!",
      message: "This material needs additional review. Take time to study and try again!"
    }
  }
};

export function ThemedReviewFeedback({
  theme,
  score,
  xpGained,
  reviewStatus,
  feedback,
  onClose,
  className
}: ThemedReviewFeedbackProps) {
  const styles = themeStyles[theme as keyof typeof themeStyles] || themeStyles.classic;
  const messages = themeFeedbackMessages[theme as keyof typeof themeFeedbackMessages] || themeFeedbackMessages.classic;
  const statusMessages = messages[reviewStatus as keyof typeof messages];
  
  const [xpCounter, setXpCounter] = useState(0);
  const [showFeedback, setShowFeedback] = useState(false);
  
  // Animate XP counter
  useEffect(() => {
    if (xpGained > 0) {
      let start = 0;
      const increment = Math.max(1, Math.floor(xpGained / 30));
      const timer = setInterval(() => {
        start += increment;
        if (start > xpGained) {
          setXpCounter(xpGained);
          clearInterval(timer);
          
          // Show feedback after XP animation completes
          setTimeout(() => {
            setShowFeedback(true);
          }, 400);
        } else {
          setXpCounter(start);
        }
      }, 30);
      
      return () => clearInterval(timer);
    } else {
      setShowFeedback(true);
    }
  }, [xpGained]);
  
  return (
    <motion.div
      className={cn("rounded-lg p-5 max-w-md mx-auto", styles.container[reviewStatus], className)}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, type: "spring" }}
    >
      <div className="text-center mb-4">
        <h3 className={cn("text-xl font-bold", styles.title[reviewStatus])}>
          {statusMessages.title}
        </h3>
        
        <div className={cn("mt-6 mb-6 px-4 py-3 rounded-lg inline-block", styles.xpContainer)}>
          <div className={cn("text-sm mb-1", styles.text[reviewStatus])}>Knowledge Gained</div>
          <div className={cn("text-2xl font-bold", styles.xpText)}>
            +{xpCounter} XP
          </div>
        </div>
        
        <motion.div 
          className={cn("text-lg mb-4", styles.text[reviewStatus])}
          initial={{ opacity: 0 }}
          animate={{ opacity: showFeedback ? 1 : 0 }}
          transition={{ duration: 0.3 }}
        >
          <p>Score: {score}%</p>
          <p className="mt-2">{statusMessages.message}</p>
          {feedback && (
            <p className="mt-4 text-sm italic border-t border-white/10 pt-4">{feedback}</p>
          )}
        </motion.div>
        
        <AnimatePresence>
          {showFeedback && (
            <motion.button
              className="mt-4 px-6 py-2 rounded-full bg-white/10 text-white/90 hover:bg-white/20 transition-colors"
              onClick={onClose}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ duration: 0.3, delay: 0.2 }}
            >
              Continue
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
} 