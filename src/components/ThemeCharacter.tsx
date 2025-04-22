import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getCurrentAvatar, getThemeConfig } from '@/utils/themeUtils';

interface ThemeCharacterProps {
  theme: string;
  level: number;
  xp: number;
  isLevelUp?: boolean;
}

export function ThemeCharacter({ theme, level, xp, isLevelUp = false }: ThemeCharacterProps) {
  const [isHovered, setIsHovered] = useState(false);
  const avatar = getCurrentAvatar(theme, level);
  const themeConfig = getThemeConfig(theme);

  const characterVariants = {
    idle: {
      y: [0, -10, 0],
      transition: {
        duration: 2,
        repeat: Infinity,
        ease: "easeInOut"
      }
    },
    hover: {
      scale: 1.1,
      transition: {
        duration: 0.2
      }
    },
    levelUp: {
      scale: [1, 1.2, 1],
      rotate: [0, 360, 0],
      transition: {
        duration: 1.5,
        times: [0, 0.5, 1],
        ease: "easeInOut"
      }
    }
  };

  const glowVariants = {
    idle: {
      opacity: 0.5,
      scale: 1
    },
    active: {
      opacity: [0.5, 1, 0.5],
      scale: [1, 1.2, 1],
      transition: {
        duration: 2,
        repeat: Infinity,
        ease: "easeInOut"
      }
    }
  };

  return (
    <div className="relative flex items-center justify-center">
      <motion.div
        className="absolute w-32 h-32 rounded-full"
        style={{
          background: `radial-gradient(circle, ${themeConfig.levels[level]?.color || 'rgba(59, 130, 246, 0.5)'}, transparent)`,
          filter: 'blur(20px)'
        }}
        variants={glowVariants}
        initial="idle"
        animate={isLevelUp ? "active" : "idle"}
      />
      
      <motion.div
        className="relative z-10"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        variants={characterVariants}
        initial="idle"
        animate={isLevelUp ? "levelUp" : isHovered ? "hover" : "idle"}
      >
        <img
          src={avatar.imageUrl}
          alt={avatar.name}
          className="w-24 h-24 object-contain"
        />
        <AnimatePresence>
          {isLevelUp && (
            <motion.div
              className="absolute -top-8 left-1/2 transform -translate-x-1/2 text-yellow-400 font-bold text-lg"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              Level Up!
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
      
      <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 text-center">
        <div className="text-sm font-medium text-gray-200">{avatar.name}</div>
        <div className="text-xs text-gray-400">Level {level}</div>
      </div>
    </div>
  );
} 