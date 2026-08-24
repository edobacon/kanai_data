-- UPONE-1539 · RESET del fixture de la malla modular (tenant UPU / uplanner_upu)
--
-- Borra TODO el estado del plan smoke1539-mod-plan (incluidas asignaturas agregadas/movidas por
-- pruebas manuales previas) para volver al estado PRISTINO. Correr esto ANTES de re-aplicar el
-- fixture cuando quieras empezar limpio (el fixture solo es idempotente-insert, NO resetea por si
-- solo). Orden de borrado respeta las FK.
--
-- Uso (reset completo = este archivo + luego el fixture):
--   docker exec -i pg psql -U pg -d uplanner_upu < UPONE-1539-reset-fixture.sql
--   docker exec -i pg psql -U pg -d uplanner_upu < UPONE-1539-modular-smoke-fixture.sql
--
-- Borra por prefijo `smoke1539-` (requisitos del fixture) + TODAS las entries del plan (incluye las
-- que hayan quedado de pruebas, aunque no tengan el prefijo) + el plan y su proyeccion rt + el
-- cluster de asignaturas electivas (SMOKE1539-A/B/C). Tambien retira el plan auxiliar vacio
-- `smoke1539-mod-empty` (consolidamos todos los casos en un solo plan). Orden respeta las FK.

BEGIN;
DELETE FROM "rt__RecordState__requirement"     WHERE "requirementId" LIKE 'smoke1539-%';
DELETE FROM "rt__Group__requirement"           WHERE "requirementId" LIKE 'smoke1539-%';
DELETE FROM "rt__MetricThreshold__requirement" WHERE "requirementId" LIKE 'smoke1539-%';
DELETE FROM "requirement"                      WHERE id LIKE 'smoke1539-%';
-- Entries de ambos planes (el principal y el auxiliar vacio, si quedo de sesiones previas).
DELETE FROM "planEntry"                        WHERE "planId" IN ('smoke1539-mod-plan', 'smoke1539-mod-empty');
DELETE FROM "ext__uplanner__rt__plan__curriculum" WHERE "curriculumId" IN ('smoke1539-mod-plan', 'smoke1539-mod-empty');
DELETE FROM "rt__Plan__curriculum"             WHERE "curriculumId" IN ('smoke1539-mod-plan', 'smoke1539-mod-empty');
DELETE FROM "Curriculum"                        WHERE id IN ('smoke1539-mod-plan', 'smoke1539-mod-empty');
-- Asignaturas electivas del cluster OR (creadas por el fixture; ya sin planEntry ni requisitos).
DELETE FROM "Activity"                          WHERE id LIKE 'smoke1539-act-%';
COMMIT;

SELECT 'reset ok — planes smoke1539 eliminados' AS status,
       (SELECT count(*) FROM "Curriculum" WHERE id LIKE 'smoke1539-mod-%') AS planes_restantes,
       (SELECT count(*) FROM "Activity" WHERE id LIKE 'smoke1539-act-%') AS electivas_restantes;
