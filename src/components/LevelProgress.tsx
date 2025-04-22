import Image from "next/image";
import { getCurrentAvatar, getCurrentLevel, getNextLevel, getProgressBarClass, getThemeClasses } from "@/utils/themeUtils";

interface LevelProgressProps {
  theme: string;
  xp: number;
  level: number;
  showAvatar?: boolean;
  size?: "sm" | "md" | "lg";
}

const sizeClasses = {
  sm: {
    container: "p-2",
    avatar: "w-8 h-8",
    text: "text-sm",
    progress: "h-1.5"
  },
  md: {
    container: "p-3",
    avatar: "w-12 h-12",
    text: "text-base",
    progress: "h-2"
  },
  lg: {
    container: "p-4",
    avatar: "w-16 h-16",
    text: "text-lg",
    progress: "h-2.5"
  }
};

export default function LevelProgress({ 
  theme, 
  xp, 
  level,
  showAvatar = true,
  size = "md" 
}: LevelProgressProps) {
  const avatar = getCurrentAvatar(theme, level);
  const currentLevel = getCurrentLevel(theme, xp);
  const nextLevel = getNextLevel(theme, xp);
  const progressBarClass = getProgressBarClass(theme);
  const themeClasses = getThemeClasses(theme);
  const sizes = sizeClasses[size];
  
  return (
    <div className={`${themeClasses.card} rounded-lg ${sizes.container}`}>
      <div className="flex items-center gap-3">
        {showAvatar && (
          <div className={`relative ${sizes.avatar}`}>
            <Image
              src={avatar.imageUrl}
              alt={avatar.name}
              fill
              className="rounded-full object-cover"
            />
          </div>
        )}
        <div className="flex-1">
          <div className="flex items-baseline justify-between">
            <div className={`font-medium ${sizes.text} ${themeClasses.text}`}>
              {currentLevel}
            </div>
            <div className={`text-gray-500 ${sizes.text}`}>
              {Math.floor(nextLevel.progress)}%
            </div>
          </div>
          <div className={`mt-1.5 w-full bg-gray-200 rounded-full ${sizes.progress}`}>
            <div
              className={`${progressBarClass} ${sizes.progress} rounded-full transition-all duration-300 ease-in-out`}
              style={{ width: `${nextLevel.progress}%` }}
            />
          </div>
          <div className={`mt-1 text-gray-500 ${sizes.text}`}>
            {xp} / {nextLevel.requiredXp} XP
          </div>
        </div>
      </div>
    </div>
  );
} 