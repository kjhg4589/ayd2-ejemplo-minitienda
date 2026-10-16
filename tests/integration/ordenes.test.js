// PRUEBAS DE INTEGRACIÓN
// Verifican que varias piezas funcionen JUNTAS: rutas HTTP (Express)
// + lógica de negocio + base de datos real (SQLite en memoria).
// No levantamos navegador: supertest le habla directo a la app.
const request = require('supertest');
const { crearDb, sembrar } = require('../../src/db');
const { crearApp } = require('../../src/app');

let db, app;

beforeEach(() => {
  db = crearDb(':memory:'); // BD limpia y aislada para cada prueba
  sembrar(db);
  app = crearApp(db);
});

afterEach(() => db.close());

describe('GET /api/productos', () => {
  test('devuelve los productos sembrados en la BD', async () => {
    const res = await request(app).get('/api/productos');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(3);
    expect(res.body[0]).toMatchObject({ nombre: 'Teclado mecánico', stock: 10 });
  });
});

describe('POST /api/ordenes', () => {
  test('crea la orden, calcula el total y descuenta stock', async () => {
    const res = await request(app)
      .post('/api/ordenes')
      .send({ items: [{ productoId: 1, cantidad: 2 }], cupon: 'ESTUDIANTE10' });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ subtotal: 900, descuento: 90, iva: 97.2, total: 907.2 });

    // Verificamos el efecto en la base de datos
    const { stock } = db.prepare('SELECT stock FROM productos WHERE id = 1').get();
    expect(stock).toBe(8);

    const orden = await request(app).get(`/api/ordenes/${res.body.id}`);
    expect(orden.body.items).toHaveLength(1);
  });

  test('rechaza la compra si no hay stock suficiente', async () => {
    const res = await request(app)
      .post('/api/ordenes')
      .send({ items: [{ productoId: 3, cantidad: 99 }] });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/Stock insuficiente/);
  });

  test('es atómica: si un item falla no se descuenta stock de ninguno', async () => {
    await request(app)
      .post('/api/ordenes')
      .send({ items: [{ productoId: 1, cantidad: 1 }, { productoId: 3, cantidad: 99 }] });

    const { stock } = db.prepare('SELECT stock FROM productos WHERE id = 1').get();
    expect(stock).toBe(10); // la transacción se revirtió
    expect(db.prepare('SELECT COUNT(*) c FROM ordenes').get().c).toBe(0);
  });

  test('devuelve 400 con un cupón inválido', async () => {
    const res = await request(app)
      .post('/api/ordenes')
      .send({ items: [{ productoId: 2, cantidad: 1 }], cupon: 'NOEXISTE' });
    expect(res.status).toBe(400);
  });
});

test('GET /api/ordenes/:id devuelve 404 si no existe', async () => {
  const res = await request(app).get('/api/ordenes/999');
  expect(res.status).toBe(404);
});
