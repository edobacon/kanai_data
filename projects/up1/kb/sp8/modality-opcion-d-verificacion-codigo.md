# Opción D (reestructurar Modality): verificación contra código

> Verificación del blast radius de la **opción D** (`sp7/modality-redefinition-analysis.html` +
> opción D de `sp7/activity-activityline-modeling-analysis.html`). Contrasta cada afirmación contra el
> código real de `curriculum-design`, `academic-scheduling` y el motor de versionado en
> `object-manager` (core).
>
> **Esquema evaluado:** `Modality` (RecordType `rt__Modality__curricularsection`) deja de ser
> descriptor documental y pasa a **ancla operativa de agendamiento**: se le suman cupo, tipo de sala y
> alcance (`Shift`/`Instructor`), y `Section` (academic-scheduling) ancla en un nodo Modality en vez de
> en Activity directo.
>
> **Fecha:** 2026-08-04 · **Base:** código verificado en `uplanner/up1/mods/*` y `object-manager`.

## Veredicto general

La opción D es **viable y de huella chica dentro de cd**, como decía el análisis, pero la verificación
revela que su costo no es de tamaño sino de **anclaje cross-mod** y de **datos que ya existen a otro
nivel**. El punto que la distingue de A: gran parte de lo que D propone agregar a Modality **ya existe
hoy en `Section`**, apuntando a Activity.

## Definición y mecanismo (confirmado)

- `curriculum-design/objects/RecordTypes/rt__Modality__curricularsection.json:1-57`: `baseObject =
  CurricularSection`, patrón `rt__` (no `ext`). Campos: `code` (`:11`, `uniqueScopedBy:
  ["ownerId","recordType"]`), `theoryHours/practiceHours/labHours/autonomousHours` (`:18-40`),
  `isDefault` boolean `static_default:"false"` (`:42-48`), `deliveryMode` enum
  `[InPerson,Virtual,Hybrid,Synchronous,Asynchronous]` (`:49-55`).
- Owner polimórfico: `Activity`, `Offering` y `Curriculum` declaran `sections` (`CurricularSection`,
  `via ownerType/ownerId`). `CurricularSection.ownerType` enum `[Activity,Offering,Curriculum]`.
  **Matiz:** el seed solo puebla `Activity` (`seed/_data-syllabus-sections.js:10-20`, todos con
  `ownerActivityCode`). 3 mods lo declaran, 1 lo usa en la práctica.
- Regla I2 (una default por dueño): helper `logic/helpers/modalityDefault.js:37-78`
  (`assertSingleDefaultModality`), invocado en create (`sectionValidation.resolver.js:112-121`, mut
  `:238`) y update (`polymorphicUpdate.resolver.js:325-337`, invocado `:486`).

## Hallazgos clave (cambian el cuadro respecto al análisis)

### H1. Lo que D quiere agregar a Modality ya existe hoy en Section, apuntando a Activity
`academic-scheduling/objects/Section.json` ya tiene:
- **cupo**: `capacity`
- **alcance Shift**: `shiftId` (FK a `Shift`)
- ancla directa: `activityId` (`isForeignKey`, `references: Activity`, `not_null: true`)

El alcance Instructor vive en `SectionInstructor.sectionId/instructorId` y
`ScenarioSectionAssignment`. Es decir: D **no agrega** cupo/alcance, los **traslada un nivel abajo**
(de Activity a un Modality intermedio). Es un cambio de anclaje cross-mod (Section en
academic-scheduling, Modality en curriculum-design), no una capacidad nueva.

### H2. La FK tipada a subtipo polimórfico no existe hoy en ningún objeto del repo
Re-anclar `Section.activityId` (FK simple `not_null` a Activity) a un nodo Modality implica una FK a
`CurricularSection.id` **filtrada por `recordType=Modality`**. Se buscó ese patrón ("FK tipada a
subtipo polimórfico") y **no hay precedente** en el repo. Es diseño nuevo, no reuso.

### H3. El versionado desincroniza el scheduling, no lo duplica
`objects/activity.json:37` (`deepClone: ["sections"]`) y `objects/Curriculum.json:50`
(`deepClone: ["sections","requirements","planEntries","requirementCategories"]`) clonan Modality al
versionar. Motor genérico en `object-manager/src/graphql/resolvers/instance.resolver.js:4006-4098`
(`deepClonePolymorphicChildren`), que remapea `ownerId` a la nueva versión. Pero `Section` (otro mod)
**no** es polymorphicChild de Activity, así que no se clona. Efecto real: cada v2 nace con un **nodo
Modality nuevo sin ninguna Section apuntándolo**, mientras el Modality viejo queda con las Sections
reales fuera de la versión vigente. El riesgo no es "duplicar programación" (como decía el análisis)
sino **desincronizar** cupo/sala: la nueva versión nace sin scheduling.

### H4. Colisión de nombre de concepto con uengagement-up1
`uengagement-up1/objects/Offering.json:67-71` (`generalModality`, enum InPerson/Online/Hybrid) y
`Event.json:83-89` (`modality`, "valor autoritativo") ya usan el concepto "modalidad de entrega" de
forma **independiente**, sin FK ni import al RT de cd. Confirma el 0 FK entrante real, pero si D expone
Modality como concepto cross-mod hay que alinear terminología para no chocar semánticamente.

### H5. RBAC no tiene capability por RecordType individual
`capabilities.json:48-67`: las capabilities (`curricularsection:create`, `curricularsection:audit`)
son genéricas para los 8 subtipos. Si Modality se vuelve operativa (impacto en agendamiento real),
probablemente necesite capability propia separada de las secciones documentales, cosa que el mecanismo
actual no prevé por RT.

## Mecanismo polimórfico compartido: qué se rompe

`logic/polymorphicUpdate.resolver.js`: `RT_PATTERN = /^rt__([a-zA-Z0-9_]+)__(curricularsection|
requirement)$/` (`:207`) matchea genérico, sin caso especial para Modality; `fetchAndSplitFields`
(`:540`) y `rtUpdateHandler` (`:439`) son genéricos.

- **Mecánicamente**: agregar columnas al modelo `rt__Modality__curricularsection` **no rompe** el split
  (es genérico por metadata de Prisma).
- **Semánticamente**: la cache de metadata (`_metadataCache`, TTL 5 min, `:100-115`) y el prefetch de
  `_previousData` asumen ediciones **documentales esporádicas**. Campos operativos que cambian seguido
  (cupo, sala asignada por scheduling) generan mucho más tráfico de auditoría/eventos por un pipeline
  pensado para contenido curricular. Contaminación de rendimiento/auditoría, no de correctitud.

## Inventario de consumidores (corregido)

| Consumidor | análisis sp7 | Real verificado |
|---|---|---|
| Resolvers | 2 | **2** ✓ (`sectionValidation`, `polymorphicUpdate`) |
| Helper | 1 | **1** ✓ (`modalityDefault.js`) |
| Layouts JSON | 3 | **7**: 3 propios (`default_rt__Modality__curricularsection_{create,edit,view}`) + 4 consumidores que embeben columnas Modality con filtro `recordType=Modality` (`default_Activity_view.json:182-212`, `default_Activity_edit.json:118-171`, `default_Offering_syllabus_view.json:101-131`, `default_Offering_syllabus_edit.json:79-128`) |
| Tests | 4 | ~8 archivos; **2 dueños** del caso (`modalityDefault.test.js`, `polymorphicUpdate.modalityDefault.test.js`), el resto lo tocan incidentalmente en listas de 8 RTs |
| Seed | 14 en 2 archivos | **11 registros en 1 archivo de datos** (`seed/_data-syllabus-sections.js:10-20`, solo Activity). Los "2 archivos" eran doc de conteo (`seed/README.md`, `docs/reference/seed-counts.md`) |
| i18n | 1 | **1** ✓ |
| Componentes Vue propios | 0 | **0** ✓ |
| Consumo desde malla | 0 | **0** ✓ |
| Referencias desde otros mods | 0 | **0** ✓ (FK); colisión de nombre en engagement, ver H4 |

## isDefault

`rt__Modality__curricularsection.json:47`: "Marca si esta modalidad es la principal cuando hay varias".
Solo se expone como columna booleana "Modalidad principal" en los 4 layouts consumidores + i18n. **No
hay** lógica programática (Vue ni malla) que lo use para ordenar/elegir; el helper solo lo usa para
bloquear duplicados (I2). Si Modality agenda, "default" pasaría a significar "variante operativa por
defecto", reusando el flag para otro concepto.

## Decisiones de producto pendientes antes de codear

1. **Soporte de owners**: Modality permite owner Activity/Offering/Curriculum. Si Section ancla en
   Modality, ¿soporta los 3 owners o se restringe a Activity? Hoy el dominio permite los 3.
2. **Modality obligatoria para agendar**: `Section.activityId` es `not_null` hoy. Migrar a anclaje en
   Modality obliga a decidir qué pasa con cursos sin Modality (¿Modality pasa a ser prerrequisito de
   agendamiento? Cambia el flujo de creación de programa).
3. **Alineación con Offering**: `Offering` seguiría colgando de `ActivityLine` y `Section` de un nodo
   del sílabo. D **no alinea** `Section↔Offering` de forma natural (diferencia central con A).

## Conclusión

D es barata en coordinación (todo en cd, cero dependencia de engagement) y de huella chica, como decía
el análisis. Pero: (a) traslada a Modality capacidades que **ya existen en Section** apuntando a
Activity (H1), (b) exige un patrón de **FK tipada a subtipo polimórfico sin precedente** en el repo
(H2), (c) el versionado **desincroniza** el scheduling en vez de arrastrarlo (H3), y (d) **no alinea
Section↔Offering**. El costo es de significado y de anclaje cross-mod, no de tamaño; se paga, no
descalifica, pero es mayor de lo que sugería la huella "13 archivos".

## Comparación rápida A vs D (verificada)

| Dimensión | A · ActivityLine | D · Modality |
|---|---|---|
| Rompe la malla | No | No |
| Toca core (versionado) | Sí (declarar polymorphicChild) | Ya clona Modality; el gap es que Section no se clona (H3) |
| Alinea Section↔Offering | Sí (tras re-anclar Section) | No |
| Coordinación cross-mod | 3 mods (engagement coordina) | 1 mod (cd), pero Section vive en scheduling |
| Patrón sin precedente | No (reusa recordType, ver A/H3) | Sí (FK tipada a subtipo polimórfico, H2) |
| Capacidades que agrega | Variante + cupo + alcance (nuevos en ActivityLine) | Traslada cupo/alcance que ya existen en Section (H1) |
| Datos a migrar | Section code dedupe + variantes al versionar | 11 seeds Modality + re-anclaje Section |
