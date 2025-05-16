import { ActivityStats as ActivityStatsType } from "@/types/activities";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { CheckCircle, Award, Zap, BarChart } from "lucide-react";

interface ActivityStatsProps {
  stats: ActivityStatsType;
}

export function ActivityStats({ stats }: ActivityStatsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
      <Card className="p-4 bg-slate-950 border-slate-800">
        <div className="flex items-center gap-3">
          <div className="bg-blue-900/30 p-2 rounded-lg">
            <CheckCircle className="h-5 w-5 text-blue-400" />
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
          indicatorClassName="bg-blue-500"
        />
      </Card>
      
      <Card className="p-4 bg-slate-950 border-slate-800">
        <div className="flex items-center gap-3">
          <div className="bg-emerald-900/30 p-2 rounded-lg">
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
      
      <Card className="p-4 bg-slate-950 border-slate-800">
        <div className="flex items-center gap-3">
          <div className="bg-purple-900/30 p-2 rounded-lg">
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
      
      <Card className="p-4 bg-slate-950 border-slate-800">
        <div className="flex items-center gap-3">
          <div className="bg-amber-900/30 p-2 rounded-lg">
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