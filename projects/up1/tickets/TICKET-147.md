---
id: TICKET-147
project: up1
type: ticket
status: closed
work_type: refactor
external: UPONE-1848
module: curriculum-design
autopilot: autonomous
---

## Objetivo

Que un rebuild limpio (reset + seed + sync) NO cree los 4 `core_Role` curriculares. Los roles de dominio curricular (Diseñador, Autoridad, Revisor, Consultor Curricular) deben vivir SOLO como perfil (`core_ModRole`) en el mod. Las identidades asignables a nivel core se limitan a los roles que YA existen en la plataforma: Admin y Consultor.

## Contexto y decisión

Dirección de Juan Diego Galdames (dueño del diseño RBAC de up1) y reafirmada por Eduardo (2026-09-11): un mod no debe crear `core_Role`; solo aporta el perfil y lo mapea a roles institucionales que ya existen.

Desbloqueante verificado en develop (2026-09-11): up1 core ya define su catálogo institucional en `object-manager/prisma/seed/up1/minimal/core-rbac.js` (SEED-02, UPONE-1493), aplicado a todos los tenants ANTES de los seeds de mods: Admin/Viewer/Consultor + Coordinador/Estudiante/Gestor/Facilitador (record-only, sin grants; cada mod atacha sus caps por nombre vía su `config-rbac`). Patrón de referencia vivo: `academic-scheduling` atacha caps a `Coordinador` sin crear ningún `core_Role`.

Decisión de ruteo: lo curricular llega vía el compuesto Admin/Consultor (perfil "Disenador Autoridad" -> `[Admin, Consultor]`). NO se mapea a Coordinador/Gestor (roles académicos genéricos, no curriculares). Los 4 perfiles quedan "dormidos": existen como `core_ModRole`, sin `core_Role` espejo. Se acepta perder la asignación granular por persona ("Admin/Consultor bastan").

## Alcance (100% en mods, core NO se toca)

Solo `curriculum-design` + `curriculum-mapping`. Verificado que ningún seed de core crea los curriculares; los únicos creadores son cd (`_data-rbac.js` L138 `createMany`) y cm (`_data-rbac.js` L147 `upsert`). Core sigue creando los institucionales legítimos (Admin/Consultor/base), que quedan intactos.

## Plan de implementación

1. cd: eliminar `seed/_data-rbac.js` (todo su contenido era crear/renombrar `core_Role` + cablear caps ya vacías) y quitar el import + la llamada en `seed/seed.js` (~L39 import, ~L45 call).
2. cm: idem (copia literal, usa `upsert`); quitar import (~L20) y llamada (~L52) en `seed/seed.js`.
3. `config/app.json` de cd y cm: quitar las 4 líneas granulares del `profileRoleMapping` (perfil -> "Learning Assurance X Curricular"); dejar SOLO el compuesto Admin/Consultor -> Disenador Autoridad.
4. Repuntar tests `rbacRoles.test.js` y `profileBaselineEquivalence.test.js` en cd y cm: validar el efectivo del PERFIL por nombre, no vía el rol institucional. Conservar los bloques de capabilities y separación de funciones (Viewer/Editor/Approver/Publisher; en cm además tributación SoD).

Los perfiles (`core_ModRole`) los crea el sync desde `mods/<mod>/profiles/*.json`, independiente del seed: sacar la creación de `core_Role` NO los afecta.

## Migración (tenants ya poblados)

Para rebuild limpio no aplica (arranca vacío). En tenants ya poblados, si algún usuario tiene asignado un `core_Role` curricular, eliminarlo orfanaría la asignación: requiere cleanup por tenant (DELETE, como las 108 filas del follow-up 1615). Confirmar por tenant antes de aplicar.

## Validación

1. Reset + seed + sync local, consulta read-only a `core_Role`: los 4 curriculares NO aparecen; los `core_ModRole` sí (prueba del outcome).
2. Tests de cd y cm en verde tras el retrabajo.
3. Lint/typecheck de los archivos tocados.

## Relación

Follow-up de UPONE-1848 (baseline RBAC de preservación) y de la migración a application profiles de UPONE-1615. NO va sobre los PRs de baseline ya mergeados (#60 cd / #141 up1 / #29 cm). Se hace en rama/ticket propio.

Detalle completo en el KB sp10: doc "Deuda RBAC: los mods no deben crear core_Role (solo perfil + mapeo a roles institucionales existentes)".
