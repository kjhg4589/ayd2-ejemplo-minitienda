const express = require('express');
const path = require('path');
const { calcularTotal } = require('./precios');

// La app recibe la BD por parámetro (inyección de dependencias):
// en producción usa un archivo, en las pruebas de integración una BD en memoria.
function crearApp(db) {
  const app = express();
  app.use(express.json());
  app.use(express.static(path.join(__dirname, '..', 'public')));

  app.get('/api/salud', (req, res) => res.json({ ok: true }));

  app.get('/api/productos', (req, res) => {
    res.json(db.prepare('SELECT * FROM productos').all());
  });

  app.post('/api/ordenes', (req, res) => {
    const { items, cupon } = req.body || {};
    try {
      const orden = db.transaction(() => {
        const detalle = (items || []).map(({ productoId, cantidad }) => {
          const p = db.prepare('SELECT * FROM productos WHERE id = ?').get(productoId);
          if (!p) throw new Error(`Producto ${productoId} no existe`);
          if (p.stock < cantidad) throw new Error(`Stock insuficiente para ${p.nombre}`);
          return { ...p, cantidad };
        });

        const totales = calcularTotal(detalle, cupon);
        const { lastInsertRowid } = db
          .prepare('INSERT INTO ordenes (subtotal, descuento, iva, total) VALUES (?, ?, ?, ?)')
          .run(totales.subtotal, totales.descuento, totales.iva, totales.total);

        for (const d of detalle) {
          db.prepare('UPDATE productos SET stock = stock - ? WHERE id = ?').run(d.cantidad, d.id);
          db.prepare('INSERT INTO orden_items VALUES (?, ?, ?, ?)')
            .run(lastInsertRowid, d.id, d.cantidad, d.precio);
        }
        return { id: Number(lastInsertRowid), ...totales };
      })();
      res.status(201).json(orden);
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  });

  app.get('/api/ordenes/:id', (req, res) => {
    const orden = db.prepare('SELECT * FROM ordenes WHERE id = ?').get(req.params.id);
    if (!orden) return res.status(404).json({ error: 'Orden no encontrada' });
    orden.items = db.prepare('SELECT * FROM orden_items WHERE orden_id = ?').all(orden.id);
    res.json(orden);
  });

  return app;
}

module.exports = { crearApp };
