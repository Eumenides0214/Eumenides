const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Character = sequelize.define('Character', {
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
  name: {
    type: DataTypes.STRING(50),
    allowNull: false,
    validate: { len: [1, 50] },
  },
  gender: {
    type: DataTypes.ENUM('male', 'female', 'other'),
    allowNull: false,
  },
  age: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: { min: 1, max: 150 },
  },
  voiceType: {
    type: DataTypes.STRING(50),
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  tags: {
    type: DataTypes.JSON,
    allowNull: true,
    defaultValue: [],
  },
  avatar: {
    type: DataTypes.STRING(255),
    allowNull: true,
  },
});

Character.associate = (models) => {
  Character.belongsTo(models.User, { foreignKey: 'userId' });
  Character.hasMany(models.Message, { foreignKey: 'characterId', onDelete: 'CASCADE' });
};

module.exports = Character;
