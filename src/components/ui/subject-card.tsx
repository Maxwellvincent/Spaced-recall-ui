import Link from "next/link";
import { BookOpen, Star, Brain, Clock } from "lucide-react";
import { useEffect, useState } from "react";
import { doc, getDoc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";

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
  progress: {
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
}

interface SubjectCardProps {
  subject: Subject;
  onClick?: () => void;
  className?: string;
}

export function SubjectCard({ subject, onClick, className }: SubjectCardProps) {
  const { user } = useAuth();
  const [userTheme, setUserTheme] = useState("classic");
  const [userCharacter, setUserCharacter] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      doc(db, 'users', user?.uid || 'no-user'),
      (doc) => {
        if (doc.exists()) {
          const userData = doc.data() as UserPreferences;
          setUserTheme(userData.theme || "classic");
          setUserCharacter(userData.character || null);
        }
      },
      (error) => {
        console.error('Error fetching user preferences:', error);
        setUserTheme("classic");
        setUserCharacter(null);
      }
    );

    return () => unsubscribe();
  }, [user]);

  const getCurrentLevel = () => {
    if (userTheme === "naruto" && userCharacter) {
      const characterLevels = (THEME_LEVELS.naruto as Record<string, string[]>)[userCharacter];
      if (characterLevels) {
        const levelIndex = Math.min(Math.floor(subject.level / 10), characterLevels.length - 1);
        return characterLevels[levelIndex];
      }
    }
    
    const levels = Array.isArray(THEME_LEVELS[userTheme as keyof typeof THEME_LEVELS])
      ? THEME_LEVELS[userTheme as keyof typeof THEME_LEVELS] as string[]
      : THEME_LEVELS.classic;
    const levelIndex = Math.min(Math.floor(subject.level / 10), levels.length - 1);
    return levels[levelIndex];
  };

  const getNextLevel = () => {
    if (userTheme === "naruto" && userCharacter) {
      const characterLevels = (THEME_LEVELS.naruto as Record<string, string[]>)[userCharacter];
      if (characterLevels) {
        const nextLevelIndex = Math.min(Math.floor(subject.level / 10) + 1, characterLevels.length - 1);
        return characterLevels[nextLevelIndex];
      }
    }
    
    const levels = Array.isArray(THEME_LEVELS[userTheme as keyof typeof THEME_LEVELS])
      ? THEME_LEVELS[userTheme as keyof typeof THEME_LEVELS] as string[]
      : THEME_LEVELS.classic;
    const nextLevelIndex = Math.min(Math.floor(subject.level / 10) + 1, levels.length - 1);
    return levels[nextLevelIndex];
  };

  const themeColor = THEME_COLORS[userTheme as keyof typeof THEME_COLORS] || THEME_COLORS.classic;

  return (
    <Link
      href={`/subjects/${encodeURIComponent(subject.id)}`}
      className={cn("block group", className)}
      onClick={onClick}
    >
      <Card className="bg-slate-900/50 rounded-lg p-6 hover:bg-slate-800/50 transition-all duration-200 border border-slate-800 hover:border-slate-700">
        <CardHeader>
          <CardTitle className="text-xl font-semibold text-slate-100 mb-2 group-hover:text-blue-400 transition-colors">
            {subject.name}
          </CardTitle>
          <CardDescription className="text-slate-400 text-sm line-clamp-2">
            {subject.description || 'No description available'}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 mb-4">
          <div className="flex items-center gap-2">
            <div className={`bg-opacity-20 bg-${themeColor.split('-')[1]} p-1.5 rounded`}>
              <Brain className={`h-4 w-4 ${themeColor}`} />
            </div>
            <div>
              <p className="text-xs text-slate-500">Current Rank</p>
              <p className={`text-sm font-medium ${themeColor}`}>{getCurrentLevel()}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="bg-blue-500/20 p-1.5 rounded">
              <Star className="h-4 w-4 text-blue-400" />
            </div>
            <div>
              <p className="text-xs text-slate-500">XP</p>
              <p className="text-sm font-medium text-slate-200">{subject.xp || 0}</p>
            </div>
          </div>
        </CardContent>
        <CardFooter className="space-y-3">
          <div>
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs text-slate-500">Average Mastery</span>
              <span className="text-xs font-medium text-slate-400">
                {Math.round(subject.progress.averageMastery)}%
              </span>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-1.5">
              <div
                className={`rounded-full h-1.5 transition-all duration-300 bg-${themeColor.split('-')[1]}-500`}
                style={{ width: `${subject.progress.averageMastery}%` }}
              />
            </div>
          </div>

          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1 text-slate-500">
              <Clock className="h-3 w-3" />
              <span>
                {Math.round((subject.totalStudyTime || 0) / 60)}h studied
              </span>
            </div>
            <div className="text-slate-500">
              {subject.progress.completedTopics}/{subject.progress.totalTopics} topics completed
            </div>
          </div>
        </CardFooter>
      </Card>
    </Link>
  );
} 