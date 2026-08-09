const fs = require('fs');
const path = require('path');

async function synthesizeVoice(text, voiceType) {
  const apiKey = process.env.TTS_API_KEY;

  if (!apiKey || apiKey === '__REPLACE_ME__') {
    return mockAudio(text);
  }

  try {
    const res = await fetch(`${process.env.TTS_API_URL || 'https://api.example.com/tts'}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ text, voice: voiceType }),
    });

    if (!res.ok) throw new Error(`TTS API 错误: ${res.status}`);
    const buffer = Buffer.from(await res.arrayBuffer());
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const filename = `${unique}.mp3`;
    const filePath = path.join(__dirname, '..', 'uploads', filename);
    fs.writeFileSync(filePath, buffer);
    return `/uploads/${filename}`;
  } catch (err) {
    console.warn('[TTS] 调用失败，使用模拟音频:', err.message);
    return mockAudio(text);
  }
}

function mockAudio(text) {
  const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
  const filename = `${unique}.txt`;
  const filePath = path.join(__dirname, '..', 'uploads', filename);
  fs.writeFileSync(filePath, text);
  return `/uploads/${filename}`;
}

module.exports = { synthesizeVoice };
