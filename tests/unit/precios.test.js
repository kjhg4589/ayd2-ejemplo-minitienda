// PRUEBAS UNITARIAS
// Prueban una unidad (función) aislada: sin BD, sin red, sin servidor.
// Son rápidas (milisegundos) y deben ser la mayoría de tus pruebas.
const { calcularSubtotal, aplicarCupon, calcularTotal } = require('../../src/precios');

describe('calcularSubtotal', () => {
  test('suma precio × cantidad de cada item', () => {
    // Arrange
    const items = [
      { precio: 450, cantidad: 2 },
      { precio: 150, cantidad: 1 },
    ];
    // Act
    const subtotal = calcularSubtotal(items);
    // Assert
    expect(subtotal).toBe(1050);
  });

  test('lanza error si el carrito está vacío', () => {
    expect(() => calcularSubtotal([])).toThrow('El carrito está vacío');
  });

  test.each([0, -1, 1.5])('rechaza la cantidad inválida %p', (cantidad) => {
    expect(() => calcularSubtotal([{ precio: 10, cantidad }])).toThrow('Cantidad inválida');
  });
});

describe('aplicarCupon', () => {
  test('sin cupón no hay descuento', () => {
    expect(aplicarCupon(500)).toEqual({ descuento: 0 });
  });

  test('ESTUDIANTE10 descuenta el 10%', () => {
    expect(aplicarCupon(500, 'ESTUDIANTE10').descuento).toBe(50);
  });

  test('el código no distingue mayúsculas', () => {
    expect(aplicarCupon(500, 'estudiante10').descuento).toBe(50);
  });

  test('BIENVENIDA25 exige compra mínima de Q100 (caso límite)', () => {
    expect(() => aplicarCupon(99.99, 'BIENVENIDA25')).toThrow(/compra mínima/);
    expect(aplicarCupon(100, 'BIENVENIDA25').descuento).toBe(25);
  });

  test('cupón inexistente lanza error', () => {
    expect(() => aplicarCupon(500, 'GRATIS')).toThrow('Cupón inválido');
  });
});

describe('calcularTotal', () => {
  test('aplica descuento y luego IVA del 12%', () => {
    const r = calcularTotal([{ precio: 100, cantidad: 3 }], 'ESTUDIANTE10');
    expect(r).toEqual({ subtotal: 300, descuento: 30, iva: 32.4, total: 302.4 });
  });

  test('redondea a 2 decimales', () => {
    const r = calcularTotal([{ precio: 0.1, cantidad: 3 }]);
    expect(r.subtotal).toBe(0.3); // 0.1 * 3 = 0.30000000000000004 sin redondear
  });
});
