const express = require('express');
const router = express.Router();
const { Product, Inventory, Location, Delivery, DeliveryAction, sequelize } = require('../models');
const { verifyToken, isSuperAdmin } = require('../middleware/authMiddleware');
const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '../public/images/products'));
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage: storage });

router.get('/', async (req, res) => {
  try {
    const products = await Product.findAll({ 
        order: [['id', 'ASC']],
        include: [{ model: Inventory, include: [Location] }] 
    });
    
    const mappedProducts = products.map(p => {
        const prod = p.toJSON();
        prod.stockQuantity = prod.Inventories 
            ? prod.Inventories.reduce((sum, inv) => sum + inv.stockQuantity, 0) 
            : 0;
        return prod;
    });
    res.json(mappedProducts);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findByPk(req.params.id, {
        include: [{ model: Inventory, include: [Location] }]
    });
    if (!product) return res.status(404).json({ message: 'Product not found' });

    const prod = product.toJSON();
    prod.stockQuantity = prod.Inventories 
        ? prod.Inventories.reduce((sum, inv) => sum + inv.stockQuantity, 0) 
        : 0;
    res.json(prod);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Warianty rozmiarowe — zwraca inne produkty z tą samą grupą wariantową
router.get('/:id/variants', async (req, res) => {
  try {
    const product = await Product.findByPk(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });

    // Brak grupy wariantowej = brak wariantów
    if (!product.variantGroup) {
      return res.json([]);
    }

    const variants = await Product.findAll({
      where: { variantGroup: product.variantGroup },
      order: [['price', 'ASC']],
      include: [{ model: Inventory, include: [Location] }]
    });

    const mapped = variants.map(p => {
      const v = p.toJSON();
      v.stockQuantity = v.Inventories 
        ? v.Inventories.reduce((sum, inv) => sum + inv.stockQuantity, 0) 
        : 0;
      return v;
    });

    res.json(mapped);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/', verifyToken, isSuperAdmin, upload.single('image'), async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { id, stockQuantity, Inventories, createdAt, updatedAt, ...safeBody } = req.body;
    const productData = { ...safeBody };
    if (req.body.producent) productData.company = req.body.producent;
    if (req.file) productData.image = req.file.filename;

    // Sanityzacja dat — pusty string lub "Invalid date" → null
    if (!productData.roastDate || productData.roastDate === 'Invalid date' || productData.roastDate === '') {
        productData.roastDate = null;
    }

    const newProduct = await Product.create(productData, { transaction: t });
    const initialStock = parseInt(req.body.stockQuantity) || 0;

    await Inventory.create({
      productId: newProduct.id, locationId: 1, stockQuantity: initialStock
    }, { transaction: t });

    const delivery = await Delivery.create({
      name: `Szybkie dodanie: ${newProduct.name}`,
      notes: "Wygenerowano automatycznie z poziomu API.", locationId: 1
    }, { transaction: t });

    await DeliveryAction.create({
      deliveryId: delivery.id, actionType: 'CREATE_PRODUCT',
      details: { name: newProduct.name, initialStock: initialStock }
    }, { transaction: t });

    await t.commit();
    res.status(201).json(newProduct);
  } catch (err) {
    await t.rollback();
    console.error("[PRODUCTS CREATE ERROR]:", err.message, err.errors?.map(e => e.message));
    res.status(400).json({ message: "Error creating product", error: err.message, details: err.errors?.map(e => e.message) });
  }
});

router.put('/:id', verifyToken, isSuperAdmin, upload.single('image'), async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const product = await Product.findByPk(req.params.id, { transaction: t });
    if (!product) {
      await t.rollback();
      return res.status(404).json({ message: 'Product not found' });
    }

    const oldData = { ...product.toJSON() };
    const { id, stockQuantity, Inventories, createdAt, updatedAt, ...safeBody } = req.body;
    const updatedData = { ...safeBody };
    if (req.body.producent) updatedData.company = req.body.producent;
    if (req.file) updatedData.image = req.file.filename;

    await product.update(updatedData, { transaction: t });

    const changes = [];
    const fieldsToTrack = [
        { key: 'name', label: 'Nazwa' }, { key: 'company', label: 'Producent' },
        { key: 'category', label: 'Kategoria' }, { key: 'price', label: 'Cena', suffix: ' PLN' },
        { key: 'flavours', label: 'Smak' }, { key: 'size', label: 'Rozmiar/Waga' },
        { key: 'purpose', label: 'Przeznaczenie' }, { key: 'processingMethod', label: 'Obróbka' },
        { key: 'variety', label: 'Odmiana' }, { key: 'farm', label: 'Farma' },
        { key: 'roastDate', label: 'Data wypalenia' }, { key: 'teaType', label: 'Rodzaj herbaty' }
    ];

    fieldsToTrack.forEach(field => {
        const oldVal = String(oldData[field.key] || '');
        const newVal = String(product[field.key] || '');
        if (oldVal !== newVal) {
            changes.push(`${field.label}: ${oldVal || 'brak'} ➔ ${newVal || 'brak'}${field.suffix || ''}`);
        }
    });

    const newStock = parseInt(req.body.stockQuantity);
    let stockChanged = false;
    let oldStock = 0;

    if (!isNaN(newStock)) {
      const inventory = await Inventory.findOne({ 
        where: { productId: product.id, locationId: 1 }, transaction: t 
      });

      if (inventory && inventory.stockQuantity !== newStock) {
        oldStock = inventory.stockQuantity;
        inventory.stockQuantity = newStock;
        await inventory.save({ transaction: t });
        stockChanged = true;
      } else if (!inventory) {
        await Inventory.create({ productId: product.id, locationId: 1, stockQuantity: newStock }, { transaction: t });
        stockChanged = true;
      }
    }

    const delivery = await Delivery.create({
      name: `Szybka edycja: ${product.name}`,
      notes: "Wygenerowano automatycznie z poziomu API.", locationId: 1
    }, { transaction: t });

    await DeliveryAction.create({
      deliveryId: delivery.id, actionType: 'EDIT_PRODUCT',
      details: { name: product.name, changes }
    }, { transaction: t });

    if (stockChanged) {
      await DeliveryAction.create({
        deliveryId: delivery.id, actionType: 'ADD_STOCK',
        details: { name: product.name, stockBefore: oldStock, stockAfter: newStock, added: newStock - oldStock }
      }, { transaction: t });
    }

    await t.commit();
    res.json(product);
  } catch (err) {
    await t.rollback();
    res.status(400).json({ message: "Error updating product", error: err.message });
  }
});

router.delete('/:id', verifyToken, isSuperAdmin, async (req, res) => {
  try {
    const product = await Product.findByPk(req.params.id);
    if (!product) return res.status(404).json({ message: 'Product not found' });
    await product.destroy();
    res.json({ message: 'Product deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: "Error deleting product", error: err.message });
  }
});

module.exports = router;