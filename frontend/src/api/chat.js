import request from '@/utils/request';

export const getMessages = (characterId) => request.get(`/chat/${characterId}/messages`);
export const sendMessage = (characterId, content, options = {}) =>
  request.post(`/chat/${characterId}/messages`, { content, voiceReply: !!options.voiceReply });
export const sendVoice = (characterId, file, text, options = {}) => {
  const fd = new FormData();
  fd.append('voice', file, buildVoiceFilename(file));
  if (text) fd.append('text', text);
  fd.append('voiceReply', String(!!options.voiceReply));
  return request.post(`/chat/${characterId}/voice`, fd, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};
export const clearMessages = (characterId) => request.delete(`/chat/${characterId}/messages`);

function buildVoiceFilename(file) {
  const mime = file?.type || '';
  const ext = mime.includes('ogg')
    ? 'ogg'
    : mime.includes('mp4')
      ? 'm4a'
      : mime.includes('wav')
        ? 'wav'
        : 'webm';
  return `voice-message-${Date.now()}.${ext}`;
}
