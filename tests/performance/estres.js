// PRUEBA DE ESTRÉS (k6)
// Pregunta: ¿DÓNDE se rompe el sistema y cómo se recupera?
// Subimos usuarios muy por encima de lo esperado hasta encontrar el punto de quiebre.
import http from 'k6/http';
import { check } from 'k6';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

export const options = {
  stages: [
    { duration: '30s', target: 50 },   // carga normal
    { duration: '30s', target: 200 },  // por encima de lo normal
    { duration: '30s', target: 500 },  // cerca del límite
    { duration: '30s', target: 1000 }, // más allá del límite
    { duration: '1m', target: 0 },     // recuperación: ¿vuelve a la normalidad?
  ],
  // Aquí los umbrales NO son para pasar/fallar sino para observar
  // en qué etapa empiezan a degradarse la latencia y los errores.
  thresholds: {
    http_req_duration: ['p(95)<1000'],
    http_req_failed: ['rate<0.05'],
  },
};

export default function () {
  // Sin sleep: cada usuario virtual martilla el servidor lo más rápido posible
  const res = http.get(`${BASE_URL}/api/productos`);
  check(res, { 'status 200': (r) => r.status === 200 });

  http.post(
    `${BASE_URL}/api/ordenes`,
    JSON.stringify({ items: [{ productoId: 2, cantidad: 1 }] }),
    {
      headers: { 'Content-Type': 'application/json' },
      responseCallback: http.expectedStatuses(201, 400), // 400 = sin stock
    }
  );
}
