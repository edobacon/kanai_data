---
id: RULE-mods-057
project: up1
type: rule
module: mods
tags:
  - seed
  - testing
  - coverage
  - fixtures
  - dependency-injection
---

# Retirar data de demo NO debe retirar la vigilancia de la funcionalidad

## What

Cuando se retira o sustituye data de seed que era el **unico** insumo que ejercitaba una rama de un
loader, la rama MUST quedar cubierta por test antes de cerrar. El mecanismo: el loader expone su
coleccion como **parametro inyectable con default**, y el test le pasa sus propias entradas.

```js
// El default es la data real; el parametro existe para los tests.
export async function loadCurricula(prisma, tenantId, entries = CURRICULA) { … }
export async function loadMallas(prisma, tenantId, activities = MALLA_ACTIVITIES) { … }
```

Antes de retirar, separar **dos cosas distintas** que la data de demo suele cumplir a la vez:

| Lo que aportaba | Al retirarla |
|---|---|
| Ejercitaba una **rama de codigo** del loader | MUST quedar cubierta por test inyectado |
| Habilitaba un **smoke manual** (probar un flujo en la UI) | Se pierde. MUST declararse como perdida aceptada, no darse por cubierta |

Un fixture que solo servia al smoke manual NO se reemplaza por un test: se **declara** lo que ya no
se puede demostrar en la UI.

## Why

Instruccion explicita del dev en TICKET-113: *"se debe probar que minor siga funcionando, no puedes
dejarlo sin test, los test deben funcionar aun si no viene datos en test para mantener la
funcionalidad vigilada"*. El riesgo es concreto: al pasar el array de Curriculum a ser espejo exacto
del paquete del PM, tres ramas quedaron sin ningun insumo que las ejercitara — `recordType: 'Minor'`
(owner=Institution, sin satelite `rt__Plan`), `status: 'Draft'` en Curriculum, y `status != 'Active'`
en Activity. **Ningun conteo las habria detectado**, porque no hay filas de esa forma que contar. Si
alguien rompia la resolucion de owner del Minor, la suite seguia verde.

El corolario inverso tambien importa: **no inventar un fixture para "preservar" un smoke**. En
TICKET-113 se designo a dedo una Activity en `Draft` con esa justificacion, y resulto ser data que
el paquete no entrega — el mismo defecto que se estaba corrigiendo. La vigilancia va en el test; la
data sembrada es espejo de lo que entrega el owner del dato.

## Where

- Loaders del seed: `mods/{mod}/seed/_data-*.js` — firma con la coleccion inyectable al final.
- Tests: `mods/{mod}/tests/integration/seed-counts.test.ts`, en un describe propio y nombrado (en
  `curriculum-design`: *"capacidades vigiladas sin data en el seed (colecciones inyectadas)"*).
- Perdidas declaradas: `mods/{mod}/seed/README.md` y el REQ correspondiente del spec.

Distinguir el **default del schema** de un fixture antes de tocar nada: en `Activity.status` el
default es `Draft`, asi que el `status: 'Active'` explicito del loader es una **necesidad** (omitirlo
deja toda la demo en borrador), no un fixture. Lo que era invento era designar una fila en `Draft`.

## When

En todo ticket que retire, reemplace o reduzca data de seed / fixtures. Aplica tambien cuando la data
nueva es un espejo de un handoff externo (paquete de PM, export de cliente): el espejo es el criterio
para la DATA, nunca para la COBERTURA.

## Verification

El test de la rama MUST **morder**: verificar por mutacion que hardcodear el comportamiento hace
fallar exactamente ese test y ninguno mas, y revertir limpio. En TICKET-113 se comprobo asi
(hardcodear `status: 'Active'` en `loadMallas` mato solo el test de la rama `Draft`) — sin ese paso el
test podria estar pasando por construccion.

## Source

- **Discovered in**: TICKET-113 / UPONE-1456 — instruccion del dev en S3, reincidente en S5 sobre un
  fixture propio.
- **Relacionada**: [RULE-mods-056](RULE-mods-056.md) (verificacion por conteos acotados: los conteos
  NO detectan estas ramas, de ahi que hagan falta las dos reglas).
- **Complementada por**: [RULE-mods-058](RULE-mods-058.md) — la coleccion inyectable MUST llevar
  typedef JSDoc: sin el, TS infiere el contrato de la data de demo y los tests de vigilancia de esta
  regla no typechequean.
