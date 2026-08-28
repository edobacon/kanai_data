---
id: DOC-kb-sp6-dredd-1380
project: up1
type: doc
---

# Dredd — review UPONE-1380 (DataLog history + atribucion polimorfica)

> **Origen**: review de Dredd-DKC del cambio de UPONE-1380 (retiro de `ChangeLog` → auditoria via
> `core_DataLog` con atribucion al padre). Corrida con KB: spec
> `SPEC-curriculum-design-datalog-history-attribution.md` + reglas core/curriculum-design/platform.
> **Calibracion**: review a fondo (logica de core transversal + retiro destructivo + UI
> config-driven). El crux esta solido; el hallazgo principal es de **completitud del retiro**, no
> del mecanismo nuevo.

---

## Hallazgos por severidad

### 🟠 S1 — 8 tabs "Historial" colgantes contra `ChangeLog` (objeto eliminado)
**Por que ese nivel:** impacto = tab roto en el detalle; blast radius = 8 vistas del mod; certeza =
trazado estatico confirmado, sin smoke.

El cambio elimina el objeto `ChangeLog` y su `default_ChangeLog_list.json`, pero 8 layouts siguen
embebiendo un record-list con `"objectName": "ChangeLog"` filtrando por `entityType`/`entityId`
(campos del objeto borrado):

- `config/layouts/default_rt__EvaluationComponent__curricularsection_view.json:58`
- `config/layouts/default_rt__Content__curricularsection_view.json:36`
- `config/layouts/default_rt__LearningOutcome__curricularsection_view.json:43`
- `config/layouts/default_rt__Bibliography__curricularsection_view.json:46`
- `config/layouts/default_rt__CustomSection__curricularsection_view.json:44`
- `config/layouts/default_rt__Session__curricularsection_view.json:51`
- `config/layouts/default_CurricularLink_view.json:75`

Al abrir esas secciones/links, `listInstances(name:"ChangeLog")` corre contra un objeto inexistente
→ el tab falla. Incumple **AC2** (retirar layout) y **AC6**. Y como el cambio del hijo ahora se
atribuye al padre (**AC4**), el fix correcto es **eliminar** esos tabs, no repuntarlos. El grep de
"cero consumidores" (S3.T1 del spec) no los atrapo → **DET-16 propagacion incompleta**. Cierre:
smoke en UPU sobre una seccion RT y un CurricularLink.

### 🟡 S2 — REQ-09 (retarget de las 3 tools up1-mcp) fuera del changeset
El DoD pide apuntar `get_change_history`/`query_changes`/`analytics_changes` a DataLog; el diff no
toca up1-mcp. El spec ya lo marca diferido/assumed (no verificable en este workspace). No es defecto
de codigo aqui — confirmar que quedo trackeado aparte.

### 🟡 S2 — Seed de migracion stale
`seed/_data-layouts-pascalcase-cleanup-v2.js:28` aun renombra `default_changeLog_list` →
`default_ChangeLog_list`, un layout que este cambio elimina. Probablemente no-op (idempotente), pero
el DoD pide seed limpio.

### 🔵 Consulta — Atribucion de CurricularLink toma solo el owner del source
`resolveAttribution` → primera seccion no-nula `['sourceSectionId','targetSectionId']`. Un link con
source/target de padres distintos se atribuye solo al padre del source. ¿Es la semantica buscada?

### 🔵 Consulta — Columna "Usuario" muestra `userId`
Las listas declaran columna `userId` + `relationDisplayFields.core_User: "name"`. El drill-in del
detalle si resuelve el nombre via `useDataLogOwnerName`, pero la columna de la lista depende de que
`userId` se expanda a FK. Verificar en smoke que no muestra el id crudo.

## 🟢 Verificado y OK

- **AC4 (crux)**: reverse-index generico desde `metadata.polymorphicChildren`/
  `polymorphicChildrenDerived`, sin hardcode; 3 caminos (owner directo, recursivo con tope
  `MAX_RECURSIVE_DEPTH=20`, derivado); owner directo gana deterministicamente.
  `polymorphicAttribution.js:326-524`.
- **Path real de la UI (gap S6 resuelto)**: `polymorphicUpdate.resolver.js:488` llama
  `recordMutationDataLog`; `resolveBaseObjectType` normaliza el alias `rt__<RT>__<base>` al objeto
  base, dejando el RT en `childRecordType`. `withDataLog.js:586,637`.
- **AC1/AC5**: `enableDataLog` en los 4; captura de transicion status (integration); no-regresion
  (unit Person + Activity directo con atribucion null).
- **AC6/AC7**: filtro `historyKey EQUALS "{Objeto}:{{parentId}}"` (1 columna escalar, sin OR —
  compatible con el motor de listas) + drill-in + lista global.
- **AC8 RBAC**: tabs con `requiredCapability: "core_datalog:view"` + `listInstances` bajo
  `withObjectAuth('view')` (`instance.resolver.js:1189`).
- **Multi-tenant**: `context.prisma` es el cliente por-tenant; lookups e insert de DataLog no cruzan
  tenants.
- **i18n**: `core_DataLog` completo y paritario en es/en/pt; sin huerfanas tras borrar
  `ChangeLog.i18n`.
- **Tests**: unit + integration (BD UPU real, incluye path del override) con assertions de valores
  concretos. El borrado de ~1465L de tests corresponde a codigo eliminado, sin hueco.
- **Doc**: `datalog.md` y `audit-events.md` coherentes. **Storybook**: N/A (config-driven + `.ts`).

## Contraste con los 8 AC + DoD

| # | Criterio | Estado |
|---|---|---|
| AC1 | `enableDataLog` en los 4 + quien/cuando/changes | ✅ |
| AC2 | ChangeLog eliminado (seed/resolver/eventos/flow/layouts) | ⚠️ Parcial — 8 tabs colgantes (🟠) |
| AC3 | Destino del historico (perdida/migracion) | ✅ Perdida aceptada, documentada |
| AC4 | Atribucion al padre + RT sin hardcode | ✅ |
| AC5 | Cambio directo del padre + sin regresion | ✅ |
| AC6 | Tab Historial en los 4 + origen del hijo | ✅ |
| AC7 | Vista global equivalente | ✅ |
| AC8 | RBAC lectura gatea historial | ✅ |
| DoD | tests / lint-tsc / lang ES / sin artefactos sync-seed / up1-mcp | ⚠️ lang OK, diff limpio; up1-mcp fuera (🟡) + seed stale (🟡); suites y smoke UPU no corridos aqui |

## Cumplimiento del KB/spec

- **RULE-layout** (motor de listas: 1-salto/EQUALS) y **DET-32** (reuso): respetados — `historyKey`
  de una columna con EQUALS es exactamente lo que soporta el motor.
- Alineado con la SPEC (REQ-01..08). Unica desviacion material: la spec solo nomino
  `default_ChangeLog_list.json` + `default_Activity_view.json`; el arbol real tiene **8 vistas mas**
  con el tab embebido → retiro incompleto (**DET-16**).
- Sin reintroducir bugs conocidos del KB.

## Veredicto

**Iterar.** El nucleo (atribucion polimorfica generica + auditoria del path real de la UI + RBAC +
no-regresion) esta solido y bien testeado. Antes de cerrar: (1) eliminar los 8 tabs ChangeLog
colgantes (con smoke que confirme el sintoma), (2) confirmar destino de REQ-09/up1-mcp, (3) limpiar
el seed stale, y resolver las 2 consultas.

*Sentence suspended — pending corrections.*

---

## Pendientes (backlog) — retomar por aca

> Estado al 2026-07-10. Al retomar UPONE-1380 en DKC, **partir por esta lista**.

### Ya aplicado (fixes de este review)
- [x] 🟠 Retirados los 7 tabs "Historial" colgantes a ChangeLog (6 RT curricularsection +
  CurricularLink) — `curriculum-design` commit `5dd0317`.
- [x] 🟡 Seed `_data-layouts-pascalcase-cleanup-v2.js`: retiro de las filas de layout de ChangeLog
  (`default_changeLog_list` + `default_ChangeLog_list`) en vez de renombrarlas.
- [x] ⚪ Guard de test: `layouts-declared.test.ts` valida `objectName` anidado contra objetos
  retirados; `cleanup-seeds.test.ts` a semantica de retiro. (1175/1175 tests verdes.)
- [x] ⚪ Comentarios stale de ChangeLog en `object-manager/.../instance.resolver.js` —
  `object-manager` commit `719e245` (solo comentarios, sin logica).

### Pendiente
- [ ] **(must) Smoke en UPU** — correr `npm run sync` (propaga los layouts corregidos a
  `up1_layen_layout`) y abrir el detalle de **una seccion RT** + **un CurricularLink**; confirmar
  que el tab "Historial" roto ya no aparece. Cierre runtime del 🟠.
- [ ] **(must) lint + tsc** en el CI real — no reproducible local (eslint toolchain roto `ajv`;
  `vue-tsc` no resoluble, `exit 127`). Los tests vitest si pasan.
- [ ] **(should) REQ-09 / up1-mcp** — verificar el retarget de `get_change_history` /
  `query_changes` / `analytics_changes` a `DataLog` en `~/Workspace/uplanner/mcp` (la spec lo marca
  `assumed`, verificacion en execute).
- [ ] **(should) Consulta — atribucion de CurricularLink**: `resolveAttribution` toma la primera
  seccion no-nula de `['sourceSectionId','targetSectionId']` → un link con source/target de padres
