---
id: RULE-global-006
project: jormat-evolution
type: rule
module: global
level: must
tags:
  - deuda-tecnica
  - proceso
  - marker
  - dod
  - tracking
  - cleanup
---

# El marcador `DEUDA_TECNICA` tiene ciclo de vida: se anota con tracking y se BORRA al resolver

## What

En jormat-evolution la deuda tecnica dejada a proposito en el codigo se anota con el marcador `DEUDA_TECNICA` (y su variante `DEUDA_TECNICA_CONFIRMAR` para deuda que espera una confirmacion de negocio). El marcador es un **registro vivo**, no un comentario decorativo, y tiene tres obligaciones:

1. **Al anotar**: el marcador incluye (a) el `[dominio]` afectado, (b) una descripcion de que falta, y (c) un **tracking_ref** — el ticket que la resolvera (`JOR-XXX`) o la decision que la origina (`DEC-XXX`). Un `DEUDA_TECNICA` sin tracking_ref es un **huerfano**: deuda anotada que nadie trackea. No se permiten huerfanos — o se ticketea o se elimina el marcador.
2. **Al ticketear**: un ticket cuyo alcance resuelve una deuda anotada **debe** listar en su `Setup`/DoD los `file:line` de los marcadores que va a cerrar, y su Acceptance incluye "el/los marcador(es) `DEUDA_TECNICA` correspondientes fueron **eliminados** del codigo".
3. **Al resolver**: **borrar el marcador es parte del Definition of Done**. Un ticket no cierra si dejo el `DEUDA_TECNICA` en el codigo despues de resolver la causa. Si el ticket resuelve solo parte, el marcador se **actualiza** (nuevo tracking_ref del remanente), no se deja intacto.

## Why

Un marcador que sobrevive a la resolucion de su causa **miente**: el proximo dev lo lee como deuda abierta y re-investiga algo ya cerrado, o peor, un auditor lo cuenta como deuda vigente. Simetricamente, deuda anotada sin ticket (huerfana) se pierde: nadie la agenda y queda indefinidamente en el codigo. El valor del marcador como inventario de deuda depende de que su presencia signifique exactamente "deuda abierta y trackeada". El barrido de 2026-08-17 encontro 74 marcadores en ~46 archivos; sin este ciclo de vida, distinguir deuda viva de residuo obliga a releer cada uno contra el codigo.

## Where

- Formato observado: `DEUDA_TECNICA[dominio]: <texto> ... (JOR-XXX). Ref: DEC-XXX.` — ej. `src/purchases/purchases.service.ts:216` (`DEUDA_TECNICA[compras]: pagos AP sin modelo real; requiere tabla (JOR-090). Ref: DEC-014`).
- Variante `DEUDA_TECNICA_CONFIRMAR`: deuda que espera confirmacion de negocio antes de accionarse (ej. stub vs persistencia real).
- Inventario: `grep -rniE "DEUDA[_ ]?TECNICA" --include="*.ts" --include="*.tsx" backend front` (excluir `node_modules` y `.claude/worktrees`).

## When

- Al **dejar** deuda a proposito: anotar con `[dominio]` + descripcion + tracking_ref. Sin ticket que la reciba, crear uno (aunque sea backlog) o no dejar el marcador.
- Al **crear un ticket** que toca un area con marcadores: revisar si su alcance los resuelve; si si, listarlos en el DoD.
- Al **cerrar un ticket**: verificar con grep que los marcadores declarados ya no estan en el codigo (o quedaron re-apuntados al remanente). Es un acceptance checkpoint, no un nice-to-have.
- En **revision de deuda tecnica** (como el barrido periodico): cruzar cada marcador con su tracking_ref; los huerfanos (sin ticket) se ticketean o se limpian.

## Verification

- Un ticket que dice resolver `DEUDA_TECNICA` en `file:line` y al cerrar el grep todavia lo encuentra ahi = acceptance en rojo.
- Un `grep` de `DEUDA_TECNICA` que devuelve un marcador sin `JOR-XXX`/`DEC-XXX` = huerfano a ticketear o limpiar.
