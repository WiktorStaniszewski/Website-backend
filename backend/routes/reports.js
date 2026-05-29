const express = require('express');
const router = express.Router();
const { Order, sequelize } = require('../models');
const { verifyToken, isSuperAdmin } = require('../middleware/authMiddleware');
const { Op } = require('sequelize');

// GET /api/reports/sales-stats — statystyki sprzedaży (JSON)
router.get('/sales-stats', verifyToken, isSuperAdmin, async (req, res) => {
  try {
    const { from, to } = req.query;
    
    const whereClause = { status: { [Op.notIn]: ['cancelled', 'pending_payment'] } };

    if (from || to) {
      whereClause.createdAt = {};
      if (from) whereClause.createdAt[Op.gte] = new Date(from);
      if (to) {
        const toDate = new Date(to);
        toDate.setHours(23, 59, 59, 999);
        whereClause.createdAt[Op.lte] = toDate;
      }
    }

    const orders = await Order.findAll({ where: whereClause, order: [['createdAt', 'ASC']] });

    const totalRevenue = orders.reduce((acc, o) => acc + Number(o.total), 0);
    const totalOrders = orders.length;
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    // Dzienna sprzedaż
    const dailySales = {};
    orders.forEach(o => {
      const day = o.date || new Date(o.createdAt).toISOString().split('T')[0];
      if (!dailySales[day]) dailySales[day] = { revenue: 0, orders: 0 };
      dailySales[day].revenue += Number(o.total);
      dailySales[day].orders += 1;
    });

    // Top produkty (ze JSONB items)
    const productCounts = {};
    orders.forEach(o => {
      if (Array.isArray(o.items)) {
        o.items.forEach(item => {
          const name = item.name || item.title || `Produkt #${item.id}`;
          if (!productCounts[name]) productCounts[name] = { quantity: 0, revenue: 0 };
          productCounts[name].quantity += item.quantity || 1;
          productCounts[name].revenue += (item.price || 0) * (item.quantity || 1);
        });
      }
    });

    const topProducts = Object.entries(productCounts)
      .sort((a, b) => b[1].revenue - a[1].revenue)
      .slice(0, 10)
      .map(([name, data]) => ({ name, ...data }));

    // Dzisiejsze i tygodniowe statystyki
    const today = new Date().toISOString().split('T')[0];
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const todayOrders = orders.filter(o => (o.date || new Date(o.createdAt).toISOString().split('T')[0]) === today);
    const weekOrders = orders.filter(o => new Date(o.createdAt) >= weekAgo);

    const todayRevenue = todayOrders.reduce((acc, o) => acc + Number(o.total), 0);
    const weekRevenue = weekOrders.reduce((acc, o) => acc + Number(o.total), 0);

    // Statusy zamówień (do wykresu pie)
    const allOrders = await Order.findAll({
      attributes: ['status'],
    });

    const statusCounts = {};
    allOrders.forEach(o => {
      statusCounts[o.status] = (statusCounts[o.status] || 0) + 1;
    });

    res.json({
      totalRevenue,
      totalOrders,
      averageOrderValue,
      todayRevenue,
      todayOrders: todayOrders.length,
      weekRevenue,
      weekOrders: weekOrders.length,
      dailySales,
      topProducts,
      statusCounts
    });
  } catch (err) {
    console.error('Report error:', err);
    res.status(500).json({ message: err.message });
  }
});

// GET /api/reports/sales-pdf — generowanie PDF
router.get('/sales-pdf', verifyToken, isSuperAdmin, async (req, res) => {
  try {
    let PDFDocument;
    try {
      PDFDocument = require('pdfkit');
    } catch (e) {
      return res.status(500).json({ message: 'Biblioteka pdfkit nie jest zainstalowana. Uruchom: npm install pdfkit' });
    }

    const { from, to } = req.query;

    const whereClause = { status: { [Op.notIn]: ['cancelled', 'pending_payment'] } };
    if (from || to) {
      whereClause.createdAt = {};
      if (from) whereClause.createdAt[Op.gte] = new Date(from);
      if (to) {
        const toDate = new Date(to);
        toDate.setHours(23, 59, 59, 999);
        whereClause.createdAt[Op.lte] = toDate;
      }
    }

    const orders = await Order.findAll({ where: whereClause, order: [['createdAt', 'ASC']] });

    const totalRevenue = orders.reduce((acc, o) => acc + Number(o.total), 0);
    const totalOrders = orders.length;
    const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    // Top produkty
    const productCounts = {};
    orders.forEach(o => {
      if (Array.isArray(o.items)) {
        o.items.forEach(item => {
          const name = item.name || item.title || `Produkt #${item.id}`;
          if (!productCounts[name]) productCounts[name] = { quantity: 0, revenue: 0 };
          productCounts[name].quantity += item.quantity || 1;
          productCounts[name].revenue += (item.price || 0) * (item.quantity || 1);
        });
      }
    });

    const topProducts = Object.entries(productCounts)
      .sort((a, b) => b[1].revenue - a[1].revenue)
      .slice(0, 10);

    // Generowanie PDF
    const doc = new PDFDocument({ margin: 50, size: 'A4' });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="raport-sprzedazy-${new Date().toISOString().split('T')[0]}.pdf"`);

    doc.pipe(res);

    // Nagłówek
    doc.fontSize(24).font('Helvetica-Bold').text('SOMNIUM', { align: 'center' });
    doc.fontSize(10).font('Helvetica').text('Raport sprzedazy', { align: 'center' });
    doc.moveDown(0.5);

    const dateRange = from && to
      ? `Okres: ${from} - ${to}`
      : from ? `Od: ${from}` : to ? `Do: ${to}` : 'Caly okres';
    doc.fontSize(9).fillColor('#666').text(`${dateRange}  |  Wygenerowano: ${new Date().toLocaleString('pl-PL')}`, { align: 'center' });
    doc.moveDown(1);

    // Linia oddzielająca
    doc.strokeColor('#ccc').lineWidth(1).moveTo(50, doc.y).lineTo(545, doc.y).stroke();
    doc.moveDown(1);

    // Statystyki główne
    doc.fillColor('#000').fontSize(14).font('Helvetica-Bold').text('Podsumowanie');
    doc.moveDown(0.5);
    doc.fontSize(10).font('Helvetica');
    doc.text(`Laczny przychod:  ${totalRevenue.toFixed(2)} PLN`);
    doc.text(`Liczba zamowien:  ${totalOrders}`);
    doc.text(`Srednia wartosc:  ${averageOrderValue.toFixed(2)} PLN`);
    doc.moveDown(1.5);

    // Top produkty
    if (topProducts.length > 0) {
      doc.fontSize(14).font('Helvetica-Bold').text('Najpopularniejsze produkty');
      doc.moveDown(0.5);

      // Nagłówki tabeli
      const tableTop = doc.y;
      const col1 = 50, col2 = 300, col3 = 400, col4 = 480;

      doc.fontSize(9).font('Helvetica-Bold').fillColor('#333');
      doc.text('Produkt', col1, tableTop);
      doc.text('Ilosc', col2, tableTop, { width: 80, align: 'right' });
      doc.text('Przychod', col4, tableTop, { width: 65, align: 'right' });
      
      doc.moveDown(0.5);
      doc.strokeColor('#eee').lineWidth(0.5).moveTo(50, doc.y).lineTo(545, doc.y).stroke();
      doc.moveDown(0.3);

      doc.font('Helvetica').fillColor('#000');
      topProducts.forEach(([name, data], idx) => {
        const y = doc.y;
        if (y > 720) {
          doc.addPage();
        }
        doc.fontSize(9);
        doc.text(`${idx + 1}. ${name.substring(0, 40)}`, col1, doc.y, { width: 240 });
        const currentY = doc.y - 12;
        doc.text(`${data.quantity} szt.`, col2, currentY, { width: 80, align: 'right' });
        doc.text(`${data.revenue.toFixed(2)} PLN`, col4, currentY, { width: 65, align: 'right' });
        doc.moveDown(0.2);
      });
    }

    doc.moveDown(2);

    // Stopka
    doc.fontSize(8).fillColor('#999').text(
      'Raport wygenerowany automatycznie przez system Somnium. Dane poufne.',
      50, doc.y, { align: 'center', width: 495 }
    );

    doc.end();
  } catch (err) {
    console.error('PDF generation error:', err);
    if (!res.headersSent) {
      res.status(500).json({ message: err.message });
    }
  }
});

module.exports = router;
