const { sequelize } = require('../config/database');

const User = require('./User');
const Character = require('./Character');
const Message = require('./Message');

const models = { User, Character, Message };

Object.values(models).forEach((model) => {
  if (model.associate) model.associate(models);
});

module.exports = models;
