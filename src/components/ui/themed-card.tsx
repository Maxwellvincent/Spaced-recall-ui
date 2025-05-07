import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface ThemedCardProps {
  theme: string;
  title: string;
  description?: string;
  icon?: React.ReactNode;
  children?: React.ReactNode;
  variant?: "normal" | "training" | "mastery" | "quiz";
  className?: string;
  onClick?: () => void;
}

const themeStyles = {
  dbz: {
    normal: {
      container: "bg-yellow-950/30 border-2 border-yellow-600/30",
      title: "text-yellow-400",
      description: "text-yellow-300/70",
      iconContainer: "bg-yellow-500/20 text-yellow-400"
    },
    training: {
      container: "bg-gradient-to-br from-yellow-950/50 to-orange-900/50 border-2 border-yellow-600/40 shadow-[0_0_20px_rgba(234,179,8,0.2)]",
      title: "text-yellow-300",
      description: "text-yellow-200/80",
      iconContainer: "bg-yellow-500/30 text-yellow-300"
    },
    mastery: {
      container: "bg-gradient-to-br from-yellow-900/70 to-orange-800/70 border-2 border-yellow-500/60 shadow-[0_0_30px_rgba(234,179,8,0.3)]",
      title: "text-yellow-200",
      description: "text-yellow-100/90",
      iconContainer: "bg-yellow-500/40 text-yellow-200"
    },
    quiz: {
      container: "bg-gradient-to-br from-red-900/60 to-yellow-800/60 border-2 border-red-500/50 shadow-[0_0_25px_rgba(239,68,68,0.3)]",
      title: "text-red-300",
      description: "text-red-200/80",
      iconContainer: "bg-red-500/30 text-red-300"
    }
  },
  naruto: {
    normal: {
      container: "bg-orange-950/30 border-2 border-orange-600/30",
      title: "text-orange-400",
      description: "text-orange-300/70",
      iconContainer: "bg-orange-500/20 text-orange-400"
    },
    training: {
      container: "bg-gradient-to-br from-orange-950/50 to-red-900/50 border-2 border-orange-600/40 shadow-[0_0_20px_rgba(249,115,22,0.2)]",
      title: "text-orange-300",
      description: "text-orange-200/80",
      iconContainer: "bg-orange-500/30 text-orange-300"
    },
    mastery: {
      container: "bg-gradient-to-br from-orange-900/70 to-blue-800/70 border-2 border-orange-500/60 shadow-[0_0_30px_rgba(249,115,22,0.3)]",
      title: "text-orange-200",
      description: "text-orange-100/90",
      iconContainer: "bg-orange-500/40 text-orange-200"
    },
    quiz: {
      container: "bg-gradient-to-br from-blue-900/60 to-orange-800/60 border-2 border-blue-500/50 shadow-[0_0_25px_rgba(59,130,246,0.3)]",
      title: "text-blue-300",
      description: "text-blue-200/80",
      iconContainer: "bg-blue-500/30 text-blue-300"
    }
  },
  hogwarts: {
    normal: {
      container: "bg-purple-950/30 border-2 border-purple-600/30",
      title: "text-purple-400",
      description: "text-purple-300/70",
      iconContainer: "bg-purple-500/20 text-purple-400"
    },
    training: {
      container: "bg-gradient-to-br from-purple-950/50 to-indigo-900/50 border-2 border-purple-600/40 shadow-[0_0_20px_rgba(168,85,247,0.2)]",
      title: "text-purple-300",
      description: "text-purple-200/80",
      iconContainer: "bg-purple-500/30 text-purple-300"
    },
    mastery: {
      container: "bg-gradient-to-br from-purple-900/70 to-violet-800/70 border-2 border-purple-500/60 shadow-[0_0_30px_rgba(168,85,247,0.3)]",
      title: "text-purple-200",
      description: "text-purple-100/90",
      iconContainer: "bg-purple-500/40 text-purple-200"
    },
    quiz: {
      container: "bg-gradient-to-br from-violet-900/60 to-purple-800/60 border-2 border-violet-500/50 shadow-[0_0_25px_rgba(139,92,246,0.3)]",
      title: "text-violet-300",
      description: "text-violet-200/80",
      iconContainer: "bg-violet-500/30 text-violet-300"
    }
  },
  classic: {
    normal: {
      container: "bg-blue-950/30 border-2 border-blue-600/30",
      title: "text-blue-400",
      description: "text-blue-300/70",
      iconContainer: "bg-blue-500/20 text-blue-400"
    },
    training: {
      container: "bg-gradient-to-br from-blue-950/50 to-cyan-900/50 border-2 border-blue-600/40 shadow-[0_0_20px_rgba(59,130,246,0.2)]",
      title: "text-blue-300",
      description: "text-blue-200/80",
      iconContainer: "bg-blue-500/30 text-blue-300"
    },
    mastery: {
      container: "bg-gradient-to-br from-blue-900/70 to-indigo-800/70 border-2 border-blue-500/60 shadow-[0_0_30px_rgba(59,130,246,0.3)]",
      title: "text-blue-200",
      description: "text-blue-100/90",
      iconContainer: "bg-blue-500/40 text-blue-200"
    },
    quiz: {
      container: "bg-gradient-to-br from-indigo-900/60 to-blue-800/60 border-2 border-indigo-500/50 shadow-[0_0_25px_rgba(99,102,241,0.3)]",
      title: "text-indigo-300",
      description: "text-indigo-200/80",
      iconContainer: "bg-indigo-500/30 text-indigo-300"
    }
  }
};

const variantLabels = {
  dbz: {
    normal: "Power Level",
    training: "Training Ground",
    mastery: "Mastery Chamber",
    quiz: "Battle Arena"
  },
  naruto: {
    normal: "Scroll",
    training: "Training Ground",
    mastery: "Sage Path",
    quiz: "Chunin Exam"
  },
  hogwarts: {
    normal: "Spell Book",
    training: "Practice Chamber",
    mastery: "Advanced Class",
    quiz: "O.W.L. Exam"
  },
  classic: {
    normal: "Notes",
    training: "Practice Area",
    mastery: "Mastery Path",
    quiz: "Test Chamber"
  }
};

export function ThemedCard({
  theme,
  title,
  description,
  icon,
  children,
  variant = "normal",
  className,
  onClick
}: ThemedCardProps) {
  const themeStyle = themeStyles[theme as keyof typeof themeStyles] || themeStyles.classic;
  const styles = themeStyle[variant as keyof typeof themeStyle] || themeStyle.normal;
  const labels = variantLabels[theme as keyof typeof variantLabels] || variantLabels.classic;
  const variantLabel = labels[variant as keyof typeof labels];
  
  return (
    <motion.div
      className={cn("rounded-lg p-4 overflow-hidden", styles.container, className, 
        onClick ? "cursor-pointer" : "")}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      onClick={onClick}
    >
      <div className="flex items-start gap-3 mb-3">
        {icon && (
          <div className={cn("p-2 rounded-md", styles.iconContainer)}>
            {icon}
          </div>
        )}
        <div>
          <div className="flex items-center gap-2">
            <h3 className={cn("font-semibold text-lg", styles.title)}>{title}</h3>
            <span className={cn("text-xs px-2 py-0.5 rounded-full bg-black/20", styles.title)}>
              {variantLabel}
            </span>
          </div>
          {description && (
            <p className={cn("text-sm mt-1", styles.description)}>
              {description}
            </p>
          )}
        </div>
      </div>
      
      <div className="mt-3">
        {children}
      </div>
    </motion.div>
  );
} 