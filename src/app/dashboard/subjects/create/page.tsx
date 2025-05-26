"use client";

import { useState } from "react";
import { AISubjectHelper } from "@/components/AISubjectHelper";
import { SubjectStructureEditor } from "@/components/SubjectStructureEditor";
import { SubjectStructure } from "@/types/subject";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Breadcrumbs } from "@/components/Breadcrumbs";

const emptyStructure: SubjectStructure = {
  name: "",
  description: "",
  topics: [],
  totalEstimatedHours: 0,
};

export default function CreateSubjectPage() {
  const router = useRouter();
  const [structure, setStructure] = useState<SubjectStructure | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleStructureGenerated = (newStructure: SubjectStructure) => {
    setStructure(newStructure);
  };

  const handleError = (error: string) => {
    toast.error(error);
  };

  const handleSave = async (finalStructure: SubjectStructure) => {
    setIsSaving(true);
    try {
      const response = await fetch("/api/subjects", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(finalStructure),
      });

      if (!response.ok) {
        throw new Error("Failed to save subject");
      }

      const data = await response.json();
      toast.success("Subject created successfully!");
      router.push(`/subjects/${data.id}`);
    } catch (error) {
      console.error("Error saving subject:", error);
      toast.error("Failed to save subject");
    } finally {
      setIsSaving(false);
    }
  };

  const handleStartManually = () => {
    setStructure(emptyStructure);
  };

  const handleStartOver = () => {
    setStructure(null);
  };

  return (
    <div className="container max-w-4xl py-6">
      <div className="mb-6">
        <Breadcrumbs
          items={[
            { label: "Subjects", href: "/subjects" },
            { label: "Create New Subject" },
          ]}
        />
      </div>

      <h1 className="text-3xl font-bold mb-6">Create New Subject</h1>

      {!structure ? (
        <Tabs defaultValue="ai" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="ai">AI-Assisted Creation</TabsTrigger>
            <TabsTrigger value="manual">Manual Creation</TabsTrigger>
          </TabsList>

          <TabsContent value="ai">
            <Card>
              <CardHeader>
                <CardTitle>AI-Assisted Subject Creation</CardTitle>
                <CardDescription>
                  Let AI help you create a structured learning path by generating
                  topics and core concepts based on your input.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <AISubjectHelper
                  onStructureGenerated={handleStructureGenerated}
                  onError={handleError}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="manual">
            <Card>
              <CardHeader>
                <CardTitle>Manual Subject Creation</CardTitle>
                <CardDescription>
                  Create your subject structure from scratch with full control over
                  topics and concepts.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  onClick={handleStartManually}
                  className="w-full"
                >
                  Start Creating Manually
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      ) : (
        <div className="space-y-4">
          <Card>
            <CardContent className="pt-6">
              <SubjectStructureEditor
                initialStructure={structure}
                onSave={handleSave}
                isLoading={isSaving}
                onStartOver={handleStartOver}
              />
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
} 