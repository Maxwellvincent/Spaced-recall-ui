import { useState } from 'react';
import { Subject } from '@/types/study';
import { SyncCalendarButton } from '@/components/SyncCalendarButton';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, Calendar as CalendarIcon, Brain } from 'lucide-react';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { cn } from '@/lib/utils';

dayjs.extend(relativeTime);

interface SubjectReviewDashboardProps {
  subject: Subject;
  onSync?: () => void;
  themeStyles?: any;
}

export function SubjectReviewDashboard({ subject, onSync, themeStyles = {} }: SubjectReviewDashboardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Count upcoming reviews
  const upcomingReviews = subject.topics?.reduce((count, topic) => {
    // Count topic if it has a next review date
    if (topic.nextReview && dayjs(topic.nextReview).isAfter(dayjs())) {
      count++;
    }
    // Count concepts if they have next review dates
    topic.concepts?.forEach(concept => {
      if (concept.nextReview && dayjs(concept.nextReview).isAfter(dayjs())) {
        count++;
      }
    });
    return count;
  }, 0) || 0;

  // Get next review date
  const getNextReviewDate = () => {
    let nextDate: string | undefined;

    subject.topics?.forEach(topic => {
      if (topic.nextReview) {
        if (!nextDate || dayjs(topic.nextReview).isBefore(nextDate)) {
          nextDate = topic.nextReview;
        }
      }
      topic.concepts?.forEach(concept => {
        if (concept.nextReview) {
          if (!nextDate || dayjs(concept.nextReview).isBefore(nextDate)) {
            nextDate = concept.nextReview;
          }
        }
      });
    });

    return nextDate;
  };

  const nextReviewDate = getNextReviewDate();

  // Get review statistics
  const getReviewStats = () => {
    let totalReviews = 0;
    let completedReviews = 0;
    let averageMastery = 0;
    let itemsWithMastery = 0;

    subject.topics?.forEach(topic => {
      if (topic.masteryLevel !== undefined) {
        averageMastery += topic.masteryLevel;
        itemsWithMastery++;
      }
      if (topic.reviewLogs?.length) {
        totalReviews += topic.reviewLogs.length;
        completedReviews += topic.reviewLogs.filter(log => log.addedToCalendar).length;
      }
      
      topic.concepts?.forEach(concept => {
        if (concept.masteryLevel !== undefined) {
          averageMastery += concept.masteryLevel;
          itemsWithMastery++;
        }
        if (concept.reviewLogs?.length) {
          totalReviews += concept.reviewLogs.length;
          completedReviews += concept.reviewLogs.filter(log => log.addedToCalendar).length;
        }
      });
    });

    return {
      totalReviews,
      completedReviews,
      averageMastery: itemsWithMastery ? Math.round(averageMastery / itemsWithMastery) : 0
    };
  };

  const stats = getReviewStats();

  return (
    <Card className={`${themeStyles.cardBg || 'border-slate-800 bg-slate-950 backdrop-blur-sm'}`}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className={`text-xl ${themeStyles.textPrimary || 'text-slate-100'}`}>Review Dashboard</CardTitle>
        <SyncCalendarButton subject={subject} onSync={onSync} />
      </CardHeader>
      <CardContent>
        <div className="grid gap-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className={`flex items-center space-x-4 rounded-lg ${themeStyles.border || 'border-slate-800'} ${themeStyles.cardBg || 'bg-slate-900/80'} p-4 transition-colors hover:bg-slate-800/80`}>
              <CalendarIcon className={`h-8 w-8 ${themeStyles.accent || 'text-blue-500'}`} />
              <div>
                <p className={`text-sm font-medium ${themeStyles.textSecondary || 'text-slate-300'}`}>Next Review</p>
                <p className={`text-2xl font-bold ${themeStyles.textPrimary || 'text-slate-100'}`}>
                  {nextReviewDate 
                    ? dayjs(nextReviewDate).fromNow()
                    : 'No reviews scheduled'}
                </p>
              </div>
            </div>

            <div className={`flex items-center space-x-4 rounded-lg ${themeStyles.border || 'border-slate-800'} ${themeStyles.cardBg || 'bg-slate-900/80'} p-4 transition-colors hover:bg-slate-800/80`}>
              <Clock className={`h-8 w-8 ${themeStyles.accent || 'text-emerald-500'}`} />
              <div>
                <p className={`text-sm font-medium ${themeStyles.textSecondary || 'text-slate-300'}`}>Upcoming Reviews</p>
                <p className={`text-2xl font-bold ${themeStyles.textPrimary || 'text-slate-100'}`}>{upcomingReviews}</p>
              </div>
            </div>

            <div className={`flex items-center space-x-4 rounded-lg ${themeStyles.border || 'border-slate-800'} ${themeStyles.cardBg || 'bg-slate-900/80'} p-4 transition-colors hover:bg-slate-800/80`}>
              <Brain className={`h-8 w-8 ${themeStyles.accent || 'text-purple-500'}`} />
              <div>
                <p className={`text-sm font-medium ${themeStyles.textSecondary || 'text-slate-300'}`}>Average Mastery</p>
                <p className={`text-2xl font-bold ${themeStyles.textPrimary || 'text-slate-100'}`}>{stats.averageMastery}%</p>
              </div>
            </div>
          </div>

          <div className={`flex items-center justify-between rounded-lg ${themeStyles.border || 'border-slate-800'} ${themeStyles.cardBg || 'bg-slate-900/80'} p-4`}>
            <div className="space-y-1">
              <p className={`text-sm font-medium ${themeStyles.textSecondary || 'text-slate-300'}`}>Review Progress</p>
              <div className="flex items-center space-x-2">
                <p className={`text-lg font-semibold ${themeStyles.textPrimary || 'text-slate-100'}`}>
                  {stats.completedReviews} of {stats.totalReviews} reviews completed
                </p>
                <Badge 
                  variant="outline" 
                  className={cn(
                    "ml-2",
                    stats.completedReviews === stats.totalReviews 
                      ? `${themeStyles.border || 'border-green-500'} ${themeStyles.textPrimary || 'text-green-500'}`
                      : `${themeStyles.border || 'border-blue-500'} ${themeStyles.accent || 'text-blue-500'}`
                  )}
                >
                  {Math.round((stats.completedReviews / (stats.totalReviews || 1)) * 100)}%
                </Badge>
              </div>
            </div>
            {subject.calendarSynced && (
              <Badge variant="outline" className={`${themeStyles.border || 'border-green-500'} ${themeStyles.textPrimary || 'text-green-500'}`}>
                Synced with Calendar
              </Badge>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 