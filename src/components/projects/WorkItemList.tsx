"use client";

import { useState } from 'react';
import { ProjectWorkItem, WorkItemType } from '@/types/project';
import { format } from 'date-fns';
import { calculateCompletionXP } from '@/utils/xp-calculator';
import Link from 'next/link';

interface WorkItemListProps {
  workItems: ProjectWorkItem[];
  onStatusChange: (itemId: string, newStatus: 'not-started' | 'in-progress' | 'completed') => void;
  onXPAwarded: (itemId: string, xpAmount: number) => void;
}

export default function WorkItemList({ workItems, onStatusChange, onXPAwarded }: WorkItemListProps) {
  const [filter, setFilter] = useState<WorkItemType | 'all'>('all');
  const [sortBy, setSortBy] = useState<'date' | 'status'>('date');

  const filteredItems = workItems.filter(item => 
    filter === 'all' ? true : item.type === filter
  );

  const sortedItems = [...filteredItems].sort((a, b) => {
    if (sortBy === 'date') {
      return b.createdAt.seconds - a.createdAt.seconds;
    } else {
      const statusOrder = {
        'not-started': 0,
        'in-progress': 1,
        'completed': 2
      };
      return statusOrder[a.status] - statusOrder[b.status];
    }
  });

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'not-started':
        return 'bg-slate-500';
      case 'in-progress':
        return 'bg-blue-500';
      case 'completed':
        return 'bg-green-500';
      default:
        return 'bg-slate-500';
    }
  };

  const getTypeBadgeColor = (type: WorkItemType) => {
    switch (type) {
      case 'task':
        return 'bg-purple-500';
      case 'implementation':
        return 'bg-indigo-500';
      case 'improvement':
        return 'bg-cyan-500';
      case 'tool':
        return 'bg-orange-500';
      default:
        return 'bg-slate-500';
    }
  };

  const handleStatusChange = async (itemId: string, newStatus: 'not-started' | 'in-progress' | 'completed') => {
    const workItem = workItems.find(item => item.id === itemId);
    if (!workItem) return;

    // If the item is being completed and XP hasn't been awarded yet
    if (newStatus === 'completed' && !workItem.xpAwarded) {
      onXPAwarded(itemId, workItem.potentialXP);
    }

    onStatusChange(itemId, newStatus);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div className="flex space-x-2">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as WorkItemType | 'all')}
            className="bg-slate-700 text-white rounded-md px-3 py-1.5 text-sm"
          >
            <option value="all">All Types</option>
            <option value="task">Tasks</option>
            <option value="implementation">Implementations</option>
            <option value="improvement">Improvements</option>
            <option value="tool">Tools</option>
          </select>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'date' | 'status')}
            className="bg-slate-700 text-white rounded-md px-3 py-1.5 text-sm"
          >
            <option value="date">Sort by Date</option>
            <option value="status">Sort by Status</option>
          </select>
        </div>
      </div>

      <div className="space-y-3">
        {sortedItems.map((item) => (
          <div key={item.id} className="bg-slate-800 rounded-lg p-4 space-y-3">
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${getTypeBadgeColor(item.type)}`}>
                    {item.type.charAt(0).toUpperCase() + item.type.slice(1)}
                  </span>
                  {item.type !== 'task' && item.category && (
                    <span className="px-2 py-1 bg-slate-600 rounded text-xs">
                      {item.category}
                    </span>
                  )}
                  {item.type === 'task' && item.priority && (
                    <span className={`px-2 py-1 rounded text-xs ${
                      item.priority === 'high' ? 'bg-red-500' :
                      item.priority === 'medium' ? 'bg-yellow-500' :
                      'bg-green-500'
                    }`}>
                      {item.priority}
                    </span>
                  )}
                </div>
                <h3 className="text-lg font-medium text-white">{item.title}</h3>
                <div className="flex items-center space-x-2 text-sm">
                  <span className="text-slate-400">
                    Potential XP: <span className="text-white">{item.potentialXP}</span>
                  </span>
                  {item.status === 'completed' && item.xpAwarded && (
                    <span className="bg-green-500 text-white text-xs px-2 py-0.5 rounded">
                      XP Awarded
                    </span>
                  )}
                </div>
              </div>
              <select
                value={item.status}
                onChange={(e) => handleStatusChange(item.id, e.target.value as 'not-started' | 'in-progress' | 'completed')}
                className={`${getStatusBadgeColor(item.status)} text-white rounded-md px-2 py-1 text-sm`}
              >
                <option value="not-started">Not Started</option>
                <option value="in-progress">In Progress</option>
                <option value="completed">Completed</option>
              </select>
            </div>

            <p className="text-slate-300">{item.description}</p>

            {item.type !== 'task' && item.technicalDetails && (
              <div className="mt-2 p-3 bg-slate-700 rounded">
                <h4 className="text-sm font-medium text-slate-200 mb-1">Technical Details</h4>
                <p className="text-sm text-slate-300">{item.technicalDetails}</p>
              </div>
            )}

            <div className="flex items-center justify-between text-sm text-slate-400">
              <div className="flex items-center space-x-4">
                <span>Created {format(item.createdAt.toDate(), 'MMM d, yyyy')}</span>
                {item.type === 'task' && item.dueDate && (
                  <span>Due {format(item.dueDate.toDate(), 'MMM d, yyyy')}</span>
                )}
              </div>
              <Link href={`/activities/edit/project/${item.id}`}>
                <a className="text-blue-500 hover:underline">Edit</a>
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
} 