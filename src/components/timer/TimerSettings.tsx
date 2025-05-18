"use client";

import { useState } from 'react';
import { TimerSettings, DEFAULT_TIMER_SETTINGS } from '@/types/timer';

interface TimerSettingsProps {
  currentSettings: TimerSettings;
  onSave: (settings: TimerSettings) => void;
  onClose: () => void;
}

export default function TimerSettingsComponent({ currentSettings, onSave, onClose }: TimerSettingsProps) {
  const [settings, setSettings] = useState<TimerSettings>(currentSettings);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(settings);
  };

  const handleReset = () => {
    setSettings(DEFAULT_TIMER_SETTINGS);
  };

  return (
    <div className="p-6 bg-slate-800 rounded-lg">
      <h2 className="text-xl font-semibold text-white mb-4">Timer Settings</h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-200 mb-1">
            Focus Duration (minutes)
          </label>
          <input
            type="number"
            min="1"
            max="60"
            value={settings.pomodoroLength}
            onChange={(e) => setSettings({ ...settings, pomodoroLength: parseInt(e.target.value) })}
            className="w-full bg-slate-700 text-white rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-200 mb-1">
            Short Break Duration (minutes)
          </label>
          <input
            type="number"
            min="1"
            max="30"
            value={settings.breakLength}
            onChange={(e) => setSettings({ ...settings, breakLength: parseInt(e.target.value) })}
            className="w-full bg-slate-700 text-white rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-200 mb-1">
            Long Break Duration (minutes)
          </label>
          <input
            type="number"
            min="1"
            max="60"
            value={settings.longBreakLength}
            onChange={(e) => setSettings({ ...settings, longBreakLength: parseInt(e.target.value) })}
            className="w-full bg-slate-700 text-white rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-200 mb-1">
            Sessions Before Long Break
          </label>
          <input
            type="number"
            min="1"
            max="10"
            value={settings.sessionsBeforeLongBreak}
            onChange={(e) => setSettings({ ...settings, sessionsBeforeLongBreak: parseInt(e.target.value) })}
            className="w-full bg-slate-700 text-white rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex justify-end space-x-3 pt-4">
          <button
            type="button"
            onClick={handleReset}
            className="px-4 py-2 text-sm font-medium text-slate-200 hover:text-white bg-slate-700 rounded-md"
          >
            Reset to Default
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-200 hover:text-white bg-slate-700 rounded-md"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md"
          >
            Save Settings
          </button>
        </div>
      </form>
    </div>
  );
} 