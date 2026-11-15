import api from './axios';

export const streamApi = {
  // Public
  listPublicLive: async () => {
    const res = await api.get('/public/streams');
    return res.data.data;
  },
  getPublicStream: async (streamId) => {
    const res = await api.get(`/public/streams/${encodeURIComponent(streamId)}`);
    return res.data.data;
  },
  getPlayback: async (streamId) => {
    const res = await api.get(`/public/streams/${encodeURIComponent(streamId)}/playback`);
    return res.data.data;
  },

  // Admin streams
  listAdminStreams: async (params = {}) => {
    const res = await api.get('/streams', { params });
    return res.data.data;
  },
  getAdminStream: async (id) => {
    const res = await api.get(`/streams/${encodeURIComponent(id)}`);
    return res.data.data;
  },
  createStream: async (payload) => {
    const res = await api.post('/streams', payload);
    return res.data.data;
  },
  updateStream: async (id, payload) => {
    const res = await api.put(`/streams/${encodeURIComponent(id)}`, payload);
    return res.data.data;
  },
  deleteStream: async (id) => {
    await api.delete(`/streams/${encodeURIComponent(id)}`);
  },
  regenerateKey: async (id) => {
    const res = await api.post(`/streams/${encodeURIComponent(id)}/regenerate-key`);
    return res.data.data;
  },
  getStreamHistory: async (id) => {
    const res = await api.get(`/streams/${encodeURIComponent(id)}/history`);
    return res.data.data;
  },
  getViews: async (id) => {
    const res = await api.get(`/streams/${encodeURIComponent(id)}/views`);
    return res.data.data;
  },
  addCamera: async (id, label) => {
    const res = await api.post(`/streams/${encodeURIComponent(id)}/cameras`, { label });
    return res.data.data;
  },
  regenerateCameraKey: async (id, cameraId) => {
    const res = await api.post(`/streams/${encodeURIComponent(id)}/cameras/${encodeURIComponent(cameraId)}/regenerate-key`);
    return res.data.data;
  },
  removeCamera: async (id, cameraId) => {
    await api.delete(`/streams/${encodeURIComponent(id)}/cameras/${encodeURIComponent(cameraId)}`);
  },
  selectDirector: async (id, cameraId) => {
    const res = await api.put(`/streams/${encodeURIComponent(id)}/director`, { cameraId });
    return res.data.data;
  },
  getStreamHealth: async (id) => {
    const res = await api.get(`/streams/${encodeURIComponent(id)}/health`);
    return res.data.data;
  },
  setStreamLock: async (id, locked) => {
    const res = await api.put(`/streams/${encodeURIComponent(id)}/lock`, { locked });
    return res.data.data;
  },
  disconnectPublisher: async (id, sourceId, cameraId) => {
    const res = await api.post(`/streams/${encodeURIComponent(id)}/disconnect`, null, {
      params: { sourceId, ...(cameraId ? { cameraId } : {}) },
    });
    return res.data.data;
  },

  // Analytics
  getDashboardAnalytics: async () => {
    const res = await api.get('/analytics/dashboard');
    return res.data.data;
  },
  getStreamAnalyticsList: async () => {
    const res = await api.get('/analytics/streams');
    return res.data.data;
  },
  getStreamAnalyticsDetail: async (id) => {
    const res = await api.get(`/analytics/streams/${encodeURIComponent(id)}`);
    return res.data.data;
  },

  // Users
  listUsers: async () => {
    const res = await api.get('/users');
    return res.data.data;
  },
  createUser: async (payload) => {
    const res = await api.post('/users', payload);
    return res.data.data;
  },
  updateUser: async (id, payload) => {
    const res = await api.put(`/users/${id}`, payload);
    return res.data.data;
  },
  deleteUser: async (id) => {
    await api.delete(`/users/${id}`);
  },
};
