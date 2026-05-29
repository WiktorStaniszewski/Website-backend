const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const MenuItem = sequelize.define('MenuItem', {
    name: { type: DataTypes.STRING, allowNull: false },
    price: { type: DataTypes.STRING, allowNull: false }, // Używamy STRING, bo w Twoim kodzie były ceny typu "17/19" lub "*"
    ingredients: { type: DataTypes.TEXT, allowNull: true },
    orderIndex: { type: DataTypes.INTEGER, defaultValue: 0 }
});


module.exports = MenuItem;