const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const DeliveryAction = sequelize.define('DeliveryAction', {
  actionType: {
    type: DataTypes.ENUM('ADD_STOCK', 'CREATE_PRODUCT', 'EDIT_PRODUCT'),
    allowNull: false
  },
  details: {
    type: DataTypes.JSON,
    allowNull: false
  }
});

module.exports = DeliveryAction;