---
id: DOC-kb-sp5-SP5-issues
project: up1
type: doc
---

# SP5 — Issues abiertos para el team up1

> Registro de bloqueos de plataforma detectados durante SP5 que **requieren decisión / cambio del core** (object-manager o layout). No son bugs del mod: son límites de capacidad que impiden completar un requisito mod-only. Cada issue trae contexto completo para que el team analice sin re-investigar.

---

## ISSUE-SP5-01 — El `RecordList` no puede mostrar columnas derivadas (no-persistidas)

**Detectado en:** MC-07 / TICKET-087 / UPONE-1350 (pestaña "Líneas de formación" del Curriculum).
**Fecha:** 2026-07-01.
**Severidad:** media — bloquea la superficie visual de un requisito; el backend quedó listo, pero no hay forma mod-only de mostrarlo.
**Estado:** abierto — requiere decisión del team up1 (toca core: object-manager y/o layout).

### Qué se quería hacer

En la pestaña "Líneas de formación" (un `record-list` de `requirementCategory` embebido en el detalle del Curriculum), mostrar por cada línea, además de nombre/código/mín/máx:

- **Créditos actuales** (`currentCredits`) — suma de créditos efectivos de los `planEntry` de la línea.
- **Obligatorias** (`mandatoryCount`) — conteo de entries con `blockId == null`.
- **Electivas** (`electiveCount`) — conteo de entries con `blockId != null`.
- **Estado** (`creditStatus`) — `under` (Incompleta) / `ok` (En rango) / `over` (Excedida), comparando `currentCredits` contra `[minCredits, maxCredits]`. Aviso no bloqueante cuando los créditos quedan fuera de rango.

Los cuatro son **valores derivados en lectura** (no se persisten): el backend los calcula y los agrega a `item.data` en el override de `listInstances`/`getInstance` del mod (`curriculum-read.resolver.js`, `enrichRequirementCategoryRows`). Esto ya está implementado y testeado (TICKET-087 S1, 1113 tests verdes).

### Por qué NO se puede (con lo que hay hoy)

El `RecordList` **filtra las columnas configuradas contra los campos reales del objeto** y descarta las que no correspondan a un campo declarado:

- `layout/src/composables/useColumnConfiguration.ts:149-156` (PRIORITY 2):
  ```ts
  determinedColumns = initialColumns
    .filter(col => availableFields.value.some(f => f.name === col.key))  // ← descarta columnas cuyo key no es campo real
  ```
  Comentario en el código: *"drops columns whose underlying field isn't in the readable set"*.
- `availableFields` se puebla desde el query GraphQL **`getObjectFields`** (`layout/src/layouts/RecordList.vue:5981, 6066`).
- `getObjectFields` (`object-manager/src/graphql/resolvers/objectDefinition.resolver.js:83`) lee de **`prisma.core_FieldDefinition`** (con fallback al JSON schema del objeto). `core_FieldDefinition` solo contiene **campos declarados** del objeto (propiedades → codegen → columna Prisma **persistida** + FieldDefinition).

**Conclusión:** un campo aparece en `availableFields` **solo si es una propiedad declarada/persistida** del objeto. No existe un mecanismo de "campo virtual / computed / no-persistido". Por eso los derivados (`currentCredits`, `mandatoryCount`, `electiveCount`, `creditStatus`) se descartan y **no se renderiza ninguna** de esas columnas. Esto afecta también a `currentCredits`, que estaba declarado en el config del layout desde antes de MC-07 pero **nunca se mostró** por la misma razón.

> Nota relacionada: el `record-list` en modo **tabla** tampoco soporta color/badge condicional por celda (solo `valueLabels` texto; el color existe solo en modo `card` vía `card.badges[]`). Ver `RecordList.vue:5284-5288` (valueLabels) y `:6687-6692` (card badges). No bloqueante para este issue, pero relevante para el indicador de estado con color.

### Cambios necesarios para poder hacerlo (opciones para el team)

1. **Campos virtuales/computed en el modelo (core — object-manager + layout).**
   Permitir declarar en el JSON del objeto un campo con flag `persisted: false` (o `computed: true`) que:
   - se registre en `core_FieldDefinition` (y por ende aparezca en `getObjectFields`/`availableFields`) **sin** generar columna Prisma ni migración;
   - el `RecordList` lo acepte como columna válida.
   Ventaja: reusa el enrichment existente (los valores ya viajan en `item.data`); habilita el caso de forma declarativa y general (sirve a otros mods). Es el cambio más limpio y transversal.

2. **Whitelist de "columnas derivadas" en la config del record-list (core — layout).**
   Permitir en `layoutConfig.columns[]` un flag por columna (ej. `derived: true`) que **exima** a esa columna del filtro contra `availableFields` en `useColumnConfiguration.ts` (y que `tableFields`/`TableCell` la rendericen como texto plano desde `item.data`). Cambio acotado a `layout/`. Menos general que (1) pero suficiente.
   - Complemento opcional: soporte de color/clase condicional por valor en modo **tabla** (hoy solo en card), para el indicador de estado.

3. **Componente custom del mod (mod-only, sin tocar core).**
   Reemplazar el `record-list` de la pestaña por un element del mod tipo `CurriculumLines` (patrón `CurriculumMesh`): consume `requirementCategory` enriquecido y renderiza la tabla con todas las columnas derivadas + el estado con color. No requiere cambios de core, pero **reimplementa** tabla + CRUD (alta/edición/borrado) que hoy da el record-list gratis. Mayor esfuerzo y más superficie a mantener.

### Estado actual dejado por MC-07

- **Backend LISTO** (mergeable): `enrichRequirementCategoryRows` expone `currentCredits`, `mandatoryCount`, `electiveCount`, `creditStatus` en `listInstances`/`getInstance` de `requirementCategory`. Helpers puros `countByCategory` (`deriveElectivity.js`) y `deriveCreditStatus` (`creditRange.js`) con tests (TC-06/07/08). Cualquiera de las 3 opciones de arriba puede consumirlo sin re-derivar.
- **FE:** las columnas derivadas se **removieron** del `record-list` (no renderizaban → config muerta). La pestaña muestra los campos reales (nombre/código/mín/máx). `canDelete: false` (borrado de líneas desactivado por decisión del dev).
- **Referencia de intención:** SPEC-curriculum-design-formation-lines (REQ-01, REQ-05) + maqueta UPONE-1272 (597–684).

### Recomendación

Opción **(1)** o **(2)** — habilitar campos derivados/virtuales en el record-list — desbloquea este caso Y cualquier futuro campo calculado en listas (patrón recurrente en el mod: `effectiveCredits`, `isElective`, etc.). El backend ya está preparado. La opción (3) queda como salida mod-only si el team prefiere no tocar core en el corto plazo (candidata a MC-08).
