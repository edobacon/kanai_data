---
id: RULE-project-004
project: drunappgor
type: rule
module: project
level: must
tags:
  - git
  - branching
  - tickets
  - develop
  - release
---

# Cada ticket se trabaja en rama propia y se integra a develop

## What

Todo ticket de DrunAppGor debe trabajarse en una rama propia creada desde `develop`.

Formato recomendado:

| Tipo | Formato |
|------|---------|
| Ticket normal | `app-###-{slug-corto}` |
| Fix urgente | `fix-app-###-{slug-corto}` |
| Experimento | `exp-app-###-{slug-corto}` |

Al terminar el ticket:

1. Validar acceptance y tests del ticket.
2. Committear los cambios en la rama del ticket.
3. Mezclar la rama del ticket hacia `develop`.
4. Mantener `main` como linea estable.
5. Promover `develop` a `main` solo cuando el conjunto revisado este listo.

Si el equipo usa el nombre `master` en algun remoto futuro, debe tratarse como equivalente historico de `main`; la rama canonica local del proyecto es `main`.

## Why

El proyecto parte con mucho trabajo de datos, docs y UI que puede crecer rapido. Trabajar cada ticket en rama propia evita mezclar cambios incompletos, permite revisar por unidad Deckard y mantiene `develop` como integracion controlada antes de promover a la linea estable.

## Where

- **Repo**: `/Users/edobacon/Workspace/q/drunagor/drunappgor`
- **Base de trabajo**: `develop`
- **Linea estable**: `main`
- **Tickets**: `projects/drunappgor/tickets/APP-*.md`
- **Specs**: `projects/drunappgor/specs/**`

## When

Aplica a todo ticket nuevo o reabierto que modifique archivos dentro de `drunappgor`.

No aplica a cambios solo en Deckard que no toquen el repo de app, aunque esos cambios igual deben registrarse en tickets/specs cuando correspondan.

## Verification

- Antes de editar `drunappgor`, `git branch --show-current` no debe ser `main` ni `develop`; debe ser una rama de ticket.
- El ticket registra la rama usada en Setup.
- El commit del ticket existe en la rama de ticket.
- La integracion a `develop` se hace despues de review/validacion.
- La promocion de `develop` a `main` requiere revision del conjunto, no se hace automaticamente al cerrar cada ticket.

## Source

- **Discovered in**: definicion del flujo Git inicial de DrunAppGor.
- **Evidence**: el dev indico que los tickets deben crearse en ramas propias, mezclarse a `develop`, y luego revisar el paso de `develop` a `main/master`.
- **Related**: APP-028, SPEC-project-002-inicializar-git-main-develop.
