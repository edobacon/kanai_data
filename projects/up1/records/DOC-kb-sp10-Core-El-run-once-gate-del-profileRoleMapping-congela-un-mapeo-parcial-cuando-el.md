---
id: DOC-kb-sp10-Core-El-run-once-gate-del-profileRoleMapping-congela-un-mapeo-parcial-cuando-el
project: up1
type: doc
module: curriculum-design
tags:
  - core
  - rbac
  - dbSync
  - syncAppProfileMapping
  - run-once-gate
  - UPONE-1615
  - UPONE-1700
  - profile-gating
  - aviso-core
---

# Core — El run-once gate del profileRoleMapping congela un mapeo parcial cuando el rename de roles corre despues del 1er sync (dbSync)

**Tipo:** Core / plataforma · detectado en runtime (smoke UPU) desde UPONE-1615 (TICKET-133), S6.T3 · **impacto: alto** (roles sin visibilidad de app en runtime, sin error visible)

## Sintoma

Tras un `reset + seed + sync 2x` del tenant, los 4 roles curriculares (`Learning Assurance <Rol> Curricular`) **no ven ninguna app** en UPU (sidebar de Apps vacio), aunque su `profileRoleMapping` esta correctamente declarado en `config/app.json`. Admin y Consultor (via el perfil compuesto) **si** ven las apps. El caso PO (Disenador crea un plan) es inalcanzable porque el rol no llega ni a la app.

## Evidencia

- **Runtime**: con `Learning Assurance Disenador Curricular` activo, el arbol de accesibilidad muestra `Apps` con lista vacia.
- **DB (antes del fix)**: `up1_suite_app_role` con `modRoleId != null` para las apps curriculares tenia **solo 4 filas** (curriculum-design/mapping x Admin/Consultor -> compuesto). **Faltaban las 8 filas** de los 4 roles curriculares -> su perfil por modulo.
- **DB (despues del fix)**: tras forzar `UP1_SEED_RESEED=true pnpm sync`, aparecen las **12 filas** esperadas (6 por app: 4 curriculares + Admin + Consultor) y los roles ven la app y tienen su efectivo correcto.

## Proceso / causa raiz

`syncAppProfileMapping` (`object-manager/scripts/sync/dbSync.js:1481`) materializa `up1_suite_app_role` resolviendo cada rol **por nombre** (`core_Role.findFirst({ name })`, `:1517`). Si el rol no existe con ese nombre, registra `profile_mapping_role_absent` (`:1519`) y lo saltea.

Ademas tiene un **run-once gate por fingerprint** (UPONE-1700, Fase 6.5, `:1490-1500`): tras la primera materializacion por `(app, tenant)`, los **writes quedan gateados** (`if (gated) continue`, `:1529`) salvo que cambie el `app.json` (fingerprint) o se fuerce con `UP1_SEED_RESEED` / `--seed-reseed`.

La secuencia que rompe:

1. **1er sync**: los 4 roles todavia tienen los **nombres viejos** (el rename lo hace el seed RBAC del mod, `ensureCurriculumModRbac`, que corre en otra fase / despues). El mapping busca `Learning Assurance ...` y **no lo encuentra** -> `profile_mapping_role_absent` -> se saltea. Admin/Consultor (nombres estables) **si** se resuelven -> filas creadas.
2. El gate **registra el fingerprint** (run ejecutado, `checkSeedExecution`).
3. **2o sync**: fingerprint sin cambios -> `gated = true` -> aunque los roles **ya esten renombrados**, los writes se **saltean**. Las 8 filas de los curriculares **nunca se crean**, hasta un reseed forzado.

Por eso Admin/Consultor si y los 4 curriculares no: es un **problema de orden** (rename despues del 1er mapping) que el **run-once gate congela** en un estado parcial, **sin error visible** para el operador.

## Por que se traslada a core (no se cierra en el mod)

- El `config/app.json` del mod es correcto (declara los 5 perfiles y sus roles). El mod no controla el **orden** entre `ensureCurriculumModRbac` (rename) y `syncAppProfileMapping` (mapping), ni la logica del run-once gate: ambos viven en el pipeline de sync de core (`dbSync`).
- El sintoma es silencioso: el `profile_mapping_role_absent` queda en findings, pero el gate igual marca el run como ejecutado y congela el mapeo parcial. Un operador que corre el reset estandar termina con roles sin visibilidad y sin senal de error.

## Propuesta para core

Alguna de estas (a criterio de core), para que el resultado no dependa del orden ni requiera un reseed manual:

1. **Ordenar el pipeline**: garantizar que el rename de roles (seed RBAC del mod) se aplique **antes** de `syncAppProfileMapping`, de modo que la resolucion por nombre encuentre los nombres nuevos en el 1er sync.
2. **No congelar un mapeo parcial**: si en un run el gate registro `profile_mapping_role_absent` para algun rol, **no** marcar el fingerprint como completo (o forzar re-evaluacion en el siguiente sync) hasta que todos los roles del mapping resuelvan; asi un 2o sync completa lo que falto.
3. **Resolver por identidad estable** en vez de por nombre mutable: si el mapping pudiera referenciar el rol por un id/clave estable (no por su `name`, que cambia con un rename), el rename dejaria de romper la resolucion.

## Workaround operativo (mientras tanto)

Tras un reset donde el rename de roles ocurra en el mismo ciclo que el mapping, correr:

```
UP1_SEED_RESEED=true pnpm sync
```

(en `object-manager`), que saltea el gate y re-materializa las filas faltantes. Verificable con un conteo de `up1_suite_app_role` con `modRoleId != null` para las apps curriculares (esperado: 6 por app).

## Referencias

- `object-manager/scripts/sync/dbSync.js:1481` (`syncAppProfileMapping`), `:1490-1500` (run-once gate / fingerprint, UPONE-1700), `:1517` (resolucion por nombre), `:1529` (skip gateado).
- `object-manager/scripts/sync/...` — `ensureCurriculumModRbac` (rename de roles, seed RBAC del mod).
- Nota relacionada: `Core-Reintroducir-la-deteccion-de-COLISIONES-de-nombres-de-rol...` (sp10) — mismo espiritu (senal silenciosa en el sync de roles).
- Verificacion runtime de que, ya materializado, el efectivo por rol es correcto (least-privilege): review de S6.T3 (TICKET-133).
