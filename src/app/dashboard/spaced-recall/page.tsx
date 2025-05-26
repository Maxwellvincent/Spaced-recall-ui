"use client";

import { useState, useEffect } from "react";
import React from "react";
import { useRouter } from "next/navigation";
import { getFirebaseDb } from "@/lib/firebase";
import { collection, query, where, getDocs, doc, updateDoc } from "firebase/firestore";
import { useAuth } from "@/lib/auth";
import { format, isPast, isToday, isTomorrow, addDays, isAfter, isBefore } from "date-fns";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Calendar, Brain, Filter, Search, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SpacedRecallCard } from "@/components/SpacedRecallCard";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { SpacedRecallScheduler } from "@/components/SpacedRecallScheduler";
import { Subject, Topic, Concept } from "@/types/study";
import { toast } from "@/components/ui/use-toast";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface ReviewItem {
  id: string;
  type: 'topic' | 'concept';
  subjectId: string;
  subjectName: string;
  parentTopicName?: string;
  item: Topic | Concept;
  dueDate: Date | null;
}

export default function SpacedRecallPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [reviewItems, setReviewItems] = useState<ReviewItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<ReviewItem[]>([]);
  const [filter, setFilter] = useState<'all' | 'overdue' | 'today' | 'upcoming'>('all');
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedItem, setSelectedItem] = useState<ReviewItem | null>(null);
  const [isReviewDialogOpen, setIsReviewDialogOpen] = useState(false);
  const [reviewStats, setReviewStats] = useState({
    total: 0,
    overdue: 0,
    today: 0,
    upcoming: 0,
    completed: 0,
    completionRate: 0
  });
  const db = getFirebaseDb();

  // Fetch subjects and extract review items
  useEffect(() => {
    const fetchReviewItems = async () => {
      if (!user) return;
      
      try {
        setLoading(true);
        console.log("Fetching review items for user:", user.uid);
        
        // Get all subjects for the user
        const subjectsRef = collection(db, "subjects");
        const q = query(subjectsRef, where("userId", "==", user.uid));
        console.log("Executing Firestore query...");
        const querySnapshot = await getDocs(q);
        console.log(`Found ${querySnapshot.size} subjects`);
        
        const items: ReviewItem[] = [];
        
        // Process each subject
        querySnapshot.forEach((doc) => {
          console.log(`Processing subject: ${doc.id}`);
          const subject = doc.data() as Subject;
          
          // Make sure topics array exists
          if (!subject.topics || !Array.isArray(subject.topics)) {
            console.warn(`Subject ${doc.id} has no topics or topics is not an array`);
            return;
          }
          
          // Process topics
          subject.topics.forEach(topic => {
            if (!topic) {
              console.warn(`Found null or undefined topic in subject ${doc.id}`);
              return;
            }
            
            // Skip unstudied topics (no study sessions or never studied)
            const hasTopicBeenStudied = 
              (topic.studySessions && topic.studySessions.length > 0) || 
              (topic.lastStudied && topic.lastStudied.length > 0);
            
            if (!hasTopicBeenStudied) {
              console.log(`Skipping unstudied topic: ${topic.name}`);
              return;
            }
            
            if (topic.nextReview) {
              try {
                const dueDate = new Date(topic.nextReview);
                if (!isNaN(dueDate.getTime())) {
                  items.push({
                    id: `topic-${subject.id}-${topic.name}`,
                    type: 'topic',
                    subjectId: doc.id,
                    subjectName: subject.name,
                    item: topic,
                    dueDate
                  });
                } else {
                  console.warn(`Invalid nextReview date for topic ${topic.name} in subject ${doc.id}`);
                }
              } catch (error) {
                console.error(`Error processing topic ${topic.name}:`, error);
              }
            }
            
            // Make sure concepts array exists
            if (!topic.concepts || !Array.isArray(topic.concepts)) {
              console.warn(`Topic ${topic.name} in subject ${doc.id} has no concepts or concepts is not an array`);
              return;
            }
            
            // Process concepts
            topic.concepts.forEach(concept => {
              if (!concept) {
                console.warn(`Found null or undefined concept in topic ${topic.name}`);
                return;
              }
              
              // Skip unstudied concepts (no study sessions or never studied)
              const hasConceptBeenStudied = 
                (concept.studySessions && concept.studySessions.length > 0) || 
                (concept.lastStudied && concept.lastStudied.length > 0);
              
              if (!hasConceptBeenStudied) {
                console.log(`Skipping unstudied concept: ${concept.name}`);
                return;
              }
              
              if (concept.nextReview) {
                try {
                  const dueDate = new Date(concept.nextReview);
                  if (!isNaN(dueDate.getTime())) {
                    items.push({
                      id: `concept-${subject.id}-${topic.name}-${concept.name}`,
                      type: 'concept',
                      subjectId: doc.id,
                      subjectName: subject.name,
                      parentTopicName: topic.name,
                      item: concept,
                      dueDate
                    });
                  } else {
                    console.warn(`Invalid nextReview date for concept ${concept.name} in topic ${topic.name}`);
                  }
                } catch (error) {
                  console.error(`Error processing concept ${concept.name}:`, error);
                }
              }
            });
          });
        });
        
        console.log(`Total review items found: ${items.length}`);
        
        // Sort by due date (oldest first)
        const sortedItems = items.sort((a, b) => {
          if (!a.dueDate) return 1;
          if (!b.dueDate) return -1;
          return a.dueDate.getTime() - b.dueDate.getTime();
        });
        
        setReviewItems(sortedItems);
        applyFilters(sortedItems, filter, searchQuery);
      } catch (error) {
        console.error("Error fetching review items:", error);
        toast({
          title: "Error",
          description: "Failed to load review items. Please try again.",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
        console.log("Finished loading review items");
      }
    };
    
    fetchReviewItems();
  }, [user]);
  
  // Apply filters when filter or search query changes
  const applyFilters = (items: ReviewItem[], currentFilter: string, query: string) => {
    const now = new Date();
    const tomorrow = addDays(now, 1);
    
    // First apply date filter
    let filtered = items;
    
    if (currentFilter === 'overdue') {
      filtered = items.filter(item => 
        item.dueDate && isPast(item.dueDate) && !isToday(item.dueDate)
      );
    } else if (currentFilter === 'today') {
      filtered = items.filter(item => 
        item.dueDate && isToday(item.dueDate)
      );
    } else if (currentFilter === 'upcoming') {
      filtered = items.filter(item => 
        item.dueDate && 
        (isTomorrow(item.dueDate) || 
         (isAfter(item.dueDate, tomorrow) && isBefore(item.dueDate, addDays(now, 7))))
      );
    }
    
    // Then apply search query if present
    if (query.trim()) {
      const lowerQuery = query.toLowerCase();
      filtered = filtered.filter(item => 
        item.item.name.toLowerCase().includes(lowerQuery) || 
        item.subjectName.toLowerCase().includes(lowerQuery) ||
        (item.parentTopicName && item.parentTopicName.toLowerCase().includes(lowerQuery))
      );
    }
    
    setFilteredItems(filtered);
  };
  
  // Handle filter change
  const handleFilterChange = (newFilter: 'all' | 'overdue' | 'today' | 'upcoming') => {
    setFilter(newFilter);
    applyFilters(reviewItems, newFilter, searchQuery);
  };
  
  // Handle search
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    applyFilters(reviewItems, filter, query);
  };
  
  // Open review dialog
  const handleReviewClick = (item: ReviewItem) => {
    setSelectedItem(item);
    setIsReviewDialogOpen(true);
  };
  
  // Handle review scheduling
  const handleScheduleUpdate = async (date: Date, reviewLog?: { rating: number; date: Date; interval: number }) => {
    if (!selectedItem) return;
    
    try {
      const { subjectId, item, type, parentTopicName } = selectedItem;
      
      // Create a new review log with proper validation
      const newReviewLog = {
        date: reviewLog?.date ? reviewLog.date.toISOString() : new Date().toISOString(),
        rating: reviewLog?.rating || 3,
        interval: reviewLog?.interval || 1,
        addedToCalendar: false
      };
      
      // Update the item with new review data
      const subjectRef = doc(db, "subjects", subjectId);
      const subjectDoc = await getDocs(query(collection(db, "subjects"), where("id", "==", subjectId)));
      
      if (subjectDoc.empty) {
        throw new Error("Subject not found");
      }
      
      const subject = subjectDoc.docs[0].data() as Subject;
      
      // Update the subject with the new review data
      if (type === 'topic') {
        // Update topic
        const updatedTopics = subject.topics.map(t => {
          if (t.name === item.name) {
            return {
              ...t,
              nextReview: date.toISOString(),
              reviewInterval: reviewLog?.interval || 1,
              reviewLogs: [...(t.reviewLogs || []), newReviewLog]
            };
          }
          return t;
        });
        
        await updateDoc(subjectRef, { topics: updatedTopics });
      } else {
        // Update concept
        const updatedTopics = subject.topics.map(t => {
          if (t.name === parentTopicName) {
            const updatedConcepts = t.concepts.map(c => {
              if (c.name === item.name) {
                return {
                  ...c,
                  nextReview: date.toISOString(),
                  reviewInterval: reviewLog?.interval || 1,
                  reviewLogs: [...(c.reviewLogs || []), newReviewLog]
                };
              }
              return c;
            });
            
            return {
              ...t,
              concepts: updatedConcepts
            };
          }
          return t;
        });
        
        await updateDoc(subjectRef, { topics: updatedTopics });
      }
      
      // Close dialog and refresh data
      setIsReviewDialogOpen(false);
      
      // Update local state
      const updatedItems = reviewItems.map(ri => {
        if (ri.id === selectedItem.id) {
          return {
            ...ri,
            item: {
              ...ri.item,
              nextReview: date.toISOString(),
              reviewInterval: reviewLog?.interval || 1,
              reviewLogs: [...(ri.item.reviewLogs || []), newReviewLog]
            },
            dueDate: date
          };
        }
        return ri;
      });
      
      setReviewItems(updatedItems);
      applyFilters(updatedItems, filter, searchQuery);
      
      toast({
        title: "Review scheduled",
        description: `Next review scheduled for ${format(date, "PPP")}`,
      });
    } catch (error) {
      console.error("Error updating review schedule:", error);
      toast({
        title: "Error",
        description: "Failed to schedule review. Please try again.",
        variant: "destructive"
      });
    }
  };
  
  // Calculate review statistics
  useEffect(() => {
    if (reviewItems.length > 0) {
      const now = new Date();
      const tomorrow = addDays(now, 1);
      
      const overdueCount = reviewItems.filter(item => 
        item.dueDate && isPast(item.dueDate) && !isToday(item.dueDate)
      ).length;
      
      const todayCount = reviewItems.filter(item => 
        item.dueDate && isToday(item.dueDate)
      ).length;
      
      const upcomingCount = reviewItems.filter(item => 
        item.dueDate && 
        (isTomorrow(item.dueDate) || 
         (isAfter(item.dueDate, tomorrow) && isBefore(item.dueDate, addDays(now, 7))))
      ).length;
      
      // Calculate completed items based on review logs
      const completedCount = reviewItems.reduce((count, item) => {
        const reviewLogs = item.item.reviewLogs || [];
        const hasReviewedToday = reviewLogs.some(log => {
          try {
            const logDate = new Date(log.date);
            return isToday(logDate);
          } catch (e) {
            return false;
          }
        });
        return hasReviewedToday ? count + 1 : count;
      }, 0);
      
      const totalDueToday = overdueCount + todayCount;
      const completionRate = totalDueToday > 0 ? (completedCount / totalDueToday) * 100 : 0;
      
      setReviewStats({
        total: reviewItems.length,
        overdue: overdueCount,
        today: todayCount,
        upcoming: upcomingCount,
        completed: completedCount,
        completionRate
      });
    }
  }, [reviewItems]);
  
  // Loading state
  if (authLoading || loading) {
    console.log("Showing loading state. Auth loading:", authLoading, "Data loading:", loading);
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Loading your review schedule...</p>
        </div>
      </div>
    );
  }
  
  // Not logged in
  if (!user) {
    console.log("No user found, redirecting to login");
    router.push("/login");
    return null;
  }
  
  console.log("Rendering spaced recall page with", filteredItems.length, "filtered items");
  
  return (
    <div className="container py-8 max-w-7xl">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold mb-2 text-slate-100 flex items-center">
            <Brain className="h-8 w-8 mr-3 text-blue-500" />
            Spaced Recall
          </h1>
          <p className="text-slate-400">
            Review your topics and concepts based on optimal spacing intervals
          </p>
        </div>
        
        <div className="flex items-center gap-2 px-4 py-2 bg-slate-800/50 rounded-lg border border-slate-700">
          <Calendar className="h-5 w-5 text-blue-400" />
          <span className="text-slate-200 font-medium">
            {format(new Date(), "EEEE, MMMM d")}
          </span>
        </div>
      </div>
      
      {/* New Progress Summary Component */}
      {reviewItems.length > 0 && (
        <div className="mb-8 bg-slate-800/40 rounded-xl border border-slate-700 p-5">
          <h2 className="text-lg font-medium text-slate-100 mb-4">Review Progress</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-slate-800/70 rounded-lg p-4 border border-slate-700 flex items-center">
              <div className="p-2 rounded-full bg-red-500/20 mr-3">
                <AlertCircle className="h-5 w-5 text-red-400" />
              </div>
              <div>
                <p className="text-sm text-slate-400">Overdue</p>
                <p className="text-xl font-medium text-slate-100">{reviewStats.overdue}</p>
              </div>
            </div>
            
            <div className="bg-slate-800/70 rounded-lg p-4 border border-slate-700 flex items-center">
              <div className="p-2 rounded-full bg-blue-500/20 mr-3">
                <Clock className="h-5 w-5 text-blue-400" />
              </div>
              <div>
                <p className="text-sm text-slate-400">Today</p>
                <p className="text-xl font-medium text-slate-100">{reviewStats.today}</p>
              </div>
            </div>
            
            <div className="bg-slate-800/70 rounded-lg p-4 border border-slate-700 flex items-center">
              <div className="p-2 rounded-full bg-green-500/20 mr-3">
                <Calendar className="h-5 w-5 text-green-400" />
              </div>
              <div>
                <p className="text-sm text-slate-400">Upcoming</p>
                <p className="text-xl font-medium text-slate-100">{reviewStats.upcoming}</p>
              </div>
            </div>
            
            <div className="bg-slate-800/70 rounded-lg p-4 border border-slate-700 flex items-center">
              <div className="p-2 rounded-full bg-emerald-500/20 mr-3">
                <CheckCircle2 className="h-5 w-5 text-emerald-400" />
              </div>
              <div>
                <p className="text-sm text-slate-400">Completed</p>
                <p className="text-xl font-medium text-slate-100">{reviewStats.completed}</p>
              </div>
            </div>
          </div>
          
          <div className="space-y-2">
            <div className="flex justify-between items-center text-sm mb-1">
              <span className="text-slate-300">Today's completion</span>
              <span className="font-medium text-slate-200">{reviewStats.completionRate.toFixed(0)}%</span>
            </div>
            <div className="h-2 w-full bg-slate-700 rounded-full overflow-hidden">
              <div 
                className={cn(
                  "h-full rounded-full transition-all duration-500",
                  reviewStats.completionRate < 30 ? "bg-red-500" :
                  reviewStats.completionRate < 70 ? "bg-yellow-500" :
                  "bg-green-500"
                )}
                style={{ width: `${reviewStats.completionRate}%` }}
              />
            </div>
            <p className="text-xs text-slate-400 mt-2">
              {reviewStats.completed} of {reviewStats.overdue + reviewStats.today} due reviews completed today
            </p>
          </div>
        </div>
      )}
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <Tabs 
          defaultValue="all" 
          value={filter}
          onValueChange={(value) => handleFilterChange(value as any)}
          className="w-full md:w-auto"
        >
          <TabsList className="grid grid-cols-4 w-full md:w-auto bg-slate-800/50 border border-slate-700">
            <TabsTrigger value="all" className="data-[state=active]:bg-slate-700 data-[state=active]:text-slate-100">All</TabsTrigger>
            <TabsTrigger value="overdue" className="data-[state=active]:bg-red-900/60 data-[state=active]:text-slate-100">Overdue</TabsTrigger>
            <TabsTrigger value="today" className="data-[state=active]:bg-blue-900/60 data-[state=active]:text-slate-100">Today</TabsTrigger>
            <TabsTrigger value="upcoming" className="data-[state=active]:bg-green-900/60 data-[state=active]:text-slate-100">Upcoming</TabsTrigger>
          </TabsList>
        </Tabs>
        
        <div className="relative w-full md:w-64">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search reviews..."
            className="pl-9 bg-slate-800/50 border-slate-700 focus:border-slate-600 text-slate-200"
            value={searchQuery}
            onChange={handleSearch}
          />
        </div>
      </div>
      
      {filteredItems.length === 0 ? (
        <div className="text-center py-12 border rounded-lg bg-slate-800/20 border-slate-700">
          <Brain className="h-12 w-12 mx-auto text-slate-500 mb-4" />
          <h3 className="text-xl font-medium mb-2 text-slate-300">No reviews scheduled</h3>
          <p className="text-slate-400 mb-4">
            {filter !== 'all' 
              ? `No items found for the selected filter. Try changing your filter.` 
              : `You don't have any items scheduled for review yet.`}
          </p>
          <Button 
            variant="outline" 
            onClick={() => router.push('/subjects')}
            className="bg-slate-800 border-slate-600 hover:bg-slate-700 text-slate-200"
          >
            Go to Subjects
          </Button>
        </div>
      ) : (
        <>
          <div className="mb-6 flex justify-between items-center">
            <div className="text-slate-300 text-sm">
              <span className="font-medium">{filteredItems.length}</span> {filteredItems.length === 1 ? 'item' : 'items'} found
              {filter !== 'all' && <span className="ml-1">in <span className="font-medium">{filter}</span> filter</span>}
            </div>
            
            {filter === 'overdue' && filteredItems.length > 0 && (
              <div className="bg-red-900/20 px-3 py-1.5 rounded-md border border-red-900/50 text-sm text-red-400">
                <span className="font-medium">{filteredItems.length}</span> overdue {filteredItems.length === 1 ? 'review' : 'reviews'} need attention
              </div>
            )}
            
            {filter === 'today' && filteredItems.length > 0 && (
              <div className="bg-blue-900/20 px-3 py-1.5 rounded-md border border-blue-900/50 text-sm text-blue-400">
                <span className="font-medium">{filteredItems.length}</span> {filteredItems.length === 1 ? 'review' : 'reviews'} scheduled for today
              </div>
            )}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredItems.map(item => (
              <SpacedRecallCard
                key={item.id}
                item={item.item}
                subjectId={item.subjectId}
                parentTopicName={item.parentTopicName}
                onReviewClick={() => handleReviewClick(item)}
              />
            ))}
          </div>
        </>
      )}
      
      {/* Review Dialog */}
      <Dialog open={isReviewDialogOpen} onOpenChange={setIsReviewDialogOpen}>
        <DialogContent className="sm:max-w-md bg-slate-900 border-slate-700">
          <DialogHeader>
            <DialogTitle className="text-slate-100">Review: {selectedItem?.item?.name || ''}</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="text-sm text-slate-400 mb-2">
              <p>Rate how well you recalled this {selectedItem?.type || ''} and schedule your next review.</p>
            </div>
            
            {selectedItem && (
              <SpacedRecallScheduler
                topic={selectedItem.type === 'topic' ? selectedItem.item as Topic : undefined}
                concept={selectedItem.type === 'concept' ? selectedItem.item as Concept : undefined}
                onScheduleUpdate={handleScheduleUpdate}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
} 