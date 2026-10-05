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
| rearme-db-que-sobrevive.md | revision | Antes del backup: qué sobrevive a un rearme de la DB | Verificación previa al backup: los casos inline, el plan, las KB docs y el esquema sobreviven al rearme; autopilot está en el frontmatter del ticket, pero teachPolicy/draftPolicy/reviewPolicy NO, así que un db:rebuild --fresh los devolvería a su default en silencio. F1 tiene que materializar la política nueva en el texto del ticket como estado y verificar con un rearme sobre copia, midiendo primero. |

## Plan

0 de 5 fases cerradas, fase actual F1. Vista: /Users/edobacon/.kanai/data/kanai_data/inline-cases/kanai-verificacion-obligatoria/plan.md
