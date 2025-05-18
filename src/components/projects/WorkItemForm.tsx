"use client";

import { useState, useEffect } from 'react';
import { WorkItemType, ProjectWorkItem, XP_RULES } from '@/types/project';
import { Timestamp } from 'firebase/firestore';
import { calculatePotentialXP } from '@/utils/xp-calculator';

interface WorkItemFormProps {
  onSubmit: (workItem: Omit<ProjectWorkItem, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onCancel: () => void;
  initialData?: ProjectWorkItem;
  isEditing?: boolean;
}

export default function WorkItemForm({ onSubmit, onCancel, initialData, isEditing }: WorkItemFormProps) {
  const [type, setType] = useState<WorkItemType>('task');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium');
  const [category, setCategory] = useState<'feature' | 'enhancement' | 'tool' | 'documentation' | 'refactor'>('feature');
  const [impact, setImpact] = useState<'minor' | 'moderate' | 'major'>('moderate');
  const [technicalDetails, setTechnicalDetails] = useState('');
  const [potentialXP, setPotentialXP] = useState(0);

  // Calculate potential XP whenever relevant fields change
  useEffect(() => {
    const workItemData = {
      type,
      title,
      description,
      status: 'not-started' as const,
      ...(type === 'task' && {
        priority,
      }),
      ...(type !== 'task' && {
        impact,
        technicalDetails,
      }),
    };

    const xp = calculatePotentialXP(workItemData);
    setPotentialXP(xp);
  }, [type, priority, impact, technicalDetails]);

  // Populate form fields if initialData is provided
  useEffect(() => {
    if (initialData) {
      setType(initialData.type);
      setTitle(initialData.title);
      setDescription(initialData.description);
      setDueDate(initialData.dueDate ? initialData.dueDate.toDate().toISOString().split('T')[0] : '');
      setPriority(initialData.priority as 'low' | 'medium' | 'high');
      setCategory(initialData.category as typeof category);
      setImpact(initialData.impact as typeof impact);
      setTechnicalDetails(initialData.technicalDetails || '');
    }
  }, [initialData]);

  // Reset form if initialData becomes null (e.g. finishing an edit)
  useEffect(() => {
    if (!initialData) {
      setType('task');
      setTitle('');
      setDescription('');
      setDueDate('');
      setPriority('medium');
      setCategory('feature');
      setImpact('moderate');
      setTechnicalDetails('');
      setPotentialXP(0);
    }
  }, [initialData]);

  const handleSubmit = () => {
    const workItem = {
      type,
      title,
      description,
      status: 'not-started' as const,
      potentialXP,
      xpAwarded: false,
      ...(type === 'task' && {
        dueDate: dueDate ? Timestamp.fromDate(new Date(dueDate)) : undefined,
        priority,
      }),
      ...(type !== 'task' && {
        category,
        impact,
        technicalDetails,
      }),
    };

    onSubmit(workItem);
  };

  return (
    <div className="space-y-4 p-4 bg-slate-800 rounded-lg">
      <div>
        <label className="block text-sm font-medium text-slate-200 mb-1">
          Type
        </label>
        <select
          value={type}
          onChange={(e) => setType(e.target.value as WorkItemType)}
          className="w-full bg-slate-700 text-white rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500"
        >
          <option value="task">Task</option>
          <option value="implementation">Implementation</option>
          <option value="improvement">Improvement</option>
          <option value="tool">Tool</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-200 mb-1">
          Title
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full bg-slate-700 text-white rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-200 mb-1">
          Description
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full bg-slate-700 text-white rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500"
          rows={3}
          required
        />
      </div>

      {type === 'task' ? (
        <>
          <div>
            <label className="block text-sm font-medium text-slate-200 mb-1">
              Due Date
            </label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full bg-slate-700 text-white rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-200 mb-1">
              Priority
            </label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as 'low' | 'medium' | 'high')}
              className="w-full bg-slate-700 text-white rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>
        </>
      ) : (
        <>
          <div>
            <label className="block text-sm font-medium text-slate-200 mb-1">
              Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as typeof category)}
              className="w-full bg-slate-700 text-white rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500"
            >
              <option value="feature">Feature</option>
              <option value="enhancement">Enhancement</option>
              <option value="tool">Tool</option>
              <option value="documentation">Documentation</option>
              <option value="refactor">Refactor</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-200 mb-1">
              Impact
            </label>
            <select
              value={impact}
              onChange={(e) => setImpact(e.target.value as typeof impact)}
              className="w-full bg-slate-700 text-white rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500"
            >
              <option value="minor">Minor</option>
              <option value="moderate">Moderate</option>
              <option value="major">Major</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-200 mb-1">
              Technical Details
            </label>
            <textarea
              value={technicalDetails}
              onChange={(e) => setTechnicalDetails(e.target.value)}
              className="w-full bg-slate-700 text-white rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500"
              rows={3}
              placeholder="Add implementation details, technical considerations, or documentation links..."
            />
          </div>
        </>
      )}

      {/* Update XP Preview Section */}
      <div className="mt-6 p-4 bg-slate-700 rounded-lg">
        <h3 className="text-lg font-medium text-white mb-3">XP Rewards</h3>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-slate-300">Total XP (awarded on completion):</span>
            <span className="text-white font-medium">{potentialXP} XP</span>
          </div>
          <div className="text-xs text-slate-400 mt-2">
            <p>* XP is awarded when the work item is marked as completed</p>
            {type === 'task' && (
              <p>* Includes bonuses for priority level</p>
            )}
            {type !== 'task' && (
              <>
                <p>* Includes bonuses for impact level</p>
                <p>* Additional bonus for providing technical details</p>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="flex justify-end space-x-3">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-slate-200 hover:text-white bg-slate-700 rounded-md"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md"
        >
          {isEditing ? "Update Work Item" : "Add Work Item"}
        </button>
      </div>
    </div>
  );
} 