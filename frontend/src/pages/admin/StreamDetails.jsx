import { ArrowLeft, Clock, ExternalLink, Eye, KeyRound, Pencil, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { streamApi } from '../../api/streamApi';
import ConfirmModal from '../../components/common/ConfirmModal';
import CopyButton from '../../components/common/CopyButton';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import BrowserBroadcast from '../../components/stream/BrowserBroadcast';
import CameraSettings from '../../components/stream/CameraSettings';
import ObsConfigPanel from '../../components/stream/ObsConfigPanel';
import StreamForm from '../../components/stream/StreamForm';
import StreamStatusBadge from '../../components/stream/StreamStatusBadge';
import { formatDateTime, formatDuration, getLiveDurationSeconds } from '../../utils/formatters';

export default function StreamDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [stream, setStream] = useState(null);
  const [programLive, setProgramLive] = useState(false);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const [showRegenModal, setShowRegenModal] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [newCredentials, setNewCredentials] = useState(null);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [liveDuration, setLiveDuration] = useState(0);

  const loadDetails = useCallback(async () => {
    try {
      const [streamData, historyData, views] = await Promise.all([
        streamApi.getAdminStream(id),
        streamApi.getStreamHistory(id),
        streamApi.getViews(id),
      ]);
      setStream(streamData);
      setProgramLive(views.program.live);
      setHistory(historyData || []);
      setError('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load stream details');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadDetails();
    const timer = setInterval(loadDetails, 5000);
    return () => clearInterval(timer);
  }, [loadDetails]);

  useEffect(() => {
    if (stream?.status !== 'LIVE' || !stream?.startedAt) {
      setLiveDuration(0);
      return undefined;
    }
    setLiveDuration(getLiveDurationSeconds(stream.startedAt));
    const timer = setInterval(() => {
      setLiveDuration(getLiveDurationSeconds(stream.startedAt));
    }, 1000);
    return () => clearInterval(timer);
  }, [stream?.status, stream?.startedAt]);

  const handleUpdate = async (payload) => {
    setSaving(true);
    try {
      const updated = await streamApi.updateStream(stream.streamId, payload);
      setStream(updated);
      setEditing(false);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update stream');
    } finally {
      setSaving(false);
    }
  };

  const handleRegenerateKey = async () => {
    setRegenerating(true);
    try {
      const creds = await streamApi.regenerateKey(stream.streamId);
      setNewCredentials(creds);
      setShowRegenModal(false);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to regenerate key');
    } finally {
      setRegenerating(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await streamApi.deleteStream(stream.streamId);
      navigate('/admin/streams');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete stream');
      setDeleting(false);
    }
  };

  if (loading) {
    return <LoadingSpinner label="Loading stream details..." />;
  }

  if (!stream) {
    return (
      <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-6 text-center text-sm text-red-300">
        {error || 'Stream not found'}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Link
        to="/admin/streams"
        className="inline-flex items-center gap-2 text-sm font-medium text-slate-400 hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Streams
      </Link>

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      <div className="flex flex-col gap-4 rounded-xl border border-slate-800 bg-slate-900 p-6 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <StreamStatusBadge status={stream.status} />
            <code className="font-mono text-xs text-slate-400">{stream.streamId}</code>
          </div>
          <h1 className="mt-2.5 text-2xl font-bold text-white">{stream.title}</h1>
          {stream.description && (
            <p className="mt-2 max-w-2xl text-sm text-slate-300">{stream.description}</p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            to={`/watch/${encodeURIComponent(stream.streamId)}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3.5 py-2 text-xs font-medium text-slate-200 hover:bg-slate-700"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Watch Page
          </Link>
          <button
            type="button"
            onClick={() => setEditing((v) => !v)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3.5 py-2 text-xs font-medium text-slate-200 hover:bg-slate-700"
          >
            <Pencil className="h-3.5 w-3.5" />
            {editing ? 'Cancel Edit' : 'Edit'}
          </button>
          <button
            type="button"
            onClick={() => setShowRegenModal(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3.5 py-2 text-xs font-medium text-amber-300 hover:bg-amber-500/20"
          >
            <KeyRound className="h-3.5 w-3.5" />
            Regenerate Key
          </button>
          <button
            type="button"
            onClick={() => setShowDeleteModal(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-red-500/30 bg-red-500/10 px-3.5 py-2 text-xs font-medium text-red-400 hover:bg-red-500/20"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete
          </button>
        </div>
      </div>

      {editing && (
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="mb-4 text-base font-semibold text-white">Edit Stream Metadata</h2>
          <StreamForm
            initialValues={stream}
            isEdit
            submitting={saving}
            onSubmit={handleUpdate}
          />
        </div>
      )}

      {newCredentials && <ObsConfigPanel credentials={newCredentials} />}

      <BrowserBroadcast key={`browser-${stream.streamId}`} streamId={stream.streamId} programLive={programLive} />
      <CameraSettings key={stream.streamId} streamId={stream.streamId} />

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
          <div className="flex items-center justify-between text-xs uppercase tracking-wider text-slate-400">
            <span>Active Viewers</span>
            <Eye className="h-4 w-4 text-indigo-400" />
          </div>
          <p className="mt-2 text-2xl font-bold text-white">{stream.viewerCount ?? 0}</p>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
          <div className="flex items-center justify-between text-xs uppercase tracking-wider text-slate-400">
            <span>Broadcast Start</span>
            <Clock className="h-4 w-4 text-slate-400" />
          </div>
          <p className="mt-2 text-sm font-medium text-white">
            {stream.startedAt ? formatDateTime(stream.startedAt) : 'Not started'}
          </p>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900 p-5">
          <div className="flex items-center justify-between text-xs uppercase tracking-wider text-slate-400">
            <span>Current Duration</span>
            <Clock className="h-4 w-4 text-emerald-400" />
          </div>
          <p className="mt-2 font-mono text-2xl font-bold text-white">
            {stream.status === 'LIVE' ? formatDuration(liveDuration) : '0s'}
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-900 p-6 space-y-4">
        <h2 className="text-base font-semibold text-white">Streaming Endpoints</h2>
        <div>
          <label className="text-xs font-medium uppercase tracking-wider text-slate-400">Watch link</label>
          <div className="mt-1.5 flex items-center justify-between gap-3 rounded-lg border border-slate-800 bg-slate-950 px-3.5 py-2.5">
            <code className="break-all font-mono text-sm text-slate-200">{`${window.location.origin}/watch/${encodeURIComponent(stream.streamId)}`}</code>
            <CopyButton value={`${window.location.origin}/watch/${encodeURIComponent(stream.streamId)}`} label="Copy watch link" />
          </div>
          <p className="mt-2 text-xs text-slate-400">Viewers do not need an account. Open this page using your public website address before copying a link for internet viewers. A localhost link only works on this Mac.</p>
        </div>
        <div>
          <label className="text-xs font-medium uppercase tracking-wider text-slate-400">
            OBS Server URL
          </label>
          <div className="mt-1.5 flex items-center justify-between gap-3 rounded-lg border border-slate-800 bg-slate-950 px-3.5 py-2.5">
            <code className="truncate font-mono text-sm text-slate-200">{stream.rtmpUrl}</code>
            <CopyButton value={stream.rtmpUrl} />
          </div>
        </div>
        <div>
          <label className="text-xs font-medium uppercase tracking-wider text-slate-400">
            HLS Playback URL
          </label>
          <div className="mt-1.5 flex items-center justify-between gap-3 rounded-lg border border-slate-800 bg-slate-950 px-3.5 py-2.5">
            <code className="truncate font-mono text-sm text-slate-200">{stream.hlsUrl}</code>
            <CopyButton value={new URL(stream.hlsUrl, window.location.origin).href} />
          </div>
        </div>
        <p className="text-xs text-slate-400">
          Stream key secrets are hashed and never stored in plaintext. Use <strong>Regenerate Key</strong> above if you need a new OBS Stream Key.
        </p>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900">
        <div className="border-b border-slate-800 px-6 py-4">
          <h2 className="text-base font-semibold text-white">Broadcast History</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-800 text-xs uppercase text-slate-400">
              <tr>
                <th className="px-6 py-3">Event</th>
                <th className="px-6 py-3">Timestamp</th>
                <th className="px-6 py-3 text-right">Duration</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {history.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-6 py-8 text-center text-slate-500">
                    No broadcast history yet.
                  </td>
                </tr>
              ) : (
                history.map((item) => (
                  <tr key={item.id}>
                    <td className="px-6 py-3.5">
                      <span
                        className={`rounded px-2 py-0.5 text-xs font-semibold ${
                          item.eventType === 'STARTED'
                            ? 'bg-emerald-500/15 text-emerald-400'
                            : 'bg-slate-800 text-slate-300'
                        }`}
                      >
                        {item.eventType}
                      </span>
                    </td>
                    <td className="px-6 py-3.5 text-slate-300">
                      {formatDateTime(item.eventTime)}
                    </td>
                    <td className="px-6 py-3.5 text-right font-mono text-slate-300">
                      {item.durationSeconds != null ? formatDuration(item.durationSeconds) : '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ConfirmModal
        open={showRegenModal}
        title="Regenerate Stream Key"
        message="Regenerating the stream key will invalidate the previous OBS publishing key immediately. Continue?"
        confirmLabel="Regenerate Key"
        loading={regenerating}
        onConfirm={handleRegenerateKey}
        onCancel={() => setShowRegenModal(false)}
      />

      <ConfirmModal
        open={showDeleteModal}
        title="Delete Stream"
        message={`Are you sure you want to delete "${stream.title}"? This action cannot be undone.`}
        confirmLabel="Delete Stream"
        danger
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteModal(false)}
      />
    </div>
  );
}
