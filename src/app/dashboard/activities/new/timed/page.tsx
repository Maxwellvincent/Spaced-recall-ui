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
import { TimedActivity } from "@/components/activities/TimedActivity";

export default function NewTimedActivityPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { theme } = useTheme();
  const { createActivity } = useActivities({ autoLoad: false });
  
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [targetDuration, setTargetDuration] = useState(25); // Default to 25 minutes
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title) return;
    
    try {
      await createActivity({
        type: "timed",
        title,
        description,
        targetDuration,
        completed: false,
        userId: user?.uid,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      
      router.push("/activities?tab=habits");
    } catch (error) {
      console.error("Error creating timed activity:", error);
    }
  };
  
  return (
    <div className="container mx-auto px-4 py-8">
      <ThemedHeader
        theme={theme}
        title="New Timed Activity"
        subtitle="Create a new timed activity to track"
      />
      
      <Card className="max-w-2xl mx-auto mt-8 p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="title">Activity Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter activity title"
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter activity description"
              rows={3}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="duration">Target Duration (minutes)</Label>
            <Input
              id="duration"
              type="number"
              min={1}
              value={targetDuration}
              onChange={(e) => setTargetDuration(Number(e.target.value))}
              required
            />
          </div>
          
          <div className="flex justify-end gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
            >
              Cancel
            </Button>
            <Button type="submit">Create Activity</Button>
          </div>
        </form>
      </Card>
    </div>
  );
} 