# Investigación local y perfil propuesto para Dredd up1 1.1

Fecha: 2026-10-04. Documento de análisis para el caso inline; no constituye aprobación de configuración ni ejecución de sus fases. No se modificaron skills, scripts ni hooks durante esta investigación.

## Alcance y evidencia

Se inspeccionó el origen local `/Users/edobacon/Workspace/kanai/kanai-app/skills/claude/kn-dredd` y su instalación mediante el enlace `~/.claude/skills/kn-dredd`. Las referencias al origen pertenecen únicamente a este análisis del caso. La documentación y el producto Dredd up1 1.1 deben ser autónomos y no mencionar Kanai, kn-dredd, DKC ni arbitrer.

Fuentes: `CONFIGURATION.md`, `SKILL.md`, `protocol/core.md`, `protocol/severity-info.md`, `protocol/report.md`, scripts de triage, progreso, guard, casos, cobertura, métricas y sus tests; límites de lotes en `server/review/scope.ts` del repositorio de origen. Se contrastaron hooks instalados y configuración local pertinente sin copiar credenciales. No se detectaron overrides persistentes de las opciones examinadas; esto no prueba que ninguna invocación haya usado overrides en su prompt o entorno.

El statusline y el notificador instalados coinciden con el origen. El guard difiere solo en dos textos de localización, sin cambios de lógica. El entorno observado es macOS; no demuestra compatibilidad Linux o Windows.

## Configuración observada y adaptación propuesta

| Área | Comportamiento local observado | Propuesta para up1 1.1 |
| --- | --- | --- |
| Alcance | Clasificación por carriles independientes de razonamiento: trivial, acotado y amplio; tamaño no equivale a complejidad. | Mantener la clasificación; cambios de configuración que afecten comportamiento requieren trazado cuando corresponda. |
| Modelos | Sonnet habitual; Opus para trazado necesario, carriles amplios y verificación de mayor exigencia. Triage Haiku, con escalado. | Perfil adaptativo con modelos configurables. Registrar modelo solicitado y realmente usado; comunicar indisponibilidad sin simular un jurado. |
| Jurado | K2 Opus + Sonnet por riesgo en alcance acotado; K3 explícito. En amplio hay reparto por módulos, sin jurado por carril implementado. | K2 automático por riesgo en alcance acotado; reparto por módulos en amplio. No atribuirle doble revisión independiente a cada módulo si no ocurrió. K3 queda como opción explícita. |
| Preenvío | Primera ronda exige varios revisores incluso sin señales de riesgo; trivial se promueve a acotado. | Conservar un flujo de preenvío explícito con K2 en la primera ronda; no publicar comentarios ni crear PR automáticamente. |
| Contexto de aceptación | Jira obligatorio en revisión normal; opcional en preenvío, con fuente y fecha del contexto guardado. | Mantener la distinción de flujos. Documentar qué verificaciones quedan limitadas cuando preenvío no tiene criterios de aceptación. |
| Verificación | Hallazgo S0/S1 de un único revisor requiere segunda revisión independiente; el perfil de jurado o alcance amplio usa Opus. | Verificación adversarial con contexto fresco y recálculo final del veredicto; síntesis y verificación son funciones diferentes. |
| Consenso | K2 conserva coincidencias; los únicos S0/S1 se verifican, S2 se confirma con código o pasa a consulta, S3/consulta conserva atribución. K3 conserva mayoría y convierte hallazgo de un solo revisor en consulta. | Aplicar reglas deterministas y conservar evidencia de aportes y desacuerdos. Ningún hallazgo confirmado se descarta solo por falta de votos. |
| Veredicto | S0 rechazado; S1 iterar; S2 reservas; solo S3/consulta nits; sin hallazgos aprobable. Dos S2 sin piso informativo o un S2 de núcleo/contrato compartido elevan a iterar. | Adoptar una tabla única, probada, con excepciones explícitas. La severidad exige mecanismo e impacto verificables; la incertidumbre se expresa como consulta. |
| Pisos informativos | Tabla específica de documentación y tests. Los S2 cuyo único fundamento es un piso informativo no cuentan para la regla de dos S2. | Mantener esta distinción en datos y agregación. Una ausencia de documentación y un contrato roto no son el mismo hallazgo. |
| Correcciones | Casos locales, historial por rondas, comprobación de cierre, delta y cobertura pendiente; se escala ante tres rondas sin progreso o dos rondas sin lectura del mismo archivo. | Caso local autónomo, comprobación de correcciones con evidencia, delta por riesgo y escalado visible. Reinicios deben conservar pendientes. |
| Lotes | Referencia de 2.000 líneas cambiadas, 40 archivos y 30 consumidores por lote en el servidor. | Implementar lotes localmente. Son tamaños de procesamiento, no límites que permitan omitir el resto de la revisión o declarar cobertura completa. |
| Progreso | Estado por sesión y compatibilidad antigua global; TTL de tres horas desde inicio. | Identidad explícita de ejecución, aislamiento y recuperación. La expiración no debe cerrar una revisión ni retirar protección de trabajo todavía activo. |
| Métricas | Registros estructurados, validación y reporte; costos y tokens pueden ser incompletos. | Registro local por ejecución y comando documentado para exportar Markdown compartible. Mostrar cobertura de datos, pendientes y valores desconocidos; permitir anonimizar rutas, autores y enlaces. |
| Experimentos | A/B de modelos y verificación canaria desactivados por defecto. | Mantener desactivados; datos experimentales separados de hallazgos y decisiones de revisión. |

## Límites que requieren trabajo propio en up1

1. El bloqueo con `fcntl.flock` depende de POSIX. Debe sustituirse por una estrategia portable de escritura y exclusión, validada en los tres sistemas. La elección de implementación debe justificarse mediante pruebas de concurrencia, recuperación y escrituras incompletas.
2. El comportamiento sin identificador de sesión puede consultar la unión de revisiones activas. up1 debe conservar una identidad inequívoca o comunicar que no puede determinarla, evitando interferencia entre ejecuciones.
3. Los helpers de Bitbucket usan Bash, curl y jq. No hay evidencia local de su funcionamiento en Windows; el plan debe resolver dependencias o reemplazar ese tramo por una implementación portable y probar autenticación, errores y paginación.
4. El triage importa lógica del validador de métricas. En up1, clasificación y reglas compartidas deben quedar en un módulo independiente del almacenamiento de métricas.
5. Los límites de lotes viven en el servidor del origen. up1 necesita su propia implementación sin depender de ese servidor.
6. No se encontró configuración explícita de presupuesto monetario, máximo de workers, retención automática ni versiones mínimas de Python/Git en las fuentes inspeccionadas. No se pueden presentar valores inventados como configuración local existente. La versión 1.1 deberá documentar dependencias comprobadas y el control de recursos elegido. Se propone no borrar métricas automáticamente por defecto; cualquier límite nuevo de concurrencia o gasto necesita justificación propia.

## Métricas observadas: límites de interpretación

La lectura local encontró 62 registros JSON, 60 no reemplazados, solo 6 con costos completos y 56 con costos parciales. En los registros no reemplazados se contabilizaron 99 hallazgos corregidos, 14 no corregidos por decisión, 8 aceptados, 7 no atendidos y 173 pendientes.

Estos números describen registros y disposiciones, no 62 PR distintos ni una medición completa de precisión. Los pendientes no son falsos positivos; ausencia de descartes no demuestra 100% de exactitud. up1 debe separar disposición del hallazgo, confirmación con evidencia y cobertura de medición. No inferir recall sin un conjunto de referencia, ni rellenar tokens/costos faltantes con cero. El reporte Markdown debe conservar estas aclaraciones y el período/filtros aplicados.

## Validación realizada

Se revisó el aislamiento de los tests del origen: fixtures y hogares temporales para estado y hooks. Se ejecutó en el repositorio de origen:

```sh
PYTHONDONTWRITEBYTECODE=1 python3 -m unittest discover -s skills/claude/kn-dredd/scripts/tests
```

Resultado: 272 tests, 4,331 segundos, OK. El mensaje de fixture JSON inválido corresponde a una prueba esperada. Esta ejecución valida la suite local del origen en macOS; no valida la implementación futura de up1 ni Linux/Windows ni una revisión real de PR. No se marcó ninguna fase o criterio del plan como completado.

## Consecuencias para el plan y documentación

El perfil propuesto aporta una base concreta para F0. La configuración final debe quedar documentada y verificable antes de implementar; este análisis no sustituye su aprobación. Las adaptaciones portables quedan cubiertas por la implementación y validación de las fases existentes, con todas las mejoras en una única entrega final.

La entrega debe producir `docs/reference/dredd-v1.1.md`, `docs/guides/dredd-operacion-v1.1.md` y `docs/reference/dredd-v1-a-v1.1.md`. Los documentos v1 existentes deben permanecer idénticos al baseline 348ea29 para permitir la comparación. La documentación 1.1 describe únicamente el funcionamiento propio de Dredd up1 y distingue configuración predeterminada, opciones y límites verificados.
