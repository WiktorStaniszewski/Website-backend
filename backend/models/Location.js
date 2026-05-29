const { DataTypes } = require('sequelize');
const sequelize = require('../config/db'); 

const Location = sequelize.define('Location', {
  id: { 
      type: DataTypes.INTEGER, 
      autoIncrement: true, 
      primaryKey: true 
  },
  name: { 
      type: DataTypes.STRING, 
      allowNull: false 
  },
  type: { 
      type: DataTypes.ENUM('warehouse', 'cafe'), 
      allowNull: false,
      defaultValue: 'cafe'
  }
});

module.exports = Location;