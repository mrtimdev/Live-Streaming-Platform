import { ExternalLink, Eye, Plus, Search, Settings, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { streamApi } from '../../api/streamApi';
import ConfirmModal from '../../components/common/ConfirmModal';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import Pagination from '../../components/common/Pagination';
import StreamStatusBadge from '../../components/stream/StreamStatusBadge';
import { formatDateTime } from '../../utils/formatters';

export default function StreamManagement() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortDir, setSortDir] = useState('desc');
  const [page, setPage] = useState(0);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetchStreams = useCallback(async () => {
    try {
      const params = { page, size: 10, sortBy, sortDir };
      if (search.trim()) params.search = search.trim();
      if (statusFilter) params.status = statusFilter;
      const res = await streamApi.listAdminStreams(params);
      setData(res);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter, sortBy, sortDir]);

  useEffect(() => {
    fetchStreams();
    const timer = setInterval(fetchStreams, 5000);
    return () => clearInterval(timer);
  }, [fetchStreams]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await streamApi.deleteStream(deleteTarget.streamId);
      setDeleteTarget(null);
      await fetchStreams();
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Stream Management</h1>
          <p className="mt-1 text-sm text-slate-400">
            Create, configure, and monitor live broadcast channels.
          </p>
        </div>
        <Link
          to="/admin/streams/new"
          className="inline-flex items-center gap-2 self-start rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-500"
        >
          <Plus className="h-4 w-4" />
          Create Stream
        </Link>
      </div>

      <div className="flex flex-col gap-3 rounded-xl border border-slate-800 bg-slate-900 p-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
            placeholder="Search by title or stream ID..."
            className="w-full rounded-lg border border-slate-700 bg-slate-950 py-2 pl-9 pr-3 text-sm text-white placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(0);
          }}
          className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200 focus:border-indigo-500 focus:outline-none"
        >
          <option value="">All Statuses</option>
          <option value="LIVE">LIVE</option>
          <option value="OFFLINE">OFFLINE</option>
        </select>

        <select
          value={`${sortBy}:${sortDir}`}
          onChange={(e) => {
            const [col, dir] = e.target.value.split(':');
            setSortBy(col);
            setSortDir(dir);
            setPage(0);
          }}
          className="rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200 focus:border-indigo-500 focus:outline-none"
        >
          <option value="createdAt:desc">Newest First</option>
          <option value="createdAt:asc">Oldest First</option>
          <option value="title:asc">Title (A–Z)</option>
          <option value="status:asc">Status</option>
        </select>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900">
        {loading ? (
          <LoadingSpinner label="Loading streams..." />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-800 text-xs uppercase text-slate-400">
                  <tr>
                    <th className="px-5 py-3.5">Stream</th>
                    <th className="px-5 py-3.5">Status</th>
                    <th className="px-5 py-3.5">Viewers</th>
                    <th className="px-5 py-3.5">Created</th>
                    <th className="px-5 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {(data?.content || []).length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-5 py-10 text-center text-slate-500">
                        No streams match your criteria.
                      </td>
                    </tr>
                  ) : (
                    data.content.map((stream) => (
                      <tr key={stream.id} className="hover:bg-slate-800/40">
                        <td className="px-5 py-4">
                          <p className="font-semibold text-white">{stream.title}</p>
                          <p className="font-mono text-xs text-slate-400">{stream.streamId}</p>
                        </td>
                        <td className="px-5 py-4">
                          <StreamStatusBadge status={stream.status} />
                        </td>
                        <td className="px-5 py-4">
                          <span className="inline-flex items-center gap-1.5 text-slate-200">
                            <Eye className="h-3.5 w-3.5 text-slate-400" />
                            {stream.viewerCount}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-xs text-slate-400">
                          {formatDateTime(stream.createdAt)}
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center justify-end gap-2">
                            <Link
                              to={`/watch/${encodeURIComponent(stream.streamId)}`}
                              target="_blank"
                              rel="noreferrer"
                              className="rounded-lg border border-slate-700 bg-slate-800 p-2 text-slate-300 hover:bg-slate-700 hover:text-white"
                              title="Open public watch page"
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                            </Link>
                            <Link
                              to={`/admin/streams/${encodeURIComponent(stream.streamId)}`}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-200 hover:bg-slate-700"
                            >
                              <Settings className="h-3.5 w-3.5" />
                              Details
                            </Link>
                            <button
                              type="button"
                              onClick={() => setDeleteTarget(stream)}
                              className="rounded-lg border border-red-500/30 bg-red-500/10 p-2 text-red-400 hover:bg-red-500/20"
                              title="Delete stream"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <Pagination
              page={data?.number ?? 0}
              totalPages={data?.totalPages ?? 0}
              onPageChange={setPage}
            />
          </>
        )}
      </div>

      <ConfirmModal
        open={Boolean(deleteTarget)}
        title="Delete Stream"
        message={`Are you sure you want to delete "${deleteTarget?.title}"? This removes the stream and its broadcast history permanently.`}
        confirmLabel="Delete Stream"
        danger
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
