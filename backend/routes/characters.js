const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const Character = require('../models/Character');
const auth = require('../middleware/auth');
const { generateAvatar } = require('../services/imageService');
const { synthesizeVoice } = require('../services/ttsService');

const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '..', 'uploads')),
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `${unique}-${file.originalname}`);
  },
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 } });

router.get('/', auth, async (req, res, next) => {
  try {
    const characters = await Character.findAll({ where: { userId: req.userId }, order: [['createdAt', 'DESC']] });
    res.json({ code: 200, data: characters });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', auth, async (req, res, next) => {
  try {
    const character = await Character.findOne({ where: { id: req.params.id, userId: req.userId } });
    if (!character) return res.status(404).json({ code: 404, message: '角色不存在' });
    res.json({ code: 200, data: character });
  } catch (err) {
    next(err);
  }
});

router.post('/', auth, async (req, res, next) => {
  try {
    const { name, gender, age, voiceType, description, tags } = req.body;

    if (!name || !gender || !age || !voiceType || !description) {
      return res.status(400).json({ code: 400, message: '请填写完整角色信息' });
    }

    const character = await Character.create({
      userId: req.userId,
      name,
      gender,
      age: Number(age),
      voiceType,
      description,
      tags: Array.isArray(tags) ? tags : [],
    });

    res.status(201).json({ code: 201, message: '角色创建成功', data: character });
  } catch (err) {
    next(err);
  }
});

router.put('/:id', auth, async (req, res, next) => {
  try {
    const character = await Character.findOne({ where: { id: req.params.id, userId: req.userId } });
    if (!character) return res.status(404).json({ code: 404, message: '角色不存在' });

    const { name, gender, age, voiceType, description, tags, avatar } = req.body;
    if (name !== undefined) character.name = name;
    if (gender !== undefined) character.gender = gender;
    if (age !== undefined) character.age = Number(age);
    if (voiceType !== undefined) character.voiceType = voiceType;
    if (description !== undefined) character.description = description;
    if (tags !== undefined) character.tags = Array.isArray(tags) ? tags : [];
    if (avatar !== undefined) character.avatar = avatar;
    await character.save();

    res.json({ code: 200, message: '更新成功', data: character });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', auth, async (req, res, next) => {
  try {
    const character = await Character.findOne({ where: { id: req.params.id, userId: req.userId } });
    if (!character) return res.status(404).json({ code: 404, message: '角色不存在' });
    await character.destroy();
    res.json({ code: 200, message: '删除成功' });
  } catch (err) {
    next(err);
  }
});

router.post('/:id/avatar/generate', auth, async (req, res, next) => {
  try {
    const character = await Character.findOne({ where: { id: req.params.id, userId: req.userId } });
    if (!character) return res.status(404).json({ code: 404, message: '角色不存在' });

    const avatarUrl = await generateAvatar(character);
    character.avatar = avatarUrl;
    await character.save();

    res.json({ code: 200, message: '头像生成成功', data: { avatar: avatarUrl } });
  } catch (err) {
    next(err);
  }
});

router.post('/:id/avatar/upload', auth, upload.single('avatar'), async (req, res, next) => {
  try {
    const character = await Character.findOne({ where: { id: req.params.id, userId: req.userId } });
    if (!character) return res.status(404).json({ code: 404, message: '角色不存在' });
    if (!req.file) return res.status(400).json({ code: 400, message: '请选择图片文件' });

    const avatarUrl = `/uploads/${req.file.filename}`;
    character.avatar = avatarUrl;
    await character.save();

    res.json({ code: 200, message: '头像上传成功', data: { avatar: avatarUrl } });
  } catch (err) {
    next(err);
  }
});

router.post('/:id/voice/preview', auth, async (req, res, next) => {
  try {
    const character = await Character.findOne({ where: { id: req.params.id, userId: req.userId } });
    if (!character) return res.status(404).json({ code: 404, message: '角色不存在' });

    const text = `你好，我是${character.name}。很高兴以${character.voiceType}和你说话。`;
    const audioUrl = await synthesizeVoice(text, character.voiceType);

    res.json({ code: 200, data: { audioUrl, text } });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
