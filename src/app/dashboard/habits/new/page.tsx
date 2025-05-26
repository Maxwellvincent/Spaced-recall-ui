"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { toast } from "@/components/ui/use-toast";
import { getFirebaseAuth } from '@/lib/firebase';
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Form } from "@/components/ui/form";
import { logUserActivity } from '@/utils/logUserActivity';

const habitFormSchema = z.object({
  habitType: z.enum(["regular", "book-reading"]),
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  frequency: z.enum(["daily", "weekly", "custom"]),
  customFrequency: z.coerce.number().int().positive().optional(),
  // Book fields
  title: z.string().optional(),
  author: z.string().optional(),
  totalPages: z.coerce.number().int().positive().optional(),
});

export default function NewHabitPage() {
  const router = useRouter();
  const [habitType, setHabitType] = useState("regular");
  const [loading, setLoading] = useState(false);
  const form = useForm({
    resolver: zodResolver(habitFormSchema),
    defaultValues: {
      habitType: "regular",
      name: "",
      description: "",
      frequency: "daily",
      customFrequency: 2,
      title: "",
      author: "",
      totalPages: undefined,
    },
  });

  const handleSubmit = async (values) => {
    setLoading(true);
    try {
      const auth = getFirebaseAuth();
      const user = auth.currentUser;
      if (!user) {
        toast({ title: "Error", description: "You must be logged in to create a habit.", variant: "destructive" });
        setLoading(false);
        return;
      }
      const token = await user.getIdToken();
      const body = {
        type: "habit",
        name: values.habitType === "book-reading" ? `Reading: ${values.title}` : values.name,
        description: values.habitType === "book-reading" ? values.description || `Reading \"${values.title}\"${values.author ? ` by ${values.author}` : ''}` : values.description,
        frequency: values.frequency,
        customFrequency: values.frequency === "custom" ? values.customFrequency : undefined,
        habitSubtype: values.habitType === "book-reading" ? "book-reading" : undefined,
        book: values.habitType === "book-reading" ? {
          title: values.title,
          author: values.author,
          totalPages: values.totalPages,
        } : undefined,
      };
      const res = await fetch("/api/activities", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (res.ok) {
        await logUserActivity(user.uid, {
          type: "habit_created",
          detail: `Created habit: ${body.name}`,
          habitType: values.habitType,
          habitName: body.name,
        });
        toast({
          title: "Success",
          description: values.habitType === "book-reading"
            ? "Book reading habit added! Start logging your reading sessions."
            : "Habit added successfully!",
          variant: "default",
        });
        router.push("/dashboard/activities?tab=habits");
      } else {
        toast({ title: "Error", description: data.error || "Failed to create habit", variant: "destructive" });
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
          <CardTitle>Create New Habit</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Type</label>
                <Select value={habitType} onValueChange={v => { setHabitType(v); form.setValue('habitType', v); }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="regular">Regular Habit</SelectItem>
                    <SelectItem value="book-reading">Book Reading</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {habitType === "book-reading" ? (
                <>
                  <div>
                    <label className="block text-sm font-medium mb-1">Book Title</label>
                    <Input {...form.register("title")} required placeholder="Enter book title" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Author</label>
                    <Input {...form.register("author")} placeholder="Author name (optional)" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Total Pages</label>
                    <Input type="number" {...form.register("totalPages")} placeholder="Total number of pages (optional)" />
                  </div>
                </>
              ) : (
                <div>
                  <label className="block text-sm font-medium mb-1">Name</label>
                  <Input {...form.register("name")} required placeholder="e.g. Morning Run" />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <Textarea {...form.register("description")} placeholder="Optional" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Frequency</label>
                <Select value={form.watch("frequency")} onValueChange={v => form.setValue("frequency", v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select frequency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
                {form.watch("frequency") === "custom" && (
                  <Input type="number" min={1} {...form.register("customFrequency")} placeholder="Custom frequency (days)" />
                )}
              </div>
              <Button type="submit" disabled={loading} className="w-full mt-2">
                {loading ? "Creating..." : "Create Habit"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
} 