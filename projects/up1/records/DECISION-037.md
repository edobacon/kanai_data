---
id: DECISION-037
project: up1
type: decision
module: suite
tags:
  - suite
  - navegacion
  - alcance-de-fase
---

# R21 (navegacion directa para grupos de nav con un solo destino) queda diferido a CE-4

## Contexto

Durante UPONE-1504 se implemento un modo de navegacion directa (sin dropdown) para grupos de navegacion que tienen un unico destino navegable, agregando el helper `navigableLayoutCount`/`onlyLayout` y el bloque CSS `.single-destination` a `components/static/ObjectNavBar.vue` (commit `5853cb0`).

## Decision

El cambio se revirtio al dia siguiente (commit `bd6bff8`) y HEAD queda identico al estado pre-cambio: todos los grupos de nav siguen usando dropdown, sin excepcion por conteo de destinos. Dos razones documentadas en el propio commit de revert:

1. El requisito R21 estaba explicitamente diferido a CE-4 segun el QA report (`UPONE-1504-qa.md`) y no estaba aprobado para la Fase A vigente en ese momento.
2. Habia un defecto visual real: el selector `.object-dropdown .btn` (selector descendiente) no aplicaba al nuevo nodo porque este tenia ambas clases en el mismo elemento, por lo que el subrayado de estado activo nunca se pintaba.

## Alternativas descartadas

- **Dejarlo mergeado en Fase A sin aprobacion de alcance**: se descarta porque el QA report ya habia marcado R21 como diferido a CE-4; mergear igual habria introducido un requisito no aprobado para la fase actual, ademas del bug visual sin resolver.

## Impacto y reversibilidad

Sin impacto en HEAD: el codigo quedo identico al estado previo al cambio (`components/static/ObjectNavBar.vue` revertido completo). Se registra esta decision para que un futuro ticket no reintente R21 sin antes revisar el QA report referenciado y confirmar que CE-4 ya esta en alcance. Totalmente reversible en cualquier direccion: no hay dato ni schema involucrado, solo un componente de UI.
