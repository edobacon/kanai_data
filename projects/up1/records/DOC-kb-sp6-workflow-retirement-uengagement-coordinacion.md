---
id: DOC-kb-sp6-workflow-retirement-uengagement-coordinacion
project: up1
type: doc
---

# Retiro del subsistema de workflow — coordinación con el equipo uEngagement

> **Para:** equipo uEngagement (dueños del mod `uengagement-up1`)
> **De:** equipo Curriculum Design — SP6 · P4 · Jira **UPONE-1381**
> **Fecha:** 2026-07-08
> **Estado:** solicitud de un cambio menor (2 campos) para desbloquear la eliminación de código muerto compartido
> **Impacto para uEngagement:** funcionalmente **cero** (los campos que pedimos quitar están sin datos y sin uso); es limpieza.

---

## 1. TL;DR (30 segundos)

En SP6 migramos el flujo de estados de los **programas de asignatura** (`Activity` de tipo `Course`) del viejo **motor de workflow relacional** al **motor de transiciones nativo de core** (un enum `status` con transiciones declaradas). Esa migración ya está hecha, probada y verificada en vivo.

El objeto `Activity` es **compartido** entre nuestros dos mods. Su `Activity.json` de uEngagement (`uengagement-up1/objects/Activity.json`) **todavía declara dos campos del viejo workflow** — `workflowId` y `currentStatusId` — que:

- **no tienen datos** (están en `null` para el 100% de las actividades, incluidos todos los servicios de engagement),
- **no tienen uso funcional** (los servicios de engagement nunca usaron gobernanza por workflow),
- pero **bloquean** que podamos eliminar el subsistema de workflow completo (4 tablas + esas 2 columnas), que hoy es código muerto.

**Lo que pedimos:** que uEngagement quite esos 2 campos de su `Activity.json`. Es un cambio de ~10 líneas, sin migración de datos (no hay datos), sin impacto en `ServiceOffer` ni en ningún flujo de engagement. Una vez hecho, nosotros ejecutamos el drop del subsistema.

---

## 2. Contexto: por qué existe este acoplamiento

`Activity` es un **objeto base compartido** de up1. Dos mods le aportan campos al **mismo** objeto (y por lo tanto a la **misma** tabla, vía el merge del sync):

| Mod | RecordType que posee | Qué aportó históricamente |
|-----|----------------------|---------------------------|
| **curriculum-design** (nosotros) | `Activity:Course` (programas de asignatura) | La gobernanza por workflow: `workflowId` + `currentStatusId` (FKs al subsistema workflow). |
| **uengagement-up1** (ustedes) | `Activity:Service` (servicios de engagement) | Su propia definición de `Activity.json`, que **también** declara `workflowId` + `currentStatusId` (heredado del `Activity` compartido de aquella época). |

El **subsistema de workflow** (los objetos `Workflow`, `WorkflowStatus`, `WorkflowTransition`, `WorkflowTransitionHistory`) es propiedad de **curriculum-design** — sus JSON viven en `mods/curriculum-design/objects/`. uEngagement **no define** esos objetos; solo los **referencia** vía las FK de su `Activity.json`.

```
uengagement-up1/objects/Activity.json          curriculum-design/objects/workflow*.json
   currentStatusId ──referencia──▶ WorkflowStatus ◀── generan las tablas ── workflow.json, workflowStatus.json, ...
   workflowId      ──referencia──▶ Workflow       ◀──                        workflowTransition.json, workflowTransitionHistory.json
```

---

## 3. Qué cambió en SP6 (lado curriculum-design)

Jira **UPONE-1381** (P4) estandarizó el flujo de estados de `Activity:Course`, `Curriculum` y `Offering` en el **motor de transiciones de enum de core** (declarativo: un campo enum `status` con `transitions` en el JSON, validadas por `enforceEnumTransitions` en `updateInstance`, con capabilities por transición y gate de versionado declarativo).

Para `Activity` específicamente (Session 5, ya en la rama `feat/UPONE-1381-enum-transitions`):

- Se agregó el campo enum **`status`** (`Draft → InReview → Approved → Active → Deprecated → Archived`) con sus 8 transiciones canónicas y capabilities (`activity:{approve,publish,deprecate,archive}`).
- Se **retiró** de *nuestro* `Activity.json` la declaración de `workflowId` / `currentStatusId`, y se migró todo lo que dependía del workflow: resolver de transición, gate de publicación (I1 peso de evaluaciones), badge de estado, layouts, seeds y las tools del MCP.
- Verificado en vivo contra el tenant UPU: transiciones legales/ilegales, RBAC por transición y gate de publicación funcionando end-to-end. Regresión completa en verde.

**Resultado:** ningún `Activity` (ni Course ni Service) usa ya `workflowId`/`currentStatusId`. Confirmado en la DB reconstruida de UPU:

```
28 activities → workflowId = null y currentStatusId = null en el 100%
```

El subsistema de workflow quedó como **código muerto**: sus tablas (`Workflow`=5 filas seed, `WorkflowStatus`=9 filas seed) ya no gobiernan nada.

---

## 4. Qué pedimos exactamente

Quitar **dos campos** del archivo `mods/uengagement-up1/objects/Activity.json`:

```jsonc
// ELIMINAR estos dos bloques:
"workflowId": {
  "type": "string",
  "title": "Workflow",
  "not_null": false,
  "description": "Workflow de ciclo de vida de la actividad",
  "isForeignKey": true,
  "references": "Workflow",
  "targetField": "id"
},
"currentStatusId": {
  "type": "string",
  "title": "Current Status",
  "not_null": false,
  "description": "Estado actual en el workflow. Solo lectura.",
  "isForeignKey": true,
  "references": "WorkflowStatus",
  "targetField": "id"
}
```

> Si uEngagement necesitara un ciclo de vida propio para sus servicios en el futuro, la vía recomendada es el **mismo motor de enum de core** (un campo enum `status`/`lifecycleStatus` con `transitions`), no el workflow relacional — que se está retirando. (Es exactamente lo que hicimos con `Offering.lifecycleStatus` para el sílabo en este mismo sprint; podemos ayudarlos a replicarlo.)

---

## 4.1 Cómo tener un lifecycle propio con el motor de enum de core (si uEngagement lo quiere)

Retirar el workflow relacional NO deja a uEngagement sin capacidad de ciclo de vida. La vía vigente en up1 (la que adoptó curriculum-design para `Activity`, `Curriculum` y `Offering`) es el **motor de transiciones de enum de core**: 100% declarativo en el JSON del objeto, sin tablas ni resolvers propios. Si un servicio de engagement necesitara estados gobernados, esta es la ruta.

**Cómo funciona:** se declara un campo enum (ej. `status` o `lifecycleStatus`) con un bloque `transitions` en el `.json` del objeto. El core, en `updateInstance`, corre `enforceEnumTransitions`: rechaza cualquier cambio de estado que no esté declarado como transición válida y, si la transición declara `requiredCapabilities`, exige que el usuario las tenga. No hace falta escribir resolver de transición, ni tablas `Workflow*`, ni seed de estados.

**Receta (pasos):**

1. **Declarar el enum + transiciones** en el objeto (o en el RecordType del servicio). Cada transición es `{ from, to }`, con `requiredCapabilities: []` opcional y `requiresComment: true` opcional si esa transición exige justificación.
2. **Declarar las capabilities por transición** en el `capabilities.json` del mod (ej. `service:publish`, `service:archive`). El guard las exige por arista.
3. **(Opcional) versionado por estado**: agregar un bloque `metadata.versioning` con `stateField` + `versionableFromStates` si el objeto se versiona (ver Curriculum/Activity). Para un lifecycle simple no hace falta.
4. **`npm run codegen`**: persiste `transitions` en `core_FieldDefinition.properties.transitions`. Nada más que cablear: el enforcement es del core.
5. **UI**: el estado se muestra/edita como cualquier enum; el badge de estado se mapea estado→variant (sin query a `WorkflowStatus`).

**Ejemplo real (el más simple, `Offering.lifecycleStatus` de curriculum-design)** — punto de partida copy-paste para un lifecycle de servicio:

```jsonc
"lifecycleStatus": {
  "type": "string",
  "enum": ["Draft", "InReview", "Active", "Archived"],
  "transitions": [
    { "from": "Draft",    "to": "InReview" },
    { "from": "InReview", "to": "Active",   "requiredCapabilities": ["offering:publish"] },
    { "from": "InReview", "to": "Draft" },
    { "from": "Draft",    "to": "Active",   "requiredCapabilities": ["offering:publish"] },
    { "from": "Active",   "to": "Archived", "requiredCapabilities": ["offering:archive"] },
    { "from": "Active",   "to": "Draft",    "requiredCapabilities": ["offering:revert"] }
  ]
}
```

Para engagement, reemplazar los estados por los del servicio y las capabilities por las suyas (`service:publish`, etc.). Si además quieren versionado, el patrón con `metadata.versioning` está en `Curriculum.status`/`activity.status` del mismo mod (estados `Draft → InReview → Approved → Active → Deprecated → Archived` + `versionableFromStates`).

**Diferencias vs el workflow relacional que se retira** (por si esperaban paridad):

- El enum es **uniforme por tenant** (se declara en build-time en el JSON) → no hay flujos distintos por institución ni configurables en runtime como daba el workflow relacional. Si eso hiciera falta, es una conversación de plataforma aparte.
- El **historial de transiciones** (quién/cuándo/de→a) ya no vive en `WorkflowTransitionHistory`; queda como cambio de campo en `core_DataLog` (ver UPONE-1380/P3, que activó DataLog con atribución).
- La **justificación por transición** (`requiresComment`) está soportada en la declaración, pero su captura por UI depende de que exista una pantalla que la pida (hoy diferido).

Podemos ayudarlos a declararlo si deciden avanzar.

## 5. Cómo se ejecuta (plan conjunto)

El drop es una **migración destructiva** (elimina 4 tablas + 2 columnas + relaciones inversas de Prisma). Por eso se coordina en un solo paso conjunto:

1. **uEngagement** (ustedes): quitan los 2 campos de `Activity.json` → PR en su mod.
2. **curriculum-design** (nosotros): ya tenemos preparado el retiro de nuestro lado (objetos `workflow*.json`, seeds y resolvers). Lo activamos una vez su cambio esté mergeado.
3. **Conjunto**: `npm run sync` + `npm run codegen` → el schema queda sin las tablas workflow ni las columnas `workflowId`/`currentStatusId`.
4. **Migración**: `prisma migrate` / reconstrucción del tenant, con consentimiento explícito (data-loss de tablas que ya están vacías de datos útiles).

Orden importa: si nosotros dropeamos los objetos `Workflow`/`WorkflowStatus` **antes** de que ustedes quiten los FK, el codegen falla con una referencia colgante. Por eso su cambio va **primero** (o en el mismo PR coordinado).

---

## 6. Por qué conviene hacerlo

- **Elimina deuda técnica compartida**: 4 tablas + 2 columnas + un set de resolvers/seeds que ya no cumplen ninguna función.
- **Consistencia del modelo**: up1 estandariza el flujo de estados en el motor de enum de core; dejar el workflow relacional colgando invita a que alguien lo reactive por error.
- **Claridad para el que lee el objeto**: hoy `Activity` muestra `workflowId`/`currentStatusId` (que no hacen nada) junto al `status` real — confuso.
- **Cero costo para uEngagement**: sin datos que migrar, sin flujo que ajustar.

---

## 7. Impacto y riesgo para uEngagement

| Dimensión | Evaluación |
|-----------|------------|
| Datos | **Nulo.** `workflowId`/`currentStatusId` están en `null` para todos los `Activity` (Course y Service). No hay dato que perder. |
| `ServiceOffer` / agendamiento | **Sin impacto.** Esos campos no participan de ningún flujo de engagement. |
| API / consumidores | **Sin impacto.** No hay mutations ni queries de engagement que lean estos campos (verificado por grep en suite, mods, MCP: cero consumidores vivos de las mutations `*WorkflowValidated`). |
| Runtime | El guard de transiciones de core es no-op para campos que un recordType no usa, así que ni siquiera dispara para servicios. |
| Reversibilidad | Alta: es un cambio declarativo; si algo apareciera, se re-agrega el campo. |

---

## 8. Si NO se hace (alternativa documentada)

Si por prioridades el cambio no entra ahora, **no bloquea** el cierre de P4 (UPONE-1381): los requerimientos propios de P4 (declarar transiciones, migrar Activity, gate de versionado, deep-clone, RBAC) están completos. El retiro del subsistema queda como **deuda documentada** (backlog `must` en el ticket DKC TICKET-103, ítem B3): las 4 tablas + 2 columnas permanecen como código/estructura muerta hasta que se coordine este cambio. No hay riesgo funcional, solo deuda.

---

## 9. Referencias

- **Jira:** [UPONE-1381](https://u-planner.atlassian.net/browse/UPONE-1381) (P4, épica UPONE-1267).
- **Ticket DKC:** `TICKET-103` — decisiones D-S5-1..D-S5-5 (migración de Activity), D-S5-5 (por qué el drop de FK se difirió), backlog B3 (este bloqueo cross-mod).
- **Precedente del enum de core:** `Offering.lifecycleStatus` (sílabo) migrado en este mismo sprint — patrón replicable si uEngagement quisiera un ciclo de vida propio.
- **Contacto:** equipo Curriculum Design (SP6).
