const express = require('express');
const path = require('path');
const multer = require('multer');
const Character = require('../models/Character');
const Message = require('../models/Message');
const auth = require('../middleware/auth');
const { chat } = require('../services/llmService');
const { synthesizeVoice } = require('../services/ttsService');

const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '..', 'uploads')),
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `${unique}-${file.originalname}`);
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

    const replyMode = Math.random() < 0.5 ? 'text' : 'voice';
    let mediaUrl = null;

    if (replyMode === 'voice') {
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

    const character = await Character.findOne({ where: { id: characterId, userId: req.userId } });
    if (!character) return res.status(404).json({ code: 404, message: '角色不存在' });

    const voiceUrl = `/uploads/${req.file.filename}`;
    const asrText = req.body.text || '[语音消息]';

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

    const replyMode = Math.random() < 0.5 ? 'text' : 'voice';
    let mediaUrl = null;

    if (replyMode === 'voice') {
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
