---
id: DOC-kb-sp6-analisis-soft-delete-engagement
project: up1
type: doc
---

# Análisis: Soft-delete en Engagement (uengagement-up1)

> **Contexto:** documento de respaldo para el **Punto 5 (Eliminación)** de SP6. Valida y **amplía** lo que los análisis de SP6 ya afirmaban sobre el soft-delete de Engagement, con la evidencia real del código.
>
> **TL;DR:** Engagement implementó soft-delete de forma **ad-hoc por objeto**, con un flag booleano (`active` / `isActive`) y **filtrado por-layout**, no a nivel de plataforma. Funciona bien dentro de sus propios flujos, pero **fuga** al ser consumido por cualquier lectura que no incluya el filtro (MCP, otro layout, otro mod, reportería genérica). SP6 lo catalogó solo en `Availability`; en realidad el patrón está replicado en **4 objetos** (soft-delete real) + **2** con flag de habilitación de catálogo.

---

## 1. Qué se hizo

El flujo self-service de Engagement (Responsable gestiona su propia disponibilidad — **UPONE-1139 / ENG-07**) necesitaba "borrar" bloques de disponibilidad **sin perder trazabilidad**. Como en core **no existe un borrado lógico genérico**, el mod lo resolvió por su cuenta:

1. Agregó un flag booleano al objeto (`active`, default `true`).
2. Escribió **mutations custom** que en vez de borrar físicamente setean el flag a `false`.
3. Aplicó el filtro de visibilidad (`active = true`) **en cada layout** que debe ocultar los inactivos.

Ese mismo patrón se repitió después en otros objetos del mod (`Attendance`, `Journal`, `FormTemplate`) y en flags de habilitación de catálogo (`ActivityType`, `InstructorTier`).

---

## 2. Cómo funciona en `Availability` (implementación canónica)

Es la implementación más completa y la que SP6 usó como evidencia.

### 2.1 El campo

Vive en el **objeto Base de core**, no en el JSON del mod:
[`object-manager/objects/business/Base/availability.json:35-41`](../../../up1/object-manager/objects/business/Base/availability.json)

```json
"active": {
  "type": "boolean",
  "title": "Active",
  "not_null": true,
  "static_default": "true",
  "description": "Soft delete flag. true = bloque vigente, false = histórico (inactivo). UPONE-1139."
}
```

> **Nota:** el flag terminó en el Base object de core (arrastrando también `recordType`), pero **la lógica que lo usa es toda del mod**. Core define la columna; no la interpreta como borrado.

### 2.2 Las mutations custom

[`mods/uengagement-up1/logic/instructor-availability.resolver.js`](../../../up1/mods/uengagement-up1/logic/instructor-availability.resolver.js) — expuestas globalmente vía GraphQL en [`object-manager/src/graphql/typeDefs/mods.js:841-866`](../../../up1/object-manager/src/graphql/typeDefs/mods.js):

| Mutation | Qué hace | Línea |
|----------|----------|-------|
| `softDeleteInstructorAvailability(id)` | Setea `active = false`. Idempotente sobre ya-inactivos. **Nunca** hard delete. | `resolver.js:238` |
| `createInstructorAvailabilityValidated(input)` | Crea bloque `active:true` e **inactiva automáticamente** los bloques activos que se solapan (mismo día/periodo). | `resolver.js:48` |
| `reactivateInstructorAvailability(id)` | Reactiva (`active:true`) resolviendo solapes en la misma transacción. | `resolver.js:174` |

El "delete" real es un `update`:

```js
// resolver.js:251-255 — softDeleteInstructorAvailability
return prisma.Availability.update({
  where: { id },
  data: { active: false },
  include: { [RT_MODEL]: true },
});
```

### 2.3 El filtro de lectura

El resolver **sí filtra** cuando calcula solapes (`resolver.js:116`):

```js
const overlapWhere = {
  idInstructor, idTerm,
  availability: {
    active: true,          // ← solo bloques vigentes
    dayOfWeek,
    startTime: { lt: endDate },
    endTime: { gt: startDate },
  },
};
```

Pero para **mostrar** la disponibilidad en la UI, el filtro se declara **en cada layout**, no en el resolver:

- [`engagement_Availability_instructor_view.json:48`](../../../up1/mods/uengagement-up1/config/layouts/engagement_Availability_instructor_view.json) → `{ "field": "active", "operator": "EQUALS", "value": true }`
- [`engagement_Availability_responsible_calendar.json:30`](../../../up1/mods/uengagement-up1/config/layouts/engagement_Availability_responsible_calendar.json) → mismo filtro

**Aquí está el problema de raíz:** la visibilidad depende de que *cada consumidor* recuerde declarar el filtro.

---

## 3. El mismo patrón, replicado

SP6 solo catalogó `Availability`. La realidad: el flag está en **6 objetos** del mod.

| Objeto | Campo | Semántica (según su `description`) | ¿Soft-delete? | Filtro por-layout visto |
|--------|-------|-------------------------------------|:---:|-------------------------|
| `Availability` | `active` | "true = vigente, false = histórico" | ✅ | `instructor_view`, `responsible_calendar` |
| `Attendance` | `isActive` | "false cuando el estudiante se desinscribe (preserva historial)" | ✅ | `event_manage:13`, `attendance-student-list:38` |
| `Journal` | `active` | "Las entradas no se borran físicamente (preserva historial)" | ✅ | `responsible_list:14`, `responsible_chibi:21` |
| `FormTemplate` | `active` | "El hard delete se bloquea si feedbackCount > 0" | ✅ | `center_list:36` |
| `ActivityType` | `isActive` | "disponible para asignarse a nuevas Activities" | ⚠️ catálogo | toggle en view/edit |
| `InstructorTier` | `isActive` | "disponible para asignación" | ⚠️ catálogo | toggle en view/edit |

- **✅ Soft-delete real (4):** el flag reemplaza al borrado; el registro se preserva por trazabilidad.
- **⚠️ Habilitación de catálogo (2):** mismo mecanismo, pero la intención es "disponible / no disponible", no "borrado". La **fuga de visibilidad es idéntica** en ambos casos.

Cada objeto resolvió el "delete" a su manera:
- `Availability` → mutations custom dedicadas.
- `Attendance` → **auto-inactivación por workflow n8n** (FLOW-04) al desinscribirse el estudiante.
- `Journal` / `FormTemplate` → flag + filtro por-layout, sin mutation dedicada.

**No hay una convención única:** ni el nombre del campo (`active` vs `isActive`), ni el mecanismo de escritura, ni el de filtrado están estandarizados.

---

## 4. Cómo funciona (y falla) con otros objetos y mods

### 4.1 La lectura genérica de core NO conoce el flag

Todas las lecturas de plataforma pasan por `listInstances` ([`object-manager/src/graphql/resolvers/instance.resolver.js:1189`](../../../up1/object-manager/src/graphql/resolvers/instance.resolver.js)). Su `where` se arma **solo** con:

```
combinedFilters = filters (arg) + layoutConfig.filters
```

No hay inyección automática de `active = true`. Si el consumidor no pasa el filtro, **los registros "borrados" se devuelven como cualquier otro**. (Los `active: true` que aparecen en `instance.resolver.js` — líneas 58, 104, 400, 614… — son sobre `core_FieldDefinition.active`, es decir metadata de campos, **no** el flag de negocio.)

### 4.2 El resultado: fuga por cada consumidor nuevo

```
                        ┌─────────────────────────────────────────┐
                        │  Availability / Attendance / Journal …   │
                        │  registro con active=false (borrado)     │
                        └─────────────────────────────────────────┘
                                        ▲
          ┌─────────────────────────────┼─────────────────────────────┐
          │                             │                             │
   Layout con filtro          Layout SIN filtro            MCP / otro mod / reporte
   active=true  ✅ oculto      ❌ lo muestra                ❌ lo muestra
   (instructor_view,          (cualquier layout            (listInstances sin
    responsible_calendar)      nuevo que lo olvide)         el filtro → fuga)
```

Cada punto de lectura es responsable de recordar el filtro. Basta **un** consumidor que lo omita para que el "borrado" reaparezca. Esto es exactamente lo que la QA del 2026-07-06 llamó *"no vas a saber que esos elementos están borrados"*.

### 4.3 Efecto sobre cascadas

Si un padre se borra en cascada y el hijo usa soft-delete, la cascada correcta debería ser **lógica** (marcar los hijos `active=false`), no física. Como el flag es per-mod y core no lo conoce, una cascada genérica de core **no sabría** marcar el flag → inconsistencia. (SP6: `resumen-reunion.html:685`.)

---

## 5. Pros y contras del approach

### Pros
- **Trazabilidad:** preserva el historial (asistencias, journals, disponibilidad pasada) — requisito real de reportería.
- **Reversible:** `reactivate` es trivial; un hard delete no.
- **Cero dependencia de core:** el mod avanzó solo, sin esperar una capacidad de plataforma.
- **Rápido de implementar** por objeto (un flag + un filtro).
- **Permite invariantes de dominio ricas:** ej. `createValidated` inactiva solapes en una sola transacción.

### Contras
- **Fuga de visibilidad (el gran problema):** la lectura genérica de core no filtra; cada consumidor debe recordar el filtro. Falla por omisión, no por error explícito → difícil de detectar.
- **No escala cross-mod / cross-consumer:** MCP, otros mods y reportería genérica ven los "borrados". Un dato borrado no es realmente borrado a nivel plataforma.
- **Sin convención:** `active` vs `isActive`, mutation custom vs workflow vs nada. Cada objeto reinventa el patrón.
- **Filtro disperso y frágil:** vive en N archivos de layout; agregar un layout nuevo = olvido probable.
- **Cascada rota:** una cascada de borrado genérica no puede aplicar borrado lógico a los hijos.
- **Semántica mezclada:** el mismo flag significa "borrado" en unos objetos y "deshabilitado de catálogo" en otros — confunde a cualquier consumidor genérico.

---

## 6. Validación contra los análisis de SP6

| Afirmación de SP6 | Fuente SP6 | Veredicto vs código |
|-------------------|-----------|---------------------|
| "Engagement implementó soft delete con `active`" | `reunion-qa-2026-07-06.md:50` | ✅ **Confirmado** — `Availability.active` + `softDeleteInstructorAvailability`. |
| "flag `active`, no escalable, con fuga; el `listInstances` genérico no filtra" | `reunion-qa-2026-07-06.md:50`, `analisis-por-punto.md:147` | ✅ **Confirmado** — `listInstances` solo aplica `layoutConfig.filters`; filtro por-layout inconsistente. |
| "soft-delete ad-hoc por mod: `softDeleteInstructorAvailability` usa un `active` boolean propio" | `analisis-por-punto.md:146-147` | ✅ **Confirmado** — mutations en `instructor-availability.resolver.js`. |
| "Un soft-delete confiable exige core; solo-mod = techo duro" | `analisis-core-vs-mod.md:108-123` | ✅ **Confirmado** — la fuga es estructural: nace de que core lee sin conocer el flag. |
| Referencia a la ubicación `typeDefs/mods.js:800` | `analisis-por-punto.md:147` | ⚠️ **Ajuste menor** — hoy las mutations están en `mods.js:841-866` (el archivo creció). |
| Precedente de soft-delete en Engagement = **solo `Availability`** | `analisis-por-punto.md:146-147` | ❌ **Incompleto** — hay **4 objetos con soft-delete real** (`Availability`, `Attendance`, `Journal`, `FormTemplate`) + 2 con flag de catálogo. |

**Conclusión de la validación:** SP6 acertó en el diagnóstico y en la decisión (**hard delete en SP6, soft-delete genérico → capacidad core futura**, `reunion-qa-2026-07-06.md:32-34`). El único ajuste es de **alcance de la evidencia**: el patrón está mucho más extendido de lo que SP6 documentó, lo que **refuerza** — no debilita — el argumento de llevar el soft-delete a core.

---

## 7. Recomendación

1. **Incorporar el hallazgo ampliado al análisis del Punto 5:** el soft-delete ad-hoc no es un caso aislado de `Availability`, son 4 objetos → la deuda es sistémica.
2. **Mantener la decisión de SP6** (hard delete ahora; soft-delete genérico en core después).
3. **Cuando core implemente soft-delete genérico**, la forma correcta es un filtro por defecto en la lectura genérica (`deletedAt IS NULL` / `active = true` inyectado en `listInstances`), declarado a nivel `core_ObjectDefinition` — no repetido en cada layout. Eso convierte el borrado lógico en capacidad de plataforma y elimina la fuga de raíz.

---

*Evidencia recogida del código en `Workspace/uplanner/up1` (rutas relativas desde este archivo). Fuentes SP6 en la misma carpeta: `analisis-por-punto.md`, `reunion-qa-2026-07-06.md`, `analisis-core-vs-mod.md`, `resumen-reunion.html`.*
