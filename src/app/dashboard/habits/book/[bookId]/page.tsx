"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { BookReadingHabit } from "@/types/activities";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell
} from "@/components/ui/table";
import { toast } from "@/components/ui/use-toast";
import { 
  ArrowLeft, 
  BookOpen, 
  Clock, 
  Calendar, 
  Edit, 
  Plus, 
  CalendarClock,
  Pencil, 
  FileText,
  BookText,
  Award,
  Loader2
} from "lucide-react";
import { formatDistance, format } from "date-fns";

interface PageProps {
  params: {
    bookId: string;
  };
}

export default function BookDetailsPage({ params }: PageProps) {
  const router = useRouter();
  const [book, setBook] = useState<BookReadingHabit | null>(null);
  const [loading, setLoading] = useState(true);
  
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
  
  const calculateProgress = (book: BookReadingHabit["book"]) => {
    if (!book.totalPages || book.totalPages === 0) return 0;
    return Math.min(100, Math.round((book.currentPage / book.totalPages) * 100));
  };
  
  const getTotalPagesRead = (sessions: BookReadingHabit["readingSessions"]) => {
    return sessions.reduce((total, session) => total + (session.endPage - session.startPage), 0);
  };
  
  const getTotalReadingTime = (sessions: BookReadingHabit["readingSessions"]) => {
    return sessions.reduce((total, session) => total + session.duration, 0);
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
  const totalPagesRead = getTotalPagesRead(book.readingSessions);
  const totalReadingTime = getTotalReadingTime(book.readingSessions);
  
  return (
    <div className="container mx-auto py-6">
      <Button 
        variant="ghost" 
        onClick={() => router.push("/habits")}
        className="mb-6"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Habits
      </Button>
      
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{book.book.title}</h1>
          {book.book.author && (
            <p className="text-slate-500 dark:text-slate-400">
              by {book.book.author}
            </p>
          )}
        </div>
        <div className="flex gap-2 mt-4 md:mt-0">
          <Button
            variant="outline"
            onClick={() => router.push(`/habits/book/${book.id}/edit`)}
          >
            <Edit className="h-4 w-4 mr-2" />
            Edit Book
          </Button>
          <Button
            onClick={() => router.push(`/habits/book/${book.id}/record`)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Reading Session
          </Button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {progress}%
              <Badge 
                variant={progress === 100 ? 'success' : 'secondary'}
                className="ml-2"
              >
                {progress === 100 ? 'Completed' : 'In Progress'}
              </Badge>
            </div>
            <Progress 
              value={progress} 
              className="h-2 mt-2"
              indicatorClassName={progress === 100 ? "bg-emerald-500" : undefined}
            />
            <div className="mt-2 text-sm text-slate-500">
              Page {book.book.currentPage}
              {book.book.totalPages && <span> of {book.book.totalPages}</span>}
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Reading Stats</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-slate-500 flex items-center">
                  <BookText className="h-4 w-4 mr-2" />
                  Sessions
                </span>
                <span className="font-medium">{book.readingSessions.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-slate-500 flex items-center">
                  <FileText className="h-4 w-4 mr-2" />
                  Pages Read
                </span>
                <span className="font-medium">{totalPagesRead}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-slate-500 flex items-center">
                  <Clock className="h-4 w-4 mr-2" />
                  Total Time
                </span>
                <span className="font-medium">{totalReadingTime} minutes</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-slate-500 flex items-center">
                  <Award className="h-4 w-4 mr-2" />
                  Current Streak
                </span>
                <span className="font-medium">{book.currentStreak} days</span>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Book Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-slate-500 flex items-center">
                  <CalendarClock className="h-4 w-4 mr-2" />
                  Started
                </span>
                <span className="font-medium">{format(new Date(book.book.startDate), 'MMM d, yyyy')}</span>
              </div>
              
              {book.book.completionDate && (
                <div className="flex justify-between">
                  <span className="text-sm text-slate-500 flex items-center">
                    <Calendar className="h-4 w-4 mr-2" />
                    Completed
                  </span>
                  <span className="font-medium">{format(new Date(book.book.completionDate), 'MMM d, yyyy')}</span>
                </div>
              )}
              
              <div className="flex justify-between">
                <span className="text-sm text-slate-500 flex items-center">
                  <Pencil className="h-4 w-4 mr-2" />
                  Difficulty
                </span>
                <Badge variant="outline">{book.difficulty}</Badge>
              </div>
              
              <div className="flex justify-between">
                <span className="text-sm text-slate-500 flex items-center">
                  <BookOpen className="h-4 w-4 mr-2" />
                  Total XP
                </span>
                <Badge variant="secondary">{book.xp} XP</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <Tabs defaultValue="sessions" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="sessions">Reading Sessions</TabsTrigger>
          <TabsTrigger value="summaries">Summaries</TabsTrigger>
        </TabsList>
        
        <TabsContent value="sessions">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Pages</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Summary</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {book.readingSessions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-6 text-slate-500">
                        No reading sessions recorded yet
                      </TableCell>
                    </TableRow>
                  ) : (
                    book.readingSessions.map((session, index) => (
                      <TableRow key={index}>
                        <TableCell>{format(new Date(session.date), 'MMM d, yyyy')}</TableCell>
                        <TableCell>
                          {session.startPage} → {session.endPage}
                          <span className="text-xs text-slate-500 ml-1">
                            ({session.endPage - session.startPage} pages)
                          </span>
                        </TableCell>
                        <TableCell>{session.duration} min</TableCell>
                        <TableCell>
                          {session.summary ? (
                            <span className="text-xs text-slate-500">
                              {session.summary.substring(0, 50)}
                              {session.summary.length > 50 ? '...' : ''}
                            </span>
                          ) : (
                            <span className="text-xs text-slate-400">No summary</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm">
                            <FileText className="h-3.5 w-3.5" />
                            <span className="sr-only">View</span>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="summaries">
          <Card>
            <CardContent className="py-4">
              {book.readingSessions.filter(s => s.summary).length === 0 ? (
                <div className="text-center py-6 text-slate-500">
                  No reading summaries yet
                </div>
              ) : (
                <div className="space-y-6">
                  {book.readingSessions
                    .filter(s => s.summary && s.summary.trim().length > 0)
                    .map((session, index) => (
                      <div key={index} className="border-b border-slate-200 dark:border-slate-700 pb-4 last:border-0">
                        <div className="flex justify-between items-center mb-2">
                          <h3 className="font-medium">
                            Pages {session.startPage} - {session.endPage}
                          </h3>
                          <div className="text-sm text-slate-500">
                            {format(new Date(session.date), 'MMM d, yyyy')}
                          </div>
                        </div>
                        <p className="text-sm text-slate-600 dark:text-slate-300 whitespace-pre-line">
                          {session.summary}
                        </p>
                      </div>
                    ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
} 