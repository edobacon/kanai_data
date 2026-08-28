---
id: BUG-suite-005
project: up1
type: bug
module: suite
tags:
  - ai-agent
  - apollo
  - i18n
  - layoutorchestrator
---

# El widget AiChatbox no heredaba el cliente Apollo del tenant ni su namespace i18n

## Symptom

El widget flotante `AiChatbox` no operaba correctamente contra el tenant activo (no heredaba su cliente Apollo) y sus textos no se traducian (el namespace i18n del componente nunca cargaba).

## Expected behavior

`AiChatbox` deberia heredar el cliente Apollo del tenant activo y resolver su namespace i18n igual que el resto de los layouts embebidos, sin importar que se monte fuera del ciclo de vida de una ruta con `view_type`.

## Root cause

File: `pages/[tenant_id].vue`, `utils/i18nBridge.ts:61`
Cause: `AiChatbox` se monta fijo en `[tenant_id].vue`, fuera del `view_type` de cualquier ruta. Los dos mecanismos estandar de herencia (el cliente Apollo que normalmente provee la ruta, y la resolucion de namespace i18n via `EMBEDDABLE_LAYOUT_TYPES`) dependen de que el layout viva dentro del ciclo de vida de una ruta con `view_type`, algo que un widget flotante fuera de ese ciclo no cumple.

## Fix

Se agrega el prop `apollo-client` explicito al `LayoutOrchestrator` de `AiChatbox` en `pages/[tenant_id].vue:157` (`:apollo-client="tenantApolloClient"`), igual que el resto de los layouts. Se agrega `'AiChatbox'` a `EMBEDDABLE_LAYOUT_TYPES` (`utils/i18nBridge.ts:61`) para que su namespace i18n se resuelva igual que Calendar/RecordList.

## Impact

| Area | Antes | Despues |
|---|---|---|
| Cliente Apollo de AiChatbox | Resolvia el suyo propio, no el del tenant activo | Recibe `tenantApolloClient` explicito via prop |
| i18n de AiChatbox | Namespace nunca cargaba (fuera de `view_type`) | Incluido en `EMBEDDABLE_LAYOUT_TYPES` |

## Reproduction

### Steps
1. Abrir cualquier pagina del tenant con el widget `AiChatbox` visible.
2. Enviar un mensaje al agente.
3. Verificar que la consulta no usa el cliente Apollo del tenant activo y que los textos del widget aparecen sin traducir (claves crudas en vez de texto).
