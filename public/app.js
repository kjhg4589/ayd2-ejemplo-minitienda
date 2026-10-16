const carrito = new Map(); // productoId -> { producto, cantidad }

async function cargarProductos() {
  const productos = await (await fetch('/api/productos')).json();
  document.getElementById('productos').innerHTML = productos
    .map(
      (p) => `
      <div class="producto">
        <span>${p.nombre} — Q${p.precio.toFixed(2)} <small>(stock: ${p.stock})</small></span>
        <button data-id="${p.id}" aria-label="Agregar ${p.nombre}">Agregar</button>
      </div>`
    )
    .join('');
  document.querySelectorAll('#productos button').forEach((btn) => {
    btn.onclick = () => {
      const p = productos.find((x) => x.id === Number(btn.dataset.id));
      const actual = carrito.get(p.id) || { producto: p, cantidad: 0 };
      carrito.set(p.id, { ...actual, cantidad: actual.cantidad + 1 });
      pintarCarrito();
    };
  });
}

function pintarCarrito() {
  let n = 0;
  document.getElementById('items').innerHTML = [...carrito.values()]
    .map(({ producto, cantidad }) => {
      n += cantidad;
      return `<li>${producto.nombre} × ${cantidad}</li>`;
    })
    .join('');
  document.querySelector('[data-testid="contador"]').textContent = n;
}

document.getElementById('pagar').onclick = async () => {
  const msg = document.getElementById('mensaje');
  const res = await fetch('/api/ordenes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      items: [...carrito.entries()].map(([productoId, { cantidad }]) => ({ productoId, cantidad })),
      cupon: document.getElementById('cupon').value || undefined,
    }),
  });
  const data = await res.json();
  if (res.ok) {
    msg.className = 'exito';
    msg.textContent = `¡Orden #${data.id} confirmada! Total: Q${data.total.toFixed(2)}`;
    carrito.clear();
    pintarCarrito();
    cargarProductos();
  } else {
    msg.className = 'error';
    msg.textContent = data.error;
  }
};

cargarProductos();
