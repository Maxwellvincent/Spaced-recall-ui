import { useState, useEffect } from 'react';
import { Subject } from '@/types/study';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
import Switch from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, BookOpen, Archive, PauseCircle, AlertCircle, Clock } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { doc, updateDoc } from 'firebase/firestore';
import { getFirebaseDb } from '@/lib/firebase';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { adjustReviewSchedule } from '@/lib/fsrs';

interface ExamModeSettingsProps {
  subject: Subject;
  onUpdate: () => void;
}

// Use getFirebaseDb() to ensure proper initialization
const db = getFirebaseDb();

export function ExamModeSettings({ subject, onUpdate }: ExamModeSettingsProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [examDate, setExamDate] = useState<Date | undefined>(
    subject.examMode?.scheduledDate ? new Date(subject.examMode.scheduledDate) : undefined
  );
  const [examScore, setExamScore] = useState<string>(
    subject.examMode?.score?.toString() || ''
  );
  const [isSuspended, setIsSuspended] = useState(
    subject.examMode?.isSuspended || false
  );

  // Get review recommendations if exam mode is active
  const reviewPlan = subject.examMode?.isActive && examDate 
    ? adjustReviewSchedule(subject)
    : null;

  const handleExamModeToggle = async (enabled: boolean) => {
    setIsUpdating(true);
    try {
      const subjectRef = doc(db, 'subjects', subject.id);
      await updateDoc(subjectRef, {
        'examMode.isActive': enabled,
        'examMode.scheduledDate': enabled && examDate ? examDate.toISOString() : null,
        ...(enabled ? {} : { 'examMode.completed': false, 'examMode.score': null })
      });
      
      toast.success(enabled ? 'Exam mode activated' : 'Exam mode deactivated');
      onUpdate();
    } catch (error) {
      console.error('Error updating exam mode:', error);
      toast.error('Failed to update exam mode');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleExamComplete = async () => {
    if (!examScore) {
      toast.error('Please enter an exam score');
      return;
    }

    const score = parseFloat(examScore);
    if (isNaN(score) || score < 0 || score > 100) {
      toast.error('Please enter a valid score between 0 and 100');
      return;
    }

    setIsUpdating(true);
    try {
      const subjectRef = doc(db, 'subjects', subject.id);
      await updateDoc(subjectRef, {
        'examMode.completed': true,
        'examMode.completedDate': new Date().toISOString(),
        'examMode.score': score,
        status: 'completed'
      });
      
      toast.success('Exam completed successfully');
      onUpdate();
    } catch (error) {
      console.error('Error completing exam:', error);
      toast.error('Failed to complete exam');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSuspendToggle = async () => {
    setIsUpdating(true);
    try {
      const subjectRef = doc(db, 'subjects', subject.id);
      await updateDoc(subjectRef, {
        'examMode.isSuspended': !isSuspended,
        'examMode.suspendedDate': !isSuspended ? new Date().toISOString() : null
      });
      
      setIsSuspended(!isSuspended);
      toast.success(isSuspended ? 'Reviews resumed' : 'Reviews suspended');
      onUpdate();
    } catch (error) {
      console.error('Error toggling suspend state:', error);
      toast.error('Failed to update review status');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDateSelect = async (date: Date | undefined) => {
    setExamDate(date);
    if (subject.examMode?.isActive) {
      setIsUpdating(true);
      try {
        const subjectRef = doc(db, 'subjects', subject.id);
        await updateDoc(subjectRef, {
          'examMode.scheduledDate': date?.toISOString() || null
        });
        toast.success('Exam date updated');
        onUpdate();
      } catch (error) {
        console.error('Error updating exam date:', error);
        toast.error('Failed to update exam date');
      } finally {
        setIsUpdating(false);
      }
    }
  };

  return (
    <Card className="border-slate-800 bg-slate-900/50 backdrop-blur-sm">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex items-center space-x-2">
          <CardTitle className="text-xl text-slate-100">Exam Mode</CardTitle>
          {subject.examMode?.isActive && examDate && (
            <Badge variant={
              differenceInDays(new Date(examDate), new Date()) <= 7 
                ? "destructive" 
                : differenceInDays(new Date(examDate), new Date()) <= 14 
                ? "warning" 
                : "default"
            }>
              {differenceInDays(new Date(examDate), new Date())} days until exam
            </Badge>
          )}
        </div>
        <Switch
          checked={subject.examMode?.isActive || false}
          onCheckedChange={handleExamModeToggle}
          disabled={isUpdating || subject.examMode?.completed}
        />
      </CardHeader>
      <CardContent className="space-y-4">
        {subject.examMode?.isActive && !subject.examMode?.completed && (
          <>
            <div className="space-y-2">
              <Label htmlFor="exam-date">Exam Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !examDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {examDate ? format(examDate, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={examDate}
                    onSelect={handleDateSelect}
                    disabled={(date) => date < new Date()}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {reviewPlan && (
              <div className="space-y-4 mt-6">
                <div className="border-l-4 border-yellow-500 pl-4 py-2 bg-yellow-500/10 rounded">
                  <p className="text-yellow-400 font-medium">{reviewPlan.message}</p>
                </div>

                <div className="space-y-4">
                  {reviewPlan.recommendations.map((rec, index) => (
                    <div key={index} className="space-y-2">
                      <div className="flex items-center space-x-2">
                        {rec.priority === 'Immediate' && <AlertCircle className="h-4 w-4 text-red-500" />}
                        {rec.priority === 'High' && <AlertCircle className="h-4 w-4 text-yellow-500" />}
                        {rec.priority === 'Normal' && <Clock className="h-4 w-4 text-blue-500" />}
                        <h4 className="font-medium">{rec.priority} Priority</h4>
                      </div>
                      
                      <div className="pl-6">
                        <p className="text-sm text-slate-400 mb-2">{rec.frequency}</p>
                        <div className="flex flex-wrap gap-2">
                          {rec.items.map((item, i) => (
                            <Badge 
                              key={i}
                              variant={
                                item.masteryLevel < 40 ? "destructive" :
                                item.masteryLevel < 60 ? "warning" : "default"
                              }
                              className="flex items-center space-x-1"
                            >
                              <span>{item.name}</span>
                              <span className="text-xs">({item.masteryLevel}%)</span>
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-4 p-4 bg-slate-800/50 rounded-lg">
                  <h4 className="font-medium mb-2">Review Intervals</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-red-400">Critical Areas:</span>
                      <span>Every {reviewPlan.reviewIntervals.critical} day(s)</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-yellow-400">Weak Areas:</span>
                      <span>Every {reviewPlan.reviewIntervals.weak} day(s)</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-blue-400">Normal Areas:</span>
                      <span>Every {reviewPlan.reviewIntervals.normal} day(s)</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="exam-score">Exam Score (%)</Label>
              <Input
                id="exam-score"
                type="number"
                min="0"
                max="100"
                value={examScore}
                onChange={(e) => setExamScore(e.target.value)}
                placeholder="Enter score after exam"
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <Button
                variant="outline"
                onClick={handleSuspendToggle}
                className={cn(
                  "space-x-2",
                  isSuspended && "border-yellow-500 text-yellow-500"
                )}
                disabled={isUpdating}
              >
                <PauseCircle className="h-4 w-4" />
                <span>{isSuspended ? 'Resume Reviews' : 'Suspend Reviews'}</span>
              </Button>

              <Button
                onClick={handleExamComplete}
                className="space-x-2 bg-green-600 hover:bg-green-700"
                disabled={isUpdating || !examScore}
              >
                <BookOpen className="h-4 w-4" />
                <span>Complete Exam</span>
              </Button>
            </div>
          </>
        )}

        {subject.examMode?.completed && (
          <div className="space-y-4">
            <div className="rounded-lg border border-slate-800 bg-slate-900/30 p-4">
              <h3 className="text-lg font-semibold text-green-500">Exam Completed</h3>
              <p className="text-slate-400">
                Completed on {format(new Date(subject.examMode.completedDate!), "PPP")}
              </p>
              <p className="text-2xl font-bold text-slate-100 mt-2">
                Score: {subject.examMode.score}%
              </p>
            </div>

            <Button
              variant="outline"
              onClick={() => {
                // Handle archiving
                toast.success('Subject archived');
              }}
              className="w-full space-x-2"
            >
              <Archive className="h-4 w-4" />
              <span>Archive Subject</span>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
} 