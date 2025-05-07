import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface ThemedHeaderProps {
  theme: string;
  title: string;
  subtitle?: string;
  className?: string;
}

const themeStyles = {
  dbz: {
    container: "bg-gradient-to-br from-yellow-950 to-orange-900 border-b-2 border-yellow-600/50",
    title: "text-yellow-400",
    subtitle: "text-yellow-300/70",
    icon: "🔥",
    titlePrefix: "Power Training:"
  },
  naruto: {
    container: "bg-gradient-to-br from-orange-950 to-red-900 border-b-2 border-orange-600/50",
    title: "text-orange-400",
    subtitle: "text-orange-300/70",
    icon: "🍃",
    titlePrefix: "Ninja Way:"
  },
  hogwarts: {
    container: "bg-gradient-to-br from-purple-950 to-indigo-900 border-b-2 border-purple-600/50",
    title: "text-purple-400",
    subtitle: "text-purple-300/70",
    icon: "✨",
    titlePrefix: "Magical Studies:"
  },
  classic: {
    container: "bg-gradient-to-br from-blue-950 to-cyan-900 border-b-2 border-blue-600/50",
    title: "text-blue-400",
    subtitle: "text-blue-300/70",
    icon: "📚",
    titlePrefix: "Knowledge Path:"
  }
};

export function ThemedHeader({
  theme,
  title,
  subtitle,
  className
}: ThemedHeaderProps) {
  const styles = themeStyles[theme as keyof typeof themeStyles] || themeStyles.classic;
  
  return (
    <motion.div
      className={cn("px-4 py-3 rounded-lg", styles.container, className)}
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex items-center gap-2">
        <span className="text-xl">{styles.icon}</span>
        <h2 className={cn("text-xl font-bold", styles.title)}>
          {styles.titlePrefix} {title}
        </h2>
      </div>
      
      {subtitle && (
        <p className={cn("mt-1 text-sm", styles.subtitle)}>
          {subtitle}
        </p>
      )}
    </motion.div>
  );
} 