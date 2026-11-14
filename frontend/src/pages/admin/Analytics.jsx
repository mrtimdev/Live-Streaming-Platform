import { BarChart3, Clock, Eye, Radio } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { streamApi } from '../../api/streamApi';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import StreamStatusBadge from '../../components/stream/StreamStatusBadge';
import { formatDateTime, formatDuration } from '../../utils/formatters';

export default function Analytics() {
  const [dashboard, setDashboard] = useState(null);
  const [streams, setStreams] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [dashData, streamList] = await Promise.all([
          streamApi.getDashboardAnalytics(),
          streamApi.getStreamAnalyticsList(),
        ]);
        setDashboard(dashData);
        setStreams(streamList || []);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) {
    return <LoadingSpinner label="Loading analytics..." />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Analytics</h1>
        <p className="mt-1 text-sm text-slate-400">
          Aggregate broadcast metrics, session counts, and per-stream durations.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
          <div className="flex items-center justify-between text-xs uppercase tracking-wider text-slate-400">
            <span>Total Broadcast Sessions</span>
            <Radio className="h-4 w-4 text-indigo-400" />
          </div>
          <p className="mt-2 text-3xl font-bold text-white">
            {dashboard?.totalBroadcastSessions ?? 0}
          </p>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
          <div className="flex items-center justify-between text-xs uppercase tracking-wider text-slate-400">
            <span>Total Air Time</span>
            <Clock className="h-4 w-4 text-emerald-400" />
          </div>
          <p className="mt-2 text-3xl font-bold text-white">
            {formatDuration(dashboard?.totalBroadcastDurationSeconds ?? 0)}
          </p>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
          <div className="flex items-center justify-between text-xs uppercase tracking-wider text-slate-400">
            <span>Current Active Viewers</span>
            <Eye className="h-4 w-4 text-amber-400" />
          </div>
          <p className="mt-2 text-3xl font-bold text-white">
            {dashboard?.totalActiveViewers ?? 0}
          </p>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900">
        <div className="flex items-center gap-2 border-b border-slate-800 px-6 py-4">
          <BarChart3 className="h-4 w-4 text-indigo-400" />
          <h2 className="text-base font-semibold text-white">Stream Performance Breakdown</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-800 text-xs uppercase text-slate-400">
              <tr>
                <th className="px-6 py-3">Stream</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3 text-right">Active Viewers</th>
                <th className="px-6 py-3 text-right">Sessions</th>
                <th className="px-6 py-3 text-right">Total Duration</th>
                <th className="px-6 py-3">Last Broadcast</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {streams.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                    No stream analytics available yet.
                  </td>
                </tr>
              ) : (
                streams.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-800/40">
                    <td className="px-6 py-4">
                      <Link
                        to={`/admin/streams/${encodeURIComponent(s.streamId)}`}
                        className="font-medium text-white hover:text-indigo-400"
                      >
                        {s.title}
                      </Link>
                      <p className="font-mono text-xs text-slate-400">{s.streamId}</p>
                    </td>
                    <td className="px-6 py-4">
                      <StreamStatusBadge status={s.status} />
                    </td>
                    <td className="px-6 py-4 text-right font-medium text-slate-200">
                      {s.activeViewers}
                    </td>
                    <td className="px-6 py-4 text-right text-slate-300">{s.totalSessions}</td>
                    <td className="px-6 py-4 text-right font-mono text-slate-300">
                      {formatDuration(s.totalDurationSeconds)}
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-400">
                      {formatDateTime(s.lastStartedAt)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
