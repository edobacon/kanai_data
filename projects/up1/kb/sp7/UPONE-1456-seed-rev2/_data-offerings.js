/**
 * Seed de OFFERINGS (secciones de curso, recordType=Syllabus) + ActivityLine — tarea PM #097.
 * 130 offerings (5 por semestre 2026) para 13 asignaturas Course. Resuelve activity por code, term por name.
 * Idempotente por code @unique (Offering y ActivityLine). Corre DESPUES de las Activities y los Term.
 */
const LINES = [
  {"code": "AL-C-CALCULOI-001", "activityCode": "C-CALCULOI-001", "orgUnitCode": "UPU-FAC-CIE"},
  {"code": "AL-C-CALCULOII-006", "activityCode": "C-CALCULOII-006", "orgUnitCode": "UPU-FAC-CIE"},
  {"code": "AL-C-ALGEBRALIN-002", "activityCode": "C-ALGEBRALIN-002", "orgUnitCode": "UPU-FAC-CIE"},
  {"code": "AL-C-ESTADISTIC-107", "activityCode": "C-ESTADISTIC-107", "orgUnitCode": "UPU-FAC-CIE"},
  {"code": "AL-C-FISICAIIIO-020", "activityCode": "C-FISICAIIIO-020", "orgUnitCode": "UPU-FAC-CIE"},
  {"code": "AL-C-QUIMICAGEN-004", "activityCode": "C-QUIMICAGEN-004", "orgUnitCode": "UPU-FAC-CIE"},
  {"code": "AL-C-FUNDAMENTO-255", "activityCode": "C-FUNDAMENTO-255", "orgUnitCode": "UPU-FAC-ING"},
  {"code": "AL-RED109", "activityCode": "RED109", "orgUnitCode": "UPU-FAC-ING"},
  {"code": "AL-C-GESTIONDEP-077", "activityCode": "C-GESTIONDEP-077", "orgUnitCode": "UPU-FAC-ING"},
  {"code": "AL-C-ECONOMIAPA-019", "activityCode": "C-ECONOMIAPA-019", "orgUnitCode": "UPU-FAC-CIE"},
  {"code": "AL-C-INGLESTECN-239", "activityCode": "C-INGLESTECN-239", "orgUnitCode": "UPU-FAC-CIE"},
  {"code": "AL-111026C", "activityCode": "111026C", "orgUnitCode": "UPU-FAC-CIE"},
];
const OFFERINGS = [
  {"code": "OFF-C-CALCULOI-001-2026-1-A", "name": "Cálculo I - Seccion A (2026-1)", "status": "Active", "maxCapacity": 35, "recordType": "Syllabus", "activityCode": "C-CALCULOI-001", "lineCode": "AL-C-CALCULOI-001", "termName": "Primer Semestre"},
  {"code": "OFF-C-CALCULOI-001-2026-1-B", "name": "Cálculo I - Seccion B (2026-1)", "status": "Active", "maxCapacity": 35, "recordType": "Syllabus", "activityCode": "C-CALCULOI-001", "lineCode": "AL-C-CALCULOI-001", "termName": "Primer Semestre"},
  {"code": "OFF-C-CALCULOI-001-2026-1-C", "name": "Cálculo I - Seccion C (2026-1)", "status": "Active", "maxCapacity": 35, "recordType": "Syllabus", "activityCode": "C-CALCULOI-001", "lineCode": "AL-C-CALCULOI-001", "termName": "Primer Semestre"},
  {"code": "OFF-C-CALCULOI-001-2026-1-D", "name": "Cálculo I - Seccion D (2026-1)", "status": "Active", "maxCapacity": 35, "recordType": "Syllabus", "activityCode": "C-CALCULOI-001", "lineCode": "AL-C-CALCULOI-001", "termName": "Primer Semestre"},
  {"code": "OFF-C-CALCULOI-001-2026-1-E", "name": "Cálculo I - Seccion E (2026-1)", "status": "Active", "maxCapacity": 35, "recordType": "Syllabus", "activityCode": "C-CALCULOI-001", "lineCode": "AL-C-CALCULOI-001", "termName": "Primer Semestre"},
  {"code": "OFF-C-CALCULOI-001-2026-2-A", "name": "Cálculo I - Seccion A (2026-2)", "status": "Active", "maxCapacity": 35, "recordType": "Syllabus", "activityCode": "C-CALCULOI-001", "lineCode": "AL-C-CALCULOI-001", "termName": "Segundo Semestre"},
  {"code": "OFF-C-CALCULOI-001-2026-2-B", "name": "Cálculo I - Seccion B (2026-2)", "status": "Active", "maxCapacity": 35, "recordType": "Syllabus", "activityCode": "C-CALCULOI-001", "lineCode": "AL-C-CALCULOI-001", "termName": "Segundo Semestre"},
  {"code": "OFF-C-CALCULOI-001-2026-2-C", "name": "Cálculo I - Seccion C (2026-2)", "status": "Active", "maxCapacity": 35, "recordType": "Syllabus", "activityCode": "C-CALCULOI-001", "lineCode": "AL-C-CALCULOI-001", "termName": "Segundo Semestre"},
  {"code": "OFF-C-CALCULOI-001-2026-2-D", "name": "Cálculo I - Seccion D (2026-2)", "status": "Active", "maxCapacity": 35, "recordType": "Syllabus", "activityCode": "C-CALCULOI-001", "lineCode": "AL-C-CALCULOI-001", "termName": "Segundo Semestre"},
  {"code": "OFF-C-CALCULOI-001-2026-2-E", "name": "Cálculo I - Seccion E (2026-2)", "status": "Active", "maxCapacity": 35, "recordType": "Syllabus", "activityCode": "C-CALCULOI-001", "lineCode": "AL-C-CALCULOI-001", "termName": "Segundo Semestre"},
  {"code": "OFF-C-CALCULOII-006-2026-1-A", "name": "Cálculo I - Seccion A (2026-1)", "status": "Active", "maxCapacity": 35, "recordType": "Syllabus", "activityCode": "C-CALCULOII-006", "lineCode": "AL-C-CALCULOII-006", "termName": "Primer Semestre"},
  {"code": "OFF-C-CALCULOII-006-2026-1-B", "name": "Cálculo I - Seccion B (2026-1)", "status": "Active", "maxCapacity": 35, "recordType": "Syllabus", "activityCode": "C-CALCULOII-006", "lineCode": "AL-C-CALCULOII-006", "termName": "Primer Semestre"},
  {"code": "OFF-C-CALCULOII-006-2026-1-C", "name": "Cálculo I - Seccion C (2026-1)", "status": "Active", "maxCapacity": 35, "recordType": "Syllabus", "activityCode": "C-CALCULOII-006", "lineCode": "AL-C-CALCULOII-006", "termName": "Primer Semestre"},
  {"code": "OFF-C-CALCULOII-006-2026-1-D", "name": "Cálculo I - Seccion D (2026-1)", "status": "Active", "maxCapacity": 35, "recordType": "Syllabus", "activityCode": "C-CALCULOII-006", "lineCode": "AL-C-CALCULOII-006", "termName": "Primer Semestre"},
  {"code": "OFF-C-CALCULOII-006-2026-1-E", "name": "Cálculo I - Seccion E (2026-1)", "status": "Active", "maxCapacity": 35, "recordType": "Syllabus", "activityCode": "C-CALCULOII-006", "lineCode": "AL-C-CALCULOII-006", "termName": "Primer Semestre"},
  {"code": "OFF-C-CALCULOII-006-2026-2-A", "name": "Cálculo I - Seccion A (2026-2)", "status": "Active", "maxCapacity": 35, "recordType": "Syllabus", "activityCode": "C-CALCULOII-006", "lineCode": "AL-C-CALCULOII-006", "termName": "Segundo Semestre"},
  {"code": "OFF-C-CALCULOII-006-2026-2-B", "name": "Cálculo I - Seccion B (2026-2)", "status": "Active", "maxCapacity": 35, "recordType": "Syllabus", "activityCode": "C-CALCULOII-006", "lineCode": "AL-C-CALCULOII-006", "termName": "Segundo Semestre"},
  {"code": "OFF-C-CALCULOII-006-2026-2-C", "name": "Cálculo I - Seccion C (2026-2)", "status": "Active", "maxCapacity": 35, "recordType": "Syllabus", "activityCode": "C-CALCULOII-006", "lineCode": "AL-C-CALCULOII-006", "termName": "Segundo Semestre"},
  {"code": "OFF-C-CALCULOII-006-2026-2-D", "name": "Cálculo I - Seccion D (2026-2)", "status": "Active", "maxCapacity": 35, "recordType": "Syllabus", "activityCode": "C-CALCULOII-006", "lineCode": "AL-C-CALCULOII-006", "termName": "Segundo Semestre"},
  {"code": "OFF-C-CALCULOII-006-2026-2-E", "name": "Cálculo I - Seccion E (2026-2)", "status": "Active", "maxCapacity": 35, "recordType": "Syllabus", "activityCode": "C-CALCULOII-006", "lineCode": "AL-C-CALCULOII-006", "termName": "Segundo Semestre"},
  {"code": "OFF-C-ALGEBRALIN-002-2026-1-A", "name": "Álgebra Lineal - Seccion A (2026-1)", "status": "Active", "maxCapacity": 35, "recordType": "Syllabus", "activityCode": "C-ALGEBRALIN-002", "lineCode": "AL-C-ALGEBRALIN-002", "termName": "Primer Semestre"},
  {"code": "OFF-C-ALGEBRALIN-002-2026-1-B", "name": "Álgebra Lineal - Seccion B (2026-1)", "status": "Active", "maxCapacity": 35, "recordType": "Syllabus", "activityCode": "C-ALGEBRALIN-002", "lineCode": "AL-C-ALGEBRALIN-002", "termName": "Primer Semestre"},
  {"code": "OFF-C-ALGEBRALIN-002-2026-1-C", "name": "Álgebra Lineal - Seccion C (2026-1)", "status": "Active", "maxCapacity": 35, "recordType": "Syllabus", "activityCode": "C-ALGEBRALIN-002", "lineCode": "AL-C-ALGEBRALIN-002", "termName": "Primer Semestre"},
  {"code": "OFF-C-ALGEBRALIN-002-2026-1-D", "name": "Álgebra Lineal - Seccion D (2026-1)", "status": "Active", "maxCapacity": 35, "recordType": "Syllabus", "activityCode": "C-ALGEBRALIN-002", "lineCode": "AL-C-ALGEBRALIN-002", "termName": "Primer Semestre"},
  {"code": "OFF-C-ALGEBRALIN-002-2026-1-E", "name": "Álgebra Lineal - Seccion E (2026-1)", "status": "Active", "maxCapacity": 35, "recordType": "Syllabus", "activityCode": "C-ALGEBRALIN-002", "lineCode": "AL-C-ALGEBRALIN-002", "termName": "Primer Semestre"},
  {"code": "OFF-C-ALGEBRALIN-002-2026-2-A", "name": "Álgebra Lineal - Seccion A (2026-2)", "status": "Active", "maxCapacity": 35, "recordType": "Syllabus", "activityCode": "C-ALGEBRALIN-002", "lineCode": "AL-C-ALGEBRALIN-002", "termName": "Segundo Semestre"},
  {"code": "OFF-C-ALGEBRALIN-002-2026-2-B", "name": "Álgebra Lineal - Seccion B (2026-2)", "status": "Active", "maxCapacity": 35, "recordType": "Syllabus", "activityCode": "C-ALGEBRALIN-002", "lineCode": "AL-C-ALGEBRALIN-002", "termName": "Segundo Semestre"},
  {"code": "OFF-C-ALGEBRALIN-002-2026-2-C", "name": "Álgebra Lineal - Seccion C (2026-2)", "status": "Active", "maxCapacity": 35, "recordType": "Syllabus", "activityCode": "C-ALGEBRALIN-002", "lineCode": "AL-C-ALGEBRALIN-002", "termName": "Segundo Semestre"},
  {"code": "OFF-C-ALGEBRALIN-002-2026-2-D", "name": "Álgebra Lineal - Seccion D (2026-2)", "status": "Active", "maxCapacity": 35, "recordType": "Syllabus", "activityCode": "C-ALGEBRALIN-002", "lineCode": "AL-C-ALGEBRALIN-002", "termName": "Segundo Semestre"},
  {"code": "OFF-C-ALGEBRALIN-002-2026-2-E", "name": "Álgebra Lineal - Seccion E (2026-2)", "status": "Active", "maxCapacity": 35, "recordType": "Syllabus", "activityCode": "C-ALGEBRALIN-002", "lineCode": "AL-C-ALGEBRALIN-002", "termName": "Segundo Semestre"},
  {"code": "OFF-C-ESTADISTIC-107-2026-1-A", "name": "Estadística - Seccion A (2026-1)", "status": "Active", "maxCapacity": 35, "recordType": "Syllabus", "activityCode": "C-ESTADISTIC-107", "lineCode": "AL-C-ESTADISTIC-107", "termName": "Primer Semestre"},
  {"code": "OFF-C-ESTADISTIC-107-2026-1-B", "name": "Estadística - Seccion B (2026-1)", "status": "Active", "maxCapacity": 35, "recordType": "Syllabus", "activityCode": "C-ESTADISTIC-107", "lineCode": "AL-C-ESTADISTIC-107", "termName": "Primer Semestre"},
  {"code": "OFF-C-ESTADISTIC-107-2026-1-C", "name": "Estadística - Seccion C (2026-1)", "status": "Active", "maxCapacity": 35, "recordType": "Syllabus", "activityCode": "C-ESTADISTIC-107", "lineCode": "AL-C-ESTADISTIC-107", "termName": "Primer Semestre"},
  {"code": "OFF-C-ESTADISTIC-107-2026-1-D", "name": "Estadística - Seccion D (2026-1)", "status": "Active", "maxCapacity": 35, "recordType": "Syllabus", "activityCode": "C-ESTADISTIC-107", "lineCode": "AL-C-ESTADISTIC-107", "termName": "Primer Semestre"},
  {"code": "OFF-C-ESTADISTIC-107-2026-1-E", "name": "Estadística - Seccion E (2026-1)", "status": "Active", "maxCapacity": 35, "recordType": "Syllabus", "activityCode": "C-ESTADISTIC-107", "lineCode": "AL-C-ESTADISTIC-107", "termName": "Primer Semestre"},
  {"code": "OFF-C-ESTADISTIC-107-2026-2-A", "name": "Estadística - Seccion A (2026-2)", "status": "Active", "maxCapacity": 35, "recordType": "Syllabus", "activityCode": "C-ESTADISTIC-107", "lineCode": "AL-C-ESTADISTIC-107", "termName": "Segundo Semestre"},
  {"code": "OFF-C-ESTADISTIC-107-2026-2-B", "name": "Estadística - Seccion B (2026-2)", "status": "Active", "maxCapacity": 35, "recordType": "Syllabus", "activityCode": "C-ESTADISTIC-107", "lineCode": "AL-C-ESTADISTIC-107", "termName": "Segundo Semestre"},
  {"code": "OFF-C-ESTADISTIC-107-2026-2-C", "name": "Estadística - Seccion C (2026-2)", "status": "Active", "maxCapacity": 35, "recordType": "Syllabus", "activityCode": "C-ESTADISTIC-107", "lineCode": "AL-C-ESTADISTIC-107", "termName": "Segundo Semestre"},
  {"code": "OFF-C-ESTADISTIC-107-2026-2-D", "name": "Estadística - Seccion D (2026-2)", "status": "Active", "maxCapacity": 35, "recordType": "Syllabus", "activityCode": "C-ESTADISTIC-107", "lineCode": "AL-C-ESTADISTIC-107", "termName": "Segundo Semestre"},
  {"code": "OFF-C-ESTADISTIC-107-2026-2-E", "name": "Estadística - Seccion E (2026-2)", "status": "Active", "maxCapacity": 35, "recordType": "Syllabus", "activityCode": "C-ESTADISTIC-107", "lineCode": "AL-C-ESTADISTIC-107", "termName": "Segundo Semestre"},
  {"code": "OFF-C-FISICAIIIO-020-2026-1-A", "name": "Física General - Seccion A (2026-1)", "status": "Active", "maxCapacity": 35, "recordType": "Syllabus", "activityCode": "C-FISICAIIIO-020", "lineCode": "AL-C-FISICAIIIO-020", "termName": "Primer Semestre"},
  {"code": "OFF-C-FISICAIIIO-020-2026-1-B", "name": "Física General - Seccion B (2026-1)", "status": "Active", "maxCapacity": 35, "recordType": "Syllabus", "activityCode": "C-FISICAIIIO-020", "lineCode": "AL-C-FISICAIIIO-020", "termName": "Primer Semestre"},
  {"code": "OFF-C-FISICAIIIO-020-2026-1-C", "name": "Física General - Seccion C (2026-1)", "status": "Active", "maxCapacity": 35, "recordType": "Syllabus", "activityCode": "C-FISICAIIIO-020", "lineCode": "AL-C-FISICAIIIO-020", "termName": "Primer Semestre"},
  {"code": "OFF-C-FISICAIIIO-020-2026-1-D", "name": "Física General - Seccion D (2026-1)", "status": "Active", "maxCapacity": 35, "recordType": "Syllabus", "activityCode": "C-FISICAIIIO-020", "lineCode": "AL-C-FISICAIIIO-020", "termName": "Primer Semestre"},
  {"code": "OFF-C-FISICAIIIO-020-2026-1-E", "name": "Física General - Seccion E (2026-1)", "status": "Active", "maxCapacity": 35, "recordType": "Syllabus", "activityCode": "C-FISICAIIIO-020", "lineCode": "AL-C-FISICAIIIO-020", "termName": "Primer Semestre"},
  {"code": "OFF-C-FISICAIIIO-020-2026-2-A", "name": "Física General - Seccion A (2026-2)", "status": "Active", "maxCapacity": 35, "recordType": "Syllabus", "activityCode": "C-FISICAIIIO-020", "lineCode": "AL-C-FISICAIIIO-020", "termName": "Segundo Semestre"},
  {"code": "OFF-C-FISICAIIIO-020-2026-2-B", "name": "Física General - Seccion B (2026-2)", "status": "Active", "maxCapacity": 35, "recordType": "Syllabus", "activityCode": "C-FISICAIIIO-020", "lineCode": "AL-C-FISICAIIIO-020", "termName": "Segundo Semestre"},
  {"code": "OFF-C-FISICAIIIO-020-2026-2-C", "name": "Física General - Seccion C (2026-2)", "status": "Active", "maxCapacity": 35, "recordType": "Syllabus", "activityCode": "C-FISICAIIIO-020", "lineCode": "AL-C-FISICAIIIO-020", "termName": "Segundo Semestre"},
  {"code": "OFF-C-FISICAIIIO-020-2026-2-D", "name": "Física General - Seccion D (2026-2)", "status": "Active", "maxCapacity": 35, "recordType": "Syllabus", "activityCode": "C-FISICAIIIO-020", "lineCode": "AL-C-FISICAIIIO-020", "termName": "Segundo Semestre"},
  {"code": "OFF-C-FISICAIIIO-020-2026-2-E", "name": "Física General - Seccion E (2026-2)", "status": "Active", "maxCapacity": 35, "recordType": "Syllabus", "activityCode": "C-FISICAIIIO-020", "lineCode": "AL-C-FISICAIIIO-020", "termName": "Segundo Semestre"},
  {"code": "OFF-C-QUIMICAGEN-004-2026-1-A", "name": "Química Básica - Seccion A (2026-1)", "status": "Active", "maxCapacity": 35, "recordType": "Syllabus", "activityCode": "C-QUIMICAGEN-004", "lineCode": "AL-C-QUIMICAGEN-004", "termName": "Primer Semestre"},
  {"code": "OFF-C-QUIMICAGEN-004-2026-1-B", "name": "Química Básica - Seccion B (2026-1)", "status": "Active", "maxCapacity": 35, "recordType": "Syllabus", "activityCode": "C-QUIMICAGEN-004", "lineCode": "AL-C-QUIMICAGEN-004", "termName": "Primer Semestre"},
  {"code": "OFF-C-QUIMICAGEN-004-2026-1-C", "name": "Química Básica - Seccion C (2026-1)", "status": "Active", "maxCapacity": 35, "recordType": "Syllabus", "activityCode": "C-QUIMICAGEN-004", "lineCode": "AL-C-QUIMICAGEN-004", "termName": "Primer Semestre"},
  {"code": "OFF-C-QUIMICAGEN-004-2026-1-D", "name": "Química Básica - Seccion D (2026-1)", "status": "Active", "maxCapacity": 35, "recordType": "Syllabus", "activityCode": "C-QUIMICAGEN-004", "lineCode": "AL-C-QUIMICAGEN-004", "termName": "Primer Semestre"},
  {"code": "OFF-C-QUIMICAGEN-004-2026-1-E", "name": "Química Básica - Seccion E (2026-1)", "status": "Active", "maxCapacity": 35, "recordType": "Syllabus", "activityCode": "C-QUIMICAGEN-004", "lineCode": "AL-C-QUIMICAGEN-004", "termName": "Primer Semestre"},
  {"code": "OFF-C-QUIMICAGEN-004-2026-2-A", "name": "Química Básica - Seccion A (2026-2)", "status": "Active", "maxCapacity": 35, "recordType": "Syllabus", "activityCode": "C-QUIMICAGEN-004", "lineCode": "AL-C-QUIMICAGEN-004", "termName": "Segundo Semestre"},
  {"code": "OFF-C-QUIMICAGEN-004-2026-2-B", "name": "Química Básica - Seccion B (2026-2)", "status": "Active", "maxCapacity": 35, "recordType": "Syllabus", "activityCode": "C-QUIMICAGEN-004", "lineCode": "AL-C-QUIMICAGEN-004", "termName": "Segundo Semestre"},
  {"code": "OFF-C-QUIMICAGEN-004-2026-2-C", "name": "Química Básica - Seccion C (2026-2)", "status": "Active", "maxCapacity": 35, "recordType": "Syllabus", "activityCode": "C-QUIMICAGEN-004", "lineCode": "AL-C-QUIMICAGEN-004", "termName": "Segundo Semestre"},
  {"code": "OFF-C-QUIMICAGEN-004-2026-2-D", "name": "Química Básica - Seccion D (2026-2)", "status": "Active", "maxCapacity": 35, "recordType": "Syllabus", "activityCode": "C-QUIMICAGEN-004", "lineCode": "AL-C-QUIMICAGEN-004", "termName": "Segundo Semestre"},
  {"code": "OFF-C-QUIMICAGEN-004-2026-2-E", "name": "Química Básica - Seccion E (2026-2)", "status": "Active", "maxCapacity": 35, "recordType": "Syllabus", "activityCode": "C-QUIMICAGEN-004", "lineCode": "AL-C-QUIMICAGEN-004", "termName": "Segundo Semestre"},
  {"code": "OFF-C-FUNDAMENTO-255-2026-1-A", "name": "Programación I - Seccion A (2026-1)", "status": "Active", "maxCapacity": 35, "recordType": "Syllabus", "activityCode": "C-FUNDAMENTO-255", "lineCode": "AL-C-FUNDAMENTO-255", "termName": "Primer Semestre"},
  {"code": "OFF-C-FUNDAMENTO-255-2026-1-B", "name": "Programación I - Seccion B (2026-1)", "status": "Active", "maxCapacity": 35, "recordType": "Syllabus", "activityCode": "C-FUNDAMENTO-255", "lineCode": "AL-C-FUNDAMENTO-255", "termName": "Primer Semestre"},
  {"code": "OFF-C-FUNDAMENTO-255-2026-1-C", "name": "Programación I - Seccion C (2026-1)", "status": "Active", "maxCapacity": 35, "recordType": "Syllabus", "activityCode": "C-FUNDAMENTO-255", "lineCode": "AL-C-FUNDAMENTO-255", "termName": "Primer Semestre"},
  {"code": "OFF-C-FUNDAMENTO-255-2026-1-D", "name": "Programación I - Seccion D (2026-1)", "status": "Active", "maxCapacity": 35, "recordType": "Syllabus", "activityCode": "C-FUNDAMENTO-255", "lineCode": "AL-C-FUNDAMENTO-255", "termName": "Primer Semestre"},
  {"code": "OFF-C-FUNDAMENTO-255-2026-1-E", "name": "Programación I - Seccion E (2026-1)", "status": "Active", "maxCapacity": 35, "recordType": "Syllabus", "activityCode": "C-FUNDAMENTO-255", "lineCode": "AL-C-FUNDAMENTO-255", "termName": "Primer Semestre"},
  {"code": "OFF-C-FUNDAMENTO-255-2026-2-A", "name": "Programación I - Seccion A (2026-2)", "status": "Active", "maxCapacity": 35, "recordType": "Syllabus", "activityCode": "C-FUNDAMENTO-255", "lineCode": "AL-C-FUNDAMENTO-255", "termName": "Segundo Semestre"},
  {"code": "OFF-C-FUNDAMENTO-255-2026-2-B", "name": "Programación I - Seccion B (2026-2)", "status": "Active", "maxCapacity": 35, "recordType": "Syllabus", "activityCode": "C-FUNDAMENTO-255", "lineCode": "AL-C-FUNDAMENTO-255", "termName": "Segundo Semestre"},
  {"code": "OFF-C-FUNDAMENTO-255-2026-2-C", "name": "Programación I - Seccion C (2026-2)", "status": "Active", "maxCapacity": 35, "recordType": "Syllabus", "activityCode": "C-FUNDAMENTO-255", "lineCode": "AL-C-FUNDAMENTO-255", "termName": "Segundo Semestre"},
  {"code": "OFF-C-FUNDAMENTO-255-2026-2-D", "name": "Programación I - Seccion D (2026-2)", "status": "Active", "maxCapacity": 35, "recordType": "Syllabus", "activityCode": "C-FUNDAMENTO-255", "lineCode": "AL-C-FUNDAMENTO-255", "termName": "Segundo Semestre"},
  {"code": "OFF-C-FUNDAMENTO-255-2026-2-E", "name": "Programación I - Seccion E (2026-2)", "status": "Active", "maxCapacity": 35, "recordType": "Syllabus", "activityCode": "C-FUNDAMENTO-255", "lineCode": "AL-C-FUNDAMENTO-255", "termName": "Segundo Semestre"},
  {"code": "OFF-RED109-2026-1-A", "name": "Redes de Computadores - Seccion A (2026-1)", "status": "Active", "maxCapacity": 35, "recordType": "Syllabus", "activityCode": "RED109", "lineCode": "AL-RED109", "termName": "Primer Semestre"},
  {"code": "OFF-RED109-2026-1-B", "name": "Redes de Computadores - Seccion B (2026-1)", "status": "Active", "maxCapacity": 35, "recordType": "Syllabus", "activityCode": "RED109", "lineCode": "AL-RED109", "termName": "Primer Semestre"},
  {"code": "OFF-RED109-2026-1-C", "name": "Redes de Computadores - Seccion C (2026-1)", "status": "Active", "maxCapacity": 35, "recordType": "Syllabus", "activityCode": "RED109", "lineCode": "AL-RED109", "termName": "Primer Semestre"},
  {"code": "OFF-RED109-2026-1-D", "name": "Redes de Computadores - Seccion D (2026-1)", "status": "Active", "maxCapacity": 35, "recordType": "Syllabus", "activityCode": "RED109", "lineCode": "AL-RED109", "termName": "Primer Semestre"},
  {"code": "OFF-RED109-2026-1-E", "name": "Redes de Computadores - Seccion E (2026-1)", "status": "Active", "maxCapacity": 35, "recordType": "Syllabus", "activityCode": "RED109", "lineCode": "AL-RED109", "termName": "Primer Semestre"},
  {"code": "OFF-RED109-2026-2-A", "name": "Redes de Computadores - Seccion A (2026-2)", "status": "Active", "maxCapacity": 35, "recordType": "Syllabus", "activityCode": "RED109", "lineCode": "AL-RED109", "termName": "Segundo Semestre"},
  {"code": "OFF-RED109-2026-2-B", "name": "Redes de Computadores - Seccion B (2026-2)", "status": "Active", "maxCapacity": 35, "recordType": "Syllabus", "activityCode": "RED109", "lineCode": "AL-RED109", "termName": "Segundo Semestre"},
  {"code": "OFF-RED109-2026-2-C", "name": "Redes de Computadores - Seccion C (2026-2)", "status": "Active", "maxCapacity": 35, "recordType": "Syllabus", "activityCode": "RED109", "lineCode": "AL-RED109", "termName": "Segundo Semestre"},
  {"code": "OFF-RED109-2026-2-D", "name": "Redes de Computadores - Seccion D (2026-2)", "status": "Active", "maxCapacity": 35, "recordType": "Syllabus", "activityCode": "RED109", "lineCode": "AL-RED109", "termName": "Segundo Semestre"},
  {"code": "OFF-RED109-2026-2-E", "name": "Redes de Computadores - Seccion E (2026-2)", "status": "Active", "maxCapacity": 35, "recordType": "Syllabus", "activityCode": "RED109", "lineCode": "AL-RED109", "termName": "Segundo Semestre"},
  {"code": "OFF-C-GESTIONDEP-077-2026-1-A", "name": "Gestión de Proyectos - Seccion A (2026-1)", "status": "Active", "maxCapacity": 35, "recordType": "Syllabus", "activityCode": "C-GESTIONDEP-077", "lineCode": "AL-C-GESTIONDEP-077", "termName": "Primer Semestre"},
  {"code": "OFF-C-GESTIONDEP-077-2026-1-B", "name": "Gestión de Proyectos - Seccion B (2026-1)", "status": "Active", "maxCapacity": 35, "recordType": "Syllabus", "activityCode": "C-GESTIONDEP-077", "lineCode": "AL-C-GESTIONDEP-077", "termName": "Primer Semestre"},
  {"code": "OFF-C-GESTIONDEP-077-2026-1-C", "name": "Gestión de Proyectos - Seccion C (2026-1)", "status": "Active", "maxCapacity": 35, "recordType": "Syllabus", "activityCode": "C-GESTIONDEP-077", "lineCode": "AL-C-GESTIONDEP-077", "termName": "Primer Semestre"},
  {"code": "OFF-C-GESTIONDEP-077-2026-1-D", "name": "Gestión de Proyectos - Seccion D (2026-1)", "status": "Active", "maxCapacity": 35, "recordType": "Syllabus", "activityCode": "C-GESTIONDEP-077", "lineCode": "AL-C-GESTIONDEP-077", "termName": "Primer Semestre"},
  {"code": "OFF-C-GESTIONDEP-077-2026-1-E", "name": "Gestión de Proyectos - Seccion E (2026-1)", "status": "Active", "maxCapacity": 35, "recordType": "Syllabus", "activityCode": "C-GESTIONDEP-077", "lineCode": "AL-C-GESTIONDEP-077", "termName": "Primer Semestre"},
  {"code": "OFF-C-GESTIONDEP-077-2026-2-A", "name": "Gestión de Proyectos - Seccion A (2026-2)", "status": "Active", "maxCapacity": 35, "recordType": "Syllabus", "activityCode": "C-GESTIONDEP-077", "lineCode": "AL-C-GESTIONDEP-077", "termName": "Segundo Semestre"},
  {"code": "OFF-C-GESTIONDEP-077-2026-2-B", "name": "Gestión de Proyectos - Seccion B (2026-2)", "status": "Active", "maxCapacity": 35, "recordType": "Syllabus", "activityCode": "C-GESTIONDEP-077", "lineCode": "AL-C-GESTIONDEP-077", "termName": "Segundo Semestre"},
  {"code": "OFF-C-GESTIONDEP-077-2026-2-C", "name": "Gestión de Proyectos - Seccion C (2026-2)", "status": "Active", "maxCapacity": 35, "recordType": "Syllabus", "activityCode": "C-GESTIONDEP-077", "lineCode": "AL-C-GESTIONDEP-077", "termName": "Segundo Semestre"},
  {"code": "OFF-C-GESTIONDEP-077-2026-2-D", "name": "Gestión de Proyectos - Seccion D (2026-2)", "status": "Active", "maxCapacity": 35, "recordType": "Syllabus", "activityCode": "C-GESTIONDEP-077", "lineCode": "AL-C-GESTIONDEP-077", "termName": "Segundo Semestre"},
  {"code": "OFF-C-GESTIONDEP-077-2026-2-E", "name": "Gestión de Proyectos - Seccion E (2026-2)", "status": "Active", "maxCapacity": 35, "recordType": "Syllabus", "activityCode": "C-GESTIONDEP-077", "lineCode": "AL-C-GESTIONDEP-077", "termName": "Segundo Semestre"},
  {"code": "OFF-C-ECONOMIAPA-019-2026-1-A", "name": "Microeconomía - Seccion A (2026-1)", "status": "Active", "maxCapacity": 35, "recordType": "Syllabus", "activityCode": "C-ECONOMIAPA-019", "lineCode": "AL-C-ECONOMIAPA-019", "termName": "Primer Semestre"},
  {"code": "OFF-C-ECONOMIAPA-019-2026-1-B", "name": "Microeconomía - Seccion B (2026-1)", "status": "Active", "maxCapacity": 35, "recordType": "Syllabus", "activityCode": "C-ECONOMIAPA-019", "lineCode": "AL-C-ECONOMIAPA-019", "termName": "Primer Semestre"},
  {"code": "OFF-C-ECONOMIAPA-019-2026-1-C", "name": "Microeconomía - Seccion C (2026-1)", "status": "Active", "maxCapacity": 35, "recordType": "Syllabus", "activityCode": "C-ECONOMIAPA-019", "lineCode": "AL-C-ECONOMIAPA-019", "termName": "Primer Semestre"},
  {"code": "OFF-C-ECONOMIAPA-019-2026-1-D", "name": "Microeconomía - Seccion D (2026-1)", "status": "Active", "maxCapacity": 35, "recordType": "Syllabus", "activityCode": "C-ECONOMIAPA-019", "lineCode": "AL-C-ECONOMIAPA-019", "termName": "Primer Semestre"},
  {"code": "OFF-C-ECONOMIAPA-019-2026-1-E", "name": "Microeconomía - Seccion E (2026-1)", "status": "Active", "maxCapacity": 35, "recordType": "Syllabus", "activityCode": "C-ECONOMIAPA-019", "lineCode": "AL-C-ECONOMIAPA-019", "termName": "Primer Semestre"},
  {"code": "OFF-C-ECONOMIAPA-019-2026-2-A", "name": "Microeconomía - Seccion A (2026-2)", "status": "Active", "maxCapacity": 35, "recordType": "Syllabus", "activityCode": "C-ECONOMIAPA-019", "lineCode": "AL-C-ECONOMIAPA-019", "termName": "Segundo Semestre"},
  {"code": "OFF-C-ECONOMIAPA-019-2026-2-B", "name": "Microeconomía - Seccion B (2026-2)", "status": "Active", "maxCapacity": 35, "recordType": "Syllabus", "activityCode": "C-ECONOMIAPA-019", "lineCode": "AL-C-ECONOMIAPA-019", "termName": "Segundo Semestre"},
  {"code": "OFF-C-ECONOMIAPA-019-2026-2-C", "name": "Microeconomía - Seccion C (2026-2)", "status": "Active", "maxCapacity": 35, "recordType": "Syllabus", "activityCode": "C-ECONOMIAPA-019", "lineCode": "AL-C-ECONOMIAPA-019", "termName": "Segundo Semestre"},
  {"code": "OFF-C-ECONOMIAPA-019-2026-2-D", "name": "Microeconomía - Seccion D (2026-2)", "status": "Active", "maxCapacity": 35, "recordType": "Syllabus", "activityCode": "C-ECONOMIAPA-019", "lineCode": "AL-C-ECONOMIAPA-019", "termName": "Segundo Semestre"},
  {"code": "OFF-C-ECONOMIAPA-019-2026-2-E", "name": "Microeconomía - Seccion E (2026-2)", "status": "Active", "maxCapacity": 35, "recordType": "Syllabus", "activityCode": "C-ECONOMIAPA-019", "lineCode": "AL-C-ECONOMIAPA-019", "termName": "Segundo Semestre"},
  {"code": "OFF-C-INGLESTECN-239-2026-1-A", "name": "Inglés Técnico - Seccion A (2026-1)", "status": "Active", "maxCapacity": 35, "recordType": "Syllabus", "activityCode": "C-INGLESTECN-239", "lineCode": "AL-C-INGLESTECN-239", "termName": "Primer Semestre"},
  {"code": "OFF-C-INGLESTECN-239-2026-1-B", "name": "Inglés Técnico - Seccion B (2026-1)", "status": "Active", "maxCapacity": 35, "recordType": "Syllabus", "activityCode": "C-INGLESTECN-239", "lineCode": "AL-C-INGLESTECN-239", "termName": "Primer Semestre"},
  {"code": "OFF-C-INGLESTECN-239-2026-1-C", "name": "Inglés Técnico - Seccion C (2026-1)", "status": "Active", "maxCapacity": 35, "recordType": "Syllabus", "activityCode": "C-INGLESTECN-239", "lineCode": "AL-C-INGLESTECN-239", "termName": "Primer Semestre"},
  {"code": "OFF-C-INGLESTECN-239-2026-1-D", "name": "Inglés Técnico - Seccion D (2026-1)", "status": "Active", "maxCapacity": 35, "recordType": "Syllabus", "activityCode": "C-INGLESTECN-239", "lineCode": "AL-C-INGLESTECN-239", "termName": "Primer Semestre"},
  {"code": "OFF-C-INGLESTECN-239-2026-1-E", "name": "Inglés Técnico - Seccion E (2026-1)", "status": "Active", "maxCapacity": 35, "recordType": "Syllabus", "activityCode": "C-INGLESTECN-239", "lineCode": "AL-C-INGLESTECN-239", "termName": "Primer Semestre"},
  {"code": "OFF-C-INGLESTECN-239-2026-2-A", "name": "Inglés Técnico - Seccion A (2026-2)", "status": "Active", "maxCapacity": 35, "recordType": "Syllabus", "activityCode": "C-INGLESTECN-239", "lineCode": "AL-C-INGLESTECN-239", "termName": "Segundo Semestre"},
  {"code": "OFF-C-INGLESTECN-239-2026-2-B", "name": "Inglés Técnico - Seccion B (2026-2)", "status": "Active", "maxCapacity": 35, "recordType": "Syllabus", "activityCode": "C-INGLESTECN-239", "lineCode": "AL-C-INGLESTECN-239", "termName": "Segundo Semestre"},
  {"code": "OFF-C-INGLESTECN-239-2026-2-C", "name": "Inglés Técnico - Seccion C (2026-2)", "status": "Active", "maxCapacity": 35, "recordType": "Syllabus", "activityCode": "C-INGLESTECN-239", "lineCode": "AL-C-INGLESTECN-239", "termName": "Segundo Semestre"},
  {"code": "OFF-C-INGLESTECN-239-2026-2-D", "name": "Inglés Técnico - Seccion D (2026-2)", "status": "Active", "maxCapacity": 35, "recordType": "Syllabus", "activityCode": "C-INGLESTECN-239", "lineCode": "AL-C-INGLESTECN-239", "termName": "Segundo Semestre"},
  {"code": "OFF-C-INGLESTECN-239-2026-2-E", "name": "Inglés Técnico - Seccion E (2026-2)", "status": "Active", "maxCapacity": 35, "recordType": "Syllabus", "activityCode": "C-INGLESTECN-239", "lineCode": "AL-C-INGLESTECN-239", "termName": "Segundo Semestre"},
  {"code": "OFF-111026C-2026-1-A", "name": "Ecuaciones Diferenciales - Seccion A (2026-1)", "status": "Active", "maxCapacity": 35, "recordType": "Syllabus", "activityCode": "111026C", "lineCode": "AL-111026C", "termName": "Primer Semestre"},
  {"code": "OFF-111026C-2026-1-B", "name": "Ecuaciones Diferenciales - Seccion B (2026-1)", "status": "Active", "maxCapacity": 35, "recordType": "Syllabus", "activityCode": "111026C", "lineCode": "AL-111026C", "termName": "Primer Semestre"},
  {"code": "OFF-111026C-2026-1-C", "name": "Ecuaciones Diferenciales - Seccion C (2026-1)", "status": "Active", "maxCapacity": 35, "recordType": "Syllabus", "activityCode": "111026C", "lineCode": "AL-111026C", "termName": "Primer Semestre"},
  {"code": "OFF-111026C-2026-1-D", "name": "Ecuaciones Diferenciales - Seccion D (2026-1)", "status": "Active", "maxCapacity": 35, "recordType": "Syllabus", "activityCode": "111026C", "lineCode": "AL-111026C", "termName": "Primer Semestre"},
  {"code": "OFF-111026C-2026-1-E", "name": "Ecuaciones Diferenciales - Seccion E (2026-1)", "status": "Active", "maxCapacity": 35, "recordType": "Syllabus", "activityCode": "111026C", "lineCode": "AL-111026C", "termName": "Primer Semestre"},
  {"code": "OFF-111026C-2026-2-A", "name": "Ecuaciones Diferenciales - Seccion A (2026-2)", "status": "Active", "maxCapacity": 35, "recordType": "Syllabus", "activityCode": "111026C", "lineCode": "AL-111026C", "termName": "Segundo Semestre"},
  {"code": "OFF-111026C-2026-2-B", "name": "Ecuaciones Diferenciales - Seccion B (2026-2)", "status": "Active", "maxCapacity": 35, "recordType": "Syllabus", "activityCode": "111026C", "lineCode": "AL-111026C", "termName": "Segundo Semestre"},
  {"code": "OFF-111026C-2026-2-C", "name": "Ecuaciones Diferenciales - Seccion C (2026-2)", "status": "Active", "maxCapacity": 35, "recordType": "Syllabus", "activityCode": "111026C", "lineCode": "AL-111026C", "termName": "Segundo Semestre"},
  {"code": "OFF-111026C-2026-2-D", "name": "Ecuaciones Diferenciales - Seccion D (2026-2)", "status": "Active", "maxCapacity": 35, "recordType": "Syllabus", "activityCode": "111026C", "lineCode": "AL-111026C", "termName": "Segundo Semestre"},
  {"code": "OFF-111026C-2026-2-E", "name": "Ecuaciones Diferenciales - Seccion E (2026-2)", "status": "Active", "maxCapacity": 35, "recordType": "Syllabus", "activityCode": "111026C", "lineCode": "AL-111026C", "termName": "Segundo Semestre"},
];

// Faculties propias de UPU-MAIN (recordType=Faculty, ancladas via rt__Faculty__OrgUnit).
// Se crean aqui porque el mesh vive bajo UPU-MAIN y las Faculties del mod (UV-DEPT-MAT,
// AIEP-ESC-TEC) pertenecen a otras instituciones. Idempotente por code. Mismo patron que
// _data-univalle.js (create OrgUnit Faculty + upsert satelite con institutionId).
const FACULTIES = [
  { code: 'UPU-FAC-CIE', name: 'Facultad de Ciencias',   type: 'Faculty' },
  { code: 'UPU-FAC-ING', name: 'Facultad de Ingenieria', type: 'Faculty' },
];

export async function loadCourseOfferings(prisma, tenantId) {
  if (tenantId !== 'UPU') return { skipped: true, reason: `tenant ${tenantId} no UPU` };
  const institution = await prisma.institution.findFirst({ where: { code: 'UPU-MAIN' } });
  if (!institution) return { skipped: true, reason: 'no existe institution UPU-MAIN' };
  const actCache={}, lineByCode={}, termByName={}, ouByCode={};
  async function actId(code){ if(!(code in actCache)){ const a=await prisma.activity.findFirst({where:{code}}); actCache[code]=a?a.id:null;} return actCache[code]; }
  // 0. Faculties UPU (find-or-create + anclaje a la institucion)
  for (const f of FACULTIES) {
    let ou = await prisma.orgUnit.findFirst({ where: { code: f.code } });
    if (!ou) ou = await prisma.orgUnit.create({ data: {
      organizationId: institution.organizationId, recordType: 'Faculty',
      name: f.name, code: f.code, type: f.type, status: 'Active' } });
    await prisma.rt__Faculty__OrgUnit.upsert({
      where: { OrgUnitId: ou.id },
      create: { OrgUnitId: ou.id, institutionId: institution.id },
      update: { institutionId: institution.id } });
    ouByCode[f.code] = ou.id;
  }
  // 1. ActivityLines (orgUnit es NOT NULL: si falta activity u orgUnit, se salta con log)
  for (const ln of LINES) {
    let line = await prisma.activityLine.findFirst({ where: { code: ln.code } });
    if (!line) {
      const aid = await actId(ln.activityCode);
      let ouId = ouByCode[ln.orgUnitCode];
      if (ouId === undefined) { const ou = ln.orgUnitCode ? await prisma.orgUnit.findFirst({ where: { code: ln.orgUnitCode } }) : null; ouId = ou ? ou.id : null; }
      if (aid && ouId) line = await prisma.activityLine.create({ data: { code: ln.code, activityId: aid, orgUnitId: ouId, status:'Active' } });
      else console.warn(`  ⚠ ActivityLine ${ln.code} saltada (activity=${!!aid} orgUnit=${!!ouId})`);
    }
    if (line) lineByCode[ln.code]=line.id;
  }
  // 2. Offerings
  let created=0, skipped=0;
  for (const o of OFFERINGS) {
    const existing = await prisma.offering.findFirst({ where: { code: o.code } });
    if (existing) { skipped++; continue; }
    const aid = await actId(o.activityCode);
    const lineId = lineByCode[o.lineCode];
    let termId = null;
    if (o.termName) { if(!(o.termName in termByName)){ const t=await prisma.term.findFirst({where:{name:o.termName}}); termByName[o.termName]=t?t.id:null;} termId=termByName[o.termName]; }
    if (!aid || !lineId) { skipped++; continue; }
    await prisma.offering.create({ data: { code:o.code, name:o.name, status:o.status, maxCapacity:o.maxCapacity,
      recordType:o.recordType, activityId:aid, activityLineId:lineId, termId } });
    created++;
  }
  return { created, skipped, lines: LINES.length, total: OFFERINGS.length };
}