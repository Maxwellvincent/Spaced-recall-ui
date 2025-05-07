"use client";

import { useState } from "react";
import { 
  ThemedAvatar, 
  ThemedProgress,
  ThemedHeader,
  ThemedCard,
  ThemedAchievement,
  ThemedStreak,
  ThemedReviewFeedback,
  ThemeSelector,
  ThemedMilestone
} from "@/components/ui/themed-components";

export default function ThemeDemo() {
  const [currentTheme, setCurrentTheme] = useState<string>("dbz");
  const [showMilestone, setShowMilestone] = useState(false);
  
  // Demo data
  const userXP = 25000;
  const userStreak = 7;
  const demoMilestone = {
    title: "Super Saiyan Unlocked",
    description: "You've transcended your limits through consistent study!",
    xpAwarded: 5000,
    type: 'level' as 'level' | 'streak' | 'mastery' | 'achievement'
  };
  
  const achievements = [
    {
      title: "Study Warrior",
      description: "Complete 10 study sessions in a week",
      icon: "🔥",
      progress: 70,
      isUnlocked: false
    },
    {
      title: "Streak Master",
      description: "Maintain a 7-day study streak",
      icon: "📚",
      progress: 100,
      isUnlocked: true
    },
    {
      title: "Biology Expert",
      description: "Score 90% or higher on 5 biology quizzes",
      icon: "🧬",
      progress: 40,
      isUnlocked: false
    }
  ];
  
  return (
    <div className="container max-w-4xl mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-8 text-center">Themed UI Components</h1>
      
      <div className="mb-10">
        <h2 className="text-2xl font-semibold mb-4">Theme Selector</h2>
        <ThemeSelector 
          currentTheme={currentTheme} 
          onThemeSelect={setCurrentTheme} 
        />
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
        <div>
          <h2 className="text-2xl font-semibold mb-4">Avatar & Progress</h2>
          <div className="p-6 bg-slate-900/50 rounded-lg border border-slate-800 flex flex-col items-center">
            <ThemedAvatar 
              theme={currentTheme} 
              xp={userXP} 
              size="xl" 
              className="mb-6"
            />
            <ThemedProgress
              theme={currentTheme}
              progress={75}
              currentXP={userXP}
              neededXP={50000}
              className="w-full"
            />
          </div>
        </div>
        
        <div>
          <h2 className="text-2xl font-semibold mb-4">Streak</h2>
          <ThemedStreak
            theme={currentTheme}
            streak={userStreak}
            highestStreak={14}
          />
        </div>
      </div>
      
      <div className="mb-10">
        <h2 className="text-2xl font-semibold mb-4">Headers & Cards</h2>
        <ThemedHeader
          theme={currentTheme}
          title="Biology"
          subtitle="Study the fundamentals of cellular biology"
          className="mb-4"
        />
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <ThemedCard
            theme={currentTheme}
            title="Cell Structure"
            description="Learn about the components of cells"
            variant="training"
            icon={<span className="text-xl">🔬</span>}
          >
            <p className="text-slate-300/80 text-sm">
              7 concepts • 25 min estimated time
            </p>
          </ThemedCard>
          
          <ThemedCard
            theme={currentTheme}
            title="Cellular Respiration"
            description="Master the process of energy production"
            variant="mastery"
            icon={<span className="text-xl">⚡</span>}
          >
            <p className="text-slate-300/80 text-sm">
              5 concepts • 20 min estimated time
            </p>
          </ThemedCard>
          
          <ThemedCard
            theme={currentTheme}
            title="Cell Division"
            description="Test your knowledge of mitosis and meiosis"
            variant="quiz"
            icon={<span className="text-xl">🧪</span>}
          >
            <p className="text-slate-300/80 text-sm">
              10 questions • 15 min estimated time
            </p>
          </ThemedCard>
          
          <ThemedCard
            theme={currentTheme}
            title="Study Notes"
            description="Your personal notes on cellular biology"
            variant="normal"
            icon={<span className="text-xl">📝</span>}
          >
            <p className="text-slate-300/80 text-sm">
              Last updated 2 days ago
            </p>
          </ThemedCard>
        </div>
      </div>
      
      <div className="mb-10">
        <h2 className="text-2xl font-semibold mb-4">Achievements</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {achievements.map((achievement, index) => (
            <ThemedAchievement
              key={index}
              theme={currentTheme}
              title={achievement.title}
              description={achievement.description}
              icon={achievement.icon}
              progress={achievement.progress}
              isUnlocked={achievement.isUnlocked}
            />
          ))}
        </div>
      </div>
      
      <div className="mb-10 grid grid-cols-1 md:grid-cols-2 gap-8">
        <div>
          <h2 className="text-2xl font-semibold mb-4">Review Feedback</h2>
          <div className="p-4 bg-slate-900/50 rounded-lg border border-slate-800">
            <ThemedReviewFeedback
              theme={currentTheme}
              score={85}
              xpGained={250}
              reviewStatus="improving"
              feedback="Good work on the circulatory system questions!"
              onClose={() => console.log("Close clicked")}
            />
          </div>
        </div>
        
        <div>
          <h2 className="text-2xl font-semibold mb-4">Milestones</h2>
          <div className="p-4 bg-slate-900/50 rounded-lg border border-slate-800 flex flex-col items-center">
            <p className="text-slate-300 mb-4">
              Milestones appear as modal popups when you reach significant achievements
            </p>
            <button
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-md"
              onClick={() => setShowMilestone(true)}
            >
              Show Example Milestone
            </button>
            
            <ThemedMilestone
              theme={currentTheme}
              milestone={demoMilestone}
              open={showMilestone}
              onClose={() => setShowMilestone(false)}
            />
          </div>
        </div>
      </div>
    </div>
  );
} 