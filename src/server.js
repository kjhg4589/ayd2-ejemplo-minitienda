const { crearDb, sembrar } = require('./db');
const { crearApp } = require('./app');

const PORT = process.env.PORT || 3000;
const db = crearDb(process.env.DB_PATH || 'tienda.db');

// SEED=1 reinicia los productos (lo usan E2E y las pruebas de rendimiento)
if (process.env.SEED === '1' || db.prepare('SELECT COUNT(*) c FROM productos').get().c === 0) {
  sembrar(db);
}

crearApp(db).listen(PORT, () => {
  console.log(`Tienda escuchando en http://localhost:${PORT}`);
});
