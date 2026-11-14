import { Activity, Eye, Plus, Radio, Tv, Users } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { streamApi } from '../../api/streamApi';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import StreamStatusBadge from '../../components/stream/StreamStatusBadge';
import { formatDateTime, formatDuration } from '../../utils/formatters';

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadDashboard = useCallback(async () => {
    try {
      const data = await streamApi.getDashboardAnalytics();
      setStats(data);
    } catch {
      // ignore transient errors
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
    const timer = setInterval(loadDashboard, 5000);
    return () => clearInterval(timer);
  }, [loadDashboard]);

  if (loading) {
    return <LoadingSpinner label="Loading dashboard..." />;
  }

  const cards = [
    { label: 'Total Streams', value: stats?.totalStreams ?? 0, icon: Tv, color: 'text-indigo-400' },
    { label: 'Currently Live', value: stats?.liveStreams ?? 0, icon: Radio, color: 'text-red-400' },
    { label: 'Offline Streams', value: stats?.offlineStreams ?? 0, icon: Tv, color: 'text-slate-400' },
    { label: 'Active Viewers', value: stats?.totalActiveViewers ?? 0, icon: Eye, color: 'text-emerald-400' },
    { label: 'Broadcast Sessions', value: stats?.totalBroadcastSessions ?? 0, icon: Users, color: 'text-amber-400' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Live Streaming Dashboard</h1>
          <p className="mt-1 text-sm text-slate-400">
            Real-time overview of broadcasts, viewer sessions, and stream activity.
          </p>
        </div>
        <Link
          to="/admin/streams/new"
          className="inline-flex items-center gap-2 self-start rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-500"
        >
          <Plus className="h-4 w-4" />
          New Stream
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className="rounded-xl border border-slate-800 bg-slate-900 p-5"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium uppercase tracking-wider text-slate-400">
                  {card.label}
                </span>
                <Icon className={`h-4 w-4 ${card.color}`} />
              </div>
              <p className="mt-3 text-3xl font-bold text-white">{card.value}</p>
            </div>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-xl border border-slate-800 bg-slate-900 lg:col-span-2">
          <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
            <h2 className="text-base font-semibold text-white">Recent Streams</h2>
            <Link to="/admin/streams" className="text-xs font-medium text-indigo-400 hover:text-indigo-300">
              View all →
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-800 text-xs uppercase text-slate-400">
                <tr>
                  <th className="px-5 py-3">Stream</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Viewers</th>
                  <th className="px-5 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {(stats?.recentStreams || []).length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-5 py-8 text-center text-slate-500">
                      No streams created yet.
                    </td>
                  </tr>
                ) : (
                  stats.recentStreams.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-800/40">
                      <td className="px-5 py-3.5">
                        <p className="font-medium text-white">{s.title}</p>
                        <p className="font-mono text-xs text-slate-400">{s.streamId}</p>
                      </td>
                      <td className="px-5 py-3.5">
                        <StreamStatusBadge status={s.status} />
                      </td>
                      <td className="px-5 py-3.5 text-right font-medium text-slate-200">
                        {s.viewerCount}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <Link
                          to={`/admin/streams/${encodeURIComponent(s.streamId)}`}
                          className="text-xs font-medium text-indigo-400 hover:text-indigo-300"
                        >
                          Manage
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900">
          <div className="flex items-center gap-2 border-b border-slate-800 px-5 py-4">
            <Activity className="h-4 w-4 text-indigo-400" />
            <h2 className="text-base font-semibold text-white">Recent Activity</h2>
          </div>
          <div className="divide-y divide-slate-800">
            {(stats?.recentActivity || []).length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-slate-500">
                No broadcast events recorded yet.
              </p>
            ) : (
              stats.recentActivity.slice(0, 8).map((item) => (
                <div key={item.id} className="px-5 py-3.5 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate font-medium text-white">{item.streamTitle}</span>
                    <span
                      className={`rounded px-2 py-0.5 text-[11px] font-semibold ${
                        item.eventType === 'STARTED'
                          ? 'bg-emerald-500/15 text-emerald-400'
                          : 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      {item.eventType}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center justify-between text-xs text-slate-400">
                    <span>{formatDateTime(item.eventTime)}</span>
                    {item.durationSeconds != null && (
                      <span>{formatDuration(item.durationSeconds)}</span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
