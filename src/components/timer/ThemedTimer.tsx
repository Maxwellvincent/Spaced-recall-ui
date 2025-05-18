"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { useTheme } from '@/contexts/theme-context';
import { TimerType, TimerState, TimerSettings, THEME_TIMER_MESSAGES, DEFAULT_TIMER_SETTINGS, OvertimeInfo, DEFAULT_IDLE_CONFIG, IdleConfig } from '@/types/timer';
import { Play, Pause, RotateCcw, Coffee, Timer as TimerIcon, AlertCircle, Clock } from 'lucide-react';

interface ThemedTimerProps {
  onComplete?: () => void;
  onSessionEnd?: (duration: number, overtime: OvertimeInfo, activeTime: number, idleTime: number) => void;
  associatedWorkItem?: string;
  idleConfig?: IdleConfig;
}

export default function ThemedTimer({ 
  onComplete, 
  onSessionEnd, 
  associatedWorkItem,
  idleConfig = DEFAULT_IDLE_CONFIG 
}: ThemedTimerProps) {
  const { theme } = useTheme();
  const [settings, setSettings] = useState<TimerSettings>(DEFAULT_TIMER_SETTINGS);
  const [timerType, setTimerType] = useState<TimerType>('pomodoro');
  const [timeLeft, setTimeLeft] = useState(settings.pomodoroLength * 60);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [state, setState] = useState<TimerState>('idle');
  const [completedIntervals, setCompletedIntervals] = useState(0);
  const [overtime, setOvertime] = useState<OvertimeInfo>({
    isOvertime: false,
    overtimeDuration: 0,
    originalDuration: 0
  });
  const [idleTime, setIdleTime] = useState(0);
  const [isIdle, setIsIdle] = useState(false);
  const [activeTime, setActiveTime] = useState(0);
  const lastActivityTime = useRef(Date.now());
  const messages = THEME_TIMER_MESSAGES[theme] || THEME_TIMER_MESSAGES.classic;

  // Track user activity
  useEffect(() => {
    if (state !== 'running') return;

    const updateLastActivity = () => {
      if (isIdle) {
        setIsIdle(false);
        // Calculate idle duration
        const idleDuration = Math.floor((Date.now() - lastActivityTime.current) / 1000);
        setIdleTime(prev => prev + idleDuration);
      }
      lastActivityTime.current = Date.now();
    };

    // Events to track
    const events = [
      'mousemove',
      'mousedown',
      'keypress',
      'DOMMouseScroll',
      'mousewheel',
      'touchmove',
      'MSPointerMove'
    ];

    events.forEach(event => {
      window.addEventListener(event, updateLastActivity);
    });

    return () => {
      events.forEach(event => {
        window.removeEventListener(event, updateLastActivity);
      });
    };
  }, [state, isIdle]);

  // Check for idle state
  useEffect(() => {
    if (state !== 'running') return;

    const idleCheck = setInterval(() => {
      const timeSinceLastActivity = (Date.now() - lastActivityTime.current) / 1000;

      // Set idle state if passed threshold
      if (timeSinceLastActivity >= idleConfig.idleThreshold && !isIdle) {
        setIsIdle(true);
      }

      // Auto-pause if max idle time reached
      if (timeSinceLastActivity >= idleConfig.maxIdleTime) {
        handlePause();
      }
    }, 1000);

    return () => clearInterval(idleCheck);
  }, [state, isIdle, idleConfig]);

  // Timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (state === 'running') {
      interval = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            if (!overtime.isOvertime) {
              setOvertime({
                isOvertime: true,
                overtimeDuration: 0,
                originalDuration: elapsedTime
              });
            }
            return 0;
          }
          return prev - 1;
        });
        
        setElapsedTime(prev => prev + 1);
        
        // Only increment active time if not idle
        if (!isIdle) {
          setActiveTime(prev => prev + 1);
        }

        if (overtime.isOvertime) {
          setOvertime(current => ({
            ...current,
            overtimeDuration: elapsedTime - current.originalDuration
          }));
        }
      }, 1000);
    }

    return () => clearInterval(interval);
  }, [state, overtime.isOvertime, elapsedTime, isIdle]);

  const handleTimerComplete = useCallback(() => {
    if (timerType === 'pomodoro') {
      const newIntervals = completedIntervals + 1;
      setCompletedIntervals(newIntervals);
      
      if (state !== 'break') {
        const isLongBreak = newIntervals % settings.sessionsBeforeLongBreak === 0;
        setState('break');
        setTimeLeft(isLongBreak ? settings.longBreakLength * 60 : settings.breakLength * 60);
      } else {
        setState('idle');
        setTimeLeft(settings.pomodoroLength * 60);
      }
    } else {
      setState('completed');
    }

    if (onComplete) {
      onComplete();
    }

    if (onSessionEnd) {
      onSessionEnd(elapsedTime, overtime, activeTime, idleTime);
    }
  }, [completedIntervals, settings, state, timerType, onComplete, onSessionEnd, elapsedTime, overtime, activeTime, idleTime]);

  const handleReset = () => {
    setState('idle');
    setTimeLeft(settings.pomodoroLength * 60);
    setElapsedTime(0);
    setActiveTime(0);
    setIdleTime(0);
    setIsIdle(false);
    setCompletedIntervals(0);
    setOvertime({
      isOvertime: false,
      overtimeDuration: 0,
      originalDuration: 0
    });
    lastActivityTime.current = Date.now();
  };

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs > 0 ? `${hrs}:` : ''}${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStart = () => {
    if (state === 'idle') {
      setTimeLeft(timerType === 'pomodoro' ? settings.pomodoroLength * 60 : Infinity);
      setElapsedTime(0);
    }
    setState('running');
  };

  const handlePause = () => {
    setState('paused');
  };

  const handleResume = () => {
    setState('running');
  };

  const handleTypeChange = (type: TimerType) => {
    setTimerType(type);
    handleReset();
  };

  return (
    <div className="p-6 bg-slate-800 rounded-lg shadow-lg">
      <div className="flex justify-between items-center mb-6">
        <div className="space-x-2">
          <button
            onClick={() => handleTypeChange('pomodoro')}
            className={`px-4 py-2 rounded ${
              timerType === 'pomodoro' ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300'
            }`}
          >
            <TimerIcon className="w-5 h-5 inline-block mr-2" />
            Pomodoro
          </button>
          <button
            onClick={() => handleTypeChange('continuous')}
            className={`px-4 py-2 rounded ${
              timerType === 'continuous' ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300'
            }`}
          >
            <Play className="w-5 h-5 inline-block mr-2" />
            Continuous
          </button>
        </div>
        {timerType === 'pomodoro' && (
          <div className="text-slate-400 text-sm">
            Session {completedIntervals + 1} / {settings.sessionsBeforeLongBreak}
          </div>
        )}
      </div>

      <div className="text-center mb-8">
        <div className="text-6xl font-bold mb-2 font-mono">
          {timerType === 'continuous' && state === 'running' ? formatTime(elapsedTime) : formatTime(timeLeft)}
        </div>
        
        {state === 'running' && (
          <div className="space-y-2">
            {isIdle && (
              <div className="flex items-center justify-center text-orange-400">
                <Clock className="w-5 h-5 mr-2" />
                <span>Idle detected - Move mouse or press key to resume active tracking</span>
              </div>
            )}
            
            <div className="flex items-center justify-center space-x-4 text-sm">
              <div className="text-green-400">
                Active: {formatTime(activeTime)}
              </div>
              <div className="text-orange-400">
                Idle: {formatTime(idleTime)}
              </div>
            </div>
          </div>
        )}

        {overtime.isOvertime && (
          <div className="flex items-center justify-center text-yellow-400 mt-2">
            <AlertCircle className="w-5 h-5 mr-2" />
            <span>Overtime: {formatTime(overtime.overtimeDuration)}</span>
          </div>
        )}
        
        <div className="text-slate-400">
          {state === 'break' ? 'Break Time!' : state === 'completed' ? messages.complete : 'Focus Time'}
        </div>
      </div>

      <div className="flex justify-center space-x-4">
        {state === 'idle' && (
          <button
            onClick={handleStart}
            className="flex items-center px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg transition"
          >
            <Play className="w-5 h-5 mr-2" />
            {messages.start}
          </button>
        )}
        {state === 'running' && (
          <button
            onClick={handlePause}
            className="flex items-center px-6 py-3 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg transition"
          >
            <Pause className="w-5 h-5 mr-2" />
            {messages.pause}
          </button>
        )}
        {state === 'paused' && (
          <button
            onClick={handleResume}
            className="flex items-center px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition"
          >
            <Play className="w-5 h-5 mr-2" />
            {messages.resume}
          </button>
        )}
        {state !== 'idle' && (
          <button
            onClick={handleReset}
            className="flex items-center px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg transition"
          >
            <RotateCcw className="w-5 h-5 mr-2" />
            {messages.reset}
          </button>
        )}
        {state === 'break' && (
          <button
            onClick={handleStart}
            className="flex items-center px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition"
          >
            <Coffee className="w-5 h-5 mr-2" />
            {messages.break}
          </button>
        )}
      </div>

      {timerType === 'pomodoro' && (
        <div className="mt-6 grid grid-cols-2 gap-4">
          <div className="text-center p-4 bg-slate-700 rounded">
            <div className="text-lg font-semibold text-white">{settings.pomodoroLength} min</div>
            <div className="text-sm text-slate-400">Focus Time</div>
          </div>
          <div className="text-center p-4 bg-slate-700 rounded">
            <div className="text-lg font-semibold text-white">{settings.breakLength} min</div>
            <div className="text-sm text-slate-400">Break Time</div>
          </div>
        </div>
      )}
    </div>
  );
} 