export function incomingBitrate(previous, current, elapsedMs) {
  if (!previous || !current.ready || !current.sourceId || current.sourceId !== previous.sourceId
      || elapsedMs <= 0 || current.bytesReceived < previous.bytesReceived) return null;
  return (current.bytesReceived - previous.bytesReceived) * 8 / elapsedMs / 1000;
}
