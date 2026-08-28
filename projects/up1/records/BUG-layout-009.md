---
id: BUG-layout-009
project: up1
type: bug
module: layout
tags:
  - layout
  - i18n
  - modal
  - getModalTitle
  - workaround
---

# Un titulo de modal con una key i18n que contiene puntos no se traduce

## Symptom

Un titulo de modal configurado con una key de i18n que contiene puntos (ej. una key namespaced) no se traducia: se mostraba el nombre tecnico/literal en vez del texto traducido.

## Expected behavior

`getModalTitle` deberia traducir tambien las keys de i18n que contienen puntos, no solo las que matchean el regex sin puntos.

## Root cause

File: `layout/src/utils/resolveModalTitle.ts:84` (funcion `getModalTitle`)
Cause: `getModalTitle` solo intenta la ruta de traduccion (`translateFn`) cuando `customTitle` matchea `isLikelyKey = /^[a-zA-Z0-9_-]+$/.test(customTitle)` (linea ~96). Una key que contiene puntos no matchea ese regex, asi que la funcion nunca llama a `translateFn` para ella y cae directo al literal.

## Fix

Workaround aplicado del lado de los layouts consumidores (no un cambio en `getModalTitle`): se evitaron las keys con puntos en `app-role-mapping-create.json`, `app-role-mapping-edit.json` y `role-modroles-list.json`, reemplazandolas por keys sin puntos que si matchean el regex.

## Impact

| Area | Antes | Despues |
|---|---|---|
| Titulo de modal con key namespaced | Se mostraba el literal tecnico sin traducir | Se declara la key sin puntos y se traduce correctamente |
| `getModalTitle` (core layout) | Sin cambios: el regex sigue sin aceptar puntos | Sin cambios; el gap de fondo permanece para cualquier key con puntos que se declare a futuro |

## Reproduction

### Steps
1. Configurar el titulo de un modal con una key i18n que contenga puntos (ej. una key namespaced).
2. Abrir el modal.
3. Verificar que se muestra el literal tecnico en vez del texto traducido, porque `isLikelyKey` rechaza el punto.

## Related

- **Rules**: ninguna (el gap de fondo en `getModalTitle` no se corrigio, solo se evito en los layouts afectados)
