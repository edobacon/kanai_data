# UPONE-1456 - Instrucciones de integracion del seed rev.2

> Para cuando se tome [TICKET-113](../../../../../deckard/projects/up1/tickets/TICKET-113.md) (open, bloqueo parcial).
> Fuente: paquete rev.2 del autor (PM #097), 2026-07-24, en esta misma carpeta.
> Baseline: analisis original `../UPONE-1456-analisis-seed.md` (2026-07-21).
> Verificado contra el codigo real (no solo contra la respuesta del autor) el 2026-07-24.

## Que es este paquete

Rev.2 del seed de demo para el tenant UPU. Responde a las 6 preguntas que se le enviaron al autor y reconcilia el dataset contra `origin/develop` (22-jul). El detalle punto por punto esta en `RESPUESTA-UPONE-1456.md` y el instructivo de pegado en `HANDOFF-SEED-EDU.md` (ambos en esta carpeta).

Orden de carga en `seed()`:
```
loadAcademicPrograms -> loadCurricula -> loadMallas -> loadSyllabusSections -> loadCourseOfferings -> loadChangeLog
```

## Veredicto: que quedo resuelto y que NO

| # | Problema (del analisis 2026-07-21) | Estado rev.2 | Evidencia |
|---|---|---|---|
| P1 | `Activity.executionUnit` apuntaba a `AcademicExecution` (inexistente) | ✅ Resuelto | `_data-mesh.js:958-965` find-or-create Faculty `UPU-FAC-ING` (recordType Faculty) + `:975` puebla `executionUnitId` |
| P2 | Offerings/ActivityLine contra 12 asignaturas curadas fuera de la malla; 2/18 lineas; faltan orgUnits CIE/ING | ✅ Resuelto | `_data-offerings.js:7-18` 12 lineas mapeadas al mesh real; `:148-149` crea Faculties CIE/ING; `:177-178` orgUnitId siempre resuelto + console.warn |
| P3 | Reconciliacion de campos/relaciones vs schema actual | ✅ Resuelto | Reconciliado vs develop; syllabus con 374 refs reales, 0 codigos viejos |
| P4 | No vienen `requirement` ni graduation profile | ✅ N/A por diseno | Se crean por UI/MCP (UPONE-1378) |
| - | Servicios `ServiceOffer` | ✅ Excluidos | Fuera (dominio engagement); quitadas 5 lineas SVC + 30 offerings |
| **P5** | 🔴 `_data-mesh.js` setea `workflowId`/`currentStatusId` y busca workflow `activity-standard`/`PUB` (SS-423 + TICKET-114 los eliminaron) | ❌ **NO resuelto** | `_data-mesh.js:953-954` y `:977` identicos al original. Crashea contra develop |
| **P6** | `_data-changelog.js` carga en `prisma.changeLog` (retirado por TICKET-102, ahora `core_DataLog`) y usa codigos de Activity viejos | ❌ **NO resuelto** | `_data-changelog.js:180,182` modelo muerto; 33 de 39 entradas de Activity apuntan a codigos que la rev.2 saco de la malla |

Conteos rev.2: offerings `18/160 -> 12/120`; mesh `301/80/549` (sin cambio, + executionUnit poblado); syllabus `374`.

## Fix P5 - `_data-mesh.js` (loader, no depende del autor)

Es el fix que la pregunta 7 marcaba como responsabilidad del dueno del mod. Dos cambios en el mismo bloque:

1. Borrar el lookup de workflow (lineas 953-954):
```js
  const wf = await prisma.workflow.findFirst({ where: { name: 'activity-standard', institutionId: institution.id } });
  const pub = await prisma.workflowStatus.findFirst({ where: { code: 'PUB', institutionId: institution.id } });
```

2. En el `create` de Activity (linea 977), reemplazar los dos campos muertos por el enum `status`. El dato nacia `PUB`, y el remap oficial es `PUB -> Active` (`activity.json:140`):
```js
// ANTES
        executionUnitId: execUnit ? execUnit.id : null,
        workflowId: wf ? wf.id : null, currentStatusId: pub ? pub.id : null, versionLabel: 'v2026-actual',
// DESPUES
        executionUnitId: execUnit ? execUnit.id : null,
        status: 'Active', versionLabel: 'v2026-actual',
```

> El seed usa `prisma.activity.create` (raw), no `createInstance`, asi que setear `status:'Active'` directo no dispara `enforceEnumTransitions`. Sin `status` cae al default `Draft` y la demo quedaria toda en borrador.

## Fix P6 - `_data-changelog.js` -> `core_DataLog`

El objeto `ChangeLog` ya no existe. Migrar el loader a `core_DataLog` (modelo Prisma `dataLog`). El shape mapea casi 1:1; `changes` es exactamente el diff por campo que ya trae ChangeLog.

### Mapping de campos

| ChangeLog | core_DataLog | Nota |
|---|---|---|
| `entityType` | `objectName` | AcademicProgram/Curriculum/Activity son objectNames validos |
| `entityCode` | resolver -> `recordId` | ya lo hace `findFirst({where:{code}})` |
| `action: "Update"` | `action: "UPDATE"` | directo |
| `action: "StateTransition"` | `action: "UPDATE"` + `metadata.customAction:"StateTransition"` | no esta en el enum de DataLog |
| `field`/`oldValue`/`newValue` | `changes: { [field]: { old, new } }` | formato UPDATE nativo de DataLog |
| `source` | `metadata.source` | "DirectEdit"/"Workflow" |
| `userId` | `userId` | directo |
| `createdAt` | `createdAt` | directo |
| (n/a) | `updatedAt` | = `createdAt` (required) |
| (derivar) | `historyKey: "{objectName}:{recordId}"` | necesario para el visor "Historial" |
| (n/a) | `parentObject`/`parentId`/`childRecordType` | null (cambios directos, no hijos polimorficos) |

Enum de `action` en DataLog: `CREATE, UPDATE, DELETE, BULK_CREATE, BULK_UPDATE, BULK_DELETE, IMPORT` (no hay StateTransition).

### Limpieza obligatoria (si no, se pierde ~85% del historial de Activity en silencio)

El autor NO regenero el changelog (byte a byte igual al original). Cruzando contra la malla nueva:
- AcademicProgram (60) y Curriculum (63): todos resuelven, entran directo.
- Activity (39): solo 6 resuelven (`111026C`, `RED109`). Las otras 33 usan codigos curados viejos.

**Remapear los codigos de Activity con la tabla curado->mesh del autor** (`RESPUESTA-UPONE-1456.md`):

| Historial (viejo) | Mesh C-* (nuevo) |
|---|---|
| MAT101 | C-CALCULOI-001 |
| SYL-CALC-101 | C-CALCULOII-006 |
| ALG102 | C-ALGEBRALIN-002 |
| FIS103 | C-FISICAIIIO-020 |
| QUI104 | C-QUIMICAGEN-004 |
| EST106 | C-ESTADISTIC-107 |
| ING107 | C-INGLESTECN-239 |
| ECO108 | C-ECONOMIAPA-019 |
| PRG105 | C-FUNDAMENTO-255 |
| GES110 | C-GESTIONDEP-077 |
| RED109 | RED109 (sin cambio) |
| 111026C | 111026C (sin cambio) |
| TIR101 | descartada -> **dropear sus 3 entradas** |

**Vocabulario de estado** en los 34 `StateTransition`: los valores `"Borrador"/"Publicado"` son del workflow retirado. Remapear a `Draft`/`Active` (mismo criterio que P5).

### Alternativa a P6

Si no interesa el historial de demo: quitar `loadChangeLog` de `seed.js` y no copiar `_data-changelog.js`. El DataLog se puebla solo con las mutaciones reales de la plataforma. Costo cero, pero se pierde el historial dummy.

## Decisiones abiertas para el dev

1. **Convivencia con `_data-malla.js`**: develop ya trae la maqueta UPONE-1345 (4 lineas, 1 plan); este paquete es la malla amplia (20 planes, 549 planEntry). El autor recomienda convivir (no chocan por claves naturales). Decidir.
2. **Fisica**: mapeada a "Fisica III" (no habia "Fisica General" en el mesh). Ajustable.
3. **P6**: migrar a DataLog (con remap de codigos) vs dropear el loader.

## Checklist de integracion

- [ ] Copiar los loaders al `seed/` del mod `curriculum-design`.
- [ ] Aplicar fix P5 en `_data-mesh.js`.
- [ ] Resolver P6 (migrar a DataLog con limpieza, o dropear).
- [ ] Registrar loaders en `seed.js` en el orden indicado.
- [ ] Correr sync (fase 8) contra tenant UPU y validar con `PLAN-VALIDACION.md` (3 capas: modelo, DB, smoke).
- [ ] Cerrar BL-1 y BL-2 del ticket.
