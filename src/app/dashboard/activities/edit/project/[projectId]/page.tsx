"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
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
import { Plus, Trash2, Edit as EditIcon } from "lucide-react";
import { v4 as uuidv4 } from "uuid";
import WorkItemForm from "@/components/projects/WorkItemForm";

interface Milestone {
  id: string;
  name: string;
  description: string;
  dueDate?: string;
  completed?: boolean;
}

interface WorkItem {
  id: string;
  type: string;
  title: string;
  description: string;
  status: string;
  potentialXP: number;
  xpAwarded: boolean;
  dueDate?: string;
  priority?: string;
  category?: string;
  impact?: string;
  technicalDetails?: string;
}

export default function EditProjectPage() {
  const router = useRouter();
  const { projectId } = useParams();
  const { user } = useAuth();
  const { theme } = useTheme();
  const { activities, loadActivities, updateActivity, loading } = useActivities({ autoLoad: true });

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<"low" | "medium" | "high">("medium");
  const [startDate, setStartDate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [workItems, setWorkItems] = useState<WorkItem[]>([]);
  const [editingWorkItem, setEditingWorkItem] = useState<WorkItem | null>(null);
  const [showWorkItemForm, setShowWorkItemForm] = useState(false);
  const [xpGainedForWorkItem, setXpGainedForWorkItem] = useState<{ [itemId: string]: number }>({});

  useEffect(() => {
    if (projectId && activities.length > 0) {
      const project = activities.find(activity => activity.id === projectId);
      if (project) {
        setName(project.name || "");
        setDescription(project.description || "");
        setPriority(project.priority || "medium");
        setStartDate(project.startDate || "");
        setDueDate(project.dueDate || "");
        setMilestones(project.milestones?.map(m => ({
          ...m,
          id: m.id || uuidv4(),
          name: m.name || "",
          description: m.description || "",
          dueDate: m.dueDate || "",
          completed: m.completed || false
        })) || []);
        setWorkItems(project.workItems || []);
      } else {
        setName("");
        setDescription("");
        setPriority("medium");
        setStartDate("");
        setDueDate("");
        setMilestones([]);
        setWorkItems([]);
        console.warn(`EditProjectPage: Project with ID ${projectId} not found in loaded activities.`);
      }
    } else if (projectId && !loading && activities.length === 0) {
      setName("");
      setDescription("");
      setPriority("medium");
      setStartDate("");
      setDueDate("");
      setMilestones([]);
      setWorkItems([]);
      console.warn(`EditProjectPage: No activities loaded or project ${projectId} not found after loading.`);
    }
  }, [projectId, activities, loading]);

  const handleAddMilestone = () => {
    setMilestones([
      ...milestones,
      {
        id: uuidv4(),
        name: "",
        description: "",
        completed: false,
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

  const handleSaveWorkItem = (workItemData: Omit<WorkItem, 'id'>) => {
    if (editingWorkItem) {
      setWorkItems(currentWorkItems =>
        currentWorkItems.map(item =>
          item.id === editingWorkItem.id ? { ...editingWorkItem, ...workItemData } : item
        )
      );
    } else {
      setWorkItems(currentWorkItems => [
        ...currentWorkItems,
        { ...workItemData, id: uuidv4() },
      ]);
    }
    setEditingWorkItem(null);
    setShowWorkItemForm(false);
  };

  const handleDeleteWorkItem = (workItemId: string) => {
    setWorkItems(currentWorkItems => currentWorkItems.filter(item => item.id !== workItemId));
  };

  const handleWorkItemStatusChange = (workItemId: string, newStatus: string) => {
    setWorkItems(currentWorkItems =>
      currentWorkItems.map(item => {
        if (item.id === workItemId) {
          let updatedItem = { ...item, status: newStatus };
          if (newStatus === 'completed' && !item.xpAwarded && item.potentialXP > 0) {
            updatedItem.xpAwarded = true;
            setXpGainedForWorkItem(prev => ({ ...prev, [workItemId]: item.potentialXP }));
            setTimeout(() => {
              setXpGainedForWorkItem(prev => {
                const newState = { ...prev };
                delete newState[workItemId];
                return newState;
              });
            }, 3000);
          }
          return updatedItem;
        }
        return item;
      })
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;
    console.log("Submitting project update...", { projectId, name, description, priority, startDate, dueDate, milestones, workItems, userId: user?.uid });
    try {
      await updateActivity(projectId, {
        type: "project",
        name,
        description,
        priority,
        startDate: startDate || new Date().toISOString(),
        dueDate: dueDate || undefined,
        milestones: milestones.map(m => ({
          ...m,
          completed: m.completed || false,
        })),
        workItems,
        userId: user?.uid,
      });
      console.log("Project update successful!");
      router.push("/activities?tab=projects");
    } catch (error) {
      console.error("Error updating project:", error);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <button onClick={() => alert('Clicked!')}>Test Native Button</button>
      <ThemedHeader
        theme={theme}
        title="Edit Project"
        subtitle="Modify your project details and milestones"
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

          <div className="space-y-4">
            <Label>Work Items</Label>
            {!showWorkItemForm && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setEditingWorkItem(null);
                  setShowWorkItemForm(true);
                }}
                className="my-2"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add New Work Item
              </Button>
            )}

            {showWorkItemForm && (
              <div className="my-4 p-4 border border-slate-700 rounded-lg bg-slate-900">
                <h3 className="text-lg font-medium mb-3 text-white">
                  {editingWorkItem ? "Edit Work Item" : "Add New Work Item"}
                </h3>
                <WorkItemForm
                  onSubmit={handleSaveWorkItem}
                  onCancel={() => {
                    setShowWorkItemForm(false);
                    setEditingWorkItem(null);
                  }}
                  initialData={editingWorkItem ?? undefined}
                  isEditing={!!editingWorkItem}
                />
              </div>
            )}

            <div className="space-y-4 mt-6">
              {workItems.map((item) => (
                <div key={item.id} className="bg-slate-900/50 p-4 rounded-lg space-y-3">
                  <div className="flex justify-between items-start gap-4">
                    <div className="flex-1">
                      <h4 className="text-lg font-medium text-white">{item.title}</h4>
                      <p className="text-xs text-slate-400">Type: {item.type} | Status: {item.status}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" onClick={() => {
                        setEditingWorkItem(item);
                        setShowWorkItemForm(true);
                      }}>
                        <EditIcon className="h-4 w-4 mr-1" /> Edit
                      </Button>
                      <Button variant="destructive" size="sm" onClick={() => handleDeleteWorkItem(item.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  {item.description && <p className="text-sm text-slate-300">{item.description}</p>}
                  
                  {xpGainedForWorkItem[item.id] && (
                    <div className="my-2 text-center animate-pulse">
                      <span className="text-emerald-400 font-semibold">
                        +{xpGainedForWorkItem[item.id]} XP
                      </span>
                    </div>
                  )}

                  <div className="space-y-1">
                    <Label htmlFor={`workItem-status-${item.id}`}>Status</Label>
                    <Select
                      value={item.status}
                      onValueChange={(value) => handleWorkItemStatusChange(item.id, value)}
                    >
                      <SelectTrigger id={`workItem-status-${item.id}`}>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todo">To Do</SelectItem>
                        <SelectItem value="in-progress">In Progress</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push("/activities?tab=projects")}
            >
              Cancel
            </Button>
            <Button type="submit" onClick={handleSubmit}>Save Changes</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}