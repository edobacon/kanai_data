---
id: RULE-dredd-multi-ticket-commit-attribution-001
project: horadric
type: rule
module: dredd
level: should
tags:
  - dredd
  - pr-review
  - multi-ticket
  - commit-attribution
  - fase-3
  - det-27
  - bb-helper
---

# Un PR multi-ticket se atribuye cambio->ticket por commit, no se contrasta el diff entero contra cada ticket

## What

La Fase 3 de dredd (ticket asociado) resuelve la pertenencia de los cambios en tres pasos antes de
contrastar contra el criterio de aceptacion:

1. **Universo de tickets** (3.1): extrae toda clave `[A-Z]+-[0-9]+` de titulo + nombre de rama
   origen + descripcion del PR. Es el conjunto candidato (uno o varios).
2. **Atribucion cambio -> ticket** (3.2): la senal fuerte es el commit. Por DET-27 el subject de
   cada commit lleva el id externo al frente (`UPONE-1380-S2 feat(scope): ...`). Se lee ese id y se
   mapea a los archivos que toca el commit.
3. **Degradacion honesta** (3.3): un solo ticket = atribucion trivial (todo el diff es de ese
   ticket); commit sin id en el subject (o con id fuera del universo) = cubeta "no atribuible /
   compartido"; PR squasheado o ningun commit con id = cae al comportamiento base (todo el diff
   contra cada ticket) y **lo declara como limitacion**.

Luego cada ticket se contrasta contra **sus** cambios atribuidos + los no atribuibles (3.5), NO
contra todo el diff. Un cambio de otro ticket no cuenta como "requisito faltante" del ticket en
curso. Los hallazgos se agrupan por ticket en el informe; los compartidos van aparte.

## Why

Un PR puede transportar cambios de varios tickets (rama integradora, batch de fixes). Antes, la
Fase 3 detectaba varias claves pero trataba el diff como un solo bloque y cruzaba TODO el diff
contra el AC de CADA ticket, generando falsos "no cubierto" / "fuera de alcance" cuando dos tickets
conviven. La atribucion por commit corrige eso reusando una senal que ya deberia existir (DET-27).

## Where

- **Files**: `deckard/commands/dkc-dredd.md` (Fase 3, seccion "Ticket(s) de Jira"); skill portable
  `~/.claude/skills/dredd/SKILL.md` (Fase 3, "Ticket(s) asociado(s)").
- **Helper**: subcomandos `commits <ws> <repo> <pr>` y `commitfiles <ws> <repo> <spec>` agregados a
  las dos copias del helper: `deckard/commands/dredd-bb.sh` y `~/.claude/skills/dredd/scripts/bb.sh`.
- **Layers**: Modo A (Bitbucket) usa los subcomandos del helper; Modo B (git local) usa
  `git log --format='%H%x09%s' <merge-base>..<source-ref>` + `git show --name-only --format= <hash>`.

## When

Siempre que dredd corra la Fase 3 y el universo de tickets tenga mas de un id. Con un solo ticket la
atribucion es trivial y se salta 3.2.

## Verification

- El informe de un PR multi-ticket lista el universo de tickets y como se atribuyeron los cambios
  (por commit / trivial / no atribuible por squash).
- El contraste de AC aparece por ticket, no un unico bloque global.
- `dredd-bb.sh commits <ws> <repo> <pr>` devuelve `values[].hash` + `values[].message`;
  `dredd-bb.sh commitfiles <ws> <repo> <hash>` devuelve `values[].new.path` / `old.path`.

## Source

- **Discovered in**: sesion de refuerzo a dredd (2026-07-15), a pedido del dev. Sin ticket DKC
  formal (capturado como rule directa).
- **Evidence**: el dev pidio que dredd valide a que ticket pertenecen los cambios y confirmo que un
  PR puede transportar varios tickets. La Fase 3 previa solo extraia claves de titulo/rama/desc y no
  segmentaba el diff.
- **Related**: DET-27 (subject del commit lleva el id externo); [[RULE-dredd-proactive-missing-doc-002]];
  [[RULE-dredd-doc-normative-levels-003]].
