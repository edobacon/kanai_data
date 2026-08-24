-- UPONE-1378 · Fixture del smoke de requisitos (tenant UPU / uplanner_upu)
--
-- Crea DOS arboles de requisitos que el seed del paquete PM (UPONE-1456) no trae y que hacen
-- falta para cubrir los casos del evaluador Y/O sobre la malla:
--
--   A) QUI104  (Quimica Basica)      -> corequisito (timing Concurrent) + prerrequisito (Before)
--   B) GES110  (Gestion de Proyectos) -> electivo K-de-N (2 de 3) + umbral de creditos (>= 60)
--   C) EST106  (Estadistica)          -> prerrequisito simple sobre PRG105 (Programacion I)
--
-- El par C existe para el caso "quitar de la malla el curso que es prerrequisito de otro que se
-- imparte mas adelante": PRG105 y EST106 son ambas asignaturas libres, asi que las dos entradas
-- de malla del caso se crean y se borran sin tocar ninguna entrada del seed.
--
-- Ambas asignaturas se eligen porque NO estan en ninguna malla: el editor de requisitos de la
-- UI solo esta habilitado para asignaturas que no pertenecen a planes publicados, y asi el
-- fixture es reproducible tambien a mano desde la pestana Requisitos.
--
-- Ids FIJOS con prefijo `smoke1378-` => idempotente (ON CONFLICT DO NOTHING) y trivial de
-- borrar (teardown al final del archivo).
--
-- Forma de los arboles (la misma que produce el editor de la UI: OR de vias -> AND de la via):
--
--   A) QUI104
--      Group[OR]  "Cualquiera de las vias"
--        +- Group[AND] "Todos de la via"
--             +- RecordState Taken/Concurrent -> C-CALCULOIII-011  (ICIV: periodo 3)  [COREQ]
--             +- RecordState Approved/Before  -> C-METODOSNUM-018  (ICIV: periodo 4)  [PREREQ]
--
--   B) GES110
--      Group[OR]  "Cualquiera de las vias"
--        +- Group[AND] "Todos de la via"
--             +- Group[OR, minToSatisfy=2] "Electivo de especializacion (2 de 3)"
--             |    +- RecordState Approved/Before -> C-TOPOGRAFIA-023   (ICIV: periodo 5)
--             |    +- RecordState Approved/Before -> C-GEOLOGIAAP-024   (ICIV: periodo 5)
--             |    +- RecordState Approved/Before -> C-MATERIALES-025   (ICIV: periodo 5)
--             +- MetricThreshold Credits >= 60 (scope plan)
--
--   C) EST106
--      Group[OR]  "Cualquiera de las vias"
--        +- Group[AND] "Todos de la via"
--             +- RecordState Approved/Before -> PRG105 (Programacion I)
--
-- Comportamiento esperado en la malla de UPU-ICIV-PLAN-2026 (requiere status Draft):
--   QUI104 en periodo 3 -> BLOQUEA (el coreq de P3 se satisface, pero el prereq de P4 no es "antes")
--   QUI104 en periodo 5 -> PERMITE (coreq P3 <= P5, prereq P4 < P5)
--   GES110 en periodo 3 -> BLOQUEA (pool 0 de 2 antes de P3; creditos 48 < 60)
--   GES110 en periodo 6 -> PERMITE (los 3 del pool estan en P5; creditos 120 >= 60)
--   PRG105 en periodo 1 -> PERMITE (sin requisitos); EST106 en periodo 3 -> PERMITE (PRG105 antes)
--     y al QUITAR PRG105 de P1, EST106 (P3) pasa a aparecer en el banner de violaciones
--
-- Uso:
--   docker exec -i pg psql -U pg -d uplanner_upu < UPONE-1378-smoke-fixture.sql

BEGIN;

-- Guard: si falta alguna Activity referenciada, abortar en vez de sembrar un arbol a medias.
-- Un pool sin hojas es un requisito vacuo (el evaluador lo da por satisfecho) y el caso
-- dejaria de probar lo que dice probar.
DO $$
DECLARE faltantes text;
BEGIN
  SELECT string_agg(c.code, ', ') INTO faltantes
  FROM (VALUES ('QUI104'), ('GES110'), ('EST106'), ('PRG105'),
               ('C-CALCULOIII-011'), ('C-METODOSNUM-018'),
               ('C-TOPOGRAFIA-023'), ('C-GEOLOGIAAP-024'), ('C-MATERIALES-025')) AS c(code)
  WHERE NOT EXISTS (SELECT 1 FROM "Activity" a WHERE a.code = c.code);
  IF faltantes IS NOT NULL THEN
    RAISE EXCEPTION 'Fixture UPONE-1378: faltan Activities (%). Corre el seed del mod antes.', faltantes;
  END IF;
END $$;

-- ---- Nodos (tabla base) ----
INSERT INTO "requirement" (id, "ownerType", "ownerId", "recordType", effect, label, "parentId", "isHardRule")
SELECT v.id, 'activity', (SELECT id FROM "Activity" WHERE code = v."ownerCode"),
       v."recordType"::"requirementRecordType",
       'EligibilityToEnroll', v.label, v."parentId", true
FROM (VALUES
  -- A) QUI104 — corequisito + prerrequisito
  ('smoke1378-qui104-or',      'QUI104', 'Group',       'Cualquiera de las vías',                        NULL),
  ('smoke1378-qui104-and',     'QUI104', 'Group',       'Todos de la vía',                              'smoke1378-qui104-or'),
  ('smoke1378-qui104-coreq',   'QUI104', 'RecordState', 'Calculo III (C-CALCULOIII-011)',                'smoke1378-qui104-and'),
  ('smoke1378-qui104-prereq',  'QUI104', 'RecordState', 'Metodos Numericos (C-METODOSNUM-018)',          'smoke1378-qui104-and'),
  -- B) GES110 — electivo K-de-N + umbral de creditos
  ('smoke1378-ges110-or',      'GES110', 'Group',           'Cualquiera de las vías',                    NULL),
  ('smoke1378-ges110-and',     'GES110', 'Group',           'Todos de la vía',                           'smoke1378-ges110-or'),
  ('smoke1378-ges110-pool',    'GES110', 'Group',           'Electivo de especialización (2 de 3)',      'smoke1378-ges110-and'),
  ('smoke1378-ges110-leaf1',   'GES110', 'RecordState',     'Topografia (C-TOPOGRAFIA-023)',             'smoke1378-ges110-pool'),
  ('smoke1378-ges110-leaf2',   'GES110', 'RecordState',     'Geologia Aplicada (C-GEOLOGIAAP-024)',      'smoke1378-ges110-pool'),
  ('smoke1378-ges110-leaf3',   'GES110', 'RecordState',     'Materiales de Construccion (C-MATERIALES-025)', 'smoke1378-ges110-pool'),
  ('smoke1378-ges110-credits', 'GES110', 'MetricThreshold', '≥ 60 créditos',                             'smoke1378-ges110-and'),
  -- C) EST106 — prerrequisito simple (para el caso de quitar el prerrequisito de la malla)
  ('smoke1378-est106-or',      'EST106', 'Group',       'Cualquiera de las vías',                        NULL),
  ('smoke1378-est106-and',     'EST106', 'Group',       'Todos de la vía',                              'smoke1378-est106-or'),
  ('smoke1378-est106-prereq',  'EST106', 'RecordState', 'Programación I (PRG105)',                       'smoke1378-est106-and')
) AS v(id, "ownerCode", "recordType", label, "parentId")
ON CONFLICT (id) DO NOTHING;

-- ---- Proyecciones de RecordType ----
INSERT INTO "rt__Group__requirement" ("requirementId", combinator, "minToSatisfy")
VALUES ('smoke1378-qui104-or', 'OR', NULL),
       ('smoke1378-qui104-and', 'AND', NULL),
       ('smoke1378-ges110-or', 'OR', NULL),
       ('smoke1378-ges110-and', 'AND', NULL),
       ('smoke1378-ges110-pool', 'OR', 2),
       ('smoke1378-est106-or', 'OR', NULL),
       ('smoke1378-est106-and', 'AND', NULL)
ON CONFLICT ("requirementId") DO NOTHING;

INSERT INTO "rt__RecordState__requirement" ("requirementId", "targetType", "targetId", "mustBe", timing)
SELECT v."requirementId", 'activity', (SELECT id FROM "Activity" WHERE code = v.code),
       v."mustBe", v.timing
FROM (VALUES
  ('smoke1378-qui104-coreq',  'C-CALCULOIII-011', 'Taken',    'Concurrent'),
  ('smoke1378-qui104-prereq', 'C-METODOSNUM-018', 'Approved', 'Before'),
  ('smoke1378-ges110-leaf1',  'C-TOPOGRAFIA-023', 'Approved', 'Before'),
  ('smoke1378-ges110-leaf2',  'C-GEOLOGIAAP-024', 'Approved', 'Before'),
  ('smoke1378-ges110-leaf3',  'C-MATERIALES-025', 'Approved', 'Before'),
  ('smoke1378-est106-prereq', 'PRG105',           'Approved', 'Before')
) AS v("requirementId", code, "mustBe", timing)
ON CONFLICT ("requirementId") DO NOTHING;

INSERT INTO "rt__MetricThreshold__requirement" ("requirementId", metric, operator, value, scope)
VALUES ('smoke1378-ges110-credits', 'Credits', 'Gte', 60, 'plan')
ON CONFLICT ("requirementId") DO NOTHING;

COMMIT;

-- Verificacion
SELECT r.id, r."recordType", r.label, g.combinator, g."minToSatisfy",
       rs."mustBe", rs.timing, a.code AS target, m.metric, m.operator, m.value
FROM "requirement" r
LEFT JOIN "rt__Group__requirement" g ON g."requirementId" = r.id
LEFT JOIN "rt__RecordState__requirement" rs ON rs."requirementId" = r.id
LEFT JOIN "rt__MetricThreshold__requirement" m ON m."requirementId" = r.id
LEFT JOIN "Activity" a ON a.id = rs."targetId"
WHERE r.id LIKE 'smoke1378-%'
ORDER BY r.id;

-- ---------------------------------------------------------------------------
-- TEARDOWN (borra el fixture; ejecutar suelto cuando termines el smoke)
--
-- DELETE FROM "rt__RecordState__requirement"     WHERE "requirementId" LIKE 'smoke1378-%';
-- DELETE FROM "rt__Group__requirement"           WHERE "requirementId" LIKE 'smoke1378-%';
-- DELETE FROM "rt__MetricThreshold__requirement" WHERE "requirementId" LIKE 'smoke1378-%';
-- DELETE FROM "requirement"                      WHERE id LIKE 'smoke1378-%';
-- ---------------------------------------------------------------------------
