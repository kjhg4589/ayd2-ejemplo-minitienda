const Database = require('better-sqlite3');

const PRODUCTOS_INICIALES = [
  { nombre: 'Teclado mecánico', precio: 450, stock: 10 },
  { nombre: 'Mouse inalámbrico', precio: 150, stock: 25 },
  { nombre: 'Monitor 24"', precio: 1200, stock: 5 },
];

// ruta ':memory:' => base de datos en memoria (útil para pruebas de integración)
function crearDb(ruta = 'tienda.db') {
  const db = new Database(ruta);
  db.pragma('journal_mode = WAL');
  db.exec(`
    CREATE TABLE IF NOT EXISTS productos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      precio REAL NOT NULL,
      stock INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS ordenes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      subtotal REAL, descuento REAL, iva REAL, total REAL,
      creada_en TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS orden_items (
      orden_id INTEGER REFERENCES ordenes(id),
      producto_id INTEGER REFERENCES productos(id),
      cantidad INTEGER, precio REAL
    );
  `);
  return db;
}

function sembrar(db, productos = PRODUCTOS_INICIALES) {
  db.exec('DELETE FROM orden_items; DELETE FROM ordenes; DELETE FROM productos;');
  db.exec("DELETE FROM sqlite_sequence WHERE name IN ('productos','ordenes')");
  const insert = db.prepare('INSERT INTO productos (nombre, precio, stock) VALUES (?, ?, ?)');
  for (const p of productos) insert.run(p.nombre, p.precio, p.stock);
}

module.exports = { crearDb, sembrar, PRODUCTOS_INICIALES };
