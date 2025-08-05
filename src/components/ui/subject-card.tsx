import Link from "next/link";
import { BookOpen, Star, Brain, Clock } from "lucide-react";
import { useEffect, useState } from "react";
import { doc, getDoc, onSnapshot } from "firebase/firestore";
import { getFirebaseDb } from '@/lib/firebase';
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { ThemedCard, ThemedProgress } from "./themed-components";
import { getDbzPowerLevel, getDbzMilestone } from '@/lib/dbzPowerLevel';

// Use getFirebaseDb() to ensure proper initialization
const db = getFirebaseDb();

const THEME_LEVELS = {
  "naruto": {
    "naruto": ["Academy Student", "Genin", "Chunin", "Sage Mode", "Nine-Tails Chakra Mode", "Six Paths Sage Mode"],
    "guy": ["Genin", "Chunin", "Jonin", "Six Gates", "Seven Gates", "Eight Gates"],
    "sasuke": ["Academy Student", "Sharingan", "Curse Mark", "Mangekyo Sharingan", "Eternal Mangekyo", "Rinnegan"]
  },
  "harry-potter": ["First Year", "Second Year", "Third Year", "Fourth Year", "Fifth Year", "Sixth Year", "Seventh Year", "Master Wizard"],
  "dbz": ["Earthling", "Saiyan", "Super Saiyan", "Super Saiyan 2", "Super Saiyan 3", "Super Saiyan God"],
  "classic": ["Beginner", "Intermediate", "Advanced", "Expert", "Master", "Grandmaster"]
};

const THEME_COLORS = {
  "naruto": "text-orange-500",
  "harry-potter": "text-purple-500",
  "dbz": "text-yellow-500",
  "classic": "text-blue-500"
};

interface UserPreferences {
  theme: string;
  character?: string;
}

interface Subject {
  id: string;
  name: string;
  description: string;
  studyStyle: string;
  customStudyStyle?: string;
  progress?: {
    totalXP: number;
    averageMastery: number;
    completedTopics: number;
    totalTopics: number;
    lastStudied?: string;
  };
  masteryPath: {
    currentLevel: number;
    nextLevel: number;
    progress: number;
  };
  xp: number;
  level: number;
  totalStudyTime: number;
  topics: any[];
  sessions: any[];
  quizHistory?: any[];
}

interface SubjectCardProps {
  subject: Subject;
  theme: string;
  onClick?: () => void;
  className?: string;
}

// Helper to get rank name for a theme and level
function getRankName(themeId: string, level: number) {
  const theme = THEME_LEVELS[themeId] || THEME_LEVELS['classic'];
  if (Array.isArray(theme)) {
    const idx = Math.min(level, theme.length - 1);
    return theme[idx] || '';
  }
  // For Naruto, use the first character's levels as fallback
  if (typeof theme === 'object') {
    const charLevels = Object.values(theme)[0];
    const idx = Math.min(level, charLevels.length - 1);
    return charLevels[idx] || '';
  }
  return '';
}

function getRankBadgeClass(themeId: string) {
  switch (themeId) {
    case 'naruto':
      return 'bg-orange-900/60 border-orange-700 text-orange-200';
    case 'dbz':
      return 'bg-yellow-900/60 border-yellow-700 text-yellow-200';
    case 'harry-potter':
    case 'hogwarts':
      return 'bg-purple-900/60 border-purple-700 text-purple-200';
    default:
      return 'bg-blue-900/60 border-blue-700 text-blue-200';
  }
}

function getThemeTextColor(themeId: string) {
  switch (themeId) {
    case 'naruto': return 'text-orange-500';
    case 'dbz': return 'text-yellow-500';
    case 'harry-potter':
    case 'hogwarts': return 'text-purple-500';
    default: return 'text-blue-500';
  }
}

export function SubjectCard({ subject, theme = "classic", onClick, className }: SubjectCardProps) {
  const { user } = useAuth();
  const [userCharacter, setUserCharacter] = useState<string | null>(null);

  // Log subject data for debugging
  useEffect(() => {
    console.log("SubjectCard: Rendering subject with theme", subject, theme);
  }, [subject, theme]);

  // Calculate average mastery if it's missing
  const calculateAverageMastery = () => {
    if (subject?.progress?.averageMastery !== undefined && subject.progress.averageMastery > 0) {
      return subject.progress.averageMastery;
    }
    
    if (!subject?.topics || subject.topics.length === 0) {
      return 0;
    }
    
    // Calculate from topics
    let validTopics = 0;
    const totalMastery = subject.topics.reduce((sum, topic) => {
      if (topic && typeof topic.masteryLevel === 'number') {
        validTopics++;
        return sum + topic.masteryLevel;
      }
      return sum;
    }, 0);
    
    return validTopics > 0 ? Math.round(totalMastery / validTopics) : 0;
  };

  // Ensure progress object has default values
  const progress = {
    totalXP: subject?.progress?.totalXP || subject?.xp || 0,
    averageMastery: calculateAverageMastery(),
    completedTopics: subject?.progress?.completedTopics || subject?.topics?.filter(t => (t && t.masteryLevel && t.masteryLevel >= 80))?.length || 0,
    totalTopics: subject?.progress?.totalTopics || (subject?.topics?.length || 0),
    lastStudied: subject?.progress?.lastStudied || '',
  };

  useEffect(() => {
    if (!user) return;
    
    // Only fetch character preference, not theme
    const fetchUserCharacter = async () => {
      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data() as UserPreferences;
          setUserCharacter(userData.character || null);
        }
      } catch (error) {
        console.error('Error fetching user character:', error);
        setUserCharacter(null);
      }
    };
    
    fetchUserCharacter();
  }, [user]);

  const getCurrentLevel = () => {
    try {
      if (!subject) return "Beginner";
      
      const level = subject.level || Math.floor((subject.xp || 0) / 100);
      const themeId = theme?.toLowerCase() || "classic";
      
      if (themeId === "naruto" && userCharacter) {
        const characterLevels = (THEME_LEVELS.naruto as Record<string, string[]>)[userCharacter];
        if (characterLevels) {
          const levelIndex = Math.min(Math.floor(level / 10), characterLevels.length - 1);
          return characterLevels[levelIndex];
        }
      }
      
      // Handle hogwarts as harry-potter for backward compatibility
      const lookupTheme = themeId === "hogwarts" ? "harry-potter" : themeId;
      
      const levels = Array.isArray(THEME_LEVELS[lookupTheme as keyof typeof THEME_LEVELS])
        ? THEME_LEVELS[lookupTheme as keyof typeof THEME_LEVELS] as string[]
        : THEME_LEVELS.classic;
      const levelIndex = Math.min(Math.floor(level / 10), levels.length - 1);
      return levels[levelIndex];
    } catch (error) {
      console.error('Error getting current level:', error);
      return "Beginner";
    }
  };

  const getNextLevel = () => {
    const themeId = theme?.toLowerCase() || "classic";
    
    if (themeId === "naruto" && userCharacter) {
      const characterLevels = (THEME_LEVELS.naruto as Record<string, string[]>)[userCharacter];
      if (characterLevels) {
        const nextLevelIndex = Math.min(Math.floor(subject.level / 10) + 1, characterLevels.length - 1);
        return characterLevels[nextLevelIndex];
      }
    }
    
    // Handle hogwarts as harry-potter for backward compatibility
    const lookupTheme = themeId === "hogwarts" ? "harry-potter" : themeId;
    
    const levels = Array.isArray(THEME_LEVELS[lookupTheme as keyof typeof THEME_LEVELS])
      ? THEME_LEVELS[lookupTheme as keyof typeof THEME_LEVELS] as string[]
      : THEME_LEVELS.classic;
    const nextLevelIndex = Math.min(Math.floor(subject.level / 10) + 1, levels.length - 1);
    return levels[nextLevelIndex];
  };

  const themeColor = getThemeTextColor(theme);
  
  // Safety check if subject is undefined
  if (!subject) {
    return null;
  }

  // Ensure mastery value is valid for display
  const displayMastery = Math.max(0, Math.min(100, Math.round(progress.averageMastery)));

  // Determine card variant based on mastery
  const getCardVariant = () => {
    if (displayMastery >= 80) return "mastery";
    if (displayMastery >= 40) return "training";
    return "normal";
  };

  // Get user theme and level for badge
  const themeId = theme?.toLowerCase() || 'classic';
  const userLevel = subject?.level || 0;
  const userRank = getRankName(themeId, userLevel);

  return (
    <Link
      href={`/dashboard/subjects/${encodeURIComponent(subject.id)}`}
      className={cn("block group", className)}
      onClick={onClick}
    >
      <ThemedCard
        theme={theme}
        title={subject.name || 'Unnamed Subject'}
        description={subject.description || 'No description'}
        variant={getCardVariant()}
        icon={<BookOpen className="w-5 h-5" />}
      >
        <div className="mt-4">
          <div className="flex justify-between items-center mb-2">
            <div className="flex items-center gap-1">
              <Star className="h-4 w-4 text-yellow-500" />
              <span className="text-sm">{subject.xp || 0} XP</span>
            </div>
            {themeId === 'dbz' ? (
              <div className="flex flex-col items-end">
                <div className="px-2 py-0.5 text-xs rounded-full border border-yellow-500 bg-yellow-900/40 text-yellow-200 font-bold">
                  Power Level: {getDbzPowerLevel(subject.xp || 0).toLocaleString()}
                </div>
                <div className="text-[10px] font-bold text-yellow-300 mt-0.5">
                  {getDbzMilestone(getDbzPowerLevel(subject.xp || 0))}
                </div>
              </div>
            ) : (
              <div className={`px-2 py-0.5 text-xs rounded-full border ${getRankBadgeClass(themeId)}`}>
                Level {subject.level || 0}
              </div>
            )}
          </div>
          
          <div className="mb-3">
            <div className="flex justify-between text-xs mb-1">
              <span>Mastery</span>
              <span>{displayMastery}%</span>
            </div>
            <ThemedProgress 
              theme={theme}
              progress={displayMastery}
              className="h-1.5"
            />
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs text-slate-300 mb-1">
            <div className="flex items-center gap-1">
              <Brain className="h-3.5 w-3.5" />
              <span>
                {progress.completedTopics}/{progress.totalTopics} Topics
              </span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              <span>
                {Math.round((subject.totalStudyTime || 0) / 60)}h Study Time
              </span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 text-xs text-slate-400 mb-1">
            {progress.lastStudied && (
              <span>Last studied: {new Date(progress.lastStudied).toLocaleDateString()}</span>
            )}
            <span>Sessions: {subject.sessions?.length || 0}</span>
            {subject.quizHistory && (
              <span>Quizzes: {subject.quizHistory.length}</span>
            )}
          </div>
        </div>
      </ThemedCard>
    </Link>
  );
} 