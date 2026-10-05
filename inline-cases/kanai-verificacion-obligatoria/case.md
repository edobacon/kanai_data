# Caso inline: Verificación obligatoria: la red que atrapa lo que el gate no ve

> Vista generada por Kanai desde case.yaml, el KB y el plan. No la edites a mano.

**Objetivo:** Que la sesion de verificacion de un ticket sea OBLIGATORIA cuando el ticket la tiene: cada item pasa o queda no ejecutado CON SU MOTIVO (por ejemplo, sin PW disponible), de modo que se pueda retomar de forma informada o saber por que se omitio y se pudo seguir, y Kanai pueda informar por que. En la ejecucion de epica la politica se vuelve obligatoria por defecto, en el mismo lugar donde hoy se fuerza autopilot autonomo; fuera de la epica sigue advisory, esperando la confirmacion del dev. Un ticket sin sesion de verificacion no se ve afectado: se omite.
**Tags:** repos: kanai-app · labels: verificacion, contrato, calidad, encadenado
**Etapa:** ejecucion

## Falta

- Nada que bloquee.

## Avisos

- el intake no tiene ambientes (QA, producción): anótalos si el trabajo se valida o se despliega en alguno
- el intake no tiene personas (responsable, quien revisa, quien despliega)

## Repos

| Repo | Ruta local | Rama base | Ramas de trabajo | Para qué |
|---|---|---|---|---|
| kanai-app | configurada | codex/epicas-autonomas (existe) | codex/epicas-autonomas | El producto Kanai: la politica por ticket, la migracion, el reporte de verificacion, el guard del cierre y el default de epica viven aca |

## Ambientes

- Sin ambientes.

## Personas

- Sin personas.

## Enlaces

- Sin enlaces.

## Notas

- Nace del caso kanai-ejecucion-ticket: al evaluar encadenar las tareas de una sesion en un solo agente, el dev marco que eso puede aumentar errores y alucinaciones, y que la red que atrapa el comportamiento que el gate NO ve es la sesion de verificacion. Medido el 2026-10-05: de las 28 sesiones de verificacion del store, 13 quedaron abiertas (incluidas las de TAO-181 y TAO-182), varias cerraron con todos los items pendientes (JOR-166/S3: 8; TAO-174/S3 y TAO-175/S3: 3; TAO-180/S5: 4) y las que SI corrieron encontraron siete fallos reales (TICKET-143/S4: 5 de 5; TICKET-143/S6: 2). Causa raiz: shared/session-policy.ts:21 declara verification con blocksClose:false, asi que DET-20 no exige su gate para el cierre.
- El analisis del contrato y las fases F6 a F10 quedaron escritos en el KB del caso origen, en los documentos verificacion-obligatoria-contrato.md y fases-verificacion-obligatoria.md: se copian aca como piezas de investigacion.

## KB del caso

| Documento | Tipo | Título | Resumen |
|---|---|---|---|
| analisis-verificacion-obligatoria.md | analisis | Análisis: la verificación obligatoria y lo que cambia en el contrato | Análisis completo del caso: el problema medido (13 de 28 sesiones de verificación abiertas, varias cerradas con todo pendiente, y siete fallos reales cuando sí corren), la decisión del dev, los ocho cambios de contrato entre ticket y épica, y las cinco fases con sus criterios y las decisiones ya tomadas. |
| f1-resultados.md | registro | F1 — Resultado: las políticas del ticket sobreviven al rearme | F1 cerrada (juez aprobable_con_nits): las políticas no-default que sobrevivían al rearme pasaron de 0/56 a 56/56, los autopilot degradados de 51 a 0 y los proyectos nativos del 0% al 100%. Incluye la causa raíz, el backfill acotado de 56 .md ya commiteado en el data repo, los commits del cierre y el alcance honesto de la fase (la política se persiste; su exigencia al cerrar llega en F2/F3). |
| f2-resultados.md | registro | F2 — Resultado: el ítem no ejecutado tiene su motivo | F2 cerrada (juez aprobable_con_nits tras tres iteraciones): el ítem no ejecutado lleva su causa y su nota, se valida antes de escribir, un pending se rechaza con la política obligatoria y el porqué se informa en el reporte, el gate, la vista y el panel. Incluye el hallazgo corregido de que el detalle no sobrevivía al rearme, las mediciones sobre una sesión real y las dos correcciones que exigió el juez (upsert acotado y smoke sin motivos inventados). |
| rearme-db-que-sobrevive.md | revision | Qué sobrevive a un rearme de la DB: medido, no supuesto | Medición con rearme real (--fresh) sobre una copia: las 56 políticas no-default vuelven a su default en silencio y el autopilot se pierde en los 4 proyectos nativos de Kanai (40/40), aunque esté en el frontmatter. Corrige la revisión previa ("autopilot SÍ sobrevive") y fija lo que F1 tiene que cerrar: frontmatter + re-render al setear la config + parser que lea la política + arreglar el mapa de autopilot. |

## Plan

2 de 5 fases cerradas, fase actual F3. Vista: /Users/edobacon/.kanai/data/kanai_data/inline-cases/kanai-verificacion-obligatoria/plan.md
