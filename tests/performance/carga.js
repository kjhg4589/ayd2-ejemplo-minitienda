// PRUEBA DE CARGA (k6)
// Pregunta: ¿el sistema cumple sus objetivos con el tráfico ESPERADO?
// Simulamos 50 usuarios concurrentes (lo normal en hora pico) durante unos minutos.
import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

export const options = {
  stages: [
    { duration: '30s', target: 50 }, // rampa de subida
    { duration: '1m', target: 50 },  // carga sostenida
    { duration: '15s', target: 0 },  // rampa de bajada
  ],
  // Criterios de aceptación: si no se cumplen, k6 termina con error
  thresholds: {
    http_req_duration: ['p(95)<300'], // 95% de las peticiones en menos de 300 ms
    http_req_failed: ['rate<0.01'],   // menos del 1% de errores


    
  },
};

export default function () {
  const productos = http.get(`${BASE_URL}/api/productos`);
  check(productos, { 'catálogo responde 200': (r) => r.status === 200 });

  sleep(1); // "tiempo de pensar" del usuario

  const orden = http.post(
    `${BASE_URL}/api/ordenes`,
    JSON.stringify({ items: [{ productoId: 2, cantidad: 1 }] }),
    {
      headers: { 'Content-Type': 'application/json' },
      // 400 = sin stock: respuesta válida del negocio, no la contamos como fallo
      responseCallback: http.expectedStatuses(201, 400),
    }
  );
  // 201 = creada; 400 = sin stock (respuesta válida del negocio, no un fallo del servidor)
  check(orden, { 'orden procesada': (r) => r.status === 201 || r.status === 400 });

  sleep(1);
}
