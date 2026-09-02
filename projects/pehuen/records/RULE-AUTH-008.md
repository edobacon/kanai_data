---
id: RULE-AUTH-008
project: pehuen
type: rule
module: auth
level: must
tags:
  - legacy-paridad
  - migration
  - password
  - bcrypt
---

# Hash de password con bcrypt `saltRounds=10` para compatibilidad con hashes legacy

## What

El hash de passwords debe usar `bcrypt.genSalt(10)` + `bcrypt.hash(password, salt)`. El valor de saltRounds debe ser exactamente `10`. No usar `12`, no usar `bcrypt.hashSync`, no usar otro algoritmo.

## Why

Los usuarios migrados de la BD legacy tienen hashes bcrypt generados con `saltRounds=10`. Si nuxt usara un salt diferente, `bcrypt.compare` funcionaría correctamente (bcrypt almacena el salt en el hash), pero si se cambia el algoritmo (argon2, scrypt), todos los usuarios legacy no podrían autenticarse sin un reset masivo de passwords. La paridad de `saltRounds=10` también garantiza tiempos de login predecibles.

## Where

- **Files**: `server/models/user.model.ts` (hook `pre('save')`), o el servicio equivalente en nuxt
- **Layers**: backend (model layer)

## When

En cada operación que modifica el password (creación, cambio de password). El hook `pre('save')` debe replicarse exactamente o implementarse en el service con `isModified` equivalente.

## Verification

- Test: hash generado con nuxt puede verificarse con `bcrypt.compare` → `true`.
- Test de integración: usuario creado en legacy (hash `saltRounds=10`) puede autenticarse en nuxt.
- `grep -n "genSalt\|saltRounds" server/` → debe aparecer `10`.

## Source

- **Discovered in**: PEH-001, Session 1
- **Evidence**: `pehuen-server/docs/01-data-model/core/user.md` snippet schema línea: `const salt = await bcrypt.genSalt(10)`. Contrato de migración punto 1: "Hash bcrypt con saltRounds=10. Si nuxt usa otro salt no podra leer hashes legacy → fuerza reset masivo de passwords."
- **Related**: RULE-AUTH-007, RULE-AUTH-009
