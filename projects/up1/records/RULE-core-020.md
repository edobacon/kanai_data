---
id: RULE-core-020
project: up1
type: rule
module: core
tags:
  - rbac
  - capability
  - resolvers
  - metadata
  - versioning
  - clone
  - security
---

# Gating RBAC de versionar/clonar: opt-in declarativo via `requiredCapability` en metadata + un solo check upstream del RecordType branch

## What

Para gatear por capability una accion basada en `createInstance` (versionar / clonar), el patron es **opt-in declarativo**:

1. **Declaracion (mod)**: el objeto declara `requiredCapability` dentro del bloque de metadata de la accion — `metadata.versioning.requiredCapability` (versionar) o `metadata.prefillFrom.requiredCapability` (clonar). La misma capability-string se declara tambien en el row action del layout (`requiredCapability`) para el gating UI — defensa en profundidad, dos capas, una sola string.
2. **Enforcement (core)**: `createInstance` lee la key desde `core_ObjectDefinition.versioningConfig` (registry) y, **solo si esta presente**, invoca `checkCapability(context, [cap])` ANTES de cualquier write/evento/audit. Sin declaracion → permite (comportamiento actual). La ausencia NO genera warning ni error del validador (autonomia del mod).
3. **Cobertura dual con UN check**: el check de clone se ubica inmediatamente despues de `resolveEffectivePrefillFrom`, que corre **antes** del "RecordType early-return" del resolver. Asi un unico check cubre el clone de objeto base **y** el de RecordType/Modalidad (ambos consumen el mismo `prefillFrom`). NO duplicar el check en el bloque RT.

## Why

El opt-in preserva la soberania del mod (proteger o no su accion es decision de negocio del mod) y garantiza **cero impacto colateral**: los call-sites de creacion scratch (sin `asNewVersion` ni `prefillFrom.source`) nunca surface `requiredCapability`, asi que el check no dispara. El throw pre-write es atomico (sin estado inconsistente). Un solo check upstream del branch RT evita el bug de cobertura parcial (clone de Modalidad escapando el enforcement) sin duplicar logica.

## Where

- **Files**:
  - Enforcement: `up1/object-manager/src/graphql/resolvers/instance.resolver.js` (check version tras lectura de `versioningConfig.versioning`; check clone tras `resolveEffectivePrefillFrom`)
  - Surface de la key: `up1/object-manager/src/graphql/resolvers/helpers/prefill-from-source.js` (`resolveEffectivePrefillFrom` devuelve `requiredCapability` solo con `source != null`)
  - Declaracion: `mods/{mod}/objects/{Object}.json` (`metadata.{versioning|prefillFrom}.requiredCapability`) + `mods/{mod}/config/layouts/*.json` (row action `requiredCapability`)
  - Capabilities: `mods/{mod}/capabilities.json`
- **Layers**: backend (resolver) + config (mod) + frontend (gating UI via `isActionVisible`)

## When

Al gatear por RBAC cualquier accion de mod basada en `createInstance` con flags (`asNewVersion` / `prefillFrom.source`). Aplica a versionar y clonar; extensible a otras acciones declarativas que pasen por el resolver generico.

## Verification

- Unit test del resolver: enforce cuando declarado + falta cap → throw; permite cuando NO declarado (scratch intacto); cobertura dual (clone de RecordType rechazado). Ver `instance.resolver.test.js` (TICKET-050, 4 tests).
- UI: usuario con vs sin la capability ve/oculta la accion (validado live, TICKET-050 S2).
- Activacion: `npm run sync` crea+asigna las capabilities; `npm run codegen` propaga `requiredCapability` a `versioningConfig` (la cadena merge→registry preserva la key, sin whitelist).

## Source

- **Discovered in**: TICKET-050 (UPONE-1216), S1 (L2) + S2
- **Evidence**: el check de clone tras `resolveEffectivePrefillFrom` (instance.resolver.js ~L2308) corre ~67 lineas antes del RecordType early-return → cobertura dual con un solo check, verificado por unit test de clone de Modalidad. `applyModToObject` (fileSync.js:817) y `syncVersioningConfigToRegistry` (generatePrismaSchema.js:2575) copian los sub-objetos de metadata completos, sin whitelist → `requiredCapability` sobrevive la cadena sync→registry.
- **Related**: RULE-core-019 (keys declarativas: registry vs JSON por alcance del consumer), RULE-core-017 (`versioningConfig` en registry — caso transversal), RULE-mods-037 (naming object-level sin prefijo `mod/`)
