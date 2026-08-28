---
id: BUG-object-manager-014
project: up1
type: bug
module: object-manager
tags:
  - graphql
  - resolver
  - relations
  - fields
  - reporting
  - flexmonster
  - latente
---

# Pasar `fields` a una query desactiva el procesamiento de `relations`

## Symptom

Un reporte de Flexmonster que declara a la vez `fields` y `relations` en su
plantilla recibe las filas sin los datos de la relacion. En el chart todas las
filas colapsan en una sola barra, porque el campo por el que se agrupaba viene
vacio para todos los registros.

## Expected behavior

Una query que combine `fields` y `relations` deberia procesar ambas cosas: la proyeccion de campos no deberia apagar la carga de relaciones. Si esa combinacion no es soportada, el contrato deberia rechazarla de forma explicita en vez de ignorar `relations` en silencio.

## Root cause

File: `src/graphql/resolvers/instance.resolver.js:2272-2280`

Cause: el resolver de listado decide entre dos ramas excluyentes. `hasSelect` se
activa en `:2183-2185` cuando llega `fields` con al menos un elemento, y el
bloque que procesa `relations` (`:2322` en adelante,
`if (includeRelations || (relations && relations.length > 0))`) vive **dentro del
`else`**. Es decir, `relations` solo se procesa cuando NO se paso `fields`: pedir
proyeccion de campos apaga silenciosamente la carga de relaciones, sin error ni
warning.

## Fix

**No hay fix de la causa raiz.** El defecto sigue presente en el resolver hoy.

Lo que se aplico en la ventana fue una mitigacion aguas abajo: el commit
`4c18bae` (2026-08-07, SS-453) quito `fields` de la query de la plantilla de
reporte del mod, en
`uengagement-up1/config/reports/report-template/ueng-ret-factors.json`, para que
la query caiga en la rama `else` y las relaciones se procesen. El resolver no se
toco.

Si otra plantilla o consumidor vuelve a combinar `fields` con `relations`, el
sintoma reaparece.

## Impact

| Area | Antes | Despues |
|---|---|---|
| Query con `fields` + `relations` | Las relaciones se ignoran en silencio | Sigue igual: el defecto es latente |
| Plantilla `ueng-ret-factors` | Chart colapsado en una barra | Correcto, por quitar `fields` de la plantilla |
| Riesgo residual | Cualquier consumidor nuevo que combine ambos parametros reproduce el bug | Requiere fix en el resolver o validacion que rechace la combinacion |

## Reproduction

### Steps
1. Armar una query GraphQL de listado que incluya `fields` y `relations` simultaneamente, sobre un objeto con al menos una relacion declarada.
2. Ejecutar la query.
3. Verificar que las filas devueltas no traen los datos de la relacion, pese a haberla solicitado. La plantilla `ueng-ret-factors.json` (SS-453) reproducia el sintoma antes de quitarle `fields`.

## Notas de verificacion

El informe de recon ubicaba este defecto en el mod `uengagement-up1`. La
verificacion contra el codigo lo situa en **core** (`object-manager`): el mod
solo contenia el punto de mitigacion. La combinacion `fields` + `relations` no
esta validada ni documentada como excluyente en ninguna parte del contrato.
