---
id: DECISION-003
project: up1
type: decision
module: curriculum-design
tags:
  - curriculum-design
  - multi-tenant
  - tenants
  - infraestructura
---

# DECISION-003: TENANT_IDs `UNIVALLE` y `AIEP` para Curriculum Design

> ⚠️ **SUPERSEDED por [DECISION-011](DECISION-011-final-use-test-upu.md)** (2026-04-28).
>
> **Trazabilidad completa** (todo el mismo dia 2026-04-28, tras tres reconsideraciones):
> 1. Esta decision (DECISION-003) propuso UNIVALLE + AIEP el 2026-04-27.
> 2. DECISION-009 sugirio TEST + UPU tras reunion (overhead infra).
> 3. DECISION-010 revertio a UNIVALLE + AIEP (asume deuda por convivencia).
> 4. **DECISION-011** (final): TEST + UPU — analisis tecnico mostro que la coexistencia es robusta y la "deuda" estaba sobreestimada.
>
> Esta decision se mantiene como referencia historica. Util si en futuro arranca piloto real Univalle/AIEP que justifique tenants dedicados.

## Contexto

Universidad del Valle y AIEP son **2 tenants distintos** del sistema up1. Sus datos viven aislados (filtrado por `tenantId` en cada query) pero comparten el modelo del agregado Programa de asignatura.

Los datos legacy v2.2 entregados (`ejemplos-cursos-legacy-univalle-aiep_v2.md`) traen instancias de **ambos** clientes que se cargaran como seeds en up1. Para esto se necesitan 2 TENANT_IDs registrados.

Investigacion en codigo (sesion 2026-04-27): la plataforma up1 maneja tenants en `up1/object-manager/objects/tenants/<TENANT_ID>/`. Tenants existentes hoy: `TEST` y `UPU`.

## Drivers

1. **Convencion up1**: tenants se nombran en UPPERCASE (verificado en `TEST`, `UPU`).
2. **Legibilidad**: nombres completos (`UNIVALLE`) son mas claros que abreviaturas (`UV`).
3. **Coincidencia con prefijos legacy**: el legacy v2.2 usa `uv` y `aiep` en IDs (`aa-uv-1124`, `aa-aiep-14757`). Mantener coherencia con `aiep` → `AIEP`.
4. **Multi-pais consideration**: aunque Universidad del Valle es Colombia y AIEP es Chile, no se incluye sufijo de pais — el codigo de tenant es solo organizacional.

## Alternativas evaluadas

| Opcion | Pro | Contra |
|--------|-----|--------|
| **A. `UNIVALLE` + `AIEP`** (elegida) | Convencion uppercase. Legible. Coincide con prefix legacy AIEP. | — |
| B. `UV` + `AIEP` | Mantiene prefix legacy de Univalle (`uv`) | `UV` ambiguo (Universidad del Valle? Universidad de los Valles? Universidad Veracruzana?) |
| C. `UNIVALLE_CO` + `AIEP_CL` | Incluye codigo de pais para futuros tenants en otros paises | Sufijo `_CO` no aporta — el tenant es organizacional, no geografico |
| D. `univalle` + `aiep` (lowercase) | Coincide directo con prefix legacy | Rompe convencion up1 (ningun tenant existente es lowercase) |

## Decision

**Adoptar `UNIVALLE` y `AIEP`** como TENANT_IDs definitivos para Curriculum Design.

## Consecuencias positivas

- Coincide con la convencion up1 existente (`UPU`, `TEST` son uppercase)
- El legacy v2.2 sigue siendo trazable: `aa-uv-1124` (Univalle) tiene seguimiento natural a `UNIVALLE`
- No se introduce variabilidad geografica innecesaria

## Consecuencias negativas

- Si en el futuro se incorporan otros tenants llamados "Univalle" en otro pais (improbable), habria que renombrar — pero es muy improbable.

## Registro de los tenants — pre-requisito a TICKET-006

Los tenants se registran a nivel de plataforma **antes** de cualquier desarrollo del mod `curriculum-design`. Comandos:

```bash
cd up1
npm run tenant:create UNIVALLE --workspace=@uplanner/object-management-backend
npm run tenant:create AIEP --workspace=@uplanner/object-management-backend
```

Este script ejecuta automaticamente:
1. Configuracion de ambiente
2. Creacion de DB (per-tenant)
3. Generacion de schema Prisma desde JSON objects
4. Migracion
5. Generacion de Prisma client
6. Seed (si existe `up1/object-manager/prisma/<TENANT_ID>/seed.js`)
7. Generacion de capabilities

### Estructura generada

```
up1/object-manager/
├── objects/tenants/
│   ├── UNIVALLE/
│   │   ├── Base/         (objetos custom — vacio inicialmente)
│   │   ├── Extended/     (extensiones — vacio inicialmente)
│   │   └── RecordTypes/  (RTs custom — vacio inicialmente)
│   └── AIEP/
│       ├── Base/
│       ├── Extended/
│       └── RecordTypes/
└── prisma/
    ├── UNIVALLE/         (DB schema generado)
    └── AIEP/             (DB schema generado)
```

### Activacion del mod en los tenants

Una vez registrados, el mod `curriculum-design` se asocia con ambos tenants en su `app.json`:

```json
// up1/mods/curriculum-design/config/app.json
{
  "name": "curriculum-design",
  "label": "Curriculum Design",
  "tenants": ["UNIVALLE", "AIEP"],
  ...
}
```

Sin esos IDs en `tenants[]`, el mod **no aparece en el sidebar** del tenant ([rule-mods-007](../rules/mods/rule-mods-007.md)).

## Que cubre y NO cubre esta decision

### Cubre
- Los IDs textuales `UNIVALLE` y `AIEP`
- Pre-requisito de registrarlos antes de TICKET-006

### NO cubre (otras open questions)
- Si los RTs se modelan globales o per-tenant (ver [Q3](../specs/curriculum-design/open-questions.md#q3) + sub-pregunta tenant)
- Si Univalle/AIEP requieren Extensions con campos custom (ver [T5 en Tenant Questions](../specs/curriculum-design/open-questions.md))
- Como se divide el seed por tenant (ver [Q12](../specs/curriculum-design/open-questions.md#q12) + [T4](../specs/curriculum-design/open-questions.md))

## Referencias

- Codigo: `up1/object-manager/objects/tenants/UPU/` (ejemplo de tenant real con Base + RecordTypes)
- Codigo: `up1/object-manager/scripts/tenant-clean-setup.js` (script `npm run tenant:create`)
- [rule-mods-007](../rules/mods/rule-mods-007.md): tenants[] en app.json
- [BR-TNT-001](../specs/curriculum-design/business-rules/BR-TNT-001.md): aislamiento por institucion
- [BR-TNT-002](../specs/curriculum-design/business-rules/BR-TNT-002.md): defaults de plataforma vs config institucional
