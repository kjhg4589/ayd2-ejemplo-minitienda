// PRUEBAS END-TO-END (E2E)
// Simulan a un usuario real en un navegador real: abren la página, hacen clic,
// escriben y verifican lo que se ve en pantalla. Atraviesan TODO el sistema:
// HTML/JS del frontend -> API -> lógica -> base de datos.
const { test, expect } = require('@playwright/test');

test.describe('Flujo de compra', () => {
  test('el usuario compra con cupón y ve la confirmación', async ({ page }) => {
    await page.goto('/');

    const agregar = page.getByRole('button', { name: 'Agregar Mouse inalámbrico' });
    await agregar.click();
    await agregar.click();
    await expect(page.getByTestId('contador')).toHaveText('2');

    await page.getByLabel('Cupón').fill('ESTUDIANTE10');
    await page.getByRole('button', { name: 'Pagar' }).click();

    // 2 × 150 = 300, -10% = 270, +12% IVA = 302.40
    await expect(page.getByRole('status')).toHaveText(/Orden #\d+ confirmada! Total: Q302\.40/);
    await expect(page.getByTestId('contador')).toHaveText('0');
  });

  test('muestra error con un cupón inválido', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Agregar Teclado mecánico' }).click();
    await page.getByLabel('Cupón').fill('GRATIS');
    await page.getByRole('button', { name: 'Pagar' }).click();

    await expect(page.getByRole('status')).toHaveText('Cupón inválido');
  });
});
