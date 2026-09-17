---
id: TICKET-147-SPEC
project: up1
ticket: TICKET-147
status: approved
---

# Sacar la creación de `core_Role` de los seeds de cd y cm: los roles curriculares quedan solo como perfil (`core_ModRole`) mapeado a Admin/Consultor

## Resumen ejecutivo

Se elimina la creación de los 4 `core_Role` curriculares desde los seeds de curriculum-design y curriculum-mapping (`seed/_data-rbac.js` + su import/llamada en `seed/seed.js`) y se reduce el `profileRoleMapping` de ambos `config/app.json` al único compuesto Admin/Consultor -> "Disenador Autoridad". Los 4 perfiles siguen existiendo como `core_ModRole`, creados por el sync desde `mods/<mod>/profiles/*.json`, y su efectivo de capabilities no cambia. NO se toca core (`object-manager`), NO se tocan los roles institucionales (Admin/Viewer/Consultor/Coordinador/Estudiante/Gestor/Facilitador), NO se agregan mapeos a Coordinador/Gestor y NO se modifica ningún PR de baseline ya mergeado. Verificación observable: tras reset+seed+sync local, una consulta read-only a `core_Role` no devuelve los 4 nombres curriculares y sí devuelve los institucionales; los `core_ModRole` de los 4 perfiles sí existen; los tests de rbac/equivalencia de cd y cm quedan en verde validando el efectivo por NOMBRE DE PERFIL. Tamaño: 3 sesiones (~6-7 h), 2 repos de mod, ~10 archivos. ADVERTENCIA (fuera de alcance, no se implementa): (a) el cleanup por tenant poblado de asignaciones a `core_Role` curriculares huérfanas requiere confirmación tenant por tenant y va en su propio follow-up; (b) por BUG-curriculum-design-019 el core repone capabilities a Admin/Consultor, así que este cambio NO reduce el efectivo de esos roles ni debe validarse como si lo hiciera.

## Requirements

### REQ-PRESERVE-01 `confirmed`
> Fuente: curriculum-design/docs/rbac/baseline-curricular-caps-2026-09-02.json:8; curriculum-mapping/tests/unit/rbacRoles.test.js:780

El efectivo de capabilities de cada uno de los 4 perfiles curriculares (`core_ModRole`: Diseñador, Autoridad, Revisor, Consultor Curricular) es idéntico antes y después del cambio, en cd y en cm: mismo set de capability keys, misma separación de funciones (Viewer/Editor/Approver/Publisher) y, en cm, la misma tributación SoD.

### REQ-PRESERVE-02 `confirmed`
> Fuente: curriculum-mapping/seed/_data-rbac.js:85; curriculum-design/docs/rbac/escenario-final-roles-curriculares.md:119

Los 4 perfiles siguen existiendo como `core_ModRole` tras reset+seed+sync, creados por el sync desde `mods/<mod>/profiles/*.json`, independientes del seed eliminado.

### REQ-01 `confirmed`
> Fuente: curriculum-mapping/seed/_data-rbac.js:85; object-manager/prisma/seed/up1/minimal/core-rbac.js:10

Un rebuild limpio (reset + seed + sync) NO crea ningún `core_Role` curricular desde cd ni desde cm: los seeds de ambos mods dejan de crear/renombrar `core_Role` y el catálogo institucional sembrado por core queda intacto.

### REQ-02 `inferred`
> Fuente: curriculum-design/config/app.json (paralelo verificado: academic-scheduling/config/app.json:6); RULE-curriculum-design-052

El `profileRoleMapping` de `config/app.json` en cd y cm conserva SOLO el mapeo compuesto Admin/Consultor -> perfil "Disenador Autoridad"; las 4 líneas granulares perfil -> rol curricular quedan eliminadas y el sync materializa el bridge sin referenciar roles inexistentes.

### REQ-03 `confirmed`
> Fuente: curriculum-mapping/tests/unit/rbacRoles.test.js:780

`rbacRoles.test.js` y `profileBaselineEquivalence.test.js` de cd y cm validan el efectivo por NOMBRE DE PERFIL (`core_ModRole`), no vía el `core_Role` institucional espejo, conservando los bloques de capabilities y de separación de funciones (y en cm la tributación SoD), y quedan en verde.
## Tasks

#### S1.T1 — Caracterización pre-cambio (baseline en verde ANTES de tocar código): correr reset+seed+sync sobre una copia local, capturar como fixtures versionados el set de capability keys por perfil (`core_ModRole`) de cd y cm, el listado completo de `core_Role` con su conteo, y el conteo de `core_ModRole` por mod. Dejar los fixtures fuera del store vivo, en el repo del mod junto a las suites.
Contrato: rollback: Borrar los archivos de fixture agregados (`git checkout --` de los paths nuevos); no se modificó ningún archivo existente.. Status: done

#### S1.T2 — Auditoría de reemplazo (DET-40): enumerar y documentar todos los consumidores de lo que se elimina — `_data-rbac.js` de cd y cm (import y llamada en `seed/seed.js`), las 4 líneas granulares del `profileRoleMapping` de ambos `config/app.json`, y toda referencia a los 4 nombres curriculares como `core_Role` en seeds, layouts (`roles[]`), tests y docs de ambos mods. Reportar qué se rompe y qué no antes de editar; contrastar con el patrón vivo `academic-scheduling/seed/minimal/config-rbac.js:7` que atacha caps sin crear `core_Role`.
Contrato: rollback: No hay cambios de código; descartar el documento de auditoría si no se usa.. Status: done

#### S1.T3 — Añadir el test de outcome (falla hoy, pasa al final): asserta que tras reset+seed+sync los 4 nombres curriculares NO están en `core_Role` y SÍ están en `core_ModRole`, con consulta read-only. Dejarlo marcado como pendiente esperado en esta sesión.
Contrato: rollback: Eliminar el archivo de test agregado.. Status: done

#### S2.T1 — curriculum-design: eliminar `seed/_data-rbac.js` completo y quitar su import (~L39) y su llamada (~L45) en `seed/seed.js`. Verificar que no queda ninguna otra referencia a `_data-rbac` ni a creación/rename de `core_Role` en `curriculum-design/seed/`.
Contrato: rollback: `git revert` del commit / `git checkout HEAD~1 -- curriculum-design/seed/_data-rbac.js curriculum-design/seed/seed.js` restaura el archivo y el cableado.. Status: done

#### S2.T2 — curriculum-design: reducir `config/app.json` a un único `profileRoleMapping` (compuesto Admin/Consultor -> "Disenador Autoridad"), eliminando las 4 líneas granulares perfil -> rol curricular. Respetar RULE-curriculum-design-052: el vínculo se DECLARA acá y lo materializa el sync; no se agrega runbook manual ni se mapea a Coordinador/Gestor.
Contrato: rollback: `git checkout HEAD -- curriculum-design/config/app.json` restaura las 4 líneas granulares; el sync las vuelve a materializar en el siguiente run.. Status: done

#### S2.T3 — curriculum-design: repuntar `tests/unit/rbacRoles.test.js` y `tests/unit/profileBaselineEquivalence.test.js` para resolver el efectivo por NOMBRE DE PERFIL (`core_ModRole`) en vez de vía el `core_Role` espejo, conservando intactos los bloques de capabilities y de separación de funciones (Viewer/Editor/Approver/Publisher). Correr la suite completa de cd y comparar contra los fixtures de baseline: diff vacío.
Contrato: rollback: `git checkout HEAD -- curriculum-design/tests/unit/` restaura ambas suites a su forma previa.. Status: done

#### S2.T4 — curriculum-design: lint + typecheck de los archivos tocados y reset+seed+sync local verificando el outcome — `core_Role` sin los 4 curriculares, `core_ModRole` con los 4 perfiles, institucionales de core intactos.
Contrato: rollback: Los pasos son de verificación; ante fallo, revertir los commits de esta sesión y re-correr el seed.. Status: done

#### S3.T1 — curriculum-mapping: eliminar `seed/_data-rbac.js` (copia literal de cd, usa `upsert` en ~L147 y toca `core_ModRole` en L85) y quitar su import (~L20) y su llamada (~L52) en `seed/seed.js`. Verificar que la referencia a `core_ModRole` que se pierde con el archivo esté cubierta por el sync desde `profiles/*.json` y no por este seed.
Contrato: rollback: `git checkout HEAD~1 -- curriculum-mapping/seed/_data-rbac.js curriculum-mapping/seed/seed.js`.. Status: done

#### S3.T2 — curriculum-mapping: reducir `config/app.json` al único `profileRoleMapping` compuesto Admin/Consultor -> "Disenador Autoridad", eliminando las 4 líneas granulares.
Contrato: rollback: `git checkout HEAD -- curriculum-mapping/config/app.json`.. Status: done

#### S3.T3 — curriculum-mapping: repuntar `tests/unit/rbacRoles.test.js` (referencia a `core_ModRole` en L780) y `tests/unit/profileBaselineEquivalence.test.js` para validar el efectivo por nombre de perfil, conservando capabilities, separación de funciones y la tributación SoD propia de cm. Suite completa en verde contra los fixtures de baseline.
Contrato: rollback: `git checkout HEAD -- curriculum-mapping/tests/unit/`.. Status: done

#### S3.T4 — Regresión integrada de cierre: reset + seed + sync limpio con ambos mods instalados, consulta read-only de `core_Role` y `core_ModRole`, conteos contra los fixtures del baseline (core_Role = baseline - 4, core_ModRole = baseline), suites de cd y cm en verde, lint/typecheck de todos los archivos tocados. Confirmar explícitamente en el reporte que NO se tocó `object-manager` ni ningún PR de baseline mergeado, y dejar registrada como advertencia la carencia de cleanup de tenants poblados (fuera de alcance, requiere confirmación por tenant).
Contrato: rollback: Revertir los commits de las sesiones 2 y 3 en ambos mods y re-correr reset+seed+sync para volver al estado previo.. Status: done
## Sessions

### Session 1 · T1 · continue

**Tasks:**
- [x] S1.T1
- [x] S1.T2
- [x] S1.T3

### Session 2 · T2 · continue

**Tasks:**
- [x] S2.T1
- [x] S2.T2
- [x] S2.T3
- [x] S2.T4

### Session 3 · T2 · continue

**Tasks:**
- [x] S3.T1
- [x] S3.T2
- [x] S3.T3
- [x] S3.T4
