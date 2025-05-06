"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { toast } from "@/components/ui/use-toast";
import { AISubjectHelperProps, SubjectStructure } from "@/types/subject";

export function AISubjectHelper({ onStructureGenerated, onError }: AISubjectHelperProps) {
  const [subjectName, setSubjectName] = useState("");
  const [additionalInfo, setAdditionalInfo] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subjectName.trim()) {
      toast.error("Please enter a subject name");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/generate-subject-structure", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          subject: subjectName,
          additionalInfo: additionalInfo.trim(),
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate subject structure");
      }

      const data: SubjectStructure = await response.json();
      onStructureGenerated(data);
      toast.success("Subject structure generated successfully!");
    } catch (error) {
      console.error("Error generating subject structure:", error);
      const errorMessage = error instanceof Error ? error.message : "Failed to generate subject structure";
      onError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="subjectName" className="block text-sm font-medium mb-1">
          Subject Name
        </label>
        <Input
          id="subjectName"
          value={subjectName}
          onChange={(e) => setSubjectName(e.target.value)}
          placeholder="e.g., Technical Analysis"
          disabled={isLoading}
          required
        />
      </div>

      <div>
        <label htmlFor="additionalInfo" className="block text-sm font-medium mb-1">
          Additional Information (Optional)
        </label>
        <Textarea
          id="additionalInfo"
          value={additionalInfo}
          onChange={(e) => setAdditionalInfo(e.target.value)}
          placeholder="Add any specific requirements, focus areas, or preferences..."
          disabled={isLoading}
          className="min-h-[100px]"
        />
      </div>

      <Button type="submit" disabled={isLoading} className="w-full">
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Generating Structure...
          </>
        ) : (
          "Generate Subject Structure"
        )}
      </Button>
    </form>
  );
} 