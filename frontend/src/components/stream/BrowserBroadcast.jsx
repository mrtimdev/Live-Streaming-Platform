import { useEffect, useRef, useState } from 'react';
import api from '../../api/axios';

function waitForIce(peer, signal) {
  if (peer.iceGatheringState === 'complete') return Promise.resolve();
  return new Promise((resolve, reject) => {
    const settle = (error) => {
      clearTimeout(timer);
      peer.removeEventListener('icegatheringstatechange', onChange);
      signal.removeEventListener('abort', onAbort);
      if (error) reject(error);
      else resolve();
    };
    const onAbort = () => settle(signal.reason);
    const onChange = () => {
      if (peer.iceGatheringState === 'complete') settle();
    };
    const timer = setTimeout(() => settle(new Error('Camera connection setup timed out. Try again.')), 5000);
    peer.addEventListener('icegatheringstatechange', onChange);
    signal.addEventListener('abort', onAbort, { once: true });
  });
}

function closeSession(session) {
  session.abort.abort();
  clearTimeout(session.timer);
  session.peer?.close();
  session.camera?.getTracks().forEach((track) => track.stop());
  if (session.location) api.delete(session.location).catch(() => {});
}

export default function BrowserBroadcast({ streamId, programLive }) {
  const preview = useRef(null);
  const active = useRef(null);
  const [phase, setPhase] = useState('idle');
  const [error, setError] = useState('');

  useEffect(() => () => {
    const session = active.current;
    active.current = null;
    if (session) closeSession(session);
  }, []);

  const stop = (message = '') => {
    const session = active.current;
    active.current = null;
    if (session) closeSession(session);
    if (preview.current) preview.current.srcObject = null;
    setPhase('idle');
    setError(message);
  };

  const openCamera = async () => {
    if (active.current) return;
    if (!navigator.mediaDevices?.getUserMedia || !window.RTCPeerConnection) {
      setError('Open this page on localhost or HTTPS in a browser that supports camera access.');
      return;
    }
    const session = { abort: new AbortController() };
    active.current = session;
    setError('');
    setPhase('opening');
    try {
      const camera = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30 } },
        audio: false,
      });
      if (active.current !== session) {
        camera.getTracks().forEach((track) => track.stop());
        return;
      }
      session.camera = camera;
      camera.getVideoTracks()[0].addEventListener('ended', () => {
        if (active.current === session) stop('Camera disconnected.');
      });
      preview.current.srcObject = camera;
      setPhase('preview');
    } catch (err) {
      if (active.current === session) {
        stop(err.name === 'NotAllowedError'
          ? 'Allow camera access in your browser and macOS settings, then try again.'
          : 'Could not open a camera. Check that it is connected and available.');
      }
    }
  };

  const publish = async () => {
    const session = active.current;
    if (!session || session.peer) return;
    setPhase('connecting');
    try {
      const peer = new RTCPeerConnection();
      session.peer = peer;
      const h264 = RTCRtpSender.getCapabilities('video')?.codecs.filter((codec) => codec.mimeType === 'video/H264');
      if (!h264?.length) throw new Error('This browser cannot publish H.264. Try Chrome on your Mac.');
      const track = session.camera.getVideoTracks()[0];
      const transceiver = peer.addTransceiver(track, { direction: 'sendonly', streams: [session.camera] });
      transceiver.setCodecPreferences(h264);
      peer.onconnectionstatechange = () => {
        if (active.current !== session) return;
        if (peer.connectionState === 'connected') {
          clearTimeout(session.timer);
          setPhase('live');
        } else if (peer.connectionState === 'failed' || peer.connectionState === 'closed') {
          stop('Camera connection ended. Open the camera to try again.');
        } else if (peer.connectionState === 'disconnected') {
          clearTimeout(session.timer);
          session.timer = setTimeout(() => stop('Camera connection was lost.'), 5000);
        }
      };
      session.timer = setTimeout(() => stop('Could not connect to the streaming server. Try again.'), 15_000);
      await peer.setLocalDescription(await peer.createOffer());
      await waitForIce(peer, session.abort.signal);
      const response = await api.post(`/streams/${encodeURIComponent(streamId)}/browser-broadcast`,
        peer.localDescription.sdp, { headers: { 'Content-Type': 'application/sdp', Accept: 'application/sdp' } });
      session.location = response.headers.location?.replace(/^\/api\//, '/');
      if (active.current !== session) {
        closeSession(session);
        return;
      }
      await peer.setRemoteDescription({ type: 'answer', sdp: response.data });
    } catch (err) {
      if (active.current === session) {
        stop(err.response?.status === 409 ? 'Stop the current main feed before going live from this camera.'
          : err.response ? 'The streaming server rejected the camera connection.' : err.message);
      }
    }
  };

  return (
    <section className="space-y-4 rounded-xl border border-slate-800 bg-slate-900 p-6">
      <h2 className="text-base font-semibold text-white">Broadcast from this browser</h2>
      <p className="text-sm text-slate-400">Preview your camera, then publish it as the main feed. Keep this tab open while live.</p>
      <video ref={preview} autoPlay playsInline muted hidden={phase === 'idle' || phase === 'opening'}
        aria-label="Camera preview" className="aspect-video w-full max-w-lg rounded-lg bg-black object-contain" />
      {error && <p role="alert" className="text-sm text-red-300">{error}</p>}
      <div className="flex flex-wrap items-center gap-3">
        {phase === 'idle' || phase === 'opening' ? (
          <button type="button" disabled={phase === 'opening'} onClick={openCamera}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50">
            {phase === 'opening' ? 'Opening camera…' : 'Preview camera'}
          </button>
        ) : (
          <>
            {phase === 'preview' && (
              <button type="button" disabled={programLive} onClick={publish}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50">
                Go live
              </button>
            )}
            <button type="button" onClick={() => stop()}
              className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-white hover:bg-slate-800">
              {phase === 'live' || phase === 'connecting' ? 'Stop broadcast' : 'Close camera'}
            </button>
          </>
        )}
        <span role="status" className="text-sm text-slate-300">
          {phase === 'live' && 'Camera is live · video only'}
          {phase === 'connecting' && 'Connecting…'}
          {phase === 'preview' && programLive && 'The main feed is already live.'}
        </span>
      </div>
    </section>
  );
}
