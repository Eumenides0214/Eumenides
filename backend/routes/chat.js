const express = require('express');
const path = require('path');
const multer = require('multer');
const Character = require('../models/Character');
const Message = require('../models/Message');
const auth = require('../middleware/auth');
const { chat } = require('../services/llmService');
const { synthesizeVoice } = require('../services/ttsService');
const { transcribeVoice } = require('../services/asrService');

const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '..', 'uploads')),
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const originalExt = path.extname(file.originalname || '');
    const ext = originalExt || extensionFromMime(file.mimetype) || '.webm';
    const base = path.basename(file.originalname || 'voice', originalExt).replace(/[^\w.-]/g, '') || 'voice';
    cb(null, `${unique}-${base}${ext}`);
  },
});
const upload = multer({ storage, limits: { fileSize: 20 * 1024 * 1024 } });

router.get('/:characterId/messages', auth, async (req, res, next) => {
  try {
    const { characterId } = req.params;
    const character = await Character.findOne({ where: { id: characterId, userId: req.userId } });
    if (!character) return res.status(404).json({ code: 404, message: '角色不存在' });

    const messages = await Message.findAll({
      where: { userId: req.userId, characterId },
      order: [['createdAt', 'ASC']],
    });
    res.json({ code: 200, data: messages });
  } catch (err) {
    next(err);
  }
});

router.post('/:characterId/messages', auth, async (req, res, next) => {
  try {
    const { characterId } = req.params;
    const { content } = req.body;
    const voiceReply = parseBoolean(req.body.voiceReply);

    if (!content) return res.status(400).json({ code: 400, message: '消息内容不能为空' });

    const character = await Character.findOne({ where: { id: characterId, userId: req.userId } });
    if (!character) return res.status(404).json({ code: 404, message: '角色不存在' });

    const userMsg = await Message.create({
      userId: req.userId,
      characterId,
      role: 'user',
      contentType: 'text',
      content,
    });

    const history = await Message.findAll({
      where: { userId: req.userId, characterId },
      order: [['createdAt', 'ASC']],
      limit: 20,
    });

    const assistantReply = await chat(character, history, content);

    let mediaUrl = null;

    if (voiceReply) {
      try {
        mediaUrl = await synthesizeVoice(assistantReply, character.voiceType);
      } catch (e) {
        console.warn('[TTS] 语音合成失败，降级为文字回复:', e.message);
      }
    }

    const assistantMsg = await Message.create({
      userId: req.userId,
      characterId,
      role: 'assistant',
      contentType: mediaUrl ? 'voice' : 'text',
      content: assistantReply,
      mediaUrl,
    });

    res.json({
      code: 200,
      data: {
        userMessage: userMsg,
        assistantMessage: assistantMsg,
        replyMode: mediaUrl ? 'voice' : 'text',
      },
    });
  } catch (err) {
    next(err);
  }
});

router.post('/:characterId/voice', auth, upload.single('voice'), async (req, res, next) => {
  try {
    const { characterId } = req.params;
    if (!req.file) return res.status(400).json({ code: 400, message: '请上传语音文件' });
    const voiceReply = parseBoolean(req.body.voiceReply);

    const character = await Character.findOne({ where: { id: characterId, userId: req.userId } });
    if (!character) return res.status(404).json({ code: 404, message: '角色不存在' });

    const voiceUrl = `/uploads/${req.file.filename}`;
    let asrText = String(req.body.text || '').trim();
    if (!asrText) {
      try {
        asrText = await transcribeVoice(req.file.path);
      } catch (e) {
        console.warn('[ASR] 语音识别失败:', e.message);
        return res.status(502).json({ code: 502, message: `语音识别失败：${e.message}` });
      }
    }

    const userMsg = await Message.create({
      userId: req.userId,
      characterId,
      role: 'user',
      contentType: 'voice',
      content: asrText,
      mediaUrl: voiceUrl,
    });

    const history = await Message.findAll({
      where: { userId: req.userId, characterId },
      order: [['createdAt', 'ASC']],
      limit: 20,
    });

    const assistantReply = await chat(character, history, asrText);

    let mediaUrl = null;

    if (voiceReply) {
      try {
        mediaUrl = await synthesizeVoice(assistantReply, character.voiceType);
      } catch (e) {
        console.warn('[TTS] 语音合成失败，降级为文字回复:', e.message);
      }
    }

    const assistantMsg = await Message.create({
      userId: req.userId,
      characterId,
      role: 'assistant',
      contentType: mediaUrl ? 'voice' : 'text',
      content: assistantReply,
      mediaUrl,
    });

    res.json({
      code: 200,
      data: {
        userMessage: userMsg,
        assistantMessage: assistantMsg,
        replyMode: mediaUrl ? 'voice' : 'text',
      },
    });
  } catch (err) {
    next(err);
  }
});

router.delete('/:characterId/messages', auth, async (req, res, next) => {
  try {
    const { characterId } = req.params;
    const character = await Character.findOne({ where: { id: characterId, userId: req.userId } });
    if (!character) return res.status(404).json({ code: 404, message: '角色不存在' });

    await Message.destroy({ where: { userId: req.userId, characterId } });
    res.json({ code: 200, message: '聊天记录已清空' });
  } catch (err) {
    next(err);
  }
});

module.exports = router;

function parseBoolean(value) {
  return value === true || value === 'true' || value === '1' || value === 1;
}

function extensionFromMime(mimeType) {
  const map = {
    'audio/webm': '.webm',
    'audio/ogg': '.ogg',
    'audio/mp4': '.m4a',
    'audio/mpeg': '.mp3',
    'audio/wav': '.wav',
    'audio/x-wav': '.wav',
  };
  return map[String(mimeType || '').split(';')[0].toLowerCase()];
}
