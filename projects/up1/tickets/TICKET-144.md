---
id: TICKET-144
project: up1
type: ticket
status: discarded
work_type: fix
external: UPONE-1848
module: core
autopilot: manual
---

Follow-up de UPONE-1615 (roles curriculares -> application profiles), descubierto en la ejecución de UPONE-1756 (TICKET-143, gate sesión 1). Se busca enviarlo **junto con la tanda de PRs de 1756**.

KB: `DOC-kb-sp10-Fix-baseline-RBAC-UPONE-1615-descubierto-en-1756-cambio-aduana-y-ticket-propuest`.

## Problema
El baseline de preservación `docs/rbac/baseline-caps-2026-09-02.json` (hoy **untracked** en la raíz del superrepo) quedó **stale**: le falta `competencynodedevelopmentlevel:view` foldeada en los 6 roles (4 curriculares + Admin + Consultor). El gate cross-mod `profileBaselineEquivalence.test.js` (vive en curriculum-design, lee perfiles de cd Y cm) falla 5 casos cuando el baseline está presente.

Además, como el baseline está untracked, en CI el gate se **auto-saltea** (`MONOREPO_PRESENT` false -> `describe.skip`): hoy NO enforce nada en CI.

## Evidencia (verificada esta sesión)
- Con el baseline corregido (commit `08444f5`, up1-raíz, rama `fix/rbac-curricular-baseline-competency-caps`): el gate pasa **9 passed, 1 skip**.
- El fix del test (`eadb045` en curriculum-design) **YA está en `feat/UPONE-1756`** (byte-idéntico) -> el commit suelto es **redundante**. La única pieza real es el baseline corregido de la raíz.

## Alcance
1. Foldear `competencynodedevelopmentlevel:view` (1615) al baseline y **regenerarlo desde la BD viva** para consistencia.
2. **Decidir dónde vive versionado** el baseline (raíz del superrepo vs object-manager) para que el gate corra de verdad en CI (hoy se saltea por untracked).
3. Formalizar el protocolo de **allowed-additions per-rol** del gate (hoy ad-hoc en el test) para que agregar caps en un mod no rompa el gate sin decisión de governance explícita.

## Aduana / owner
Governance / core-extension, cross-mod. El baseline es un artefacto de preservación de TODOS los roles (resuelto desde `core_RoleCapability` + herencia de perfiles de ambos mods). **Ningún mod ownea su ciclo de vida**: los mods declaran caps, governance re-snapshotea. No es de 1756 (todo-mod-only).

## Decisión abierta que condiciona el envío con 1756
El baseline vive en la raíz del superrepo; los PRs de 1756 son en cd/cm. Para "enviar junto con 1756" hay dos caminos: (A) PR-companion en el superrepo empujado en la misma tanda; (B) relocalizar el baseline dentro de cd para que viaje en el PR de cd (rompe la aduana: un mod pasaría a ownear el baseline). Resolver antes de armar los PRs.

## Relación
Follow-up de UPONE-1615; descubierto en UPONE-1756.

## Descarte

**Motivo**: Superado por el trabajo ya incluido en feat/UPONE-1756; la pieza real del baseline RBAC (08444f5 en up1-raiz) esta cubierta ahi. Ticket redundante.

_Descartado el 2026-09-09._
