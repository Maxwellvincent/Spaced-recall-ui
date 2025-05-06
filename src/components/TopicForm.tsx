"use client";

import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import type { Topic } from "@/types/study";

export interface TopicFormData {
  name: string;
  description: string;
  isHabitBased?: boolean;
}

interface TopicFormProps {
  initialData?: Topic;
  onSubmit: (data: TopicFormData) => Promise<void>;
  isSubmitting?: boolean;
}

export function TopicForm({ initialData, onSubmit, isSubmitting = false }: TopicFormProps) {
  const [formData, setFormData] = useState<TopicFormData>({
    name: initialData?.name || "",
    description: initialData?.description || "",
    isHabitBased: initialData?.isHabitBased || false,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Topic Name</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          required
          disabled={isSubmitting}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          disabled={isSubmitting}
        />
      </div>

      <div className="flex items-center space-x-2">
        <Checkbox
          id="isHabitBased"
          checked={formData.isHabitBased}
          onCheckedChange={(checked) => 
            setFormData({ ...formData, isHabitBased: checked as boolean })
          }
          disabled={isSubmitting}
        />
        <Label 
          htmlFor="isHabitBased"
          className="text-sm font-normal leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
        >
          This is a self-managed topic (e.g., Anki deck, daily practice)
        </Label>
      </div>

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? (
          <Loader2 className="h-4 w-4 animate-spin mr-2" />
        ) : null}
        {initialData ? "Update Topic" : "Create Topic"}
      </Button>
    </form>
  );
} 