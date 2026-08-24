---
id: SPEC-la-objects-model-UPDATE
project: up1
type: spec
module: learning-assurance
category: objects-model
status: active
tags: [learning-assurance, modelo-objetos, prompt, mcp, atlassian, update]
last_updated: 2026-05-13
maintained_by: Eduardo Bacon
---

# Modelo de objetos LA — Procedimiento de actualizacion

Prompt operativo para LLM (Claude Code con MCP atlassian conectado). Tambien sirve como guia para el dev humano que ejecute el procedimiento manualmente.

**Cuando ejecutar**: al inicio de cada sprint nuevo, o cuando se detecta que la pagina canonica de Confluence cambio (page version > la registrada en el ultimo snapshot).

---

## Pre-requisitos

Antes de comenzar, verificar:

1. **MCP atlassian conectado**. Confirmar con `mcp__atlassian__getAccessibleAtlassianResources` que el cloudId `u-planner.atlassian.net` responde.
2. **Acceso a la pagina** `2038366242` (Modelo de objetos de negocio Learning Assurance) en el espacio `uP1`.
3. **Working directory**: `/Users/edobacon/Workspace/uplanner/specs/up1/learning-assurance/objects-model/`. Si trabajas con deckard, el comando equivalente vive en `specs/up1/learning-assurance/objects-model/` via el symlink `deckard/projects/up1/specs/`.
4. **Sprint vigente identificado**: nombre (SP4, SP5, etc.) + fecha de inicio. Si arranca hoy, usar `date +%Y-%m-%d`.
5. **Lectura previa de [INDEX.md](INDEX.md)** y [CHANGELOG.md](CHANGELOG.md) para entender el ultimo estado registrado.

---

## Procedimiento (pasos en orden)

### Paso 1 — Traer version actual de Confluence

Llamar:

```
mcp__atlassian__getConfluencePage(
  cloudId: "u-planner.atlassian.net",
  pageId: "2038366242",
  contentFormat: "markdown"
)
```

**Importante**: el output es grande (~100k chars). Si excede el limite del LLM, el resultado se cachea en disco y debe procesarse con `jq` + `python` sobre el archivo cacheado. Ver patron en deckard cain:

```bash
jq -r '.[1].text' <path/to/cache.txt> > /tmp/confluence-la-latest.md
```

(El primer elemento `.[0]` suele ser metadata corta; el contenido vive en `.[1].text`.)

### Paso 2 — Extraer metadata de version

Del texto extraido, identificar:

- **Page version (Confluence)**: campo "version 14" o similar — buscar `"version":` en la respuesta cruda o el numero junto al titulo en la version markdown.
- **Model version (`v1.X`)**: revisar la seccion `# Versión` al final de la pagina. La ultima fila de la tabla "Versión" indica la `model_version` vigente.
- **Fecha de la ultima edicion**: del metadata de Confluence (`webPublishedAt` o similar).

Comparar con el snapshot mas reciente registrado en [INDEX.md](INDEX.md) tabla "Sprints documentados". Si `model_version` no cambio y `page_version` solo subio 1-2 numeros sin nuevas filas en la tabla "Versión", probablemente no hay cambios estructurales — solo correcciones menores; documentar en CHANGELOG sin generar nuevo snapshot.

### Paso 3 — Extraer la "Tabla general de objetos" actualizada

Localizar la tabla con los 30+ objetos (numero / nombre / categoria / status). En la version v1.10 vive cerca del inicio de la pagina. El patron es:

```
| # | Nombre | Categoria | Status |
| 1 | organization | Plataforma — Organizacion | Implementado |
| 2 | institution | ... | ... |
...
```

Extraerla via grep/python con `re.compile(r'\| \d+ \| ')` desde el cache. Comparar contra la tabla maestra de [INDEX.md](INDEX.md):

- **Objetos nuevos** (no estaban en el snapshot anterior): registrar.
- **Objetos eliminados** (estaban antes, ya no): registrar.
- **Cambios de status** (ej. Draft → En implementacion): registrar.
- **Cambios de categoria**: registrar.

### Paso 4 — Identificar Tier para el nuevo sprint

Pedir al dev humano (o leer del ticket DKC del sprint) que objetos estan **en scope SP(N)** — esos son Tier 1.

Aplicar el resto de los tiers automaticamente con esta heuristica:
- **Tier 1**: objetos en scope del sprint (input del dev).
- **Tier 2**: objetos con FK directa o polimorfica hacia Tier 1, O objetos ya implementados en codigo que se referencian. Listar candidatos a partir del cache de Confluence (buscar `FK →` y los enums `scopeType` / `entityType` / `ownerType` / `targetType`).
- **Tier 3**: resto.

Si el LLM no tiene seguridad de algun Tier 2, **preguntar al dev** antes de asignar.

### Paso 5 — Generar nuevo snapshot

Crear archivo `snapshot-sp<N>-<YYYY-MM-DD>.md` con:

**Frontmatter:**
```yaml
---
id: SPEC-la-objects-model-snapshot-sp<N>
project: up1
type: spec
module: learning-assurance
category: objects-model
status: snapshot
sprint: SP<N>
sprint_start_date: <YYYY-MM-DD>
snapshot_basis: "modelo objetivo SP<N> segun Confluence <model_version> vigente al inicio del sprint"
confluence_id: "2038366242"
confluence_url: https://u-planner.atlassian.net/wiki/spaces/uP1/pages/2038366242
confluence_page_version: <N>
model_version: "<vX.Y>"
model_version_date: <YYYY-MM-DD>
extraction_date: <YYYY-MM-DD>
extracted_by: <nombre del dev>
autor: Esteban Cortes Sandoval
supersedes_snapshot: snapshot-sp<N-1>-<fecha-previa>.md
tags: [learning-assurance, modelo-objetos, snapshot, sprint-SP<N>, confluence-<vX.Y>]
---
```

**Cuerpo en 3 secciones (no negociables):**

1. **Tier 1 — Objetos en scope del sprint**: definicion completa verbatim de Confluence para cada objeto. Incluir:
   - Definicion / descripcion
   - Tabla de Campos con columnas `Campo | Tipo | Requerido | Notas` (verbatim)
   - Constraints y unique compuestos
   - Decisiones de diseño (citas verbatim de la pagina cuando relevante)
   - **Decisiones locales del sprint** (decisiones del dev que aplican al snapshot — ej. enum vs string, naming, default values del seed). Estas vienen del ticket DKC del sprint, no de Confluence.

2. **Tier 2 — Objetos referenciados / adyacentes**: tabla con columnas `Objeto | Status | Campos principales (no exhaustivo) | Por que nos importa`. Una fila por objeto Tier 2.

3. **Tier 3 — Resto del catalogo**: tabla con columnas `Objeto | Status | # campos | Ultima version con cambio | Link verbatim`. Una fila por objeto Tier 3 (con link al cache de la pagina o URL Confluence).

### Paso 6 — Actualizar CHANGELOG.md

- **Anadir entrada en "Tabla Versión"** si `model_version` cambio. Copiar verbatim de la tabla "Versión" de la pagina Confluence.
- **Anadir columna(s) en "Evolucion por objeto cross-version"** con la nueva version. Por cada objeto:
  - Si cambio: registrar el delta (`+ campo`, `– campo`, `rename`, etc.)
  - Si no cambio: `exists`
  - Si es nuevo: `NEW (descripcion breve)`
- **Anadir seccion "Delta accionable SP<N-1> → SP<N>"** con:
  - Objetos AGREGADOS al scope (anteriormente Tier 3, ahora Tier 1).
  - Objetos MODIFICADOS en scope (cambios que requieren codigo).
  - Cambios NO ABORDADOS (deuda → ticket de homologacion futuro).
  - Cada item con su ticket DKC asociado.
- **Anadir entrada en "Historial de actualizaciones de este CHANGELOG"** al final.

### Paso 7 — Actualizar INDEX.md

- **Tabla maestra de los 30 objetos**:
  - Actualizar columna `Status Confluence` segun la tabla general extraida en Paso 3.
  - Actualizar columnas `Tier SP<N>` para todos los objetos.
  - Actualizar columna `Ticket DKC SP<N>` con los IDs de tickets del nuevo sprint.
  - Si hay objetos nuevos en Confluence, agregar filas. Si hay eliminados, marcar y mover a tabla "Objetos retirados" (crear si no existe).
- **Tabla "Sprints documentados"**: agregar fila para SP<N>.
- **Resumen por tier (SP<N>)**: actualizar conteos.
- Actualizar `last_updated` en frontmatter.

### Paso 8 — Cross-references

- Si hay tickets DKC del sprint nuevo que mencionan Confluence v1.X anterior, **NO modificarlos** — los tickets son inmutables al cerrar. El nuevo snapshot es el referente del nuevo sprint.
- Si el sprint vigente sigue abierto y hay tickets en `in_progress`: actualizar el ticket activo con una entrada en su seccion `## Sessions` notificando que el snapshot del sprint cambio (si aplica).

### Paso 9 — Validacion post-update

Antes de cerrar la actualizacion, verificar:

- [ ] Snapshot SP<N> generado y tiene los 3 tiers separados.
- [ ] CHANGELOG actualizado con bitacora Confluence + cross-version + delta accionable.
- [ ] INDEX actualizado con tabla maestra y resumen por tier.
- [ ] Frontmatter de los tres archivos modificados tiene `last_updated` con fecha de hoy.
- [ ] Snapshot anterior NO se toco (regla de inmutabilidad).
- [ ] Indexacion en deckard via `dkc_index_record` para los 3 archivos modificados.

Si alguna verificacion falla: deshacer y reportar al dev.

### Paso 10 — Reportar al dev

Formato de output esperado del LLM al terminar:

```markdown
## Update modelo de objetos LA — SP<N> completado

### Cambios detectados
- Page version Confluence: <antes> → <despues>
- Model version: <antes> → <despues> (<X cambios listados en la tabla Versión>)

### Snapshot generado
- [snapshot-sp<N>-<fecha>.md](snapshot-sp<N>-<fecha>.md)
- Tier 1: <N> objetos — <lista>
- Tier 2: <N> objetos
- Tier 3: <N> objetos

### Cambios accionables para SP<N>
- AGREGADOS: <N> objetos (ver CHANGELOG seccion "Delta accionable")
- MODIFICADOS: <N> objetos
- DEUDA NUEVA: <N> findings (ver CHANGELOG seccion "Cambios NO ABORDADOS")

### Archivos modificados
- INDEX.md (tabla maestra + sprints documentados + resumen por tier)
- CHANGELOG.md (3 secciones nuevas)
- snapshot-sp<N>-<fecha>.md (nuevo, inmutable)

### Verificacion post-update
- [x] Snapshots anteriores intactos
- [x] Reindexado en deckard
- [x] Cross-references al sprint vigente OK

### Pregunta pendiente al dev
<si quedan tier 2 inciertos o decisiones locales que aplicar al snapshot>
```

---

## Reglas del modelo (extracto de [INDEX.md](INDEX.md))

Las reglas que debe aplicar el LLM durante el update — no negociables:

1. **Snapshots inmutables**. Nunca reescribir un snapshot ya creado. Para corregir typo: `**Erratum YYYY-MM-DD**: ...` inline.
2. **Convencion camelCase** en valores polimorficos (`scopeType`, `entityType`, `ownerType`, `targetType`, `sourceType`): `activity`, `curriculumPlan`, etc. NO PascalCase, NO snake_case.
3. **Citas verbatim** de campos: dejar en formato tabla `Campo | Tipo | Requerido | Notas` con backticks alrededor del nombre del campo.
4. **No inventar campos**. Si Confluence no lo declara, no incluirlo. Decisiones locales del sprint van en seccion separada "Decisiones locales del sprint".
5. **Tres tiers obligatorios** en cada snapshot. Si Tier 2 o Tier 3 quedan vacios para algun sprint, dejar la seccion presente con nota "Sin objetos en este tier para este sprint".
6. **Tracking cross-version completo**: cada objeto del catalogo (30 en v1.10) debe tener una fila en la tabla "Evolucion por objeto cross-version" del CHANGELOG, aunque no haya cambiado.
7. **No tocar tickets DKC** del sprint anterior. Los tickets son inmutables al cerrar. El snapshot nuevo es el referente del sprint nuevo.

---

## Casos especiales

### Caso A — Confluence no cambio (page_version igual o solo +1 sin nueva fila en Versión)

No generar snapshot nuevo. Documentar en CHANGELOG la fecha de la verificacion y anotar "Sin cambios estructurales — solo correcciones menores". Si el sprint vigente NO requiere snapshot porque no cambia el modelo, mantener el snapshot anterior como referente.

### Caso B — Objeto eliminado del catalogo Confluence

Marcar en INDEX.md con strikethrough y mover a tabla "Objetos retirados" (crear si no existe). En CHANGELOG, agregar entrada explicita: "v<X.Y>: objeto `<nombre>` retirado del modelo. Motivo: <citado de Confluence>". Si el objeto estaba implementado en codigo: alertar al dev — requiere ticket de deprecation.

### Caso C — Campo crucial cambia tipo o constraint en un objeto Tier 1 del sprint vigente

Esto es **bloqueante** — el snapshot nuevo debe regenerarse, pero el ticket vigente puede estar en ejecucion. Alertar al dev explicitamente:

> ATENCION: Confluence v<X.Y> cambio el campo `<X>` del objeto `<Y>` (Tier 1 SP<N> activo). Cambio: <descripcion>. El snapshot nuevo refleja el cambio. El ticket DKC <T-XXX> podria necesitar ajuste de design o implementacion. Decidir si: (a) implementar segun snapshot nuevo, (b) implementar segun snapshot del inicio del sprint y diferir el cambio a SP<N+1>, (c) re-disenar.

### Caso D — Page version subio pero "Tabla Versión" no se actualizo

Posible inconsistencia en Confluence (correcciones menores sin bump de model_version). Documentar en CHANGELOG la inconsistencia, mantener `model_version` del snapshot anterior, no generar snapshot nuevo a menos que el dev lo pida explicito.

### Caso E — Conflicto entre la tabla "Versión" de Confluence y los objetos visibles

Si la tabla "Versión" dice "v1.X agrego campo `purpose`" pero el objeto `activity` en la pagina NO tiene `purpose` documentado, alertar al dev — la pagina canonica esta inconsistente, no avanzar con el snapshot hasta resolverlo via Esteban Cortes.

---

## Comando rapido (TL;DR para humanos)

```bash
# 1. Estar en el directorio
cd /Users/edobacon/Workspace/uplanner/specs/up1/learning-assurance/objects-model/

# 2. Decir a Claude Code:
# "Ejecuta el procedimiento de UPDATE.md para el sprint SP<N>"
# Claude leera este archivo, conectara MCP atlassian, traera la nueva version,
# generara el snapshot y actualizara INDEX + CHANGELOG.

# 3. Revisar el diff antes de commitear
git diff INDEX.md CHANGELOG.md
git status
```

---

## Historial de cambios a este procedimiento

| Fecha | Cambio | Por |
|-------|--------|-----|
| 2026-05-13 | Creacion inicial. Procedimiento de 10 pasos. Reglas del modelo. 5 casos especiales (A-E). | Eduardo Bacon + Deckard Cain (via Claude Code) |
