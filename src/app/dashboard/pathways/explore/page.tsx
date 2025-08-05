"use client";
import React, { useState, useEffect } from "react";
import PathwayExplorer from "./PathwayExplorer";
import PathwayForm from "./PathwayForm";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { addPathway, updatePathway, getAllPathways, joinPathway, unjoinPathway, getUserJoinedPathways } from "@/lib/firestorePathwayHelpers";
import type { Pathway } from "@/types/pathway";
import { useAuth } from "@/lib/auth";

// Placeholder AI function for pathway structure suggestion
async function suggestPathwayStructure(name: string): Promise<Partial<Pathway>> {
  // TODO: Replace with real AI call
  if (name.toLowerCase().includes("medicine")) {
    return {
      branches: [
        {
          id: "md",
          name: "MD",
          stages: [
            { id: "premed", name: "Premed", modules: [{ id: "mcat", type: "exam", name: "MCAT" }] },
            { id: "medschool", name: "Medical School", modules: [{ id: "usmle1", type: "exam", name: "USMLE Step 1" }] }
          ]
        }
      ]
    };
  }
  // Default: one branch, one stage, one module
  return {
    branches: [
      {
        id: "main",
        name: "Main Branch",
        stages: [
          { id: "stage1", name: "Stage 1", modules: [{ id: "module1", type: "custom", name: "Module 1" }] }
        ]
      }
    ]
  };
}

export default function PathwaysExplorePage() {
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [currentPathway, setCurrentPathway] = useState<Pathway | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [allPathways, setAllPathways] = useState<Pathway[]>([]);
  const [explorePathway, setExplorePathway] = useState<Pathway | null>(null);
  const [aiSuggested, setAiSuggested] = useState<Partial<Pathway> | null>(null);
  const [creatingName, setCreatingName] = useState("");
  const [creatingStep, setCreatingStep] = useState<"name" | "form">("name");
  const [loadingAI, setLoadingAI] = useState(false);
  const { user } = useAuth();
  const [joinedPathways, setJoinedPathways] = useState<string[]>([]);

  useEffect(() => {
    getAllPathways().then(setAllPathways);
    if (user?.uid) getUserJoinedPathways(user.uid).then(setJoinedPathways);
  }, [refreshKey, user]);

  // Handler for create
  const handleCreate = async (pathway: Pathway) => {
    await addPathway(pathway);
    setCreateOpen(false);
    setRefreshKey(k => k + 1);
    setCreatingStep("name");
    setCreatingName("");
    setAiSuggested(null);
  };
  // Handler for edit
  const handleEdit = async (pathway: Pathway) => {
    await updatePathway(pathway.id, pathway);
    setEditOpen(false);
    setRefreshKey(k => k + 1);
  };

  // Handler for AI suggestion
  const handleSuggest = async () => {
    setLoadingAI(true);
    const suggestion = await suggestPathwayStructure(creatingName);
    setAiSuggested({
      id: creatingName.replace(/\s+/g, '-').toLowerCase(),
      name: creatingName,
      ...suggestion
    });
    setCreatingStep("form");
    setLoadingAI(false);
  };

  const handleJoin = async (pathwayId: string) => {
    await joinPathway(pathwayId);
    setRefreshKey(k => k + 1);
  };

  const handleUnjoin = async (pathwayId: string) => {
    await unjoinPathway(pathwayId);
    setRefreshKey(k => k + 1);
  };

  return (
    <div className="max-w-5xl mx-auto py-8 px-2">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold tracking-tight font-geist">Pathways</h1>
        <Dialog open={createOpen} onOpenChange={open => { setCreateOpen(open); setCreatingStep("name"); setAiSuggested(null); }}>
          <DialogTrigger asChild>
            <Button size="lg" variant="default">Create New Pathway</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Pathway</DialogTitle>
            </DialogHeader>
            {creatingStep === "name" && (
              <form onSubmit={e => { e.preventDefault(); handleSuggest(); }} className="space-y-4">
                <label className="font-semibold">What is the name of your pathway?</label>
                <input
                  className="w-full border rounded px-3 py-2"
                  value={creatingName}
                  onChange={e => setCreatingName(e.target.value)}
                  placeholder="e.g. Medicine, Law, Engineering"
                  required
                />
                <Button type="submit" size="lg" className="w-full" disabled={loadingAI}>
                  {loadingAI ? "Suggesting..." : "Next"}
                </Button>
              </form>
            )}
            {creatingStep === "form" && aiSuggested && (
              <PathwayForm mode="create" initialData={aiSuggested as Pathway} onSubmit={handleCreate} />
            )}
          </DialogContent>
        </Dialog>
      </div>
      {/* Pathway Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 mb-10">
        {allPathways.map(pathway => {
          const joined = joinedPathways.includes(pathway.id);
          return (
            <div key={pathway.id} className="bg-card border border-border rounded-xl shadow-lg p-6 flex flex-col gap-3 luxury-card">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold font-geist mb-1">{pathway.name}</h2>
                <Button size="sm" variant="outline" onClick={() => setExplorePathway(pathway)}>Explore</Button>
              </div>
              <div className="text-xs text-muted-foreground mb-2">{(pathway.branches?.length ?? 0)} branches</div>
              <div className="text-sm text-slate-400 line-clamp-3">{(pathway.branches ?? []).map(b => b.name).join(", ")}</div>
              <div className="mt-2">
                {joined ? (
                  <Button size="sm" variant="secondary" onClick={() => handleUnjoin(pathway.id)} disabled={!user}>Unjoin</Button>
                ) : (
                  <Button size="sm" variant="default" onClick={() => handleJoin(pathway.id)} disabled={!user}>Join</Button>
                )}
              </div>
            </div>
          );
        })}
      </div>
      {/* Pathway Explorer Modal */}
      <Dialog open={!!explorePathway} onOpenChange={open => { if (!open) setExplorePathway(null); }}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Explore Pathway</DialogTitle>
          </DialogHeader>
          {explorePathway && (
            <PathwayExplorer initialPathway={explorePathway} onEditPathway={p => { setCurrentPathway(p); setEditOpen(true); }} />
          )}
        </DialogContent>
      </Dialog>
      {/* Edit Pathway Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Pathway</DialogTitle>
          </DialogHeader>
          {currentPathway && (
            <PathwayForm mode="edit" initialData={currentPathway} onSubmit={handleEdit} />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
} 