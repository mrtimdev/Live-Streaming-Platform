export function formatDuration(totalSeconds) {
  if (totalSeconds == null || totalSeconds < 0) return '0s';
  const secs = Math.floor(totalSeconds);
  const hours = Math.floor(secs / 3600);
  const minutes = Math.floor((secs % 3600) / 60);
  const seconds = secs % 60;

  if (hours > 0) {
    return `${hours}h ${String(minutes).padStart(2, '0')}m ${String(seconds).padStart(2, '0')}s`;
  }
  if (minutes > 0) {
    return `${minutes}m ${String(seconds).padStart(2, '0')}s`;
  }
  return `${seconds}s`;
}

export function formatDateTime(isoString) {
  if (!isoString) return '—';
  const normalized = isoString.endsWith('Z') ? isoString : `${isoString}Z`;
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return isoString;
  return date.toLocaleString();
}

export function getLiveDurationSeconds(startedAt) {
  if (!startedAt) return 0;
  const normalized = startedAt.endsWith('Z') ? startedAt : `${startedAt}Z`;
  const start = new Date(normalized).getTime();
  if (Number.isNaN(start)) return 0;
  return Math.max(0, Math.floor((Date.now() - start) / 1000));
}

export function getOrCreateViewerSessionId() {
  const key = 'livestream_viewer_session_id';
  let id = sessionStorage.getItem(key);
  if (!id) {
    id = typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `v-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    sessionStorage.setItem(key, id);
  }
  return id;
}
