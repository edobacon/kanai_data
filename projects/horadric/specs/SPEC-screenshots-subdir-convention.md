---
id: SPEC-screenshots-subdir-convention
project: horadric
ticket: HOR-007
status: done
---

# Screenshots en subdir `{ticketId}.screenshots/` — convencion nueva + migracion horadric + consumer-adapts legacy

# Screenshots en subdir `{ticketId}.screenshots/` — convencion nueva + migracion horadric + consumer-adapts legacy

## Purpose

La convencion actual (PNGs loose junto al `.md` del ticket, 37 archivos en `projects/horadric/tickets/` raiz) ensucia la navegacion de filesystem y git. Esta spec formaliza la nueva convencion `{ticketId}.screenshots/{nombre}.png` — analoga a `.draft/` y `.snapshots/` ya existentes — actualiza deckard-core (`~/.claude/CLAUDE.md` y template) para que aplique hacia adelante, extiende el server de horadric-cube para soportar AMBOS paths (subdir preferido + loose como fallback legacy), y migra los 37 PNGs de horadric en un solo commit. Bayley/up1 NO se migran — quedan como legacy tolerado (RULE-index-001 consumer-adapts).

Ver ticket [HOR-007](../tickets/HOR-007.md) para diagnostico + evidencia + triage.

## Current state

### Fixed (comportamiento actual)

- **Filesystem**: `projects/{project}/tickets/` contiene `.md` del ticket + PNGs loose + carpetas `.draft/` y `.snapshots/`. En horadric, 37 PNGs loose saturan la carpeta.
- **CLAUDE.md global** (`~/.claude/CLAUDE.md:39`): "Screenshots Playwright: `screenshots/` salvo en documentacion de tickets (junto al `.md`, nombres descriptivos)."
- **Server** (`horadric-cube/server/deckard/assets.ts`): `enumerateTicketAssets` solo enumera loose con pattern `{ticketId}-*.{png|jpg|jpeg|webp|svg}`. `resolveAssetPath` lookup en `tickets/{filename}`.
- **Template ticket** (`templates/records/ticket.md:174`): ejemplo generico `screenshots/403.png`.

### Pain

- Navegar `ls tickets/` es ruidoso — en horadric, 37 PNGs + `.md` + subdirs se mezclan sin jerarquia visual.
- Git diff de un ticket nuevo incluye todos los PNGs loose en el mismo directorio que otros tickets.
- Nuevos contribuidores tienen que aprender que los PNGs "pertenecen" al ticket por prefix de filename, no por containerizacion fisica.

## Desired state

- **Filesystem**: `projects/{project}/tickets/{ticketId}.screenshots/{ticketId}-foo.png` como default para nuevos screenshots. Loose legacy tolerado sin migracion forzada.
- **CLAUDE.md global**: actualizado — subdir como preferido + mencion de consumer-adapts para legacy.
- **Server**: `enumerateTicketAssets` busca en AMBOS (subdir preferido, loose fallback). `resolveAssetPath` lookup con el mismo orden. Unica superficie del viewer cambia el campo `path` del asset (ahora puede ser `HOR-001.screenshots/foo.png` o `HOR-001-foo.png`).
- **Horadric migrado**: 37 PNGs distribuidos en 4 subdirs (HOR-001, HOR-002, HOR-005, HOR-006). Markdowns de los tickets **no se editan** — los links `[foo.png](foo.png)` siguen resolviendo via consumer-adapts.

## Delta

- **Antes**: discovery solo loose; convencion unica; 37 PNGs saturan `tickets/`
- **Despues**: discovery dual (subdir + loose); convencion nueva preferida + legacy tolerada; horadric limpio, bayley/up1 intactos
- **Alcance**: solo HC server + deckard-core (convencion) + horadric filesystem. **NO**: markdown de tickets (no se editan), bayley/up1 migracion, UI/tabs, `markdownImageHook` (sigue emitiendo paths relativos — el server resuelve dónde vive el archivo)

## Requirements

### REQ-IMPROVE-01: Server descubre screenshots en subdir `{ticketId}.screenshots/` ademas de loose

El sistema MUST enumerar screenshots en AMBOS paths — subdir preferido (nuevo), loose legacy (fallback) — sin duplicados y sin romper el orden estable de la lista.

#### Scenario: ticket solo con subdir (post-migracion)
- **GIVEN** `HOR-001.screenshots/HOR-001-fase3-home.png` + 12 mas dentro del subdir; cero PNGs loose
- **WHEN** GET `/api/projects/horadric/tickets/HOR-001/assets`
- **THEN** lista 13 screenshots con `path` = `HOR-001.screenshots/HOR-001-*.png`

#### Scenario: ticket solo con loose (legacy sin migrar)
- **GIVEN** `BLY-020-foo.png` loose en bayley/tickets; sin subdir
- **WHEN** GET `/api/projects/bayley/tickets/BLY-020/assets`
- **THEN** lista 1 screenshot con `path` = `BLY-020-foo.png`

#### Scenario: ticket mixto (subdir + legacy — raro pero posible durante migracion parcial)
- **GIVEN** ticket con 5 PNGs en subdir + 2 PNGs loose
- **WHEN** GET assets
- **THEN** lista 7 screenshots, subdir primero, loose despues — sin duplicados

### REQ-IMPROVE-02: Endpoint raw sirve archivos en ambos paths

El sistema MUST resolver `GET /assets/screenshot/:filename` buscando primero en `{ticketId}.screenshots/{filename}`, fallback a `tickets/{filename}` (loose).

#### Scenario: archivo en subdir
- **GIVEN** migrado `HOR-001.screenshots/HOR-001-fase3-home.png`
- **WHEN** GET `/api/projects/horadric/tickets/HOR-001/assets/screenshot/HOR-001-fase3-home.png`
- **THEN** 200 con `image/png`; bytes del archivo en subdir

#### Scenario: archivo loose legacy
- **GIVEN** `BLY-020-foo.png` loose (no migrado)
- **WHEN** GET raw
- **THEN** 200 con `image/png`; bytes del archivo loose

### REQ-IMPROVE-03: Horadric migrado — 37 PNGs distribuidos en 4 subdirs

El sistema MUST tener:
- `projects/horadric/tickets/HOR-001.screenshots/` con 13 PNGs
- `projects/horadric/tickets/HOR-002.screenshots/` con 11 PNGs
- `projects/horadric/tickets/HOR-005.screenshots/` con 8 PNGs
- `projects/horadric/tickets/HOR-006.screenshots/` con 5 PNGs
- `projects/horadric/tickets/` raiz: SOLO `.md` de tickets + carpetas `.draft/` `.snapshots/` `.screenshots/`. Cero PNG loose.

El `git mv` preserva historial (renames detectados automaticamente por git).

### REQ-IMPROVE-04: CLAUDE.md global + template actualizados

El sistema MUST tener:
- `~/.claude/CLAUDE.md:39` con la convencion nueva como preferida + mencion de consumer-adapts para legacy.
- `templates/records/ticket.md:174` ejemplo actualizado al nuevo patron.

### REQ-PRESERVE-01: Tickets legacy loose siguen funcionando (RULE-index-001)

El sistema MUST mantener el discovery y el raw endpoint funcionales para tickets que NO se migraron. Bayley y up1 no se tocan — sus PNGs loose (si los hay) se descubren y sirven igual que hoy.

### REQ-PRESERVE-02: Markdown de tickets migrados sin editar

El sistema MUST permitir que los markdown de HOR-001/002/005/006 sigan usando links `[foo.png](foo.png)` o menciones en texto plano `HOR-xxx-foo.png` SIN edicion despues de la migracion. El consumer-adapts del server + `resolveAssetUrl` del hook se encargan de resolver la URL correcta.

#### Scenario: link markdown post-migracion
- **GIVEN** HOR-002.md con `[HOR-002-f1-loader.png](HOR-002-f1-loader.png)`; archivo ahora en `HOR-002.screenshots/HOR-002-f1-loader.png`
- **WHEN** viewer renderiza la tab Testing
- **THEN** chip `.ss-inline` con href hacia `/api/projects/horadric/tickets/HOR-002/assets/screenshot/HOR-002-f1-loader.png` — endpoint resuelve al subdir → 200

### REQ-PRESERVE-03: Chips + lightbox visualmente identicos

El sistema MUST mostrar los chips y el lightbox identicos antes y despues del cambio. Ningun componente Vue cambia. Ninguna URL visible del viewer cambia (los paths del API son los mismos — solo cambia dónde vive el archivo fisico en el servidor).

### REQ-PRESERVE-04: 78 tests baseline siguen pasando

El sistema MUST mantener los 78 tests existentes de horadric-cube pasando. Tests que hardcodeen paths loose (ej `assets.test.ts` que cuenta `HOR-001-*.png` loose) deben adaptarse al path nuevo SIN perder cobertura.

## Non-functional requirements

| Tipo | Requirement | Metrica | Target |
|---|---|---|---|
| Observability | Tests totales sin regresion | `npm test` | 78+ pass, 0 fail |
| Performance (discovery) | `enumerateTicketAssets` en ticket con ambos paths | tiempo p95 | < 10ms (dos lecturas de dir en vez de una — trivial) |
| Filesystem | Ruido en `tickets/` de horadric | conteo `ls tickets/*.png` | 37 → 0 |

## Artifacts

### Changes — server (`horadric-cube/server/deckard/assets.ts`)

| Aspecto | Antes | Despues | Por que |
|---|---|---|---|
| `enumerateTicketAssets` | Escanea solo `ticketsDir`, filtra por prefix | Escanea `ticketsDir/{ticketId}.screenshots/` (preferido) + `ticketsDir` con prefix (legacy) — concat sin duplicados | REQ-IMPROVE-01 |
| `path` del `ScreenshotAsset` | Siempre `{ticketId}-foo.png` | `{ticketId}.screenshots/{ticketId}-foo.png` o legacy `{ticketId}-foo.png` | REQ-IMPROVE-01 |

### Changes — server (`horadric-cube/server/routes/assets.ts`)

| Aspecto | Antes | Despues |
|---|---|---|
| `resolveAssetPath` kind=screenshot | `join(ticketsDir, filename)` | Buscar primero en `{ticketId}.screenshots/{filename}`, fallback a `tickets/{filename}` con `existsSync` |

### Changes — deckard-core

| File | Change |
|---|---|
| `~/.claude/CLAUDE.md:39` | "Screenshots Playwright: `screenshots/` salvo en documentacion de tickets, donde viven en `tickets/{ticketId}.screenshots/` (la raiz acepta PNGs legacy loose por consumer-adapts, pero nuevas capturas van al subdir). Nombres descriptivos: `{ticketId}-{descripcion}.png`." |
| `templates/records/ticket.md:174` | Ejemplo actualizado: `screenshot ({ticketId}.screenshots/HOR-001-fase3.png)` |

### Migration

```bash
cd /Users/edobacon/Workspace/deckard/projects/horadric/tickets
for id in HOR-001 HOR-002 HOR-005 HOR-006; do
  mkdir -p "${id}.screenshots"
  git mv ${id}-*.png "${id}.screenshots/"
done
```

## Tasks

| # | Task | Agent | Depends on | Files | Validation | Status | Session | Rules | Rollback | source_ref |
| --- | ------ | ------- | ------------ | ------- | ------------ | -------- | --------- | --- | --- | --- |
| 1 | Baseline: `npm test`, `npm run build`, `ls tickets/*.png` count (37) | researcher | — | — | evidencia capturada | **done** | #2 | — | — | — |
| 2 | HC server: extender `enumerateTicketAssets` (subdir + loose, sin duplicados) + tests actualizados | developer | #1 | `server/deckard/assets.ts`, `server/deckard/assets.test.ts` | unit test pass; HOR-001 no migrado todavia sigue devolviendo 13 assets loose | **done** | #2 | — | — | — |
| 3 | HC server: `resolveAssetPath` kind=screenshot busca subdir primero, loose fallback + integration tests | developer | #2 | `server/routes/assets.ts`, `server/routes/assets.test.ts` | integration test: subdir fixture (crear HOR-007.screenshots/ mock) + loose BLY-xxx; ambos 200 | **done** | #2 | — | — | — |
| 4 | Migracion: `git mv` de 37 PNGs a 4 subdirs en horadric | developer | #2, #3 | filesystem | `ls tickets/*.png \ | wc -l` = 0; cada `{ticketId}.screenshots/` tiene el count esperado | **done** | #2 | — | — | — |
| 5 | DKC: actualizar CLAUDE.md global + template ticket + verificar que prompts sin cambios | developer | — | `~/.claude/CLAUDE.md`, `templates/records/ticket.md` | grep confirma texto nuevo; grep de prompts confirma que `request-close.md` sigue generico | **done** | #2 | — | — | — |
| 6 | Validacion visual chrome-devtools: HOR-001/002/005/006 (migrados) + BLY-001 (no-migrado) + endpoint raw check | reviewer | #3, #4 | — | chips funcionan en ambos tipos de ticket; fetch a chips devuelve 200; screenshots de evidencia | **done** | #2 | — | — | — |
| 7 | Regression final + update Testing del ticket + commits | scribe | #6 | ticket + spec | `npm test` >= 78 pass; ticket cumple gate de close | **done** | #2 | — | — | — |

### Task contract detalle

```
Task #1: Baseline
- source_ref: NFR-observability + REQ-IMPROVE-03
- agent: researcher
- files: —
- expected_output: npm test output, bundle sizes, conteo `ls tickets/*.png` = 37
- validation: evidencia capturada en ticket
- rollback: N/A
- rules: [1, 11, 13]

Task #2: enumerateTicketAssets dual-path
- source_ref: REQ-IMPROVE-01, REQ-PRESERVE-01
- agent: developer
- files: server/deckard/assets.ts, server/deckard/assets.test.ts
- precondition: #1
- expected_output: funcion enumera subdir primero (si existe) luego loose (sin duplicar si ambos existen con mismo filename — dedup por filename). Path del asset refleja donde vive.
- validation: tests unit cubren: solo subdir, solo loose, mixto, ninguno (empty). 5 tests deckard actuales + nuevos pasan.
- rollback: revertir commit (sin efecto en archivos, solo codigo)
- rules: [5, 8, 10, 11, 16]

Task #3: resolveAssetPath dual-path + integration tests
- source_ref: REQ-IMPROVE-02, REQ-PRESERVE-01
- agent: developer
- files: server/routes/assets.ts, server/routes/assets.test.ts
- precondition: #2
- expected_output: GET /assets/screenshot/:filename busca subdir primero via existsSync, fallback a loose. Integration tests cubren ambos.
- validation: integration tests: 13 routes actuales + fixture subdir + fixture loose, todos pasan.
- rollback: revertir commit
- rules: [5, 8, 10, 11, 16]

Task #4: Migracion horadric
- source_ref: REQ-IMPROVE-03
- agent: developer
- files: filesystem (37 PNGs movidos)
- precondition: #2, #3 (el server YA soporta ambos paths — si se migra sin el server listo, el viewer rompe temporalmente)
- expected_output: 4 subdirs creados con counts correctos (HOR-001:13, HOR-002:11, HOR-005:8, HOR-006:5). Raiz `tickets/*.png` = 0.
- validation: `ls tickets/ | grep '\.png$'` vacio; `ls tickets/HOR-00N.screenshots/ | wc -l` coincide por ticket.
- rollback: `git reset --hard` + `git checkout HEAD~ -- projects/horadric/tickets/` revierte todos los renames.
- rules: [5, 8, 10, 11, 16]

Task #5: DKC — CLAUDE.md global + template
- source_ref: REQ-IMPROVE-04
- agent: developer
- files: ~/.claude/CLAUDE.md, templates/records/ticket.md
- precondition: — (paralela a #2-4)
- expected_output: texto actualizado. Comentario commit menciona cambio retroactivo.
- validation: grep del nuevo texto en ambos files.
- rollback: git revert.
- rules: [2, 8, 16]

Task #6: Validacion visual
- source_ref: REQ-PRESERVE-02, REQ-PRESERVE-03
- agent: reviewer
- files: — (genera screenshots en nuevo subdir `HOR-007.screenshots/`)
- precondition: #3, #4
- expected_output: screenshots de HOR-001 migrado (chips funcionando), HOR-002 Testing (7 chips), BLY-001 (legacy sin cambios). Screenshots viven en `HOR-007.screenshots/` (dogfooding).
- validation: 0 errors de consola; fetch a href de chip → 200 image/png para subdir y loose.
- rollback: N/A
- rules: [4, 7, 13, 14]

Task #7: Regression + close
- source_ref: REQ-PRESERVE-04
- agent: scribe
- files: projects/horadric/tickets/HOR-007.md, projects/horadric/specs/SPEC-screenshots-subdir-convention.md
- precondition: #6
- expected_output: npm test final >= 78 pass; ticket con Summary + Testing actualizado; spec status=done; commits preparados.
- validation: gate de close satisfecho.
- rollback: N/A
- rules: [2, 13]
```

## Constraints

- **RULE-index-001** (must): consumer se adapta, no se migran .md historicos. Aplica directamente: server soporta ambos paths; bayley/up1 NO migrados; markdown de tickets horadric migrados NO se edita.
- **RULE-viewer-assets-context-001** (must): el comportamiento del viewer (chips inline con contexto) es invariante del cambio. Se respeta automaticamente.
- **RULE-server-frontmatter-legacy-001** (must): patron paralelo a consumer-adapts. Valida que el principio "campos/paths nuevos opcionales, viejos tolerados" es consistente en el proyecto.

## Dependencies

- **SPEC-viewer-ticket-assets** (HOR-005, done): `TicketAsset.kind=screenshot` y endpoints definidos ahi. HOR-007 extiende el implementation detail, no cambia el contract del tipo ni del API.
- **SPEC-viewer-links-fix** (HOR-006, done): `resolveAssetUrl` con prefix inference. Sigue funcionando sin cambios — el prefix del filename sobrevive al mover al subdir (DEC-LOCAL-01 de este spec).

## Risks and mitigations

| Risk | Probability | Impact | Mitigation |
|---|---|---|---|
| Migracion (task #4) ejecutada antes de server listo → viewer roto durante ventana | medium | high | Orden estricto: #2, #3 antes que #4. Se garantiza que el server soporta subdir antes de mover archivos. Rollback via git revert es trivial. |
| Filename colisionando entre subdir y loose (si alguien tuvo archivo duplicado) | low | medium | Dedup por filename en `enumerateTicketAssets` (subdir gana). Verificar pre-migracion que no hay colisiones (imposible porque los loose se mueven, no se copian). |
| Tests existentes hardcodean path loose (`HOR-001-*.png` en raiz) | high | medium | Task #2 adapta el test de `assets.test.ts` para esperar el path nuevo (post-migracion). Detectado en task #1 baseline; fixed en task #2. |
| `git mv` no detecta rename si modificamos contenido — no aplica aqui (no se edita) | low | low | Git auto-detecta rename al `git mv`; sin modificacion de contenido, el historial se preserva intacto. |
| Mermaid chunks / bundle size afectado | low | low | Cambios solo en server + convencion — bundle del frontend no cambia (0 impacto). |

## Open questions

Ninguna bloqueante. Decisiones documentadas como DEC-LOCAL.

## Decisions

### DEC-LOCAL-01: Mantener prefix `{ticketId}-` en filename aun dentro del subdir
- **Contexto**: ¿`HOR-001.screenshots/fase3-home.png` o `HOR-001.screenshots/HOR-001-fase3-home.png`?
- **Drivers**: preservar `resolveAssetUrl` inference de owner por prefix (HOR-006); portabilidad del archivo si se copia fuera del subdir
- **Opcion elegida**: mantener prefix
- **Alternativas**: filename sin prefix (descartada: rompe inference cross-ticket; reduce portabilidad)
- **Consecuencias**: duplica info (ticketId en dir + filename) pero gana robustez

### DEC-LOCAL-02: Consumer-adapts para legacy, no migracion forzada
- **Contexto**: ¿migrar bayley/up1 tambien, o dejar solo horadric?
- **Drivers**: RULE-index-001 ya establece el principio; usuario pidio migrar horadric como piloto; bayley/up1 no necesitan cambio para seguir funcionando
- **Opcion elegida**: solo horadric migra; bayley/up1 legacy tolerado
- **Alternativas**: migracion global (descartada: sobre-compromiso; viola RULE-index-001); no migrar (descartada: el usuario explicitamente pidio reducir ruido en horadric)
- **Consecuencias**: consistencia por proyecto; server implementa dual-path permanentemente (no es migracion transitoria)

### DEC-LOCAL-03: Orden server-first → migrate → docs
- **Contexto**: ¿migrar archivos primero o server primero?
- **Drivers**: evitar ventana donde el viewer rompe (si archivos se mueven sin server listo, los chips 404)
- **Opcion elegida**: server #2 + #3 → migracion #4 → docs #5
- **Alternativas**: migracion primero (descartada: ventana rota); paralelo (descartada: dependencia de test fixture)
- **Consecuencias**: rollback trivial en cualquier punto; commits intermedios siguen dejando sistema funcional

## Success metrics

N/A para improvement de este tipo — success es "el filesystem de horadric queda limpio + el viewer funciona identico". Metricas medibles en NFR.

## Technical reference

### Estructura de filesystem post-migracion

```
projects/horadric/tickets/
├── HOR-001.md
├── HOR-001.screenshots/
│   ├── HOR-001-fase3-detail-stub.png
│   ├── HOR-001-fase3-home.png
│   └── ... (13 PNGs)
├── HOR-002.md
├── HOR-002.screenshots/ ... (11 PNGs)
├── HOR-003.md
├── HOR-003.snapshots/ (ya existe — JSON fixtures de tests, no screenshots)
├── HOR-004.md
├── HOR-005.md
├── HOR-005.draft/
├── HOR-005.screenshots/ ... (8 PNGs)
├── HOR-006.md
├── HOR-006.screenshots/ ... (5 PNGs)
└── HOR-007.md (este ticket)
```

### Logica de `enumerateTicketAssets` post-fix

```typescript
function collectScreenshots(ticketsDir: string, ticketId: string): ScreenshotAsset[] {
  const seen = new Set<string>()
  const out: ScreenshotAsset[] = []

  const subdir = join(ticketsDir, `${ticketId}.screenshots`)
  if (existsSync(subdir) && statSync(subdir).isDirectory()) {
    for (const entry of readdirSync(subdir, { withFileTypes: true })) {
      if (!entry.isFile()) continue
      const asset = toScreenshotAsset(subdir, entry.name, `${ticketId}.screenshots/${entry.name}`)
      if (asset && !seen.has(asset.filename)) {
        out.push(asset)
        seen.add(asset.filename)
      }
    }
  }

  const prefix = `${ticketId}-`
  for (const entry of readdirSync(ticketsDir, { withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.startsWith(prefix)) continue
    const asset = toScreenshotAsset(ticketsDir, entry.name, entry.name)
    if (asset && !seen.has(asset.filename)) {
      out.push(asset)
      seen.add(asset.filename)
    }
  }

  return out
}
```

## Rules discovered

{se llena durante execute si aparece}

## Bugs found

{se llena si aplica}

## Acceptance checkpoints

- [ ] **Funcional**: REQ-IMPROVE-01..04 + REQ-PRESERVE-01..04 con scenarios validados
- [ ] **Tests**: 78+ pass (baseline post-HOR-006 + adaptaciones); 0 fail
- [ ] **Filesystem**: horadric/tickets raiz sin PNG loose; 4 subdirs con counts correctos
- [ ] **Rules**: RULE-index-001, RULE-viewer-assets-context-001 respetadas
- [ ] **Integration**: HOR-001/002/005/006 migrados + HOR-007 (dogfooding) + BLY-001 (legacy) renderizan sin regresion
- [ ] **Docs**: ticket + spec al dia; commits preparados con mensaje claro
