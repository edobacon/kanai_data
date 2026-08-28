---
id: RULE-platform-008
project: up1
type: rule
module: platform
tags:
  - multi-tenant
  - planning
  - intake
  - object-definition
  - tenant-override
  - llm-guidance
---

# Antes de planificar un objeto "nuevo": verificar overrides de tenant (el nombre puede estar ocupado)

## What

Durante el intake/planning de CUALQUIER objeto que se vaya a crear o modelar (en un mod o en el Base), ANTES de asumir que el nombre esta libre, verificar si ya existe una definicion del mismo nombre en `object-manager/objects/tenants/<TENANT>/Base/<objeto>.json` (override de tenant) o en `objects/business/Base/`. Si existe, el objeto NO es nuevo: ya hay un modelo (posiblemente incompatible) que el codegen va a servir. El triage del ticket debe registrar esa colision como hipotesis a validar, NO darla por inexistente.

Chequeo concreto (parte del Context found del intake):

```bash
find object-manager/objects -iname "<objeto>.json" -path "*Base*"   # Base global + todos los tenants
```

Si aparece en `tenants/<T>/Base/`, leer su shape y contrastarlo con el modelo planificado.

## Why

En up1 los objetos del tenant **REEMPLAZAN TOTALMENTE** (no merge) a los del Base global: `object-manager/src/services/fileParsing.js:83` usa un `Map` keyed por filename y el tenant pisa la entrada del Base. Un mod puede definir `objects/<Obj>.json` y su sync proyectarlo a `objects/business/Base/`, pero si el tenant tiene su propio `objects/tenants/<T>/Base/<obj>.json`, el GraphQL/Prisma de ese tenant sirve el del tenant y **eclipsa** silenciosamente el del mod. La extension `ext__<publisher>__<obj>` NO resuelve esto (solo agrega columnas sueltas en una tabla satelite 1:1; no puede albergar discriminadores, FK polimorficas ni unique compuestos). Sin este chequeo, el ticket se planifica y ejecuta entero asumiendo un objeto nuevo, y la colision recien aparece al validar en el tenant (caso real: TICKET-063 — el tenant UPU ya tenia un `Curriculum` career-based migrado que eclipso el model-v2 del mod; descubierto en S2 al hacer introspeccion, no en intake). El costo de descubrirlo tarde es alto (rework, escalamiento, decision de reconciliacion fuera de scope). Ver DECISION-017.

## Where

Aplica a: (1) `request-intake` / `intake-explore` de todo ticket que cree o modele un objeto (`creates_data: true`); el Context found debe incluir el resultado del chequeo de overrides de tenant. (2) `design-feature`/`design-draft` cuando el data-model introduce un objeto — el architect verifica colision antes de proponer el shape. (3) cualquier planificacion de objetos del dominio en proyectos multi-tenant de up1. NO aplica a objetos puramente internos del mod sin proyeccion al core, ni a campos/properties (solo a la definicion de objetos top-level por nombre).

## When

Vigente desde TICKET-063 (SP4, 2026-06-16). Permanecera mientras up1 use el modelo de override total por tenant (`fileParsing.js`). Si el core introduce merge declarativo Base+tenant o un mecanismo `extends`/`mergeWith` para objetos, revisar esta regla (el chequeo seguiria siendo util pero la colision dejaria de ser silenciosa). Ver DECISION-017 (convergencia Curriculum v1/v2) y la coexistencia legacy/v2 que motivo esta regla.
