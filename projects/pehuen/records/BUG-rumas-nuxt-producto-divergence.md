---
id: BUG-rumas-nuxt-producto-divergence
project: pehuen
type: bug
module: rumas
status: open
severity: low
tags:
  - legacy-paridad
  - migration
  - fillRumaData
  - producto
  - productQty
---

# Nuxt `fillRumaData` devuelve `producto` sin el filtro `volCalculado>0` del legacy y no expone `productQty`

## Symptom

El campo `producto` del listado de rumas de Nuxt (`GET /api/rumas`) no coincide con el
mismo campo del legacy (`pehuen-server`) cuando un producto acumulo movimientos pero su
`volCalculado` neto termino en 0 o negativo. Ademas, Nuxt nunca expone `productQty`
(desglose de `volMR`/`volM3`/`volCalculado` por codigo de producto), que el legacy si
devuelve en la respuesta.

## Expected behavior (legacy, `pehuen-server`)

En `pehuen-server/src/services/ruma.service.ts` (`fillRumaData`, lineas 201-214),
`producto` en el objeto devuelto es el resultado de un filtro final: de todo el
acumulador `productQty` (un total por codigo de producto), solo sobreviven los productos
con `volCalculado > 0`; si ninguno sobrevive, `producto` es `[]`. El legacy tambien
expone `productQty` completo (el objeto con el desglose por producto) en la respuesta.

## Actual behavior (Nuxt, `pehuen_nuxt`)

En `pehuen_nuxt/server/services/ruma.service.ts` (`fillRumaData`, lineas 179-186 y
262-275), `producto` es simplemente `Array.from(productos)` — un `Set` que acumula el
codigo de CUALQUIER producto visto en las guias/ajustes de la ruma, sin aplicar el
filtro `volCalculado > 0`. `productQty` no se calcula ni se expone en absoluto: no hay
acumulador equivalente en el codigo de Nuxt.

**Evidencia (archivo:linea)**:
- Legacy: `pehuen-server/src/services/ruma.service.ts:201-214` (filtro `pQty` +
  `productQty` en la respuesta).
- Nuxt: `pehuen_nuxt/server/services/ruma.service.ts:179` (`const productos = new Set<string>()`,
  sin acumulador `productQty`), `pehuen_nuxt/server/services/ruma.service.ts:270`
  (`producto: Array.from(productos)`, sin filtro).

## Impact

| Dimension | Impact |
|-----------|--------|
| Users affected | cualquier consumidor del listado de rumas de Nuxt que dependa de `producto` reflejando solo productos con volumen neto positivo, o que necesite `productQty` |
| Data affected | ninguna (el dato en DB no cambia; es una diferencia de calculo en la capa de lectura) |
| Modules affected | rumas (listado, `GET /api/rumas`, ambos codebases en paralelo durante la migracion) |
| Frequency | siempre que una ruma tenga un producto con `volCalculado` acumulado <= 0 (ej. ajustes REDUCE que compensan completamente los ingresos de ese producto) |

## Root cause

Divergencia introducida durante la migracion Vue3+Express -> Nuxt (no en este ticket):
el port de `fillRumaData` a Nuxt simplifico el acumulador de producto a un `Set` sin
replicar el acumulador paralelo `productQty` ni el filtro final `volCalculado > 0` del
legacy. No hay evidencia de que haya sido una decision explicita documentada; se detecto
al hacer la Auditoria de reemplazo (DET-40) de PEH-031 S4.T1, comparando linea por linea
`fillRumaData` de Nuxt contra el legacy.

## Fix

Ninguno aplicado. **Fuera de alcance de PEH-031** (SPEC-rumas-improve-db-perf): ese
ticket optimiza memoria/DB de `fillRumaData` preservando el comportamiento ACTUAL de
Nuxt, no corrige paridad funcional Nuxt vs legacy — tocar el contrato de
`producto`/`productQty` de Nuxt excede su alcance (ver spec, Executive summary "Que NO
se hace" y Auditoria de reemplazo). Los candidatos `fillRumaDataMap`/`fillRumaDataAggregate`
de S4.T2/S4.T3 replican a proposito el comportamiento ACTUAL de Nuxt (sin el filtro, sin
`productQty`), no el del legacy.

## Prevention / Next step

Candidato a ticket propio: decidir si la migracion acepta esta divergencia como
comportamiento intencional (ej. si ningun consumidor de Nuxt usa `productQty` ni depende
del filtro `volCalculado>0` en `producto`) o si es un gap de paridad a cerrar. Requiere
decision explicita del dev antes de tocar el contrato de la respuesta de `GET /api/rumas`
en Nuxt.

## Source

- **Discovered in**: PEH-031, Session 4 (S4.T1, Auditoria de reemplazo DET-40).
- **Evidence**: lectura linea por linea de `pehuen_nuxt/server/services/ruma.service.ts:119-279`
  contra `pehuen-server/src/services/ruma.service.ts:56-217`. Ya estaba registrado como
  "diferencia detectada" en la seccion "Auditoria de reemplazo (DET-40)" del spec
  `SPEC-rumas-improve-db-perf.md` (L5 del ticket) antes de esta session; este record
  formaliza esa divergencia como BUG per instruccion de S4.T1.
- **Related**: RULE-RUMA-004 (contrato de `producto` como `[String]`, no afectado por
  este bug — la divergencia es de CONTENIDO del array, no de tipo).
