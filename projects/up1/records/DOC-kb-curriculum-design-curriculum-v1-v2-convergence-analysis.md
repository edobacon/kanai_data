---
id: DOC-kb-curriculum-design-curriculum-v1-v2-convergence-analysis
project: up1
type: doc
---

# `Curriculum` en UPU: redefinición v1 (tenant) vs canónico v2 (Base) — y por qué la solución es extender, no converger

> **Para**: equipo up1 (core/tenant) + owner de `curriculum-design`.
> **De**: curriculum-design (descubierto en UPONE-1268 / TICKET-063, profundizado en TICKET-068, SP5).
> **Fecha**: 2026-06-16.
> **Estado**: requiere decisión del equipo antes de ejecutar (cambio `layer:core/tenant`, merge-gated por RULE-dev-004).
> **Tipo**: redefinición indebida de un objeto canónico de Base por un override de tenant + drift multi-capa.
> **Decisión asociada (Deckard)**: `DECISION-017-curriculum-v1-v2-convergence` (status: `proposed`) — este análisis **introduce una opción nueva (E)** que la decisión aún no contempla y que parece superior; debe incorporarse.

---

## TL;DR

El objeto **`Curriculum` v2** (tipado `Plan`/`Minor`, owner polimórfico, versionado) es el **canónico**: lo define el mod `curriculum-design`, se sincroniza a `business/Base` y **ya sirve a todos los tenants** — salvo a **UPU**, que tiene un **override total v1** (career-based) preexistente que lo eclipsa.

El problema de fondo, en los términos correctos: **UPU redefine en su capa de tenant un objeto que ya existe canónicamente en Base**. En up1 eso no se hace redefiniendo (override total = replace), sino **extendiendo** (`ext__`). La solución más simple no es "converger dos modelos" sino **dejar de redefinir `Curriculum` en UPU**: eliminar el override v1, que UPU herede el Base v2, y mover los **campos legacy específicos de UPU** (`careerId`, `publicId`, `isCurrent`, `versionCode`, `modality`) a una **extensión de tenant** (`UPU/Extended/ext__uplanner__curriculum.json`).

Esto es viable: el codegen **soporta FK, enums y escalares en extensiones** (verificado). Lo único que va **obligatoriamente en Base** son los campos **estructurales** (discriminador `recordType`, FK polimórfica `ownerType`/`ownerId`, unique compuesto `[previousVersionId, version]`) — y **ya están en Base**. El blast radius es mínimo: **solo UPU se ve afectado**; el resto de tenants ya está en v2 o no usa `Curriculum`.

---

## 1. Estado actual por capa (drift)

Hay **drift entre capas**. Verificado archivo por archivo:

| Capa | Estado | Evidencia |
|------|--------|-----------|
| **Objeto — mod (fuente canónica)** | **v2** | `mods/curriculum-design/objects/Curriculum.json` (commit `3f8c5f0`, UPONE-1268) |
| **Objeto — `business/Base` global** | **v2** (copia del mod por `sync.js`) | `object-manager/objects/business/Base/curriculum.json` — **idéntico** al del mod |
| **Objeto — tenant UPU** | **v1 career-based (override total)** | `object-manager/objects/tenants/UPU/Base/curriculum.json` (commit `32d6b25`) |
| **DB aplicada en UPU** | **v1** | Migración `prisma/UPU/migrations/20260612162525_init/migration.sql` → `CREATE TABLE "Curriculum"` con `publicId, name, versionCode, isCurrent, totalCredits, modality, careerId`. **No** existe tabla `rt__Plan__curriculum`. |
| **`schema.prisma` generado de UPU** | **v2 (drift no aplicado)** | `prisma/UPU/schema.prisma` modelo `Curriculum` = v2; **no coincide** con la migración v1 aplicada. |
| **GraphQL servido a UPU** | **v1** (override + DB v1) | `object-manager/src/services/fileParsing.js:83` |

**Hallazgo central de esta versión** — *solo UPU redefine `Curriculum`*:

| Tenant | Override `curriculum.json` | `Curriculum` en su `schema.prisma` |
|--------|:--:|--|
| **BASEMODEL** | no | v2 (canónico) |
| **UPU** | **sí (v1)** | v2 en schema (drift) / **v1 aplicado en DB** |
| DEMO01–10, TEST, UCASMT, UCENG, UCPLN, placeholder | no | **sin modelo `Curriculum`** (no lo usan aún) |

Es decir: **UPU es el único tenant con override**, y también el único con `career.json` override. `Career` y el modelo career-based son **legacy exclusivo de UPU**. Lo que UPU ejecuta hoy (DB + GraphQL) es **v1**; el `schema.prisma` v2 es drift no aplicado. Antes de ejecutar, **confirmar el esquema GraphQL servido a UPU por introspección** (DET-5 multi-capa: el repo, por el drift, no alcanza).

---

## 2. Qué se tenía antes

El `Curriculum` v1 de UPU lo creó la migración `32d6b25 "Nueva versión de objetos migrados"`. Modelo **career-centric**: ancla en `Career` (`careerId` FK), `publicId` con template `{careerId}_{name}`, `isCurrent`/`versionCode` como versionado informal, `totalCredits`/`modality` como atributos del plan, `recordType` como string libre no usado. **No** soporta tipado Plan/Minor, owner polimórfico ni versionado por cadena — por lo tanto **no habilita** el clonado/versionado del roadmap.

---

## 3. Cómo nos impactó

El mod introdujo el `Curriculum` v2 (UPONE-1268 / TICKET-063): objeto + RecordTypes Plan/Minor + versionado + 4 layouts + i18n. **Quedó canónico en Base y sirve a todos los tenants**, pero **no aplica en UPU** por el override total. Concretamente:

- El **GraphQL de UPU sirve v1**; el v2 del mod **nunca llega** mientras exista el override de UPU.
- TICKET-063 cerró con **alcance parcial**: el smoke end-to-end (S2.T3) y el seed (S3) se **difirieron a TICKET-068**.
- **UPONE-1270 (clonar/versionar) queda bloqueado en UPU**: depende de `previousVersionId` + `versionStrategy` + el unique compuesto de v2, ausentes en el v1 servido.

---

## 4. El principio: no redefinir en tenant lo que existe en Base — extender

En up1, un objeto que ya existe canónicamente en **Base** no debe **redefinirse** en la capa de tenant, porque el override de tenant es **total (replace, no merge)**: el `Map` keyed por `filename` de `fileParsing.js:83` hace que el archivo del tenant **pise entero** al de Base. No hay deep-merge, no hay `extends` a nivel de objeto base. Redefinir = perder todo lo que Base aporta y quedar congelado en una copia divergente.

La forma correcta de que un tenant agregue lo suyo sobre un objeto de Base es **extender** con `Extended/ext__uplanner__<objeto>.json` — un satélite 1:1 que **suma** columnas sin reemplazar el objeto base. Hay precedentes: `tenants/TEST/Extended/ext__uplanner__person.json`, `business/Extended/ext__uplanner__faculty.json`.

UPU hoy **viola este principio**: redefine `Curriculum` (override total v1) en vez de extender el canónico. El v1 nació antes que el v2, así que en su momento no había nada que extender; pero hoy que el canónico v2 existe en Base, la corrección natural es **revertir la redefinición y extender**.

---

## 5. Qué va obligatoriamente en Base (y por qué no se puede extender) vs qué se extiende

### Campos que DEBEN vivir en el objeto Base — y por qué `ext__` no puede albergarlos

Estos son los que hacen de v2 un v2. **Ya están en el Base canónico** (no hay que agregarlos; hay que dejar de ocultarlos tras el override):

| Campo | Por qué no puede ir en `ext__` |
|-------|--------------------------------|
| `recordType` (enum `Plan`/`Minor`) | Es el **discriminador** de RecordType. La polimorfía resuelve el subtipo desde la **columna de la tabla base**; los satélites `rt__Plan__curriculum`/`rt__Minor__curriculum` cuelgan de él. Un discriminador en una tabla satélite no puede gobernar la polimorfía de la tabla base. |
| `ownerType` + `ownerId` (FK polimórfica) | La resolución polimórfica del owner (y el picker condicionado por `ownerType`) exige discriminador + id en la **tabla base**. |
| `previousVersionId` + `version` + `@@unique([previousVersionId, version])` | El **unique compuesto** no puede declararse cruzando dos tablas; la cadena de versión (FK reflexiva a `Curriculum.id`) y su constraint requieren columnas base. |
| `institutionId`, `code` | Scope y clave de la **unicidad por linaje** `(institutionId, code)` de UPONE-1270: deben ser consultables sobre la tabla base, junto al resto del filtro. |
| `status` (enum lifecycle) | Técnicamente es escalar (cabría en `ext__`), pero es parte del ciclo de vida del versionado ("nace Draft"); **se mantiene en Base** por coherencia del modelo canónico. |

### Campos legacy de UPU que SÍ se extienden (van a `ext__uplanner__curriculum` de UPU)

Verificado contra el codegen (`generatePrismaSchema.js:1982-2006` genera FK en extensiones; enums y escalares también):

| Campo v1 | Destino | Soporte en extensión |
|----------|---------|----------------------|
| `careerId` (FK → `Career`) | `ext__` de UPU | ✅ FK soportada (codegen genera columna + relación). Pierde el `required` a nivel base (el satélite 1:1 es opcional respecto del base); aceptable y alineado con "careerId pasa a opcional". |
| `isCurrent` (bool) | `ext__` de UPU | ✅ escalar |
| `versionCode` (string) | `ext__` de UPU | ✅ escalar |
| `modality` (string) | `ext__` de UPU | ✅ escalar |
| `totalCredits` (number) | **`rt__Plan__curriculum`** | En v2 es campo temporal del RecordType `Plan`, no de base ni de `ext__`. |
| `name` | ya en Base v2 | mismo campo, no se duplica |
| `recordType` (string libre v1) | reemplazado por el enum de Base | — |
| `publicId` (unique + autoComplete `{careerId}_{name}`) | `ext__` de UPU **+ unicidad por dominio** | ⚠️ **Verificado (H5)**: el codegen **no emite `@unique` para campos de extensión** (solo en el modelo base, `generatePrismaSchema.js:429/717/813/956`); el bloque de extended (2009-2052) lo ignora. Y `autoComplete` **no se procesa server-side** en ningún módulo. ⇒ `publicId` cabe en `ext__` pero **sin unique de DB**; preservar su unicidad por **validación de dominio en el resolver** (precedente: `(institutionId, code)` de UPONE-1270), o promoverlo a Base. |

**Conclusión del análisis de campos**: lo estructural ya está donde debe (Base). Todo lo legacy de UPU es **extensible** (FK + escalares), con un solo riesgo acotado a verificar (`publicId` unique/autoComplete). No hace falta agregar nada nuevo al Base; hace falta **quitar la redefinición y extender**.

---

## 6. Opciones

| # | Opción | Veredicto |
|---|--------|-----------|
| **E** | **Quitar el override + extender** — eliminar el `curriculum.json` v1 de UPU (UPU hereda Base v2), mover los campos legacy de UPU a `UPU/Extended/ext__uplanner__curriculum.json`, migrar los datos. | **Recomendada (nueva).** Un solo objeto canónico para todos; legacy de UPU aislado en extensión; elimina el eclipse; respeta el principio de la §4. |
| A | **Convergencia ampliando el override** — editar el `curriculum.json` de UPU para que sea v1+v2 en un solo archivo de tenant. | Viable, pero **inferior a E**: mantiene la **redefinición** (UPU conserva un override total que **diverge** del Base con el tiempo). Dos definiciones full a sincronizar a mano para siempre. |
| B′ | **Quitar el override, full v2 sin extensión** — UPU hereda Base v2 y se **descartan/re-mapean** los campos legacy. | Modelo limpio pero **con pérdida de datos** (`careerId`/`publicId`/...). E es B′ **preservando** el legacy en `ext__`. |
| C | **Objeto nuevo paralelo** (`StudyPlan`) | Descartada. Dispersa el dominio en dos objetos "currículo" para siempre. |
| D | **Meter v2 en `ext__`** (extender el v1 con los campos de v2) | Descartada por inviabilidad técnica: `ext__` no puede albergar el discriminador, la FK polimórfica ni el unique compuesto (§5). Es el inverso de E y no funciona. |

### Por qué E es más simple que A (convergencia)

- **Una sola fuente canónica**: con E, el mod/Base v2 es el único modelo, y sirve a **todos** los tenants (UPU incluido). Con A, UPU mantiene un override total que es una **segunda definición full** del objeto, condenada a divergir del Base.
- **Aislamiento del legacy**: E mete lo específico de UPU en una extensión delgada (lo que las extensiones están hechas para hacer). A mezcla legacy + canónico en un mega-objeto de tenant.
- **Sin eclipse**: E hace que el v2 del mod **realmente llegue** a UPU. A deja el v2 del mod eclipsado (UPU usa su copia).
- **Mantenibilidad**: E = baja (un canónico + extensión); A = alta (dos definiciones full sincronizadas a mano).
- **Misma carga de migración**: ambas requieren backfill de los campos v2 y comparten los bloqueantes H1 (owner) y H2 (`code`). E no agrega trabajo de datos respecto de A; cambia *dónde viven* los campos legacy (satélite en E, base-de-tenant en A).

**El costo propio de E** (ya verificado, H5) es que `publicId` no puede conservar su `@unique` en la extensión → su unicidad pasa a **validación de dominio** en el resolver (o se promueve a Base); más la relajación de `careerId` required. Resuelta esa sub-decisión, **E es la opción más simple y sostenible**.

---

## 7. Alcance y efectos

### En alcance (Opción E)
- Eliminar `object-manager/objects/tenants/UPU/Base/curriculum.json` (revertir la redefinición).
- Crear `object-manager/objects/tenants/UPU/Extended/ext__uplanner__curriculum.json` con los campos legacy (`careerId`, `publicId`, `isCurrent`, `versionCode`, `modality`).
- Migración: dividir las filas v1 existentes — columnas estructurales → tabla base `Curriculum` (backfill `recordType`, owner, `status`, `version`, `code`, `institutionId`); legacy → satélite `ext__uplanner__curriculum`; `totalCredits` → `rt__Plan__curriculum`. **Aditiva, idempotente, sin `--accept-data-loss`**.

### Fuera de alcance (fases posteriores)
- Convergencia `Career → AcademicProgram` (dependencia del owner, ver H1).
- Eventual baja de campos legacy de la extensión cuando dejen de usarse.

### Efectos / riesgos
- Cambio `layer:core/tenant` → PR aislado, merge-gated (RULE-dev-004).
- **Drift previo** (§1): generar la migración partiendo del estado **real aplicado** (v1), no del `schema.prisma` drifteado, para evitar DROPs no intencionados. **Revisar el diff de migración antes de aplicar.**
- Verificación pendiente: `publicId` unique/autoComplete en extensión.

### Hallazgos que condicionan la ejecución (revisión técnica 2026-06-16)

| # | Severidad | Hallazgo | ¿E lo resuelve? |
|---|-----------|----------|-----------------|
| **H1** | **Bloqueante** | No existe resolución `careerId → AcademicProgram`. `AcademicProgram` es de facto el model-v2 de `Career` → dependencia oculta de convergencia `Career → AcademicProgram`. Poblar `ownerId`/`ownerType` de las filas legacy no tiene origen determinístico. | **No** — compartido con A. Mitigación: puente `ownerType=Institution`, `ownerId=institutionId` (derivable de `Career.institutionId`), conservando `careerId` en la extensión. |
| **H2** | Gap | `code` es `required` en Base v2 y ausente en v1 — sin origen de backfill. | **No** — compartido con A. Decidir origen (`versionCode`/`publicId`/`name`). |
| **H3** | Gap | `totalCredits` es movimiento cross-tabla (base v1 → `rt__Plan__curriculum`), no aditivo. | E lo encara explícitamente (va a `rt__Plan`). |
| **H4** | Gap | Mismatch `targetField` en `institutionId`: `Career`→`Institution.publicId` vs v2→`Institution.id`. | **No** — requiere resolución intermedia en el backfill. |
| **H5** | Sub-decisión (E) | **Verificado**: el codegen **no soporta `@unique` en campos de extensión** (solo modelo base) y **no procesa `autoComplete`** server-side. `publicId` en `ext__` quedaría sin unique de DB. | Preservar unicidad de `publicId` por **validación de dominio** en el resolver (precedente UPONE-1270), o promover `publicId` a Base. No bloquea E; abre una sub-decisión. |

---

## 8. Blast radius — qué se afecta

Análisis de consumidores de `Curriculum` (FK, layouts, i18n, recordTypes, lógica, seeds, por tenant). **Acotado**:

| Consumidor | ¿Afectado? | Detalle |
|-----------|-----------|---------|
| **Otros tenants** | **No** | **Solo UPU tiene override.** El resto ya está en Base v2 o no usa `Curriculum`. La corrección de UPU **no toca** a ningún otro tenant. |
| **FK de otros objetos hacia `Curriculum`** | **No** | Ningún objeto referencia `Curriculum` por FK, salvo su auto-referencia `previousVersionId`. Sin grafo entrante que romper. |
| **Base / canónico v2** | **No** (E no lo toca) | E no modifica el objeto del mod/Base; solo deja de eclipsarlo en UPU. (A sí mantendría una copia divergente.) |
| **Layouts / i18n del mod** | Sí (se habilitan) | 4 layouts `default_Curriculum_*` + `es_CL@Curriculum.json` ya son v2 → al heredar Base v2, UPU **los empieza a usar** (hoy no aplican). |
| **RecordTypes / satélites Prisma** | Sí (se materializan) | `rt__Plan/rt__Minor/ext__uplanner__curriculum` se generan para UPU al aplicar v2 + la extensión. |
| **`uengagement-up1`** | **No** | Solo referencia a `curriculum-design` en comentarios y seeds de OrgUnit; no consume el objeto `Curriculum`. |
| **Datos vivos v1 de UPU** | **Sí — riesgo principal** | Filas con `careerId/publicId/name/totalCredits/modality/versionCode/isCurrent`. E las **preserva** (estructural→base, legacy→`ext__`, `totalCredits`→`rt__Plan`), idempotente, sin `--accept-data-loss`. |
| **Integraciones externas que leen `publicId`** | A confirmar | `publicId` es clave de negocio externa. E lo conserva en `ext__` (sujeto a H5). |

**Conclusión**: el blast radius está **confinado a UPU**. No hay FK entrante, no hay otros tenants impactados, el canónico no se toca. El riesgo se reduce a tres puntos verificables: **(1)** preservar los datos vivos de UPU en el split base/`ext__`, **(2)** generar la migración contra el estado v1 realmente aplicado (no el `schema.prisma` drifteado), **(3)** confirmar `publicId` en extensión (H5). Los bloqueantes de dominio H1/H2/H4 son **comunes a cualquier opción** que lleve UPU a v2.

---

## Recomendación

1. **Verificar** antes de ejecutar: el esquema GraphQL realmente servido a UPU (introspección, cierra el drift). *(H5 ya verificado: extensión no soporta `@unique`; `publicId` requiere unicidad por dominio — ver punto 2.)*
2. Adoptar **Opción E** (quitar el override de UPU + extender el canónico) como dirección, con **owner puente** `Institution` para no bloquear en H1, y resolver H2 (origen de `code`) y H4 (`publicId↔id`).
3. Explicitar la convergencia **`Career → AcademicProgram`** como dependencia/fase posterior, no como supuesto resuelto.
4. Ejecutar vía **PR aislado** (borrado del override + extensión + migración aditiva), revisado bajo RULE-dev-004.
5. **Actualizar `DECISION-017`** para incorporar la Opción E (hoy no contemplada) y, si se confirma su viabilidad, mover la elección de A → E.

## Referencias

- `DECISION-017-curriculum-v1-v2-convergence` (Deckard up1) — opciones A/B/C/D y mapeo de campos.
- TICKET-063 (UPONE-1268), TICKET-068 — origen y follow-up.
- `object-manager/src/services/fileParsing.js:83` — override total de tenant.
- `object-manager/src/services/codegen/generatePrismaSchema.js:1982-2006` — generación de FK/escalares en extensiones.
- `object-manager/prisma/UPU/migrations/20260612162525_init/migration.sql` — DB v1 aplicada.
- `object-manager/objects/tenants/TEST/Extended/ext__uplanner__person.json` — precedente de extensión por tenant.
