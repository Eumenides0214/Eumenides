export function genderText(gender) {
  if (gender === 'male') return '男';
  if (gender === 'female') return '女';
  return '其他';
}

export function characterInitial(name) {
  return name?.charAt(0) || '?';
}

export function shortText(text = '', max = 80) {
  const clean = String(text || '').replace(/\s+/g, ' ').trim();
  return clean.length > max ? `${clean.slice(0, max)}...` : clean;
}

export function formatTime(value) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';

  const diff = Date.now() - date.getTime();
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diff < minute) return '刚刚';
  if (diff < hour) return `${Math.floor(diff / minute)}分钟前`;
  if (diff < day) return `${Math.floor(diff / hour)}小时前`;
  if (diff < 7 * day) return `${Math.floor(diff / day)}天前`;
  return date.toLocaleDateString();
}

export function parseCharacterSpeech(content = '') {
  const text = String(content || '').trim();
  const match = text.match(/^([（(][^）)]{1,120}[）)])\s*([\s\S]*)$/);
  if (!match) return { action: '', speech: text };
  return {
    action: match[1].slice(1, -1),
    speech: match[2].trim(),
  };
}

export function loadReplyMode(characterId) {
  return localStorage.getItem(`replyMode:${characterId}`) || localStorage.getItem('defaultReplyMode') || 'text';
}

export function saveReplyMode(characterId, mode) {
  localStorage.setItem(`replyMode:${characterId}`, mode);
}

export function shouldUseVoiceReply(mode, inputType = 'text') {
  if (mode === 'voice') return true;
  if (mode === 'text') return false;
  return inputType === 'voice';
}

export async function copyToClipboard(text) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand('copy');
  document.body.removeChild(textarea);
}
