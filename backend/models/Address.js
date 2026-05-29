const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Address = sequelize.define('Address', {
  label: {
    type: DataTypes.STRING,
    defaultValue: 'Dom'
  },
  name: {
    type: DataTypes.STRING
  },
  street: {
    type: DataTypes.STRING
  },
  zip: {
    type: DataTypes.STRING
  },
  city: {
    type: DataTypes.STRING
  },
  phone: {
    type: DataTypes.STRING
  },
  paczkomat: {
    type: DataTypes.STRING
  }
});

module.exports = Address;