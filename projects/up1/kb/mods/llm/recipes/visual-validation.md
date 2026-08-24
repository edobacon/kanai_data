---
id: SPEC-mods-020
project: up1
type: spec
module: mods
tags: [validacion, visual, playwright, navegacion, UI, screenshots, verificacion]
---
# Validacion visual en uP1

Flujos para verificar visualmente que el trabajo funciona en la plataforma local (`localhost:3000`).

## Prerequisitos

- Stack uP1 corriendo: Object Manager (`:4000`) + Suite (`:3000`)
- `npm run sync` ejecutado (y codegen/migrate si aplica)
- Login completado en `localhost:3000` con usuario Admin

## Navegacion basica

```
Base URL:     http://localhost:3000
Home:         http://localhost:3000/{TENANT}  (ej: /UPU)
App en sidebar: click en nombre → carga layouts del mod
Tabs:         barra horizontal bajo header → dropdown con sub-items
Modales:      RecordDetail se abre como modal sobre RecordList
```

> **Regla critica:** navegar siempre via clicks del sidebar, NO via `page.goto()` directo (la SPA puede perder la sesion).

---

## VV-01: Verificar que un mod aparece en el sidebar

**Aplica despues de:** MOD-03 (registrar app en sidebar)

**Flujo:**
1. Login en `localhost:3000` → redirige a `/{TENANT}`
2. Mirar la barra lateral izquierda
3. **Verificar:** el mod aparece con el label e icono definidos en `config/app.json`
4. **Si no aparece:**
   - El usuario actual no tiene el rol listado en `app.json.roles`
   - El tenant actual no esta en `app.json.tenants`
   - `npm run sync` no se ejecuto (fase 6)

**Playwright:**
```javascript
// Verificar que la app aparece en el sidebar
const appItem = page.getByRole('listitem').filter({ hasText: 'Mi Mod' });
await expect(appItem).toBeVisible();
```

---

## VV-02: Verificar que un RecordList muestra datos

**Aplica despues de:** LAY-01, OBJ-01

**Flujo:**
1. Click en el mod en el sidebar
2. Si hay tabs, click en el tab del objeto
3. **Verificar:**
   - Tabla visible con columnas definidas en el layout
   - Si hay datos: filas visibles con valores correctos
   - Si no hay datos: mensaje vacio (no error)
   - Botones crear/editar/eliminar visibles segun `canCreate`/`canEdit`/`canDelete`
   - Barra de busqueda visible si `showSearch: true`

**Playwright:**
```javascript
// Navegar al mod
await page.getByRole('listitem').filter({ hasText: 'Mi Mod' }).click();
await page.waitForTimeout(1000);

// Verificar que hay una tabla
const table = page.locator('table');
await expect(table).toBeVisible();

// Verificar columnas
const headers = page.locator('th');
await expect(headers.filter({ hasText: 'Nombre' })).toBeVisible();
await expect(headers.filter({ hasText: 'Estado' })).toBeVisible();

// Verificar boton crear
const createBtn = page.locator('button').filter({ hasText: /Crear/ });
await expect(createBtn).toBeVisible();
```

---

## VV-03: Verificar que un formulario de creacion funciona

**Aplica despues de:** LAY-03, LAY-04

**Flujo:**
1. Desde el RecordList, click en "Crear registro"
2. **Verificar:**
   - Modal se abre con formulario
   - Campos definidos en `schema` son visibles con labels correctos
   - Campos `required` muestran asterisco o indicador
   - Si hay `steps`: wizard con navegacion Siguiente/Anterior
3. Llenar campos obligatorios con datos de prueba
4. Click "Guardar"
5. **Verificar:**
   - Modal se cierra
   - Nuevo registro aparece en el RecordList
   - Si falla: verificar errores en la consola del browser o en logs de Object Manager

**Playwright:**
```javascript
// Abrir formulario de creacion
await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button'))
        .find(b => b.textContent.includes('Crear registro'));
    if (btn) btn.click();
});
await page.waitForTimeout(500);

// Verificar que el modal se abrio
const modal = page.locator('.modal.show');
await expect(modal).toBeVisible();

// Llenar campo por label
await page.getByLabel('Nombre').fill('Test Record');

// Si hay select/dropdown de FK
await page.locator('select, [class*="select"]').first().click();
// Seleccionar primer item

// Guardar
await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button'))
        .find(b => b.textContent.trim() === 'Guardar' || b.textContent.trim() === 'Save');
    if (btn) btn.click();
});
await page.waitForTimeout(1000);

// Verificar que el modal se cerro y hay un registro nuevo
await expect(page.locator('.modal.show')).not.toBeVisible();
```

---

## VV-04: Verificar navegacion list → view → edit

**Aplica despues de:** LAY-17 (set completo de layouts)

**Flujo:**
1. Desde el RecordList, click en la primera fila (link de primera columna)
2. **Verificar view:**
   - Modal RecordDetail se abre en modo view
   - Tabs visibles con labels correctos
   - Campos muestran datos del registro
   - Boton "Editar" visible
3. Click en "Editar"
4. **Verificar edit:**
   - Modal cambia a modo edit
   - Campos son editables
   - Boton "Guardar" visible
5. Cerrar modal
6. **Verificar:** vuelve al RecordList sin errores

**Playwright:**
```javascript
// Click en primer registro
await page.evaluate(() => {
    const link = document.querySelector('td a');
    if (link) link.click();
});
await page.waitForTimeout(500);

// Verificar modal view
await expect(page.locator('.modal.show')).toBeVisible();

// Verificar tabs
const tabs = page.locator('div.vf-tab-wrapper');
await expect(tabs.first()).toBeVisible();

// Click en editar
await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button'))
        .find(b => b.textContent.includes('Editar') || b.textContent.includes('Edit'));
    if (btn) btn.click();
});
await page.waitForTimeout(500);

// Cerrar modal
await page.evaluate(() => {
    const closeBtn = document.querySelector('.modal .btn-close');
    if (closeBtn) closeBtn.click();
});
```

---

## VV-05: Verificar lista embebida en RecordDetail

**Aplica despues de:** LAY-06 (lista embebida con {{parentId}})

**Flujo:**
1. Abrir un RecordDetail (view) de un registro padre
2. Click en el tab que contiene la lista embebida
3. **Verificar:**
   - Lista embebida visible dentro del tab
   - Solo muestra registros hijos del padre actual (filtro `{{parentId}}`)
   - Si no hay hijos: lista vacia, no error
   - Boton "Crear" de la lista embebida funciona (si `canCreate: true`)
4. Click en "Crear" de la lista embebida
5. **Verificar:**
   - Modal de creacion se abre
   - Campo FK al padre esta auto-asignado (via `autoAssignFields` o `initialDataMapping`)

**Playwright:**
```javascript
// Abrir registro padre
await page.evaluate(() => {
    const link = document.querySelector('td a');
    if (link) link.click();
});
await page.waitForTimeout(500);

// Click en tab de hijos
await page.evaluate((tabName) => {
    const tab = Array.from(document.querySelectorAll('div.vf-tab-wrapper'))
        .find(e => e.textContent.trim() === tabName);
    if (tab) tab.click();
}, 'Elementos Hijo');
await page.waitForTimeout(500);

// Verificar que hay una tabla dentro del modal
const embeddedTable = page.locator('.modal table');
await expect(embeddedTable).toBeVisible();
```

---

## VV-06: Verificar row actions y visibilityConditions

**Aplica despues de:** LAY-08, LAY-12

**Flujo:**
1. En un RecordList, click en el menu de 3 puntos de una fila
2. **Verificar:**
   - Acciones configuradas aparecen en el dropdown
   - Acciones con `requiredCapability` solo aparecen si el usuario tiene la capability
   - Acciones con `visibilityConditions` solo aparecen si el registro cumple las condiciones
3. Click en una accion tipo modal
4. **Verificar:**
   - Modal se abre con el layout target
   - Campos de `initialDataMapping` vienen pre-populados
   - Titulo del modal usa `modalTitleTag` si esta configurado

**Playwright:**
```javascript
// Abrir menu de acciones
await page.evaluate(() => {
    const actionBtn = document.querySelector('td .btn-link.dropdown-toggle');
    if (actionBtn) actionBtn.click();
});
await page.waitForTimeout(300);

// Verificar que aparecen acciones
const actionItems = page.locator('.dropdown-item');
await expect(actionItems.first()).toBeVisible();

// Click en una accion
await page.evaluate((actionLabel) => {
    const items = document.querySelectorAll('.dropdown-item');
    const target = Array.from(items).find(i => i.textContent.includes(actionLabel));
    if (target) target.click();
}, 'Crear Hijo');
```

---

## VV-07: Verificar componente Vue custom

**Aplica despues de:** VUE-01, VUE-09

**Flujo:**
1. Navegar al layout que contiene el componente custom
2. **Verificar:**
   - El componente renderiza (no muestra error ni area vacia)
   - Si tiene datos: muestra datos correctos del registro
   - Si tiene interaccion: click/input funciona
   - Consola del browser sin errores rojos

**En Storybook (alternativa):**
1. Abrir `localhost:6006`
2. Navegar a `Custom Components > From Mods > {mod} > {Widget}`
3. **Verificar:**
   - Story renderiza con mock data
   - Props se pueden cambiar en el panel de controles
   - Sin errores en consola

**Playwright (Storybook):**
```javascript
await page.goto('http://localhost:6006');
// Navegar al story
await page.getByRole('link', { name: /Mi Widget/ }).click();
await page.waitForTimeout(1000);

// Verificar que el componente renderiza en el iframe
const frame = page.frameLocator('#storybook-preview-iframe');
await expect(frame.locator('.mi-widget')).toBeVisible();
```

---

## VV-08: Verificar traducciones

**Aplica despues de:** I18N-01, I18N-02

**Flujo:**
1. Navegar a un RecordList del mod
2. **Verificar:**
   - Headers de columnas muestran texto traducido (no claves como `column.nombre`)
   - Si hay tabs: labels traducidos
   - Si hay row actions: labels traducidos
   - Si hay modal de creacion: titulo traducido
3. **Si se ven claves raw** (ej: `column.status` en vez de "Estado"):
   - `npm run sync` no se ejecuto
   - Archivo de traduccion faltante en `lang/`
   - Clave no coincide con el nombre del campo

**Playwright:**
```javascript
// Verificar que NO hay claves raw visibles
const body = await page.locator('body').textContent();
const hasRawKeys = /column\.\w+|tabs\.\w+|steps\.\w+/.test(body);
if (hasRawKeys) {
    console.error('Claves de traduccion raw detectadas — sync de i18n faltante');
}
```

---

## VV-09: Verificar RBAC

**Aplica despues de:** RBAC-01..05

**Flujo (con usuario Admin):**
1. Navegar al mod → todo visible, todas las acciones disponibles
2. **Verificar:** botones de crear, editar, eliminar visibles

**Flujo (con usuario sin permisos):**
1. Login con usuario que NO tiene las capabilities del mod
2. Navegar al mod
3. **Verificar:**
   - App no aparece en sidebar (si `roles` no incluye el rol del usuario)
   - O: app aparece pero acciones restringidas (si layout tiene `requiredCapability`)
   - Row actions protegidos no aparecen
   - Intentar acceder via URL directa → redirige o muestra error

---

## VV-10: Verificar FK display

**Aplica despues de:** LAY-09

**Flujo:**
1. En un RecordList con columna FK
2. **Verificar:**
   - La columna FK muestra el **nombre** del registro relacionado, no el UUID
   - Si tiene `relationLayoutIds`: click en el nombre navega al RecordDetail del objeto relacionado

**Playwright:**
```javascript
// Verificar que no hay UUIDs visibles en las columnas FK
const cells = await page.locator('td').allTextContents();
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-/;
const hasUUIDs = cells.some(c => uuidPattern.test(c.trim()));
if (hasUUIDs) {
    console.warn('UUIDs visibles — falta relationDisplayFields en el layout');
}
```

---

## VV-11: Verificar wizard (create con steps)

**Aplica despues de:** LAY-04

**Flujo:**
1. Click en "Crear registro"
2. **Verificar paso 1:**
   - Label del paso visible
   - Campos del paso visible
   - Boton "Siguiente" presente, "Anterior" deshabilitado
3. Llenar campos del paso 1 → click "Siguiente"
4. **Verificar paso 2:**
   - Nuevo set de campos visible
   - "Anterior" habilitado, "Siguiente" o "Guardar" presente
5. Si campos required no llenados → "Siguiente" bloqueado

---

## VV-12: Verificar evento + flow n8n

**Aplica despues de:** EVT-01..04, FLOW-02..03

**Flujo:**
1. Abrir n8n (`localhost:5678`) → verificar que el workflow esta activo (toggle ON)
2. En uP1, ejecutar la accion que dispara el evento (ej: crear registro)
3. En n8n, ir a "Executions" del workflow
4. **Verificar:**
   - Aparece una ejecucion reciente
   - Estado: "Success" (verde)
   - Datos del evento visibles en el nodo trigger
5. **Si no se ejecuta:**
   - Worker no esta corriendo (`docker compose --profile worker up -d`)
   - n8n no esta corriendo (`docker compose --profile flow up -d`)
   - Evento JSON no tiene match con la operacion ejecutada

---

## VV-13: Verificar estilos CSS

**Aplica despues de:** CSS-01..03

**Flujo:**
1. Navegar al layout del mod
2. **Verificar:**
   - Tokens del mod aplicados (colores, bordes, etc.)
   - Sin estilos "rotos" (elementos sin color, fuentes default del browser)
3. Abrir DevTools → Elements → buscar variables CSS del mod
4. **Verificar:**
   - Variables `--{mod}-*` existen en `:root`
   - Variables delegan a `--up1-*` con fallback

---

## VV-14: Verificar filtro por usuario actual

**Aplica despues de:** LAY-13

**Flujo:**
1. Login con usuario A → navegar al layout "Mis Registros"
2. **Verificar:** solo muestra registros creados por / asignados a usuario A
3. Login con usuario B → mismo layout
4. **Verificar:** muestra registros diferentes (los de usuario B)

---

## VV-15: Verificar aislamiento multi-tenant

**Aplica despues de:** cualquier cambio que toque datos

**Flujo:**
1. Login en tenant UPU → crear un registro con datos identificables
2. Login en tenant TEST → navegar al mismo objeto
3. **Verificar:** el registro creado en UPU NO aparece en TEST
4. **Si aparece:** falta `tenantId: context.tenantId` en el where del resolver

---

## Helper: cerrar modal de forma segura

```javascript
async function closeModal(page) {
    await page.evaluate(() => {
        // Intentar boton close (clase real: modal-close-button, no btn-close)
        const closeBtn = document.querySelector('.modal-close-button, .modal .btn-close, [class*="close"]');
        if (closeBtn) { closeBtn.click(); return; }
        // Fallback: force close
        document.querySelectorAll('.modal.show').forEach(m => {
            m.classList.remove('show');
            m.style.display = 'none';
        });
        document.querySelectorAll('.modal-backdrop').forEach(b => b.remove());
        document.body.classList.remove('modal-open');
    });
    await page.waitForTimeout(300);
}
```

## Helper: cerrar tour de bienvenida

```javascript
async function closeTour(page) {
    const skipBtn = page.getByRole('button', { name: 'Omitir' });
    if (await skipBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await skipBtn.click();
    }
}
```
