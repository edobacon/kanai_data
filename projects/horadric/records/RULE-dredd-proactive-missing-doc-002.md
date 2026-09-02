---
id: RULE-dredd-proactive-missing-doc-002
project: horadric
type: rule
module: dredd
level: must
tags:
  - dredd
  - pr-review
  - documentation
  - fase-2.5
  - proactive-detection
  - missing-doc
  - informe
---

# La Fase 2.5 detecta doc FALTANTE de forma proactiva (superficie documentable), no solo contradicciones

## What

La validacion de documentacion (Fase 2.5) corre en dos direcciones:

- **Direccion 1 (proactiva)**: PRIMERO barre el diff y marca toda "superficie documentable" con un
  checklist de disparadores, **exista o no doc previa**. En up1: objeto/campo, resolver o typeDef
  GraphQL, capability/permiso RBAC, evento BullMQ / workflow, env var / config / flag, mod nuevo /
  layout default, comando o flujo de setup/sync/codegen, breaking change. En el portable
  (categorias genericas): API / interfaz publica, contrato de datos, permisos/auth, config/
  operacion, superficie de usuario o CLI, breaking change. Por cada elemento nuevo sin doc que lo
  cubra -> **hallazgo activo de doc faltante, NO opcional**.
- **Direccion 2 (reactiva)**: la validacion de siempre, cruzar el cambio contra la doc que SI
  describe ese comportamiento y clasificar la contradiccion (codigo mal / doc stale / falta
  documentar).

Ademas, el informe **declara siempre** el estado de documentacion y de tests (punto dedicado),
aunque sea "sin superficie documentable" o "todo documentado". La ausencia de reclamo debe ser una
decision visible, no un silencio.

## Why

Bug observado por el dev: en tickets analizados, entraron cambios nuevos sin documentar y dredd no
reclamo. Causa raiz: la fase era puramente REACTIVA ("cruza contra la doc que describe el
comportamiento"), gancho que solo se activa si ya existe doc del area. Un cambio enteramente nuevo
no tiene doc vieja que contradecir, asi que el desenlace "falta documentar" quedaba como nota pasiva
que el modelo omitia. La ausencia de doc previa, que deberia ser el gatillo, era justo lo que lo
desactivaba. Invertir a proactivo + forzar la declaracion en el informe cierra el hueco.

## Where

- **Files**: `deckard/commands/dkc-dredd.md` (Fase 2.5 "Documentacion de up1"; punto 5 del Informe
  "Estado de documentacion y tests"); `~/.claude/skills/dredd/SKILL.md` (Fase 2.5 "Documentacion del
  repo"; punto 5 del Informe).
- **Layers**: capa de contraste con documentacion viva del repo/producto.

## When

Siempre que el PR agregue o cambie el contrato de un elemento del checklist de disparadores. Se
exime solo si el cambio no cae en ningun disparador (interno, refactor sin cambio de contrato, fix
que no altera la superficie). El punto de estado doc+tests del informe es incondicional.

## Verification

- Un PR con comportamiento nuevo sin doc produce un hallazgo de doc faltante (Direccion 1), aunque
  no exista doc previa que contradecir.
- El informe siempre incluye el punto "Estado de documentacion y tests", aun cuando sea "OK".
- Cerrar un PR con comportamiento nuevo sin una linea sobre el estado de la doc se considera fallo
  de la review.

## Source

- **Discovered in**: sesion de refuerzo a dredd (2026-07-15). Reporte del dev: "han ido cambios
  nuevos no documentados y no ha reclamado por ello".
- **Evidence**: la Fase 2.5 previa arrancaba con "Cruza lo que el PR cambia contra la documentacion
  que describe ese comportamiento" (reactivo). Sin doc previa no habia nada contra que cruzar.
- **Related**: [[RULE-dredd-doc-normative-levels-003]] (nivel normativo de la doc que se reclama);
  [[RULE-dredd-multi-ticket-commit-attribution-001]].
