import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Calendar, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Subject, Topic, Concept } from '@/types/study';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { generateCalendarDescription } from '@/lib/calendar';
import { checkGoogleCalendarAuth, initiateGoogleCalendarAuth } from '@/lib/googleAuth';

interface SyncCalendarButtonProps {
  subject: Subject;
  onSync?: () => void;
}

interface ReviewToSync {
  item: Topic | Concept;
  parentTopic?: Topic;
  nextReview: Date;
}

export function SyncCalendarButton({ subject, onSync }: SyncCalendarButtonProps) {
  const [isSyncing, setIsSyncing] = useState(false);

  const findUnscheduledReviews = (): ReviewToSync[] => {
    const unscheduledReviews: ReviewToSync[] = [];

    // Check topics
    subject.topics?.forEach(topic => {
      const lastLog = topic.reviewLogs?.[topic.reviewLogs.length - 1];
      if (topic.nextReview && (!lastLog?.addedToCalendar || !lastLog?.calendarEventId)) {
        unscheduledReviews.push({
          item: topic,
          nextReview: topic.nextReview
        });
      }

      // Check concepts within topics
      topic.concepts?.forEach(concept => {
        const conceptLastLog = concept.reviewLogs?.[concept.reviewLogs.length - 1];
        if (concept.nextReview && (!conceptLastLog?.addedToCalendar || !conceptLastLog?.calendarEventId)) {
          unscheduledReviews.push({
            item: concept,
            parentTopic: topic,
            nextReview: concept.nextReview
          });
        }
      });
    });

    return unscheduledReviews;
  };

  const handleSync = async () => {
    setIsSyncing(true);

    try {
      // Check Google Calendar authentication first
      const isAuthenticated = await checkGoogleCalendarAuth();
      
      if (!isAuthenticated) {
        // Store sync request in localStorage
        localStorage.setItem('pendingCalendarSync', JSON.stringify({
          subjectId: subject.id,
          subjectName: subject.name
        }));
        
        // Redirect to Google Calendar auth
        await initiateGoogleCalendarAuth();
        return;
      }

      const unscheduledReviews = findUnscheduledReviews();

      if (unscheduledReviews.length === 0) {
        toast.info('No reviews to sync', {
          description: 'All scheduled reviews are already in your calendar'
        });
        return;
      }

      let successCount = 0;
      let failureCount = 0;

      // Add each review to calendar
      for (const review of unscheduledReviews) {
        try {
          const response = await fetch('/api/calendar/add-event', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              title: `Review: ${review.item.name}`,
              description: generateCalendarDescription(review.item, review.parentTopic),
              startDate: review.nextReview,
              durationMinutes: 30
            }),
          });

          if (!response.ok) {
            throw new Error('Failed to add event to calendar');
          }

          const data = await response.json();
          
          // Update the review log
          const lastLog = review.item.reviewLogs?.[review.item.reviewLogs.length - 1];
          if (lastLog) {
            lastLog.addedToCalendar = true;
            lastLog.calendarEventId = data.eventId;
          }

          successCount++;
        } catch (error) {
          console.error('Error adding review to calendar:', error);
          failureCount++;
        }
      }

      // Update subject in Firestore
      const subjectRef = doc(db, 'subjects', subject.id);
      await updateDoc(subjectRef, {
        topics: subject.topics,
        calendarSynced: true
      });

      // Show summary toast
      if (successCount > 0) {
        toast.success('Reviews synced to calendar', {
          description: `Successfully added ${successCount} review${successCount === 1 ? '' : 's'} to your calendar${
            failureCount > 0 ? `. ${failureCount} failed` : ''
          }`
        });
      } else if (failureCount > 0) {
        toast.error('Failed to sync reviews', {
          description: `Could not add ${failureCount} review${failureCount === 1 ? '' : 's'} to your calendar`
        });
      }

      // Call onSync callback if provided
      onSync?.();

    } catch (error) {
      console.error('Error syncing calendar:', error);
      
      if (error.message.includes('User not authenticated')) {
        toast.error('Please sign in', {
          description: 'You need to be signed in to sync with your calendar'
        });
      } else if (error.message.includes('No Google access token found')) {
        toast.error('Google Calendar not connected', {
          description: 'Please connect your Google Calendar in settings first'
        });
      } else {
        toast.error('Failed to sync calendar', {
          description: error.message || 'Please try again later'
        });
      }
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <Button
      onClick={handleSync}
      disabled={isSyncing}
      variant="outline"
      size="sm"
      className="text-slate-300 hover:text-white hover:bg-slate-700"
    >
      {isSyncing ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <Calendar className="mr-2 h-4 w-4" />
      )}
      {isSyncing ? 'Syncing Calendar...' : 'Sync All Reviews'}
    </Button>
  );
} 