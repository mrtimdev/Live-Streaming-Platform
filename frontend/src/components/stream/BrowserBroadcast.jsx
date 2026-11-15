import { useEffect, useRef, useState } from 'react';
import api from '../../api/axios';
import AudioMeter from './AudioMeter';

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
  const [devices, setDevices] = useState([]);
  const [cameraId, setCameraId] = useState('');
  const [microphoneId, setMicrophoneId] = useState('');
  const [mediaStream, setMediaStream] = useState(null);
  const [hasAudio, setHasAudio] = useState(false);
  const [micMuted, setMicMuted] = useState(false);
  const [videoMuted, setVideoMuted] = useState(false);
  const [sourceMode, setSourceMode] = useState('camera');
  const [quality, setQuality] = useState('720p');
  const [maxBitrate, setMaxBitrate] = useState('');

  useEffect(() => {
    let cancelled = false;
    const refresh = () => navigator.mediaDevices?.enumerateDevices?.().then((items) => {
      if (!cancelled) setDevices(items);
    }).catch(() => {});
    refresh();
    navigator.mediaDevices?.addEventListener('devicechange', refresh);
    return () => { cancelled = true; navigator.mediaDevices?.removeEventListener('devicechange', refresh); };
  }, [mediaStream]);

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
    setMediaStream(null);
    setPhase('idle');
    setHasAudio(false);
    setMicMuted(false);
    setVideoMuted(false);
    setError(message);
  };

  const toggleMic = () => {
    const audioTrack = active.current?.camera?.getAudioTracks()[0];
    if (!audioTrack) return;
    const nextMuted = !micMuted;
    audioTrack.enabled = !nextMuted;
    setMicMuted(nextMuted);
  };

  const toggleVideo = () => {
    const videoTrack = active.current?.camera?.getVideoTracks()[0];
    if (!videoTrack) return;
    const nextMuted = !videoMuted;
    videoTrack.enabled = !nextMuted;
    setVideoMuted(nextMuted);
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
    const presets = {
      '480p': { width: { ideal: 854 }, height: { ideal: 480 }, frameRate: { ideal: 30 } },
      '720p': { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30 } },
      '1080p': { width: { ideal: 1920 }, height: { ideal: 1080 }, frameRate: { ideal: 30 } },
    };
    const videoConstraints = { ...(cameraId ? { deviceId: { exact: cameraId } } : {}), ...presets[quality] };
    const audioConstraints = microphoneId === 'none' ? false : {
      ...(microphoneId ? { deviceId: { exact: microphoneId } } : {}),
      echoCancellation: true, noiseSuppression: true, autoGainControl: true,
    };
    try {
      let camera;
      if (sourceMode === 'screen') {
        if (!navigator.mediaDevices?.getDisplayMedia) {
          throw new Error('Screen sharing is not supported in this browser.');
        }
        const screen = await navigator.mediaDevices.getDisplayMedia({ video: presets[quality], audio: false });
        const tracks = [...screen.getVideoTracks()];
        if (audioConstraints) {
          try {
            const mic = await navigator.mediaDevices.getUserMedia({ video: false, audio: audioConstraints });
            tracks.push(...mic.getAudioTracks());
          } catch {
            // Continue screen share without mic if mic access fails
          }
        }
        camera = new MediaStream(tracks);
      } else {
        camera = await navigator.mediaDevices.getUserMedia({
          video: videoConstraints,
          audio: audioConstraints,
        });
      }
      if (active.current !== session) {
        camera.getTracks().forEach((track) => track.stop());
        return;
      }
      session.camera = camera;
      setMediaStream(camera);
      const audioTrack = camera.getAudioTracks()[0];
      setHasAudio(Boolean(audioTrack));
      audioTrack?.addEventListener('ended', () => {
        if (active.current === session) {
          setHasAudio(false);
          setError('Microphone disconnected. Stop and reopen the preview to select another microphone.');
        }
      });
      setMicMuted(false);
      camera.getVideoTracks()[0].addEventListener('ended', () => {
        if (active.current === session) stop('Camera disconnected.');
      });
      preview.current.srcObject = camera;
      setPhase('preview');
    } catch (err) {
      if (active.current === session) {
        stop(err.name === 'NotAllowedError'
          ? 'Allow camera and microphone access in your browser and macOS settings, then try again.'
          : 'Could not open the selected camera or microphone. Check devices, or select No microphone for video only.');
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
      const h264 = RTCRtpSender.getCapabilities('video')?.codecs.filter(
        (codec) => codec.mimeType.toLowerCase() === 'video/h264'
      );
      if (!h264?.length) throw new Error('This browser cannot publish H.264. Try Chrome on your Mac.');
      const track = session.camera.getVideoTracks()[0];
      const transceiver = peer.addTransceiver(track, { direction: 'sendonly', streams: [session.camera] });
      transceiver.setCodecPreferences(h264);
      if (maxBitrate) {
        const params = transceiver.sender.getParameters();
        if (!params.encodings?.length) params.encodings = [{}];
        params.encodings[0].maxBitrate = Number(maxBitrate);
        await transceiver.sender.setParameters(params).catch(() => {});
      }
      const audioTrack = session.camera.getAudioTracks()[0];
      if (audioTrack) {
        const audioTransceiver = peer.addTransceiver(audioTrack, { direction: 'sendonly', streams: [session.camera] });
        const opus = RTCRtpSender.getCapabilities('audio')?.codecs.filter(
          (codec) => codec.mimeType.toLowerCase() === 'audio/opus'
        );
        if (opus?.length) audioTransceiver.setCodecPreferences(opus);
      }
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
        stop(err.response?.status === 423 ? 'Publishing is locked by an administrator.' : err.response?.status === 409 ? 'Stop the current main feed before going live from this camera.'
          : err.response ? 'The streaming server rejected the camera connection.' : err.message);
      }
    }
  };

  return (
    <section className="space-y-4 rounded-xl border border-slate-800 bg-slate-900 p-6">
      <h2 className="text-base font-semibold text-white">Broadcast from this browser</h2>
      <p className="text-sm text-slate-400">Preview your camera, then publish it as the main feed. Keep this tab open while live.</p>
      <fieldset disabled={phase !== 'idle'} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="text-sm text-slate-300">Video source
          <select value={sourceMode} onChange={(event) => setSourceMode(event.target.value)} className="mt-1 block w-full rounded border border-slate-700 bg-slate-950 p-2 disabled:opacity-50">
            <option value="camera">Camera</option>
            <option value="screen">Screen share</option>
          </select>
        </label>
        <label className="text-sm text-slate-300">Camera
          <select value={cameraId} disabled={sourceMode === 'screen'} onChange={(event) => setCameraId(event.target.value)} className="mt-1 block w-full rounded border border-slate-700 bg-slate-950 p-2 disabled:opacity-50">
            <option value="">Default camera</option>
            {devices.filter((device) => device.kind === 'videoinput' && device.deviceId).map((device, index) => (
              <option key={device.deviceId} value={device.deviceId}>{device.label || `Camera ${index + 1}`}</option>
            ))}
          </select>
        </label>
        <label className="text-sm text-slate-300">Microphone
          <select value={microphoneId} onChange={(event) => setMicrophoneId(event.target.value)} className="mt-1 block w-full rounded border border-slate-700 bg-slate-950 p-2 disabled:opacity-50">
            <option value="">Default microphone</option><option value="none">No microphone (video only)</option>
            {devices.filter((device) => device.kind === 'audioinput' && device.deviceId).map((device, index) => (
              <option key={device.deviceId} value={device.deviceId}>{device.label || `Microphone ${index + 1}`}</option>
            ))}
          </select>
        </label>
        <div className="grid grid-cols-2 gap-2">
          <label className="text-sm text-slate-300">Quality
            <select value={quality} onChange={(event) => setQuality(event.target.value)} className="mt-1 block w-full rounded border border-slate-700 bg-slate-950 p-2 disabled:opacity-50">
              <option value="480p">480p</option>
              <option value="720p">720p</option>
              <option value="1080p">1080p</option>
            </select>
          </label>
          <label className="text-sm text-slate-300">Bitrate
            <select value={maxBitrate} onChange={(event) => setMaxBitrate(event.target.value)} className="mt-1 block w-full rounded border border-slate-700 bg-slate-950 p-2 disabled:opacity-50">
              <option value="">Auto</option>
              <option value="1500000">1.5 Mbps</option>
              <option value="2500000">2.5 Mbps</option>
              <option value="4000000">4.0 Mbps</option>
            </select>
          </label>
        </div>
      </fieldset>
      <p className="text-xs text-slate-400">Device names appear after permission is granted. Close the preview or stop broadcasting before changing devices.</p>
      {hasAudio && <AudioMeter stream={mediaStream} muted={micMuted} />}
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
            {hasAudio && (
              <button type="button" onClick={toggleMic}
                className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-white hover:bg-slate-800">
                {micMuted ? 'Unmute mic' : 'Mute mic'}
              </button>
            )}
            <button type="button" onClick={toggleVideo}
              className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-white hover:bg-slate-800">
              {videoMuted ? 'Resume video' : 'Pause video'}
            </button>
            <button type="button" onClick={() => stop()}
              className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-white hover:bg-slate-800">
              {phase === 'live' || phase === 'connecting' ? 'Stop broadcast' : 'Close camera'}
            </button>
          </>
        )}
        <span role="status" className="text-sm text-slate-300">
          {phase === 'live' && (videoMuted ? 'Camera is live · video paused' : !hasAudio ? 'Camera is live · video only (no mic)' : micMuted ? 'Camera is live · mic muted' : 'Camera is live · video & audio')}
          {phase === 'connecting' && 'Connecting…'}
          {phase === 'preview' && (programLive ? 'The main feed is already live.' : !hasAudio ? 'No microphone detected · video only' : micMuted ? 'Microphone muted' : '')}
        </span>
      </div>
    </section>
  );
}
