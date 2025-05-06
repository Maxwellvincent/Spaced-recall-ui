"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import { useAuth } from "@/lib/auth";
import { format, isPast, isToday, isTomorrow, addDays, isAfter, isBefore } from "date-fns";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Calendar, Brain, Filter, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SpacedRecallCard } from "@/components/SpacedRecallCard";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { SpacedRecallScheduler } from "@/components/SpacedRecallScheduler";
import { Subject, Topic, Concept } from "@/types/study";
import { toast } from "@/components/ui/use-toast";

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

  // Fetch subjects and extract review items
  useEffect(() => {
    const fetchReviewItems = async () => {
      if (!user) return;
      
      try {
        setLoading(true);
        
        // Get all subjects for the user
        const subjectsRef = collection(db, "subjects");
        const q = query(subjectsRef, where("userId", "==", user.uid));
        const querySnapshot = await getDocs(q);
        
        const items: ReviewItem[] = [];
        
        // Process each subject
        querySnapshot.forEach((doc) => {
          const subject = doc.data() as Subject;
          
          // Process topics
          subject.topics?.forEach(topic => {
            if (topic.nextReview) {
              items.push({
                id: `topic-${subject.id}-${topic.name}`,
                type: 'topic',
                subjectId: doc.id,
                subjectName: subject.name,
                item: topic,
                dueDate: new Date(topic.nextReview)
              });
            }
            
            // Process concepts
            topic.concepts?.forEach(concept => {
              if (concept.nextReview) {
                items.push({
                  id: `concept-${subject.id}-${topic.name}-${concept.name}`,
                  type: 'concept',
                  subjectId: doc.id,
                  subjectName: subject.name,
                  parentTopicName: topic.name,
                  item: concept,
                  dueDate: new Date(concept.nextReview)
                });
              }
            });
          });
        });
        
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
      
      // Create a new review log
      const newReviewLog = {
        date: reviewLog?.date.toISOString() || new Date().toISOString(),
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
  
  // Loading state
  if (authLoading || loading) {
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
    router.push("/login");
    return null;
  }
  
  return (
    <div className="container py-8 max-w-7xl">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold mb-2">Spaced Recall</h1>
          <p className="text-muted-foreground">
            Review your topics and concepts based on optimal spacing intervals
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-primary" />
          <span>
            {format(new Date(), "EEEE, MMMM d")}
          </span>
        </div>
      </div>
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <Tabs 
          defaultValue="all" 
          value={filter}
          onValueChange={(value) => handleFilterChange(value as any)}
          className="w-full md:w-auto"
        >
          <TabsList className="grid grid-cols-4 w-full md:w-auto">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="overdue">Overdue</TabsTrigger>
            <TabsTrigger value="today">Today</TabsTrigger>
            <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
          </TabsList>
        </Tabs>
        
        <div className="relative w-full md:w-64">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search reviews..."
            className="pl-9"
            value={searchQuery}
            onChange={handleSearch}
          />
        </div>
      </div>
      
      {filteredItems.length === 0 ? (
        <div className="text-center py-12 border rounded-lg bg-muted/20">
          <Brain className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-xl font-medium mb-2">No reviews scheduled</h3>
          <p className="text-muted-foreground mb-4">
            {filter !== 'all' 
              ? `No items found for the selected filter. Try changing your filter.` 
              : `You don't have any items scheduled for review yet.`}
          </p>
          <Button 
            variant="outline" 
            onClick={() => router.push('/subjects')}
          >
            Go to Subjects
          </Button>
        </div>
      ) : (
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
      )}
      
      {/* Review Dialog */}
      <Dialog open={isReviewDialogOpen} onOpenChange={setIsReviewDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Review: {selectedItem?.item.name}</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="text-sm text-muted-foreground mb-2">
              <p>Rate how well you recalled this {selectedItem?.type} and schedule your next review.</p>
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