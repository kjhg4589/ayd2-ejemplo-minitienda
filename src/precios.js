// Lógica de negocio pura: sin base de datos, sin HTTP.
// Es el blanco ideal para PRUEBAS UNITARIAS.

const IVA = 0.12; // Guatemala

const CUPONES = {
  ESTUDIANTE10: { tipo: 'porcentaje', valor: 10 },
  BIENVENIDA25: { tipo: 'fijo', valor: 25, minimo: 100 },
};

function calcularSubtotal(items) {
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error('El carrito está vacío');
  }
  return redondear(
    items.reduce((acc, { precio, cantidad }) => {
      if (!Number.isInteger(cantidad) || cantidad <= 0) {
        throw new Error('Cantidad inválida');
      }
      return acc + precio * cantidad;
    }, 0)
  );
}

function aplicarCupon(subtotal, codigo) {
  if (!codigo) return { descuento: 0 };
  const cupon = CUPONES[codigo.toUpperCase()];
  if (!cupon) throw new Error('Cupón inválido');
  if (cupon.minimo && subtotal < cupon.minimo) {
    throw new Error(`El cupón requiere una compra mínima de Q${cupon.minimo}`);
  }
  const descuento =
    cupon.tipo === 'porcentaje' ? (subtotal * cupon.valor) / 100 : cupon.valor;
  return { descuento: redondear(Math.min(descuento, subtotal)) };
}

function calcularTotal(items, codigoCupon) {
  const subtotal = calcularSubtotal(items);
  const { descuento } = aplicarCupon(subtotal, codigoCupon);
  const base = subtotal - descuento;
  const iva = redondear(base * IVA);
  return { subtotal, descuento, iva, total: redondear(base + iva) };
}

function redondear(n) {
  return Math.round(n * 100) / 100;
}

module.exports = { calcularSubtotal, aplicarCupon, calcularTotal, IVA };
