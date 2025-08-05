"use client";
import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Plus, Trash } from "lucide-react";
import type { Pathway, Branch, Stage, Module } from "@/types/pathway";

interface PathwayFormProps {
  mode: "create" | "edit";
  initialData?: Pathway;
  onSubmit: (pathway: Pathway) => void;
}

export default function PathwayForm({ mode, initialData, onSubmit }: PathwayFormProps) {
  const [pathway, setPathway] = useState<Pathway>(
    initialData || {
      id: "",
      name: "",
      branches: [],
    }
  );
  const [error, setError] = useState<string | null>(null);

  // Handlers for dynamic editing
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPathway(p => ({ ...p, name: e.target.value }));
  };
  const handleIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPathway(p => ({ ...p, id: e.target.value.replace(/\s+/g, '-').toLowerCase() }));
  };
  const addBranch = () => {
    setPathway(p => ({
      ...p,
      branches: [
        ...p.branches,
        { id: `branch-${Date.now()}`, name: "", stages: [] },
      ],
    }));
  };
  const removeBranch = (idx: number) => {
    setPathway(p => ({
      ...p,
      branches: p.branches.filter((_, i) => i !== idx),
    }));
  };
  const updateBranch = (idx: number, branch: Partial<Branch>) => {
    setPathway(p => ({
      ...p,
      branches: p.branches.map((b, i) => (i === idx ? { ...b, ...branch } : b)),
    }));
  };
  const addStage = (branchIdx: number) => {
    setPathway(p => ({
      ...p,
      branches: p.branches.map((b, i) =>
        i === branchIdx
          ? { ...b, stages: [...b.stages, { id: `stage-${Date.now()}`, name: "", modules: [] }] }
          : b
      ),
    }));
  };
  const removeStage = (branchIdx: number, stageIdx: number) => {
    setPathway(p => ({
      ...p,
      branches: p.branches.map((b, i) =>
        i === branchIdx
          ? { ...b, stages: b.stages.filter((_, j) => j !== stageIdx) }
          : b
      ),
    }));
  };
  const updateStage = (branchIdx: number, stageIdx: number, stage: Partial<Stage>) => {
    setPathway(p => ({
      ...p,
      branches: p.branches.map((b, i) =>
        i === branchIdx
          ? {
              ...b,
              stages: b.stages.map((s, j) => (j === stageIdx ? { ...s, ...stage } : s)),
            }
          : b
      ),
    }));
  };
  const addModule = (branchIdx: number, stageIdx: number) => {
    setPathway(p => ({
      ...p,
      branches: p.branches.map((b, i) =>
        i === branchIdx
          ? {
              ...b,
              stages: b.stages.map((s, j) =>
                j === stageIdx
                  ? {
                      ...s,
                      modules: [
                        ...s.modules,
                        { id: `module-${Date.now()}`, type: "custom", name: "" },
                      ],
                    }
                  : s
              ),
            }
          : b
      ),
    }));
  };
  const removeModule = (branchIdx: number, stageIdx: number, moduleIdx: number) => {
    setPathway(p => ({
      ...p,
      branches: p.branches.map((b, i) =>
        i === branchIdx
          ? {
              ...b,
              stages: b.stages.map((s, j) =>
                j === stageIdx
                  ? {
                      ...s,
                      modules: s.modules.filter((_, k) => k !== moduleIdx),
                    }
                  : s
              ),
            }
          : b
      ),
    }));
  };
  const updateModule = (
    branchIdx: number,
    stageIdx: number,
    moduleIdx: number,
    module: Partial<Module>
  ) => {
    setPathway(p => ({
      ...p,
      branches: p.branches.map((b, i) =>
        i === branchIdx
          ? {
              ...b,
              stages: b.stages.map((s, j) =>
                j === stageIdx
                  ? {
                      ...s,
                      modules: s.modules.map((m, k) =>
                        k === moduleIdx ? { ...m, ...module } : m
                      ),
                    }
                  : s
              ),
            }
          : b
      ),
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pathway.id || !pathway.name) {
      setError("Pathway ID and name are required.");
      return;
    }
    if (pathway.branches.length === 0) {
      setError("At least one branch is required.");
      return;
    }
    setError(null);
    onSubmit(pathway);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex flex-col gap-2">
        <label className="font-semibold">Pathway Name</label>
        <Input value={pathway.name} onChange={handleNameChange} placeholder="e.g. Medicine" required />
      </div>
      <div className="flex flex-col gap-2">
        <label className="font-semibold">Pathway ID (unique, URL-safe)</label>
        <Input value={pathway.id} onChange={handleIdChange} placeholder="e.g. medicine" required />
      </div>
      <div className="flex flex-col gap-2">
        <label className="font-semibold flex items-center gap-2">Branches <Button type="button" size="sm" onClick={addBranch} variant="outline"><Plus className="w-4 h-4" /> Add Branch</Button></label>
        {pathway.branches.map((branch, branchIdx) => (
          <Card key={branch.id} className="p-4 mb-2 bg-background/80 border border-border rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Input
                value={branch.name}
                onChange={e => updateBranch(branchIdx, { name: e.target.value })}
                placeholder="Branch name (e.g. MD, Nurse)"
                className="w-48"
                required
              />
              <Button type="button" size="icon" variant="ghost" onClick={() => removeBranch(branchIdx)}><Trash className="w-4 h-4" /></Button>
            </div>
            <div className="ml-4">
              <label className="font-medium flex items-center gap-2">Stages <Button type="button" size="sm" onClick={() => addStage(branchIdx)} variant="outline"><Plus className="w-4 h-4" /> Add Stage</Button></label>
              {branch.stages.map((stage, stageIdx) => (
                <Card key={stage.id} className="p-3 mb-2 bg-card/80 border border-border rounded-md">
                  <div className="flex items-center gap-2 mb-2">
                    <Input
                      value={stage.name}
                      onChange={e => updateStage(branchIdx, stageIdx, { name: e.target.value })}
                      placeholder="Stage name (e.g. Premed, Medical School)"
                      className="w-64"
                      required
                    />
                    <Button type="button" size="icon" variant="ghost" onClick={() => removeStage(branchIdx, stageIdx)}><Trash className="w-4 h-4" /></Button>
                  </div>
                  <div className="ml-4">
                    <label className="font-normal flex items-center gap-2">Modules <Button type="button" size="sm" onClick={() => addModule(branchIdx, stageIdx)} variant="outline"><Plus className="w-4 h-4" /> Add Module</Button></label>
                    {stage.modules.map((module, moduleIdx) => (
                      <div key={module.id} className="flex items-center gap-2 mb-1">
                        <Input
                          value={module.name}
                          onChange={e => updateModule(branchIdx, stageIdx, moduleIdx, { name: e.target.value })}
                          placeholder="Module name (e.g. MCAT, USMLE Step 1)"
                          className="w-56"
                          required
                        />
                        <select
                          value={module.type}
                          onChange={e => updateModule(branchIdx, stageIdx, moduleIdx, { type: e.target.value as Module["type"] })}
                          className="border rounded px-2 py-1 text-xs"
                        >
                          <option value="exam">Exam</option>
                          <option value="class">Class</option>
                          <option value="courses">Courses</option>
                          <option value="activity">Activity</option>
                          <option value="custom">Custom</option>
                        </select>
                        <Button type="button" size="icon" variant="ghost" onClick={() => removeModule(branchIdx, stageIdx, moduleIdx)}><Trash className="w-4 h-4" /></Button>
                      </div>
                    ))}
                  </div>
                </Card>
              ))}
            </div>
          </Card>
        ))}
      </div>
      {error && <div className="text-red-500 font-medium">{error}</div>}
      <Button type="submit" className="w-full mt-4" size="lg">{mode === "create" ? "Create Pathway" : "Save Changes"}</Button>
    </form>
  );
} 