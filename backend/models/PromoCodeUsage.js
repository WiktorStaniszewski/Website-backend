const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const PromoCodeUsage = sequelize.define('PromoCodeUsage', {
  promoCodeId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  orderId: {
    type: DataTypes.INTEGER,
    allowNull: true,
  }
});

module.exports = PromoCodeUsage;
