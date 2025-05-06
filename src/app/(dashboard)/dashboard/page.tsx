// Force dynamic rendering and disable static generation
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';
export const runtime = 'nodejs';
export const preferredRegion = 'auto';

// This is a completely static version of the dashboard page
// It doesn't use any client components or Firebase during build time
// The real dashboard functionality will load client-side through the layout.tsx file

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6">Dashboard</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <div className="bg-slate-800 p-6 rounded-lg shadow-lg">
            <h2 className="text-xl font-semibold mb-2">Loading...</h2>
            <p className="text-slate-400">Your dashboard is loading</p>
          </div>
          <div className="bg-slate-800 p-6 rounded-lg shadow-lg">
            <h2 className="text-xl font-semibold mb-2">Please wait</h2>
            <p className="text-slate-400">Fetching your data</p>
          </div>
          <div className="bg-slate-800 p-6 rounded-lg shadow-lg">
            <h2 className="text-xl font-semibold mb-2">Almost ready</h2>
            <p className="text-slate-400">Loading your subjects</p>
          </div>
        </div>
        <div className="w-full h-2 bg-slate-700 rounded-full">
          <div className="h-full rounded-full bg-blue-500 animate-pulse" style={{width: '60%'}}></div>
        </div>
      </div>
    </div>
  );
} 