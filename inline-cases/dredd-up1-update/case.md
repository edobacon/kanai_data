# Caso inline: Dredd up1 1.1: evolución autónoma y métricas compartibles

> Vista generada por Kanai desde case.yaml, el KB y el plan. No la edites a mano.

**Objetivo:** Preparar e implementar cuando se autorice una única entrega Dredd up1 1.1 con todas las mejoras acordadas: rigor y operación segura, auditoría de configuración, concurrencia adaptativa, seguimiento local y métricas exportables a Markdown. Funcionar en Claude Code macOS, Linux y Windows; generar documentación operativa y referencia 1.1, preservar íntegra la v1 y documentar comparación entre versiones. Ahora registrar y validar el plan; no ejecutar aún cambios de skill/scripts ni publicar.
**Tags:** projects: up1 · repos: up1 · branches: feat/dredd-update · labels: dredd, tooling, autonomo, metricas, investigacion
**Etapa:** ejecucion

## Falta

- Nada que bloquee.

## Avisos

- Sin avisos.

## Repos

| Repo | Ruta local | Rama base | Ramas de trabajo | Para qué |
|---|---|---|---|---|
| up1 | configurada | develop (existe) | feat/dredd-update | Repositorio objetivo. Cambios futuros limitados a Dredd, sus scripts, pruebas y documentación; no funcionalidad del producto ni módulos independientes. |

## Ambientes

- Investigación local: macOS; revisión de fuentes y documentos, sin ejecutar PRs ni modificar hooks globales.
- Validación aislada propuesta: Fixtures y repos git temporales para merge, delta, guard, sesiones y métricas; ejecución real obligatoria en Claude Code macOS, Linux y Windows antes de aceptar la única entrega.
- Claude Code macOS: Plataforma obligatoria para la única entrega final. Hooks, progreso, helper, métricas, concurrencia y seguimiento.
- Claude Code Linux: Plataforma obligatoria para la única entrega final; validación real pendiente.
- Claude Code Windows: Plataforma obligatoria desde la primera entrega. No asumir fcntl, Bash, chmod, paths POSIX ni ejecutables .bin Unix; validación real pendiente.

## Personas

- Solicitante: Define alcance, confirma decisiones pendientes y autoriza acciones externas.
- Agente de análisis: Investiga evidencia, mantiene contexto del caso y prepara decisiones; no implementa aún.

## Enlaces

- [Repositorio up1](https://bitbucket.org/uplanner/up1)

## Notas

- Autorización actual: documentar y profundizar contexto. No cambiar skill/scripts todavía; no push, publicación ni cambios de hooks globales.
- Dredd de up1 debe tener contrato propio, sin dependencias ni referencias a Kanai, kn-dredd, arbitrer o DKC en sus archivos. Kanai se usa sólo para gestionar este caso.
- Documentación base completada: docs/reference/dredd-v1.md y docs/guides/dredd-operacion-v1.md, commit 348ea29; skill/scripts sin cambios frente a develop@374db48.
- Existen cambios locales ajenos al caso: package-lock.json, coverage y carpetas de módulos/worktrees. No descartarlos ni incluirlos en commits del caso.
- Métricas, si se implementan, requieren comando para exportar reporte Markdown compartible; no son métricas del caso Kanai.
- Decisión explícita del usuario: Claude Code en macOS, Linux y Windows desde la primera entrega.
- Decisión explícita del usuario: todas las mejoras en una sola entrega final. Las fases internas ordenan el trabajo, no posponen capacidades a una segunda entrega.
- Política del jurado/costo y continuación del modo local sin Jira: preguntas abiertas, no decisiones confirmadas.
- La nueva versión y sus documentos se nombran 1.1. Preservar documentación v1 en el estado 348ea29 para comparación.
- Plan estructurado compatible con el esquema y modelo de lectura de la vista; todas las fases inician pendientes, con decisiones abiertas en la fase inicial.
- Crear documentos 1.1 y comparación v1 vs 1.1; no actualizar en sitio los dos documentos históricos v1.

## KB del caso

| Documento | Tipo | Título | Resumen |
|---|---|---|---|
| contexto-y-alcance.md | analisis | Dredd up1: contexto, alcance y decisiones de diseño | Entrega única para Claude Code en macOS, Linux y Windows; arquitectura autónoma, adaptaciones necesarias, métricas Markdown y criterios de aceptación propuestos. |
| dredd-capacidades-v1.md | referencia | Dredd up1: capacidades actuales v1 | Línea base documental del comportamiento actual; no acredita cambios de implementación. |
| dredd-operacion-v1.md | referencia | Dredd up1: funcionamiento operativo actual | Flujos, fases, configuración, scripts y divergencias observadas; referencia para contrastar mejoras. |
| investigacion-configuracion-local.md | analisis | Investigación local y perfil propuesto para Dredd up1 1.1 | Perfil adaptativo observado, recomendaciones para 1.1, límites de portabilidad, métricas incompletas y evidencia de 272 tests locales. No modifica skills ni completa fases. |
| validacion-plan-vista.md | registro | Validación del plan y del modelo de lectura de la vista | Plan estructurado creado sin lint; el modelo que consume la vista carga 8 fases, 31 tareas y 25 criterios pendientes. |
| version-1.1-y-conservacion-v1.md | decision | Versión 1.1 y conservación de la documentación v1 | Decisión del usuario: una única entrega 1.1 con documentación propia y conservación íntegra de la v1 para comparar. |

## Plan

0 de 8 fases cerradas, fase actual F0. Vista: /Users/edobacon/.kanai/data/kanai_data/inline-cases/dredd-up1-update/plan.md
