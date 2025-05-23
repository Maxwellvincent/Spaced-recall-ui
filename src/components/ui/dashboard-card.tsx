import Link from 'next/link';
import { LucideIcon } from 'lucide-react';

interface DashboardCardProps {
  title: string;
  count: number;
  description: string;
  href?: string;
  icon?: LucideIcon;
}

export function DashboardCard({ title, count, description, href, icon: Icon }: DashboardCardProps) {
  const CardContent = () => (
    <div className="bg-slate-950 border border-slate-800 p-6 rounded-lg shadow-lg hover:bg-slate-900 transition">
      <div className="flex items-center gap-3 mb-4">
        {Icon && <Icon className="h-6 w-6 text-blue-400" />}
        <h2 className="text-xl font-semibold text-slate-100">{title}</h2>
      </div>
      <div className="text-3xl font-bold text-slate-100 mb-2">{count}</div>
      <p className="text-slate-300">{description}</p>
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="block">
        <CardContent />
      </Link>
    );
  }

  return <CardContent />;
} 