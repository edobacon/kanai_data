---
id: DOC-kb-sp8-actividad-de-curso-consolidacion-a-vs-d
project: up1
type: doc
---

# Actividad de curso: consolidación A (ActivityLine) vs D (Modality)

> Documento de consolidación para la decisión de dónde vive el nivel intermedio entre el curso y su
> programación. Sintetiza las dos verificaciones contra código de sp8 y las contrasta en tres ejes:
> **qué significa el cambio**, **diferencia de esfuerzo**, e **impacto en la estructura de datos**.
>
> **Fuentes:** `sp8/activityline-opcion-a-verificacion-codigo.md`,
> `sp8/modality-opcion-d-verificacion-codigo.md`, y el análisis original
> `sp7/activity-activityline-modeling-analysis.html`.
>
> **Fecha:** 2026-08-04 · **Base:** código verificado en `uplanner/up1/mods/*` y `object-manager`
> (core). Las dos opciones son viables y ninguna rompe la malla; la diferencia está en el encaje, el
> esfuerzo y la estructura de datos.

## 1. Qué significa el cambio en cada caso

### Opción A · extender ActivityLine
`ActivityLine` es hoy un vínculo neutro Activity↔OrgUnit ("quién ejecuta / en qué centro"), ya 1:N,
compartido con engagement (Servicios). El cambio la convierte en **portadora de la variante de curso**:
un RecordType con tipo de actividad, tipo de sala, modalidad, cupo y alcance (`Shift`/`Instructor`).
`Section` y `Offering` pasan a anclar en la misma línea-variante.

- **Naturaleza del objeto:** ya es operativo (entidad de ejecución). Sumarle la variante **extiende**
  su rol, no lo invierte.
- **Dirección:** ya recibe FK entrantes (Offering cuelga de `activityLineId`). Section se suma.
- **Frase resumen:** "la unidad de ejecución ahora también describe qué variante del curso se dicta".

### Opción D · reestructurar Modality
`Modality` es hoy un RecordType documental (`rt__Modality__curricularsection`), hoja del árbol del
sílabo, que describe horas y modo de entrega. El cambio la promueve a **ancla operativa**: se le suman
cupo, tipo de sala y alcance, y `Section` ancla en un nodo Modality.

- **Naturaleza del objeto:** es documental (describe, no opera). El cambio **invierte** su rol de
  descriptor a portador de agendamiento.
- **Dirección:** hoy es hoja (0 FK entrantes). Pasaría a hub (Section apunta hacia él).
- **Frase resumen:** "un nodo de documentación del sílabo pasa a gobernar la programación".

### La diferencia conceptual de fondo
A **extiende un objeto que ya es operativo**; D **convierte un objeto documental en operativo**. Por
eso el análisis lo resume como: A optimiza encaje y alineación, D optimiza autonomía de un solo equipo.

## 2. Diferencia de esfuerzo (verificada en código)

### Costo por opción

| Frente | A · ActivityLine | D · Modality |
|---|---|---|
| **Definición de objeto** | RecordType + campos sobre ActivityLine (objeto base de engagement) | Campos operativos sobre `rt__Modality__curricularsection` (objeto propio de cd) |
| **Resolvers a tocar** | 2 gemelos (`cd/syllabus-offering.resolver.js:39-72`, `eng/offering-create.resolver.js:37-70`): dejar de tomar "la primera" + selector de variante | 2 (`sectionValidation.resolver.js`, `polymorphicUpdate.resolver.js`): sumar validaciones de cupo/sala/alcance en los mismos overrides |
| **Core (object-manager)** | **Sí**: declarar ActivityLine como `polymorphicChild` deep-clonable, o hook de clonado | Ya clona Modality; el gap es que Section (otro mod) no se clona |
| **Layouts** | `default_Offering_syllabus_{create,view,edit,list}` + genéricos de ActivityLine en engagement (copy "servicio") | 7 layouts (3 propios + 4 consumidores con columnas Modality embebidas) |
| **Re-anclar Section** | `activityId → activityLineId` (FK a objeto existente) | `activityId → nodo Modality` (FK tipada a subtipo polimórfico, **sin precedente en el repo**) |
| **Coordinación cross-mod** | 3 mods (cd ejecuta, academic-scheduling re-ancla, **engagement coordina** por objeto compartido) | 1 mod dueño (cd), pero Section vive en academic-scheduling igual |
| **Patrón sin precedente** | No (reusa `recordType`, plantilla probada en `Offering.json:24-30`) | **Sí** (FK a `CurricularSection.id` filtrada por `recordType=Modality`) |

### Migración de datos

| | A · ActivityLine | D · Modality |
|---|---|---|
| Registros a reinterpretar | Section `code` dedupe si dos secciones del mismo curso en distintas líneas colisionaban | 11 seeds Modality (`_data-syllabus-sections.js:10-20`) a reinterpretar como operativos |
| Backfill de esquema | `recordType` con `static_default` (patrón probado, backfill automático) | Campos nuevos con `static_default`; sin patrón de FK tipada previo |
| Linaje al versionar | Incluir variantes en el deep-clone (core) | Section queda huérfana del Modality de la versión vieja (H3 del doc D) |

### Lectura del esfuerzo
- **A tiene más superficie** (3 mods, 4 breaks duros, toca core) pero **cada pieza reusa patrones y
  objetos existentes**. Rework contenido y escalonable.
- **D tiene menos superficie** (1 mod, huella chica) pero **dos piezas son diseño nuevo sin
  precedente**: la FK tipada a subtipo polimórfico y la inversión de rol del objeto. Menos archivos,
  más incertidumbre por pieza.

Conclusión de esfuerzo: **A es más trabajo total, D es más riesgo por pieza**. Ninguna es
"barata": el análisis las clasificaba a ambas como esfuerzo Medio.

## 3. Impacto en la estructura de datos

### Estado actual (verificado)

```
Activity (curso, multi-fila por versión)
  ├─ 1:N → ActivityLine (Activity↔OrgUnit, neutro)     ← Offering cuelga aquí (activityLineId)
  ├─ polymorphicChildren: sections (CurricularSection) ← Modality es 1 de 8 RT, hoja documental
  └─ ← FK activityId ← Section (academic-scheduling)   ← Section ancla en Activity DIRECTO

Section (academic-scheduling) ya tiene: capacity (cupo), shiftId (alcance), activityId (not_null)
```

Asimetría central: **Offering cuelga de ActivityLine, Section cuelga de Activity directo.** Las dos
ramas no se tocan hoy.

### Cómo queda con A

```
Activity
  └─ 1:N → ActivityLine [+ recordType variante, tipo actividad/sala, modalidad, cupo, alcance]
             ├─ ← Offering (ya)
             └─ ← Section (RE-ANCLADA aquí)   ← alinea Section con Offering
```

- **Cardinalidad:** ya es 1:N; no cambia. Solo re-ancla Section (única FK que cambia de destino).
- **Nuevo overload:** ActivityLine carga dos conceptos ortogonales (centro ejecutor de servicio +
  variante de curso), separados por `recordType` (patrón `Offering.json:24-30`).
- **Colisión a resolver:** `Section.orgUnitId` (existente) vs `ActivityLine.orgUnitId` (dos caminos a
  la unidad organizacional).
- **Alineación:** **sí** logra `Section ↔ Offering` en la misma línea. Es la meta de fondo.

### Cómo queda con D

```
Activity
  └─ polymorphicChildren: sections (CurricularSection)
       └─ rt__Modality [+ cupo, tipo sala, alcance]   ← pasa de hoja a hub
            └─ ← Section (RE-ANCLADA a un nodo del árbol documental, vía FK tipada recordType=Modality)

Offering sigue colgando de ActivityLine (NO alineado con Section)
```

- **Cardinalidad:** Modality pasa de hoja (0 FK entrantes) a hub (Section apunta).
- **Nuevo tipo de FK:** Section deja de tener FK simple a Activity y pasa a FK tipada a subtipo
  polimórfico (`CurricularSection.id` filtrada por `recordType=Modality`). **Patrón nuevo en el repo.**
- **Tabla compartida contaminada:** Modality comparte la tabla `CurricularSection` con 7 RT
  documentales; queda como outlier operativo (con FK entrante y campos de agendamiento) en un aparato
  pensado para secciones de documento.
- **Alineación:** **no**. Offering sigue en ActivityLine, Section en un nodo del sílabo. Las dos ramas
  siguen sin tocarse.
- **Duplicación de capacidad:** cupo y alcance quedarían tanto en `Section` (hoy) como en Modality
  (nuevo), salvo que se migren y se quiten de Section (más cambio en academic-scheduling).

### Diferencia estructural en una línea
- **A mueve una FK** (Section al pivote que ya ancla Offering) y **unifica las dos ramas**.
- **D crea un tipo de relación nuevo** (FK tipada a subtipo polimórfico), **contamina la tabla
  documental** y **deja las dos ramas separadas**.

## 4. Tabla de decisión consolidada

| Criterio | A · ActivityLine | D · Modality |
|---|---|---|
| Rompe la malla / prereqs / requisitos | No | No |
| Alinea Section ↔ Offering | **Sí** | No |
| Mods tocados | 3 (engagement coordina) | 1 dueño (+ Section en scheduling) |
| Toca core (object-manager) | Sí (deep-clone de variantes) | Gap de clonado de Section, no de core |
| Cambio de cardinalidad | Ninguno (ya 1:N); re-ancla Section | Modality de hoja a hub |
| Tipo de FK nuevo sin precedente | No | **Sí** (FK tipada a subtipo polimórfico) |
| Naturaleza del objeto | Extiende operativo → operativo | Invierte documental → operativo |
| Capacidades (cupo/alcance) | Nuevas en ActivityLine | Ya existen en Section (traslado/duplicación) |
| Migración de datos | Section code dedupe + variantes al versionar | 11 seeds + re-anclaje Section |
| Overload / contaminación | ActivityLine con 2 conceptos (separables por recordType) | Tabla documental con 1 nodo operativo |
| Esfuerzo total | Mayor superficie, rework contenido | Menor superficie, más riesgo por pieza |
| Coordinación con engagement | Requerida | Ninguna (ventaja propia) |

## 5. Recomendación (heredada de sp7, confirmada con código)

**A sigue adelante.** El desempate del análisis sp7 se sostiene con el código, con dos razones extra
que la verificación destapó a favor de A:

1. **A reusa; D inventa.** A extiende un objeto ya operativo con un patrón (`recordType`) que el repo
   ya tiene probado en `Offering`. D exige una FK tipada a subtipo polimórfico que no existe en ningún
   objeto del repo.
2. **A no duplica capacidades; D sí.** Cupo y alcance ya viven en `Section`. A los suma donde faltan
   (la variante); D los traslada a Modality, dejando duplicación con Section salvo más trabajo en
   scheduling.

**D es la alternativa viable** si el equipo prioriza **avanzar sin depender de la coordinación con
uengagement-up1**: su ventaja real y confirmada es cero coordinación cross-mod y huella chica en cd.
El costo que se acepta: no alinear `Section↔Offering`, invertir el rol del objeto, y el patrón de FK
nuevo.

## 6. Riesgo abierto (ambas opciones, no verificable en el repo)

`uengagement-up1/.ai/CONTEXT.md:99-104` describe un flow n8n **FLOW-11** que recalcula
`Activity.operationalStatus` al cambiar una línea. Como cd **ya crea líneas de Course hoy**, si ese
flow no filtra por `recordType=Service` podría dispararse sobre cursos. Afecta sobre todo a A (que
carga más la línea), pero conviene verificarlo en n8n antes de tocar ActivityLine.
