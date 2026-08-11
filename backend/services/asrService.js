const { callQueuedApi, uploadFile } = require('./gradioClient');

async function transcribeVoice(filePath) {
  const baseUrl = process.env.QWEN_ASR_GRADIO_URL || 'http://127.0.0.1:8000';
  const apiName = process.env.QWEN_ASR_API_NAME || 'run';
  const timeoutMs = Number(process.env.QWEN_ASR_TIMEOUT_MS || 120000);
  const language = process.env.QWEN_ASR_LANGUAGE || 'Auto';

  const uploadedPath = await uploadFile(baseUrl, filePath, timeoutMs);
  const result = await callQueuedApi(baseUrl, apiName, [
    {
      path: uploadedPath,
      meta: { _type: 'gradio.FileData' },
    },
    language,
    false,
  ], timeoutMs);

  const text = Array.isArray(result) ? result[1] : result?.text;
  if (!text || !String(text).trim()) {
    throw new Error('ASR returned empty text');
  }

  return String(text).trim();
}

module.exports = { transcribeVoice };
