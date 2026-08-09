import request from '@/utils/request';

export const initiateCall = (characterId) => request.post(`/call/${characterId}/initiate`);
export const endCall = (callId) => request.post(`/call/${callId}/end`);
