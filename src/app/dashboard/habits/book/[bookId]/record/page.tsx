"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { BookReadingHabit } from "@/types/activities";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { toast } from "@/components/ui/use-toast";
import { ArrowLeft, BookOpen, Loader2, Clock } from "lucide-react";

interface PageProps {
  params: {
    bookId: string;
  };
}

export default function RecordReadingPage({ params }: PageProps) {
  const router = useRouter();
  const [book, setBook] = useState<BookReadingHabit | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formState, setFormState] = useState({
    startPage: 0,
    endPage: 0,
    duration: 30,
    summary: "",
  });
  
  useEffect(() => {
    fetchBook();
  }, []);
  
  const fetchBook = async () => {
    try {
      setLoading(true);
      
      // Fetch the book by ID
      const response = await fetch(`/api/activities?id=${params.bookId}`);
      const data = await response.json();
      
      if (response.ok && data.activities?.[0]) {
        const habit = data.activities[0] as BookReadingHabit;
        
        // Validate that it's a book reading habit
        if (habit.type === "habit" && (habit as any).habitSubtype === "book-reading") {
          setBook(habit);
          // Set initial form state
          setFormState(prev => ({
            ...prev,
            startPage: habit.book.currentPage,
            endPage: habit.book.currentPage,
          }));
        } else {
          toast({
            title: "Error",
            description: "This is not a book reading habit",
            variant: "destructive",
          });
          router.push("/habits");
        }
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to fetch book",
          variant: "destructive",
        });
        router.push("/habits");
      }
    } catch (error) {
      console.error("Error fetching book:", error);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
      router.push("/habits");
    } finally {
      setLoading(false);
    }
  };
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    
    if (name === "startPage" || name === "endPage" || name === "duration") {
      const numValue = parseInt(value) || 0;
      setFormState(prev => ({ ...prev, [name]: numValue }));
    } else {
      setFormState(prev => ({ ...prev, [name]: value }));
    }
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!book) return;
    
    // Validate form
    if (formState.endPage < formState.startPage) {
      toast({
        title: "Error",
        description: "End page cannot be less than start page",
        variant: "destructive",
      });
      return;
    }
    
    if (formState.duration <= 0) {
      toast({
        title: "Error",
        description: "Reading duration must be greater than 0",
        variant: "destructive",
      });
      return;
    }
    
    // If book has total pages, ensure end page doesn't exceed it
    if (book.book.totalPages && formState.endPage > book.book.totalPages) {
      toast({
        title: "Error",
        description: `End page cannot exceed total pages (${book.book.totalPages})`,
        variant: "destructive",
      });
      return;
    }
    
    try {
      setSubmitting(true);
      
      // Create reading session
      const response = await fetch("/api/activities/complete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          activityId: book.id,
          readingSession: {
            startPage: formState.startPage,
            endPage: formState.endPage,
            duration: formState.duration,
            summary: formState.summary,
          },
        }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        const pagesRead = formState.endPage - formState.startPage;
        toast({
          title: "Success!",
          description: `Recorded ${pagesRead} pages read (+${data.xpGained} XP)`,
          variant: "default",
        });
        
        router.push(`/habits/book/${book.id}`);
      } else {
        throw new Error(data.error || "Failed to record reading session");
      }
    } catch (error) {
      console.error("Error recording reading session:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };
  
  const calculateProgress = (book: BookReadingHabit["book"]) => {
    if (!book.totalPages || book.totalPages === 0) return 0;
    return Math.min(100, Math.round((book.currentPage / book.totalPages) * 100));
  };
  
  if (loading) {
    return (
      <div className="container mx-auto py-12 flex justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  if (!book) {
    return (
      <div className="container mx-auto py-12">
        <Card>
          <CardContent className="pt-6 text-center">
            <p>Book not found</p>
            <Button className="mt-4" onClick={() => router.push("/habits")}>
              Back to Habits
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  const progress = calculateProgress(book.book);
  
  return (
    <div className="container mx-auto py-6 max-w-2xl">
      <Button 
        variant="ghost" 
        onClick={() => router.back()}
        className="mb-6"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back
      </Button>
      
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div>
              <CardTitle className="text-2xl">Record Reading Session</CardTitle>
              <CardDescription>
                {book.book.title}
                {book.book.author && <span> by {book.book.author}</span>}
              </CardDescription>
            </div>
            <Badge 
              variant={progress === 100 ? 'success' : 'secondary'}
              className="mt-2 md:mt-0 self-start md:self-auto"
            >
              {progress === 100 ? 'Completed' : `${progress}% Complete`}
            </Badge>
          </div>
        </CardHeader>
        
        <CardContent>
          <div className="mb-6">
            <Progress value={progress} className="h-2"/>
            <div className="flex justify-between mt-1 text-xs text-slate-500">
              <span>Current: Page {book.book.currentPage}</span>
              {book.book.totalPages && (
                <span>of {book.book.totalPages}</span>
              )}
            </div>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startPage">Start Page</Label>
                <Input
                  id="startPage"
                  name="startPage"
                  type="number"
                  value={formState.startPage}
                  onChange={handleChange}
                  min={0}
                  max={book.book.totalPages || undefined}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="endPage">End Page</Label>
                <Input
                  id="endPage"
                  name="endPage"
                  type="number"
                  value={formState.endPage}
                  onChange={handleChange}
                  min={formState.startPage}
                  max={book.book.totalPages || undefined}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="duration" className="flex items-center">
                <Clock className="h-4 w-4 mr-2" />
                Reading Duration (minutes)
              </Label>
              <Input
                id="duration"
                name="duration"
                type="number"
                value={formState.duration}
                onChange={handleChange}
                min={1}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="summary">
                Session Summary <span className="text-slate-500 text-sm">(optional, but earns bonus XP!)</span>
              </Label>
              <Textarea
                id="summary"
                name="summary"
                value={formState.summary}
                onChange={handleChange}
                placeholder="Summarize what you read in this session. What were the key points or insights?"
                rows={5}
              />
              <p className="text-xs text-slate-500">
                Writing a summary of 50+ characters earns you bonus XP and helps reinforce your learning.
              </p>
            </div>
            
            <Button 
              type="submit" 
              className="w-full mt-6" 
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Recording Session...
                </>
              ) : (
                <>
                  <BookOpen className="mr-2 h-4 w-4" />
                  Record Reading Session
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
} 