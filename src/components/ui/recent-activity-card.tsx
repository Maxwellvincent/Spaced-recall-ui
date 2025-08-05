import Link from 'next/link';

interface ActivityProps {
  activity: {
    subject: {
      id: string;
      name: string;
    };
    topic: string;
    date: string;
    type: string;
    duration: number;
  };
}

export function RecentActivityCard({ activity }: ActivityProps) {
  const formatDuration = (minutes: number) => {
    if (minutes < 60) {
      return `${minutes} min`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}h ${remainingMinutes}m`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return 'Today';
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  return (
    <Link href={`/dashboard/subjects/${encodeURIComponent(activity.subject.id)}`}>
      <div className="bg-slate-700 p-4 rounded-lg hover:bg-slate-600 transition">
        <div className="flex justify-between items-start mb-2">
          <div>
            <h3 className="font-medium">{activity.topic}</h3>
            <p className="text-sm text-slate-400">{activity.subject.name}</p>
          </div>
          <span className="text-xs bg-slate-600 px-2 py-1 rounded">
            {formatDuration(activity.duration)}
          </span>
        </div>
        <div className="flex justify-between items-center text-xs text-slate-400">
          <span>{activity.type}</span>
          <span>{formatDate(activity.date)}</span>
        </div>
      </div>
    </Link>
  );
} 