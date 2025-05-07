import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { useState } from "react";

interface CalendarEvent {
  id: string;
  title: string;
  date: Date;
  type: "review" | "quiz" | "study" | "practice";
  urgency: "low" | "medium" | "high" | "missed";
  completed?: boolean;
}

interface ThemedCalendarProps {
  theme: string;
  events: CalendarEvent[];
  onEventClick?: (event: CalendarEvent) => void;
  className?: string;
}

const themeStyles = {
  dbz: {
    container: "bg-yellow-950/30 border-2 border-yellow-600/30",
    title: "text-yellow-400",
    text: "text-yellow-300/70",
    header: "bg-yellow-900/50 text-yellow-300",
    day: {
      normal: "hover:bg-yellow-800/30",
      current: "bg-yellow-800/50 font-semibold text-yellow-300"
    },
    event: {
      low: "bg-gradient-to-r from-yellow-800/40 to-yellow-700/40 border-l-4 border-yellow-600/50",
      medium: "bg-gradient-to-r from-orange-800/40 to-orange-700/40 border-l-4 border-orange-500/50",
      high: "bg-gradient-to-r from-red-800/40 to-orange-800/40 border-l-4 border-red-500/70",
      missed: "bg-gradient-to-r from-red-950/40 to-red-900/40 border-l-4 border-red-600/70 opacity-60"
    },
    eventText: {
      low: "text-yellow-300",
      medium: "text-orange-300",
      high: "text-red-300",
      missed: "text-red-400/70 line-through"
    },
    icons: {
      review: {
        low: "🔸",
        medium: "🔶",
        high: "🟠",
        missed: "💢"
      },
      quiz: {
        low: "⚡",
        medium: "⚡",
        high: "⚡",
        missed: "💢"
      },
      study: {
        low: "📚",
        medium: "📚",
        high: "📚",
        missed: "📛"
      },
      practice: {
        low: "👊",
        medium: "👊",
        high: "👊",
        missed: "💢"
      }
    }
  },
  naruto: {
    container: "bg-orange-950/30 border-2 border-orange-600/30",
    title: "text-orange-400",
    text: "text-orange-300/70",
    header: "bg-orange-900/50 text-orange-300",
    day: {
      normal: "hover:bg-orange-800/30",
      current: "bg-orange-800/50 font-semibold text-orange-300"
    },
    event: {
      low: "bg-gradient-to-r from-orange-800/40 to-orange-700/40 border-l-4 border-orange-600/50",
      medium: "bg-gradient-to-r from-red-800/40 to-red-700/40 border-l-4 border-red-500/50",
      high: "bg-gradient-to-r from-red-800/40 to-blue-800/40 border-l-4 border-blue-500/70",
      missed: "bg-gradient-to-r from-red-950/40 to-red-900/40 border-l-4 border-red-600/70 opacity-60"
    },
    eventText: {
      low: "text-orange-300",
      medium: "text-red-300",
      high: "text-blue-300",
      missed: "text-red-400/70 line-through"
    },
    icons: {
      review: {
        low: "🍃",
        medium: "🌀",
        high: "⚡",
        missed: "💢"
      },
      quiz: {
        low: "📜",
        medium: "📜",
        high: "📜",
        missed: "💢"
      },
      study: {
        low: "📚",
        medium: "📚",
        high: "📚",
        missed: "📛"
      },
      practice: {
        low: "🔄",
        medium: "🔄",
        high: "🔄",
        missed: "💢"
      }
    }
  },
  hogwarts: {
    container: "bg-purple-950/30 border-2 border-purple-600/30",
    title: "text-purple-400",
    text: "text-purple-300/70",
    header: "bg-purple-900/50 text-purple-300",
    day: {
      normal: "hover:bg-purple-800/30",
      current: "bg-purple-800/50 font-semibold text-purple-300"
    },
    event: {
      low: "bg-gradient-to-r from-purple-800/40 to-purple-700/40 border-l-4 border-purple-600/50",
      medium: "bg-gradient-to-r from-violet-800/40 to-violet-700/40 border-l-4 border-violet-500/50",
      high: "bg-gradient-to-r from-fuchsia-800/40 to-purple-800/40 border-l-4 border-fuchsia-500/70",
      missed: "bg-gradient-to-r from-red-950/40 to-red-900/40 border-l-4 border-red-600/70 opacity-60"
    },
    eventText: {
      low: "text-purple-300",
      medium: "text-violet-300",
      high: "text-fuchsia-300",
      missed: "text-red-400/70 line-through"
    },
    icons: {
      review: {
        low: "✨",
        medium: "🔮",
        high: "⚡",
        missed: "💢"
      },
      quiz: {
        low: "📜",
        medium: "📜",
        high: "📜",
        missed: "💢"
      },
      study: {
        low: "📚",
        medium: "📚",
        high: "📚",
        missed: "📛"
      },
      practice: {
        low: "🪄",
        medium: "🪄",
        high: "🪄",
        missed: "💢"
      }
    }
  },
  classic: {
    container: "bg-blue-950/30 border-2 border-blue-600/30",
    title: "text-blue-400",
    text: "text-blue-300/70",
    header: "bg-blue-900/50 text-blue-300",
    day: {
      normal: "hover:bg-blue-800/30",
      current: "bg-blue-800/50 font-semibold text-blue-300"
    },
    event: {
      low: "bg-gradient-to-r from-blue-800/40 to-blue-700/40 border-l-4 border-blue-600/50",
      medium: "bg-gradient-to-r from-cyan-800/40 to-cyan-700/40 border-l-4 border-cyan-500/50",
      high: "bg-gradient-to-r from-indigo-800/40 to-blue-800/40 border-l-4 border-indigo-500/70",
      missed: "bg-gradient-to-r from-red-950/40 to-red-900/40 border-l-4 border-red-600/70 opacity-60"
    },
    eventText: {
      low: "text-blue-300",
      medium: "text-cyan-300",
      high: "text-indigo-300",
      missed: "text-red-400/70 line-through"
    },
    icons: {
      review: {
        low: "🔵",
        medium: "🔷",
        high: "🔹",
        missed: "❌"
      },
      quiz: {
        low: "📝",
        medium: "📝",
        high: "📝",
        missed: "❌"
      },
      study: {
        low: "📚",
        medium: "📚",
        high: "📚",
        missed: "❌"
      },
      practice: {
        low: "👨‍💻",
        medium: "👨‍💻",
        high: "👨‍💻",
        missed: "❌"
      }
    }
  }
};

// Helper to generate calendar days
function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

export function ThemedCalendar({
  theme,
  events,
  onEventClick,
  className
}: ThemedCalendarProps) {
  const styles = themeStyles[theme as keyof typeof themeStyles] || themeStyles.classic;
  const [currentDate, setCurrentDate] = useState(new Date());
  const [currentMonth, setCurrentMonth] = useState(currentDate.getMonth());
  const [currentYear, setCurrentYear] = useState(currentDate.getFullYear());
  
  const daysInMonth = getDaysInMonth(currentYear, currentMonth);
  const firstDayOfMonth = getFirstDayOfMonth(currentYear, currentMonth);
  
  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  
  const goToPreviousMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };
  
  const goToNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };
  
  const renderDays = () => {
    const days = [];
    const today = new Date();
    
    // Empty cells for days before the first day of the month
    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push(
        <div key={`empty-${i}`} className="p-2"></div>
      );
    }
    
    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(currentYear, currentMonth, day);
      const isToday = today.getDate() === day && 
                      today.getMonth() === currentMonth && 
                      today.getFullYear() === currentYear;
      
      // Get events for this day
      const dayEvents = events.filter(event => {
        const eventDate = new Date(event.date);
        return eventDate.getDate() === day && 
               eventDate.getMonth() === currentMonth && 
               eventDate.getFullYear() === currentYear;
      });
      
      days.push(
        <div 
          key={`day-${day}`} 
          className={cn(
            "p-2 min-h-[100px] border-t border-gray-800",
            isToday ? styles.day.current : styles.day.normal
          )}
        >
          <div className="font-medium">{day}</div>
          <div className="mt-1 space-y-1">
            {dayEvents.map(event => (
              <motion.div
                key={event.id}
                className={cn(
                  "p-2 rounded-md text-xs cursor-pointer",
                  styles.event[event.urgency]
                )}
                whileHover={{ scale: 1.02 }}
                onClick={() => onEventClick && onEventClick(event)}
              >
                <div className="flex items-center gap-1">
                  <span>
                    {styles.icons[event.type][event.urgency]}
                  </span>
                  <span className={styles.eventText[event.urgency]}>
                    {event.title}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      );
    }
    
    return days;
  };
  
  return (
    <div className={cn("rounded-lg p-4", styles.container, className)}>
      <div className="flex items-center justify-between mb-4">
        <h3 className={cn("text-lg font-semibold", styles.title)}>
          Study Calendar
        </h3>
        <div className="flex items-center gap-2">
          <button
            onClick={goToPreviousMonth}
            className={cn("p-1 rounded-full hover:bg-black/20", styles.text)}
          >
            &lt;
          </button>
          <span className={styles.title}>
            {monthNames[currentMonth]} {currentYear}
          </span>
          <button
            onClick={goToNextMonth}
            className={cn("p-1 rounded-full hover:bg-black/20", styles.text)}
          >
            &gt;
          </button>
        </div>
      </div>
      
      <div className="grid grid-cols-7">
        {dayNames.map(day => (
          <div key={day} className={cn("p-2 text-center font-medium", styles.header)}>
            {day}
          </div>
        ))}
        {renderDays()}
      </div>
      
      <div className="mt-4 pt-2 border-t border-gray-800">
        <div className={cn("text-sm font-medium mb-2", styles.title)}>
          Event Types
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="flex items-center gap-1">
            <span>{styles.icons.review.medium}</span>
            <span className={styles.text}>Review</span>
          </div>
          <div className="flex items-center gap-1">
            <span>{styles.icons.quiz.medium}</span>
            <span className={styles.text}>Quiz</span>
          </div>
          <div className="flex items-center gap-1">
            <span>{styles.icons.study.medium}</span>
            <span className={styles.text}>Study</span>
          </div>
          <div className="flex items-center gap-1">
            <span>{styles.icons.practice.medium}</span>
            <span className={styles.text}>Practice</span>
          </div>
        </div>
      </div>
    </div>
  );
} 