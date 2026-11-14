import { ArrowLeft } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { streamApi } from '../../api/streamApi';
import ObsConfigPanel from '../../components/stream/ObsConfigPanel';
import StreamForm from '../../components/stream/StreamForm';

export default function CreateStream() {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [credentials, setCredentials] = useState(null);

  const handleCreate = async (payload) => {
    setError('');
    setSubmitting(true);
    try {
      const result = await streamApi.createStream(payload);
      setCredentials(result);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create stream');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link
        to="/admin/streams"
        className="inline-flex items-center gap-2 text-sm font-medium text-slate-400 hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Streams
      </Link>

      <div>
        <h1 className="text-2xl font-bold text-white">Create Live Stream</h1>
        <p className="mt-1 text-sm text-slate-400">
          Generate a dedicated stream channel and OBS Studio publishing credentials.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {!credentials ? (
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-6">
          <StreamForm submitting={submitting} onSubmit={handleCreate} />
        </div>
      ) : (
        <div className="space-y-6">
          <ObsConfigPanel credentials={credentials} />
          <div className="flex items-center gap-3">
            <Link
              to={`/admin/streams/${encodeURIComponent(credentials.stream.streamId)}`}
              className="rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500"
            >
              Go to Stream Details
            </Link>
            <Link
              to="/admin/streams"
              className="rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm font-medium text-slate-200 hover:bg-slate-700"
            >
              View All Streams
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
