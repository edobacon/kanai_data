---
id: DECISION-017-curriculum-v1-v2-convergence
project: up1
type: decision
module: curriculum-design
tags:
  - curriculum
  - multi-tenant
  - data-model
  - migration
  - model-v2
  - tenant-override
---

# Unificar `Curriculum` en un solo objeto canónico v2 para UPU (vía reform del mod + reseed en dev), en lugar de un objeto paralelo o de convergencia in-place

> **Decision outcome vigente (2026-06-16): Opción F — dev reset (reform del mod + reseed).** El cuerpo conserva el análisis completo de A/B/C/D/E que llevó hasta acá; F está al final de "Considered options" y en "Decision outcome". E/A quedan como fallback si aparece data viva.

## Context and problem statement

### El conflicto

El ticket TICKET-063 (UPONE-1268) diseñó en el mod `curriculum-design` un objeto `Curriculum` model-v2: un contenedor curricular tipado (RecordTypes `Plan` y `Minor`), con owner polimórfico (programa académico o institución) y soporte de versionado (cadena `previousVersionId`). Este objeto habilita el roadmap de UPONE-1270 (clonar/versionar planes).

Al validar el diseño contra el entorno real del tenant UPU se descubrió un conflicto: **UPU ya tiene un objeto `Curriculum` preexistente**, de modelo v1 (career-based), ubicado en `object-manager/objects/tenants/UPU/Base/curriculum.json`. Ese objeto fue migrado en el commit `32d6b25 "Nueva versión de objetos migrados"` y describe un modelo distinto: "plan de estudios de una carrera académica", anclado a `Career` mediante FK.

### Cómo el override de tenant produce el eclipse

En up1, los objetos definidos a nivel de tenant **reemplazan totalmente** (no hacen merge) a los del Base global. El mecanismo está en `object-manager/src/services/fileParsing.js:83`: los objetos se cargan en un `Map` keyed por `filename`, y el archivo del tenant pisa al del Base que comparte nombre. No hay merge de campos, no hay deep-merge, no hay `extends`. El último en cargarse (el del tenant) gana entero.

Consecuencia directa: el GraphQL servido a UPU expone el `Curriculum` v1 (career-based) y **eclipsa por completo** el `Curriculum` v2 del mod. El objeto diseñado en TICKET-063 nunca llega a UPU mientras exista el override del tenant. No es un bug de codegen ni de naming: es el comportamiento esperado del override total, aplicado a dos objetos que colisionan en nombre con semánticas distintas.

### Por qué la extensión `ext__` no resuelve el problema

`ext__uplanner__curriculum` es una tabla satélite 1:1 autogenerada que agrega columnas sueltas en una tabla separada, relacionada por FK al registro base. No puede albergar lo que v2 necesita estructuralmente:

- `recordType` como **discriminador** de polimorfismo (debe vivir en la tabla base para que el ORM resuelva el tipo del registro).
- `ownerType` / `ownerId` como **FK polimórfica** (la resolución polimórfica exige las columnas en la tabla base).
- `@@unique([previousVersionId, version])` como **constraint compuesto** (un unique multi-columna no se puede declarar cruzando dos tablas).

Además, no existe mecanismo `extends` / `mergeWith` en el codegen. La extensión satélite sirve para "campos extra de un tenant sobre un objeto base estable", no para cambiar el modelo del objeto.

### Por qué hay que modificar directo el objeto del tenant

Dado que el override de tenant es total (replace), la **única** vía para que el modelo v2 aplique en UPU es editar el archivo del propio tenant: `object-manager/objects/tenants/UPU/Base/curriculum.json`. No se puede lograr desde el mod (Base) — quedaría eclipsado — ni desde `ext__` — no soporta la estructura. Esto tiene implicancias de gobernanza (es un archivo `layer:core/tenant`, merge-gated por RULE-dev-004) que se tratan en Consequences.

## Estado actual del objeto v1

Objeto preexistente en `object-manager/objects/tenants/UPU/Base/curriculum.json`. Modelo career-centric: el ancla del dominio es la carrera (`careerId` FK → `Career.publicId`).

| Campo | Tipo | Restricciones | Semántica | Datos vivos / uso probable |
|-------|------|---------------|-----------|----------------------------|
| `publicId` | string | unique, autoComplete template `{careerId}_{name}`, uppercase | Identificador público legible del plan | **Sí** — clave de negocio referenciada externamente; alto riesgo de romper si cambia |
| `name` | string | required, trim | Nombre del plan de estudios | **Sí** — campo central, presente en todas las filas |
| `versionCode` | string | — | Código de versión textual del plan | Probable — versionado informal pre-v2 |
| `isCurrent` | boolean | — | Marca el plan vigente de la carrera | Probable — usado por consumidores para resolver "el plan actual" |
| `totalCredits` | number | validation `>0` | Créditos totales del plan | Probable — dato académico estable |
| `modality` | string | lowercase | Modalidad (presencial/online/etc.) | Probable |
| `careerId` | string | required, FK → `Career.publicId`, validación referencial | Carrera dueña del plan | **Sí** — FK requerida; toda fila la tiene poblada |
| `recordType` | string | — | Discriminador genérico (no usado funcionalmente) | No — string libre, sin enum ni lógica asociada |
| required | — | `[name, careerId]` | — | — |

Lo creó el commit de migración `32d6b25 "Nueva versión de objetos migrados"`. El override de tenant lo hace ganar sobre cualquier `Curriculum` del Base por el `Map` keyed por filename de `fileParsing.js:83`.

Observación clave para la convergencia: **v1 ya contiene `totalCredits`, `name` y un `recordType` (como string libre)**. Esos tres campos solapan conceptualmente con v2, lo que reduce la superficie real del cambio y refuerza que "convergencia" no significa "v1 + v2 yuxtapuestos" sino "un modelo único que reconcilia los solapamientos".

## Decision drivers

Ordenados por peso:

1. **Concentración de datos del dominio (driver central)**. Un solo objeto `Curriculum` mantiene todos los planes —career-based y model-v2— en una sola tabla, una sola entrada GraphQL, un solo punto de consulta. Crear un objeto paralelo dispersaría el dominio "currículo" en dos entidades que compiten, fragmentando queries, reporting y la mental model del equipo.
2. **Datos vivos del v1 a preservar**. UPU tiene filas reales con `careerId`, `publicId`, `name`, `totalCredits`, `modality`, `versionCode`, `isCurrent` poblados. Cualquier opción debe conservarlos sin pérdida.
3. **Dirección model-v2**. El roadmap (UPONE-1270 versionado/clonado, polimorfismo de owner, tipado Plan/Minor) requiere las capacidades de v2. La decisión debe habilitarlas, no postergarlas.
4. **Minimizar la superficie de objetos del dominio**. Menos objetos = menos naming colisiones, menos duplicación de lógica de validación, menos confusión para integradores.
5. **Mantenibilidad**. Reconciliar solapamientos (`totalCredits`, `name`, `recordType`) en un modelo único evita que dos objetos deriven y se contradigan con el tiempo.
6. **Reversibilidad**. La migración debe ser no destructiva (sin `--accept-data-loss`) e idempotente, de modo que un rollback sea posible mientras dure la estabilización.

## Considered options

| # | Option | Description |
|---|--------|-------------|
| A | **Convergencia ampliando v1** | Editar `objects/tenants/UPU/Base/curriculum.json` para conservar los campos vivos de v1 y agregar los campos de v2, reconciliando solapamientos. Un solo objeto `Curriculum` que sirve ambos modelos. |
| B | Reemplazo total v1 → v2 con migración | Sustituir el objeto v1 por el v2 puro y migrar las filas existentes mapeándolas al esquema v2. |
| C | Objeto nuevo paralelo (`StudyPlan` / `CurriculumPlan`) | Dejar `Curriculum` v1 intacto y crear un segundo objeto model-v2 con otro nombre para los casos nuevos. |
| D | Extensión satélite `ext__` (meter v2 en el satélite) | Mantener v1 y agregar los campos de v2 en la tabla satélite `ext__uplanner__curriculum`. |
| E | **Quitar el override + extender (alternativa si hay data viva)** | Eliminar el override total v1 de UPU (UPU hereda el Base v2 **canónico**) y mover los campos legacy de UPU (`careerId`, `publicId`, `isCurrent`, `versionCode`, `modality`) a `tenants/UPU/Extended/ext__uplanner__curriculum.json`. Migrar los datos (split base/satélite). |
| **F** | **Dev reset: reform del mod + reseed (RECOMENDADA, 2026-06-16)** | El objeto lo autora el mod (modificable + re-sync); la data de UPU es desechable en dev (el seed no siembra Curriculum). Reformar el objeto del mod a lo necesario (v2 + cláusulas faltantes) → seed v2-nativo → **borrar** el override de UPU → sync → seed. Sin backfill ni extensión. |

### Option A: Convergencia ampliando v1 — ELEGIDA

- **Pro**: Un solo objeto `Curriculum`. Máxima concentración de datos: todos los planes en una tabla, una entrada GraphQL, un punto de consulta (driver 1).
- **Pro**: Conserva todos los datos vivos de v1 sin moverlos de tabla (driver 2). Los solapamientos (`totalCredits`, `name`, `recordType`) se reconcilian en vez de duplicarse.
- **Pro**: Habilita v2 completo (polimorfismo, versioning, tipado) y desbloquea UPONE-1270 (driver 3).
- **Pro**: No agrega objetos al dominio (driver 4). No introduce naming nuevo que los consumidores deban aprender.
- **Pro**: Migración aditiva (backfill de columnas nuevas), no destructiva — reversible (driver 6).
- **Con**: Exige editar un archivo del tenant (`layer:core/tenant`), fuera de `mods/`, merge-gated por RULE-dev-004. Requiere coordinación con el equipo.
- **Con**: La reconciliación de solapamientos (`recordType` string → enum, rol de `careerId` frente al owner polimórfico) requiere decisiones explícitas de mapeo y backfill.
- **Veredicto**: Elegida. Es la única opción que satisface el driver central (concentración) sin sacrificar datos vivos ni la dirección v2. Los contras son de coordinación y de diseño de mapeo, no de viabilidad.

### Option B: Reemplazo total v1 → v2 con migración

- **Pro**: Resultado final es el v2 "limpio", sin arrastrar el legado de v1.
- **Pro**: También logra un solo objeto (no dispersa).
- **Con**: Más riesgoso para los datos vivos: reemplazar el esquema implica re-mapear todas las filas de una, con ventana de inconsistencia. Mayor probabilidad de necesitar pasos destructivos.
- **Con**: Pierde campos v1 que v2 no contempla nativamente (p. ej. `publicId` con su template, `isCurrent`, `modality`, `versionCode`) salvo que se re-incorporen — con lo cual converge de facto en la Option A, pero por un camino más abrupto.
- **Veredicto**: Descartada. Es A pero con más riesgo y sin upside: si igual hay que conservar los campos v1 con datos, conviene ampliarlos in-place (A) en vez de reemplazar y re-agregar.

### Option C: Objeto nuevo paralelo (`StudyPlan` / `CurriculumPlan`)

- **Pro**: La más "limpia" de implementar: el objeto nuevo nace con el esquema v2 puro, sin reconciliar nada, sin tocar el archivo del tenant ni RULE-dev-004.
- **Pro**: Cero riesgo sobre los datos v1 existentes (no se tocan).
- **Con (decisivo)**: **Dispersa el dominio**. Aparecen dos objetos "currículo" similares compitiendo en la DB y en GraphQL. Los consumidores deben decidir caso a caso a cuál consultar; el reporting debe unir ambos; la lógica de validación se duplica y diverge.
- **Con**: Fragmenta los datos: planes career-based en `Curriculum`, planes nuevos en `StudyPlan`. Una consulta "todos los planes de la institución" cruza dos tablas.
- **Con**: Deuda permanente. La "limpieza" inicial se paga con confusión y duplicación durante toda la vida del dominio.
- **Veredicto**: Descartada. Optimiza la facilidad de implementación a costa del driver central (concentración). Ver la sección de defensa explícita al final.

### Option D: Extensión satélite `ext__`

- **Pro**: No toca el objeto del tenant; usa el mecanismo de extensión existente.
- **Con (bloqueante)**: Técnicamente inviable para v2. La tabla satélite no puede albergar el discriminador `recordType`, la FK polimórfica `ownerType`/`ownerId`, ni el constraint compuesto `@@unique([previousVersionId, version])` — esos deben estar en la tabla base. No existe `extends`/`mergeWith` en el codegen.
- **Veredicto**: Descartada por inviabilidad técnica, no por preferencia.

### Option E: Quitar el override + extender — RECOMENDADA (agregada 2026-06-16)

Reframing del problema (descubierto al verificar capas): el conflicto **no** es "dos modelos a converger en un objeto de tenant", sino que **UPU redefine en su capa de tenant un objeto que ya existe canónicamente en Base**. Dato decisivo: **solo UPU tiene override** de `Curriculum` (y de `Career`); el resto de tenants ya hereda el Base v2 o no usa el objeto. El v2 del mod **ya es el canónico para todos menos UPU**.

La corrección natural en up1 no es redefinir (override total = replace), sino **extender**: eliminar el `curriculum.json` v1 de UPU para que herede el Base v2, y mover los campos legacy de UPU a `tenants/UPU/Extended/ext__uplanner__curriculum.json`.

- **Pro**: **Una sola fuente canónica** (mod → Base v2) que sirve a todos los tenants, UPU incluido. No deja una segunda definición full divergente (a diferencia de A).
- **Pro**: Aísla el legacy de UPU en una extensión delgada — el uso previsto del mecanismo `ext__`. Elimina el eclipse: el v2 del mod **realmente llega** a UPU.
- **Pro**: Lo estructural (discriminador `recordType`, FK polimórfica `ownerType`/`ownerId`, unique compuesto `[previousVersionId, version]`) **ya está en Base** — no hay que agregar nada; hay que dejar de ocultarlo.
- **Pro**: Preserva los datos vivos (a diferencia de B′/B): legacy → satélite, estructural → base, `totalCredits` → `rt__Plan`. Verificado que el codegen **soporta FK y enums en extensiones** (`generatePrismaSchema.js:1982-2006`).
- **Pro**: Blast radius **confinado a UPU** (ningún otro tenant tiene override; ningún FK entrante a `Curriculum` salvo self-ref).
- **Con / sub-decisión (H5)**: el codegen **no emite `@unique` para campos de extensión** (solo en paths del modelo base). `publicId` movido a `ext__` **perdería su unicidad a nivel DB**. `autoComplete` no se procesa server-side (no se pierde nada por ahí). Requiere decidir cómo preservar la unicidad de `publicId` (ver sub-decisión 5 abajo).
- **Con**: comparte con A los bloqueantes de dominio H1 (owner) y H2 (`code`).
- **Veredicto**: Buena opción si hay **data viva** que preservar, pero **desplazada por F** cuando la data es desechable (dev). Queda como alternativa.

### Option F: Dev reset (reform del mod + reseed) — RECOMENDADA (agregada 2026-06-16, desplaza a E)

Reframing definitivo, habilitado por dos hechos verificados (ver learn L1 de TICKET-068):

- El objeto `Curriculum` lo **autora el mod** (`mods/curriculum-design/objects/Curriculum.json`); el sync de up1 lo propaga a `business/Base`. Es **modificable desde el mod**, no un objeto core inmutable.
- La data de Curriculum en UPU es **desechable en dev**: el seed `prisma/UPU/seed.js` solo registra el tipo (línea 30, junto a Career/Course/Person), **no siembra filas**. No hay datos vivos que preservar.

Proceso: reformar el objeto del mod a lo necesario (v2 + cláusulas faltantes) → armar seed v2-nativo → **borrar** el override de UPU → nuevo sync (UPU hereda Base v2) → seed.

- **Pro**: la más simple. Sin convergencia, sin backfill, sin extensión, sin protocolo de pérdida de datos.
- **Pro**: **disuelve H1, H2 y H4** — eran todos problemas de backfill/migración; al sembrar v2-nativo no existen.
- **Pro**: un solo objeto canónico (mod→Base) sirve a todos; no perpetúa un override divergente (mejor que A) ni requiere satélite + unicidad por dominio (mejor que E).
- **Pro**: toque core/tenant mínimo — **eliminar** un archivo (el override), no editarlo.
- **Con**: aplicable **solo** porque la data es desechable. Con datos vivos (prod) volvería a aplicar E/A.
- **Con**: la baja del override sigue siendo core/tenant (coordinar en `develop`, RULE-dev-004).
- **Veredicto**: **Recomendada** mientras la data sea desechable.

## Decision outcome

**Chosen option (recomendación del architect, 2026-06-16 — la baja del override sigue requiriendo coordinación del equipo en `develop`)**: **F — Dev reset (reform del mod + reseed)**, desplazando a E.

**Justification**: F es viable y preferible por dos hechos: (1) el objeto es **mod-autorado** → modificable y re-sincronizable, no hay que "converger" como si fuera externo; (2) la data de UPU es **desechable en dev** → no hay nada que preservar, lo que **disuelve los bloqueantes de backfill H1/H2/H4**. Frente a E (extender) y A (converger), F evita la extensión, el backfill, la unicidad-por-dominio de `publicId` (H5) y el override divergente: deja el canónico mod→Base como única fuente y reseed v2-nativo.

F queda condicionada a: (a) confirmar que **ningún dato** de Curriculum en UPU debe preservarse, y (b) definir la lista final de cláusulas a agregar al objeto del mod (incl. evaluar `careerId`, UPU-específico). **Fallback**: si apareciera data viva o se confirmara que hay que preservar campos legacy, se vuelve a **E** (extender); **A** (converger) queda como último respaldo.

**Nota**: el mapeo de campos detallado de abajo sigue siendo la referencia de qué reconcilia cada campo; bajo F, los campos elegidos se agregan directo al objeto del mod (no a un override ni a un satélite) y los valores se producen en el seed, no por backfill.

### Mapeo de campos detallado v1 ↔ v2

**Campos de v1 que se conservan tal cual (datos vivos):**

| Campo | Tratamiento en el objeto convergido |
|-------|-------------------------------------|
| `publicId` | Se conserva. Clave de negocio externa; cambiarla rompería integraciones. Sigue siendo unique con su template `{careerId}_{name}`. |
| `name` | Se conserva. **Solapamiento con v2** (v2 también tiene `name`) → es el mismo campo, no se duplica. |
| `versionCode` | Se conserva como dato textual legacy. Coexiste con el `versionLabel` de v2 (ver reconciliación). |
| `isCurrent` | Se conserva. Marca legacy del plan vigente por carrera; coexiste con `status` de v2 durante la transición. |
| `totalCredits` | Se conserva. **Solapamiento con v2** (campo temporal del RecordType `Plan`) → mismo campo, no se duplica. Ver reconciliación. |
| `modality` | Se conserva. v2 no lo contempla nativamente; se mantiene como atributo del plan. |
| `careerId` | Se conserva. **Reconciliado** con el owner polimórfico de v2 (ver abajo). |

**Campos de v2 que se agregan (nuevos en UPU):**

| Campo | Tratamiento |
|-------|-------------|
| `code` | Se agrega. Código del plan, no único global (distinto de `publicId`). |
| `ownerType` | Se agrega. Enum `AcademicProgram | Institution`. Discriminador del owner polimórfico. |
| `ownerId` | Se agrega. FK polimórfica al owner. Backfill desde `careerId` (ver reconciliación + migración). |
| `institutionId` | Se agrega. FK → `Institution`. |
| `appearsInDiploma` | Se agrega. Boolean. Default a definir (sugerido `false`) en backfill. |
| `status` | Se agrega. Enum `Draft | Active | Archived`. Backfill derivado de `isCurrent` (ver migración). |
| `version` | Se agrega. Int. Backfill = `1` para filas existentes. |
| `versionLabel` | Se agrega. Etiqueta de versión legible; coexiste con `versionCode` legacy. |
| `previousVersionId` | Se agrega. FK reflexiva (cadena de versión). Null para filas existentes (raíz de cadena). |
| `externalId` | Se agrega. Identificador externo. |
| RecordTypes `Plan` / `Minor` | Se agregan. `Plan` con campos temporales (progression, totalCredits, totalPeriods, periodType, rotationConfig); `Minor` sin campos. |
| `uniqueConstraints` | Se agrega `[[previousVersionId, version]]`. |
| bloque versioning | Se agrega: `linkageField: previousVersionId`, `versionStrategy: increment`, `requiredCapability: curriculum:version`. |

**Campos reconciliados (solapamiento v1/v2 que requiere decisión explícita):**

| Campo | Reconciliación propuesta |
|-------|--------------------------|
| `recordType` | v1 lo tiene como **string libre no usado**; v2 lo necesita como **enum discriminador real** (`Plan | Minor`). Se **promueve string → enum**. Backfill: todas las filas v1 son planes de carrera → `recordType = Plan`. (Decisión a confirmar por el equipo: ¿alguna fila v1 representa un minor? Por defecto, no.) |
| `totalCredits` | Existe en v1 (campo plano) y en v2 (campo temporal del RecordType `Plan`). Se **unifica**: pasa a ser campo temporal de `Plan`. Como el backfill marca todas las filas v1 como `Plan`, el dato se conserva 1:1 sin migración de valores. |
| `name` | Idéntico en ambos. **No se duplica**; es un único campo. |
| `careerId` ↔ `ownerType`/`ownerId` | v1 ancla en `Career` (FK directa); v2 usa owner polimórfico. **Decisión a confirmar por el equipo** entre dos sub-opciones: (C1) mapear `careerId` → `ownerType = AcademicProgram`, `ownerId = <programa derivado de la carrera>`, conservando `careerId` como atributo legacy de solo lectura; o (C2) introducir `ownerType = Career` si el modelo de owner admite carreras directamente. La recomendación del architect es **C1** (alinea con la dirección program-centric de v2 y no expande el enum de owner), pero es una decisión de dominio que el equipo debe ratificar antes de ejecutar. En ambos casos `careerId` se conserva poblado para no perder el ancla histórico. |
| `versionCode` ↔ `versionLabel` | Coexisten durante la transición: `versionCode` es el texto legacy, `versionLabel` el nuevo. No se fusionan automáticamente; el backfill puede copiar `versionCode` → `versionLabel` si el equipo lo aprueba. |
| `isCurrent` ↔ `status` | `isCurrent` legacy se mapea a `status`: `isCurrent = true → status = Active`; `isCurrent = false → status = Draft` (o `Archived`, decisión del equipo). Se conserva `isCurrent` durante la transición para no romper consumidores que lo lean. |

### Esquema del objeto convergido (lista de campos final)

`Curriculum` (un solo objeto, en `objects/tenants/UPU/Base/curriculum.json`):

- **Identidad**: `publicId` (unique, template, uppercase), `code`, `externalId`
- **Descriptivos**: `name` (required, trim), `modality` (lowercase), `appearsInDiploma` (bool)
- **Tipado / polimorfismo**: `recordType` (enum `Plan | Minor`, discriminador), `ownerType` (enum `AcademicProgram | Institution`), `ownerId` (FK polimórfica), `institutionId` (FK → Institution)
- **Ancla legacy conservado**: `careerId` (FK → Career.publicId, atributo legacy de solo lectura tras la reconciliación)
- **Estado / versionado**: `status` (enum `Draft | Active | Archived`), `version` (int), `versionLabel`, `versionCode` (legacy), `isCurrent` (bool, legacy), `previousVersionId` (FK reflexiva)
- **Constraints**: unique en `publicId`; `uniqueConstraints: [[previousVersionId, version]]`
- **Versioning**: `linkageField: previousVersionId`, `versionStrategy: increment`, `requiredCapability: curriculum:version`
- **RecordTypes**:
  - `Plan`: campos temporales `progression`, `totalCredits` (validation `>0`), `totalPeriods`, `periodType`, `rotationConfig`
  - `Minor`: sin campos propios
- **required**: `[name, careerId]` se revisa — `name` se mantiene required; `careerId` puede pasar a opcional una vez que el owner polimórfico sea la fuente de verdad (decisión del equipo; mantener required durante la transición para no romper validación de filas existentes).

## Plan de migración de datos

Objetivo: ampliar el esquema **aditivamente** y rellenar los campos v2 nuevos para las filas v1 existentes, **sin pérdida de datos y de forma idempotente**.

**Principios:**

- **No destructivo**: prohibido `--accept-data-loss`. Solo se agregan columnas/enums; no se eliminan columnas v1 en esta migración.
- **Idempotente**: el backfill debe poder re-ejecutarse sin duplicar ni sobrescribir valores ya correctos (escribir solo donde el campo nuevo está null / sin setear).
- **Reversible durante estabilización**: como nada se borra, revertir es quitar el uso de los campos v2 (los datos v1 quedan intactos).

**Backfill de filas v1 existentes:**

| Campo nuevo | Valor de backfill | Origen |
|-------------|-------------------|--------|
| `recordType` | `Plan` | Todas las filas v1 son planes de carrera (confirmar ausencia de minors) |
| `ownerType` | `AcademicProgram` | Derivado de `careerId` (sub-opción C1) |
| `ownerId` | programa derivado de `careerId` | Resolución `Career → AcademicProgram` (validar cobertura de la resolución antes de ejecutar) |
| `institutionId` | institución del programa/carrera | Derivado de la jerarquía owner |
| `version` | `1` | Filas existentes son raíz de cadena |
| `previousVersionId` | `null` | Raíz de cadena |
| `status` | `Active` si `isCurrent = true`, si no `Draft` (o `Archived`, decisión del equipo) | Derivado de `isCurrent` |
| `versionLabel` | copia de `versionCode` (si el equipo lo aprueba) | `versionCode` legacy |
| `appearsInDiploma` | `false` (default sugerido) | Default |
| `totalCredits` | sin cambios | Ya existe en v1, se conserva como campo de `Plan` |

**Secuencia sugerida:** (1) ampliar el esquema del objeto (columnas/enums aditivos), (2) generar/aplicar la migración aditiva, (3) correr el backfill idempotente, (4) validar (smoke + conteos), (5) en una fase posterior y separada, evaluar la baja de campos legacy (`isCurrent`, `versionCode`, required de `careerId`) una vez confirmado que ningún consumidor depende de ellos.

**Riesgo de cobertura del backfill:** la resolución `careerId → AcademicProgram → Institution` debe cubrir el 100% de las filas. Antes de ejecutar, correr una query de pre-chequeo que liste filas v1 cuya carrera no resuelva a programa/institución, y resolver esos casos manualmente. No ejecutar el backfill con filas sin owner resoluble.

## Consequences

### Positive

- **Un solo objeto `Curriculum`**: datos concentrados, una entrada GraphQL, un punto de consulta. No se dispersa el dominio.
- **Datos vivos de v1 preservados**: `careerId`, `publicId`, `name`, `totalCredits`, `modality`, `versionCode`, `isCurrent` quedan intactos.
- **Model-v2 habilitado en UPU**: polimorfismo de owner, tipado Plan/Minor y versioning operativos.
- **UPONE-1270 desbloqueado**: la cadena `previousVersionId` + `versionStrategy: increment` + `requiredCapability: curriculum:version` permite clonar/versionar.
- **Superficie de objetos mínima**: no se agrega naming nuevo que consumidores deban aprender.

### Negative

- **Edición de un archivo del tenant fuera de `mods/`**: `objects/tenants/UPU/Base/curriculum.json` es `layer:core/tenant`, merge-gated por RULE-dev-004. Requiere aprobación específica y coordinación.
- **Migración de datos**: backfill con dependencia de la resolución `careerId → programa → institución`; introduce un paso operativo con riesgo de cobertura.
- **Coexistencia temporal de campos legacy y v2** (`isCurrent`/`status`, `versionCode`/`versionLabel`): duplicidad transitoria que hay que limpiar en una fase posterior para no dejar deuda.
- **Decisiones de dominio pendientes de ratificación**: mapeo `careerId` → owner (C1 vs C2), valor de `status` para `isCurrent=false`, si `careerId` deja de ser required.

### Mitigations

- **Merge-gate / RULE-dev-004**: presentar este DECISION record como sustento del cambio al tenant; PR aislado solo para `curriculum.json` + migración, revisado por el equipo.
- **Riesgo de cobertura del backfill**: pre-chequeo obligatorio de filas sin owner resoluble antes de ejecutar; backfill idempotente y no destructivo (re-ejecutable).
- **Coexistencia legacy/v2**: planificar una fase posterior y separada para retirar `isCurrent`/`versionCode` y revisar el required de `careerId`, una vez confirmado por propagación (DET-16) que ningún consumidor depende de ellos.
- **Decisiones de dominio**: ratificarlas con el equipo en la aprobación de este record, antes de ejecutar el backfill.

## Hallazgos de revisión técnica (2026-06-16)

> Registrados durante la revisión previa a la aprobación (TICKET-068), contrastando este record contra los objetos reales (`Curriculum` v1 tenant UPU, `Curriculum` v2 mod, `Career`, `AcademicProgram`). **NO modifican la opción elegida (A)**: son blockers y gaps que el equipo up1 debe resolver al ratificar, antes de que el ticket pueda ejecutarse. Pendientes de decisión del equipo.

### H1 (bloqueante) — No existe resolución `careerId → AcademicProgram`

El backfill `ownerId` desde `careerId` (sub-opción C1 de la decisión de owner) presupone un mapeo `Career → AcademicProgram` que **hoy no existe**:

- `Career` (tenant UPU: `publicId`, `name`, `careerType`, `institutionId` → `Institution.publicId`) no tiene `code` ni FK a `AcademicProgram`.
- `AcademicProgram` (mod: `name`, `code`, `degree`, `modality`, `institutionId` → `Institution.id`, governance/execution units) no tiene `careerId` ni campo espejo a `Career`.
- No hay FK, campo espejo ni tabla de mapeo entre ambos objetos.
- Además, `AcademicProgram` es de facto el **model-v2 de `Career`** (descripciones de dominio equivalentes: ambos "carrera/programa académico"). Por lo tanto la convergencia `Curriculum` v1→v2 arrastra una **dependencia oculta**: la convergencia `Career → AcademicProgram`, que es otra migración sin alcance definido.

Consecuencia: C1 no es ejecutable tal como está redactada (la "validación de cobertura" del plan de migración asume un mecanismo que no existe — es un item `assumed`, no `confirmed`). Alternativa puente sin dependencia, para evaluación del equipo: anclar las filas legacy a `ownerType = Institution`, `ownerId = institutionId` (derivable de `Career.institutionId`), conservando `careerId` como atributo legacy, y diferir el re-anclaje a `AcademicProgram` a la futura convergencia `Career → Program`.

### H2 (gap) — `code` es `required` en v2 y no existe en v1

v2 declara `code` como `not_null` / `required`; v1 no tiene el campo. El plan de migración de DECISION-017 no define el origen del backfill de `code`. El equipo debe decidir su origen (derivar de `versionCode`, de `publicId`, de `name`, u otro) antes de ejecutar; sin esto, las filas v1 no satisfacen el `required` de v2.

### H3 (gap) — `totalCredits` es un movimiento cross-tabla, no aditivo

En v1 `totalCredits` vive en la tabla base de `Curriculum`; en v2 es campo temporal del RecordType `Plan` (tabla satélite `rt__Plan__curriculum`). DECISION-017 afirma que el dato "se conserva 1:1 sin migración de valores" — impreciso: marcar las filas como `recordType = Plan` implica **mover** el valor de la tabla base a la satélite del recordType. Es una migración de datos cross-tabla con su propio riesgo, no un cambio puramente aditivo. Revisar el principio "solo se agregan columnas".

### H4 (gap) — Mismatch de `targetField` en `institutionId`

`Career.institutionId` referencia `Institution.publicId`; `Curriculum` v2 `institutionId` referencia `Institution.id`. El backfill de `institutionId` derivado de la carrera debe reconciliar `publicId` ↔ `id` mediante una resolución intermedia; no es una copia directa de valores.

### H5 (sub-decisión de la Opción E) — `unique` no soportado en campos de extensión; `autoComplete` no es server-side

Verificado en el codegen (`object-manager/src/services/codegen/generatePrismaSchema.js`):

- **`@unique` solo se emite en los paths del modelo base** (líneas 429, 717, 813, 956). El bloque que arma los campos de un modelo extendido (`uniqueNewFields.map`, líneas 2009-2052) genera tipo/enum/default pero **nunca agrega `@unique`**. Por lo tanto, un `publicId` con `unique: true` movido a `ext__uplanner__curriculum` **no obtendría constraint de unicidad a nivel DB** (el flag se ignora en silencio).
- **`autoComplete` no se procesa en ningún módulo** del monorepo (grep vacío en object-manager/src, layout, mods, scripts). No es lógica server-side; moverlo a la extensión no pierde comportamiento existente.

Implicación para la Opción E: hay que decidir cómo preservar la unicidad de `publicId` (clave de negocio externa, template `{careerId}_{name}`). Sub-opciones:

1. **Validación a nivel de dominio** en el resolver del create (precedente: la unicidad por linaje `(institutionId, code)` de UPONE-1270 ya se valida así). `publicId` vive en `ext__` sin unique de DB, pero el resolver rechaza duplicados. **Preferida** — mantiene el aislamiento del legacy en la extensión.
2. **Promover `publicId` a Base** como campo genérico opcional (lo hereda todo tenant). Conserva el `@unique` de DB pero contamina el canónico con un concepto legacy de UPU.
3. **Absorber en `externalId`/`code`** de v2 (ya en Base). Solo si las integraciones externas no referencian `publicId` literalmente — a confirmar con el equipo.

### H6 (hallazgo estructural) — Solo UPU redefine `Curriculum`

Verificado: **UPU es el único tenant con override** de `curriculum.json` (y de `career.json`). El resto (BASEMODEL + DEMO01-10, TEST, UCASMT, UCENG, UCPLN, placeholder) hereda el Base v2 o no tiene modelo `Curriculum`. Consecuencia: el v2 del mod **ya es el canónico para todos menos UPU**, y la corrección de UPU **no afecta a ningún otro tenant**. Este hallazgo es el que hace viable y preferible la Opción E (revertir una redefinición que es excepción de un solo tenant, en vez de perpetuarla vía convergencia).

## Confirmation

Cómo verificar que la convergencia funciona tras implementar:

- **Smoke GraphQL en UPU**: el tipo `Curriculum` servido a UPU expone el esquema v2 convergido — `recordType` (enum), `ownerType`/`ownerId`, `status`, `version`, `previousVersionId`, RecordTypes `Plan`/`Minor` — y a la vez los campos v1 (`careerId`, `publicId`, `totalCredits`, `modality`, `isCurrent`). Confirma que el override del tenant ahora sirve el modelo convergido y no el v1 puro.
- **Integridad de datos v1**: query de conteo antes/después del backfill — mismo número de filas, `careerId`/`publicId`/`name`/`totalCredits` sin cambios. Cero filas con datos v1 perdidos.
- **Cobertura del backfill**: cero filas con `ownerId`/`institutionId` null tras el backfill (toda fila v1 resolvió a owner). `version = 1` y `previousVersionId = null` en todas las filas existentes.
- **Reconciliación correcta**: filas con `isCurrent = true` tienen `status = Active`; todas tienen `recordType = Plan`.
- **UPONE-1270 viable**: ejecutar (en entorno de validación) un clonado/versionado sobre una fila convergida — se crea una nueva versión con `previousVersionId` apuntando a la original, `version` incrementado, y el `uniqueConstraints [[previousVersionId, version]]` se respeta.
- **Sin destrucción**: la migración aplicada no contiene `--accept-data-loss` ni `DROP COLUMN` de campos v1.

## Defensa explícita: convergencia > objeto nuevo

> Esta sección está dirigida a quien apruebe la decisión. El punto de tensión real es A (convergencia) vs C (objeto nuevo paralelo), porque C es la opción que "se siente más limpia de implementar". Aquí está el argumento de por qué esa limpieza es engañosa.

**La trampa de la "limpieza" de C.** Crear `StudyPlan`/`CurriculumPlan` nuevo es más cómodo *en el momento de escribir el código*: nace con el esquema v2 puro, no toca el archivo del tenant, no obliga a reconciliar `recordType`, `totalCredits` ni `careerId`, y no cruza RULE-dev-004. Pero esa comodidad es **local y temporal**. El costo se paga después, y de forma permanente.

**Concentración vs dispersión de datos.** El valor de un dominio de datos está en su concentración: una entidad, una tabla, una fuente de verdad. En el momento en que existen *dos* objetos "currículo" —`Curriculum` (career-based) y `StudyPlan` (v2)— el dominio se fractura:

- **Los consumidores tienen que elegir.** Cada query, cada vista, cada reporte debe decidir "¿esto vive en `Curriculum` o en `StudyPlan`?". Esa decisión se repite en cada punto de integración y se equivoca en alguno.
- **El reporting cruza dos tablas.** "Todos los planes de la institución" deja de ser una query y pasa a ser un UNION con dos esquemas distintos que hay que mantener alineados a mano.
- **La lógica se duplica y diverge.** Validaciones, capabilities, hooks: lo que antes vivía una vez ahora vive dos veces, y con el tiempo las dos copias se contradicen.
- **La mental model se rompe.** Un dominio con dos objetos casi-iguales es un dominio que nadie del equipo entiende del todo. Cada persona nueva tiene que aprender "cuál es cuál y por qué hay dos".

**La convergencia paga el costo una vez, en el lugar correcto.** A concentra todo el esfuerzo difícil —reconciliar solapamientos, migrar datos, coordinar el cambio al tenant— en un único momento controlado, y a cambio deja **un solo objeto** que todos los consumidores siguen usando como antes, ahora más capaz. El esfuerzo de C es menor al inicio pero se distribuye, sin fin, sobre cada consumidor y cada query futura del dominio.

**El factor decisivo:** los datos vivos de v1 ya están en `Curriculum`. C no los mueve — los deja ahí y construye al lado. Eso garantiza la dispersión: el dato histórico vive en un objeto y el dato nuevo en otro, para siempre. A los trae al mismo lugar. La pregunta no es "¿cuál es más fácil de escribir hoy?" sino "¿queremos un dominio currículo o dos?". La respuesta que concentra los datos, minimiza la superficie y no fragmenta a los consumidores es la convergencia.
