const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Product = sequelize.define('Product', {
  name: { type: DataTypes.STRING, allowNull: false },
  price: { type: DataTypes.FLOAT, allowNull: false },
  company: { type: DataTypes.STRING, defaultValue: "Brak marki" }, // Marka / Producent / Palarnia
  category: { type: DataTypes.STRING }, // Ziarna, Zaparzacze, Herbaty, Filtry, Kubki
  image: { type: DataTypes.STRING },
  description: { type: DataTypes.TEXT },
  
  // WSPÓLNE LUB SPECYFICZNE CECHY (Nullable)
  size: { type: DataTypes.STRING },             // Rozmiar (150g, 1kg, 01, 02)
  purpose: { type: DataTypes.STRING },          // Przeznaczenie (filtr, kawiarka, espresso, omniroast)
  
  // TYLKO ZIARNA
  flavours: { type: DataTypes.STRING },         // Profil smakowy
  processingMethod: { type: DataTypes.STRING }, // Metoda obróbki
  variety: { type: DataTypes.STRING },          // Odmiana
  farm: { type: DataTypes.STRING },             // Farma
  roastDate: { type: DataTypes.DATEONLY },      // Data wypalenia (zapisana jako YYYY-MM-DD)
  
  // TYLKO HERBATY
  teaType: { type: DataTypes.STRING },          // Rodzaj herbaty (np. ceremonialna)
  
  // WARIANTY ROZMIAROWE
  variantGroup: { type: DataTypes.STRING, allowNull: true }  // Slug grupujący warianty (np. "gwatemala-meissa")
});

module.exports = Product;