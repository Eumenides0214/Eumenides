module.exports = (err, req, res, next) => {
  console.error('[Error]', err);

  if (err.name === 'SequelizeValidationError') {
    const messages = err.errors.map((e) => e.message);
    return res.status(400).json({ code: 400, message: messages.join('; ') });
  }

  if (err.name === 'SequelizeUniqueConstraintError') {
    return res.status(400).json({ code: 400, message: '数据已存在' });
  }

  res.status(err.status || 500).json({
    code: err.status || 500,
    message: err.message || '服务器内部错误',
  });
};
