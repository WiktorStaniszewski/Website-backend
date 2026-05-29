const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const LoyaltyPoints = sequelize.define('LoyaltyPoints', {
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  orderId: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  points: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  type: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'earned',
    validate: {
      isIn: [['earned', 'redeemed', 'expired', 'refunded']]
    }
  },
  description: {
    type: DataTypes.STRING,
    allowNull: true,
  }
});

module.exports = LoyaltyPoints;
