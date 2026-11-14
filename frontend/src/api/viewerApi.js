import api from './axios';

export const viewerApi = {
  sendHeartbeat: async (streamId, sessionId) => {
    const res = await api.post(`/public/streams/${encodeURIComponent(streamId)}/heartbeat`, {
      sessionId,
    });
    return res.data.data;
  },
  disconnect: async (streamId, sessionId) => {
    const res = await api.delete(`/public/streams/${encodeURIComponent(streamId)}/heartbeat`, {
      params: { sessionId },
    });
    return res.data.data;
  },
};
