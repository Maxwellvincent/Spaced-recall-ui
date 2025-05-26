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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";
import { v4 as uuidv4 } from "uuid";
import { getFirebaseDb } from "@/lib/firebase";
import { collection, doc, setDoc } from "firebase/firestore";
import { logUserActivity } from '@/utils/logUserActivity';

interface Milestone {
  id: string;
  name: string;
  description: string;
  dueDate?: string;
}

export default function NewProjectPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { theme } = useTheme();
  const { createActivity } = useActivities({ autoLoad: false });
  
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<"low" | "medium" | "high">("medium");
  const [startDate, setStartDate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  const handleAddMilestone = () => {
    setMilestones([
      ...milestones,
      {
        id: uuidv4(),
        name: "",
        description: "",
      },
    ]);
  };
  
  const handleRemoveMilestone = (id: string) => {
    setMilestones(milestones.filter((m) => m.id !== id));
  };
  
  const handleMilestoneChange = (
    id: string,
    field: keyof Milestone,
    value: string
  ) => {
    setMilestones(
      milestones.map((m) =>
        m.id === id ? { ...m, [field]: value } : m
      )
    );
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (!name) return;
    try {
      const nowISOString = new Date().toISOString();
      const activity = await createActivity({
        type: "project",
        name,
        description,
        priority,
        startDate: startDate || nowISOString,
        dueDate: dueDate || undefined,
        milestones: milestones.map(m => ({
          ...m,
          completed: false,
        })),
        userId: user?.uid || '',
      });
      console.log('[DEBUG] Created activity:', activity);
      // Also create in 'projects' collection
      const db = getFirebaseDb();
      const projectData: any = {
        id: activity.id,
        name,
        description,
        priority,
        startDate: startDate || nowISOString,
        milestones: milestones.map(m => ({
          ...m,
          completed: false,
        })),
        userId: user?.uid || '',
        status: 'planning',
        progress: 0,
        tasks: [],
        tools: [],
        createdAt: nowISOString,
      };
      if (dueDate) {
        projectData.dueDate = dueDate;
      }
      console.log('[DEBUG] About to setDoc in projects:', projectData);
      try {
        await setDoc(doc(collection(db, "projects"), activity.id), projectData);
        // Also write to user subcollection
        if (user?.uid) {
          await setDoc(doc(db, "users", user.uid, "projects", activity.id), { id: activity.id, ...projectData });
          await logUserActivity(user.uid, {
            type: "project_created",
            detail: `Created project \"${name}\" via activities/new/project`,
            projectId: activity.id,
          });
        }
        console.log('[DEBUG] setDoc in projects successful');
        router.push("/activities?tab=projects");
      } catch (setDocError) {
        console.error('[DEBUG] setDoc in projects failed:', setDocError);
        throw setDocError;
      }
    } catch (error) {
      console.error("[DEBUG] Error creating project in projects collection:", error);
      setErrorMsg("Failed to create project. Please try again. Check your connection and permissions.");
    }
  };
  
  return (
    <div className="container mx-auto px-4 py-8">
      <ThemedHeader
        theme={theme}
        title="New Project"
        subtitle="Create a new project to track progress and milestones"
      />
      
      <Card className="max-w-2xl mx-auto mt-8 p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="name">Project Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter project name"
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter project description"
              rows={3}
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <Select
                value={priority}
                onValueChange={(value: "low" | "medium" | "high") => setPriority(value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="dueDate">Due Date (Optional)</Label>
              <Input
                id="dueDate"
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <Label>Milestones</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddMilestone}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Milestone
              </Button>
            </div>
            
            <div className="space-y-4">
              {milestones.map((milestone) => (
                <div
                  key={milestone.id}
                  className="bg-slate-900/50 p-4 rounded-lg space-y-4"
                >
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex-1 space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor={`milestone-${milestone.id}-name`}>
                          Milestone Name
                        </Label>
                        <Input
                          id={`milestone-${milestone.id}-name`}
                          value={milestone.name}
                          onChange={(e) =>
                            handleMilestoneChange(milestone.id, "name", e.target.value)
                          }
                          placeholder="Enter milestone name"
                          required
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor={`milestone-${milestone.id}-description`}>
                          Description
                        </Label>
                        <Textarea
                          id={`milestone-${milestone.id}-description`}
                          value={milestone.description}
                          onChange={(e) =>
                            handleMilestoneChange(
                              milestone.id,
                              "description",
                              e.target.value
                            )
                          }
                          placeholder="Enter milestone description"
                          rows={2}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor={`milestone-${milestone.id}-dueDate`}>
                          Due Date (Optional)
                        </Label>
                        <Input
                          id={`milestone-${milestone.id}-dueDate`}
                          type="date"
                          value={milestone.dueDate}
                          onChange={(e) =>
                            handleMilestoneChange(
                              milestone.id,
                              "dueDate",
                              e.target.value
                            )
                          }
                        />
                      </div>
                    </div>
                    
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveMilestone(milestone.id)}
                      className="text-red-500 hover:text-red-400 hover:bg-red-950"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          {errorMsg && (
            <div className="text-red-500 font-semibold mb-4">{errorMsg}</div>
          )}
          
          <div className="flex justify-end gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
            >
              Cancel
            </Button>
            <Button type="submit">Create Project</Button>
          </div>
        </form>
      </Card>
    </div>
  );
} 