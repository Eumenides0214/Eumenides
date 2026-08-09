import request from '@/utils/request';

export const getCharacters = () => request.get('/characters');
export const getCharacter = (id) => request.get(`/characters/${id}`);
export const createCharacter = (data) => request.post('/characters', data);
export const updateCharacter = (id, data) => request.put(`/characters/${id}`, data);
export const deleteCharacter = (id) => request.delete(`/characters/${id}`);
export const generateAvatar = (id) => request.post(`/characters/${id}/avatar/generate`);
export const uploadAvatar = (id, file) => {
  const fd = new FormData();
  fd.append('avatar', file);
  return request.post(`/characters/${id}/avatar/upload`, fd, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};
