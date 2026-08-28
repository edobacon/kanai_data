---
id: EVOLUTION-up1-mcp
project: up1
ticket: TICKET-080
status: done
---

# up1-mcp — Evolution log (historia S0–S34)

# up1-mcp — Evolution log (historia S0–S34)

> **Registro histórico read-only**. Preserva el tablero §12.0 y la bitácora por sesión del plan externo `mcp-curriculum-design-plan-ejecucion-2026-06-05.md` (retirado por TICKET-080). NO recrea 34 tickets DKC (decisión D-C): es la narrativa de cómo se construyó el MCP. El diseño vigente vive en [SPEC-mcp-architecture](SPEC-mcp-architecture.md) y [SPEC-mcp-surface-and-contracts](SPEC-mcp-surface-and-contracts.md). De aquí en adelante, el avance del MCP se trackea con tickets DKC normales (`module: up1-mcp`). Validar con `--no-strict` (referencia).

## Tablero de progreso (§12.0)

| Sesión | Estado | Fecha | Nota |
|---|---|---|---|
| S0 — Fundaciones del repo | ✅ | 2026-06-06 | ESM puro, build, server arranca |
| S1 — Auth + identidad + roles | ✅ | 2026-06-06 | Clerk OTP sin secret key; 4 roles, 428 caps |
| S2 — Lectura: programas | ✅ | 2026-06-06 | search/get con fold de acentos |
| S3 — Lectura: bibliografía, historial, analíticas | ✅ | 2026-06-06 | ChangeLog, query/analytics |
| S4 — Capa de contratos | ✅ | 2026-06-06 | V1–V9 declaradas |
| S5 — Escritura: programas | ✅ | 2026-06-06 | create/update/version/transition |
| S6 — Escritura: secciones (hijos) | ✅ | 2026-06-06 | V1 pesos, position=max+1 |
| S7 — Extensibilidad | ✅ | 2026-06-06 | patrón contrato + allowlist |
| S8 — Self-doc, packaging, compatibilidad | ✅ | 2026-06-06 | `.mcpb` 18.4MB *(S8.V1 install GUI pendiente — backlog)* |
| S9 — Distribución multi-LLM hospedada (HTTP+OAuth) | ⏸️ POSTERGADA | — | post-MVP — backlog |
| S10 — Guía/wizard derivada de contratos | ✅ | 2026-06-06 | describe_object + get_create_guide + instructions |
| S11 — Opciones de campos (selects FK + enums) | ✅ | 2026-06-06 | get_field_options |
| S12 — Fix: executionUnitId en create/update_program | ✅ | 2026-06-08 | cierra gap S5↔S11 |
| S13 — Refactor multi-mod (contrato `ModPack`) | ✅ | 2026-06-09 | namespacing cd_* |
| S14 — Split de Activity por recordType (Course/Service) | ✅ | 2026-06-09 | cd_search scopea Course |
| S15 — uengagement: consultas (lectura) | ✅ | 2026-06-09 | 7 tools eng_* lectura |
| S16 — uengagement: escritura + permisos semánticos | ✅ | 2026-06-09 | enroll/unenroll/mark_attendance |
| S17 — Blindar mutaciones de flujo | ✅ | 2026-06-09 | blockGenericMutation |
| S18 — Ampliar surface engagement | ✅ | 2026-06-09 | bulk_enroll, create_service |
| S19 — Auto-doc por mod | ✅ | 2026-06-09 | get_documentation('mods') |
| S20 — Higiene de salida + guía de presentación | ✅ | 2026-06-09 | publicFields + pick |
| S21 — layouts: crear/consumir vistas | ✅ | 2026-06-11 | 5 tools view_* |
| S22 — Fallback a vistas + consulta efímera | ✅ | 2026-06-11 | query_records + view_create |
| S23 — Contrato conversacional (persistencia + confidencialidad) | ✅ | 2026-06-11 | F1–F10 saneadas |
| S24 — Fix model-v2: re-anclar engagement + CD | ✅ | 2026-06-12 | escritura bloqueada por drift UPU |
| S25 — Engagement: ampliar surface al delta | ✅ | 2026-06-12 | 12 tools; T5/T9–T11 diferidos |
| S26 — Doc de dominio user-facing por mod | ✅ | 2026-06-12 | domainDoc |
| S27 — Probe: inputs no-escalares en escritura CD | ✅ | 2026-06-18 | mapa de gaps |
| S28 — Capa de resolución semántica (`core/resolve.ts`) | ✅ | 2026-06-18 | híbrido + sinónimos |
| S29 — Cableado de resolución + lookups (Term) | ✅ | 2026-06-18 | Term desbloqueado |
| S30 — Doc: resolución + guía de autoría de mods | ✅ | 2026-06-18 | EXTENDING reescrito |
| S31 — Tools permission/context-aware (`tools/list_changed`) | ✅ | 2026-06-18 | 13 tools gateadas se ocultan |
| S32 — Consolidación de superficie + slimming instructions | ✅ | 2026-06-18 | topic conventions |
| S33 — Namespacing del registry de contratos | ✅ | 2026-06-18 | guard de unicidad |
| S34 — Reflejar mod cd (UPONE-1270): Curriculum tipado | ✅ | 2026-06-18 | read RT + herencia al versionar |

> **MVP** = S0–S6 + S8 (lectura + escritura + instalado en Claude). S7/S9 post-MVP. S13–S16 = extensión multi-mod (engagement). S21+ = layouts. S24–S34 = model-v2 + resolución semántica + escalabilidad de superficie.

## Bitácora por sesión (destilada)

> Cada entrada: objetivo · descubrimientos clave (con clasificación BUG/LEARN) · decisiones · diferidos. Los descubrimientos clasificados BUG (limitaciones de up1) se migraron a `bugs/{módulo}/`; las decisiones a `decisions/`.

### S0 — Fundaciones
- **Descubrimientos**: sin `X-Tenant-ID` → `TENANT_ID_REQUIRED` (LEARN: el cliente siempre lo envía). El error sin auth trae `code=INTERNAL_SERVER_ERROR` + stacktrace con paths absolutos (BUG: remapear + sanitizar). Arg correcto de `listInstances` es `name`.
- **Decisiones**: ESM puro (Node16, imports `.js`); PK Clerk como input de S1.

### S1 — Auth + identidad + roles
- **Descubrimientos**: bootstrap OTP nativo Clerk funciona **sin secret key** (LEARN). eduardo.bacon = 4 roles / 428 caps. **GOTCHA (BUG)**: `getMyPermissions` con `X-Selected-Role` colapsa el roster → impedía volver. `core_ObjectDefinition` usa `label`, no `displayName`.
- **Decisiones**: roster completo SIEMPRE con contexto base (cacheado), capabilities con rol activo. Sesión AES-256-GCM (`~/.up1-mcp/session.enc`, 0600).

### S2 — Lectura: programas
- **Descubrimientos**: ILIKE NO pliega tildes ('Ecuación'→0) (BUG). Los `*Name` de Activity.data son placeholders ('workflow #id') → joins client-side (BUG). `weight` vive en el typed record `rt__EvaluationComponent__curricularsection`, no en la base (LEARN). `getVersionChain` fiel al dato (TIR101=4 filas).
- **Decisiones**: `cd_search_programs` genera variantes sin acento antes de llamar.

### S3 — Lectura: bibliografía, historial, analíticas
- **Descubrimientos**: ChangeLog con 3 registros (todos Create) (NOTA). `entityType` PascalCase ('Activity', no 'activity') (BUG). n8n audit-capture parcialmente funcional.
- **Decisiones**: `analytics_changes` acota paginación a 1000 + aviso 'truncated'.

### S4 — Capa de contratos
- **Descubrimientos**: workflow default `activity-standard` (isDefault=true) por tenant — no hardcodear (LEARN). `fieldDefinitions` no expone enumValues para Activity → V8 config-driven (LEARN).
- **Decisiones**: V8 config-driven; V3/V5/V6 declaradas pero aplicadas en S5/S6 (requieren datos live).

### S5 — Escritura: programas
- **Descubrimientos**: 3 transiciones requieren comment. `allowsVersioning` true solo en Publicado (LEARN). V4 opera a nivel schema (LEARN). **CRÍTICO (BUG)**: `update_program` NO genera ChangeLog — `updateActivityValidated` hace `prisma.update()` sin `withEventPublish`.
- **Decisiones**: datos `MCP-TEST-` no se borran (enfoque B). Stopgap de auditoría queda COMENTADO (fix definitivo en mod/core).
- **Failed**: activar stopgap recordAuditEvent → descartado (riesgo doble-write).
- **Diferido**: fix audit gap → mod/core de up1 (P3).

### S6 — Escritura: secciones
- **Descubrimientos**: API acepta suma de pesos >100 sin error (BUG). Server NO autoasigna `position` (null) (BUG). `credits` requerido por DB al crear Activity (BUG). V1 = bloqueo de sobre-asignación (parciales OK) (LEARN).
- **Failed**: validar pesos leyendo la base → weight está en el typed record (corregido).

### S7 — Extensibilidad
- **Descubrimientos**: requeridos reales de BibliographyReference (title, rawCitation, referenceFormat enum server-side, institutionId) (LEARN). Patrón CRUD genérico + contrato + allowlist suficiente; núcleo agnóstico (LEARN).
- **Decisiones**: CRUD genérico rehúsa objetos con validatedMutations.

### S8 — Self-doc, packaging, compatibilidad
- **Descubrimientos**: `@anthropic-ai/mcpb pack` exige `user_config.*.description`; bundle 18.4MB (LEARN). Doc servida en runtime leyendo `docs/*.md` relativo al paquete (LEARN).
- **Diferido**: S8.V1 instalación GUI `.mcpb` + smoke E2E (backlog).

### S9 — Distribución hospedada (POSTERGADA)
- **Diferido**: transport HTTP + OAuth + staging/prod + ChatGPT/Gemini. Post-MVP. Backlog.

### S10 — Guía derivada de contratos
- **Descubrimientos**: `instructions` se pasa como 2º arg del constructor McpServer (LEARN). Guía 100% derivada del contrato (cero drift) (LEARN).
- **Decisiones**: Opción A (describe_object + get_create_guide + instructions) vs B (MCP Prompts wizard).

### S11 — Opciones de campos
- **Descubrimientos**: lookup allowlist de FKs se deriva de `fieldDocs[].fk` (LEARN). Institution=20, OrgUnit=2 en UPU.
- **Decisiones**: umbral 25 para inline; >25 → get_field_options.
- **Failed**: hardcodear institutionId (S7) → cerrado con get_field_options.

### S12 — Fix executionUnitId
- **Descubrimientos**: gap S5↔S11 — el write-path nunca incluyó `executionUnitId` en el inputSchema; Zod lo descartaba → programas con executionUnitId=null (BUG). La lista de Activity muestra id crudo en 'Unidad Organizativa' (relations omite 'executionunit') (BUG, fix de config del mod).
- **Diferido**: create real con OTP; fix columna en `default_Activity_list.json` (mod, P3).

### §12.E — Extensión multi-mod (engagement): análisis y decisión (2026-06-09)
- Engagement es un mod en el mismo object-manager/GraphQL (no microservicio REST). Comparte Activity (Course/Service). Leak preexistente: cd_search no filtraba recordType.
- **Decisión**: aislamiento = **Opción A (mod packs en un server)**; archivo compartido = manifiesto append-only. Descartadas B (monorepo multi-paquete) y C (dos servers, 2 logins). Desambiguación = **prefijo `cd_*`/`eng_*` breaking** (sin alias, 0.1.0 interno).

### S13 — Refactor a ModPack
- **Descubrimientos**: 6 archivos de colisión sin el refactor → el pack elimina todos salvo 1 línea (LEARN).
- **Decisiones**: tools genéricas (objects/guide/changes/docs) fuera del pack (infra compartida).

### S14 — Split Activity por recordType
- **Descubrimientos**: en UPU 3 Activity, todas Course (Service=0); leak latente (NOTA). Punto de contacto real era el objeto Service separado, no Activity:Service (LEARN).
- **Decisiones**: `getContract` por (objectType, recordType) con fallback 3-pasos.

### S15 — uengagement lectura
- **Descubrimientos**: engagement tiene objeto Service propio (Offering.serviceId→Service) (LEARN). `fieldDefinitions`=0 para engagement (LEARN). Modelo real Service→Offering→Event→Attendance, sin ServiceLine (LEARN). Permisos objectType:action sirven para CRUD; semánticas solo para flujos (LEARN).

### S16 — uengagement escritura + permisos semánticos
- **Descubrimientos**: `updateInstance` de Attendance devuelve data:null → usar status de entrada (BUG). `userId` en OfferingEnrollment es int core_User (LEARN, luego cambia en model-v2).
- **Decisiones**: flujos gateados por capability semántica `mod/uengagement:*`.
- **Diferido**: T5 feedback (FormTemplate/Feedback=0).

### S17 — Blindar mutaciones de flujo
- **Descubrimientos**: CRUD genérico podía saltarse validaciones de flujo (OfferingEnrollment/Attendance) + Activity create bypasseable (BUG).
- **Decisiones**: campo `blockGenericMutation` en ObjectContract.

### S18 — Ampliar surface engagement
- **Descubrimientos**: Service.create requiere solo `name` (LEARN).
- **Diferido**: Feedback (seed=0).

### S19 — Auto-doc por mod
- **Descubrimientos**: `get_documentation('mods')` informa lo que SÍ y lo que NO expone cada mod (6 no-expuestos en uengagement) (LEARN).

### S20 — Higiene de salida
- **Descubrimientos**: list/get fugaban shape DB (`_createdVia`, `_versionSourceId`, ecos {id}); el núcleo soportaba `fields` selectivo sin usarse (BUG). Criterio determinista de 3 niveles (LEARN).
- **Decisiones**: enfoque A+C (publicFields + pick + guía en instructions); conservar ids para encadenar. Descartada B (resolver FK→nombre, costo N+1).
- **Diferido**: T5 fields selectivo en eng_list_*; probes en vivo (rebuild+restart).

### S21 — layouts: vistas
- **Descubrimientos**: `up1_layen_layout` es PUBLIC_OBJECTS (sin capability, solo auth) (LEARN). Backend crea layouts vía createInstance genérico; dual-save a JSON solo si nombre empieza 'default_' (LEARN). Interpolación contextual ({{CURRENT_USER_ID}}, etc.) se aplica a filters server-side (LEARN).
- **Decisiones**: Opción B (tools view_*); Fase 1 = RecordList; default scope private.

### S22 — Fallback a vistas + consulta efímera
- **Descubrimientos**: ninguna tool filtra por currentStatusId (BUG). Una vista RecordList NO expresa agregaciones ('última versión por programa' no view-able; isLatest no poblado) (BUG). query_records sobre Activity no scopea Course (LEARN).
- **Decisiones**: D-S22-A = **ambas** (query_records efímero + oferta view_create, unidas por instructions).

### S23 — Contrato conversacional
- **Descubrimientos**: fuga reproducida en vivo (el LLM transcribió recordType/currentStatusId/nombres de tools) (BUG). Auditoría F1–F10: 10 fugas (LEARN). 3 clases de texto: input schemas / OUTPUT / prosa LLM (LEARN).
- **Decisiones**: D-S23-A = Opción 2 calibrada (responder primero, ofrecer+enseñar guardar vista). No reescribir los ~15 hints (gobernados por la directiva).

### §12.F — Impacto de model-v2 (2026-06-12)
- model-v2 eliminó el objeto Service dedicado (Service = Activity{recordType=Service}); Offering: serviceId→Service ahora activityLineId→ActivityLine; identidad de inscripción userId→studentId→Student.
- **Decisión**: S24 (fix) BLOQUEANTE para operar engagement; re-anclar el código a model-v2 **sin adaptar al drift del tenant**.

### S24 — Fix model-v2
- **Descubrimientos**: **CRÍTICO (BUG)**: schema UPU tiene `OfferingEnrollment` híbrido (userId Int NOT NULL + studentId String? nuevo) → escritura de enroll/attendance bloqueada por el tenant, no por el código. ActivityLine=18, Student=124, Activity:Service=15/Course=2 (LEARN). Attendance.status → enum inglés (LEARN).
- **Decisiones**: NO adaptar al userId viejo del drift; código correcto per model-v2.
- **Failed/Diferido**: validación de escritura enroll/attendance → bloqueada por drift; se valida al regenerar el baseline UPU.

### S25 — Engagement: ampliar surface
- **Descubrimientos**: drift de escritura acotado a TeachingAssignment/TeachingCoverage; Offering/Event/ActivityLine se crean sin drift (LEARN). Universo real ~22 objetos de engagement (NOTA). Instructor tiene `instructorCode` (LEARN).
- **Diferido**: T5 (teaching assignment, drift), T9 (asistencia masiva, drift+seed), T10 (feedback, seed=0), T11 (journal, seed=0). Cierre total requiere regenerar UPU + seed.

### S26 — Doc de dominio user-facing
- **Descubrimientos**: la auto-doc S19 estaba orientada a tools y desactualizada tras model-v2 → capa `domainDoc` (LEARN). Bug propio: instructions decía topic 'engagement' pero el id del pack es 'uengagement' (BUG, corregido).

### §12.R — Resolución semántica de inputs no-escalares (2026-06-18)
- Tres clases de input: escalares (ok), FK/referencia (get_field_options sin búsqueda por nombre, sin Term, sin AcademicProgram), enum/select (match exacto, sin etiqueta/sinónimo).
- **Decisión**: mecanismo híbrido `core/resolve.ts` (tools que aceptan lenguaje de negocio + tool resolutora explícita), enums con sinónimos en contrato. Descartadas: match difuso solo-etiqueta, dejar el mapeo al LLM.

### S27 — Probe inputs no-escalares CD
- **Descubrimientos**: AcademicProgram sin búsqueda por nombre (LEARN). Term BLOQUEADO en allowlist (BUG). get_field_options devuelve solo {value} en enums (BUG). ownerId FK polimórfico sin fk declarado (BUG). 'centro de apoyo' matchea 3 Institutions (LEARN). query_records devuelve 'institution #id' placeholder (BUG).
- **Diferido**: Term + AcademicProgram por nombre + get_field_options(query) → S28/S29.

### S28 — Capa de resolución `core/resolve.ts`
- **Descubrimientos**: `resolveEnum` agnóstico de contrato (values+labels planos) (LEARN). Tool resolutora vía get_field_options(query), no tool nueva (LEARN).
- **Diferido**: live E2E (rebuild+restart).

### S29 — Cableado de resolución + lookups
- **Descubrimientos**: Term confirmado leyendo el código de up1 (`objects/business/Base/term.json`, display por name único, FK idTermType) (LEARN). Cableado bifurcado CRUD genérico vs tools de dominio (LEARN). Residual SMOKE-AP-92137 en UPU (NOTA).
- **Decisiones**: cerrar núcleo verde, Term confirmado por código (no fabricar contrato a ciegas). AcademicProgram cubierto por resolveReference.
- **Failed**: S29.T2/T3 inicialmente bloqueadas (Term no confirmable desde el MCP) → desbloqueadas leyendo el código.

### S30 — Doc: resolución + autoría de mods
- **Descubrimientos**: `EXTENDING.md` stale (apuntaba a CURRICULUM_DESIGN_OBJECTS eliminado en S13.T4; 'conectar otro mod' eran 3 líneas) (BUG, hotfix).
- **Decisiones**: plegar la guía de autoría en S30 sin sesión nueva.

### S31 — Tools permission/context-aware
- **Descubrimientos**: el SDK expone `enable()/disable()/update()/remove()` + `sendToolListChanged()`; togglear `enabled` emite `tools/list_changed` (LEARN). Gate map conservador (eng_* con caps semánticas no mapeadas) (LEARN). Roles /system/UPU ~546 caps no aíslan; contraste real con estudiante-eng (16 caps) (NOTA).
- **Decisiones**: captura de handles vía patch de registerTool; gate map conservador (solo escritura CD con cap inequívoca).

### S32 — Consolidación + slimming instructions
- **Descubrimientos**: mover CONFIDENCIALIDAD solo al topic arriesga que el LLM no la aplique → condensar a 1 línea EN instructions + detalle en conventions (LEARN). El lever real de reducción es S31, no fusionar tools (LEARN).
- **Decisiones**: NO consolidar tools CRUD-ish ahora (pospuesto); instructions condensado + puntero a topic conventions.

### S33 — Namespacing del registry
- **Descubrimientos**: `registerContract` sobrescribía en silencio con misma clave objectType (BUG).
- **Decisiones**: guard de unicidad en registerContract (no namespacing por modId — evita churn en consumers).

### S34 — Reflejar mod cd (UPONE-1270): Curriculum tipado
- **Descubrimientos**: OM local ya tenía el mod synced (NOTA). Versiones pre-hook (v2/v3) tienen extensión null y se leen sin romper (LEARN). El MCP NO usa `updateCurriculumWithRecordType` (rutea por alias `rt__<RT>__curriculum`; la mutation nueva es UI-only) (LEARN). Las tools ya eran correctas; faltaba el backend (NOTA).
- **Decisiones**: D1 mantener cd_search_curricula lean; D2 mantener ruta por alias; D3 no declarar validatedMutations.update (doc-only).
- **Riesgo**: el MCP depende de que el mod esté synced al OM local.

## Riesgos y mitigaciones (§13)

| Riesgo | Mitigación |
|---|---|
| Bootstrap OTP requiere código del inbox | flujo interactivo submit_otp; online → OAuth |
| TTL 60s del token | refresh automático probado; reintento transparente |
| Reglas frontend-only → datos inconsistentes al escribir | capa de contratos (S4) prerequisito de escritura |
| Activación inconsistente de tools entre LLMs | descripciones ricas + instructions; reporte de compatibilidad |
| Custodia de credenciales (sesión Clerk) | cifrado; nunca secret key en cliente (P1) |
| up1 sin aislamiento por institución | documentado en LIMITATIONS; no prometer scope que up1 no da |
| ChangeLog casi vacío + depende de n8n | pipeline parcialmente funcional; documentar en LIMITATIONS |

## Pendientes vivos al cierre de la migración

Migrados al `## Backlog` de TICKET-080 (ver el ticket): S9 (hospedado), S8.V1 (install GUI), S25 T5/T9–T11 (drift/seed), escritura engagement (drift UPU), live E2E dev-pending (S20/S21/S22/S23/Term — rebuild+restart+re-OTP).
