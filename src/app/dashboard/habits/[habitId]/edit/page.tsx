"use client";
import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { toast } from "@/components/ui/use-toast";

export default function EditHabitPage() {
  const router = useRouter();
  const { habitId } = useParams();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [frequency, setFrequency] = useState("daily");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchHabit() {
      try {
        const res = await fetch(`/api/activities?id=${habitId}`);
        const data = await res.json();
        if (res.ok && data.activity) {
          setName(data.activity.name || "");
          setDescription(data.activity.description || "");
          setFrequency(data.activity.frequency || "daily");
        } else {
          toast({ title: "Error", description: data.error || "Failed to fetch habit", variant: "destructive" });
        }
      } catch (err) {
        toast({ title: "Error", description: "An unexpected error occurred", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    }
    fetchHabit();
  }, [habitId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`/api/activities?id=${habitId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, description, frequency }),
      });
      const data = await res.json();
      if (res.ok) {
        toast({ title: "Habit updated!", description: "Your changes have been saved." });
        router.push("/dashboard/habits");
      } else {
        toast({ title: "Error", description: data.error || "Failed to update habit", variant: "destructive" });
      }
    } catch (err) {
      toast({ title: "Error", description: "An unexpected error occurred", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-10 max-w-lg">
      <Card>
        <CardHeader>
          <CardTitle>Edit Habit</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Name</label>
              <Input value={name} onChange={e => setName(e.target.value)} required placeholder="e.g. Morning Run" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Description</label>
              <Input value={description} onChange={e => setDescription(e.target.value)} placeholder="Optional" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Frequency</label>
              <select value={frequency} onChange={e => setFrequency(e.target.value)} className="w-full p-2 rounded bg-slate-800 border border-slate-700 text-white">
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="custom">Custom</option>
              </select>
            </div>
            <Button type="submit" disabled={loading} className="w-full mt-2">
              {loading ? "Saving..." : "Save Changes"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
} 