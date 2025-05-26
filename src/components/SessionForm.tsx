"use client";

import { useState, useEffect } from "react";
import { Subject, Topic, StudySession } from "@/types/study";
import { activityTypes, difficultyLevels, calculateSessionXP } from "@/lib/xpSystem";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { useAuth } from '@/lib/auth';
import { getFirebaseDb } from '@/lib/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';

interface SessionFormProps {
  subject: Subject | null;
  topic: Topic | null;
  initialData?: Partial<StudySession>;
  onComplete: (sessionData: Partial<StudySession>) => void;
  onCancel?: () => void;
}

export default function SessionForm({
  subject,
  topic,
  initialData,
  onComplete,
  onCancel
}: SessionFormProps) {
  const { user } = useAuth();
  const db = getFirebaseDb();
  const [session, setSession] = useState<Partial<StudySession>>({
    date: new Date().toISOString(),
    duration: 30,
    notes: "",
    activityType: "study",
    difficulty: "medium",
    ...initialData
  });
  const [isCalculating, setIsCalculating] = useState(false);
  const [activityTypeInput, setActivityTypeInput] = useState("");
  const [activityTypeOptions, setActivityTypeOptions] = useState<string[]>(Object.keys(activityTypes));
  const [filteredOptions, setFilteredOptions] = useState<string[]>(Object.keys(activityTypes));
  const [showOptions, setShowOptions] = useState(false);

  // Fetch custom activity types from Firestore
  useEffect(() => {
    const fetchCustomTypes = async () => {
      if (!user) return;
      const userRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userRef);
      if (userDoc.exists()) {
        const data = userDoc.data();
        if (Array.isArray(data.customActivityTypes)) {
          setActivityTypeOptions(prev => Array.from(new Set([...prev, ...data.customActivityTypes])));
        }
      }
    };
    fetchCustomTypes();
  }, [user, db]);

  // Filter options as user types
  useEffect(() => {
    if (!activityTypeInput) {
      setFilteredOptions(activityTypeOptions);
    } else {
      setFilteredOptions(
        activityTypeOptions.filter(opt =>
          opt.toLowerCase().includes(activityTypeInput.toLowerCase())
        )
      );
    }
  }, [activityTypeInput, activityTypeOptions]);

  // Calculate XP and mastery whenever relevant fields change
  useEffect(() => {
    if (topic && session.activityType && session.difficulty && session.duration) {
      try {
        const { xp, masteryGained } = calculateSessionXP({
          activityType: session.activityType,
          difficulty: session.difficulty,
          duration: Math.max(1, session.duration || 0),
          currentLevel: topic.masteryLevel || 0
        });
        setSession(prev => ({
          ...prev,
          xpGained: isFinite(xp) ? xp : 0,
          masteryGained: isFinite(masteryGained) ? masteryGained : 0
        }));
      } catch (error) {
        console.error('Error calculating XP:', error);
        setSession(prev => ({
          ...prev,
          xpGained: 0,
          masteryGained: 0
        }));
      }
    }
  }, [session.activityType, session.difficulty, session.duration, topic]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsCalculating(true);
    const sessionToSave = {
      ...session,
      id: session.id || crypto.randomUUID()
    };
    onComplete(sessionToSave);
    setIsCalculating(false);
  };

  // Add new custom activity type
  const handleAddCustomType = async (newType: string) => {
    if (!user) return;
    const cleanType = newType.trim();
    if (!cleanType) return;
    setActivityTypeOptions(prev => Array.from(new Set([...prev, cleanType])));
    setSession(prev => ({ ...prev, activityType: cleanType }));
    setActivityTypeInput("");
    setShowOptions(false);
    // Save to Firestore
    const userRef = doc(db, 'users', user.uid);
    const userDoc = await getDoc(userRef);
    let customTypes: string[] = [];
    if (userDoc.exists()) {
      const data = userDoc.data();
      if (Array.isArray(data.customActivityTypes)) {
        customTypes = data.customActivityTypes;
      }
    }
    if (!customTypes.includes(cleanType)) {
      await updateDoc(userRef, {
        customActivityTypes: [...customTypes, cleanType]
      });
    }
  };

  if (!subject || !topic) {
    return <div className="text-slate-300">Loading...</div>;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 text-slate-100">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">
            Activity Type
          </label>
          <div className="relative">
            <input
              type="text"
              value={activityTypeInput || session.activityType || ''}
              onChange={e => {
                setActivityTypeInput(e.target.value);
                setSession(prev => ({ ...prev, activityType: e.target.value }));
                setShowOptions(true);
              }}
              onFocus={() => setShowOptions(true)}
              onBlur={() => setTimeout(() => setShowOptions(false), 150)}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-slate-100"
              placeholder="Type or select activity type"
              autoComplete="off"
              required
            />
            {showOptions && filteredOptions.length > 0 && (
              <ul className="absolute z-10 w-full bg-slate-900 border border-slate-700 rounded mt-1 max-h-40 overflow-y-auto">
                {filteredOptions.map(opt => (
                  <li
                    key={opt}
                    className="px-3 py-2 cursor-pointer hover:bg-slate-700"
                    onMouseDown={() => {
                      setSession(prev => ({ ...prev, activityType: opt }));
                      setActivityTypeInput(opt);
                      setShowOptions(false);
                    }}
                  >
                    {activityTypes[opt]?.name || opt}
                  </li>
                ))}
              </ul>
            )}
            {showOptions && activityTypeInput && !activityTypeOptions.some(opt => opt.toLowerCase() === activityTypeInput.toLowerCase()) && (
              <div
                className="absolute z-10 w-full bg-slate-900 border-t border-slate-700 rounded-b px-3 py-2 cursor-pointer text-blue-400 hover:bg-blue-900"
                onMouseDown={() => handleAddCustomType(activityTypeInput)}
              >
                + Add "{activityTypeInput}"
              </div>
            )}
          </div>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">
            Difficulty
          </label>
          <select
            value={session.difficulty}
            onChange={(e) => setSession({
              ...session,
              difficulty: e.target.value
            })}
            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-slate-100"
            required
          >
            {Object.entries(difficultyLevels).map(([key, value]) => (
              <option key={key} value={key}>{value.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-300 mb-1">
          Duration (minutes)
        </label>
        <input
          type="number"
          value={session.duration || 0}
          onChange={(e) => setSession({
            ...session,
            duration: Math.max(1, parseInt(e.target.value) || 0)
          })}
          min="1"
          className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-slate-100"
          required
        />
      </div>

      {initialData && (
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">
            Date
          </label>
          <input
            type="datetime-local"
            value={new Date(session.date || new Date()).toISOString().slice(0, 16)}
            onChange={(e) => setSession({
              ...session,
              date: new Date(e.target.value).toISOString()
            })}
            className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-slate-100"
            required
          />
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-slate-300 mb-1">
          Notes
        </label>
        <textarea
          value={session.notes || ""}
          onChange={(e) => setSession({
            ...session,
            notes: e.target.value
          })}
          className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded text-slate-100 h-24"
          placeholder="Add any notes about your study session..."
        />
      </div>

      <div className="bg-slate-900/50 p-3 rounded-md border border-slate-800">
        <h3 className="text-sm font-medium text-slate-300 mb-2">Session Rewards Preview</h3>
        <div className="flex justify-between">
          <div>
            <p className="text-xs text-slate-400">Experience Points</p>
            <p className="text-sm font-medium text-blue-400">+{session.xpGained || 0} XP</p>
          </div>
          <div>
            <p className="text-xs text-slate-400">Mastery Gain</p>
            <p className="text-sm font-medium text-green-400">+{session.masteryGained || 0}%</p>
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-2">
        {onCancel && (
          <Button 
            type="button" 
            variant="outline" 
            onClick={onCancel}
            className="bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-slate-100"
          >
            Cancel
          </Button>
        )}
        <Button 
          type="submit" 
          disabled={isCalculating}
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          {initialData ? "Update Session" : "Add Session"}
        </Button>
      </div>
    </form>
  );
} 