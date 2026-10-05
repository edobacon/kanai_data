# Qué sobrevive a un rearme de la DB: medido, no supuesto

Revisión previa: 2026-10-05 (sospecha). **Medición con rearme real: 2026-10-05.** Este documento se corrige
con los datos: la revisión previa afirmaba que `autopilot` sobrevivía por estar en el frontmatter, y la
medición muestra que eso **solo vale para los proyectos que se re-migran desde DKC**.

## Cómo se midió (sobre una COPIA, nunca sobre el vivo)

1. Copia del store a `/tmp/kanai-rearme-XeYx4E`, con la DB tomada por `sqlite3 .backup` (snapshot consistente
   con el WAL activo) + `projects/`, `teach/`, `events.ndjson`.
2. Verificación previa de la ruta destino: `{ repo: null, root: /tmp/kanai-rearme-XeYx4E, dbPath: .../kanai.db }`
   — el rearme apuntaba a la copia, no al store vivo.
3. `KANAI_DATA_ROOT=<copia> KANAI_DATA_REPO= pnpm db:rebuild --fresh` → `rebuild OK`, cuarentena 0.

## El resultado

| Pieza | ¿Sobrevive al `--fresh`? | Dato |
|---|---|---|
| **Casos inline y planes** | **Sí** | Son archivos del data repo (`case.md`, `plan.md`, `plan.yaml`, `kb/`, logs) |
| **Esquema (migraciones)** | **Sí** | Archivos versionados; el `--fresh` las aplica |
| **Tickets (el conjunto)** | **Sí** | 606 antes y 606 después, los 606 ids presentes |
| **`autopilot`** | **Solo a medias** | 51 tickets cambian (48 `autonomous`→`manual`, 3 `per_session`→`manual`) |
| **`teachPolicy` / `draftPolicy` / `reviewPolicy`** | **NO** | 56 tickets no-default antes → **0** después: todas a `ask`/`ask`/`auto`, en silencio |

### El `autopilot` depende del origen del proyecto, no del texto

- **Proyectos nativos de Kanai** (sin carpeta DKC: `taomangalam`, `kn_bench`, `kanai_self`, `kanai_test`): se
  reconstruyen **solo** desde el texto y pierden el `autopilot` el **100%** (40 de 40: taomangalam 37/37,
  kn_bench 2/2, kanai_self 1/1).
- **Proyectos con carpeta en `~/Workspace/deckard/projects`** (`jormat-evolution`, `up1`, `horadric`, `pehuen`):
  el `--fresh` los **re-migra desde DKC** y por eso recuperan el valor (jormat 113/116, up1 75/79, horadric
  39/39, pehuen 22/23). No lo recuperan del texto de Kanai.

O sea: **el data repo de Kanai no es autosuficiente para reproducir su propio estado** en los proyectos que no
tienen DKC detrás. Y eso incluye a `taomangalam`, uno de los proyectos vivos del piloto.

## La causa raíz (doble)

1. **Ida:** `server/engine/render.ts:41` escribe en el frontmatter **solo** `autopilot`
   (`autopilot: ${t.autopilot}`). `teachPolicy`, `draftPolicy` y `reviewPolicy` nunca llegan al texto.
2. **Vuelta:** `server/migrate-up1/parse.ts:514` hace
   `autopilot: AUTOPILOT_MAP[String(fm.autopilot)] ?? 'manual'`, y el mapa solo entiende **claves de DKC**
   (`super`/`strict`/`true`/`manual`). Un `autonomous` o `per_session` nativo no matchea y **cae a `manual`**.
   El round-trip no es idempotente.
3. **Agravante:** `setTicketConfig` (`server/repo/tickets.ts:154`) **no re-renderiza** el `.md` (no llama
   `logTicket`, a diferencia de `setTicketExternal`). Al cambiar la config, el frontmatter queda viejo: aunque
   el campo exista, puede no reflejar el estado real.

## Lo que esto cambia en F1

1. **Materializar la política en el texto es necesario pero NO suficiente.** Escribir `verification_policy`
   en el frontmatter sin que el importador la lea repite el agujero.
2. **Re-renderizar el `.md` al setear la config** (que `setTicketConfig` escriba el ticket como texto).
3. **Que `toTicketInsert` lea la política nueva** al reconstruir desde el texto.
4. **Corregir el mapa de `autopilot`** para que los valores nativos hagan ida y vuelta (hoy se degradan a
   `manual`), y evaluar llevarse también `teach`/`draft`/`review` al frontmatter en el mismo cambio.
5. **La verificación de F1.5 es imprescindible en un proyecto nativo** (p. ej. `kanai_test`), no en uno con DKC:
   en un proyecto con DKC el resultado podría dar "verde" por la re-migración y tapar el hueco.

## Lo que NO está en riesgo

- Los **casos y planes** inline (archivos).
- El **esquema** (migraciones versionadas).
- Los **commits de código**: viven en el repo de código, no en la DB.
- Las **KB docs** de los casos (archivos).
