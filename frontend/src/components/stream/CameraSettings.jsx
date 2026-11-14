import { useEffect, useState } from 'react';
import { streamApi } from '../../api/streamApi';
import ConfirmModal from '../common/ConfirmModal';
import ObsConfigPanel from './ObsConfigPanel';
import StreamStatusBadge from './StreamStatusBadge';

const buttonStyle = 'rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-200 hover:bg-slate-800 disabled:opacity-50';

export default function CameraSettings({ streamId }) {
  const [views, setViews] = useState(null);
  const [label, setLabel] = useState('');
  const [credentials, setCredentials] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [busy, setBusy] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [actionError, setActionError] = useState('');

  useEffect(() => {
    let active = true;
    let loading = false;
    const refresh = async () => {
      if (loading) return;
      loading = true;
      try {
        const result = await streamApi.getViews(streamId);
        if (active) {
          setViews(result);
          setLoadError('');
        }
      } catch (err) {
        if (active) setLoadError(err.response?.data?.message || 'Unable to load camera feeds');
      } finally {
        loading = false;
      }
    };
    refresh();
    const timer = setInterval(refresh, 3000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [streamId, busy]);

  const run = async (action) => {
    setBusy(true);
    setActionError('');
    try {
      await action();
      setConfirm(null);
    } catch (err) {
      setActionError(err.response?.data?.message || 'Unable to update camera feeds');
      setConfirm(null);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="space-y-4 rounded-xl border border-slate-800 bg-slate-900 p-6">
      <h2 className="text-base font-semibold text-white">Camera feeds</h2>
      <p className="text-sm text-slate-400">
        Give each camera its own RTMP publishing key. Viewers can follow your director’s view or select a live camera.
      </p>
      {(actionError || loadError) && <p role="alert" className="text-sm text-red-300">{actionError || loadError}</p>}
      {views && (
        <ul className="divide-y divide-slate-800">
          {[views.program, ...views.cameras].map((feed) => {
            const selected = views.directorCameraId === feed.id;
            return (
              <li key={feed.id ?? 'program'} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-white">{feed.label}</span>
                  <StreamStatusBadge status={feed.live ? 'LIVE' : 'OFFLINE'} />
                </div>
                <div className="flex flex-wrap gap-2">
                  <button type="button" className={buttonStyle} disabled={busy || selected}
                    onClick={() => run(async () => setViews(await streamApi.selectDirector(streamId, feed.id)))}>
                    {selected ? 'Director’s choice' : 'Use for director’s view'}
                  </button>
                  {feed.id && (
                    <>
                      <button type="button" className={buttonStyle} disabled={busy}
                        onClick={() => setConfirm({ feed, regenerate: true })}>Regenerate key</button>
                      <button type="button" className={buttonStyle} disabled={busy || feed.live}
                        onClick={() => setConfirm({ feed, regenerate: false })}>Remove</button>
                    </>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <form className="flex flex-wrap items-end gap-2" onSubmit={(event) => {
        event.preventDefault();
        if (!label.trim() || busy) return;
        run(async () => {
          setCredentials(await streamApi.addCamera(streamId, label.trim()));
          setLabel('');
        });
      }}>
        <label className="text-sm text-slate-300">
          Camera name
          <input value={label} onChange={(event) => setLabel(event.target.value)} maxLength={100} required
            className="mt-1 block rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white" />
        </label>
        <button className={buttonStyle} disabled={busy || !label.trim()}>Add camera</button>
      </form>
      {credentials && (
        <ObsConfigPanel key={credentials.obsStreamKey} credentials={credentials} />
      )}
      <ConfirmModal
        open={Boolean(confirm)}
        title={confirm?.regenerate ? 'Regenerate camera key' : 'Remove camera'}
        message={confirm?.regenerate
          ? `Generate a new key for ${confirm.feed.label}? Its previous key will stop working for new connections.`
          : `Remove ${confirm?.feed.label} from this broadcast?`}
        confirmLabel={confirm?.regenerate ? 'Regenerate key' : 'Remove camera'}
        danger={!confirm?.regenerate}
        loading={busy}
        onCancel={() => setConfirm(null)}
        onConfirm={() => run(async () => {
          if (confirm.regenerate) {
            setCredentials(await streamApi.regenerateCameraKey(streamId, confirm.feed.id));
          } else {
            await streamApi.removeCamera(streamId, confirm.feed.id);
            setCredentials((current) => current?.cameraId === confirm.feed.id ? null : current);
          }
        })}
      />
    </section>
  );
}
