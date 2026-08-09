import request from '@/utils/request';

export const getMessages = (characterId) => request.get(`/chat/${characterId}/messages`);
export const sendMessage = (characterId, content) =>
  request.post(`/chat/${characterId}/messages`, { content });
export const sendVoice = (characterId, file, text) => {
  const fd = new FormData();
  fd.append('voice', file);
  if (text) fd.append('text', text);
  return request.post(`/chat/${characterId}/voice`, fd, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};
export const clearMessages = (characterId) => request.delete(`/chat/${characterId}/messages`);
