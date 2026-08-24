# Plan de revert — UPONE-1393 en `curriculum-design` (PR #18)

> **Fecha:** 2026-07-15
> **Objetivo:** dejar `develop` del mod `curriculum-design` **sin los cambios de UPONE-1393** (PR #18), porque el ticket presenta errores.
> **Alcance:** solo el mod `curriculum-design`. **No** cubre los otros dos "1393" (hotfix de RBAC en `object-manager` PR #402 y `layout` PR #292), que son un ticket distinto con el mismo número.

---

## 1. Contexto y hechos verificados

| Dato | Valor |
|------|-------|
| Repo | `uplanner/up1/mods/curriculum-design` (`git@bitbucket.org:uplanner/curriculum-design.git`) |
| Merge a revertir | `30cc27d` — "Merged in UPONE-1393 (pull request #18)" |
| Autor del merge | Francisco Navarro, 2026-07-14 |
| Aprobación | **Sin `Approved-by`** en el commit (merge sin aprobación registrada) |
| Parents del merge | `496b1d1` (mainline / develop previo) · `0581a17` (tip de la rama 1393) |
| Posición en develop | **Tip** de `develop` (no hay commits encima) |
| Estado remoto | Pusheado — `develop` == `origin/develop` (0/0) |
| Tamaño | 37 archivos, +1631 / -87 |

**Qué introdujo 1393 (se irá con el revert):**
- Objetos nuevos: `objects/PlanEnrollment.json`, `objects/ProgramEnrollment.json` → **tablas nuevas en BD**.
- Helper `logic/helpers/documentDependents.js`; cambios en `logic/curriculum-update.resolver.js`, `logic/polymorphicUpdate.resolver.js`, `logic/errors.js`.
- RBAC: `seed/_data-rbac.js`, `tests/unit/rbacRoles.test.js`.
- Validación de estado de curriculum + reverso Active→Draft (`assertNoActiveDependentsOnRevert`).
- Layouts de `curricularsection`, ajustes de columnas de status, i18n.

**BD:** datos de prueba (tenant UPU / `uplanner_upu`) — desechables. Rebuild + reseed autorizado.

---

## 2. Impacto en la rama en curso `feat/UPONE-1382-hard-delete-cascade`

Verificado que **1382 NO arrastra 1393** (no hay riesgo de re-ingreso vía el PR de 1382):

| Verificación | Resultado |
|---|---|
| ¿`30cc27d` (merge 1393) es ancestro de 1382? | **NO** — 1382 branchó de `0d0a810` (PR #19), anterior a 1393 |
| ¿Algún archivo de 1382 es idéntico a la versión de 1393? | **NO** — los 37 archivos dan `≠ 1393` |
| Artefactos nuevos de 1393 en 1382 (`PlanEnrollment.json`, `ProgramEnrollment.json`, `documentDependents.js`, `seed/_data-rbac.js`) | **ausentes** |

**Solape a revisar (no es re-ingreso, son ediciones independientes de 1382 sobre base pre-1393):** 14 archivos que ambas ramas tocaron por separado — layouts `default_Activity_{edit,list,view}`, `default_Curriculum_{edit,list,view}`, `default_Offering_syllabus_{edit,list,view}`, `default_AcademicProgram_list`; objetos `Curriculum.json`, `Offering.json`, `activity.json`; `lang/es/common.i18n.json`.

**Consecuencia al mergear el PR de 1382 (contra develop ya revertido):** entra la versión de 1382 (sin 1393). A lo sumo un conflicto de merge trivial en esos 14 archivos, que se resuelve a favor de 1382. Nada de 1393 vuelve.

---

## 3. Mecanismo de revert (decisión abierta)

`git revert -m 1 30cc27d` — commit nuevo que deshace el merge. **Sin reescribir historia, sin force-push** (seguro en rama compartida; sin conflictos porque 1393 es el tip). `-m 1` = mainline es develop antes del merge.

Elegir cómo llega a develop:

- **Opción A — push directo a develop** (rápido).
- **Opción B — vía rama `revert/UPONE-1393` + PR** (deja traza/review, igual que entró el merge). **Recomendada** si develop tiene review obligatorio.

> Descartada: `reset --hard` + `--force-push`. Aunque 1393 es el tip y sería posible, reescribe historia pusheada de una rama compartida.

---

## 4. Plan por fases

> En un mod, revertir el fuente NO alcanza: hay que propagar al core (sync → codegen → BD). Sin la cadena completa el mod y la BD quedan en drift.

### Fase 1 — Revertir el merge (git)

**Opción A (push directo):**
```bash
cd /Users/edobacon/Workspace/uplanner/up1/mods/curriculum-design
git checkout develop && git pull
git revert -m 1 30cc27d       # msg: "Revert UPONE-1393 (PR #18): <motivo de los errores>"
git push                       # requiere confirmación explícita del dev
```

**Opción B (vía PR):**
```bash
cd /Users/edobacon/Workspace/uplanner/up1/mods/curriculum-design
git checkout develop && git pull
git checkout -b revert/UPONE-1393
git revert -m 1 30cc27d
git push -u origin revert/UPONE-1393   # abrir PR contra develop
```

**Validación:** `git show` del revert lista los 37 archivos deshechos; `objects/PlanEnrollment.json` y `objects/ProgramEnrollment.json` fuera de `objects/`.

### Fase 2 — Propagar al core (sync)
```bash
cd /Users/edobacon/Workspace/uplanner/up1
npm run sync
```
**Validación:** `git status` en los core workspaces (`object-manager/objects/`, `suite/modsComponents/`, `lang/`, seeds) muestra los borrados/reverts esperados; sin cambios fuera de 1393.

### Fase 3 — Regenerar schema (codegen)
```bash
npm run codegen --workspace=@uplanner/object-management-backend
```
**Validación:** `prisma/schema.prisma` sin los modelos `PlanEnrollment` / `ProgramEnrollment`; sin errores de codegen.

### Fase 4 — Rebuild + reseed de BD (destructivo, autorizado)
BD de prueba desechable → reset limpio para evitar drift (tenant UPU):
```bash
npm run tenant:reset  --workspace=@uplanner/object-management-backend
npm run tenant:migrate --workspace=@uplanner/object-management-backend
npm run seed          --workspace=@uplanner/object-management-backend
```
> Confirmar args/flags exactos del tenant (algunos scripts esperan `--tenant UPU`) al ejecutar.

**Validación:** las tablas `*_planenrollment` / `*_programenrollment` ya no existen; el resto del tenant intacto.

### Fase 5 — Smoke
```bash
npm run dev --workspace=@uplanner/object-management-backend
```
**Validación:** el backend levanta sin errores; el schema GraphQL no expone los tipos de 1393; sin drift Prisma.

---

## 5. Checklist

- [ ] Fase 1 — revert commit en develop (opción A o B) + push (con OK del dev)
- [ ] Fase 2 — `npm run sync` y diff revisado
- [ ] Fase 3 — `npm run codegen` sin los modelos de 1393
- [ ] Fase 4 — `tenant:reset` + `migrate` + `seed` en UPU
- [ ] Fase 5 — smoke backend OK
- [ ] Revisar los 14 archivos compartidos cuando se integre el PR de 1382

---

## 6. Notas / advertencias

- **Motivo del revert:** dejarlo explícito en el commit message (qué errores presenta 1393) para traza.
- **Re-merge futuro de 1393:** con la opción A/B (revert commit), si más adelante se quiere re-integrar 1393 hay que revertir-el-revert (gotcha clásico de `git revert` sobre merges).
- **Los otros dos "1393"** (RBAC en `object-manager` PR #402 y `layout` PR #292) NO se tocan en este plan: es otro ticket, ya enterrado bajo PRs posteriores, y con dependencia de UPONE-1380.
