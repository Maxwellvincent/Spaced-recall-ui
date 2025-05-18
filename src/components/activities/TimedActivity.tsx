import { useState, useCallback } from 'react';
import ThemedTimer from '@/components/timer/ThemedTimer';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Play, Pause, RotateCcw, Settings } from 'lucide-react';
import TimerSettings from '@/components/timer/TimerSettings';
import { TimerSettings as TimerSettingsType, OvertimeInfo } from '@/types/timer';

interface TimedActivityProps {
  activityId: string;
  activityName: string;
  description?: string;
  onSessionComplete?: (duration: number, overtime: OvertimeInfo, activeTime: number, idleTime: number) => void;
  defaultSettings?: TimerSettingsType;
}

export function TimedActivity({
  activityId,
  activityName,
  description,
  onSessionComplete,
  defaultSettings
}: TimedActivityProps) {
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState<TimerSettingsType>(defaultSettings);

  const handleSessionEnd = useCallback((
    duration: number,
    overtime: OvertimeInfo,
    activeTime: number,
    idleTime: number
  ) => {
    if (onSessionComplete) {
      onSessionComplete(duration, overtime, activeTime, idleTime);
    }
  }, [onSessionComplete]);

  return (
    <Card className="p-4 bg-slate-800 border-slate-700">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-semibold text-white">{activityName}</h3>
          {description && (
            <p className="text-sm text-slate-400">{description}</p>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setShowSettings(!showSettings)}
          className="text-slate-400 hover:text-white"
        >
          <Settings className="h-5 w-5" />
        </Button>
      </div>

      {showSettings ? (
        <div className="mb-4">
          <TimerSettings
            currentSettings={settings}
            onSave={(newSettings) => {
              setSettings(newSettings);
              setShowSettings(false);
            }}
            onClose={() => setShowSettings(false)}
          />
        </div>
      ) : (
        <ThemedTimer
          onSessionEnd={handleSessionEnd}
          associatedWorkItem={activityId}
        />
      )}
    </Card>
  );
} 