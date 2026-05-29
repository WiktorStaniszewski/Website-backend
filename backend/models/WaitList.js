const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Waitlist = sequelize.define('Waitlist', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  email: { type: DataTypes.STRING, allowNull: false },
  isNotified: { type: DataTypes.BOOLEAN, defaultValue: false }
});

module.exports = Waitlist;