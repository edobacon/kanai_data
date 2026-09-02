---
id: RULE-viewer-assets-context-001
project: horadric
type: rule
module: viewer
level: must
tags:
  - viewer
  - assets
  - ux
  - screenshots
  - contextual-rendering
---

# Assets binarios se exponen inline con su contexto narrativo, nunca en galeria aislada

## What

Cualquier asset **binario** que el viewer exponga (screenshots, imagenes, PDFs, videos, capturas de pantalla) DEBE renderizarse inline en el markdown/HTML que lo referencia, NO en una vista/galeria aislada del resto del contenido. El contexto textual que rodea el asset (el row del test case, el bullet de una session, la descripcion de una sesion, la caption narrativa) es parte **indivisible** de la experiencia de revision — sin ese contexto, el asset es un nombre de archivo suelto sin significado.

Los assets **textuales autocontenidos** (intent.md del draft, preview.html del draft, data-model.{ext} del draft) SI admiten tab dedicada porque traen su propio contexto dentro del archivo.

**Implementacion canonica** en horadric-cube: hook de `markdown-it` que envuelve tokens `image` y links-a-imagen en un chip `.ss-inline` con `data-ss-caption` extraido del AST (heading/table-row/list-item padre mas cercano); singleton `ScreenshotLightbox` monta el modal full-size con la caption preservada.

## Why

Observado durante HOR-005. Primera iteracion del draft (v1) propuso una tab **Screenshots** como galeria agrupada. Feedback del dev: *"los screenshots por si solo no sirven, deben estar incluidos en el contexto que fueron producidos para entender que responden"*. Una lista aislada `HOR-002-f1-loader-amber-tones.png` / `HOR-002-f4-diff-viewer.png` / ... descontextualiza cada asset: el revisor no sabe que TC, que REQ o que fase del ticket produjo cada screenshot sin abrirlo y compararlo con el markdown.

El principio tambien aplica negativamente a la tentacion de "panoramizar" assets (sidebar de screenshots, galeria modal, lista por proyecto). Cualquier vista separada reintroduce el problema: el asset y su narrativa se divorcian.

**Corolario de diseno**: evaluar "¿este asset trae su contexto?". Si SI (archivo textual leido como un todo) → tab dedicada OK. Si NO (binario, o fragmento que solo tiene sentido junto a su prosa) → inline obligatorio.

## Where

- **Files**:
  - `src/composables/markdownImageHook.ts` — plugin que extrae caption del AST
  - `src/composables/useMarkdown.ts` — integra el hook en el pipe de markdown-it + `rewriteContext` para URLs
  - `src/components/assets/ScreenshotLightbox.vue` — singleton modal con el contexto como caption
  - `src/components/shell/MarkdownBody.vue` — propaga `ticketId` al pipe
- **Layers**: frontend (viewer). Aplica a cualquier componente Vue que renderice markdown del ticket o del spec.

## When

- Siempre que se anada al viewer una nueva superficie que exponga assets binarios producidos por deckard (screenshots, diagramas externos, videos de demo, PDFs).
- Siempre que se evalue un rediseno de la presentacion de assets del ticket/spec: la opcion "galeria aislada / panel separado / modal con lista" queda descartada por default.
- Al agregar nuevos tipos de asset al `TicketAsset` discriminated union: clasificar como **binario-con-contexto-externo** o **textual-autocontenido** y aplicar la politica correspondiente.

## Verification

**Test automatizado** (existente, ver `src/composables/markdownImageHook.test.ts`):
- Render de `![](path.png)` o `[text](path.png)` dentro de `<tr>` → chip con `data-ss-caption` que contiene el contenido del row (sin la imagen).
- Render dentro de `<li>` → caption con el contenido del bullet.
- Imagen sin contexto estructural → caption fallback al filename.

**Grep manual** contra regresion:
```bash
# Buscar componentes que creen vistas/galerias separadas de screenshots
grep -rn "Gallery\|AssetList\|ScreenshotsTab" src/components/
```
Si alguno aparece: violacion. La feature debe reusar `markdownImageHook` + `ScreenshotLightbox` o crear un componente que tambien preserve contexto.

**Review criterion**: cualquier PR que agregue presentacion de assets debe responder en su descripcion: *"¿El contexto narrativo del asset esta preservado en la UI que el usuario ve?"*. Respuesta "no" → bloqueante.

## Source

- **Discovered in**: HOR-005, Session #1 (draft v1 → v2) y Session #3 (execute — validacion en HOR-002 Testing tab).
- **Evidence**:
  - Sesion #1 mid-4: dev rechazo la tab Screenshots despues de ver el preview v1. Registrado como failed approach #2 del ticket.
  - Sesion #3 s8-fix-2: durante validacion manual se descubrio que HOR-002 usa `[text](url.png)` no `![](url.png)` — el hook tuvo que extenderse a links cuya `href` apunta a imagen para cubrir el caso real. Registrado como failed approach #4.
  - Screenshots `HOR-005-req-02a-screenshots-inline-chips.png` y `HOR-005-req-02b-lightbox-with-context.png` documentan la implementacion exitosa del principio.
- **Related**:
  - `RULE-viewer-polling-001` — tambien aplica a composables del viewer (useTicketAssets hereda el patron).
  - `RULE-index-001` — consumer-adapts: el hook resuelve URLs relativas al endpoint raw sin pedir al markdown que las emita absolutas.
  - Memory `feedback_viewer_reflects_flow.md` — principio hermano: el viewer refleja el flujo, no dicta convenciones. Esta rule es el correlato especifico para assets.
