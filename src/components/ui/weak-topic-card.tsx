import Link from 'next/link';
import type { Subject, Topic } from '@/types/study';

interface WeakTopicCardProps {
  subject: Subject;
  topic: Topic;
}

export function WeakTopicCard({ subject, topic }: WeakTopicCardProps) {
  return (
    <Link href={`/dashboard/subjects/${encodeURIComponent(subject.id)}`}>
      <div className="bg-slate-700 p-4 rounded-lg hover:bg-slate-600 transition">
        <div className="flex justify-between items-center mb-2">
          <h3 className="font-medium">{topic.name}</h3>
          <span className="text-sm px-2 py-1 bg-red-900/50 text-red-200 rounded">
            {topic.masteryLevel || 0}% Mastery
          </span>
        </div>
        <p className="text-sm text-slate-400">
          From: {subject.name}
        </p>
        <div className="mt-2 w-full bg-slate-600 rounded-full h-1.5">
          <div
            className="bg-red-500 rounded-full h-1.5"
            style={{ width: `${topic.masteryLevel || 0}%` }}
          />
        </div>
      </div>
    </Link>
  );
} 