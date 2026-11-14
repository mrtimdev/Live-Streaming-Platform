import api from './axios';

export const authApi = {
  login: async (username, password) => {
    const res = await api.post('/auth/login', { username, password });
    return res.data.data;
  },
  logout: async (refreshToken) => {
    await api.post('/auth/logout', { refreshToken });
  },
};
