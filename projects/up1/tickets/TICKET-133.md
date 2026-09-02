---
id: TICKET-133
project: up1
type: ticket
status: open
work_type: refactor
external: UPONE-1615
module: curriculum-design
autopilot: manual
---

# Curriculum Design &amp; Curriculum Mapping · Implementar lógica de Roles internos

## Request

Migrar la lógica de permisos de roles curriculares desde el cuelgue directo en el rol hacia sets por módulo, para que Curriculum Design y Curriculum Mapping definan alcances distintos sin conflicto, con nombres de rol estandarizados. Alcance completo: declarar 8 sets (2 base + 6 extensiones, 4 por módulo) con composición por módulo (no espejo); renombrar 4 roles a formato "Learning Assurance - <Rol>" reutilizando las entidades existentes (conservando las 120 asignaciones); completar la capability de lectura de institución en la base de Curriculum Design; retirar el rol huérfano GestorCurricular y 2 sets fixture; auditar capabilities por rol contra las acciones declaradas; verificación runtime de permisos efectivos rol por rol; cobertura que ejercite el camino real (vinculación, herencia, deduplicación, renombre sobre base con nombres viejos); avisar al core sobre el punto ciego de protección de nombres (no bloqueante); y crear los vínculos rol-set (diferido dentro del ticket a la espera de la definición del mapeo de roles core). No construye el mecanismo de sets (existe en core desde UPONE-1353/1354). Bloqueantes UPONE-1353/1354 Finalizados. Coordinar con UPONE-1619 (mismo seed/_data-rbac.js), UPONE-1616 y UPONE-1530.

## Classification

| Campo | Valor |
|-------|-------|
| Tipo de trabajo | refactor |
| Tipo de cambio | — |
| Modulo principal | curriculum-design |
| Modulos afectados | — |

## Triage

### Reconciliado a sp10
> El analisis de intake original (detective-mode, sp9) fue reconciliado al mecanismo vigente. La verdad sp10 vive en la seccion "Reconciliacion sp10" del spec y en los requisitos. Refs de linea vigentes: `instance.resolver.js:1708` (listInstances), `app.resolver.js:132-141` (navByRole / profile-gating), `authChecker.js:118-119` (selectedRole), `dbSync.js:1481` (syncAppProfileMapping) / `:1393-1442` (gate XOR), `object-manager/scripts/sync/roleNaming.js`. Nombre de rol: `Learning Assurance <Rol>` (sin guion).

### Hipotesis (estado sp10)
Hechos de mecanismo confirmados en codigo (siguen validos, ahora via application profiles):
- El mecanismo (perfiles `core_ModRole`, herencia por `extendsId`, dedupe por nombre, aislamiento por app) existe integro en core; el ticket lo consume (H1-H5).
- Un perfil solo concede; "lo que el rol declara gana" por dedupe (H2-H3).
- Los 4 roles no tienen capability de institucion; crear plan la requiere via `listInstances` gateado por `:view` (`instance.resolver.js:1708`) (H7).
- Toda cap nueva se auto-otorga a Admin/Consultor/Colaborador por `DEFAULT_ROLES` (refill de core); por eso se excluyen del smoke de scoping (H8, Learn L1).
- Con rol activo seleccionado los permisos no se acumulan (`authChecker.js:118-119`) (H10).

Hipotesis sp9 SUPERSEDED por sp10 (ver "Reconciliacion sp10"):
- **H9** ("app sin roles = publica") -> INVALIDA: visibilidad por profile-gating (`navByRole`), nunca publica; borrar mappings oculta (`app.resolver.js:132-141`, UPONE-1700).
- **H11** (auto-create del huerfano desde layout) -> la causa se cerro (UPONE-1699).
- **H12** (aviso a core por `validateModRoleNameCollisions`) -> el detector fue eliminado (UPONE-1699); el aviso se reformula (la deteccion de colisiones quedo sin cobertura), no se da por cerrado (REQ-NOTIFY-01).

Hipotesis de runtime a validar en ejecucion: HR1 (equivalencia efectiva post-traslado == baseline), HR2 (institucion desbloquea el caso PO end-to-end), HR3 (renombre sobre base con nombres viejos deja 4 roles, no 8), y el aislamiento por app de `institution:view` (verificado en la task de aislamiento de S2, precondicion dura).

### Context found
Migracion mod-only (Aduana `mal-encuadrado`): el mecanismo ya existe en core (UPONE-1353/1354). El detalle verificado y las decisiones estan en la seccion "Reconciliacion sp10" del spec y en los DEC-LOCAL. KB previo: `kb/sp9/UPONE-1615-*`, `kb/sp8/UPONE-1538-rbac-institution-view-gap.md`.
## Setup

### Environment
| Campo | Valor |
|-------|-------|
| Branch | rama del mod para el PR (curriculum-design/mapping); coordinar rebase con UPONE-1619/1633 sobre `_data-rbac.js` |
| Base branch | develop |
| DB state | (a) estado vigente del store del proyecto para el baseline read-only de caps efectivas (S1); (b) **copia** del store con los 4 roles curriculares en sus **nombres viejos** y sus 120 `core_RoleAssignment` para verificar el renombre en S3 (sobre copia, nunca el vivo) |
| Services | sync del mod (`syncAppProfileMapping` / seed); UPU operable con **selector de rol activo** para el smoke runtime de S6 |
| Test data | los 4 roles curriculares + Admin/Consultor con sus asignaciones; baseline de caps efectivas por rol y run verde de `rbacRoles.test.js` de cd y cm como before de regresion (ambos capturados en S1) |
## Learns

| # | Learn | Detected by | Session | Status | Promoted to |
|---|-------|-------------|---------|--------|-------------|
| L1 | BLOCKER DE CORE A REPORTAR (por que Admin y Consultor siguen con todos los permisos aunque se les cablee un perfil acotado). El core re-otorga automaticamente TODA capability nueva a los roles default como permiso DIRECTO: `assignNewCapabilitiesToDefaultRoles` en `object-manager/src/services/auth/generateCapabilities.js:331-357` define `DEFAULT_ROLES = ['Admin','Consultor','Colaborador']` y hace upsert de `core_RoleCapability` con `defaultValue:'allow'` por cada capability generada. Consecuencia: mapear Admin/Consultor a un perfil compuesto NO reduce su efectivo (su techo siguen siendo los ~166 directos que el core repone); el estado 'solo por perfil' exige sacarlos de `DEFAULT_ROLES` en core (cross-cutting). El cableado del mod queda future-proof. ACCION: reportar como ticket de plataforma / coordinar con UPONE-1633. Es la causa raiz de que 'Consultor' tenga los mismos 166 caps que Admin, y el fundamento de excluir a Admin/Consultor del smoke de scoping (REQ-SMOKE-01). | dev | — | raw | — |
| L2 | **SUPERSEDED (sp10, DEC-LOCAL-12).** Decia que el vinculo rol->set no tenia path de seed/sync y que la asignacion del `modRoleId` era ops MANUAL via up1-manager (runbook), con la privatizacion via array `roles` en app.json. Bajo sp10 ya NO aplica: el vinculo es DECLARATIVO (`profileRoleMapping` + `syncAppProfileMapping`, dbSync.js:1481), sin runbook; la visibilidad se privatiza por profile-gating (`navByRole`); el array `roles` es mutuamente excluyente con `profileRoleMapping` (gate XOR, dbSync.js:1424-1428); y el gotcha de borrado de filas stale de `syncAppRoles` no aplica a apps basadas en perfiles. Texto historico en git. | dev | — | superseded | — |
## Failed approaches
## Failed approaches

| # | Approach | Why it failed | Learned |
|---|----------|---------------|---------|

## Sessions

### Plan de sessions (sp10)

6 sesiones, cada una cierra con su **gate de verificación** (DET-20, última tarea de la sesión). El detalle (tasks, validations, rollbacks) vive en el spec (`## Tasks`).

| # | Objetivo | Tier |
|---|----------|------|
| S1 | Baseline + matriz de auditoria: caps efectivas por rol + run verde de la suite RBAC (before) + matriz accion->capability (gate real, `instance.resolver.js:1708`) + huecos. Gate de cierre | T2 |
| S2 | Autoria de perfiles: `profiles/` (base + extensiones + **compuesto Admin/Consultor**) en cd y cm; `institution:view` en la base de cd; absorber caps de 1619/1633; convencion de nombres. **La verificacion de aislamiento por app es precondicion dura de declarar institucion**. Gate de cierre | T3 |
| S3 | Renombre de los 4 roles a `Learning Assurance <Rol>` (sin guion) sobre base con nombres viejos; barrido GLOBAL del monorepo. Gate de cierre | T2 |
| S4 | Cableado declarativo (`profileRoleMapping`, incl. Admin/Consultor -> compuesto) + gate XOR + privatizacion por profile-gating (visibilidad verificada, incl. Admin) + reconciliar paridad cd/cm. **Cambio atomico, gate fuerte** | T3 |
| S5 | Retiro del huerfano `GestorCurricular` + 2 fixtures; sync 2x confirma no-regeneracion. Gate de cierre | T3 |
| S6 | Verificacion final: matriz automatizada verde + smoke runtime con rol curricular activo (caso PO + Consultor read-only) + regresion RBAC (before/after) + verificacion de REQ-SET-02 (compuestos + mapeo) + doc del escenario final. Gate final | T3 |

**Coordinacion:** UPONE-1619 (mismo `_data-rbac.js` de cd) y UPONE-1633 (mismo `_data-rbac.js` de cm) tienen su task de secuenciacion en S2; UPONE-1616 (menu tras privatizar) se coordina en S4; UPONE-1530 (frontera del MCP) se avisa en S5. Diferido: mapeo de los 8 roles restantes del catalogo (DEC-LOCAL-14).
## Testing

### Coverage map

| REQ | Test cases | Type | Status |
|-----|-----------|------|--------|

### Test cases

| # | Case | REQ | Type | Precondition | Steps | Expected | Actual | Evidence | Status |
|---|------|-----|------|-------------|-------|----------|--------|----------|--------|

### Test artifacts

| File | Type | Created in task | Covers | Framework |
|------|------|-----------------|--------|-----------|

### Regression

| Suite | Command | Before | After | Delta |
|-------|---------|--------|-------|-------|

## Summary
