const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Message = sequelize.define('Message', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'Users', key: 'id' },
  },
  characterId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: 'Characters', key: 'id' },
  },
  role: {
    type: DataTypes.ENUM('user', 'assistant'),
    allowNull: false,
  },
  contentType: {
    type: DataTypes.ENUM('text', 'voice'),
    allowNull: false,
    defaultValue: 'text',
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  mediaUrl: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
});

Message.associate = (models) => {
  Message.belongsTo(models.User, { foreignKey: 'userId' });
  Message.belongsTo(models.Character, { foreignKey: 'characterId' });
};

module.exports = Message;
