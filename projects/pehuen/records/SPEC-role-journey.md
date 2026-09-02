---
id: SPEC-role-journey
project: pehuen
type: doc
module: migration
tags:
  - funcionalidad
  - rol
  - journey
  - e2e
---

# Role Journey — meta-spec

## Artifact Definition

```yaml
name: role-journey
plural: Role Journeys
description: "Jornada operativa completa de UN rol especifico — secuencia de capabilities que un actor ejecuta para cumplir su trabajo. Es la UNIDAD de validacion de paridad de migracion para usuarios reales."
location: specs/SPEC-role-journeys.md (consolidado por rol) + tests/e2e/migration-paridad/role-journeys/
```

## Por que existe este artefacto

Un sistema migrado puede tener todas sus `business-capabilities` validadas individualmente y aun asi **romper la jornada del usuario** porque:

- El usuario sale de un flujo en estado X y al volver el sistema esta en Y (state desync).
- El usuario navega del menu rol-especifico esperando un item que ya no existe (vista unificada perdio entry point).
- El usuario abre 2 tabs y la sincronizacion difiere (sockets, cookies).
- El default route post-login cambio y el usuario llega a una pagina distinta.
- La cancha activa se preserva entre sesiones en legacy pero en nuxt no (o viceversa).

`role-journey` codifica la **secuencia REAL** de un dia/turno de trabajo de un actor, validando paridad **end-to-end de la experiencia**, no solo de actos individuales.

## Roles del proyecto Pehuen

5 roles distintos, **5 role-journeys obligatorios**:

| Rol | Caracter operativo | Journey principal |
|-----|--------------------|--------------------|
| ADMINISTRADOR | Control total del sistema | Configuracion + supervision + intervencion de cualquier flujo |
| SUPERVISOR | Gestion de operacion + reportes | Gestion de RECEPTOREs + revision de movimientos |
| RECEPTOR | Operacion de cancha (CRUD guias/rumas) | Jornada operativa: registrar entradas/salidas + crear rumas |
| CONSULTOR | Lectura para auditoria | Consulta de movimientos + descarga de reportes |
| ASESOR | Operacion en terreno (mobile/tablet) | Visita de canchas + foto de rumas + georreferenciacion |

## Fields

| Field | Tipo | Requerido | Descripcion |
|-------|------|-----------|-------------|
| id | text | si | RJ-{role-slug} (ej. RJ-receptor, RJ-asesor) |
| role | enum: ADMINISTRADOR, SUPERVISOR, RECEPTOR, CONSULTOR, ASESOR | si | Rol unico de esta journey |
| character | text | si | Caracter operativo (1 linea) |
| typical_session | text | si | Como es una sesion tipica (cuanto dura, dispositivo, contexto) |
| entry_point | text | si | Default route post-login para el rol |
| menu_items | text[] | si | Items del nav lateral que el rol ve |
| capabilities | reference: business-capability[] | si | Lista ordenada de capabilities que ejecuta |
| restrictions | text[] | si | Cosas que el rol NO puede hacer (scope cancha, ADMIN-only operations, etc) |
| visible_data | text[] | si | Datos que ve el rol (full vs subset; otras canchas si o no) |
| sockets_received | reference: socket-event[] | si | Eventos socket que el rol consume |
| sockets_emitted | reference: socket-event[] | no | Eventos que el rol dispara |
| common_errors | text[] | si | Errores literales que el rol puede ver (mensajes legacy preservados) |
| cross_role_interactions | text[] | no | Como interactua con otros roles (ej. SUPERVISOR aprueba accion de RECEPTOR) |
| device_context | enum: desktop, tablet, mobile, mixed | si | Donde tipicamente se usa |
| network_context | enum: oficina-stable, terreno-intermitente, mixto | si | Calidad de red habitual |
| legacy_routes | text[] | si | Rutas legacy del rol (paths del cliente Vue 3) |
| nuxt_routes | text[] | si | Rutas equivalentes en nuxt (incluye redirects) |
| migration_decisions | reference: DEC[] | no | Decisiones que afectan al rol (ej. AJUSTE_ROLES con RECEPTOR) |
| migration_tests | reference: TC[] | si | TCs que validan la journey end-to-end |
| status | enum: pending, mapped, tests-written, parity-validated, content-docs-updated, complete | si | Etapa |

## Spec Section Template

```markdown
## Role Journey: {ROL}

**Caracter**: {character}
**Sesion tipica**: {typical_session}
**Dispositivo**: {device_context} | **Red**: {network_context}

### Entry & navigation
- **Default route post-login**: {entry_point}
- **Menu items**: {lista}
- **Legacy routes**: {paths legacy}
- **Nuxt routes**: {paths nuxt + redirects 301}

### Capabilities (en orden tipico de uso)
| Orden | CAP | Titulo | Frecuencia | Critico |
|-------|-----|--------|------------|---------|
| 1 | CAP-005 | Login + ver dashboard | siempre | si |
| 2 | CAP-033 | Listar guias filtrando por mes actual | varias veces/dia | si |
| 3 | CAP-040 | Registrar entrada de madera (mov 1) | varias veces/dia | si |
| 4 | CAP-085 | Crear ruma asociada | 1-2 veces/dia | si |
| ... | ... | ... | ... | ... |

### Restricciones
- {restriccion 1}
- {restriccion 2}

### Datos visibles vs ocultos
- **Ve**: {lista}
- **No ve**: {lista}

### Sockets que recibe
| Evento | Room | Cuando |
|--------|------|--------|

### Errores comunes (mensajes literales preservados)
- "{mensaje}"
- "{mensaje}"

### Interaccion con otros roles
- {ej. SUPERVISOR aprueba cambios del RECEPTOR via socket}

### Decisiones de migracion que afectan al rol
- DEC-{n}: {titulo}

### Tests E2E de paridad de la journey
- TC-{X}: login → ... → logout completa

### Status migracion: {pending | mapped | ... | complete}
```

## Requirements

### REQ-01: cada rol tiene EXACTAMENTE UN role-journey

- **Aplica cuando**: se mapean los roles del proyecto
- **Esperado**: 5 role-journeys (uno por rol)
- **Verificacion**: `ls specs/SPEC-role-journeys.md` contiene 5 secciones `## Role Journey`

### REQ-02: cada capability del proyecto pertenece al menos a un role-journey

- **Aplica cuando**: se cataloga una business-capability
- **Esperado**: la capability aparece en el campo `capabilities` de al menos un role-journey
- **Verificacion**: cross-reference grep

### REQ-03: cambios de menu / ruta default post-login se documentan en role-journey

- **Aplica cuando**: nuxt cambio el default route o el nav vs legacy
- **Esperado**: la journey tiene `nuxt_routes` con redirect 301 documentado y `migration_decisions` apuntando a la DEC
- **Verificacion**: cada redirect en nuxt tiene entrada en role-journey + decision aprobada

### REQ-04: jornada validada end-to-end (no solo capabilities aisladas)

- **Aplica cuando**: status es `parity-validated` o superior
- **Esperado**: existe TC E2E que recorre la journey completa simulando una sesion real (multiples capabilities en secuencia, mismo storage/cookies)
- **Verificacion**: `tests/e2e/migration-paridad/role-journeys/{role}.spec.ts` con un test "full journey"

### REQ-05: status `complete` requiere doc en content/docs orientado al rol

- **Aplica cuando**: se cierra la journey
- **Esperado**: existe `content/docs/roles/{role}.md` (o similar) con descripcion del rol desde su perspectiva (lo que puede hacer, no como esta implementado)
- **Verificacion**: file existence + revision content-writer

## Defaults

```yaml
defaults:
  device_context: desktop
  network_context: oficina-stable
  status: pending
```

## Relations

```yaml
relations:
  - artifact: business-capability
    type: requires
    description: "una role-journey agrupa N capabilities en orden de uso"
  - artifact: parity-flow
    type: suggests
    description: "una journey atraviesa varios parity-flows"
  - artifact: migration-test
    type: generates
    description: "TCs E2E 'full journey' que validan la experiencia completa"
  - artifact: migration-decision
    type: suggests
    description: "decisiones que afectan navegacion / scope / restricciones del rol"
