const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const MenuCategory = sequelize.define('MenuCategory', {
    title: { type: DataTypes.STRING, allowNull: false },
    key: { type: DataTypes.STRING, allowNull: false, unique: true }, // Np. "classic", "summer"
    orderIndex: { type: DataTypes.INTEGER, defaultValue: 0 } // Do sortowania kolejności
});


module.exports = MenuCategory;