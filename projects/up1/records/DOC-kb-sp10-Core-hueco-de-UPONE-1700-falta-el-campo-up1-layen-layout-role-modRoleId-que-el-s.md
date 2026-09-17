---
id: DOC-kb-sp10-Core-hueco-de-UPONE-1700-falta-el-campo-up1-layen-layout-role-modRoleId-que-el-s
project: up1
type: doc
module: core
tags:
  - core
  - object-manager
  - UPONE-1700
  - profile-gating
  - layout
  - schema-drift
  - regresion-latente
  - discovery
  - sin-commitear
---

# Core — hueco de UPONE-1700: falta el campo up1_layen_layout_role.modRoleId que el sync ya usa (profile-gating de layouts)

Discovery surgido al reconciliar los cambios sueltos de object-manager durante el cierre de los PRs de 1756/1615. NO estaba detectado antes. Es una regresion latente en develop.

## El problema

El **codigo** de sync de UPONE-1700 (commit `fa0352c4` "declarative profile->role mapping in sync", ya mergeado en develop) **lee y escribe** `up1_layen_layout_role.modRoleId` en `object-manager/scripts/sync/dbSync.js`:
- Path institucional (~lineas 900-952): `findFirst`/`create`/`deleteMany` con `modRoleId: null` en TODA fila de layout-role.
- Path profile-gating (~lineas 1584-1660, "mirroring apps"): `create({ data: { modRoleId: pair.modRoleId } })`.

Pero el **schema commiteado en develop NO declara el campo**:
- `objects/up1/layout/up1_layen_layout_role.json` (develop): sin `modRole` (0 ocurrencias).
- `prisma/UPU/schema.prisma` (develop): el modelo `up1_layen_layout_role` no tiene `modRoleId`.
- Contraste: el espejo a nivel APP (`up1_suite_app_role.modRoleId`) SI esta mergeado (def de objeto + prisma). Solo falta el de LAYOUT.

## Impacto

En un **checkout limpio de develop**: el codegen genera el schema desde el JSON commiteado (sin `modRoleId`) -> el cliente Prisma sale sin el campo -> al correr el sync de roles de layout (`syncLayoutRoles`), Prisma tira `Unknown argument 'modRoleId'` en el `create`/`findFirst`. Como el path institucional escribe `modRoleId: null` en cada fila, **rompe el sync de roles de layout entero**, no solo el profile-gating.
- Feature: el profile-gating a nivel layout (cableado por 1700) no funciona en develop limpio.
- Deploy: un build nuevo desde develop queda con el cliente sin el campo -> el sync falla al ejecutarse. Los ambientes ya corriendo con un build que tenia el campo siguen ok hasta el proximo rebuild limpio.

## Por que no se detecto

1. Se **partio** el cambio: el codigo de 1700 se mergeo; el schema (el campo) quedo solo en un working tree local y nunca se commiteo. Los `reset: moving to HEAD` de OM (02 y 04-09) probablemente lo devolvieron al working tree despues de que el PR de 1700 ya se habia ido sin el.
2. Enmascarado localmente: el campo vive en el working tree + cliente generado + la columna existe en la DB `uplanner_upu` (verificado).
3. Los tests unitarios **mockean Prisma** -> no ejercitan el campo real -> verde.
4. El CI (`.woodpecker/build.yml`) hace **codegen + vitest run** (mockeado); no corre un sync de layouts real contra un cliente recien generado -> verde. Por eso 1700 se mergeo con el hueco.

## El cambio (sin commitear, enredado en ~29 archivos de churn de sync regenerable)

Fuente real (aislable):
- `objects/up1/layout/up1_layen_layout_role.json`: + campo `modRoleId` (FK a `core_ModRole`, `onDelete: SetNull`, `allowDisconnect: true`; "Perfil de aplicacion que da visibilidad a este layout, espejo de up1_suite_app_role.modRoleId").
- `objects/up1/suite/up1_suite_app_role.json`: + `allowDisconnect: true` en el FK `modRole` existente.

Derivado (regenerar, NO cherry-pickear del churn): `prisma/UPU/schema.prisma` + `prisma/BASEMODEL/schema.prisma` + `src/graphql/typeDefs/dynamic.js`/`mods.js`/`up1.js`.

## Owner / ticket

Es **1700**, no 1615 ni 1756. El codigo que lo necesita es de 1700. Corresponde un **follow-up/fix de UPONE-1700 (core)**: aislar los 2 JSON de fuente, regenerar el codegen, correr el sync de layouts para confirmar que ya no crashea, y commitear. PR propio en object-manager.

## Estado

Sin commitear, sin rama en ningun lado (a diferencia del fix de baseline RBAC de 1615, que si esta en ramas dedicadas). Pendiente de confirmar con quien mergeo 1700 si hay una migracion/PR en vuelo antes de armar el fix.
