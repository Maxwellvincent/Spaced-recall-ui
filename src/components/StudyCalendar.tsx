import { useState } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, startOfWeek, endOfWeek, addDays, isSameWeek } from 'date-fns';

interface StudySession {
  date: string;
  duration: number;
  subject: string;
  topic: string;
  confidence: number;
}

interface StudyCalendarProps {
  sessions: StudySession[];
}

type ViewMode = 'month' | 'week';

export default function StudyCalendar({ sessions }: StudyCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('month');

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const weekStart = startOfWeek(currentDate);
  const weekEnd = endOfWeek(currentDate);

  const days = viewMode === 'month' 
    ? eachDayOfInterval({ start: monthStart, end: monthEnd })
    : eachDayOfInterval({ start: weekStart, end: weekEnd });

  const getSessionsForDay = (day: Date) => {
    return sessions.filter(session => 
      isSameDay(new Date(session.date), day)
    );
  };

  const getTotalStudyTime = (day: Date) => {
    return getSessionsForDay(day).reduce((sum, session) => sum + session.duration, 0);
  };

  const getAverageConfidence = (day: Date) => {
    const daySessions = getSessionsForDay(day);
    if (daySessions.length === 0) return 0;
    return daySessions.reduce((sum, session) => sum + session.confidence, 0) / daySessions.length;
  };

  const getHeatmapColor = (duration: number) => {
    if (duration === 0) return 'bg-slate-800';
    if (duration < 30) return 'bg-blue-900';
    if (duration < 60) return 'bg-blue-800';
    if (duration < 120) return 'bg-blue-700';
    if (duration < 180) return 'bg-blue-600';
    return 'bg-blue-500';
  };

  const handlePrevPeriod = () => {
    setCurrentDate(viewMode === 'month' 
      ? new Date(currentDate.getFullYear(), currentDate.getMonth() - 1)
      : addDays(currentDate, -7)
    );
  };

  const handleNextPeriod = () => {
    setCurrentDate(viewMode === 'month'
      ? new Date(currentDate.getFullYear(), currentDate.getMonth() + 1)
      : addDays(currentDate, 7)
    );
  };

  const toggleViewMode = () => {
    setViewMode(viewMode === 'month' ? 'week' : 'month');
  };

  return (
    <div className="bg-slate-800 p-6 rounded-lg">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">📅 Study Calendar</h2>
        <div className="flex space-x-2">
          <button
            onClick={toggleViewMode}
            className="bg-slate-700 hover:bg-slate-600 text-white py-1 px-3 rounded"
          >
            {viewMode === 'month' ? 'Week View' : 'Month View'}
          </button>
          <button
            onClick={handlePrevPeriod}
            className="bg-slate-700 hover:bg-slate-600 text-white py-1 px-3 rounded"
          >
            Previous
          </button>
          <span className="text-lg font-medium">
            {viewMode === 'month' 
              ? format(currentDate, 'MMMM yyyy')
              : `${format(weekStart, 'MMM d')} - ${format(weekEnd, 'MMM d, yyyy')}`}
          </span>
          <button
            onClick={handleNextPeriod}
            className="bg-slate-700 hover:bg-slate-600 text-white py-1 px-3 rounded"
          >
            Next
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-2">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
          <div key={day} className="text-center font-medium text-gray-400">
            {day}
          </div>
        ))}

        {days.map((day) => {
          const daySessions = getSessionsForDay(day);
          const totalTime = getTotalStudyTime(day);
          const avgConfidence = getAverageConfidence(day);
          const heatmapColor = getHeatmapColor(totalTime);

          return (
            <div
              key={day.toString()}
              className={`p-2 rounded-lg min-h-[100px] ${heatmapColor} ${
                isSameMonth(day, currentDate) || isSameWeek(day, currentDate)
                  ? 'text-white'
                  : 'text-gray-500'
              }`}
            >
              <div className="text-sm mb-1">{format(day, 'd')}</div>
              {daySessions.length > 0 && (
                <div className="space-y-1">
                  <div className="text-xs text-blue-200">
                    {totalTime} min
                  </div>
                  <div className="text-xs text-green-200">
                    {Math.round(avgConfidence)}% conf
                  </div>
                  <div className="text-xs text-gray-300">
                    {daySessions.length} sessions
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-6">
        <h3 className="text-lg font-medium mb-4">Today's Sessions</h3>
        <div className="space-y-2">
          {getSessionsForDay(new Date()).map((session, index) => (
            <div key={index} className="bg-slate-700 p-3 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="font-medium">
                  {session.subject} - {session.topic}
                </span>
                <span className="text-sm text-blue-400">
                  {session.duration} min
                </span>
              </div>
              <div className="text-sm text-gray-400">
                Confidence: {session.confidence}%
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6">
        <h3 className="text-lg font-medium mb-4">Study Statistics</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-slate-700 p-4 rounded-lg">
            <div className="text-sm text-gray-400">Total Study Time</div>
            <div className="text-2xl font-semibold">
              {sessions.reduce((sum, session) => sum + session.duration, 0)} min
            </div>
          </div>
          <div className="bg-slate-700 p-4 rounded-lg">
            <div className="text-sm text-gray-400">Average Confidence</div>
            <div className="text-2xl font-semibold">
              {Math.round(sessions.reduce((sum, session) => sum + session.confidence, 0) / sessions.length)}%
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 