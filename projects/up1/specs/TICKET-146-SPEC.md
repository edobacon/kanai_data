---
id: TICKET-146-SPEC
project: up1
ticket: TICKET-146
status: approved
---

# Tributación: 3 agregados de schema aditivos en CompetencyAlignment y CompetencyNodeDevelopmentLevel (UPONE-1769)

## Resumen ejecutivo

Se agregan 3 declaraciones de schema aditivas y nullable, mod-only, en curriculum-mapping: contributionPercentage (numérico) e índice de grupo (planId, competencyNodeId, developmentLevelId) en CompetencyAlignment, e isRepresentative (booleano) en CompetencyNodeDevelopmentLevel. NO entra lógica que consuma esos campos (pesos/indicadores/versionado son follow-up UPONE-1770), NO se re-ejecuta ningún rename (los carga UPONE-1753, ya en develop) y NO hay cambios de interfaz ni de comportamiento. Se verifica observando: los 3 campos/índice presentes en el JSON del mod, sync+codegen sin drift y migración limpia, artefactos de sync no commiteados, y el CRUD de tributación de UPONE-1756 verde tras el cambio. Tamaño: ~1 SP, 1 sesión T1 (el techo de 4 sesiones sobra). ADVERTENCIAS para quien aprueba: (a) punto de partida y precondición dura (ver Adenda 1 del request): el trabajo se hace sobre develop con los cambios de UPONE-1756 YA mergeados, en una rama propia UPONE-1769-...; planId, su índice individual y el objeto CompetencyNodeDevelopmentLevel se toman de develop post-merge de 1756; si develop todavía no contiene 1756, hay que detenerse y reportar (no trabajar sobre la rama de 1756 ni crear esos elementos); (b) decisión de PO/lead pendiente sobre plegar estos 3 agregados dentro de 1756 en vez de mantener 1769 como ticket propio; (c) estimación publicada 8 SP contra ~1 SP real, confirmar; (d) el nombre isRepresentative ya existe en el frontend de ConsolidationBlock (trace.ts) como concepto local: no se toca en este ticket, pero conviene revisar en el follow-up si debe alimentarse del campo nuevo (fuera de alcance aquí).
## Requirements

### REQ-01 `confirmed`
> Fuente: curriculum-mapping/docs/reference/competencyalignment-object.md:205

CompetencyAlignment declara el campo contributionPercentage numérico y nullable (no required, sin default, sin lógica que lo consuma), con description orientada al usuario final, y el codegen del core lo materializa en el modelo Prisma sin drift.

### REQ-02 `confirmed`
> Fuente: curriculum-mapping/docs/reference/competencyalignment-object.md:81

CompetencyAlignment declara el índice de grupo (planId, competencyNodeId, developmentLevelId) —no único, aditivo, sin remover el índice individual de planId que ya trajo UPONE-1756— y la migración lo crea sin drift.

### REQ-03 `confirmed`
> Fuente: object-manager/prisma/BASEMODEL/schema.prisma:1080

CompetencyNodeDevelopmentLevel declara el campo isRepresentative booleano y nullable (no required, sin default), reusando el objeto que ya existe —no se crea ni se renombra el objeto—, y el codegen lo materializa sin drift.

### REQ-04 `confirmed`
> Fuente: curriculum-mapping/CLAUDE.md:133

El cambio es todo mod-only y no ensucia el core: se modifica sólo el mod fuente (nunca los archivos synced en core), se corre npm run sync tras el cambio, y los artefactos generados por sync/codegen NO quedan commiteados; el CRUD de tributación de UPONE-1756 sigue verde.
## Tasks

#### S1.T1 — Verificar el punto de partida antes de tocar nada. Sobre develop con los cambios de UPONE-1756 ya mergeados, en una rama propia UPONE-1769-... (el repo up1 exige ese prefijo). Confirmar en el mod fuente de curriculum-mapping que: (a) CompetencyAlignment ya declara planId y su indice individual de planId, (b) el objeto CompetencyNodeDevelopmentLevel ya existe, y (c) los renames de UPONE-1753 ya estan aplicados (developmentLevelId, catalogos DevelopmentLevel/PerformanceScale; sin rastros de coverageLevelId ni LevelScheme). Precondicion dura: si develop todavia no contiene los cambios de UPONE-1756 (falta planId, su indice individual o CompetencyNodeDevelopmentLevel), detenerse y reportar el bloqueo en vez de crear esos elementos o de trabajar sobre la rama de 1756. Dejar registrado el commit base de develop y el nombre de la rama creada.
Contrato: rollback: No hay cambios que revertir: es verificacion de solo lectura. Si se creo la rama UPONE-1769-..., borrarla con git branch -D y volver a develop.. Status: done

#### S1.T2 — Agregar en el JSON del objeto CompetencyAlignment del mod la property contributionPercentage (numérico, nullable: NO agregar a required[], sin default) con description orientada al usuario final (RULE-mods-018, sin notas técnicas ni ids de ticket), más la key de i18n correspondiente en lang/ del mod. No escribir lógica que lo consuma.
Contrato: rollback: git checkout -- del JSON del objeto y del lang/ del mod en curriculum-mapping; re-correr npm run sync para regenerar los artefactos del core al estado previo.. Status: done

#### S1.T3 — Agregar el índice de grupo (planId, competencyNodeId, developmentLevelId) en el JSON de CompetencyAlignment como índice NO único y aditivo, conservando el índice individual de planId que trajo 1756. Verificar en el schema.prisma generado que aparece el @@index de 3 columnas y que no se generó ningún DROP.
Contrato: rollback: git checkout -- del JSON del objeto en curriculum-mapping y re-sync. Si la migración ya se aplicó en la base local, revertir el CREATE INDEX con el DROP INDEX equivalente sobre la base local (el índice es aditivo: no hay pérdida de datos).. Status: done

#### S1.T4 — Agregar en el JSON de CompetencyNodeDevelopmentLevel la property isRepresentative (boolean, nullable: NO en required[], sin default) con description para usuario final y su key de i18n. Reusar el objeto existente: no crearlo, no renombrarlo, no tocar ConsolidationBlock/trace.ts.
Contrato: rollback: git checkout -- del JSON del objeto y del lang/ en curriculum-mapping; re-sync para regenerar.. Status: done

#### S1.T5 — Correr npm run sync (RULE-mods-003) + codegen y generar la migración de los 3 agregados. Revisar el SQL generado: debe contener sólo ADD COLUMN nullable x2 y CREATE INDEX x1. Verificar idempotencia (segunda corrida sin drift) y asegurar que los artefactos synced/generados en core quedan FUERA del commit (RULE-mods-001).
Contrato: rollback: Descartar la migración generada (borrar el directorio de la migración nueva) y revertir los artefactos del core con git checkout -- en object-manager/layout/suite. Si la migración se aplicó a la base local, revertirla con el down equivalente (drop de las 2 columnas + drop del índice).. Status: done

#### S1.T6 — Tests y regresión: correr la suite del CRUD de tributación de UPONE-1756 y el typecheck/build de storybook, y agregar/ajustar casos que cubran los nuevos campos como nullable — crear sin los campos (quedan null), setear decimal en contributionPercentage, setear true/false en isRepresentative, e insertar dos alignments con la misma tripleta del índice (debe permitirlo). Reportar suites con estado y totales, clasificando cualquier falla como introducida vs preexistente.
Contrato: rollback: git checkout -- de los archivos de test agregados/modificados. No modificar tests existentes de 1756 sin aprobación del usuario: si un test previo falla, reportar antes de tocarlo.. Status: done
## Verificacion runtime

1. **Qué:** Smoke de la vista afectada por Tributación: 3 agregados de schema aditivos en CompetencyAlignment y CompetencyNodeDevelopmentLevel (UPONE-1769)
   - **Se debe ver:** La vista carga y responde sin errores.
   - **Dónde:** vista afectada por el ticket

## Enmiendas (refine_spec)

### Enmienda 1

**Task ops:**

- edit S1.T1 { desc="Verificar el punto de partida antes de tocar nada. Sobre develop con los cambios de UPONE-1756 ya mergeados, en una rama propia UPONE-1769-... (el repo up1 exige ese prefijo). Confirmar en el mod fuente de curriculum-mapping que: (a) CompetencyAlignment ya declara planId y su indice individual de planId, (b) el objeto CompetencyNodeDevelopmentLevel ya existe, y (c) los renames de UPONE-1753 ya estan aplicados (developmentLevelId, catalogos DevelopmentLevel/PerformanceScale; sin rastros de coverageLevelId ni LevelScheme). Precondicion dura: si develop todavia no contiene los cambios de UPONE-1756 (falta planId, su indice individual o CompetencyNodeDevelopmentLevel), detenerse y reportar el bloqueo en vez de crear esos elementos o de trabajar sobre la rama de 1756. Dejar registrado el commit base de develop y el nombre de la rama creada.", rollback="No hay cambios que revertir: es verificacion de solo lectura. Si se creo la rama UPONE-1769-..., borrarla con git branch -D y volver a develop." }

## Sessions

### Session 1 · T1 · continue

**Tasks:**
- [x] S1.T1
- [x] S1.T2
- [x] S1.T3
- [x] S1.T4
- [x] S1.T5
- [x] S1.T6

### Session 2 · T0 · continue
