const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Inventory = sequelize.define('Inventory', {
  id: { 
      type: DataTypes.INTEGER, 
      autoIncrement: true, 
      primaryKey: true 
  },
  productId: { 
      type: DataTypes.INTEGER, 
      allowNull: false 
  },
  locationId: { 
      type: DataTypes.INTEGER, 
      allowNull: false 
  },
  stockQuantity: { 
      type: DataTypes.INTEGER, 
      allowNull: false, 
      defaultValue: 0 
  }
});

module.exports = Inventory;