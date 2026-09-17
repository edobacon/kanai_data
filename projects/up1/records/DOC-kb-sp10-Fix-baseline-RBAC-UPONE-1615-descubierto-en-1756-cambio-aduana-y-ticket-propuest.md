---
id: DOC-kb-sp10-Fix-baseline-RBAC-UPONE-1615-descubierto-en-1756-cambio-aduana-y-ticket-propuest
project: up1
type: doc
module: curriculum-mapping
tags:
  - RBAC
  - baseline
  - profileBaselineEquivalence
  - UPONE-1615
  - UPONE-1756
  - governance
  - core-extension
  - aduana
  - discovery
  - intake-futuro
---

# Fix baseline RBAC (UPONE-1615) descubierto en 1756: cambio, aduana y ticket propuesto

Evidencia para revisar DESPUÉS de cerrar UPONE-1756. Discovery surgido en la ejecución de 1756 (TICKET-143, gate sesión 1): 5 tests en rojo en el gate de preservación RBAC. Se saneó en ramas propias (fuera de la frontera todo-mod-only de 1756) y se documenta acá para formalizarlo como su propio ticket.

## El problema

`mods/curriculum-design/tests/unit/profileBaselineEquivalence.test.js` (gate cross-mod de preservación RBAC de UPONE-1615) reconstruye las caps efectivas de los 4 roles curriculares desde los perfiles de ambos mods y las compara contra el snapshot `docs/rbac/baseline-caps-2026-09-02.json` (artefacto UNTRACKED en la raíz del superrepo). Fallaban 5 casos por dos causas:
- **Drift de 1615**: `competencynodedevelopmentlevel:view` está en el perfil CM Consultor de develop (heredada por los 4 roles y por Admin/Consultor vía el perfil compuesto), pero AUSENTE del snapshot; el gate la cachaba como "added inesperado". Es deuda del propio 1615 (su snapshot quedó stale respecto a su perfil).
- **Delta legítimo de 1756**: los grants `competencyalignment:view/create/modify/delete` (SoD) que 1756 cablea a los roles curriculares, que el gate también cachaba.

## El cambio (en ramas dedicadas, NO en las feat/UPONE-1756)

- Repos y ramas:
  - `curriculum-design` (git propio): rama `fix/rbac-curricular-baseline-competency-caps`, commit `eadb045` — el test.
  - `up1` (superrepo raíz): rama `fix/rbac-curricular-baseline-competency-caps`, commit `08444f5` — el baseline (antes untracked, ahora versionado en esa rama).
- Detalle:
  - (1615) Se folded `competencynodedevelopmentlevel:view` (ordenada) al `effectiveCapabilities` de los 6 roles del baseline (los 4 curriculares + Admin + Consultor), documentado en `meta.refresh_2026-09-04`. Esto saca la cap del diff en los 4 roles (aserción b) y arregla también la (b') del compuesto.
  - (1756) `competencyalignment:*`: NO se consolidan en el baseline; se admiten como allowed-additions **per-rol** en el test vía `ALLOWED_ADDED_SOD_BY_ROLE` (view en los 4, create+modify en Diseñador, delete en Autoridad, siempre junto a `institution:view`). La aserción (b) pasó de comparar contra un array plano a `allowedAddedForRole(baselineName)`.
- Resultado: los 5 rojos quedan verdes (9 pass, 1 skip intencional) **con ambas ramas fix activas + curriculum-mapping en feat/UPONE-1756** (aporta sus caps SoD por working tree). Los repos se devolvieron a su rama previa; el fix vive solo en las ramas dedicadas.

## Aduana (frontera / owner)

Es **governance/plataforma, NO mod**. El baseline-caps es un artefacto de preservación **cross-mod de UPONE-1615**: snapshot de las caps efectivas de TODOS los roles, resuelto desde `core_RoleCapability` + herencia de perfiles de ambos mods. El gate vive físicamente en curriculum-design pero lee perfiles de cd Y cm: es un contrato RBAC transversal, no una feature del mod cd. **Ningún mod debería ownear el ciclo de vida del baseline**: los mods declaran sus caps, governance re-snapshotea. **No es de 1756** (todo-mod-only; no produce el baseline).

## Ticket propuesto (create-ticket)

- **Título**: Refrescar y versionar el baseline RBAC de preservación (UPONE-1615) ante caps nuevas cross-mod.
- **Tipo**: core-extension (governance RBAC).
- **Alcance**:
  1. Foldear `competencynodedevelopmentlevel:view` (1615) al baseline y regenerarlo desde BD viva para consistencia.
  2. Definir dónde vive VERSIONADO el baseline-caps (hoy untracked en `up1/docs/rbac/`): repo raíz vs object-manager.
  3. Formalizar el protocolo de allowed-additions per-rol del gate para caps de mods en vuelo (hoy ad-hoc en el test), de modo que agregar caps en un mod no rompa el gate sin una decisión de governance explícita.
- **Por qué es su propio ticket**: el baseline es un artefacto de preservación cross-mod de 1615, no una feature de curriculum-design ni de 1756. Acoplarlo a 1756 obligaría a un ticket todo-mod a mantener un contrato RBAC transversal que no produce; su ciclo de vida (refresh, versionado, tolerancia a caps nuevas) es responsabilidad de governance/core.

## Cómo reproducir verde / rollback

- Verde: activar AMBAS ramas `fix/rbac-curricular-baseline-competency-caps` (en up1 raíz y en curriculum-design) con curriculum-mapping en `feat/UPONE-1756-...`, y correr el archivo del gate.
- Rollback total: borrar las dos ramas dedicadas (`git -C mods/curriculum-design branch -D fix/rbac-...` y `git -C . branch -D fix/rbac-...`); develop ya tiene el baseline original restaurado (untracked) y cd/cm siguen en feat/UPONE-1756.

## Estado respecto de 1756

Los 5 rojos son preexistentes/cross-ticket (evidencia: con todo 1756 stasheado siguen rojos por `competencynodedevelopmentlevel:view`). El saneamiento vive fuera de 1756. Para el gate de 1756 se tratan como ajenos al alcance de S1, con esta evidencia como respaldo.
