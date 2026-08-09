const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const auth = require('../middleware/auth');

const router = express.Router();

router.post('/register', async (req, res, next) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ code: 400, message: '请填写完整信息' });
    }
    if (password.length < 6) {
      return res.status(400).json({ code: 400, message: '密码至少 6 位' });
    }

    const existing = await User.findOne({ where: { email } });
    if (existing) {
      return res.status(400).json({ code: 400, message: '邮箱已被注册' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({ username, email, passwordHash });

    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.status(201).json({
      code: 201,
      message: '注册成功',
      data: {
        token,
        user: { id: user.id, username: user.username, email: user.email, avatar: user.avatar },
      },
    });
  } catch (err) {
    next(err);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ code: 400, message: '请填写邮箱和密码' });
    }

    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(400).json({ code: 400, message: '邮箱或密码错误' });
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      return res.status(400).json({ code: 400, message: '邮箱或密码错误' });
    }

    const token = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    res.json({
      code: 200,
      message: '登录成功',
      data: {
        token,
        user: { id: user.id, username: user.username, email: user.email, avatar: user.avatar },
      },
    });
  } catch (err) {
    next(err);
  }
});

router.get('/me', auth, async (req, res, next) => {
  try {
    const user = await User.findByPk(req.userId, { attributes: { exclude: ['passwordHash'] } });
    if (!user) return res.status(404).json({ code: 404, message: '用户不存在' });
    res.json({ code: 200, data: user });
  } catch (err) {
    next(err);
  }
});

router.put('/me', auth, async (req, res, next) => {
  try {
    const { username, avatar } = req.body;
    const user = await User.findByPk(req.userId);
    if (!user) return res.status(404).json({ code: 404, message: '用户不存在' });

    if (username !== undefined) user.username = username;
    if (avatar !== undefined) user.avatar = avatar;
    await user.save();

    res.json({
      code: 200,
      message: '更新成功',
      data: { id: user.id, username: user.username, email: user.email, avatar: user.avatar },
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
