-- UPONE-1539 · Fixture del smoke de la MALLA MODULAR (tenant UPU / uplanner_upu)
--
-- Crea UN plan MODULAR reproducible que ejercita todos los caminos del render por niveles
-- (deriveLevel) y del flujo guiado de alta (REQ-10) + batch atomico (REQ-11). Extiende el
-- patron del fixture SP7 (UPONE-1378-smoke-fixture.sql): mismos arboles OR->AND->hojas.
--
-- Plan: "Malla Modular Demo 1539" (id smoke1539-mod-plan, progression=Modular).
-- 8 asignaturas colocadas (period=NULL: en modular el orden lo deriva el grafo), todas 5 cr:
--
--   Nivel 1 (sin prereqs):      CALDEMO-ADM-1, CALDEMO-AGR-3
--   Nivel 2:                    CALDEMO-ADM-2 (prereq ADM-1, Before)
--                               CALDEMO-ADM-3 (prereq ADM-1 Before + COREQ ADM-2 Concurrent -> mismo nivel que ADM-2)
--                               CALDEMO-ADM-5 (OR ADM-1/ADM-2 -> 1+min(1,2)=2)
--   Nivel 3:                    CALDEMO-ADM-4 (AND ADM-1,ADM-2 -> 1+max(1,2)=3)
--                               CALDEMO-AGR-1 (K-de-N 2 de 3 {ADM-1,ADM-2,ADM-4} -> 1+2do-menor(1,2,3)=3)
--                               CALDEMO-AGR-2 (creditos >= 15 -> se ubica donde acumula: 3)
--
-- FLUJO GUIADO (REQ-10) — cadena multinivel determinista, NO colocada en el plan:
--   AGR-4 requiere AGR-5, y AGR-5 requiere AGR-3 (todos Before, cursos concretos). Al agregar
--   AGR-4 en la malla modular, el flujo guiado recorre la CADENA COMPLETA y ofrece agregar
--   AGR-5 + AGR-3 junto con AGR-4 (batch atomico) -> quedan en niveles 2, 1 y 3 respectivamente.
--   CASO AMBIGUO (fallback manual): agregar AGR-1 (requiere un K-de-N "2 de 3" sobre ADM-1/2/4)
--   NO ofrece autocompletar (hay una decision) -> el modal informa las opciones y el usuario
--   cierra y elige a mano. Para el ROLLBACK del batch (REQ-11): forzar un fallo y verificar que
--   ninguna entrada de la cadena persiste.
--
-- Ids FIJOS con prefijo `smoke1539-` => idempotente (ON CONFLICT DO NOTHING) + teardown trivial.
--
-- Uso:
--   docker exec -i pg psql -U pg -d uplanner_upu < UPONE-1539-modular-smoke-fixture.sql
-- Teardown: descomentar el bloque del final.

BEGIN;

-- Guard: si falta alguna Activity, abortar (un plan con activityId nulo no probaria nada).
DO $$
DECLARE faltantes text;
BEGIN
  SELECT string_agg(c.code, ', ') INTO faltantes
  FROM (VALUES ('CALDEMO-ADM-1'),('CALDEMO-ADM-2'),('CALDEMO-ADM-3'),('CALDEMO-ADM-4'),
               ('CALDEMO-ADM-5'),('CALDEMO-AGR-1'),('CALDEMO-AGR-2'),('CALDEMO-AGR-3'),
               ('CALDEMO-AGR-4'),('CALDEMO-AGR-5')) AS c(code)
  WHERE NOT EXISTS (SELECT 1 FROM "Activity" a WHERE a.code = c.code);
  IF faltantes IS NOT NULL THEN
    RAISE EXCEPTION 'Fixture UPONE-1539: faltan Activities (%). Corre el seed del mod antes.', faltantes;
  END IF;
END $$;

-- ---- Curriculum base + proyeccion rt__Plan (progression=Modular) ----
INSERT INTO "Curriculum" (id, "createdAt", "updatedAt", name, code, "recordType", "ownerType", "ownerId", "institutionId", status, version)
SELECT 'smoke1539-mod-plan', now(), now(), 'Malla Modular Demo 1539', 'SMOKE1539-MOD',
       'Plan'::"CurriculumRecordType", 'Institution'::"CurriculumOwnerType",
       i.id, i.id, 'Draft'::"CurriculumStatus", 1
FROM (SELECT id FROM "Institution" LIMIT 1) i
ON CONFLICT (id) DO NOTHING;

INSERT INTO "rt__Plan__curriculum" ("curriculumId", progression, "totalCredits", "totalPeriods", "periodType", "rotationConfig")
VALUES ('smoke1539-mod-plan', 'Modular', 40, NULL, NULL, '{}')
ON CONFLICT ("curriculumId") DO NOTHING;

-- ---- planEntry: 8 asignaturas modulares (period NULL) ----
INSERT INTO "planEntry" (id, "createdAt", "updatedAt", "planId", "activityId", kind, period, position)
SELECT v.id, now(), now(), 'smoke1539-mod-plan',
       (SELECT id FROM "Activity" WHERE code = v.code), 'Course', NULL, NULL
FROM (VALUES
  ('smoke1539-pe-adm1', 'CALDEMO-ADM-1'),
  ('smoke1539-pe-adm2', 'CALDEMO-ADM-2'),
  ('smoke1539-pe-adm3', 'CALDEMO-ADM-3'),
  ('smoke1539-pe-adm4', 'CALDEMO-ADM-4'),
  ('smoke1539-pe-adm5', 'CALDEMO-ADM-5'),
  ('smoke1539-pe-agr1', 'CALDEMO-AGR-1'),
  ('smoke1539-pe-agr2', 'CALDEMO-AGR-2'),
  ('smoke1539-pe-agr3', 'CALDEMO-AGR-3')
) AS v(id, code)
ON CONFLICT (id) DO NOTHING;

-- ---- Arboles de requisitos (base) ----
INSERT INTO "requirement" (id, "ownerType", "ownerId", "recordType", effect, label, "parentId", "isHardRule")
SELECT v.id, 'activity', (SELECT id FROM "Activity" WHERE code = v."ownerCode"),
       v."recordType"::"requirementRecordType", 'EligibilityToEnroll', v.label, v."parentId", true
FROM (VALUES
  -- ADM-2: prereq ADM-1 (Before)
  ('smoke1539-adm2-or',  'CALDEMO-ADM-2', 'Group',       'Cualquiera de las vias', NULL),
  ('smoke1539-adm2-and', 'CALDEMO-ADM-2', 'Group',       'Todos de la via',        'smoke1539-adm2-or'),
  ('smoke1539-adm2-pre', 'CALDEMO-ADM-2', 'RecordState', 'ADM-1 (Before)',         'smoke1539-adm2-and'),
  -- ADM-3: prereq ADM-1 (Before) + coreq ADM-2 (Concurrent)
  ('smoke1539-adm3-or',  'CALDEMO-ADM-3', 'Group',       'Cualquiera de las vias', NULL),
  ('smoke1539-adm3-and', 'CALDEMO-ADM-3', 'Group',       'Todos de la via',        'smoke1539-adm3-or'),
  ('smoke1539-adm3-pre', 'CALDEMO-ADM-3', 'RecordState', 'ADM-1 (Before)',         'smoke1539-adm3-and'),
  ('smoke1539-adm3-cor', 'CALDEMO-ADM-3', 'RecordState', 'ADM-2 (Concurrent)',     'smoke1539-adm3-and'),
  -- ADM-4: AND ADM-1 + ADM-2 (ambos Before) -> 1+max
  ('smoke1539-adm4-or',  'CALDEMO-ADM-4', 'Group',       'Cualquiera de las vias', NULL),
  ('smoke1539-adm4-and', 'CALDEMO-ADM-4', 'Group',       'Todos de la via',        'smoke1539-adm4-or'),
  ('smoke1539-adm4-p1',  'CALDEMO-ADM-4', 'RecordState', 'ADM-1 (Before)',         'smoke1539-adm4-and'),
  ('smoke1539-adm4-p2',  'CALDEMO-ADM-4', 'RecordState', 'ADM-2 (Before)',         'smoke1539-adm4-and'),
  -- ADM-5: OR ADM-1 / ADM-2 -> 1+min
  ('smoke1539-adm5-or',   'CALDEMO-ADM-5', 'Group',       'Cualquiera de las vias', NULL),
  ('smoke1539-adm5-and',  'CALDEMO-ADM-5', 'Group',       'Todos de la via',        'smoke1539-adm5-or'),
  ('smoke1539-adm5-pool', 'CALDEMO-ADM-5', 'Group',       'Una de dos (OR)',        'smoke1539-adm5-and'),
  ('smoke1539-adm5-l1',   'CALDEMO-ADM-5', 'RecordState', 'ADM-1 (Before)',         'smoke1539-adm5-pool'),
  ('smoke1539-adm5-l2',   'CALDEMO-ADM-5', 'RecordState', 'ADM-2 (Before)',         'smoke1539-adm5-pool'),
  -- AGR-1: K-de-N 2 de 3 {ADM-1,ADM-2,ADM-4}
  ('smoke1539-agr1-or',   'CALDEMO-AGR-1', 'Group',       'Cualquiera de las vias', NULL),
  ('smoke1539-agr1-and',  'CALDEMO-AGR-1', 'Group',       'Todos de la via',        'smoke1539-agr1-or'),
  ('smoke1539-agr1-pool', 'CALDEMO-AGR-1', 'Group',       'Dos de tres (K-de-N)',   'smoke1539-agr1-and'),
  ('smoke1539-agr1-l1',   'CALDEMO-AGR-1', 'RecordState', 'ADM-1 (Before)',         'smoke1539-agr1-pool'),
  ('smoke1539-agr1-l2',   'CALDEMO-AGR-1', 'RecordState', 'ADM-2 (Before)',         'smoke1539-agr1-pool'),
  ('smoke1539-agr1-l3',   'CALDEMO-AGR-1', 'RecordState', 'ADM-4 (Before)',         'smoke1539-agr1-pool'),
  -- AGR-2: creditos >= 15
  ('smoke1539-agr2-or',   'CALDEMO-AGR-2', 'Group',           'Cualquiera de las vias', NULL),
  ('smoke1539-agr2-and',  'CALDEMO-AGR-2', 'Group',           'Todos de la via',        'smoke1539-agr2-or'),
  ('smoke1539-agr2-cred', 'CALDEMO-AGR-2', 'MetricThreshold', '>= 15 creditos',         'smoke1539-agr2-and'),
  -- AGR-4: prereq AGR-5 (Before) — cadena multinivel para el flujo guiado (nada colocado)
  ('smoke1539-agr4-or',   'CALDEMO-AGR-4', 'Group',       'Cualquiera de las vias', NULL),
  ('smoke1539-agr4-and',  'CALDEMO-AGR-4', 'Group',       'Todos de la via',        'smoke1539-agr4-or'),
  ('smoke1539-agr4-pre',  'CALDEMO-AGR-4', 'RecordState', 'AGR-5 (Before)',         'smoke1539-agr4-and'),
  -- AGR-5: prereq AGR-3 (Before) — 2do nivel de la cadena: AGR-4 -> AGR-5 -> AGR-3 (determinista)
  ('smoke1539-agr5-or',   'CALDEMO-AGR-5', 'Group',       'Cualquiera de las vias', NULL),
  ('smoke1539-agr5-and',  'CALDEMO-AGR-5', 'Group',       'Todos de la via',        'smoke1539-agr5-or'),
  ('smoke1539-agr5-pre',  'CALDEMO-AGR-5', 'RecordState', 'AGR-3 (Before)',         'smoke1539-agr5-and')
) AS v(id, "ownerCode", "recordType", label, "parentId")
ON CONFLICT (id) DO NOTHING;

-- ---- Proyecciones RecordType ----
INSERT INTO "rt__Group__requirement" ("requirementId", combinator, "minToSatisfy")
VALUES
  ('smoke1539-adm2-or','OR',NULL), ('smoke1539-adm2-and','AND',NULL),
  ('smoke1539-adm3-or','OR',NULL), ('smoke1539-adm3-and','AND',NULL),
  ('smoke1539-adm4-or','OR',NULL), ('smoke1539-adm4-and','AND',NULL),
  ('smoke1539-adm5-or','OR',NULL), ('smoke1539-adm5-and','AND',NULL), ('smoke1539-adm5-pool','OR',1),
  ('smoke1539-agr1-or','OR',NULL), ('smoke1539-agr1-and','AND',NULL), ('smoke1539-agr1-pool','OR',2),
  ('smoke1539-agr2-or','OR',NULL), ('smoke1539-agr2-and','AND',NULL),
  ('smoke1539-agr4-or','OR',NULL), ('smoke1539-agr4-and','AND',NULL),
  ('smoke1539-agr5-or','OR',NULL), ('smoke1539-agr5-and','AND',NULL)
ON CONFLICT ("requirementId") DO NOTHING;

INSERT INTO "rt__RecordState__requirement" ("requirementId", "targetType", "targetId", "mustBe", timing)
SELECT v."requirementId", 'activity', (SELECT id FROM "Activity" WHERE code = v.code), v."mustBe", v.timing
FROM (VALUES
  ('smoke1539-adm2-pre', 'CALDEMO-ADM-1', 'Approved', 'Before'),
  ('smoke1539-adm3-pre', 'CALDEMO-ADM-1', 'Approved', 'Before'),
  ('smoke1539-adm3-cor', 'CALDEMO-ADM-2', 'Taken',    'Concurrent'),
  ('smoke1539-adm4-p1',  'CALDEMO-ADM-1', 'Approved', 'Before'),
  ('smoke1539-adm4-p2',  'CALDEMO-ADM-2', 'Approved', 'Before'),
  ('smoke1539-adm5-l1',  'CALDEMO-ADM-1', 'Approved', 'Before'),
  ('smoke1539-adm5-l2',  'CALDEMO-ADM-2', 'Approved', 'Before'),
  ('smoke1539-agr1-l1',  'CALDEMO-ADM-1', 'Approved', 'Before'),
  ('smoke1539-agr1-l2',  'CALDEMO-ADM-2', 'Approved', 'Before'),
  ('smoke1539-agr1-l3',  'CALDEMO-ADM-4', 'Approved', 'Before'),
  ('smoke1539-agr4-pre', 'CALDEMO-AGR-5', 'Approved', 'Before'),
  ('smoke1539-agr5-pre', 'CALDEMO-AGR-3', 'Approved', 'Before')
) AS v("requirementId", code, "mustBe", timing)
ON CONFLICT ("requirementId") DO NOTHING;

INSERT INTO "rt__MetricThreshold__requirement" ("requirementId", metric, operator, value, scope)
VALUES ('smoke1539-agr2-cred', 'Credits', 'Gte', 15, 'plan')
ON CONFLICT ("requirementId") DO NOTHING;

COMMIT;

-- Verificacion
SELECT 'plan' AS kind, c.name, p.progression, count(pe.id) AS entries
FROM "Curriculum" c
JOIN "rt__Plan__curriculum" p ON p."curriculumId" = c.id
LEFT JOIN "planEntry" pe ON pe."planId" = c.id
WHERE c.id = 'smoke1539-mod-plan'
GROUP BY c.name, p.progression;

-- ---------------------------------------------------------------------------
-- TEARDOWN (borra el fixture; ejecutar suelto al terminar el smoke)
--
-- DELETE FROM "rt__RecordState__requirement"     WHERE "requirementId" LIKE 'smoke1539-%';
-- DELETE FROM "rt__Group__requirement"           WHERE "requirementId" LIKE 'smoke1539-%';
-- DELETE FROM "rt__MetricThreshold__requirement" WHERE "requirementId" LIKE 'smoke1539-%';
-- DELETE FROM "requirement"                      WHERE id LIKE 'smoke1539-%';
-- DELETE FROM "planEntry"                        WHERE "planId" = 'smoke1539-mod-plan';
-- DELETE FROM "rt__Plan__curriculum"             WHERE "curriculumId" = 'smoke1539-mod-plan';
-- DELETE FROM "Curriculum"                        WHERE id = 'smoke1539-mod-plan';
-- ---------------------------------------------------------------------------
