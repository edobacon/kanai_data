---
id: DOC-kb-sp7-UPONE-1378-smoke-test-replication
project: up1
type: doc
---

# UPONE-1378 · Replicación de los casos de prueba (smoke E2E)

> ⚠️ **OBSOLETO (2026-07-30).** El seed del mod cambió con UPONE-1456 (paquete PM #097 rev.2) y
> ninguno de los datos de este documento existe hoy: `TIR101` fue retirada, no queda ningún plan en
> `Draft` (la malla no es editable) y los targets del árbol son otros. Usar
> **[UPONE-1378-smoke-test-replication-v2.md](./UPONE-1378-smoke-test-replication-v2.md)**.
> Se conserva solo como registro del smoke S19.

Guía para regenerar y re-ejecutar el smoke del flujo de requisitos de asignatura + su
integración con la malla de un plan de estudios. Cubre: (1) render del árbol Y/O en la pestaña
Requisitos, (2) detección de prerrequisito/corequisito faltante al agregar una asignatura a la
malla, (3) manejo del corequisito por timing, (4) caso positivo (no bloqueo ciego).

Origen: smoke S19 (post review dredd). Tenant: **UPU** (`uplanner_upu`).

> Nota: los `id` de abajo son del seed actual de UPU y **pueden cambiar tras un reseed**. Resolvé
> siempre por **código** (Activity.code / Curriculum.name) con las queries de la sección "Resolver
> ids". Los códigos son estables; los cuid no.

---

## 0. Prerrequisitos del entorno

- Dev server de suite y object-manager arriba (`npm run dev --workspace=@uplanner/suite`, OM en :4000).
- Sync corrido (`npm run sync`) para que layouts + seed estén en la BD del tenant.
- Login en `http://localhost:3000/login/UPU` con Clerk test mode:
  - email: `eduardo.bacon+clerk_test@uplanner.com` (el `+clerk_test` es la marca de test)
  - OTP fijo: `424242`
  - rol resultante: **Consultor** (alcanza para editar la malla de un plan Draft).

## 1. Datos de prueba (del seed)

Si no existen, correr `npm run sync` (fase de seed) para (re)generarlos. El seed de requisitos vive
en `mods/curriculum-design/seed/_data-requirement.js`.

| Elemento | Código | Rol en el test |
|---|---|---|
| Introducción a las Redes | **TIR101** | Asignatura CON requisitos Y/O (prereq + coreq). Ojo: hay 2 TIR101; usar la que tiene requisitos (la de "Escuela de Tecnologias" con el árbol). |
| Química Básica | **QUI104** | Asignatura SIN requisitos (caso positivo). |
| Plan de Estudios Ingeniería Civil 2027 (Borrador) | estado **Draft** | Plan editable para probar el alta en la malla. |

Árbol de requisitos esperado de **TIR101** (regla: `(MAT101 Y ALG102 Y SVC-DES) Ó FIS103`):

| Curso objetivo | mustBe | timing | Tipo |
|---|---|---|---|
| Cálculo I (MAT101) | Approved | Before | prerrequisito |
| Álgebra Lineal (ALG102) | Taken | Concurrent | **corequisito** |
| Desarrollo y Liderazgo (SVC-DES) | Approved | Before | prerrequisito |
| Física General (FIS103) | Approved | Before | prerrequisito (vía alternativa) |

Malla esperada del Draft 2027 (6 entradas): P1 = 111026C, ALG102; P2 = ECO108, CALDEMO-ADM-1,
EST106, CALDEMO-ADM-2. Clave del test: **ALG102 está presente (P1) pero MAT101/SVC-DES/FIS103 NO**.

### Resolver ids (por código) — query de setup/verificación

Desde `object-manager/` (usa `DATABASE_URL_UPU` del `.env`):

```js
// node script con `pg`
const acts = await c.query(`SELECT id, code FROM "Activity" WHERE code IN ('TIR101','QUI104','MAT101','ALG102','SVC-DES','FIS103')`);
const plan = await c.query(`SELECT id, name, status FROM "Curriculum" WHERE "recordType"='Plan' AND name ILIKE '%2027%'`);
```

Ver el árbol de requisitos de una asignatura (base + RT projections):

```sql
SELECT r.id, r."recordType", r."parentId", r.label, g.combinator, rs."mustBe", rs.timing, rs."targetId"
FROM "requirement" r
LEFT JOIN "rt__Group__requirement" g ON g."requirementId" = r.id
LEFT JOIN "rt__RecordState__requirement" rs ON rs."requirementId" = r.id
WHERE r."ownerId" = '<TIR101_id>' AND r."ownerType" = 'activity'
ORDER BY r.position;
```

Auditar que no queden grupos vacíos (invariante RULE-curriculum-design-034):

```sql
SELECT r.id FROM "requirement" r JOIN "rt__Group__requirement" g ON g."requirementId" = r.id
WHERE (SELECT count(*) FROM "requirement" ch WHERE ch."parentId" = r.id) = 0;
-- debe devolver 0 filas
```

---

## 2. Caso 1 — Render del árbol de requisitos (pestaña Requisitos)

1. Ir a `http://localhost:3000/UPU/Activity/<TIR101_id>/RecordDetail/default_Activity_view`.
2. Verificar que **"Requisitos" es la 2da pestaña** (entre General y Modalidades).
3. Abrir la pestaña Requisitos. Esperado:
   - Cabecera "4 condición(es) — 2 vía(s)".
   - Texto de regla: `(Cálculo I (MAT101) Y Álgebra Lineal (ALG102) Y Desarrollo y Liderazgo (SVC-DES)) Ó Física General (FIS103)`.
   - Árbol: `Cualquiera de las vías` (O) → Vía 1, Vía 2.
4. Expandir Vía 1. Esperado (badges de condición):
   - MAT101 → **Aprobado · Antes**
   - ALG102 → **Cursado · Concurrente**
   - SVC-DES → **Aprobado · Antes**

Captura: pestaña Requisitos con Vía 1 expandida y los 3 badges.

---

## 3. Caso 2 — Detección de prerrequisito faltante al agregar a la malla (negativo, central)

1. Ir a `http://localhost:3000/UPU/Curriculum/<plan_2027_id>/RecordDetail/default_Curriculum_edit`.
2. Pestaña **Malla curricular**. (Si hace falta, activar "Modo edición".)
3. En **Período 3** (vacío) → botón **"+ Asignatura"**.
4. Paso 1: tipo **Obligatoria** → Siguiente.
5. Paso 2: buscar `TIR101`, marcar la que tiene requisitos (`<TIR101_id>`), **Agregar (1)**.
6. Esperado: modal **"Prerrequisitos faltantes"** que BLOQUEA el alta:
   > No es posible agregar esta asignatura porque los siguientes prerrequisitos no están colocados
   > en un período anterior: **Cualquiera de las vías** — 0 de 1 cursos colocados antes del período 3.
7. Cerrar con **Cancelar** (no agregar).

Captura: modal "Prerrequisitos faltantes".

Por qué bloquea: ninguna vía se satisface. Vía 1 necesita MAT101 (Antes) + ALG102 (Concurrente) +
SVC-DES (Antes); faltan MAT101 y SVC-DES. Vía 2 necesita FIS103 (Antes); falta. El mensaje es a
nivel del OR ("Cualquiera de las vías"), fiel al árbol Y/O (evaluador REQ-14 / RULE-033).

---

## 4. Caso 3 — Manejo del corequisito (dentro del Caso 2)

En el mismo bloqueo, **ALG102 (corequisito, Concurrent) está en P1** (≤ P3) → el evaluador lo
reconoce como **satisfecho** y NO lo marca faltante. Lo que gatilla el bloqueo son los prereqs
"Antes" ausentes. Confirma que distingue timing `Before` (estrictamente anterior) vs
`Concurrent`/`Either` (mismo período o antes).

Variante opcional — **corequisito ausente**: quitar ALG102 de la malla (o usar un plan sin ALG102)
y reintentar el alta de TIR101; el coreq también debe contribuir al faltante. (No cubierto en el
smoke S19; ALG102 estaba presente.)

---

## 5. Caso 4 — Positivo (no es bloqueo ciego)

1. Misma malla, Período 3 → "+ Asignatura" → Obligatoria → Siguiente.
2. Seleccionar **QUI104** (sin requisitos) → Agregar.
3. Esperado: **se agrega sin modal de bloqueo**; QUI104 aparece en P3 y los contadores suben.

Captura: P3 con QUI104 agregado, sin bloqueo.

---

## 5.b Caso 5 — Electivo K-de-N + Métrica de créditos (detección considera ambos)

Objetivo: comprobar que la detección de la malla **considera** un pool K-de-N (`minToSatisfy`) y un
umbral de créditos (`MetricThreshold`), no solo prereqs de curso simples.

Montaje (en una asignatura de prueba desbloqueada, ej. QUI104, pestaña Requisitos, modo edición):
1. "Agregar requisito" → clase **Electivo (K-de-N)** → pool = 3 cursos que NO estén en la malla
   destino (ej. MAT101, FIS103, GES110) → **K = 2** → Guardar.
2. "Agregar requisito" → clase **Métrica (créditos)** → operador **≥**, valor **60**, ámbito
   **Plan** → en el selector de vía elegir **"Vía 1"** (la existente) para que quede en AND con el
   electivo (no "Nueva vía") → Guardar.
3. Verificar el texto de regla: `(2 de 3: (MAT101 Ó FIS103 Ó GES110)) Y Créditos ≥ 60`.

Smoke:
1. Ir a la malla del plan Draft 2027 (modo edición) → Período 3 → "+ Asignatura" → Obligatoria →
   seleccionar la asignatura de prueba (QUI104) → Agregar.
2. Contexto: antes de P3 NO están los cursos del electivo (0 de 2) y hay 29 créditos (< 60).
3. Esperado: modal **"Prerrequisitos faltantes"** BLOQUEA el alta.

**Resultado verificado (S19)**: bloqueó. La detección **considera** el K-de-N y los créditos: si el
evaluador los ignorara, la vía sería "satisfecha vacuamente" y NO habría bloqueo. El requisito de
QUI104 era exactamente `AND(pool K=2, Créditos ≥ 60)` y el alta se rechazó.

> **Granularidad del mensaje (hallazgo)**: el modal resume a nivel del contenedor OR
> ("Cualquiera de las vías — 0 de 1 vías"), NO itemiza "K-de-N: 0 de 2" ni "créditos: 29 de 60".
> Es porque el editor envuelve todo requisito en un contenedor OR (vía única), así que el evaluador
> reporta el `MissingPrereqItem` en el nodo OR más superficial. La **evaluación** de K-de-N y
> créditos es correcta (bloquea/permite según corresponde); lo mejorable es el **detalle** del
> mensaje. Ver "Pendiente" abajo.

**Cobertura unit (umbrales exactos)**: la lógica de K-de-N y créditos está probada con aserciones
concretas en `modsComponents/CurriculumMesh/evaluateRequirementTree.logic.spec.ts` (mismo evaluador
que usa la malla):
- **TC-26** K-de-N por conteo: `minToSatisfy=2`, 1 colocado → viola; 2 → satisface.
- **TC-30** créditos del grupo: `creditsRequired=24`, 18 créd → viola; 24 → satisface.
- **TC-33** MetricThreshold(Credits): `≥60` plan, 48 → viola; 60 → satisface; scope category; solo
  cuenta créditos estrictamente anteriores.

Limpieza: borrar los requisitos de prueba de la asignatura (todos los `requirement` de su ownerId)
y no dejarla en la malla. Ver sección 6.

## 6. Limpieza (dejar el entorno como estaba)

El alta en la malla **persiste inmediatamente** (no espera al "Guardar"). Tras el Caso 4, quitar la
entrada de prueba:

- Por UI: en la malla, quitar QUI104 del Período 3.
- Por BD (rápido): `DELETE FROM "planEntry" WHERE "planId"='<plan_2027_id>' AND "activityId"='<QUI104_id>';`
  y verificar que el plan vuelva a 6 entradas.

Si en algún intento quedara un grupo de requisito vacío (no debería, por el rollback + RULE-034),
correr la query de auditoría de la sección 1 y borrarlo.

---

## 7. Pendiente / mejora

- **Automatización**: estos casos son **manuales (smoke por navegador)**. Follow-up: automatizarlos
  como test de integración / Playwright (fixtures de asignatura con árbol Y/O + plan Draft; asertar
  el modal de bloqueo y el caso positivo). Así se corren en CI y no dependen del seed vivo de UPU.
- **Granularidad del mensaje de bloqueo** (hallazgo Caso 5): el modal "Prerrequisitos faltantes"
  resume a nivel del contenedor OR ("Cualquiera de las vías — 0 de N vías") en vez de itemizar qué
  falta dentro (K-de-N: X de K; créditos: X de N; qué cursos). Para requisitos creados por el editor
  (siempre envueltos en un OR de vía única) el usuario no ve el detalle. Mejora posible: que
  `MissingPrereqItem`/el modal desciendan al nodo con la falla real (pool K-de-N, MetricThreshold) y
  muestren su detalle, o que el editor no envuelva en OR cuando hay una sola vía (alinear el dato con
  el render de `collapseSingleVia`). No bloquea la funcionalidad; es UX del mensaje.

Estado: creado 2026-07-29 (smoke S19, post review dredd). Casos 1-4 verificados en UPU.
