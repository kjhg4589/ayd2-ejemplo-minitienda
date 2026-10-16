# Mini Tienda — ejemplo de los 5 tipos de prueba

Un mismo sistema (catálogo → carrito → cupón → orden) probado en todas sus capas.

```
public/          Frontend (HTML + JS)          ← E2E (Playwright)
src/app.js       API REST (Express)            ← Integración (Jest + Supertest) · Carga/Estrés (k6)
src/precios.js   Lógica de negocio pura        ← Unitarias (Jest)
src/db.js        Base de datos (SQLite)        ← Integración
```

## Requisitos
- Node.js 20+
- Docker (solo para las pruebas de carga y estrés con k6)

```bash
npm install
npx playwright install chromium
```

## Guion para la demo en clase

| # | Tipo | Comando | Qué mostrar |
|---|------|---------|-------------|
| 1 | Unitarias | `npm run test:unit` | 12 pruebas en milisegundos. Patrón AAA, `test.each`, casos límite (Q99.99 vs Q100), redondeo de flotantes |
| 2 | Integración | `npm run test:integration` | API + lógica + BD real en memoria. Verificar efecto en BD (stock) y **atomicidad** de la transacción |
| — | Cobertura | `npm run test:coverage` | Qué líneas quedan sin probar |
| 3 | E2E | `npm run test:e2e` (o `npx playwright test --headed` / `--ui`) | Un navegador real comprando. Playwright levanta el servidor solo |
| 4 | Carga | `npm start` en otra terminal, luego `npm run test:carga` | 50 usuarios, umbrales p95 < 300 ms y < 1 % de errores |
| 5 | Estrés | `npm start` en otra terminal, luego `npm run test:estres` | Subir hasta 1000 usuarios: ¿dónde se degrada? ¿se recupera? |

> Para carga/estrés arranca el servidor con datos limpios: `SEED=1 npm start`.
> Sin Docker: instala k6 (`brew install k6`) y corre `k6 run tests/performance/carga.js`.

## Ejercicios sugeridos para los estudiantes
1. **Unitaria:** agrega el cupón `ENVIOGRATIS` y escribe la prueba *antes* del código (TDD).
2. **Unitaria:** introduce un bug (quita el `redondear`) y observa qué prueba falla.
3. **Integración:** prueba que `GET /api/ordenes/:id` devuelve los items correctos.
4. **E2E:** escribe el flujo «stock insuficiente» (agregar 6 monitores).
5. **Carga:** baja el umbral a `p(95)<5` y observa cómo k6 marca la prueba como fallida.
6. **Estrés:** agrega un retardo artificial en `/api/productos` y encuentra el nuevo punto de quiebre.
7. **Spike (pico):** crea `pico.js` que pase de 0 a 800 usuarios en 5 s.

## CI/CD con GitHub Actions + EC2

```
push / PR ──► Unitarias ──► Integración ──► E2E          (CI: compuertas de calidad)
                                             │ solo push a main
                                             ▼
                              Deploy EC2 ──► Smoke test ──► Carga (k6)   (CD)

Manual (Actions > Run workflow): Prueba de estrés
```

| Archivo | Qué hace |
|---|---|
| `.github/workflows/ci-cd.yml` | Pipeline completo. Si una prueba falla, no se despliega |
| `.github/workflows/estres.yml` | Estrés bajo demanda (puede tumbar el servidor; por eso no es automático) |
| `deploy/setup-ec2.sh` | Prepara la EC2 una sola vez: Node 24, servicio systemd y nginx (80 → 3000) |

### 1. Crear la EC2
- AMI **Ubuntu 24.04** o **Amazon Linux 2023**; `t3.micro` alcanza.
- Security group: puerto **22** (SSH) y **80** (HTTP) abiertos.
- Descarga el par de llaves `.pem`.

### 2. Preparar el servidor (una sola vez)
```bash
scp -i llave.pem deploy/setup-ec2.sh ubuntu@<IP>:~
ssh -i llave.pem ubuntu@<IP> 'bash setup-ec2.sh'
```
(Con Amazon Linux el usuario es `ec2-user` en vez de `ubuntu`.)

### 3. Configurar GitHub
En el repositorio: **Settings → Secrets and variables → Actions**
- **Variables:** `EC2_HOST` = IP pública · `EC2_USER` = `ubuntu` o `ec2-user`
- **Secret:** `EC2_SSH_KEY` = contenido completo del `.pem`

### 4. Publicar
```bash
git init && git add . && git commit -m "Mini tienda con pruebas y CI/CD"
git branch -M main
git remote add origin git@github.com:<usuario>/tienda-testing.git
git push -u origin main
```
Abre la pestaña **Actions** para ver el pipeline. Al terminar, la tienda queda en `http://<IP>`.

> **Para la clase:** abre un PR con una prueba rota y muestra que el pipeline se pone en rojo y el deploy nunca corre.

> **Nota de seguridad:** abrir SSH a todo internet es aceptable para una demo con autenticación por llave, pero en producción se usa AWS SSM o se restringe por IP. Usa una IP elástica para que `EC2_HOST` no cambie al reiniciar la instancia.
