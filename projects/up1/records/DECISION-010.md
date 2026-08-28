---
id: DECISION-010
project: up1
type: decision
module: curriculum-design
tags:
  - curriculum-design
  - multi-tenant
  - tenants
  - infraestructura
  - deuda-tecnica
  - supersedes
---

# DECISION-010: Revertir a tenants dedicados `UNIVALLE` y `AIEP` (restablece DECISION-003)

> ⚠️ **SUPERSEDED por [DECISION-011](DECISION-011-final-use-test-upu.md)** (2026-04-28, mismo dia).
>
> Esta decision asumio que la convivencia de datos del mod con el seed core de TEST/UPU generaria deuda tecnica creciente. Analisis tecnico posterior demostro que el aislamiento es robusto en 4 capas (tablas distintas + sidebar separado + listados filtrados + 1 sola tabla compartida `Institution` resoluble con upsert). DECISION-011 es la decision **final** para SP1: usar TEST + UPU.
>
> Esta decision se mantiene como referencia historica del razonamiento "deuda tecnica" — util si en futuro hay caso real que justifique tenants dedicados.

## Contexto

[DECISION-009](DECISION-009-use-existing-tenants.md) (2026-04-28, ~10:00) propuso usar tenants existentes `TEST` y `UPU` para SP1, basada en la sugerencia de Juan Diego en la reunion 2026-04-28 de evitar el overhead de crear tenants dedicados.

**Investigacion posterior** (mismo dia, ~14:00) revelo informacion no considerada en la reunion:

1. **TEST y UPU NO estan vacios**: tienen seeds core pre-existentes con datos genericos:
   - `TEST`: 15 equipos de laboratorio + 25 experimentos faker + servicios de prueba (353 lineas)
   - `UPU`: "uPlanner University" — institucion ficticia completa con 100 personas, 3 campus, facultades, carreras, eventos (4,774 lineas)

2. **No podemos modificar el seed core**: `prisma/<TENANT>/seed.js` esta fuera del alcance del mod (propiedad del equipo platform UP1). Ver [feedback_up1_mod_scope.md](../../../../.claude/projects/-Users-edobacon-Workspace-uplanner/memory/feedback_up1_mod_scope.md).

3. **Convivencia obligada**: si se usan TEST/UPU, los datos seed de Univalle/AIEP del mod conviven con uPlanner Demo / uPlanner University en cada tenant. La convivencia es operativa hoy (los objetos del mod son distintos a los del core), pero introduce confusion semantica creciente.

## Drivers

1. **Deuda tecnica acumulativa**: el modulo curriculum-design es solo el primero de varios. A medida que se agreguen capabilities (CAP-CUR-014..022 son 9 capabilities; SP1 cubre 1) los datos del mod creceran y bifurcaran. Mantener Univalle conviviendo con "uPlanner University" en UPU se vuelve mas confuso con cada sprint.

2. **Costo de migrar despues > costo de crear ahora**: si se decide mas adelante migrar a tenants dedicados (ej: porque arranca un piloto real Univalle/AIEP), la migracion implica:
   - Re-crear `UNIVALLE` y `AIEP` con `tenant:create`
   - Migrar todos los datos (instancias) acumulados de TEST/UPU a los nuevos tenants
   - Actualizar referencias en otros mods que pudieran haberse construido encima
   - Re-validar layouts, formularios, capabilities

   Crear los tenants ahora cuesta ~7 pasos del script `tenant:create` (~5 minutos de ejecucion). Migrar despues cuesta orden de magnitud mas.

3. **Claridad semantica**: los TENANT_IDs deben reflejar al cliente real cuando es posible. `UNIVALLE` y `AIEP` son auto-documentados; "TEST contiene Univalle" requiere mapeo mental sostenido.

4. **Aislamiento de validacion**: para validar TICKET-007 (listado) y TICKET-009 (detail) sobre datos clientes, ver tenants dedicados garantiza que solo se vean datos del programa de asignatura — sin ruido de objetos de otros mods que viven en TEST/UPU.

## Alternativas reevaluadas

| Opcion | Pro | Contra |
|--------|-----|--------|
| **A. Crear `UNIVALLE` + `AIEP`** (elegida — restablece DECISION-003) | Tenants limpios. Sin convivencia con seed core. Auto-documentados. Sin deuda tecnica de migracion futura. | Overhead inicial: ejecutar `tenant:create` 2 veces (~10 min). Coordinar con plataforma para que ambiente acepte 2 tenants nuevos. |
| B. Mantener `TEST` + `UPU` (DECISION-009) con seed del mod conviviendo | Cero overhead inicial. Tenants ya operativos. | Convivencia con uPlanner Demo / uPlanner University crece con cada sprint. Migracion futura costosa si se decide separar. Confusion semantica permanente. |

## Decision

**Adoptar opcion A**: revertir a la postura original de [DECISION-003](DECISION-003-tenant-ids.md) — crear `UNIVALLE` y `AIEP` como tenants dedicados.

**[DECISION-009](DECISION-009-use-existing-tenants.md) queda superseded** por esta decision (vivio ~4 horas).

**[DECISION-003](DECISION-003-tenant-ids.md) vuelve a estado accepted**.

## Acciones necesarias antes de TICKET-006

1. Coordinar con Juan Diego / equipo plataforma UP1 que el ambiente puede acomodar 2 tenants nuevos.
2. Ejecutar:
   ```bash
   cd up1
   npm run tenant:create UNIVALLE --workspace=@uplanner/object-management-backend
   npm run tenant:create AIEP --workspace=@uplanner/object-management-backend
   ```
3. Validar que se creo:
   - `up1/object-manager/objects/tenants/UNIVALLE/{Base,Extended,RecordTypes}/`
   - `up1/object-manager/objects/tenants/AIEP/{Base,Extended,RecordTypes}/`
   - DBs `prisma/UNIVALLE/` y `prisma/AIEP/`
4. En `app.json` del mod: `"tenants": ["UNIVALLE", "AIEP"]`
5. El seed de Univalle se carga en tenant `UNIVALLE`. El seed de AIEP en tenant `AIEP`. Sin mapeo simbolico necesario.

## Consecuencias positivas

- Tenants limpios y semanticamente claros desde el inicio.
- Cero deuda tecnica de migracion futura.
- Validacion de TICKET-007/009 sin ruido de seed core.
- Listo para piloto real si se decide a futuro (sin trabajo adicional).
- Coherente con la realidad: Univalle y AIEP **son** clientes distintos, no datos de prueba.

## Consecuencias negativas

- Overhead inicial: requiere coordinacion con plataforma + ejecutar `tenant:create` antes de iniciar TICKET-006.
- Si la infra UP1 tiene constraints de espacio/recursos (ej: limite de DBs activas en el ambiente compartido), agregar 2 tenants podria requerir gestion adicional.
- Aumenta el numero de tenants en el ambiente — los demas equipos veran 2 tenants mas en sus listados de admin/observabilidad.

## Comunicacion al equipo

Avisar a Juan Diego antes de ejecutar `tenant:create`:

> "Edu: Reconsidere la postura de la reunion sobre usar TEST/UPU para Univalle/AIEP. Al revisar el seed core de UPU (uPlanner University, 100 personas + facultades) detecte que conviven los datos del mod con datos demo del core, lo que genera confusion semantica que va a crecer con cada sprint. Prefiero crear UNIVALLE y AIEP dedicados ahora — el overhead de tenant:create es pequeño comparado con la deuda de migrar despues. ¿Hay constraint de infra que bloquee crear 2 tenants nuevos?"

## Que cubre y NO cubre

### Cubre
- Reverte la postura de DECISION-009.
- Restablece DECISION-003 como decision vigente.
- Comunicacion sugerida para coordinar con plataforma.

### NO cubre
- Si el equipo plataforma UP1 confirma que NO se pueden crear 2 tenants nuevos, requerira nueva decision.
- Decision sobre tenants productivos reales (postergada — depende de cuando haya piloto).
- Configuracion del ambiente UP1 multi-environment (postergada — equipo infra).

## Trazabilidad

| Fecha | Decision | Estado |
|-------|----------|--------|
| 2026-04-27 | DECISION-003 — UNIVALLE + AIEP | accepted |
| 2026-04-28 ~10:00 | DECISION-009 — TEST + UPU (en reunion) | accepted, supersedes DECISION-003 |
| 2026-04-28 ~14:00 | DECISION-010 — revertir a UNIVALLE + AIEP (post-investigacion seed core) | accepted, supersedes DECISION-009, restores DECISION-003 |

## Referencias

- [DECISION-003](DECISION-003-tenant-ids.md) — restablecida por esta decision
- [DECISION-009](DECISION-009-use-existing-tenants.md) — superseded por esta decision
- [Investigacion seed core TEST/UPU](../specs/curriculum-design/transcripts/2026-04-28-revision-dudas-modelo.md) — contexto que motivo la reversion
- Reunion 2026-04-28 (Juan Diego, Esteban, Eduardo) — contexto original de DECISION-009
