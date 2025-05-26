import React from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
  ColumnDef,
  getPaginationRowModel,
} from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import { activityTypes } from '@/lib/xpSystem';
import { Filter } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

export interface StudySession {
  id: string;
  date: string;
  activityType: string;
  duration: number;
  xpGained: number;
  masteryGained?: number;
  notes?: string;
}

interface StudySessionsTableProps {
  sessions: StudySession[];
  onEdit: (session: StudySession) => void;
  onDelete: (session: StudySession) => void;
  themeStyles: any;
}

const PAGE_SIZE_OPTIONS = [5, 10, 20, 50];

export default function StudySessionsTable({ sessions, onEdit, onDelete, themeStyles }: StudySessionsTableProps) {
  const [globalFilter, setGlobalFilter] = React.useState('');
  const [sorting, setSorting] = React.useState([]);
  const [pageIndex, setPageIndex] = React.useState(0);
  const [pageSize, setPageSize] = React.useState(10);
  const [activityTypeFilter, setActivityTypeFilter] = React.useState('');
  const [minDuration, setMinDuration] = React.useState('');
  const [maxDuration, setMaxDuration] = React.useState('');
  const [dateFrom, setDateFrom] = React.useState('');
  const [dateTo, setDateTo] = React.useState('');

  // Advanced filtering
  React.useEffect(() => {
    console.log('All sessions:', sessions);
  }, [sessions]);
  
  const filteredSessions = React.useMemo(() => {
    const filtered = sessions.filter(session => {
      if (
        activityTypeFilter &&
        String(session.activityType).trim() !== String(activityTypeFilter).trim()
      ) return false;
      if (minDuration && session.duration < Number(minDuration)) return false;
      if (maxDuration && session.duration > Number(maxDuration)) return false;
      if (dateFrom && session.date && !isNaN(new Date(session.date).getTime()) && new Date(session.date) < new Date(dateFrom)) return false;
      if (dateTo && session.date && !isNaN(new Date(session.date).getTime()) && new Date(session.date) > new Date(dateTo)) return false;
      if (globalFilter && !(
        (session.notes || '').toLowerCase().includes(globalFilter.toLowerCase()) ||
        (activityTypes[session.activityType]?.name || session.activityType).toLowerCase().includes(globalFilter.toLowerCase())
      )) return false;
      return true;
    });
    console.log('Filtered sessions:', filtered);
    return filtered;
  }, [sessions, activityTypeFilter, minDuration, maxDuration, dateFrom, dateTo, globalFilter]);

  const columns = React.useMemo<ColumnDef<StudySession, any>[]>(
    () => [
      {
        accessorKey: 'date',
        header: 'Date',
        cell: info => format(new Date(info.getValue()), 'yyyy-MM-dd HH:mm'),
      },
      {
        accessorKey: 'activityType',
        header: 'Activity Type',
        cell: info => activityTypes[info.getValue()]?.name || info.getValue(),
      },
      {
        accessorKey: 'duration',
        header: 'Duration (min)',
      },
      {
        accessorKey: 'xpGained',
        header: 'XP',
      },
      {
        accessorKey: 'notes',
        header: 'Notes',
        cell: info => <span className="truncate block max-w-xs">{info.getValue()}</span>,
      },
      {
        id: 'actions',
        header: 'Actions',
        cell: ({ row }) => (
          <div className="flex gap-2">
            <Button size="sm" className={themeStyles.primary} onClick={() => onEdit(row.original)}>
              Edit
            </Button>
            <Button size="sm" variant="destructive" onClick={() => onDelete(row.original)}>
              Delete
            </Button>
          </div>
        ),
      },
    ],
    [onEdit, onDelete, themeStyles]
  );

  const table = useReactTable({
    data: filteredSessions,
    columns,
    state: {
      globalFilter,
      sorting,
      pagination: { pageIndex, pageSize },
    },
    onGlobalFilterChange: setGlobalFilter,
    onSortingChange: setSorting,
    onPaginationChange: updater => {
      if (typeof updater === 'function') {
        const next = updater({ pageIndex, pageSize });
        setPageIndex(next.pageIndex);
        setPageSize(next.pageSize);
      } else {
        setPageIndex(updater.pageIndex);
        setPageSize(updater.pageSize);
      }
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    debugTable: false,
    manualPagination: false,
    pageCount: Math.ceil(filteredSessions.length / pageSize),
  });

  // Pagination controls
  const totalPages = Math.ceil(filteredSessions.length / pageSize);

  return (
    <div>
      {/* Filters Row */}
      <div className="flex flex-wrap gap-2 mb-2 items-end">
        <input
          value={globalFilter ?? ''}
          onChange={e => setGlobalFilter(e.target.value)}
          placeholder="Search notes or type..."
          className="px-3 py-2 border border-slate-700 rounded bg-slate-800 text-slate-100 w-48"
        />
        <Popover>
          <PopoverTrigger asChild>
            <button
              className="p-2 rounded border border-slate-700 bg-slate-800 text-slate-100 hover:bg-slate-700 flex items-center"
              aria-label="Show filters"
              type="button"
            >
              <Filter className="h-5 w-5" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="bg-slate-800 border border-slate-700 rounded shadow-lg p-4 w-80 max-h-96 overflow-y-auto z-50">
            <div className="flex flex-col gap-3 w-full">
              <label className="text-xs text-slate-400">Activity Type</label>
              <select
                value={activityTypeFilter}
                onChange={e => setActivityTypeFilter(e.target.value)}
                className="px-2 py-2 border border-slate-700 rounded bg-slate-900 text-slate-100 w-full"
              >
                <option value="">All Types</option>
                {Array.from(new Set(sessions.map(s => s.activityType))).map(type => (
                  <option key={type} value={type}>
                    {activityTypes[type]?.name || type}
                  </option>
                ))}
              </select>
              <div className="flex gap-2 w-full">
                <div className="flex flex-col flex-1">
                  <label className="text-xs text-slate-400">Min Duration</label>
                  <input
                    type="number"
                    value={minDuration}
                    onChange={e => setMinDuration(e.target.value)}
                    placeholder="Min"
                    className="px-2 py-2 border border-slate-700 rounded bg-slate-900 text-slate-100 w-full"
                  />
                </div>
                <div className="flex flex-col flex-1">
                  <label className="text-xs text-slate-400">Max Duration</label>
                  <input
                    type="number"
                    value={maxDuration}
                    onChange={e => setMaxDuration(e.target.value)}
                    placeholder="Max"
                    className="px-2 py-2 border border-slate-700 rounded bg-slate-900 text-slate-100 w-full"
                  />
                </div>
              </div>
              <div className="flex gap-2 w-full">
                <div className="flex flex-col flex-1">
                  <label className="text-xs text-slate-400">From</label>
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={e => setDateFrom(e.target.value)}
                    className="px-2 py-2 border border-slate-700 rounded bg-slate-900 text-slate-100 w-full"
                  />
                </div>
                <div className="flex flex-col flex-1">
                  <label className="text-xs text-slate-400">To</label>
                  <input
                    type="date"
                    value={dateTo}
                    onChange={e => setDateTo(e.target.value)}
                    className="px-2 py-2 border border-slate-700 rounded bg-slate-900 text-slate-100 w-full"
                  />
                </div>
              </div>
              <div className="flex flex-col w-full">
                <label className="text-xs text-slate-400">Page Size</label>
                <select
                  value={pageSize}
                  onChange={e => {
                    setPageSize(Number(e.target.value));
                    setPageIndex(0);
                  }}
                  className="px-2 py-2 border border-slate-700 rounded bg-slate-900 text-slate-100 w-full"
                >
                  {PAGE_SIZE_OPTIONS.map(size => (
                    <option key={size} value={size}>{size} / page</option>
                  ))}
                </select>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>
      <div className={`overflow-x-auto rounded border ${themeStyles.border} ${themeStyles.cardBg}`}>
        <table className="min-w-full divide-y divide-slate-700">
          <thead className={themeStyles.cardBg}>
            {table.getHeaderGroups().map(headerGroup => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map(header => (
                  <th
                    key={header.id}
                    className="px-4 py-2 text-left text-xs font-semibold text-slate-300 cursor-pointer select-none"
                    onClick={header.column.getToggleSortingHandler()}
                  >
                    {flexRender(header.column.columnDef.header, header.getContext())}
                    {header.column.getIsSorted() ? (header.column.getIsSorted() === 'asc' ? ' ▲' : ' ▼') : ''}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y divide-slate-800">
            {table.getRowModel().rows.map(row => (
              <tr key={row.id} className="hover:bg-slate-800">
                {row.getVisibleCells().map(cell => (
                  <td key={cell.id} className="px-4 py-2 text-slate-100 text-sm">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {/* Pagination */}
      <div className="flex justify-between items-center mt-2">
        <div className="text-xs text-slate-400">
          Showing {table.getRowModel().rows.length} of {filteredSessions.length} sessions (Page {pageIndex + 1} of {totalPages})
        </div>
        <div className="flex gap-2">
          <Button
            className={themeStyles.primary}
            size="sm"
            onClick={() => setPageIndex(old => Math.max(0, old - 1))}
            disabled={pageIndex === 0}
          >
            Previous
          </Button>
          <Button
            className={themeStyles.primary}
            size="sm"
            onClick={() => setPageIndex(old => Math.min(totalPages - 1, old + 1))}
            disabled={pageIndex >= totalPages - 1}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
} 