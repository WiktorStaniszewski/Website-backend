const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');
const crypto = require('crypto');

const Order = sequelize.define('Order', {
  userId: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  locationId: {
    type: DataTypes.INTEGER,
    allowNull: true 
  },
  trackingNumber: {
    type: DataTypes.STRING,
    unique: true,
  },
  customer: { type: DataTypes.JSONB, allowNull: false },
  items: { type: DataTypes.JSONB, allowNull: false },
  shipping: { type: DataTypes.JSONB, allowNull: false },
  total: { type: DataTypes.FLOAT, allowNull: false },
  status: {
    type: DataTypes.STRING,
    defaultValue: 'new'
  },
  integrations: {
    type: DataTypes.JSONB,
    defaultValue: {}
  },
  statusHistory: {
    type: DataTypes.JSONB,
    defaultValue: [] 
  },
  date: {
    type: DataTypes.DATEONLY,
    defaultValue: DataTypes.NOW
  },
  feedback: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: null
  },
  baristaNotes: {
    type: DataTypes.TEXT,
    allowNull: true,
    defaultValue: null
  },
  discount: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: null
  }
}, {
  hooks: {
    beforeCreate: (order) => {
      order.trackingNumber = 'SOM-' + crypto.randomBytes(3).toString('hex').toUpperCase();
      
      order.statusHistory = [{ 
          status: order.status || 'new', 
          timestamp: new Date().toISOString() 
      }];
    }
  }
});

module.exports = Order;