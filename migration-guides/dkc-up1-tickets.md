# Plan DKC -> Kanai por ticket - up1
 
Fuente DKC: commit e15fa24377cf1a0768cc10ad567c110b3ac2042e. Tickets canónicos: 137. Sidecars Markdown: 2.
 
Cada fila sigue: hash -> parseo -> relaciones -> schema/FK -> smoke -> resultado. Los estados provisionales requieren revisión antes de aceptar la migración.
 
| ID | Archivo | Título | Estado DKC | Estado Kanai | Work type | External | Sidecars | Disposición |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| TICKET-081 | projects/up1/tickets/TICKET-081.md | Malla — Ajustes de modelo base del plan (progression + isCurrent) | closed | closed | implement | UPONE-1344 | TICKET-081.teach | direct |
| TICKET-082 | projects/up1/tickets/TICKET-082.md | Malla — Objetos planEntry + requirementCategory | closed | closed | implement | UPONE-1345 | TICKET-082.draft, TICKET-082.teach | direct |
| TICKET-083 | projects/up1/tickets/TICKET-083.md | Malla — Objeto requirement (Composite, 3 RecordTypes) + bloque electivo | closed | closed | implement | UPONE-1346 | TICKET-083.draft, TICKET-083.teach | direct |
| TICKET-084 | projects/up1/tickets/TICKET-084.md | Malla — Registro del mod + cobertura MCP de los objetos | closed | closed | implement | UPONE-1347 | TICKET-084.teach | direct |
| TICKET-085 | projects/up1/tickets/TICKET-085.md | Malla — Ver, modo edición y resumen | closed | closed | implement | UPONE-1348 | TICKET-085.draft, TICKET-085.teach | direct |
| TICKET-086 | projects/up1/tickets/TICKET-086.md | Malla — Agregar y editar asignaturas (obligatorias + electivas) | closed | closed | implement | UPONE-1349 | TICKET-086.draft, TICKET-086.teach | direct |
| TICKET-087 | projects/up1/tickets/TICKET-087.md | Malla — Pestaña "Líneas de formación" (CRUD + integración) | closed | closed | implement | UPONE-1350 | TICKET-087.teach | direct |
| TICKET-088 | projects/up1/tickets/TICKET-088.md | Malla — Filtros + interacciones avanzadas | closed | closed | implement | UPONE-1351 | TICKET-088.draft, TICKET-088.smoke.md, TICKET-088.teach | direct |
| TICKET-089 | projects/up1/tickets/TICKET-089.md | Malla — Validación restrictiva de requisitos en planes publicados | closed | closed | implement | UPONE-1352 | TICKET-089.teach | direct |
| TICKET-090 | projects/up1/tickets/TICKET-090.md | MCP: alinear `progression` a enum {Sequential, Modular} en el contrato de Curriculum | closed | closed | tactic | null | — | direct |
| TICKET-093 | projects/up1/tickets/TICKET-093.md | Malla: embeber planEntry/requirementCategory como hijos del Plan de estudios | closed | closed | fix | UPONE-1345 | TICKET-093.screenshots, TICKET-093.teach | direct |
| TICKET-094 | projects/up1/tickets/TICKET-094.md | Pickers visuales de color e ícono para líneas de formación (componentes custom) | closed | closed | implement | UPONE-1345 | TICKET-094.draft, TICKET-094.teach | direct |
| TICKET-095 | projects/up1/tickets/TICKET-095.md | Tabs malla/líneas visibles solo en Curriculum recordType=Plan (no en Minor) | closed | closed | tactic | UPONE-1345 | — | direct |
| TICKET-096 | projects/up1/tickets/TICKET-096.md | Fix selección visible/hidratación de ColorPicker e IconPicker + curaduría de íconos educacionales | closed | closed | fix | UPONE-1345 | TICKET-096.teach | direct |
| TICKET-097 | projects/up1/tickets/TICKET-097.md | Fix hidratación de pickers al abrir edición + render visual read-only del color/ícono en el view | closed | closed | fix | UPONE-1345 | TICKET-097.teach | direct |
| TICKET-098 | projects/up1/tickets/TICKET-098.md | Malla — Crear bloque electivo desde edición (paridad con alta) + fix doble "+" en botón de agregar asignatura | closed | closed | fix | UPONE-1349 | TICKET-098.teach | direct |
| TICKET-099 | projects/up1/tickets/TICKET-099.md | Malla — Paridad de la malla curricular desde el MCP (cobertura Fase A+B) | closed | closed | implement | UPONE-1267 | TICKET-099.teach | direct |
| TICKET-100 | projects/up1/tickets/TICKET-100.md | Malla — Documentación del mod + revisión de calidad de código (CurriculumMesh, MC-02..09) | closed | closed | improvement | UPONE-1351 | TICKET-100.teach | direct |
| TICKET-101 | projects/up1/tickets/TICKET-101.md | SP7 · P1 — Requisitos de asignatura (editor visual Y/O + alerta de impacto) | closed | closed | implement | UPONE-1378 | TICKET-101.draft, TICKET-101.teach | direct |
| TICKET-102 | projects/up1/tickets/TICKET-102.md | SP6 · P3 — Historial de cambios en el DataLog de core (retirar ChangeLog) | closed | closed | implement | UPONE-1380 | TICKET-102.screenshots, TICKET-102.teach | direct |
| TICKET-103 | projects/up1/tickets/TICKET-103.md | SP6 · P4 — Flujo de trabajo con el motor de transiciones de core | closed | closed | implement | UPONE-1381 | TICKET-103.teach | direct |
| TICKET-104 | projects/up1/tickets/TICKET-104.md | SP6 · P5 — Eliminación: hard delete en cascada sin huérfanos | closed | closed | implement | UPONE-1382 | TICKET-104.teach | direct |
| TICKET-105 | projects/up1/tickets/TICKET-105.md | SP7 · Validación no-negativos en campos numéricos del mod (mejoras detectadas de 1378) | closed | closed | implement | UPONE-1378 | TICKET-105.teach | direct |
| TICKET-106 | projects/up1/tickets/TICKET-106.md | Selector de transiciones de estado para Activity (reemplazar badge read-only) | closed | closed | improvement | UPONE-1381-P4 | — | direct |
| TICKET-107 | projects/up1/tickets/TICKET-107.md | Correcciones de review de UPONE-1382: false-Restrict por casing + hardening del motor de delete cascade | closed | closed | fix | null | TICKET-107.screenshots, TICKET-107.teach | direct |
| TICKET-108 | projects/up1/tickets/TICKET-108.md | Validacion pre-push local obligatoria en curriculum-design (etapa 1: git hooks) | closed | closed | implement | UPONE-1445 | TICKET-108.teach | direct |
| TICKET-109 | projects/up1/tickets/TICKET-109.md | Follow-up UPONE-1382: hallazgos de review Dredd sobre el motor de borrado en cascada | closed | closed | fix | UPONE-1382 | TICKET-109.teach | direct |
| TICKET-110 | projects/up1/tickets/TICKET-110.md | Habilitar eslint y sanear el baseline de typecheck del mod curriculum-design | closed | closed | fix | UPONE-1446 | — | direct |
| TICKET-111 | projects/up1/tickets/TICKET-111.md | SP6 - Versionamiento de plan de estudio | closed | closed | implement | UPONE-1450 | TICKET-111.teach | direct |
| TICKET-112 | projects/up1/tickets/TICKET-112.md | SP6 - Acceso a mantenedor de Referencias bibliograficas | closed | closed | implement | UPONE-1451 | TICKET-112.draft, TICKET-112.teach | direct |
| TICKET-113 | projects/up1/tickets/TICKET-113.md | SP6 - Carga de datos dummy actualizada (seed) | closed | closed | implement | UPONE-1456 | TICKET-113.draft, TICKET-113.teach | direct |
| TICKET-114 | projects/up1/tickets/TICKET-114.md | SP7 - Retiro del subsistema workflow relacional (curriculum-design) | closed | closed | refactor | UPONE-1459 | TICKET-114.teach | direct |
| TICKET-115 | projects/up1/tickets/TICKET-115.md | Fix import faltante `replaceRecordPlaceholders` en RecordDetail (regresion UPONE-1353) | closed | closed | tactic | null | — | direct |
| TICKET-116 | projects/up1/tickets/TICKET-116.md | Fix atribucion del faltante en el modal de prerrequisitos + label/timing del advisory del seed | closed | closed | fix | UPONE-1378 | — | direct |
| TICKET-117 | projects/up1/tickets/TICKET-117.md | Core \\| El borrado por RecordType no cascadea hijos ni respeta soft-delete (huerfanos + borrado fisico) | closed | closed | fix | UPONE-1479 | TICKET-117.teach | direct |
| TICKET-118 | projects/up1/tickets/TICKET-118.md | Mods \\| Wiring de alias del boundary en el toolchain standalone (tests/typecheck/storybook) tras la cascada tooling+boundary | closed | closed | fix | UPONE-1529 | — | direct |
| TICKET-119 | projects/up1/tickets/TICKET-119.md | Configuracion de plan de estudio modular | closed | closed | fix | UPONE-1538 | TICKET-119.teach | direct |
| TICKET-120 | projects/up1/tickets/TICKET-120.md | Malla curricular para plan de estudio modular | closed | closed | implement | UPONE-1539 | TICKET-120.draft, TICKET-120.teach | direct |
| TICKET-121 | projects/up1/tickets/TICKET-121.md | Sanear el seed de `progression` del Plan (valor invalido `Credits` → `Sequential`) | closed | closed | fix | UPONE-1538 | TICKET-121.teach | direct |
| TICKET-122 | projects/up1/tickets/TICKET-122.md | Backend: el borrado en bloque no debe contar la proyeccion RT propia como referencia externa | closed | closed | fix | UPONE-1557 | TICKET-122.teach | direct |
| TICKET-123 | projects/up1/tickets/TICKET-123.md | Frontend: un bloqueo legitimo de custom delete debe mostrarse como aviso, no como error de carga full-view | closed | closed | fix | UPONE-1557 | TICKET-123.teach | direct |
| TICKET-124 | projects/up1/tickets/TICKET-124.md | Follow-up UPONE-1539: alta en lote cuenta co-agregados en prereqs + opcion "ver solo lo seleccionado" en el picker | closed | closed | improvement | — | TICKET-124.teach | direct |
| TICKET-125 | projects/up1/tickets/TICKET-125.md | Follow-up UPONE-1539 (TICKET-124): créditos reales en el co-add del alta en lote | closed | closed | fix | — | TICKET-125.teach | direct |
| TICKET-126 | projects/up1/tickets/TICKET-126.md | Follow-up UPONE-1539: doc completa del componente CurriculumMesh + emision de evento en resolvers batch + limpieza de comentarios | closed | closed | improvement | null | — | direct |
| TICKET-127 | projects/up1/tickets/TICKET-127.md | Restituir auditoria DataLog en resolvers batch de planEntry | closed | closed | fix | null | — | direct |
| TICKET-128 | projects/up1/tickets/TICKET-128.md | Layout core: la carga inicial de RecordDetail no debe marcar el formulario como "con cambios" | closed | closed | fix | UPONE-1540 | TICKET-128.teach | direct |
| TICKET-129 | projects/up1/tickets/TICKET-129.md | Backend: los previews de impacto de borrado deben resolver el alias RecordType a objeto base | closed | closed | fix | UPONE-1608 | TICKET-129.teach | direct |
| TICKET-130 | projects/up1/tickets/TICKET-130.md | Frontend: un bloqueo legitimo del borrado via deleteBulkInstances debe mostrarse como aviso, no como error de carga full-view | closed | closed | fix | UPONE-1557 | TICKET-130.teach | direct |
| TICKET-131 | projects/up1/tickets/TICKET-131.md | Backend: la maquina de estados debe resolver el alias RecordType a la PK base (`getValidTransitions` + `previewBulkTransition`) | closed | closed | fix | UPONE-1608 | TICKET-131.teach | direct |
| TICKET-132 | projects/up1/tickets/TICKET-132.md | Core · Nav · Nombre de vista declarable por aplicación | closed | closed | implement | UPONE-1645 | TICKET-132.teach | direct |
| TICKET-133 | projects/up1/tickets/TICKET-133.md | Curriculum Design &amp; Curriculum Mapping · Implementar lógica de Roles internos | design-refactor | open | refactor | UPONE-1615 | TICKET-133.teach | preserve legacy status + review |
| TICKET-134 | projects/up1/tickets/TICKET-134.md | Curriculum Design · Implementación de InstructionalComponent | closed | closed | implement | UPONE-1619 | TICKET-134.draft, TICKET-134.teach | direct |
| TICKET-135 | projects/up1/tickets/TICKET-135.md | Curriculum Design · Ajustar seed de requisitos para consistencia con la capacidad del sistema | design-refactor | open | refactor | UPONE-1541 | TICKET-135.teach | preserve legacy status + review |
| TICKET-136 | projects/up1/tickets/TICKET-136.md | Curriculum Design · Ajustar orden de los menús | in_progress | in_progress | improvement | UPONE-1616 | TICKET-136.teach | direct |
| TICKET-137 | projects/up1/tickets/TICKET-137.md | Curriculum Mapping · MCP sync | design-feature | open | implement | UPONE-1530 | TICKET-137.teach | preserve legacy status + review |
| TICKET-138 | projects/up1/tickets/TICKET-138.md | Testeabilidad automatizada E2E de Elric (MCP up1) | closed | closed | implement | — | — | direct |
| TICKET-139 | projects/up1/tickets/TICKET-139.md | NavTab.labelKey falta en object-manager rompe el sidebar de apps (gap de sync de UPONE-1645) | closed | closed | fix | UPONE-1707 | TICKET-139.teach | direct |
| TICKET-140 | projects/up1/tickets/TICKET-140.md | Core · Nav · view-picker no traduce nombres de vista de objetos no activos (i18n por contexto) | design-fix | open | fix | UPONE-1716 | TICKET-140.teach | preserve legacy status + review |
| ticket-001 | projects/up1/tickets/ticket-001.md | Crear mod study-notes end-to-end como POC del pipeline | closed | closed | implement | — | — | direct |
| ticket-002 | projects/up1/tickets/ticket-002.md | Crear mod curriculum-mapping como POC con tabs y vista custom | closed | closed | implement | null | — | direct |
| ticket-003 | projects/up1/tickets/ticket-003.md | Agregar navegacion con dropdowns por objeto al mod curriculum-mapping | closed | closed | implement | null | — | direct |
| ticket-004 | projects/up1/tickets/ticket-004.md | Perfil de Egreso con RBAC diferenciado Consultor/Colaborador | closed | closed | implement | null | — | direct |
| ticket-005 | projects/up1/tickets/ticket-005.md | Explorar y disenar app de matrices de competencias basada en suite-front assessment | closed | closed | implement | null | — | direct |
| ticket-006 | projects/up1/tickets/ticket-006.md | Configuracion de objetos del agregado Programa de asignatura | closed | closed | implement | UPONE-1033 | — | direct |
| ticket-007 | projects/up1/tickets/ticket-007.md | Vista general listado de Programa de asignatura | closed | closed | implement | UPONE-1034 | — | direct |
| ticket-009 | projects/up1/tickets/ticket-009.md | Vista de detalle de Programa de asignatura con secciones configurables | closed | closed | implement | UPONE-1035 | — | direct |
| ticket-010 | projects/up1/tickets/ticket-010.md | Mejoras de calidad de codigo en mod curriculum-design | closed | closed | refactor | UPONE-1038 | — | direct |
| ticket-011 | projects/up1/tickets/ticket-011.md | Plan de pruebas baseline + QA automatizado de curriculum-design SP1 | closed | closed | improvement | UPONE-1038 | ticket-011.screenshots | direct |
| ticket-012 | projects/up1/tickets/ticket-012.md | Calidad post-baseline CompositeSectionTree+RichTextRenderer: compliance RULE-mods, gaps de coverage y deuda residual T-010 | closed | closed | refactor | UPONE-1038 | ticket-012.teach | direct |
| ticket-013 | projects/up1/tickets/ticket-013.md | ESLint config para mod curriculum-design + fix de hallazgos accionables | closed | closed | improvement | UPONE-1038 | — | direct |
| ticket-014 | projects/up1/tickets/ticket-014.md | Resolver 84 errores TS en mod curriculum-design (defineElement opaque + paths sin tsconfig) | closed | closed | fix | UPONE-1038 | — | direct |
| ticket-015 | projects/up1/tickets/ticket-015.md | Completar configuracion de selects en RecordTypes del mod (modo entrega, Bloom, bibliografia, formato, contenidos, evaluacion) | closed | closed | fix | UPONE-1038 | ticket-015.escalation, ticket-015.teach | direct |
| ticket-016 | projects/up1/tickets/ticket-016.md | Evaluar como agregar Storybook al mod curriculum-design para documentar custom components | closed | closed | improvement | UPONE-1038 | ticket-016.screenshots, ticket-016.teach | direct |
| ticket-017 | projects/up1/tickets/ticket-017.md | Habilitar crear primer EvaluationComponent cuando el composite-section-tree esta vacio en Programa de asignatura | closed | closed | fix | UPONE-1038 | ticket-017.teach | direct |
| ticket-018 | projects/up1/tickets/ticket-018.md | HU3 — Modelo de objetos workflow + seed UPU | closed | closed | implement | UPONE-1099 | ticket-018.draft, ticket-018.screenshots, ticket-018.teach | direct |
| ticket-019 | projects/up1/tickets/ticket-019.md | HU4 — Rename academicActivity → activity y conectar a workflow | closed | closed | refactor | UPONE-1100 | ticket-019.draft, ticket-019.teach | direct |
| ticket-020 | projects/up1/tickets/ticket-020.md | HU2 — changeLog para activity, curricularSection y curricularLink | closed | closed | implement | UPONE-1098 | ticket-020.draft, ticket-020.screenshots | direct |
| ticket-021 | projects/up1/tickets/ticket-021.md | Audit WCAG 2.1 AA de componentes visibles del mod curriculum-design | closed | closed | explore | UPONE-1038 | ticket-021.teach | direct |
| ticket-022 | projects/up1/tickets/ticket-022.md | Implementar buenas practicas WCAG 2.1 AA en componentes visibles del mod curriculum-design | closed | closed | improvement | UPONE-1038 | ticket-022.teach | direct |
| ticket-023 | projects/up1/tickets/ticket-023.md | Investigar hydration mismatch SSR en CompositeSectionTreeElement | closed | closed | fix | UPONE-1038 | ticket-023.screenshots | direct |
| ticket-024 | projects/up1/tickets/ticket-024.md | HU3 followup — corregir flujos del seed UPU + documentar adaptaciones del modelo en Confluence | closed | closed | fix | UPONE-1099 | — | direct |
| ticket-025 | projects/up1/tickets/ticket-025.md | HU4 followup — completar rename academicActivity → activity + visualizacion del estado en UI (badge read-only) | closed | closed | fix | UPONE-1100 | — | direct |
| ticket-026 | projects/up1/tickets/ticket-026.md | HU4 followup B — fix stubs de tests del mod post-rename + workflow activate | closed | closed | fix | null | — | direct |
| ticket-027 | projects/up1/tickets/ticket-027.md | HU4 followup — ActivityStatusBadge contrast WCAG AA en 9 estados × 2 themes + a11y aria-prohibited-attr | closed | closed | improvement | UPONE-1100 | — | direct |
| ticket-028 | projects/up1/tickets/ticket-028.md | Fix casing PascalCase de objects del workflow + activity (rebase intent de hotfix/casing sobre develop) | closed | closed | fix | null | — | direct |
| ticket-029 | projects/up1/tickets/ticket-029.md | Sacar el campo `comment` del object changeLog + columnas "Comentario" en vistas del historial de cambios | closed | closed | improvement | UPONE-1098 | — | direct |
| ticket-030 | projects/up1/tickets/ticket-030.md | Fix casing inconsistente en la cadena de auditoria (changeLog + workflowTransitionHistory + flow + filters tabs Historial) post-TICKET-028 | closed | closed | fix | UPONE-1100 | — | direct |
| ticket-031 | projects/up1/tickets/ticket-031.md | Auditar y normalizar a PascalCase los objetos del mod curriculum-design (RULE-platform-006) | closed | closed | refactor | UPONE-1100 | — | direct |
| ticket-032 | projects/up1/tickets/ticket-032.md | Tech debt cleanup curriculum-design post UPONE-1098/1099/1100 (mod-only) | closed | closed | improvement | null | ticket-032.teach | direct |
| ticket-033 | projects/up1/tickets/ticket-033.md | Track 0 Core \\| Prerequisitos de plataforma para clonacion/versionamiento | closed | closed | implement | UPONE-1219 | — | direct |
| ticket-034 | projects/up1/tickets/ticket-034.md | Track 0 CD \\| Cambios en el modelo del mod para versionar Activity | closed | closed | implement | UPONE-1220 | ticket-034.teach | direct |
| ticket-035 | projects/up1/tickets/ticket-035.md | HU-9 \\| Agregar campo versionSourceId en changeLog.json (rework aplicado) | closed | closed | implement | UPONE-1215 | — | direct |
| ticket-036 | projects/up1/tickets/ticket-036.md | HU-1 \\| prefillFrom param en createInstance (Ladrillo 1 — primitivo transversal de clonacion) | closed | closed | implement | UPONE-1207 | — | direct |
| ticket-037 | projects/up1/tickets/ticket-037.md | HU-2 \\| Config prefillFrom en JSON del object (codegen valida + persiste al registry) | closed | closed | implement | UPONE-1208 | — | direct |
| ticket-038 | projects/up1/tickets/ticket-038.md | HU-4 \\| Config versioning en JSON del object (codegen valida + persiste al registry) | closed | closed | implement | UPONE-1210 | ticket-038.teach | direct |
| ticket-039 | projects/up1/tickets/ticket-039.md | HU-3 \\| asNewVersion param en createInstance (Ladrillo 2 — capa de versionamiento sobre prefill) | closed | closed | implement | UPONE-1209 | — | direct |
| ticket-040 | projects/up1/tickets/ticket-040.md | HU-5 \\| Query getVersionChain (Ladrillo 3) | closed | closed | implement | UPONE-1211 | — | direct |
| ticket-041 | projects/up1/tickets/ticket-041.md | HU-6 \\| createdVia metadata en eventos + flow n8n persiste versionSourceId | closed | closed | implement | UPONE-1212 | — | direct |
| ticket-042 | projects/up1/tickets/ticket-042.md | HU-7 \\| Row action type:create (Ladrillo 4 — primitivo declarativo transversal de layout) | closed | closed | implement | UPONE-1213 | ticket-042.teach | direct |
| ticket-043 | projects/up1/tickets/ticket-043.md | HU-8 \\| Adopción de versionamiento en Activity (8a config + B2 · 8b hook · 8c seed + B3) | closed | closed | implement | UPONE-1214 | — | direct |
| ticket-044 | projects/up1/tickets/ticket-044.md | HU-10 \\| Row action "Crear nueva versión" en RecordList de Activity | closed | closed | implement | UPONE-1216 | — | direct |
| ticket-045 | projects/up1/tickets/ticket-045.md | HU-11 \\| Sección "Versiones" en RecordDetail de Activity (discovery interno + implementación) | closed | closed | implement | UPONE-1217 | — | direct |
| ticket-046 | projects/up1/tickets/ticket-046.md | HU-12 \\| Documentación de la capacidad para futuros adoptantes | closed | closed | implement | UPONE-1218 | ticket-046.teach | direct |
| ticket-047 | projects/up1/tickets/ticket-047.md | Validar e2e la rama deepClone de relacion Prisma directa (directChildren) — autocontenido | closed | closed | improvement | null | — | direct |
| ticket-048 | projects/up1/tickets/ticket-048.md | Validar e2e el FLUJO COMPLETO de clonacion (polimorfico + remap hook + UI) — PARKEADO | closed | closed | improvement | null | — | direct |
| ticket-049 | projects/up1/tickets/ticket-049.md | Derived genérico en codegen — remap declarativo de FKs internas entre hijos clonados (polymorphicChildrenDerived) | closed | closed | implement | UPONE-1219 | — | direct |
| ticket-050 | projects/up1/tickets/ticket-050.md | RBAC por capability para versionar y clonar — declarable por objeto en el mod (estilo up1) | closed | closed | implement | UPONE-1216 | — | direct |
| ticket-051 | projects/up1/tickets/ticket-051.md | Polish de plataforma de clonación/versionamiento (follow-ups core de HU-10) | closed | closed | improvement | UPONE-1219 | ticket-051.teach | direct |
| ticket-052 | projects/up1/tickets/ticket-052.md | Fix prefillFrom.exclude en CurricularSection (sourceSectionId → sourceId) | closed | closed | tactic | UPONE-1216 | — | direct |
| ticket-053 | projects/up1/tickets/ticket-053.md | Enforcement de unicidad scoped también en updateInstance (Gap 1 de TICKET-051) | closed | closed | tactic | UPONE-1219 | — | direct |
| ticket-054 | projects/up1/tickets/ticket-054.md | El enforcement de unicidad scoped (uniqueScopedBy) NO rechaza duplicados al clonar/editar Modalidad | closed | closed | fix | UPONE-1219 | — | direct |
| ticket-055 | projects/up1/tickets/ticket-055.md | Registro de auditoría de calidad de código — Sprint SP3 (versionado/clonado de objetos curriculares) | closed | closed | explore | null | — | direct |
| ticket-056 | projects/up1/tickets/ticket-056.md | Calidad de código SP3 — quick wins, type-safety en layout y guard de atomicidad RT (promoción de TICKET-055) | closed | closed | improvement | UPONE-1219 | — | direct |
| ticket-057 | projects/up1/tickets/ticket-057.md | Completar y ampliar documentación de adopción — clonado y versionado | closed | closed | improvement | UPONE-1218 | — | direct |
| ticket-058 | projects/up1/tickets/ticket-058.md | Crear Activity desde cero asigna el workflow por defecto del scope (createInstance genérico) | closed | closed | tactic | UPONE-1219 | — | direct |
| ticket-059 | projects/up1/tickets/ticket-059.md | Curriculum Design \\| Programa académico \\| Configuración de vista y objetos | closed | closed | implement | UPONE-1260 | — | direct |
| ticket-060 | projects/up1/tickets/ticket-060.md | M2: enforzar server-side la suma ponderada de evaluaciones | closed | closed | improvement | UPONE-1035 | — | direct |
| ticket-061 | projects/up1/tickets/ticket-061.md | MCP-readiness curriculum-design — enforcement server-side de reglas de integridad | closed | closed | improvement | UPONE-1260 | ticket-061.teach | direct |
| ticket-062 | projects/up1/tickets/ticket-062.md | academicProgram · Clonar | closed | closed | implement | UPONE-1271 | — | direct |
| ticket-063 | projects/up1/tickets/ticket-063.md | curriculum (Plan + Minor) · vista y objetos | closed | closed | implement | UPONE-1268 | — | direct |
| ticket-064 | projects/up1/tickets/ticket-064.md | Sílabo (Offering tipo `Syllabus`) · vista y objetos | closed | closed | implement | UPONE-1269 | — | direct |
| ticket-065 | projects/up1/tickets/ticket-065.md | curriculum (Plan) · Clonar y versionar (superficial v1) | closed | closed | implement | UPONE-1270 | — | direct |
| ticket-066 | projects/up1/tickets/ticket-066.md | academicProgram · create layout — relationDisplayFields para FK (fix clone) | closed | closed | tactic | UPONE-1271 | — | direct |
| ticket-067 | projects/up1/tickets/ticket-067.md | RecordDetail.handleSubmit envía campos virtuales (display-siblings/relaciones) al createInstance → Prisma los rechaza | closed | closed | fix | UPONE-1271 | — | direct |
| ticket-068 | projects/up1/tickets/ticket-068.md | Curriculum v2 en UPU vía reform del objeto del mod + reseed (dev reset) | closed | closed | improvement | null | — | direct |
| ticket-069 | projects/up1/tickets/ticket-069.md | Fix: picker de dueño polimórfico (ownerType/ownerId) de Curriculum no rellena/resetea/resuelve label | closed | closed | fix | null | — | direct |
| ticket-070 | projects/up1/tickets/ticket-070.md | Fix: crear Plan (Curriculum) desde la UI falla — `createInstance` envía los campos del RecordType a la tabla base | closed | closed | fix | null | — | direct |
| ticket-071 | projects/up1/tickets/ticket-071.md | Retirar el campo `externalId` de Curriculum (Plan) y AcademicProgram | closed | closed | tactic | UPONE-1260 | — | direct |
| ticket-072 | projects/up1/tickets/ticket-072.md | Implement: primitivo `prefilledModal` + `deepClone` en el clone del layout-engine (opción A de D5) | closed | closed | implement | UPONE-1270 | — | direct |
| ticket-073 | projects/up1/tickets/ticket-073.md | Corregir el mensaje de unicidad por linaje sin tocar core (mod-only, alineación con pattern de core) | closed | closed | improvement | UPONE-1270 | — | direct |
| ticket-074 | projects/up1/tickets/ticket-074.md | Implement: versionar objetos versionables SIN workflow — hacer opcional el chequeo de workflow en `prepareVersionData` (core) | closed | closed | implement | UPONE-1270 | — | direct |
| ticket-075 | projects/up1/tickets/ticket-075.md | Detalle y clonado de Curriculum no muestran los campos del RecordType (extensión rt__Plan__curriculum) | closed | closed | fix | UPONE-1270 | — | direct |
| ticket-076 | projects/up1/tickets/ticket-076.md | Adaptar curriculum-design al OrgUnit reducido de engagement (org spine canónico) | closed | closed | fix | UPONE-1261 | — | direct |
| ticket-077 | projects/up1/tickets/ticket-077.md | Re-resolver mod-only el casteo de campos (FK + tipos) al guardar/clonar/versionar Curriculum, contra el OrgUnit/Institution reducido | closed | closed | fix | null | — | direct |
| ticket-078 | projects/up1/tickets/ticket-078.md | Resolver los 6 tenant Base leftovers restantes en UPU (campus/career/course/faculty/modality/supportCenter) — follow-up de TICKET-077 | closed | closed | fix | null | — | direct |
| ticket-079 | projects/up1/tickets/ticket-079.md | Edicion de Curriculum rota por updatedById (PLAT-12) — schema local stale tras merge de develop | closed | closed | tactic | UPONE-1261 | — | direct |
| ticket-080 | projects/up1/tickets/ticket-080.md | Migrar el plan de ejecución del MCP de up1 a artefactos DKC y retirar el md como fuente de verdad | closed | closed | improvement | null | — | direct |
 
## Sidecars fuera de matriz
- TICKET-088.smoke.md: clasificar por contenido; no importar automáticamente como ticket.
- teach-ticket-001.md: clasificar por contenido; no importar automáticamente como ticket.
 
## Aceptación
- No se descartan tickets por estados legacy.
- Todos los sidecars tienen destino explícito.
- Todos los hashes y relaciones quedan en el manifiesto.
 
