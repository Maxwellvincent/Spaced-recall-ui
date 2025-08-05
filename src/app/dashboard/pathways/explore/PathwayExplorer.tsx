"use client";
import React, { useEffect, useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { getPathwayById } from "@/lib/firestorePathwayHelpers";
import type { Pathway, Branch, Stage, Module } from "@/types/pathway";
import { Pencil } from "lucide-react";

interface PathwayExplorerProps {
  initialPathway: Pathway;
  onEditPathway?: (p: Pathway) => void;
}

export default function PathwayExplorer({ initialPathway, onEditPathway }: PathwayExplorerProps) {
  const [selectedBranch, setSelectedBranch] = useState<string>(initialPathway.branches[0]?.id || "");

  const branch = initialPathway.branches.find(b => b.id === selectedBranch) || initialPathway.branches[0];

  return (
    <div className="max-w-4xl mx-auto py-8 px-2">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold tracking-tight font-geist">{initialPathway.name} Pathway</h1>
        {onEditPathway && (
          <Button size="sm" variant="outline" onClick={() => onEditPathway(initialPathway)}>
            <Pencil className="w-4 h-4 mr-2" /> Edit Pathway
          </Button>
        )}
      </div>
      <Tabs defaultValue={branch.id} value={selectedBranch} onValueChange={setSelectedBranch} className="mb-8">
        <TabsList>
          {initialPathway.branches.map(b => (
            <TabsTrigger key={b.id} value={b.id} className="capitalize text-base font-medium">
              {b.name}
            </TabsTrigger>
          ))}
        </TabsList>
        {initialPathway.branches.map(b => (
          <TabsContent key={b.id} value={b.id}>
            <StageTree stages={b.stages} />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

function StageTree({ stages }: { stages: Stage[] }) {
  return (
    <div className="space-y-6">
      {stages.map(stage => (
        <Collapsible key={stage.id} defaultOpen>
          <CollapsibleTrigger asChild>
            <Card className="p-4 mb-2 cursor-pointer hover:shadow-lg transition-all bg-background/80 border border-border rounded-xl">
              <div className="flex items-center justify-between">
                <span className="text-xl font-semibold tracking-tight">{stage.name}</span>
                <span className="text-xs text-muted-foreground">{stage.modules.length} modules</span>
              </div>
            </Card>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mt-2">
              {stage.modules.map(module => (
                <ModuleItem key={module.id} module={module} />
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>
      ))}
    </div>
  );
}

function ModuleItem({ module }: { module: Module }) {
  // Placeholder for drag-and-drop and click details
  return (
    <Card className="p-4 flex flex-col items-start gap-2 bg-card/80 border border-border rounded-lg shadow-sm hover:shadow-md transition-all cursor-grab">
      <span className="font-semibold text-base tracking-tight">{module.name}</span>
      <span className="text-xs text-muted-foreground uppercase">{module.type}</span>
      {/* TODO: Add drag handle, click for details, etc. */}
      <Button size="sm" variant="outline" className="mt-2">View Details</Button>
    </Card>
  );
} 