# Plan DKC -> Kanai por ticket - pehuen
 
Fuente DKC: commit e15fa24377cf1a0768cc10ad567c110b3ac2042e. Tickets canónicos: 31. Sidecars Markdown: 0.
 
Cada fila sigue: hash -> parseo -> relaciones -> schema/FK -> smoke -> resultado. Los estados provisionales requieren revisión antes de aceptar la migración.
 
| ID | Archivo | Título | Estado DKC | Estado Kanai | Work type | External | Sidecars | Disposición |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| PEH-001 | projects/pehuen/tickets/PEH-001.md | Migracion legacy → nuxt — paridad funcional por rol, tests TDD, validacion contra legacy y actualizacion de content/docs | open | open | implement | null | PEH-001.draft, PEH-001.teach | direct |
| PEH-002 | projects/pehuen/tickets/PEH-002.md | Sprint 0 — Setup ambientes paralelos + auditoría tests E2E nuxt existentes | closed | closed | implement | null | PEH-002.teach | direct |
| PEH-003 | projects/pehuen/tickets/PEH-003.md | Migración auth — login, sesión, roles, default route, cancha | closed | closed | implement | null | PEH-003.draft, PEH-003.teach | direct |
| PEH-004 | projects/pehuen/tickets/PEH-004.md | Migración guías — CRUD, anular/restaurar, movimientos, validaciones por rol | closed | closed | implement | null | PEH-004.draft, PEH-004.teach | direct |
| PEH-005 | projects/pehuen/tickets/PEH-005.md | Migración rumas — CRUD, mapa, volúmenes, vistas unificadas (deprecación asesor.*) | closed | closed | implement | null | PEH-005.draft, PEH-005.teach | direct |
| PEH-006 | projects/pehuen/tickets/PEH-006.md | Migración ajustes — individual + batch, ADMIN-only (paridad client legacy) | closed | closed | implement | null | PEH-006.draft, PEH-006.teach | direct |
| PEH-007 | projects/pehuen/tickets/PEH-007.md | Migración usuarios + canchas + productos + mantenedores (admin-only) | closed | closed | implement | null | PEH-007.draft, PEH-007.teach | direct |
| PEH-008 | projects/pehuen/tickets/PEH-008.md | Migración stats + reportes Excel + MII importer (cálculos críticos) | closed | closed | implement | null | PEH-008.draft, PEH-008.teach | direct |
| PEH-009 | projects/pehuen/tickets/PEH-009.md | Cross-cutting — sockets, concurrency, security, DST Chile, role-journeys, no-leak, mensajes | closed | closed | implement | null | PEH-009.teach | direct |
| PEH-010 | projects/pehuen/tickets/PEH-010.md | content/docs cleanup + docs por rol + actualización deckard | closed | closed | improvement | null | PEH-010.teach | direct |
| PEH-011 | projects/pehuen/tickets/PEH-011.md | blocked_on: PEH-010 closed + gate tecnico (paridad 100% / coverage / 0 CAPs pending — hoy | in_progress | in_progress | implement | null | PEH-011.teach | direct |
| PEH-012 | projects/pehuen/tickets/PEH-012.md | Edicion masiva de guias asociadas a una ruma (admin-only) — legacy | closed | closed | implement | null | PEH-012.draft, PEH-012.teach | direct |
| PEH-013 | projects/pehuen/tickets/PEH-013.md | nota: set sembrado desde PEH-012 (parent). El intake-explore lo confirma/expande | closed | closed | implement | null | PEH-013.draft | direct |
| PEH-014 | projects/pehuen/tickets/PEH-014.md | blocks: habilita la comparacion de mutaciones (POST/PATCH/DELETE) legacy<->nuxt. | closed | closed | fix | null | — | direct |
| PEH-015 | projects/pehuen/tickets/PEH-015.md | Origen: hallazgos del intake de PEH-009 S2 (mapeo de superficie e2e). Los tests de | closed | closed | fix | null | — | direct |
| PEH-016 | projects/pehuen/tickets/PEH-016.md | Bulk-edit guias de ruma (legacy) — quitar "Estado de ruma" del modal + mostrar especies de las guias en el card | closed | closed | improvement | null | — | direct |
| PEH-017 | projects/pehuen/tickets/PEH-017.md | Bulk-edit guias de ruma (nuxt) — mostrar especies de las guias en el card + verificar paridad de estado (mirror PEH-016) | closed | closed | improvement | null | PEH-017.screenshots | direct |
| PEH-018 | projects/pehuen/tickets/PEH-018.md | Tests de LocalStorage rojos tras refactor de filenames (generateFilename) — revisar y alinear | closed | closed | fix | null | — | direct |
| PEH-019 | projects/pehuen/tickets/PEH-019.md | Auditoria y hardening de tests fragiles (pehuen-nuxt) | closed | closed | improvement | null | — | direct |
| PEH-020 | projects/pehuen/tickets/PEH-020.md | Hardening de tests fragiles — clases B/E/A (follow-up PEH-019) [CERRADO — absorbido por PEH-021] | closed | closed | improvement | null | — | direct |
| PEH-021 | projects/pehuen/tickets/PEH-021.md | Bateria de paridad real legacy vs nuxt: estabilizar los specs y medir contra el legacy (clases B/E + etapas E2/E4) | closed | closed | improvement | null | — | direct |
| PEH-022 | projects/pehuen/tickets/PEH-022.md | Gaps de codigo detectados en la auditoria de cobertura: fixes + decisiones (paridad / correctitud pre-corte) | closed | closed | fix | null | — | direct |
| PEH-023 | projects/pehuen/tickets/PEH-023.md | Cobertura de tests para areas de alto riesgo sin ningun test (pre-corte) | closed | closed | improvement | null | — | direct |
| PEH-024 | projects/pehuen/tickets/PEH-024.md | Documentar que 3 de las 4 divergencias de stats son fixes de migracion (bugs del legacy corregidos en nuxt) | closed | closed | improvement | null | — | direct |
| PEH-025 | projects/pehuen/tickets/PEH-025.md | Correr los tests en CI + thresholds minimos de cobertura | closed | closed | improvement | null | — | direct |
| PEH-026 | projects/pehuen/tickets/PEH-026.md | Paridad runtime real contra el legacy: activar la comparacion + auditar los flows sin validar | closed | closed | improvement | null | — | direct |
| PEH-027 | projects/pehuen/tickets/PEH-027.md | Prueba con DB real para anonymizeUser (borrado PII) y patron para codigo de datos | closed | closed | improvement | null | — | direct |
| PEH-028 | projects/pehuen/tickets/PEH-028.md | Decidir R2: confirmar uso en algun deploy, luego borrar dead code o cubrir con test | closed | closed | refactor | null | — | direct |
| PEH-029 | projects/pehuen/tickets/PEH-029.md | Aislamiento e2e + validar full-3-viewport en CI | open | open | improvement | null | — | direct |
| PEH-030 | projects/pehuen/tickets/PEH-030.md | Corregir ortografia de copy en la UI (tildes/acentos) | in_progress | in_progress | improvement | null | — | direct |
| PEH-031 | projects/pehuen/tickets/PEH-031.md | Performance de DB: indices, filtro por cancha y optimizacion de memoria en fillRumaData (legacy + auditoria Nuxt) | design-improvement | open | improvement | — | PEH-031.teach | preserve legacy status + review |
 
## Sidecars fuera de matriz
- Ninguno.
 
## Aceptación
- No se descartan tickets por estados legacy.
- Todos los sidecars tienen destino explícito.
- Todos los hashes y relaciones quedan en el manifiesto.
 
