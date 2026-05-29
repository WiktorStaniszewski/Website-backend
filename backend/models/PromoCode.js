const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const PromoCode = sequelize.define('PromoCode', {
  code: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  discountPercent: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: { min: 1, max: 100 }
  },
  usageType: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'single',
    validate: {
      isIn: [['single', 'multi']]
    }
  },
  maxUsesPerUser: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 1,
  },
  expiresAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  createdBy: {
    type: DataTypes.INTEGER,
    allowNull: true,
  }
});

module.exports = PromoCode;
