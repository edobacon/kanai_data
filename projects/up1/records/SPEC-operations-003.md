---
id: SPEC-operations-003
project: up1
type: doc
module: operations
status: guia-practica
tags:
  - up1
  - navegacion
  - playwright
  - login
  - modales
  - sidebar
  - RecordList
  - RecordDetail
  - inline-edit
  - busqueda
  - filtros
---

# uP1 — Guia de navegacion para Playwright

Descubrimientos sobre como navegar uP1 de forma eficiente con Playwright. Incluye quirks, patrones, y workarounds.

---

## 1. Login (Clerk OTP)

### Flujo

1. Navegar a `http://localhost:3000` → redirige a `/login/UPU`
2. Esperar que desaparezca "Initializing authentication..."
3. Llenar email en input `textbox "Email address"`
4. Click en boton "Continue"
5. Esperar pantalla de "Verification code"
6. Llenar codigo OTP (6 digitos, recibido por email)
7. Click en boton "Verify Code"
8. Redirige a `/UPU` (home)

### Playwright

```javascript
// 1. Navegar
await page.goto('http://localhost:3000');

// 2. Esperar input de email
await page.getByRole('textbox', { name: 'Email address' }).waitFor();

// 3-4. Llenar y enviar
await page.getByRole('textbox', { name: 'Email address' }).fill('eduardo.bacon@uplanner.com');
await page.getByRole('button', { name: 'Continue' }).click();

// 5-7. Esperar y llenar OTP (requiere intervencion humana o API)
await page.getByRole('textbox', { name: 'Verification code' }).waitFor();
await page.getByRole('textbox', { name: 'Verification code' }).fill('CODIGO');
await page.getByRole('button', { name: 'Verify Code' }).click();

// 8. Esperar home
await page.waitForURL('**/UPU');
```

### Consideraciones

- **La sesion se mantiene** entre navegaciones via sidebar (single page app).
- **La sesion puede perderse** si se navega directamente a una URL con `page.goto()`. La app redirige a login pero a veces se re-autentica sola tras unos segundos (probablemente refresh token).
- **Recomendacion:** Despues del login, navegar siempre via clicks del sidebar en lugar de `page.goto()`.
- **Tour de bienvenida:** Aparece al primer login. Cerrar con boton "Omitir" antes de interactuar.

```javascript
// Cerrar tour si aparece
const skipBtn = page.getByRole('button', { name: 'Omitir' });
if (await skipBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await skipBtn.click();
}
```

---

## 2. Sidebar de apps

### Estructura

Lista vertical en el lateral izquierdo. Cada app es un `listitem` con icono + nombre. La app activa tiene borde teal.

### Navegar entre apps

```javascript
// Click directo por nombre (metodo mas confiable)
await page.getByRole('listitem').filter({ hasText: 'Engagement' }).click();

// Esperar que cargue — la URL cambia a /{tenant}/{object}/RecordList/{layoutId}
await page.waitForURL('**/Event/**');
```

### Consideraciones

- El sidebar solo es clickeable cuando **no hay modal abierto**. Si hay modal, Playwright lanza timeout porque el modal intercepta pointer events.
- **Antes de navegar via sidebar**, siempre cerrar modales abiertos (ver seccion 4).
- El boton "+1" al fondo muestra apps adicionales que no caben en el sidebar.
- **No todos los items del sidebar son apps de negocio** — "Object Manager" y "Flow Viewer" son herramientas del sistema.

---

## 3. Top tabs (navegacion dentro de una app)

### Estructura

Barra horizontal bajo el header con botones dropdown. Ej: en Engagement → `[Eventos ▼]` `[Ofertas ▼]`. En Object Manager → `[Aplicaciones ▼]` `[Objetos ▼]`.

### Son dropdowns, no tabs simples

Al hacer click se abre un dropdown con sub-items. Ejemplo: "Objetos" abre:
- "Definiciones de Objetos"
- "+ Crear Vista Personalizada"

### Navegacion

```javascript
// 1. Click en el tab/dropdown
await page.getByRole('button', { name: 'Objetos' }).click();

// 2. Click en el item del dropdown (no funciona con ref de snapshot)
// Usar evaluate para encontrar el item por texto
await page.evaluate(() => {
    const items = document.querySelectorAll('button.dropdown-item');
    const target = Array.from(items).find(i => 
        i.textContent.trim() === 'Definiciones de Objetos'
    );
    if (target) target.click();
});
```

### Consideraciones

- Los dropdown items **no aparecen en el snapshot de accesibilidad** — son elementos dinamicos que se renderizan al hacer click.
- Usar `page.evaluate()` con selectores CSS para interactuar con estos items.
- Despues de clickear un dropdown item, la URL puede o no cambiar dependiendo del layout de destino.

---

## 4. Modales (patron critico)

### Comportamiento

- Los **RecordDetail** (view/edit/create) se abren como **modales** sobre el RecordList.
- La lista permanece visible atras (usuario no pierde contexto).
- Los modales usan clase CSS `.modal.show` con backdrop.
- Los modales **bloquean toda interaccion** con elementos detras (sidebar, tabs, botones).

### Abrir modales

```javascript
// Abrir view — click en link de la primera columna
await page.evaluate(() => {
    const link = document.querySelector('td a');
    if (link) link.click();
});

// Abrir create — click en boton "Crear registro"
await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button'))
        .find(b => b.textContent.includes('Crear registro'));
    if (btn) btn.click();
});
```

### Cerrar modales — QUIRK CRITICO

El boton X (`.btn-close`) a veces **no cierra completamente** el modal — el backdrop puede quedar, bloqueando la UI.

**Metodo seguro para cerrar:**

```javascript
async function closeModal(page) {
    await page.evaluate(() => {
        // Intentar boton X primero
        const closeBtn = document.querySelector('.modal .btn-close');
        if (closeBtn) {
            closeBtn.click();
            return;
        }
        // Fallback: force close
        document.querySelectorAll('.modal.show').forEach(m => {
            m.classList.remove('show');
            m.style.display = 'none';
        });
        document.querySelectorAll('.modal-backdrop').forEach(b => b.remove());
        document.body.classList.remove('modal-open');
    });
    // Esperar que el modal desaparezca
    await page.waitForTimeout(300);
}
```

**Siempre llamar `closeModal()` antes de:**
- Navegar via sidebar
- Cambiar de tab
- Hacer click en otro registro

### Modales anidados

Un RecordDetail puede tener tabs con RecordList embebidos. Click en un registro de la lista embebida abre **otro modal sobre el modal**. Cuidado con la pila de modales.

### Botones dentro de modales

Los botones de un modal (Cancelar, Guardar, tabs) no se identifican facilmente por ref del snapshot. Usar evaluate:

```javascript
// Click en tab "Layouts" dentro de un modal
await page.evaluate(() => {
    const tab = Array.from(document.querySelectorAll('div.vf-tab-wrapper'))
        .find(e => e.textContent.trim() === 'Layouts');
    if (tab) tab.click();
});

// Click en "Cancelar" del modal mas reciente
await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'))
        .filter(b => b.textContent.trim() === 'Cancelar');
    if (btns.length > 0) btns[btns.length - 1].click();
});
```

---

## 5. RecordList — Interacciones

### Busqueda

La busqueda filtra en **todas las columnas** simultaneamente. El texto buscado se **resalta en rojo** en las celdas que coinciden.

```javascript
// Buscar
await page.evaluate((term) => {
    const search = document.querySelector('input[placeholder*="Buscar"]');
    if (search) {
        search.focus();
        search.value = term;
        search.dispatchEvent(new Event('input', { bubbles: true }));
    }
}, 'Academic');

// Limpiar busqueda
await page.evaluate(() => {
    const search = document.querySelector('input[placeholder*="Buscar"]');
    if (search) {
        search.value = '';
        search.dispatchEvent(new Event('input', { bubbles: true }));
    }
});
```

**Screenshot referencia:** [16-search-result.png](screenshots/16-search-result.png) — Busqueda "Academic" reduce 128→2 resultados, texto resaltado en rojo.

### Paginacion

```javascript
// Ir a pagina especifica
await page.evaluate((pageNum) => {
    const btn = Array.from(document.querySelectorAll('button'))
        .find(b => b.textContent.trim() === String(pageNum));
    if (btn) btn.click();
}, 2);
```

**Cuidado con paginacion dentro de modales:** Los controles de paginacion del RecordList embebido son distintos de los de la pagina principal. Usar selectores mas especificos:

```javascript
// Paginacion dentro de un modal
await page.evaluate((pageNum) => {
    const pags = document.querySelectorAll('.modal .page-link, .modal-body .page-link');
    const target = Array.from(pags).find(b => b.textContent.trim() === String(pageNum));
    if (target) target.click();
}, 3);
```

### Selector de layout

El dropdown junto al titulo permite cambiar entre layouts del mismo objeto:

```javascript
// Abrir selector de layout (click en icono caret-down junto al titulo)
await page.evaluate(() => {
    const caret = document.querySelector('.bi-caret-down-fill, [class*="caret"]');
    if (caret) caret.click();
});
```

Muestra: nombre de cada layout disponible + "Crear Vista Personalizada".

### Toggle Lista/Cards

```javascript
// Cambiar a vista de lista
await page.evaluate(() => {
    const btn = document.querySelector('.view-toggle-btn:not(.disabled)');
    if (btn) btn.click();
});
```

**Nota:** Cards puede estar deshabilitado (`disabled`) en algunos layouts.

### Edicion inline

Click en el icono de lapiz de una celda abre un **mini-modal** sobre la celda con:
- Label del campo
- Input con valor actual
- Botones Cancelar / Guardar

```javascript
// Activar edicion inline en la primera celda editable
await page.evaluate(() => {
    const editBtn = document.querySelector('td .edit-trigger-btn');
    if (editBtn) editBtn.click();
});

// Cerrar edicion inline sin guardar
await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'))
        .filter(b => b.textContent.trim() === 'Cancelar');
    if (btns.length > 0) btns[btns.length - 1].click();
});
```

**Screenshot referencia:** [18-inline-edit.png](screenshots/18-inline-edit.png) — Mini-modal de edicion sobre celda "Custom".

**Campos no editables** muestran tooltip "This field is not editable" y no tienen boton de lapiz.

### Row actions (menu contextual)

Boton de 3 puntos (`btn-link dropdown-toggle`) al final de cada fila:

```javascript
// Abrir menu de acciones de la primera fila
await page.evaluate(() => {
    const actionBtn = document.querySelector('td .btn-link.dropdown-toggle');
    if (actionBtn) actionBtn.click();
});
```

Las acciones tienen visibilidad condicional (campo + RBAC). Solo aparecen las acciones que el usuario puede ejecutar.

---

## 6. RecordDetail — Interacciones

### Formularios

Los campos se identifican por label. Los tipos de input varian:
- **text/textarea**: inputs estandar
- **select (FK)**: dropdown con placeholder "Select X..."
- **toggle**: switch para booleanos
- **date**: date picker
- **richtext**: editor enriquecido

### Tabs dentro de modales

Los tabs en RecordDetail usan `div.vf-tab-wrapper`, no `role="tab"`:

```javascript
// Click en tab por nombre
async function clickModalTab(page, tabName) {
    await page.evaluate((name) => {
        const tab = Array.from(document.querySelectorAll('div.vf-tab-wrapper'))
            .find(e => e.textContent.trim() === name);
        if (tab) tab.click();
    }, tabName);
}

await clickModalTab(page, 'Layouts');
await clickModalTab(page, 'Metadata');
```

### Wizard (steps)

En formularios con steps, los botones de navegacion son:
- "Siguiente" / "Next" para avanzar
- "Anterior" / "Previous" para retroceder
- No se puede avanzar sin completar campos requeridos del paso actual

### Guardar / Cancelar

```javascript
// Guardar
await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button'))
        .find(b => b.textContent.trim() === 'Guardar');
    if (btn) btn.click();
});

// Cancelar
await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button'))
        .find(b => b.textContent.trim() === 'Cancelar');
    if (btn) btn.click();
});
```

**Despues de guardar:** el modal se cierra y la lista se refresca automaticamente.

---

## 7. GraphQL API directa

El Object Manager corre en `localhost:4000` y acepta queries GraphQL sin autenticacion de Suite.

```bash
# Listar todos los objetos
curl -s -X POST http://localhost:4000/graphql \
  -H "Content-Type: application/json" \
  -H "X-Tenant-ID: UPU" \
  -d '{"query":"{ getObjectDefinitions { name label labelPlural } }"}' \
  | python3 -m json.tool

# Listar registros de un objeto
curl -s -X POST http://localhost:4000/graphql \
  -H "Content-Type: application/json" \
  -H "X-Tenant-ID: UPU" \
  -d '{"query":"{ listInstances(objectName: \"Category\", pagination: { page: 1, pageSize: 5 }) { instances { id } totalCount } }"}' \
  | python3 -m json.tool
```

**Consideraciones:**
- Header `X-Tenant-ID: UPU` es **obligatorio** en cada request.
- No requiere Bearer token para desarrollo local.
- Suite (localhost:3000) **no proxea** a GraphQL — no intentar `/graphql` desde el browser, da HTML.
- Util para obtener inventario de objetos, campos, datos sin navegar la UI.

---

## 8. URLs y routing

### Patron de URL

```
http://localhost:3000/{tenantId}/{objectName}/{layoutType}/{layoutId}
```

Ejemplo: `http://localhost:3000/UPU/Event/RecordList/engagement_mis_eventos_list`

### Navegar por URL vs sidebar

| Metodo | Pro | Contra |
|--------|-----|--------|
| `page.goto(url)` | Directo, sin clics | Puede perder sesion, forzar re-auth |
| Click sidebar | Mantiene sesion, SPA nativo | Requiere cerrar modales primero |
| `page.evaluate(location.href = url)` | Mantiene sesion SPA | Menos predecible |

**Recomendacion:** Usar sidebar para navegacion principal. Usar `page.goto()` solo para el login inicial.

---

## 9. Selectores recomendados por elemento

| Elemento | Selector CSS | Selector Playwright |
|----------|-------------|-------------------|
| Search input | `input[placeholder*="Buscar"]` | `getByPlaceholder('Buscar')` |
| Crear registro btn | `button` con texto "Crear registro" | `getByRole('button', { name: /Crear registro/ })` |
| Fila de tabla (link) | `td a` (primera columna) | `getByRole('link', { name: 'NombreRegistro' })` |
| Edicion inline | `.edit-trigger-btn` | evaluate necesario |
| Row actions | `.btn-link.dropdown-toggle` en `td` | evaluate necesario |
| Tab en modal | `div.vf-tab-wrapper` con texto | evaluate necesario |
| Paginacion | `.page-link` con numero | evaluate necesario |
| Modal close | `.modal .btn-close` | `getByRole('button', { name: 'Close' })` |
| Toggle lista/cards | `.view-toggle-btn` | evaluate necesario |
| Dropdown de layout | `.bi-caret-down-fill` junto al titulo | evaluate necesario |
| Sidebar app | `listitem` con texto | `getByRole('listitem').filter({ hasText: 'AppName' })` |
| Top tab dropdown | `button` con texto del tab | `getByRole('button', { name: 'TabName' })` |
| Dropdown item | `button.dropdown-item` con texto | evaluate necesario |

---

## 10. Helper functions reutilizables

```javascript
// Cerrar modal abierto (force)
async function closeAllModals(page) {
    await page.evaluate(() => {
        document.querySelectorAll('.modal.show').forEach(m => {
            m.classList.remove('show');
            m.style.display = 'none';
        });
        document.querySelectorAll('.modal-backdrop').forEach(b => b.remove());
        document.body.classList.remove('modal-open');
    });
    await page.waitForTimeout(300);
}

// Navegar a app via sidebar
async function navigateToApp(page, appName) {
    await closeAllModals(page);
    await page.getByRole('listitem').filter({ hasText: appName }).click();
    await page.waitForTimeout(1000);
}

// Buscar en RecordList
async function searchInList(page, term) {
    await page.evaluate((t) => {
        const s = document.querySelector('input[placeholder*="Buscar"]');
        if (s) { s.value = t; s.dispatchEvent(new Event('input', { bubbles: true })); }
    }, term);
    await page.waitForTimeout(500);
}

// Limpiar busqueda
async function clearSearch(page) {
    await page.evaluate(() => {
        const s = document.querySelector('input[placeholder*="Buscar"]');
        if (s) { s.value = ''; s.dispatchEvent(new Event('input', { bubbles: true })); }
    });
    await page.waitForTimeout(500);
}

// Click en registro por nombre (abre modal view)
async function clickRecord(page, name) {
    await page.evaluate((n) => {
        const link = Array.from(document.querySelectorAll('td a'))
            .find(a => a.textContent.trim() === n);
        if (link) link.click();
    }, name);
    await page.waitForTimeout(500);
}

// Click en tab dentro de modal
async function clickModalTab(page, tabName) {
    await page.evaluate((name) => {
        const tab = Array.from(document.querySelectorAll('div.vf-tab-wrapper'))
            .find(e => e.textContent.trim() === name);
        if (tab) tab.click();
    }, tabName);
    await page.waitForTimeout(300);
}

// Ir a pagina N
async function goToPage(page, n) {
    await page.evaluate((num) => {
        const btn = Array.from(document.querySelectorAll('.page-link'))
            .find(b => b.textContent.trim() === String(num));
        if (btn) btn.click();
    }, n);
    await page.waitForTimeout(500);
}

// Ir a pagina N dentro de modal
async function goToModalPage(page, n) {
    await page.evaluate((num) => {
        const btns = document.querySelectorAll('.modal .page-link, .modal-body .page-link');
        const target = Array.from(btns).find(b => b.textContent.trim() === String(num));
        if (target) target.click();
    }, n);
    await page.waitForTimeout(500);
}

// Abrir formulario de creacion
async function clickCreate(page) {
    await page.evaluate(() => {
        const btn = Array.from(document.querySelectorAll('button'))
            .find(b => b.textContent.includes('Crear registro'));
        if (btn) btn.click();
    });
    await page.waitForTimeout(500);
}

// Click en dropdown item por texto
async function clickDropdownItem(page, text) {
    await page.evaluate((t) => {
        const item = Array.from(document.querySelectorAll('button.dropdown-item, li.dropdown-item'))
            .find(i => i.textContent.trim().includes(t));
        if (item) item.click();
    }, text);
    await page.waitForTimeout(300);
}
```

---

## 11. Problemas conocidos y workarounds

| Problema | Causa | Workaround |
|----------|-------|-----------|
| Click en sidebar falla con timeout | Modal abierto intercepta pointer events | `closeAllModals()` antes de navegar |
| `page.goto()` pierde sesion | Clerk auth se pierde en navegacion directa | Navegar via sidebar, no goto |
| Snapshot no muestra contenido del modal | Snapshot a profundidad limitada | Usar depth alto o `page.evaluate()` para inspeccionar |
| Tabs del modal no responden a click por ref | Los tabs usan `div.vf-tab-wrapper`, no `role="tab"` | `clickModalTab()` via evaluate |
| Paginacion del modal cambia la pagina principal | Selectores CSS ambiguos | Usar `.modal .page-link` para paginacion dentro de modal |
| Edicion inline abre mini-modal | No es inline real, es un popup | Cerrar con `Cancelar` del ultimo boton visible |
| Total de registros fluctua entre paginaciones | Re-conteo asincrono del backend | Normal, no es un bug |
| Dropdown items no aparecen en snapshot | Se renderizan dinamicamente | Usar `page.evaluate()` con selectores CSS |

---

## Historial de cambios

| Fecha | Descripcion |
|-------|-------------|
| 2026-04-09 | Documento inicial con todos los patrones de navegacion descubiertos |
