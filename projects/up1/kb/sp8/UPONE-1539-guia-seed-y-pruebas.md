# UPONE-1539 — Guía de seed y pruebas de la malla modular

Guía para **sembrar/resetear** el caso de prueba (lo puede hacer el LLM) y **visualizar cada caso**
en la UI (lo hacés vos). **Todo se prueba en un solo plan** ("Malla Modular Demo 1539"). Cubre:
render por niveles, prerrequisitos (Before), corequisitos (Concurrent), AND, OR, K-de-N, créditos,
`progression` inmutable (REQ-13), alta guiada (REQ-10), borrado seguro con cascada/bloqueo (REQ-14),
y los ajustes de TICKET-124: alta en lote que cuenta lo co-agregado (REQ-1), toggle "ver solo lo
seleccionado" (REQ-2) y nivel parcial de un OR/K-de-N con opciones sin colocar (REQ-6).

Archivos que usa esta guía (mismo directorio):
- `UPONE-1539-modular-smoke-fixture.sql` — siembra el plan de prueba (idempotente, `ON CONFLICT DO NOTHING`).
- `UPONE-1539-reset-fixture.sql` — borra el plan para empezar limpio (teardown).

---

## PARTE A — Seed / reset (para el LLM)

### Precondiciones del entorno
1. **OM (object-manager) y suite corriendo** (puertos 4000 y 3000), tenant **UPU** (`uplanner_upu`).
2. **Mod `curriculum-design` sincronizado** — sin esto el suite renderiza el mesh viejo (secuencial) aunque el plan sea Modular:
   ```bash
   npm run sync:files --workspace=@uplanner/object-management-backend      # objetos + configs
   npm run sync:logic --workspace=@uplanner/object-management-backend      # resolvers -> OM
   npm run sync:layouts --workspace=@uplanner/object-management-backend    # layouts -> tenant DB
   npm run sync --workspace=@uplanner/layout-engine                        # COMPONENTES -> layout/src/modsComponents (clave: el suite lee de ahí)
   ```
   Verificar OM arriba: `curl -s -X POST localhost:4000/graphql -H 'X-Tenant-ID: UPU' -H 'Content-Type: application/json' -d '{"query":"{__typename}"}'` → 200.
3. **Activities `CALDEMO-ADM-1..5` y `CALDEMO-AGR-1..5` sembradas** (seed base del mod). El fixture aborta con un mensaje claro si falta alguna.

> El contenedor de Postgres es `pg` (`docker exec pg psql -U pg -d uplanner_upu`).

### Sembrar (primera vez)
```bash
docker exec -i pg psql -U pg -d uplanner_upu < UPONE-1539-modular-smoke-fixture.sql
```

### Resetear (volver a limpio — recomendado antes de re-probar)
El fixture NO resetea por sí solo (solo inserta lo que falta). Para volver al estado PRISTINO
(borrando lo que pruebas previas hayan agregado/movido), correr reset y luego seed:
```bash
docker exec -i pg psql -U pg -d uplanner_upu < UPONE-1539-reset-fixture.sql
docker exec -i pg psql -U pg -d uplanner_upu < UPONE-1539-modular-smoke-fixture.sql
```
Ambos terminan con un `SELECT` de verificación (el fixture debe reportar `entries = 8`).

> Si el suite ya estaba abierto, **recargá la página** tras sembrar/resetear (o reiniciá el suite si
> el mesh no refleja el cambio).

---

## PARTE B — Cómo entrar a la malla (para vos)

1. `http://localhost:3000/login/UPU` → login modo test de Clerk: email `tu-usuario+clerk_test@uplanner.com`, código OTP `424242`.
2. Barra lateral → app **Curriculum Design** → pestaña **Planes de Estudio**.
3. Fila **"Malla Modular Demo 1539"** → menú **Acciones** → **Editar**.
4. Pestaña **Malla curricular** = la vista modular por niveles. (Para borrar/agregar, botón **"Modo edición"** arriba a la derecha.)

---

## PARTE C — Casos a visualizar

### C.0 — Render por niveles (REQ-01/02/06)
En **Malla curricular** deberías ver: banner *"Plan modular: las columnas son niveles derivados…"*,
**PERÍODOS: 0**, columnas **Nivel 1 / Nivel 2 / Nivel 3** (no períodos), y el orden recalculado solo
(no se arrastra a mano).

### C.1 — Nivel de cada curso (deriveLevel) — mapa exacto del fixture
Todas las asignaturas son de **5 créditos**. Nivel derivado = `1 + nivel requerido resuelto del árbol`:

| Curso | Requisito | Nivel esperado | Por qué |
|---|---|---|---|
| **CALDEMO-ADM-1** | (ninguno) | **1** | sin prerrequisitos |
| **CALDEMO-AGR-3** | (ninguno) | **1** | sin prerrequisitos |
| **CALDEMO-ADM-2** | prereq **ADM-1** (Before) | **2** | 1 + nivel(ADM-1)=1+1 |
| **CALDEMO-ADM-3** | prereq **ADM-1** (Before) + **coreq ADM-2** (Concurrent) | **2** | Before empuja (→2); el **corequisito NO empuja** → mismo nivel que ADM-2 |
| **CALDEMO-ADM-5** | **OR** {ADM-1, ADM-2} | **2** | 1 + **min**(1,2) = 2 (basta una vía → la más temprana) |
| **CALDEMO-ADM-4** | **AND** {ADM-1, ADM-2} | **3** | 1 + **max**(1,2) = 3 (necesita ambas) |
| **CALDEMO-AGR-1** | **K-de-N** "2 de 3" {ADM-1, ADM-2, ADM-4} | **3** | 1 + **2º-menor**(1,2,3) = 1+2 = 3 |
| **CALDEMO-AGR-2** | **créditos ≥ 15** (scope plan) | **3** | se ubica donde se **acumulan** 15 cr (3 cursos de 5 cr) |

**Qué comparar visualmente:** ADM-2 (Before) sube un nivel; ADM-3 se queda al lado de ADM-2
(coreq no empuja); ADM-5 (OR) queda más temprano que ADM-4 (AND) aunque dependen de los mismos
cursos — ésa es la diferencia OR (min) vs AND (max); AGR-1 (K-de-N) queda en 3; AGR-2 (créditos) en 3.

### C.2 — Ver requisitos por tarjeta (REQ-08)
En una tarjeta (ej. **ADM-3**) → ícono/botón **"Ver requisitos"** → modal con **Prerrequisitos**
(ADM-1, Before) y **Corequisitos** (ADM-2, Concurrent) agrupados por tipo.

### C.3 — Progresión inmutable (REQ-13)
- Pestaña **General** del plan **con cursos** (el seedeado) → campo **PROGRESIÓN** aparece **gris /
  deshabilitado** (igual que TIPO), con el texto *"Solo editable con la malla vacía. Con asignaturas,
  crea una nueva versión del plan para cambiar el modo."*. No editable.
- **Para ver editable** (plan vacío): **Planes de Estudio → Crear registro** → tipo *Plan de
  estudios* → PROGRESIÓN es **editable** (ahí se elige el modo). También lo es cualquier plan sin
  asignaturas.
- **Vía versión** (opcional): versionar exige estado **Vigente/Active** (el fixture crea *Borrador* →
  no versionable). Para probarlo, pasá el plan a **Active** (campo Estado) y luego **Acciones → Nueva
  versión**: la versión nace **vacía** → su PROGRESIÓN queda **editable**.

### C.4 — Alta guiada (REQ-10)
En **Modo edición** → **"Agregar asignatura"**:
- **Cadena determinista:** agregar **CALDEMO-AGR-4** (requiere AGR-5, que requiere AGR-3). El modal
  guiado ofrece agregar **toda la cadena** (AGR-5 + AGR-3) junto con AGR-4 → al confirmar, las 3
  quedan en sus niveles (AGR-3→N1, AGR-5→N2, AGR-4→N3).
- **Caso ambiguo (fallback manual):** agregar un curso cuyo requisito sea un **OR / K-de-N** con
  opciones no colocadas → el modal **informa las opciones** y te deja elegir a mano (no autocompleta).

### C.5 — Borrado seguro (REQ-14)  ← lo nuevo de tu review
En **Modo edición**, botón de **editar** de una tarjeta → en el modal, **"Quitar"**. Según de quién
dependa el curso, verás uno de tres resultados:

| Qué borrar (en el fixture pristino) | Resultado esperado | Qué ves |
|---|---|---|
| **CALDEMO-AGR-2** (créditos) o **CALDEMO-ADM-3** (nadie los requiere) | **Confirmación simple** | modal de confirmación con el nombre en la pregunta → confirmás y se borra |
| **CALDEMO-ADM-1** o **CALDEMO-ADM-2** (base de muchos requisitos) | **BLOQUEO** | *"No es posible quitar la asignatura"* + el **porqué**: dependientes (ej. Seminario ADM = OR, Fundamentos AGR = K-de-N) que quedarían sin opciones suficientes, e instrucción *"corrige primero ese requisito"*. Solo botón **Entendido** (sin borrar) |
| **Cascada** (ver receta abajo) | **Advertencia + cascada atómica** | el modal **lista los dependientes** que también se eliminarán → al confirmar, se borran todos en una sola operación |

**Receta para ver la CASCADA limpia:** en el fixture pristino, ADM-1/ADM-2 alimentan grupos (OR/K-de-N)
que hacen que su borrado **bloquee** (es lo correcto). Para una cascada determinista, armá una cadena
lineal: (1) **Agregar CALDEMO-AGR-4** por el flujo guiado (agrega AGR-5; AGR-3 ya está) → queda
`AGR-3 ← AGR-5 ← AGR-4`; (2) **Quitar CALDEMO-AGR-3** → el modal advierte que también se eliminarán
**AGR-5 y AGR-4** (dependen de AGR-3 en cadena, sin alternativa) → confirmás y se van los tres.

> **Importante:** los resultados de C.5 asumen el **fixture pristino**. Si ya borraste/agregaste
> cosas, **reseteá** (Parte A) antes de volver a probar, porque el veredicto depende del estado
> actual de la malla. El modal siempre te muestra el veredicto y el porqué reales.

---

### C.6 — Alta en lote, "ver solo lo seleccionado" y nivel parcial (TICKET-124: REQ-1/REQ-2/REQ-6)

Estos casos usan el **cluster electivo** que siembra el fixture: **Electivo Modular A / B / C / D**
(`SMOKE1539-A/B/C/D`), NO colocadas. **A** requiere **OR{B, C}** (ambas *Before*, ninguna colocada);
**D** requiere **créditos ≥ 45** (el plan base ya tiene 40 colocados). Todo se prueba en el **mismo
plan** "Malla Modular Demo 1539", en **Modo edición**.

#### C.6.1 — El chequeo del alta cuenta lo que se agrega en conjunto (REQ-1)

- **Síntoma sin el fix (control):** en **Agregar asignatura** elige **solo** *Electivo Modular A* y
  confirma. Como su OR no tiene ninguna opción colocada, aparece el bloqueo **"Prerrequisitos
  faltantes → Una de dos (OR) 0 de 1 cursos colocados"** con las opciones B y C. Cierra con **Volver**.
- **Con el fix:** vuelve a **Agregar asignatura** y selecciona **A y B juntas** (las dos en el
  paso 2). Al confirmar **no** aparece el bloqueo: B cuenta como colocada dentro del mismo lote y
  satisface el OR de A. Se agregan las dos.

> Antes de este fix, el chequeo miraba solo lo ya colocado en el plan e ignoraba lo que se estaba
> agregando en conjunto, por eso marcaba el prerrequisito como faltante aunque fuera en el mismo lote.

#### C.6.2 — "Ver solo lo seleccionado" en el picker (REQ-2)

- En el paso 2 del alta, con **A y B** marcadas, activa el checkbox **"Ver solo lo seleccionado"**
  (debajo del listado). La lista se reduce a las 2 asignaturas elegidas (útil para revisar el lote
  antes de confirmar, sobre todo en el alta guiada multinivel). Desactívalo para volver al catálogo.
- El control está deshabilitado si no hay nada seleccionado.

#### C.6.3 — Nivel parcial de un OR / K-de-N (REQ-6)

- Tras agregar **A + B** (C.6.1), la malla ubica **B en Nivel 1** y **A en Nivel 2**. A queda un
  nivel por encima de B **aunque C no esté colocada**: la opción ausente C se **excluye** del cálculo
  del nivel, no lo colapsa.
- **Qué comparar:** antes del fix, una opción no colocada de un OR/K-de-N valía "nivel 0" y arrastraba
  al curso al Nivel 1 (mal). Ahora solo cuentan las vías con su curso colocado. El mismo criterio
  aplica a los OR/K-de-N del fixture (ADM-5, AGR-1) cuando alguna opción no está en el plan.

#### C.6.4 — Alta en lote que aporta los créditos requeridos (REQ-1, cláusula de créditos)

- **Síntoma sin el fix (control):** en **Agregar asignatura** elige **solo** *Electivo Modular D* y
  confirma. Su requisito es *créditos ≥ 45* y el plan tiene 40 colocados, así que aparece el bloqueo
  **"Prerrequisitos faltantes → 40 de 45 créditos acumulados…"**. Cierra con **Volver**.
- **Con el fix:** vuelve a **Agregar asignatura** y selecciona **D, B y C juntas**. Al confirmar
  **no** aparece el bloqueo: los créditos de B y C (5 + 5) del mismo lote se suman a los 40 del plan
  (50 ≥ 45) y el umbral se cumple. Se agregan las tres.
- **Nivel superior:** D se ubica en el **último nivel** (donde se acumulan los 45 créditos), no en el 1.

> Antes de este fix, el chequeo trataba los cursos co-agregados con 0 créditos, así que un curso
> gateado por créditos nunca podía cumplir su umbral agregándolo junto con los que aportan esos
> créditos: bloqueaba aunque el lote los trajera.

> **Reset:** C.6.1 y C.6.4 agregan asignaturas al plan. Para volver al estado prístino (8 asignaturas,
> electivas sin colocar) corre el reset + fixture de la Parte A.

## PARTE D — Notas y troubleshooting

- **El mesh se ve secuencial (por períodos) pese a `progression=Modular`:** falta el sync de
  **componentes** (`npm run sync --workspace=@uplanner/layout-engine`) — es el paso que copia el mesh
  nuevo a `layout/src/modsComponents`. Corré ese sync y recargá.
- **Reset no "limpia" del todo:** usá `UPONE-1539-reset-fixture.sql` (borra el plan completo) y luego
  el fixture; el `ON CONFLICT DO NOTHING` del fixture por sí solo no borra lo agregado.
- **Estado del plan:** el fixture crea el plan en **Borrador** (para poder editar la malla). Versionar
  exige **Active**.
- **Automatización (opcional):** para smokes automáticos, el pane de browser embebido puede no
  renderizar bien este Nuxt; usar **Playwright/Chromium** y **cerrar el tour de onboarding** (botón
  *Omitir*) tras el login antes de navegar.

## Referencia
- Contrato/diseño: `deckard/projects/up1/tickets/TICKET-120.md` (UPONE-1539) + spec
  `SPEC-curriculum-design-modular-mesh-level-derivation`.
- Doc de plataforma del modo modular: `mods/curriculum-design/docs/architecture/curriculum-mesh-guards-prereqs.md`.
