---
id: TAO-159-DEC-PGBOSS-SCHEMA
project: taomangalam
type: decision
module: EP-00
tags:
  - TAO-159
  - GH-12
  - DEC-200
  - pg-boss
  - schema
---

Decision (HU-00-07 / TAO-159): el schema `pgboss` NO lo crea pg-boss al arrancar. Lo provee la infraestructura con el rol `taomangalam_queue` como propietario (`infra/postgres/init/001_roles.sql` en local) y el arranque usa `createSchema: false`. Al arrancar, el backend VERIFICA que el schema exista (`assertPgbossSchemaExists` en `server/src/queue/pgboss.ts`) y falla con un mensaje accionable si falta (recrear el volumen con `docker compose down -v` o crear el schema a mano).

Motivo: para que pg-boss cree el schema por su cuenta haria falta dar al rol de cola privilegio CREATE sobre la base, lo que ampliaria el rol mas alla de DEC-200 (el rol es propietario UNICAMENTE del schema `pgboss`). Con `createSchema: false`, pg-boss instala y migra sus TABLAS dentro del schema existente, dejando el schema de aplicacion intacto.

Alcance: la provision del schema en entornos no locales (staging/produccion) queda fuera de HU-00-07; se resuelve al habilitar cada entorno con el paso de provisión equivalente.

Precision del criterio de aceptacion: «base recién migrada → existe el schema `pgboss`» se interpreta como «base local inicializada con el schema provisto por `001_roles.sql` a nombre de `taomangalam_queue`».
