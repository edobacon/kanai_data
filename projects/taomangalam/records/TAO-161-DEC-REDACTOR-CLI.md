---
id: TAO-161-DEC-REDACTOR-CLI
project: taomangalam
type: decision
module: EP-00
---

## Contexto

REQ-06 de HU-00-17 pide que el script operativo `pnpm config:set` reutilice la
infraestructura del server en vez de reimplementarla, nombrando `src/logger.ts`
(con su redactor central de secretos) y `src/db/local-guard.ts`.

El logger central de `src/logger.ts` resuelve la configuración al importarse
(importa `config.runtime`, que exige `PORT`, `DATABASE_URL` y
`PGBOSS_DATABASE_URL` y termina el proceso si faltan). Un script operativo que se
corre por Railway CLI o localmente no debería exigir esas variables del server
completo.

## Decisión

- El redactor central puro (`REDACTED_VALUE`, `SECRET_KEYS`, `redactSecrets`) se
  movió a `src/redaccion.ts`; `src/logger.ts` lo importa y lo RE-EXPORTA, así que
  su API pública no cambia (`logger.test.ts` sigue verde).
- El CLI del script importa el redactor desde `src/redaccion.ts` y emite una
  línea estructurada de resultado/error por `process.stdout`/`process.stderr`
  (convención de los otros CLI del repo: `src/db/local.ts`, `src/seeds/cli.ts`),
  redactando el valor cuando la clave es sensible.
- La guarda de producción (`src/configuracion/guardas.ts`) sigue el PATRÓN de
  `src/db/local-guard.ts` (función pura y testeable, mensaje accionable, corrida
  ANTES de tocar la base), sin importarlo: la protección es por `--env`
  (obligatorio) y solo `production` exige `--confirmar-produccion`.

## Motivo

Evitar acoplar un script operativo al bootstrap de configuración del server
(`PORT`/`PGBOSS_DATABASE_URL`) manteniendo la reutilización real del redactor
central y del cliente Prisma acotado. La redacción del valor sensible se apoya en
el mismo redactor central, sin duplicar su lógica.

## Consecuencias

- El redactor vive fuera del logger; un consumidor que solo necesita redactar
  puede importarlo sin arrastrar la configuración del server.
- El CLI no usa el singleton pino del logger; su salida es texto estructurado,
  consistente con los demás CLI del repositorio.
