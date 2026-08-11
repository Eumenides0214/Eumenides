const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');

function cleanBaseUrl(baseUrl) {
  return String(baseUrl || '').replace(/\/+$/, '');
}

function cleanApiName(apiName) {
  return String(apiName || '').replace(/^\/+/, '');
}

async function fetchWithTimeout(url, options = {}, timeoutMs = 120000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function uploadFile(baseUrl, filePath, timeoutMs) {
  const buffer = await fsp.readFile(filePath);
  const form = new FormData();
  const blob = new Blob([buffer]);
  form.append('files', blob, path.basename(filePath));

  const res = await fetchWithTimeout(`${cleanBaseUrl(baseUrl)}/gradio_api/upload`, {
    method: 'POST',
    body: form,
  }, timeoutMs);

  if (!res.ok) throw new Error(`Gradio upload failed: ${res.status}`);

  const data = await res.json();
  const uploadedPath = Array.isArray(data) ? data[0] : data?.path;
  if (!uploadedPath) throw new Error('Gradio upload returned empty file path');
  return uploadedPath;
}

async function callQueuedApi(baseUrl, apiName, payload, timeoutMs) {
  const base = cleanBaseUrl(baseUrl);
  const api = cleanApiName(apiName);
  const useDataArray = Array.isArray(payload);
  const callPath = useDataArray ? `${base}/gradio_api/call/${api}` : `${base}/gradio_api/call/v2/${api}`;

  const postRes = await fetchWithTimeout(callPath, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(useDataArray ? { data: payload } : payload),
  }, timeoutMs);

  if (!postRes.ok) throw new Error(`Gradio API call failed: ${postRes.status}`);

  const postData = await postRes.json();
  if (!postData?.event_id) throw new Error('Gradio API did not return event_id');

  const streamRes = await fetchWithTimeout(`${base}/gradio_api/call/${api}/${postData.event_id}`, {
    method: 'GET',
  }, timeoutMs);

  if (!streamRes.ok) throw new Error(`Gradio result stream failed: ${streamRes.status}`);
  return parseServerSentEvents(await streamRes.text());
}

function parseServerSentEvents(rawText) {
  const events = [];
  let eventName = 'message';
  let dataLines = [];

  for (const line of rawText.split(/\r?\n/)) {
    if (!line.trim()) {
      flushEvent(events, eventName, dataLines);
      eventName = 'message';
      dataLines = [];
      continue;
    }

    if (line.startsWith('event:')) {
      eventName = line.slice(6).trim();
    } else if (line.startsWith('data:')) {
      dataLines.push(line.slice(5).trimStart());
    }
  }

  flushEvent(events, eventName, dataLines);

  const errorEvent = events.find((event) => event.event === 'error');
  if (errorEvent) {
    const message = errorEvent.data?.error || JSON.stringify(errorEvent.data);
    throw new Error(`Gradio API error: ${message}`);
  }

  const completeEvent = [...events].reverse().find((event) => event.event === 'complete');
  if (!completeEvent) throw new Error('Gradio API stream did not complete');
  return completeEvent.data;
}

function flushEvent(events, eventName, dataLines) {
  if (!dataLines.length) return;

  const rawData = dataLines.join('\n');
  let data = rawData;
  try {
    data = JSON.parse(rawData);
  } catch {}

  events.push({ event: eventName, data });
}

async function saveGradioFile(fileData, uploadsDir, fallbackExt = '.wav') {
  if (!fileData || typeof fileData !== 'object') {
    throw new Error('Gradio did not return a file');
  }

  const ext = safeExt(path.extname(fileData.orig_name || fileData.path || '') || fallbackExt);
  const filename = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
  const destPath = path.join(uploadsDir, filename);

  if (fileData.path && fs.existsSync(fileData.path)) {
    await fsp.copyFile(fileData.path, destPath);
    return `/uploads/${filename}`;
  }

  if (fileData.url) {
    const res = await fetchWithTimeout(fileData.url, {}, Number(process.env.QWEN_TTS_TIMEOUT_MS || 120000));
    if (!res.ok) throw new Error(`Failed to download Gradio file: ${res.status}`);
    const buffer = Buffer.from(await res.arrayBuffer());
    await fsp.writeFile(destPath, buffer);
    return `/uploads/${filename}`;
  }

  throw new Error('Gradio file has neither readable path nor url');
}

function safeExt(ext) {
  return /^\.[a-zA-Z0-9]{1,8}$/.test(ext) ? ext.toLowerCase() : '.wav';
}

module.exports = {
  callQueuedApi,
  saveGradioFile,
  uploadFile,
};
