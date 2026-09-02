---
id: DOC-kb-sp10-UPONE-1769-pre-intake
project: up1
type: doc
module: curriculum-mapping
tags:
  - sp10
  - curriculum-mapping
  - pre-intake
  - UPONE-1769
  - cableado-modelo
  - rename
  - dependencias
  - snapshot-estado
---

# UPONE-1769-pre-intake

> **PRE-INTAKE / SNAPSHOT DE ESTADO (2026-09-01). NO es el intake oficial.** Este doc captura el estado actual de UPONE-1769 y su dependencia del avance de otros tickets. **Antes de ejecutar, re-validar el estado** (ver checklist al final): varias piezas del ticket ya las esta haciendo otro ticket en un PR abierto, y los nombres finales dependen de que ese PR mergee. Interno, no va a Jira.

# UPONE-1769 Pre-intake (cableado del modelo + rename): estado y dependencias

## 1. Que es 1769 y de que depende

UPONE-1769 ("Curriculum Mapping | Tributacion | Cableado del modelo y rename de cobertura a desarrollo") es tu ticket (asignado a Eduardo), Historia de la epica UPONE-1452, 8 SP, prioridad Critica. Corresponde a lo que veniamos detallando como `UPONE-1756-alcance-sp10-delta`.

**Es un ticket dependiente del avance de otros.** Su ejecucion no puede planificarse en aislamiento: parte de su alcance ya lo ejecuta UPONE-1753 en un PR abierto, y los nombres con los que 1769 debe nacer dependen de que ese PR mergee.

## 2. Estado actual verificado (que ya esta hecho y donde)

**UPONE-1753 (Francisco Navarro), PR #23 en curriculum-mapping, estado OPEN (sin mergear a develop):**
https://bitbucket.org/uplanner/curriculum-mapping/pull-requests/23

Ese PR **ya ejecuta casi todo el bloque de renames que la descripcion de 1769 tambien lista:**

| Pieza | Estado en PR #23 | Evidencia |
|---|---|---|
| Objeto `CoverageScheme -> DevelopmentLevel` | Hecho | `objects/CoverageScheme.json -> objects/DevelopmentLevel.json` (rename, `title` nuevo) |
| Objeto `LevelScheme -> PerformanceScale` | Hecho | `objects/LevelScheme.json -> objects/PerformanceScale.json` |
| Campo `coverageLevelId -> developmentLevelId` en CompetencyAlignment | Hecho | `objects/CompetencyAlignment.json` (campo + indice + FK -> `DevelopmentLevel`) |
| Guard RC6 barrido | Hecho | `coverageScheme-upsert -> developmentLevel-upsert`, `isCoverageSchemeInUse -> isDevelopmentLevelInUse`, apunta a `developmentLevelId` |
| `levelSchemeId -> performanceScaleId` en Matrix | Hecho (bonus) | `objects/RecordTypes/rt__Matrix__competencynode.json` |

**En `develop` (hoy) el rename NO esta:** `CoverageScheme`/`coverageLevelId`/`LevelScheme` siguen vigentes; el rename vive solo en el PR #23 abierto.

## 3. Lo que queda realmente para 1769 (verificado: ausente en el PR y en develop)

Solo los **campos aditivos**:

- `contributionPercentage` en CompetencyAlignment (hoy solo existe `contributionType`).
- `planId` en CompetencyAlignment (denormalizado) + indice de grupo `(planId, competencyNodeId, developmentLevelId)`.
- FK del catalogo de desarrollo en el RecordType Matrix (el que llamabamos `developmentSchemeId`; ver naming abajo). Hoy Matrix solo tiene `performanceScaleId` (la escala de logro), no un FK al catalogo de desarrollo.
- `achievementBasis` (enum `Aggregation` | `RepresentativeLevel`) en Matrix.
- `isRepresentative` en `CompetencyNodeDevelopmentLevel` -> **ese objeto aun no existe**, lo crea UPONE-1756. No se puede agregar hasta que exista.

## 4. Reconciliacion de nombres (importante, no cuadran los docs con el codigo)

Nuestros docs, la descripcion del PO de 1769 y el "detalle tecnico" (artefacto `28f19a04`) usan `DevelopmentScheme`. **El codigo real (PR #23) uso `DevelopmentLevel`.** Manda el codigo.

Estructura real de `DevelopmentLevel` (ex `CoverageScheme`): objeto **Composite** con `recordType` enum `["Scheme", "Level"]`. La fila `Scheme` es el catalogo raiz; las filas `Level` cuelgan por `parentId`.

- `competencyAlignment.developmentLevelId` apunta a un **Level** (una fila de nivel).
- El FK que 1769 agrega en **Matrix** apunta al **Scheme** (la raiz del catalogo: que catalogo de niveles usa la matriz). Por eso **no puede llamarse `developmentLevelId`** (ya lo usa CompetencyAlignment para un Level), y `developmentSchemeId` ya no cuadra porque el objeto no se llama `DevelopmentScheme`.
- **Decision de naming a coordinar con Francisco (dueno de 1753):** propuesta `developmentLevelSchemeId` (FK -> `DevelopmentLevel`, se espera fila `recordType = Scheme`). Nace una asimetria con `PerformanceScale`/`performanceScaleId`: 1753 nombro un catalogo como "...Scale" (el scheme) y el otro como "...Level"; esa asimetria es de 1753 y conviene cerrarla con el, no que 1769 invente un nombre que despues choque.

## 5. El COMO (enfoque de implementacion, cuando se ejecute)

- **No re-hacer los renames.** Los ejecuta 1753 en el PR #23. 1769 se apoya en ese estado ya renombrado. Re-hacerlos seria el "doble renombre" que ambos tickets piden evitar.
- **Campos aditivos, todos nullable, sin logica que los consuma** (esa va en el follow-up). Agregarlos es declaracion de schema en `objects/*.json` / `RecordTypes/*.json`; el codegen los resuelve sin cambios de core.
- **Orden:** primero que 1753 mergee (para nacer con los nombres nuevos); luego agregar los campos aditivos con esos nombres; el indice de grupo con `developmentLevelId` (nombre nuevo).
- **`isRepresentative`** espera a que UPONE-1756 cree `CompetencyNodeDevelopmentLevel`.
- **Migracion:** los campos son aditivos/nullable -> migracion sin drift, sin recrear datos. (El rename de objeto, que si tiene el problema de migracion de tabla, lo carga 1753.)

## 6. Frontera core/mod (Aduana)

**`todo-mod-only`** una vez reducido a campos aditivos: son declaraciones de schema propias del mod que el codegen del core ya soporta (analogo a como `Competency`/`SubCompetency` ya declaran `isHolistic`/`rollupWeight`). **La unica pieza core-worthy del feature era el rename del OBJETO** (el sync de object-manager no tiene ruta para renombrar el nombre/tabla de un objeto: `docs/guides/pre-push-migrations.md` solo cubre cuarentena, rename de valores de enum y nuevos UNIQUE), **y esa pieza la carga UPONE-1753, no 1769.** Evidencia extendida: `UPONE-1769-aduana.md`.

## 7. Dependencias con otros tickets (el mapa)

- **UPONE-1753 (PR #23, OPEN):** bloquea a 1769. 1769 nace con los nombres nuevos, asi que necesita que 1753 mergee primero. Ademas 1753 esta a su vez bloqueado por **UPONE-1689** (sin mergear: rama `42f5e37`, develop `4fc88f6`) y por una "decision 1" (recrear datos desde seed, con el tech lead).
- **UPONE-1756:** crea `CompetencyNodeDevelopmentLevel`, donde va `isRepresentative`. Sin ese objeto, ese campo de 1769 no se puede agregar.
- **UPONE-1755:** modelo de medicion; `achievementBasis` y los ejes que 1769 deja cableados se consumen ahi (en el follow-up).
- **Naming del FK de Matrix:** coordinar con Francisco (1753).

## 8. Checklist a re-validar ANTES del intake oficial / ejecucion

- [ ] **PR #23 (UPONE-1753) mergeado a develop.** Si no, 1769 no arranca (naceria con nombres viejos).
- [ ] Confirmar en develop los nombres finales: `DevelopmentLevel`, `PerformanceScale`, `developmentLevelId` (por si en review del PR cambiaron).
- [ ] **Nombre del FK de Matrix acordado con Francisco** (propuesta `developmentLevelSchemeId`).
- [ ] `CompetencyNodeDevelopmentLevel` existe (UPONE-1756) para poder agregar `isRepresentative`.
- [ ] **Re-estimar:** 8 SP era casi todo el rename; sin el rename, 1769 es solo aditivo (Baja sensibilidad) -> probablemente ~3 SP. Confirmar con la calibracion.
- [ ] Verificar que UPONE-1689 (bloqueante de 1753) mergeo.
- [ ] Re-correr esta verificacion de codigo (el estado de un PR abierto cambia).

## Referencias

- Ticket: UPONE-1769 (Jira). Contrato: `UPONE-1769-detalle`. Aduana: `UPONE-1769-aduana`.
- PR que cubre los renames: https://bitbucket.org/uplanner/curriculum-mapping/pull-requests/23 (UPONE-1753).
- Fuentes del PO: maqueta (artefacto `2197e9c9`), detalle tecnico (artefacto `28f19a04`), plan de particion (artefacto `af80b782`).
- Codigo: `objects/CompetencyAlignment.json`, `objects/RecordTypes/rt__Matrix__competencynode.json`, `objects/DevelopmentLevel.json` (PR #23). Working copy develop: `curriculum-mapping@develop`.
