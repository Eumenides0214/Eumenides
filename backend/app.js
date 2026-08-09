require('dotenv').config();

const express = require('express');
const cors = require('cors');
const http = require('http');
const path = require('path');
const fs = require('fs');

const { sequelize } = require('./config/database');
const authRoutes = require('./routes/auth');
const characterRoutes = require('./routes/characters');
const chatRoutes = require('./routes/chat');
const callRoutes = require('./routes/call');
const errorHandler = require('./middleware/errorHandler');

const app = express();
const server = http.createServer(app);

const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use('/uploads', express.static(uploadsDir));

app.use('/api/auth', authRoutes);
app.use('/api/characters', characterRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/call', callRoutes);

app.use(errorHandler);

const PORT = process.env.PORT || 3000;

async function start() {
  try {
    await sequelize.authenticate();
    console.log('[DB] MySQL 连接成功');
    await sequelize.sync({ alter: false });
    console.log('[DB] 模型同步完成');

    server.listen(PORT, () => {
      console.log(`[Server] 后端服务运行于 http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('[Server] 启动失败:', err.message);
    process.exit(1);
  }
}

start();
