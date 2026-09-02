---
id: SPEC-viewer-links-fix
project: horadric
ticket: HOR-006
status: done
---

# Fix — links 404 en el viewer (linkify, RECORD_ID en code, text-tokens a imagen)

# Fix — links 404 en el viewer (linkify, RECORD_ID en code, text-tokens a imagen)

## Purpose

Corregir 4 sub-bugs distintos en `useMarkdown.ts` + `markdownImageHook.ts` que producen links 404 masivos en el viewer de horadric-cube. Diagnostico rapido sobre HOR-005 muestra 30+ links rotos solo en un ticket. Causas raiz identificadas en lectura de codigo — fix contenido a 2 archivos + sus tests, sin tocar deckard-core ni convenciones de paths.

Ver ticket [HOR-006](../tickets/HOR-006.md) para reproduccion + evidencia.

## Diagnostico

### Causa raiz por sub-bug

| Sub-bug | Archivo:linea | Causa |
|---|---|---|
| **1. linkify** | [`useMarkdown.ts:61`](../../../../horadric-cube/src/composables/useMarkdown.ts#L61) | `linkify: true` auto-convierte `word.tld`. TLDs validas como `.md`, `.ts`, `.vue` disparan el falso positivo. |
| **2+3. RECORD_ID en filenames y `<code>`** | [`useMarkdown.ts:87`](../../../../horadric-cube/src/composables/useMarkdown.ts#L87) | Guard del replace solo cubre `<a>`. Filenames en backticks quedan dentro de `<code>` sin proteger; regex `\b(HOR\|BLY\|...)(-[A-Za-z0-9_-]+)+\b` matchea prefijo + sufijo hasta antes de `.`. Son el mismo bug (un filename dentro de `<code>` es el caso mas comun del match). |
| **4. text tokens con paths a imagen** | [`markdownImageHook.ts:annotateImages`](../../../../horadric-cube/src/composables/markdownImageHook.ts) | El hook intercepta `image` + `link_open` solamente. Paths en prosa plana no se transforman → RECORD_ID los captura (bug 2) y produce anchors fake. |

### Hipotesis final

| # | Hipotesis | Status |
|---|-----------|--------|
| H1 | linkify genera links a TLDs falsos | ✓ confirmada (chrome-devtools: 16 links en HOR-005) |
| H2 | RECORD_ID matchea filenames con prefijo | ✓ confirmada (14 fake refs en HOR-005 Testing) |
| H3 | Guard actual no cubre `<code>` | ✓ confirmada (lectura de codigo useMarkdown.ts:87) |
| H4 | Hook no procesa text tokens | ✓ confirmada (lectura de markdownImageHook.ts) |
| H5 | `linkify: false` no rompe URLs bare existentes | ✓ confirmada (grep sobre tickets horadric/bayley/up1: 0 URLs bare en prosa) |
| H6 | Chips ya existentes (link/image syntax) siguen funcionando tras fix 2+4 | ? propuesta, validada por orden de core rules |

### Impacto

- **Usuarios**: cualquier dev que abre tickets/specs/rules/decisions en el viewer. Links rotos silenciosos (navegan a URLs 404) erosionan la confianza del producto.
- **Superficie**: TODO markdown renderizado en HC — tickets, specs, rules, decisions, bugs, meta-specs. No solo HOR-005.
- **Modulos afectados**: solo `viewer/composables` de horadric-cube. Cero impacto en server, deckard-core, convenciones.

## Requirements

### REQ-FIX-01: Filenames con forma `word.tld` en prosa no se auto-linkifican

El sistema MUST dejar como texto literal cualquier mencion de filenames o referencias tipo `intent.md`, `CLAUDE.md`, `types.ts`, `config.yaml` en prosa. No generar anchors `http://{tld}/`.

**Actor**: user (dev revisando markdown)
**Layers**: frontend (viewer)

#### Scenario: filename `.md` en prosa
- **GIVEN** markdown con `"ver intent.md para detalles"`
- **WHEN** el viewer renderiza
- **THEN** el HTML resultante contiene la substring `intent.md` como texto
- **AND** el HTML NO contiene `<a href="http://intent.md">`

#### Scenario: URL explicita con sintaxis markdown sigue funcionando
- **GIVEN** markdown con `"[docs](https://example.com)"`
- **WHEN** render
- **THEN** HTML contiene `<a href="https://example.com">docs</a>`

### REQ-FIX-02: Paths a imagen en texto plano se renderizan como chip con lightbox

El sistema MUST detectar paths con extension `.png | .jpg | .jpeg | .webp | .svg` en `text` tokens de markdown-it y transformarlos en `image` tokens — el renderer existente emite el chip `.ss-inline` con `data-ss-src` y `data-ss-caption`. El click abre el `ScreenshotLightbox` singleton (comportamiento ya cubierto por HOR-005).

**Actor**: user
**Layers**: frontend

#### Scenario: path a imagen en prosa
- **GIVEN** markdown `"ver HOR-005-foo.png aqui"`
- **WHEN** render
- **THEN** HTML contiene `<a class="ss-inline" ... data-ss-src="HOR-005-foo.png">...</a>` (1 chip)
- **AND** HTML NO contiene `<a href="/p/{project}/tickets/HOR-005-foo">` (anchor a ticket)

#### Scenario: click en chip abre lightbox
- **GIVEN** chip renderizado desde texto plano
- **WHEN** click
- **THEN** modal `[role="dialog"]` visible con la imagen y caption del contexto padre del text token (tr/li/heading)

#### Scenario: path a archivo NO-imagen no se transforma
- **GIVEN** markdown `"ver package.json aqui"`
- **WHEN** render
- **THEN** HTML contiene `package.json` como texto, sin chip (no es imagen)

### REQ-FIX-03: IDs dentro de `<code>` inline (backticks) no se linkifican

El sistema MUST preservar IDs tipo `HOR-001`, `SPEC-foo`, `RULE-bar` dentro de `<code>` inline como texto literal. El autor que escribio `` `HOR-001` `` con backticks quiere codigo visual, no navegacion.

**Actor**: user
**Layers**: frontend

#### Scenario: ID en backticks
- **GIVEN** markdown `` "ver `HOR-001` para contexto" ``
- **WHEN** render
- **THEN** HTML contiene `<code>HOR-001</code>`
- **AND** dentro del `<code>`, NO hay `<a>` anidado

#### Scenario: ID dentro de fence block (`` ``` ``)
- **GIVEN** fence code block con `"ver HOR-001"` adentro
- **WHEN** render
- **THEN** el HTML del `<pre><code>` contiene `HOR-001` como texto literal sin anchor

### REQ-PRESERVE-01: IDs en texto plano siguen generando anchor

El sistema MUST mantener el comportamiento actual de linkificar IDs escritos en texto plano (sin backticks).

#### Scenario: ID en prosa
- **GIVEN** `"ver HOR-001 para contexto"`
- **WHEN** render
- **THEN** `<a href="/p/{project}/tickets/HOR-001">HOR-001</a>` en HTML

### REQ-PRESERVE-02: URLs con sintaxis markdown siguen funcionando

El sistema MUST renderizar links con sintaxis `[text](url)` y `<url>` sin cambios.

### REQ-PRESERVE-03: Chips existentes del hook siguen funcionando

El sistema MUST preservar los chips que el hook ya genera desde `![alt](url.png)` (image) y `[text](url.png)` (link-to-image). El nuevo core rule de text tokens NO debe duplicar o romper estos casos.

#### Scenario: link markdown a imagen (legacy sintaxis HOR-002)
- **GIVEN** markdown `"[HOR-002-f1.png](HOR-002-f1.png)"`
- **WHEN** render
- **THEN** 1 chip `.ss-inline` con `href` hacia el endpoint raw, sin duplicacion

### REQ-PRESERVE-04: URLs bare en prosa no se rompen

El sistema MUST no causar errores si aparece una URL bare en prosa. Bajo `linkify: false`, la URL queda como texto. Si el autor necesita link activo, usa sintaxis markdown explicita.

## Fix scope

### Antes (comportamiento buggy)

1. `intent.md` en prosa → `<a href="http://intent.md/">` (linkify) → 404
2. `` `HOR-005-foo.png` `` en backticks → `<a href="/p/.../tickets/HOR-005-foo">` (RECORD_ID dentro de `<code>`) → 404
3. `` `HOR-001` `` en backticks → `<a href="/p/.../tickets/HOR-001">` anidado dentro de `<code>` → HTML invalido
4. `HOR-005-foo.png` en prosa → `<a href="/p/.../tickets/HOR-005-foo">` (RECORD_ID sobre text token) → 404

### Despues (comportamiento correcto)

1. `intent.md` → texto literal
2. `` `HOR-005-foo.png` `` → `<code>HOR-005-foo.png</code>` literal
3. `` `HOR-001` `` → `<code>HOR-001</code>` literal (sin anchor)
4. `HOR-005-foo.png` en prosa → chip `.ss-inline` con lightbox al click

### Archivos afectados

| File | Change | Impact |
|---|---|---|
| `src/composables/useMarkdown.ts` | `linkify: false` (fix 1); guard extendido a `<code>` y `<pre>` con 3 passes secuenciales (fix 3) | Todo markdown del viewer |
| `src/composables/markdownImageHook.ts` | Nuevo core rule `ss-text-image-paths` que parte text tokens con pattern `\S+\.(png\|jpg\|jpeg\|webp\|svg)\b` en `text + image + text` (fix 2+4). Se registra ANTES de `ss-image-context` via `md.core.ruler.before()` | text tokens de todos los tickets renderizados |
| `src/composables/markdownImageHook.test.ts` | +~7 tests nuevos cubriendo los 4 fixes + regresiones | Cobertura |

### Orden de core rules

```
parser standard → ss-text-image-paths (nuevo, parte text) → ss-image-context (existing, anota caption) → renderer
```

El nuevo rule corre PRIMERO, luego el existente anota caption sobre todos los image tokens (los originales + los nuevos del text split). Asi el pipeline sigue siendo single-pass.

### Decisiones de implementacion

- **DEC-LOCAL-01** (codigo literal vs chip): `<code>` y fence code blocks NO transforman paths a imagen. Consistente con semantica de markdown ("codigo literal"). El usuario confirmo esta decision.
- **DEC-LOCAL-02** (guard 3 passes): extender el regex a `<(a|pre|code)[\s>][\s\S]*?</\1>` es fragil con tags anidados. 3 passes secuenciales (anchor → pre → code) evitan solapamiento — `<pre>` se captura antes que los `<code>` que contiene.
- **DEC-LOCAL-03** (regex strict): pattern para detectar imagenes en text token es `\b\S+\.(png|jpg|jpeg|webp|svg)\b` con solo 5 extensiones. `.json`, `.ts`, `.vue` no matchean.

## Tasks

| # | Task | Agent | Depends on | Files | Validation | Status | Session | Rules | Rollback | source_ref |
| --- | ------ | ------- | ------------ | ------- | ------------ | -------- | --------- | --- | --- | --- |
| 1 | Baseline: `npm test` + `npm run build` + diagnostico de links rotos via chrome-devtools sobre HOR-005 (Request/Sessions/Testing), HOR-002 (Testing), BLY-001 | researcher | — | — | evidencia capturada: 60 tests pass, sizes, 30+ links rotos medidos pre-fix | **done** | #2 | — | — | — |
| 2 | Fix 1: `linkify: false` en `useMarkdown.ts:61` + test unit `.md/.ts/.vue no se linkifican` | developer | #1 | `useMarkdown.ts`, `markdownImageHook.test.ts` (agregar fixture o crear `useMarkdown.test.ts`) | unit test pass; comentario inline explica el por que | **done** | #2 | — | — | — |
| 3 | Fix 3: extender guard de `wireInternalLinks` a `<pre>` y `<code>` (3 passes secuenciales) + test unit `IDs en backticks no linkifican` | developer | #1 | `useMarkdown.ts` | unit test cubre: inline code, fence block, anchors siguen protegidos | **done** | #2 | — | — | — |
| 4 | Fix 2+4: core rule nuevo `ss-text-image-paths` en `markdownImageHook.ts`, registrado via `md.core.ruler.before('ss-image-context', ...)` + 3 tests: path en prosa → chip, path no-imagen → texto, chips existentes intactos | developer | #1 | `markdownImageHook.ts`, `markdownImageHook.test.ts` | 3 tests unit pass; regression: 11 tests previos del hook siguen pass | **done** | #2 | — | — | — |
| 5 | Validacion manual chrome-devtools: HOR-005 Request/Sessions/Testing + HOR-002 Testing + BLY-001. Contar `linkify-false-tld` y fake ticket-refs. Validar click en chips nuevos abre lightbox | reviewer | #2, #3, #4 | — | 0 links `linkify-false-tld` y 0 fake ticket-refs en los 3 tabs de HOR-005; chips nuevos funcionan; screenshots en `tickets/` con pattern `HOR-006-*.png` | **done** | #2 | — | — | — |
| 6 | Regression: `npm test` total + `npm run build` (comparar bundle) + update Testing del ticket con coverage y evidencia | scribe | #5 | `projects/horadric/tickets/HOR-006.md` | 60+ nuevos tests pass, 0 fail; bundle delta documentado; Testing del ticket con evidencia por REQ; commit final | **done** | #2 | — | — | — |

### Task contract detalle

```
Task #1: Baseline
- source_ref: REQ-FIX-01, REQ-FIX-02, REQ-FIX-03, REQ-PRESERVE-03
- agent: researcher
- files: —
- precondition: working tree limpio sobre main (post HOR-005 merge 60c1d91)
- expected_output: (a) npm test output con N pass baseline, (b) npm run build con bundle sizes, (c) screenshot pre-fix mostrando links rotos + conteo numerico de linkify-false-tld + fake-ticket-refs por tab de HOR-005
- validation: evidencia capturada
- rollback: N/A
- rules: [1, 11, 13]

Task #2: Fix 1 linkify
- source_ref: REQ-FIX-01, REQ-PRESERVE-02, REQ-PRESERVE-04
- agent: developer
- files: src/composables/useMarkdown.ts (modificar linea 61), markdownImageHook.test.ts o nuevo useMarkdown.test.ts
- precondition: #1
- expected_output: `linkify: false` en el constructor de MarkdownIt + comentario inline explicando el por que + 2 test unit (linkify off + URL con sintaxis markdown preservada)
- validation: npm test pass; browser visual check: `intent.md` ya no es link
- rollback: revertir commit (1 linea + test)
- rules: [5, 8, 10, 11]

Task #3: Fix 3 guard code
- source_ref: REQ-FIX-03, REQ-PRESERVE-01
- agent: developer
- files: src/composables/useMarkdown.ts (modificar wireInternalLinks)
- precondition: #1
- expected_output: 3 passes secuenciales: anchor → pre → code, cada uno reemplaza por placeholder + restore. Test unit cubre: IDs en backtick no linkifican, IDs en fence block no linkifican, IDs en prosa siguen linkificando, anchors siguen protegidos
- validation: unit test pass; browser visual: los 14 fake ticket-refs de HOR-005 Testing desaparecen
- rollback: revertir commit; bug 3 reaparece pero fix 1 persiste
- rules: [5, 8, 10, 11, 16]

Task #4: Fix 2+4 text-image-paths
- source_ref: REQ-FIX-02, REQ-PRESERVE-03
- agent: developer
- files: src/composables/markdownImageHook.ts (agregar core rule antes de ss-image-context), markdownImageHook.test.ts (3+ tests)
- precondition: #1
- expected_output: `md.core.ruler.before('ss-image-context', 'ss-text-image-paths', fn)`. La funcion itera sobre inline children, para cada text con pattern imagen parte en [text_before, image, text_after]*. Regex: `/\b\S+\.(png|jpg|jpeg|webp|svg)\b/gi`. Tests: prosa → chip, no-imagen → texto, chips existentes intactos
- validation: 11+3 tests pass (baseline hook + nuevos); `data-ss-caption` se deriva correctamente del contexto padre; no rompe link-to-image existente (HOR-002)
- rollback: revertir commit; bug 4 reaparece pero 1 y 3 persisten
- rules: [5, 8, 10, 11, 16]

Task #5: Validacion manual
- source_ref: todos los REQ
- agent: reviewer
- files: — (genera screenshots)
- precondition: #2, #3, #4
- expected_output: (a) screenshots `HOR-006-*.png` de HOR-005 Request/Sessions/Testing + HOR-002 Testing + BLY-001 mostrando 0 links rotos, (b) screenshot del lightbox abierto desde chip generado por text-path, (c) conteo numerico post-fix
- validation: `linkify-false-tld` count = 0 en cada tab; fake ticket-refs = 0; chips clicables abren lightbox
- rollback: N/A (verificacion)
- rules: [4, 7, 13, 14]

Task #6: Regression + close
- source_ref: todos los REQ-PRESERVE
- agent: scribe
- files: projects/horadric/tickets/HOR-006.md, projects/horadric/specs/SPEC-viewer-links-fix.md
- precondition: #5
- expected_output: npm test final count documentado; bundle delta vs baseline; Testing del ticket completo con evidencia por REQ; spec status `done`
- validation: 0 tests rotos; ticket cumple gate de close
- rollback: N/A
- rules: [2, 13]
```

## Constraints

- **RULE-viewer-assets-context-001** (creada en HOR-005, must): aplica a fix 2+4. Paths a imagenes en texto plano deben generar chip + lightbox para preservar contexto narrativo. Esta spec es la implementacion concreta del principio para el caso "path en text token".

## Dependencies

- **SPEC-viewer-ticket-assets** (HOR-005, done): define la infraestructura de chips + lightbox + endpoint raw. HOR-006 reusa todo — solo agrega una entrada nueva (text tokens) al pipeline existente.

## Risks and mitigations

| Risk | Probability | Impact | Mitigation |
|---|---|---|---|
| Fix 1 rompe URLs bare legitimas en prosa de tickets existentes | low | medium | Grep pre-fix confirmo 0 URLs bare en prose. Regresion en task #5 sobre 3 tickets variados detectaria cualquier degradacion. Si aparece caso futuro: autor migra a `<url>` o `[text](url)` |
| Fix 3 regex del guard con tags anidados (ej `<a>` dentro de `<pre>`) | medium | medium | 3 passes ordenados: anchor → pre → code. `<pre>` captura primero cualquier `<code>` que contiene → no solapamiento |
| Fix 2+4 regex greedy matchea paths no-imagen | low | low | Regex con 5 extensiones especificas + word boundary |
| Fix 2+4 rompe link-to-image existente (`[foo.png](foo.png)`) | medium | high | Orden de core rules: `ss-text-image-paths` corre ANTES de `ss-image-context`; ambos trabajan sobre children diferentes (text vs link_open/image). Test de regresion `[HOR-002-f1.png](HOR-002-f1.png)` → 1 solo chip (no duplicado) |
| Fix 3 protege `<pre>` donde estaba el anchor de un `<a>` validamente colocado por el autor | low | low | El guard protege `<code>`/`<pre>` del RECORD_ID replace, no remueve los anchors existentes ahi. Si el autor puso un anchor en un code block (raro), sigue funcionando |

## Open questions

Ninguna bloqueante. Decisiones arquitecturales documentadas en DEC-LOCAL.

## Decisions

### DEC-LOCAL-01: `<code>` literal, no chip
- **Contexto**: `` `HOR-005-foo.png` `` — ¿chip o literal?
- **Drivers**: semantica markdown estandar (codigo = literal); autor elige con/sin backticks
- **Opcion elegida**: literal. El core rule de text tokens NO procesa contenido de `code_inline` ni `fence` blocks
- **Alternativas**: chip aun dentro de `<code>` (descartado: rompe semantica; el autor puede salir de backticks si quiere chip)
- **Consecuencias**: consistencia con markdown estandar; requiere que el autor este consciente de la sintaxis si quiere chip (escribir sin backticks o con link explicito)
- **Session**: session #1 del ticket

### DEC-LOCAL-02: guard con 3 passes secuenciales
- **Contexto**: extender guard de `wireInternalLinks` a `<code>` y `<pre>`
- **Drivers**: tags anidados (`<pre><code>`); evitar regex fragil
- **Opcion elegida**: 3 passes secuenciales anchor → pre → code. Cada pass reemplaza por placeholder unico
- **Alternativas**: regex alternation `<(a|pre|code)>...</\1>` (descartado: backreferences en replace son fragiles; no garantiza orden de matching correcto con anidamiento)
- **Consecuencias**: codigo un poco mas verboso pero predecible; fix debuggable
- **Session**: session #1

### DEC-LOCAL-03: regex estricta para paths de imagen
- **Contexto**: detectar paths a imagen en text tokens
- **Drivers**: no falsos positivos en `package.json`, `types.ts`, `.env`, etc.
- **Opcion elegida**: `\b\S+\.(png|jpg|jpeg|webp|svg)\b` — solo 5 extensiones
- **Alternativas**: aceptar mas extensiones (`.gif`, `.ico`, `.avif`) — descartadas por ahora (no hay casos de uso; se pueden agregar mas tarde)
- **Session**: session #1

## Success metrics

N/A (es fix — success es "el bug no ocurre"). Las metricas medibles estan en NFR del proyecto: regression test count, bundle size delta.

## Technical reference

### Core rule order (markdown-it)

```
parse → core rules (en orden):
  [built-in: normalize, block, inline, linkify (off), replacements]
  ss-text-image-paths (nuevo — fix 2+4)
  ss-image-context    (existing, anota caption + rewrite link_open a image)
  [renderer: image rule → chip HTML]
→ wireInternalLinks (post-render):
  guard anchors (existing)
  guard pre      (nuevo — fix 3)
  guard code     (nuevo — fix 3)
  RECORD_ID.replace
  restore placeholders
```

### Regex de fix 2+4

```typescript
const IMAGE_PATH_IN_TEXT = /\b\S+\.(png|jpg|jpeg|webp|svg)\b/gi

function splitTextOnImagePaths(content: string, createToken: (type: string) => Token): Token[] {
  const out: Token[] = []
  let lastIdx = 0
  let match: RegExpExecArray | null
  IMAGE_PATH_IN_TEXT.lastIndex = 0
  while ((match = IMAGE_PATH_IN_TEXT.exec(content)) !== null) {
    if (match.index > lastIdx) {
      const tb = createToken('text')
      tb.content = content.slice(lastIdx, match.index)
      out.push(tb)
    }
    const img = createToken('image')
    img.tag = 'img'; img.nesting = 0; img.children = []
    img.attrSet('src', match[0])
    img.content = ''
    out.push(img)
    lastIdx = match.index + match[0].length
  }
  if (lastIdx < content.length) {
    const tail = createToken('text')
    tail.content = content.slice(lastIdx)
    out.push(tail)
  }
  return out
}
```

## Rules discovered

{se llena durante execute si aplica}

## Bugs found

{se llena si aplica}

## Acceptance checkpoints

- [ ] **Funcional**: los 4 sub-fixes implementados; cada REQ-FIX con scenario validado
- [ ] **Coverage**: los 7 REQ-PRESERVE cubiertos por tests
- [ ] **Tests**: 60 baseline + nuevos del ticket pass; 0 fail
- [ ] **NFRs**: bundle size sin regresion significativa (< +2 KB gzip — el fix no agrega deps)
- [ ] **Rules**: RULE-viewer-assets-context-001 respetada (fix 2+4 la implementa)
- [ ] **Integration**: HOR-001, HOR-002, HOR-005, BLY-001, SPEC-viewer-mvp, SPEC-viewer-ticket-assets todos renderizan sin regresion
- [ ] **Docs**: ticket + spec al dia con evidencia
