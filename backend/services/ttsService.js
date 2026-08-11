const fsp = require('fs/promises');
const path = require('path');
const { callQueuedApi, saveGradioFile } = require('./gradioClient');

async function synthesizeVoice(text, voiceType) {
  if (process.env.TTS_PROVIDER === 'mock') {
    return mockAudio(text);
  }

  const baseUrl = process.env.QWEN_TTS_GRADIO_URL || 'http://127.0.0.1:8001';
  const apiName = process.env.QWEN_TTS_API_NAME || 'run_instruct';
  const timeoutMs = Number(process.env.QWEN_TTS_TIMEOUT_MS || 120000);
  const language = process.env.QWEN_TTS_LANGUAGE || 'Chinese';
  const speaker = resolveSpeaker(voiceType);
  const instruct = buildInstruction(voiceType);

  const result = await callQueuedApi(baseUrl, apiName, {
    text,
    lang_disp: language,
    spk_disp: speaker,
    instruct,
  }, timeoutMs);

  const fileData = Array.isArray(result) ? result[0] : result?.audio;
  if (!fileData) throw new Error('TTS did not return audio');

  const uploadsDir = path.join(__dirname, '..', 'uploads');
  return saveGradioFile(fileData, uploadsDir, '.wav');
}

async function mockAudio(text) {
  const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
  const filename = `${unique}.txt`;
  const filePath = path.join(__dirname, '..', 'uploads', filename);
  await fsp.writeFile(filePath, text);
  return `/uploads/${filename}`;
}

function resolveSpeaker(voiceType) {
  const defaultMap = {
    成熟男声: 'Uncle Fu',
    温柔女声: 'Serena',
    少年音: 'Dylan',
    萝莉音: 'Vivian',
    磁性男声: 'Ryan',
    御姐音: 'Serena',
    元气少女: 'Vivian',
    低沉男声: 'Uncle Fu',
  };
  const map = { ...defaultMap, ...parseJsonEnv('QWEN_TTS_VOICE_MAP') };
  return map[voiceType] || process.env.QWEN_TTS_DEFAULT_SPEAKER || 'Vivian';
}

function buildInstruction(voiceType) {
  const template = process.env.QWEN_TTS_INSTRUCT_TEMPLATE;
  if (template) return template.replace(/\{voiceType\}/g, voiceType || '');
  return voiceType ? `请用${voiceType}的感觉自然地朗读。` : '';
}

function parseJsonEnv(name) {
  if (!process.env[name]) return {};
  try {
    const value = JSON.parse(process.env[name]);
    return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  } catch {
    return {};
  }
}

module.exports = { synthesizeVoice };
