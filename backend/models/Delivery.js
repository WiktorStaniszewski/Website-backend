const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Delivery = sequelize.define('Delivery', {
  name: { 
      type: DataTypes.STRING, 
      allowNull: false,
      defaultValue: function() {
          return `Dostawa #${Date.now().toString().slice(-6)}`;
      }
  },
  notes: { 
      type: DataTypes.TEXT,
      allowNull: true 
  },

  locationId: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
});

module.exports = Delivery;