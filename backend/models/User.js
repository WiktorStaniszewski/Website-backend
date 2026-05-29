const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const User = sequelize.define('User', {
  username: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: { isEmail: true }
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false
  },
  firstName: {
    type: DataTypes.STRING,
  },
  phone: {
    type: DataTypes.STRING,
  },
  role: {
    type: DataTypes.STRING,
    defaultValue: 'customer'
  },
  locationId: {
    type: DataTypes.INTEGER,
    allowNull: true
},
  image: {
    type: DataTypes.STRING
  },
  cart: {
    type: DataTypes.JSONB,
    defaultValue: []
  },
  loyaltyPoints: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  }
});

module.exports = User;