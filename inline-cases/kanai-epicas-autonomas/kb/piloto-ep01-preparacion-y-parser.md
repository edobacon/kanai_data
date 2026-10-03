# Piloto EP-01: preparación y hallazgo del planificador

Fecha: 2026-10-03. Caso de implementación: kanai-epicas-autonomas. Épica nativa de proyecto: taomangalam-ep-01. Esto registra la evaluación del producto; el trabajo de Tao permanece en sus tickets y épica nativa.

## Preparación verificada
Tras actualizar MCP, manifest full expone epic_list, epic_get y epic_operate. Se creó y evaluó EP-01 con TAO-181–188 (GH-59–66), rama existente epic/EP-01 y entrega a main; 8 historias, 30 puntos, hitos M1a/M1b/M2. Los 70 criterios originales de los tickets fueron preservados. Se guardó análisis inyectable en cada ticket, con documento agregado TAO-181-INV-analysis. No hay plan aprobado, baseline ni corrida iniciada.

TAO-180 sigue ejecutándose en feat/GH-58-hu-01-15-historia-auditoria. TAO-186 conserva spec aprobado y estado bloqueado: espera proveedor real HU-03a-08/GH-98 por decisión previa. El conjunto completo tiene dependencias externas de EP-02/03a/03b/15, entregables de Diseño y QA humana. No es todavía una cohorte autónoma continua. preflight sin capacidades/grants declarados devolvió preparation_required; no se fabricaron permisos. Teach/Skip deberá elegirse al iniciar pese a los valores skip existentes.

## Hallazgo reproducido: candidatos falsos y referencias incompletas
Pasos: epic_operate(create) con cuerpos canónicos TAO-181–188; epic_operate(plan); epic_get(taomangalam-ep-01).
Observado: 126 aristas inferidas; aparecen DEC-102, V-51, QA-01, EP-01 y HU-01 como dependencias externas por decidir. HU-01-17 se recorta a HU-01. GH-59 (referencia propia en el handoff) se resuelve a TAO-181 → TAO-181; ocurre con los ocho tickets.
Esperado: decisiones/vistas/casos QA y metadatos propios sean contexto; IDs HU completos resueltos mediante catálogo real a tickets/proveedores; auto-referencias excluidas. Aristas inferidas verdaderas requieren decisión humana y no son aprobadas por el agente.
Fuente: server/epics/planner.ts evaluate, regexp de menciones y resolución por aliases; epic_get del 2026-10-03. El orden provisional existe porque las aristas inferidas no están aceptadas; aprobarlas en masa produciría ciclos artificiales.
Impacto: exceso de decisiones y falsas dependencias externas; riesgo de ocultar dependencias reales o bloquear la aprobación. Corregir y revisar antes de iniciar el piloto. No se alteró F11 cerrada ni se declaró resuelto este hallazgo.

## Métricas
Baseline debe ser posterior a DEC-239 (gate liviano por ticket ya existente), misma cohorte y definiciones. Aún sin valores numéricos; no atribuir ahorro a Kanai. Capturar ci_ms/ci_runs/review_ms/tokens/cost/rework/defects con fuentes y claves idempotentes, eventos de fases/pausas/fallos/recuperaciones, y defectos 14 días desde merge. El piloto real y observación siguen pendientes.
