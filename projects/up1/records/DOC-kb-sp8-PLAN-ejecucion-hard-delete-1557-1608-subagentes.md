---
id: DOC-kb-sp8-PLAN-ejecucion-hard-delete-1557-1608-subagentes
project: up1
type: doc
---

# Plan de ejecucion: hard-delete 1557 + 1608 con sub-agentes

> Orquestacion agent-driven de tres tickets DKC listos para ejecutar
> (`status: design-transition-to-execute`). Un sub-agente desarrollador por
> ticket, aislado en git worktree. No crea Jira nuevo: los tres ya tienen su
> ticket. Fecha: 2026-08-12. Sprint: SP8.

## Tickets en alcance

| DKC | Jira (`external`) | Epic | Modulo / workspace | work_type | autopilot | Spec |
|-----|-------------------|------|--------------------|-----------|-----------|------|
| TICKET-122 | UPONE-1557 (backend) | UPONE-1557 | `object-manager` | fix | false | SPEC-object-manager-fix-bulkdelete-rt-projection |
| TICKET-130 | UPONE-1557 (frontend) | UPONE-1557 | `layout` | fix | super | SPEC-layout-fix-recordlist-bulkdelete-error-render |
| TICKET-129 | UPONE-1608 | UPONE-1267 | `object-manager` | fix | super | SPEC-object-manager-fix-preview-rt-alias |

**Que resuelve cada uno**
- **122** (UPONE-1557 backend): `deleteBulkInstances` cuenta la proyeccion RT
  propia (`rt__<Rt>__<base>`) como referencia externa y bloquea con
  `CONSTRAINT_VIOLATION` sin referencia real. Se lleva el bulk a paridad con
  el borrado individual. Fix en `referenceValidationService.js` +
  `instance.resolver.js`.
- **130** (UPONE-1557 frontend): un bloqueo legitimo del borrado via
  `deleteBulkInstances` se escribe en `error.value` y reemplaza la lista por
  el `<ErrorState>` full-view en vez de mostrar un aviso (toast). Se lleva la
  rama `else` de `handleCriticalDeleteConfirm` a la paridad que UPONE-1600 ya
  dio al path individual. Fix en `RecordList.vue`.
- **129** (UPONE-1608): los previews de impacto (`deleteImpactPreview` /
  `softDeleteImpactPreview`) revientan con `PrismaClientValidationError` al
  recibir un alias RecordType. Se extrae un helper compartido
  `resolveRecordTypeToBaseObject` y se aplica en los dos previews. Fix en
  `instance.resolver.js` + `helpers/`.

## Veredicto Aduana

Los tres son modificaciones a mecanismos **core existentes** (motor de
borrado en `object-manager`, RecordList en `layout`), todos genericos y ya en
el workspace correcto (`layer: core`). No hay artefacto de mod que escalar:
**nada que delegar a `core-extension-writer`**. El helper nuevo de 129
(`resolveRecordTypeToBaseObject`) es justo el tipo de artefacto que Aduana
protegeria como core, y ya nace en core: frontera bien puesta.

## Criterio de agrupacion: solape de archivos, no solo el Jira

| Par | Repos/dirs | Chocan | Consecuencia |
|-----|-----------|--------|--------------|
| 122 (OM) + 130 (layout) | `object-manager/` vs `layout/` | No, disjuntos | Paralelo real |
| 122 (OM) + 129 (OM) | ambos `instance.resolver.js` + `docs/features/delete-cascade.md` | Si | Serie obligatoria |
| 130 (layout) + 129 (OM) | `layout/` vs `object-manager/` | No | Irrelevante entre si |

**Gate real:** 129 gatilla sobre **122** (no sobre "los dos de 1557"). El
choque es 122 con 129 (mismo `instance.resolver.js`, misma doc
`delete-cascade.md`). 130 no tiene relacion con 129.

**Sin dependencia de datos entre 122 y 130:** 130 necesita un bloqueo real
(referencia legitima que dispare `CONSTRAINT_VIOLATION`); 122 elimina los
bloqueos falsos. Complementarios, no dependientes: 130 se testea con un
registro genuinamente referenciado, exista o no el fix de 122.

## Topologia (monorepo up1, un working tree, aislamiento por worktree)

```
Fase 1  ─  UPONE-1557 (paralelo, disjunto)
  ├─ dev-122  worktree OM     rama UPONE-1557-om      (backend false-RESTRICT)
  └─ dev-130  worktree layout rama UPONE-1557-layout  (frontend toast vs error)
        └─► combinar ambas ramas → UPONE-1557 → un solo PR

Fase 2  ─  UPONE-1608 (tras cerrar 122)
  └─ dev-129  worktree OM     rama UPONE-1608
        rebase sobre 122 (resuelve el solape instance.resolver.js + delete-cascade.md)
```

## Integracion de 1557: un solo PR

Decision tomada: **una rama/PR `UPONE-1557`** con backend + frontend juntos.
Como es el mismo monorepo, los dos agentes corren en paralelo en ramas de
trabajo separadas (`UPONE-1557-om`, `UPONE-1557-layout`) y, al quedar verdes,
se combinan en una unica rama `UPONE-1557` para un solo PR. Los archivos son
disjuntos, asi que la unificacion es trivial (cero conflictos). El reviewer ve
el fix completo de 1557 (ambas caras) en un lugar.

## Contrato por sub-agente (patron agent-driven)

Cada dev-agent, en su worktree:

1. Ramifica desde `develop` (guarda de rama por repo destino; nunca commitea
   a `develop` ni a `master` directo).
2. Ratifica el spec. Estado de aprobacion:
   - 122: aprobado por dev (spec-approval `approved`).
   - 129: aprobado en super (spec-judge dual es el aprobador).
   - **130: `pending-dev-ratification`** — requiere OK del dev al arrancar.
3. Ejecuta las sessions via `dkc-execute-task` (transiciones canonicas
   open-session / start-task / done-task / close-gate), orden tests-first.
4. Valida contra **BD real tenant UPU** (no unit con Prisma mockeado:
   RULE-core-034; el mock consagra bugs de runtime). 130 ademas exige smoke
   runtime real (DET-36).
5. Commits granulares por gate, referenciando el id **Jira** (DET-19 / DET-27),
   nunca ids internos DKC en el repo de codigo.
6. Quality gate con **juez independiente** (dual para T2/T3, DET-23 / DET-35);
   no auto-aprueba.
7. Scribe persiste los records DKC en la rama de trabajo + `dkc-reindex` para HC.
8. **Se detiene antes de push y antes de close.** Ambos requieren OK explicito
   del dev, en todos los modos incluido super.

## Entorno de ejecucion

- **Checkout base: `uplanner/up1`** (default fijado, el dev no expreso
  preferencia). Ahi esta montada la plataforma + tenant UPU + mod
  `curriculum-mapping`, asi los tests real-DB y el smoke corren sin montar
  entorno. Los worktrees se crean desde ese repo.
- **Verificacion previa obligatoria** antes de lanzar agentes: `develop` al
  dia, `.env` apuntando a `uplanner_upu`, plataforma levanta. Sin eso los
  tests real-DB de 129/130 son humo. Si algo falta, reportar antes de tocar
  nada.
- Nota: este documento asume que `uplanner/up1` esta sano; ese estado no se
  inspecciono al redactar el plan.

## Datos de reproduccion (de los tickets)

- **122**: objeto base sin hijos con proyeccion RT (ej. `Availability` /
  `InstructorAvailability`, FK `availabilityId`), sin referencia externa real.
  Matriz de casing FK minuscula (`availabilityId`) y capitalizada (`OrgUnitId`).
- **129**: tenant UPU, mod `curriculum-mapping`, listado sobre
  `rt__Scheme__levelscheme` (sobre `LevelScheme`) con
  `deleteWarning: { type: "critical" }`.
- **130**: registro referenciado bajo regla Restrict que dispare
  `CONSTRAINT_VIOLATION` en el motor de cascada, sobre un objeto SIN
  `customDeleteMutation` (delete critico single que rutea por
  `deleteBulkInstances`).

## Orden de la serie OM (122 -> 129)

Recomendado **122 primero**: es el fix backend ancla de 1557, quirurgico y
`autopilot: false` (mas control del dev); 129 rebasea encima y hace su
extraccion del helper sobre base ya corregida. Reversible: si se prefiere 129
primero (crea el helper compartido y 122 lo consume), se invierte. La doc
`delete-cascade.md` la editan ambos: el segundo re-aplica sus cambios al
rebasear.

## Riesgos y notas

- **Solape 122/129 en `instance.resolver.js` y `delete-cascade.md`**: mitigado
  por la serie (129 despues de 122, rebase). No paralelizar estos dos.
- **Dos checkouts**: el codigo core existe en `Workspace/up1` y `uplanner/up1`;
  la BD/tenant UPU vive en `uplanner/up1`. Ejecutar donde esta la BD.
- **Push y close siempre preguntan**: el plan deja todo listo para PR, no
  mergea ni cierra sin OK del dev. El cierre DKC no implica merge (revision del
  team up1, RULE-dev-004).
- **El "ticket mayor" es la capa de orquestacion**, no un Jira nuevo. 1557 y
  1608 cuelgan de epics distintos (UPONE-1557 y UPONE-1267); no hay un padre
  Jira comun.
