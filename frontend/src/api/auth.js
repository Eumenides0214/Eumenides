import request from '@/utils/request';

export const register = (data) => request.post('/auth/register', data);
export const login = (data) => request.post('/auth/login', data);
export const getProfile = () => request.get('/auth/me');
export const updateProfile = (data) => request.put('/auth/me', data);
