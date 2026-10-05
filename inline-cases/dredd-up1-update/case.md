# Caso inline: Dredd up1 1.1: evolución autónoma y métricas compartibles

> Vista generada por Kanai desde case.yaml, el KB y el plan. No la edites a mano.

**Objetivo:** Preparar e implementar cuando se autorice una única entrega Dredd up1 1.1 con todas las mejoras acordadas: rigor y operación segura, auditoría de configuración, concurrencia adaptativa, seguimiento local y métricas exportables a Markdown. Ejecución y verificación en Claude Code macOS, con diseño portable a Linux y Windows cuya verificación real queda aplazada para después de la implementación. Generar documentación operativa y referencia 1.1, preservar íntegra la v1 y documentar comparación entre versiones.
**Tags:** projects: up1 · repos: up1 · branches: feat/dredd-update · labels: dredd, tooling, autonomo, metricas, investigacion
**Etapa:** ejecucion

## Falta

- Nada que bloquee.

## Avisos

- Sin avisos.

## Repos

| Repo | Ruta local | Rama base | Ramas de trabajo | Para qué |
|---|---|---|---|---|
| up1 | configurada | develop (existe) | feat/dredd-update, feat/dredd-update-1.1 | Repositorio objetivo. La implementación 1.1 se hace en el worktree limpio up1__dredd-1.1, rama feat/dredd-update-1.1 (creada desde feat/dredd-update@348ea29), para no tocar el checkout principal con cambios ajenos. Cambios limitados a Dredd, sus scripts, pruebas y documentación. |

## Ambientes

- Investigación local: macOS; revisión de fuentes y documentos, sin ejecutar PRs ni modificar hooks globales.
- Validación aislada propuesta: Fixtures y repos git temporales para merge, delta, guard, sesiones y métricas; ejecución en Claude Code macOS antes de aceptar la única entrega.
- Claude Code macOS: Única plataforma de ejecución y verificación de este plan. Hooks, progreso, helper, métricas, concurrencia y seguimiento.
- Claude Code Linux: Diseño portable; verificación real aplazada para después de la implementación, fuera de este plan.
- Claude Code Windows: Diseño portable (sin asumir fcntl, Bash, chmod ni paths POSIX); verificación real aplazada para después de la implementación, fuera de este plan.

## Personas

- Solicitante: Define alcance, confirma decisiones pendientes y autoriza acciones externas.
- Agente de análisis: Investiga evidencia, mantiene contexto del caso y prepara decisiones; no implementa aún.

## Enlaces

- [Repositorio up1](https://bitbucket.org/uplanner/up1)

## Notas

- Dredd de up1 debe tener contrato propio, sin dependencias ni referencias a Kanai, kn-dredd, arbitrer o DKC en sus archivos. Kanai se usa sólo para gestionar este caso.
- Documentación base completada: docs/reference/dredd-v1.md y docs/guides/dredd-operacion-v1.md, commit 348ea29; skill/scripts sin cambios frente a develop@374db48.
- Existen cambios locales ajenos al caso: package-lock.json, coverage y carpetas de módulos/worktrees. No descartarlos ni incluirlos en commits del caso.
- Métricas, si se implementan, requieren comando para exportar reporte Markdown compartible; no son métricas del caso Kanai.
- Decisión explícita del usuario: todas las mejoras en una sola entrega final. Las fases internas ordenan el trabajo, no posponen capacidades a una segunda entrega.
- Política del jurado/costo y continuación del modo local sin Jira: preguntas abiertas, no decisiones confirmadas.
- La nueva versión y sus documentos se nombran 1.1. Preservar documentación v1 en el estado 348ea29 para comparación.
- Plan estructurado compatible con el esquema y modelo de lectura de la vista; todas las fases inician pendientes, con decisiones abiertas en la fase inicial.
- Crear documentos 1.1 y comparación v1 vs 1.1; no actualizar en sitio los dos documentos históricos v1.
- Decisión del usuario (2026-10-05, reemplaza la de tres sistemas desde la primera entrega): la ejecución y verificación del plan es solo en macOS. El código mantiene diseño portable; la verificación real en Linux y Windows queda aplazada para después de la implementación y la documentación 1.1 la declara pendiente.
- Modo autónomo autorizado por el usuario (2026-10-05, opción A), válido solo para este caso: el agente ejecuta y registra las suites de macOS; commits por fase en feat/dredd-update sin mostrarlos antes, sin push, mensaje convencional del repo y sin trailer Co-Authored-By; excepción a la regla de sincronizar cada 5 pasos dentro de las fases. Se mantiene la pausa ante errores preexistentes que bloquean, desvíos que exigen enmendar el plan y decisiones de diseño con impacto en el contrato de F0. Sigue siendo del dev: decisiones y F0.C1, token de Bitbucket y hooks de F7.2, smoke F7.C2, aceptación F7.C4 y autorizar correcciones del juez final.
- 2026-10-05, decisión del dev: la implementación corre en el worktree /Users/edobacon/Workspace/uplanner/up1__dredd-1.1, rama feat/dredd-update-1.1 desde 348ea29. El checkout principal (con package-lock.json y carpetas ajenas) no se toca; su foto de git status sigue con SHA-256 2ac64f44. Al final el dev decide si lleva los commits a feat/dredd-update.

## KB del caso

| Documento | Tipo | Título | Resumen |
|---|---|---|---|
| contexto-y-alcance.md | analisis | Dredd up1: contexto, alcance y decisiones de diseño | Entrega única para Claude Code en macOS, Linux y Windows; arquitectura autónoma, adaptaciones necesarias, métricas Markdown y criterios de aceptación propuestos. |
| dredd-capacidades-v1.md | referencia | Dredd up1: capacidades actuales v1 | Línea base documental del comportamiento actual; no acredita cambios de implementación. |
| dredd-operacion-v1.md | referencia | Dredd up1: funcionamiento operativo actual | Flujos, fases, configuración, scripts y divergencias observadas; referencia para contrastar mejoras. |
| f0-baseline-v1-y-preservacion.md | registro | F0: baseline v1 congelada y preservación del checkout | Hashes congelados de los dos documentos v1 en 348ea29, foto del checkout dirty ajeno y estrategia verificable para no tocarlo durante la implementación. |
| f0-contrato-y-matriz.md | referencia | F0: contrato 1.1 y matriz de aceptación | Contrato 1.1 (interfaces, entorno, rúbrica según decisiones), convención de tests test_fN_<area>.py, matriz de aceptación por suite y mínimo de tests por fase (F1 24, F2 23, F3 16, F4 17, F5 15; total 95). |
| f0-decisiones-aprobadas.md | decision | F0: decisiones aprobadas | El dev aprobó el 2026-10-05 las 12 recomendaciones de f0-propuesta-decisiones.md (opción A en D1-D12) y autorizó ejecutar todas las fases. |
| f0-propuesta-decisiones.md | analisis | F0: propuesta de decisiones (pendiente de aprobación) | Propuesta del agente para las 12 decisiones de F0 (políticas y arquitectura), con opciones, recomendación y motivo. PENDIENTE de aprobación del dev; no son decisiones confirmadas. |
| f1-juez-ciego.md | revision | F1: juez ciego de fase | Juez ciego de F1 (sonnet, contexto limpio): 4 rondas; iterar por bypasses del guard, resueltos en 7ac44c4, 1eed401 y 2d80dc0; veredicto final aprobado con nits (N10 S3). DKC diferido a F2. |
| f1-matriz-plataformas.md | referencia | F1: matriz por sistema | Matriz por sistema de los mecanismos de F1 (helper, estado, lock, guard, merge, instalador, consola): qué usa cada uno, límites y cómo resuelve Python y git. macOS verificado; Linux y Windows diseño sin verificar. |
| f2-juez-ciego.md | revision | F2: juez ciego de fase | Juez ciego de F2 (sonnet): aprobado con nits sobre a7e4c22; N1 (jurado en diff de alto riesgo sin lógica) y N2 (motivo de descarte) corregidos en 4cb2f83; N3 documentado; N4 (needles de cobertura genéricos) aceptado S3. |
| f3-juez-ciego.md | revision | F3: juez ciego de fase | Juez ciego de F3 (sonnet): 3 rondas; iterar por ids repetidos entre carriles y comment sin --run, luego por lanes del plan; aprobado con nits en 6fa29a0; N2 corregido en 382d0c0. |
| f4-juez-ciego.md | revision | F4: juez ciego de fase | Juez ciego de F4 (sonnet): iterar en 2e8a1d3 (rutas no ASCII, binarios que escalaban, cobertura vieja, merge-base, cierre débil, colisiones, consumidores, renombres); todo resuelto en b4c91db; aprobado con nits; N1 documentado. |
| f5-juez-ciego.md | revision | F5: juez ciego de fase | Juez ciego de F5 (sonnet): 3 rondas; iterar por campos libres sin limpiar y registros con tipos inválidos que tumbaban el reporte; aprobado sin hallazgos en 52f5c26 tras 540 casos de fuzz. |
| f6-juez-ciego.md | revision | F6: juez ciego de la documentación 1.1 | Juez ciego de F6 (sonnet): aprobado, 0 bloqueantes; 2 menores (frase ambigua de portabilidad, consola Windows) corregidos antes de 6eb1152. |
| f7-correccion-metricas.md | revision | F7: corrección de métricas tras el smoke real (A+B) | El smoke real mostró métricas con 0 hallazgos frente a un expediente con S1-S3. Se corrigió con la opción A+B (derivar de la corrida y validar el resumen) en 9757aff y 8ca028f; juez ciego aprobado con nits corregidos; 191 tests OK. |
| f7-juez-final-propio.md | revision | F7: juez final propio (alcance completo) | Juez final opus de contexto limpio sobre 348ea29..HEAD. r1 rechazado (publicar sin aprobación, instalador global por error del brief); r2 aprobado con nits tras 7a93581 y dff7ca8; los 3 nits quedan corregidos en f757205. 182 tests OK. |
| investigacion-configuracion-local.md | analisis | Investigación local y perfil propuesto para Dredd up1 1.1 | Perfil adaptativo observado, recomendaciones para 1.1, límites de portabilidad, métricas incompletas y evidencia de 272 tests locales. No modifica skills ni completa fases. |
| validacion-plan-vista.md | registro | Validación del plan y del modelo de lectura de la vista | Plan estructurado creado sin lint; el modelo que consume la vista carga 8 fases, 31 tareas y 25 criterios pendientes. |
| verificacion-solo-macos.md | decision | Verificación solo en macOS; Linux y Windows aplazados | Decisión del usuario (2026-10-05): ejecución y verificación solo en macOS; Linux y Windows con diseño portable y verificación aplazada para después de la implementación. |
| version-1.1-y-conservacion-v1.md | decision | Versión 1.1 y conservación de la documentación v1 | Decisión del usuario: una única entrega 1.1 con documentación propia y conservación íntegra de la v1 para comparar. |

## Plan

7 de 8 fases cerradas, fase actual F7. Vista: /Users/edobacon/.kanai/data/kanai_data/inline-cases/dredd-up1-update/plan.md
