import { ActivityStats as ActivityStatsType } from "@/types/activities";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { CheckCircle, Award, Zap, BarChart } from "lucide-react";
import { useTheme } from "@/contexts/theme-context";

interface ActivityStatsProps {
  stats: ActivityStatsType;
}

const themeStyles = {
  dbz: {
    card: "bg-yellow-950/80 border-yellow-700 text-yellow-200",
    icon: "bg-yellow-900/30 text-yellow-400",
    progress: "bg-yellow-500",
  },
  naruto: {
    card: "bg-orange-950/80 border-orange-700 text-orange-200",
    icon: "bg-orange-900/30 text-orange-400",
    progress: "bg-orange-500",
  },
  hogwarts: {
    card: "bg-purple-950/80 border-purple-700 text-purple-200",
    icon: "bg-purple-900/30 text-purple-400",
    progress: "bg-purple-500",
  },
  classic: {
    card: "bg-slate-950 border-slate-800 text-slate-100",
    icon: "bg-blue-900/30 text-blue-400",
    progress: "bg-blue-500",
  },
};

export function ActivityStats({ stats }: ActivityStatsProps) {
  const { theme } = useTheme();
  const styles = themeStyles[theme] || themeStyles.classic;
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
      <Card className={`p-4 ${styles.card}`}>
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${styles.icon}`}>
            <CheckCircle className={`h-5 w-5 ${styles.icon.split(' ').pop()}`} />
          </div>
          <div>
            <p className="text-sm text-slate-400">Completion Rate</p>
            <p className="text-xl font-semibold text-slate-100">
              {stats.completionRate.toFixed(0)}%
            </p>
          </div>
        </div>
        <Progress
          value={stats.completionRate}
          className="h-1 mt-3 bg-slate-800"
          indicatorClassName={styles.progress}
        />
      </Card>
      <Card className={`p-4 ${styles.card}`}>
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg bg-emerald-900/30`}>
            <Award className="h-5 w-5 text-emerald-400" />
          </div>
          <div>
            <p className="text-sm text-slate-400">Current Streak</p>
            <p className="text-xl font-semibold text-slate-100">
              {stats.currentStreak} days
            </p>
          </div>
        </div>
        <div className="mt-3 text-xs text-slate-400">
          Best streak: {stats.bestStreak} days
        </div>
      </Card>
      <Card className={`p-4 ${styles.card}`}>
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg bg-purple-900/30`}>
            <Zap className="h-5 w-5 text-purple-400" />
          </div>
          <div>
            <p className="text-sm text-slate-400">Total XP Gained</p>
            <p className="text-xl font-semibold text-slate-100">
              {stats.totalXpGained.toLocaleString()}
            </p>
          </div>
        </div>
      </Card>
      <Card className={`p-4 ${styles.card}`}>
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg bg-amber-900/30`}>
            <BarChart className="h-5 w-5 text-amber-400" />
          </div>
          <div>
            <p className="text-sm text-slate-400">Activities</p>
            <p className="text-xl font-semibold text-slate-100">
              {stats.completedActivities} / {stats.totalActivities}
            </p>
          </div>
        </div>
        <div className="mt-3 text-xs text-slate-400">
          {stats.pendingActivities} pending
        </div>
      </Card>
    </div>
  );
} 