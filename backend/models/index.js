const sequelize = require('../config/db');
const User = require('./User');
const Order = require('./Order');
const Product = require('./Product');
const OrderItem = require('./OrderItem');
const CartReservation = require('./CartReservation');
const Waitlist = require('./Waitlist');
const Address = require('./Address'); 
const Delivery = require('./Delivery');
const DeliveryAction = require('./DeliveryAction');
const Location = require('./Location');
const Inventory = require('./Inventory');
const MenuCategory = require('./MenuCategory');
const MenuItem = require('./MenuItem');
const LoyaltyPoints = require('./LoyaltyPoints');
const PromoCode = require('./PromoCode');
const PromoCodeUsage = require('./PromoCodeUsage');

Delivery.belongsTo(Location, { foreignKey: 'locationId' });
Location.hasMany(Delivery, { foreignKey: 'locationId' });

// Relacja: Lokacja - Zamówienia (Odbiory w lokalu)
Location.hasMany(Order, { foreignKey: 'locationId', onDelete: 'SET NULL' });
Order.belongsTo(Location, { foreignKey: 'locationId' });

// Relacja: Użytkownik - Zamówienia
User.hasMany(Order, { foreignKey: 'userId' });
Order.belongsTo(User, { foreignKey: 'userId' });

// Relacja: Użytkownik - Adresy (Książka adresowa)
User.hasMany(Address, { foreignKey: 'userId' });
Address.belongsTo(User, { foreignKey: 'userId' });

// Relacja Many-To-Many: Zamówienia - Produkty
Order.belongsToMany(Product, { through: OrderItem, foreignKey: 'orderId' });
Product.belongsToMany(Order, { through: OrderItem, foreignKey: 'productId' });

// Relacja: Rezerwacje Koszyka - Produkt
Product.hasMany(CartReservation, { foreignKey: 'productId' });
CartReservation.belongsTo(Product, { foreignKey: 'productId' });

// Relacja: Waitlist - Produkt
Product.hasMany(Waitlist, { foreignKey: 'productId' });
Waitlist.belongsTo(Product, { foreignKey: 'productId' });

Delivery.hasMany(DeliveryAction, { foreignKey: 'deliveryId', onDelete: 'CASCADE' });
DeliveryAction.belongsTo(Delivery, { foreignKey: 'deliveryId' });

// Product - DeliveryAction (1 do wielu)
Product.hasMany(DeliveryAction, { foreignKey: 'productId' });
DeliveryAction.belongsTo(Product, { foreignKey: 'productId' });

// Dodajemy również informację o tym, KTO przyjął dostawę
User.hasMany(Delivery, { foreignKey: 'userId' });
Delivery.belongsTo(User, { foreignKey: 'userId' });

// Produkt posiada wiele wpisów w Magazynach (Inventories)
Product.hasMany(Inventory, { foreignKey: 'productId', onDelete: 'CASCADE' });
Inventory.belongsTo(Product, { foreignKey: 'productId' });

// Lokacja (Kawiarnia) posiada wiele wpisów z Magazynu (Inventories)
Location.hasMany(Inventory, { foreignKey: 'locationId', onDelete: 'CASCADE' });
Inventory.belongsTo(Location, { foreignKey: 'locationId' });

// Użytkownik (Barista) może być przypisany do jednej Lokacji
Location.hasMany(User, { foreignKey: 'locationId', onDelete: 'SET NULL' });
User.belongsTo(Location, { foreignKey: 'locationId' });

MenuCategory.hasMany(MenuItem, { as: 'items', foreignKey: 'categoryId', onDelete: 'CASCADE' });
MenuItem.belongsTo(MenuCategory, { foreignKey: 'categoryId' });

// Relacja: Użytkownik - Punkty Lojalnościowe
User.hasMany(LoyaltyPoints, { foreignKey: 'userId', onDelete: 'CASCADE' });
LoyaltyPoints.belongsTo(User, { foreignKey: 'userId' });

// Relacja: Zamówienie - Punkty Lojalnościowe
Order.hasMany(LoyaltyPoints, { foreignKey: 'orderId', onDelete: 'SET NULL' });
LoyaltyPoints.belongsTo(Order, { foreignKey: 'orderId' });

// Relacja: Kody Promo - Użycia
PromoCode.hasMany(PromoCodeUsage, { foreignKey: 'promoCodeId', onDelete: 'CASCADE' });
PromoCodeUsage.belongsTo(PromoCode, { foreignKey: 'promoCodeId' });

// Relacja: Użytkownik - Użycia Kodów Promo
User.hasMany(PromoCodeUsage, { foreignKey: 'userId', onDelete: 'CASCADE' });
PromoCodeUsage.belongsTo(User, { foreignKey: 'userId' });

// Relacja: Zamówienie - Użycie Kodu Promo
Order.hasMany(PromoCodeUsage, { foreignKey: 'orderId', onDelete: 'SET NULL' });
PromoCodeUsage.belongsTo(Order, { foreignKey: 'orderId' });

module.exports = {
  sequelize,
  User,
  Order,
  Product,
  OrderItem,
  CartReservation,
  Waitlist,
  Address,
  Delivery, 
  DeliveryAction,
  Location,
  Inventory,
  MenuCategory,
  MenuItem,
  LoyaltyPoints,
  PromoCode,
  PromoCodeUsage
};