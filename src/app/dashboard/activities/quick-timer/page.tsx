"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { useActivities } from "@/hooks/useActivities";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ThemedHeader } from "@/components/ui/themed-components";
import { useTheme } from "@/contexts/theme-context";
import ThemedTimer from "@/components/timer/ThemedTimer";
import { OvertimeInfo } from "@/types/timer";
import { cn } from "@/lib/utils";

const themeStyles = {
  dbz: {
    card: "bg-yellow-950/30 border-2 border-yellow-600/30",
    stats: "bg-yellow-900/50",
    text: "text-yellow-300"
  },
  naruto: {
    card: "bg-orange-950/30 border-2 border-orange-600/30",
    stats: "bg-orange-900/50",
    text: "text-orange-300"
  },
  hogwarts: {
    card: "bg-purple-950/30 border-2 border-purple-600/30",
    stats: "bg-purple-900/50",
    text: "text-purple-300"
  },
  classic: {
    card: "bg-slate-800 border-2 border-blue-600/30",
    stats: "bg-slate-800",
    text: "text-blue-300"
  }
};

export default function QuickTimerPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { theme } = useTheme();
  const { createActivity } = useActivities({ autoLoad: false });
  
  const [showLogForm, setShowLogForm] = useState(false);
  const [sessionData, setSessionData] = useState<{
    duration: number;
    overtime: OvertimeInfo;
    activeTime: number;
    idleTime: number;
  } | null>(null);
  
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  
  const styles = themeStyles[theme as keyof typeof themeStyles] || themeStyles.classic;
  
  const handleSessionEnd = async (
    duration: number,
    overtime: OvertimeInfo,
    activeTime: number,
    idleTime: number
  ) => {
    setSessionData({
      duration,
      overtime,
      activeTime,
      idleTime
    });
    setShowLogForm(true);
  };

  const handleLogSession = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!sessionData || !title) return;
    
    try {
      await createActivity({
        type: "timed",
        title,
        description,
        completed: true,
        duration: sessionData.duration,
        activeTime: sessionData.activeTime,
        idleTime: sessionData.idleTime,
        overtime: sessionData.overtime,
        userId: user?.uid,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      
      router.push("/activities?tab=habits");
    } catch (error) {
      console.error("Error logging timed session:", error);
    }
  };

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs > 0 ? `${hrs}h ` : ''}${mins}m ${secs}s`;
  };
  
  return (
    <div className="container mx-auto px-4 py-8">
      <ThemedHeader
        theme={theme}
        title="Quick Timer"
        subtitle="Start a focused session and log it after completion"
      />
      
      <div className="max-w-2xl mx-auto mt-8">
        {!showLogForm ? (
          <Card className={cn("p-6", styles.card)}>
            <ThemedTimer onSessionEnd={handleSessionEnd} />
          </Card>
        ) : (
          <Card className={cn("p-6", styles.card)}>
            <h3 className={cn("text-lg font-semibold mb-4", styles.text)}>Log Your Session</h3>
            
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className={cn("p-4 rounded-lg", styles.stats)}>
                <div className="text-sm text-slate-400">Total Duration</div>
                <div className={cn("text-lg font-semibold", styles.text)}>{formatTime(sessionData?.duration || 0)}</div>
              </div>
              <div className={cn("p-4 rounded-lg", styles.stats)}>
                <div className="text-sm text-slate-400">Active Time</div>
                <div className={cn("text-lg font-semibold", styles.text)}>{formatTime(sessionData?.activeTime || 0)}</div>
              </div>
            </div>
            
            <form onSubmit={handleLogSession} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title" className={styles.text}>What did you work on?</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter session title"
                  required
                  className={cn("bg-slate-800/50", styles.text)}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="description" className={styles.text}>Additional Notes (Optional)</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Enter session notes"
                  rows={3}
                  className={cn("bg-slate-800/50", styles.text)}
                />
              </div>
              
              <div className="flex justify-end gap-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowLogForm(false);
                    setSessionData(null);
                    setTitle("");
                    setDescription("");
                  }}
                >
                  Discard
                </Button>
                <Button type="submit">Log Session</Button>
              </div>
            </form>
          </Card>
        )}
      </div>
    </div>
  );
} 