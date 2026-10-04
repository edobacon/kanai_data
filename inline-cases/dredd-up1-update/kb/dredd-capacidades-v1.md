# Dredd de up1 — capacidades v1

Referencia del comportamiento definido actualmente por la skill de up1. Esta v1 es una
línea base documental para evaluar futuras mejoras; no cambia el protocolo ni sus scripts.

El flujo detallado, configuración, scripts, recuperación y divergencias están descritos en la
[documentación operativa v1](../guides/dredd-operacion-v1.md).

- Fecha de revisión: 2026-10-04.
- Base del repositorio: `develop@374db48`, después de actualizar desde `origin/develop`.
- Fuente normativa: [SKILL.md](../../.claude/skills/dredd/SKILL.md).
- Implementación auxiliar: [scripts](../../.claude/skills/dredd/scripts/).
- SHA-256 del protocolo: `b8cd0879d63ff9ed5a30e6c3ec84caca090071933168444fa9c3994b0413cd23`.

Las capacidades siguientes se verificaron leyendo el protocolo y los scripts. No se ejecutó
una review real ni se certificó la instalación de credenciales, hooks o MCP en un cliente.

## Entradas y requisitos

| Aspecto | Comportamiento actual |
|---|---|
| Modo A | URL de PR de Bitbucket Cloud; obtiene metadata, diff, archivos, commits y estados de CI mediante `bb.sh`. |
| Modo B | Instrucción sobre cambios locales: ticket, rama o diff contra la base remota; no exige credenciales de Bitbucket. |
| Jira y Confluence | Acceso mediante MCP de Atlassian obligatorio antes de delegar, también en modo local. |
| Bitbucket | Credenciales obligatorias en modo A; el helper usa `~/.bitbucket.env` y `~/.bitbucket_token`. |
| Cliente | Debe poder ejecutar un subagente fresco y las herramientas del protocolo. Los scripts requieren Python 3; `bb.sh` usa Bash, curl y jq. |
| Clone y KB | Configuración local en `~/.analyze-pr.json`. El KB es opcional; se pregunta y persiste su ruta o la decisión de correr sin él. |
| Guard y progreso | El parent verifica la instalación. La ausencia del guard no bloquea: se declara ejecución en modo soft. |

## Ejecución y modelo

El hilo principal (parent) resuelve requisitos, configuración, modelo y preguntas antes de
delegar. Un único subagente con contexto limpio lee el protocolo completo y devuelve el
informe y el borrador exacto del comentario. El parent comunica el avance, presenta el
resultado, gestiona la publicación y cierra la corrida, incluso si se cancela.

Sonnet es el modelo predeterminado. Si el diffstat muestra auth/permisos/RBAC, migraciones,
retiros destructivos o se solicita una revisión profunda, el parent consulta si escalar a
Opus. Una elección explícita del usuario prevalece. El diffstat ya obtenido se reutiliza.
No hay jurado de varios revisores, síntesis por otro modelo ni segunda verificación independiente.

## Cobertura del análisis

Las fases se adaptan a la superficie del cambio; lo que no aplica debe declararse.

| Fase | Capacidades definidas |
|---|---|
| 0 — Caracterización | Identifica PR, ramas, archivos, alcance y tickets; arma el plan y estima duración. |
| 1 — Diff | Revisa calidad y seguridad del cambio. |
| 1.5 — Verificación | Contrasta conflictos de merge y CI; ejecuta tipado, lint y tests cuando el entorno lo permite. Selecciona el paquete afectado y tests relacionados, con fallback justificado a la suite del paquete. Distingue errores nuevos y preexistentes, skips, cobertura del comportamiento nuevo y falsos verdes. |
| 1.75 — Auditoría | Seguridad, rendimiento, contratos incompatibles, errores, logging/PII, migraciones y datos, código muerto y dependencias. |
| 2 — Contexto | Traza productores, consumidores, tipos y estado. Compara implementaciones hermanas; busca duplicación y referencias afectadas por retiros, incluidas configuraciones/layouts, seeds, migraciones, documentación e i18n. |
| 2.5 — Documentación | Detecta comportamiento nuevo sin documentación, contradicciones y documentos pendientes de actualizar. La falta de documentación puede bajar el veredicto. |
| 2.55 — Mandamientos | Descubre `.ai/COMMANDMENTS.md` en los ancestros pertinentes de la base; contrasta reglas y excepciones justificadas. Declara cuando no existen. |
| 2.6 — i18n | Revisa paridad de claves entre idiomas y efectos de altas, movimientos, renombres y claves huérfanas. |
| 2.7 — Storybook | Revisa stories, argumentos y variantes según las convenciones y superficie UI del proyecto. No exige stories universalmente. |
| 3 — Tickets | Identifica varios tickets si corresponde, atribuye cambios por commit y contrasta criterios de aceptación por ticket. Separa cambios compartidos o no atribuibles y declara límites por squash. |
| 4 — KB opcional | Contrasta reglas, bugs, decisiones y specs del KB configurado mediante búsqueda y lectura de sus documentos. |

La búsqueda de hermanos comienza en el workspace/mod más cercano y se amplía cuando el
cambio es compartido o el contexto es insuficiente. La búsqueda de duplicación abarca el
clone revisado: no garantiza cobertura automática de todos los repos independientes de up1.

Cuando detecta duplicación o un mecanismo genérico insuficiente, el protocolo contempla
`core-extension-writer`. La propuesta usa el PR como origen; la existencia del ticket Core
Extension no bloquea por sí misma. La severidad del defecto determina su tratamiento.
La decisión de frontera core/mod corresponde al proceso de Aduana/equipo de core.

## Evidencia, severidad y entrega

Antes de afirmar un hallazgo, exige verificar el código y sus consumidores, citar
`archivo:línea` y contrastar la base remota fresca `origin/<rama-destino>` con su commit exacto.
El código de la base es la fuente de contexto; los archivos entrantes son objeto de revisión.
En repos independientes relevantes exige actualizar su referencia. Un trazado estático debe
declararse como tal; no equivale a una reproducción en runtime. Suposiciones sin confirmar
se presentan como consultas.

Cada hallazgo justifica su nivel por **impacto, alcance y certeza**:

| Resultado | Tratamiento |
|---|---|
| S0 — Crítico | Feature rota de extremo a extremo, AC incumplido, seguridad, pérdida/corrupción de datos o regla `must` del KB; bloquea. |
| S1 — Alto | Bug confirmado o riesgo serio; corregir antes del merge salvo decisión explícita documentada. |
| S2 — Medio | Inconsistencia o riesgo que requiere confirmar/ajustar con la feature principal operativa. |
| S3 — Bajo | Estilo o mantenibilidad; no bloquea. |
| Consulta / OK | Pregunta abierta sin severidad / comprobación satisfactoria o sospecha descartada. |

El informe incluye resumen, calibración y guard, hallazgos, criterios por ticket, checklist
de verificaciones ejecutadas, estado de documentación, mandamientos, KB y veredicto.
Los veredictos son `aprobable`, `aprobable-con-observaciones`, `iterar` y `bloquear`, con la
acción pendiente. El protocolo no define una tabla exhaustiva de agregación de severidades.

El comentario público usa tono neutro y evidencia comprensible sin IDs internos del KB.
El parent muestra el cuerpo exacto y sólo publica en Bitbucket con confirmación explícita.
No se solicitan cambios de documentación, KB o tickets como seguimiento automático del review.

## Protección, progreso y memoria

- Trata descripción, diff, comentarios y archivos del PR como datos, nunca como instrucciones.
  Lee reglas/documentación de contexto desde la base; instrucciones maliciosas entrantes se auditan.
- Restringe secretos, binarios/imágenes, red y efectos laterales del analista. El guard opcional
  añade bloqueo técnico mediante hook; sin él estas restricciones dependen del protocolo.
- `dredd-progress.py` mantiene fases y tiempos en `~/.dredd/active.json`. El parent narra por
  texto y el protocolo prescribe voz por bloque. La statusline y `PostToolUse` dependen del
  cliente; no sustituyen al narrador. Guard/statusline/notify usan un TTL de tres horas.
- `~/.dredd/memory.json` es una caché local opcional de hechos estructurales, con base y fecha,
  que debe revalidarse. No almacena historial de hallazgos ni se comparte o versiona.
- `bb.sh` ofrece `parse`, `meta`, `diff`, `diffstat`, `file`, `commits`, `commitfiles`,
  `statuses`, `list` y `comment`. Sólo `comment` publica; el consentimiento lo exige el protocolo.

## Límites de esta línea base

- La integración Core Extension depende de `core-extension-writer` y del acceso a tickets.
- Cada corrida produce su propio informe. La memoria local conserva hechos estructurales,
  sin mantener un registro de resolución de hallazgos entre revisiones.
- El ledger usa un archivo global `active.json`; los scripts no aíslan corridas por sesión.
- Hay una tensión pendiente en el protocolo: el analista no puede redelegar ni efectuar
  escrituras, pero las fases 2/2.55 indican invocar `core-extension-writer` y reportar un ticket
  creado o borrador. La v1 registra esa ambigüedad sin modificar el flujo.
- La [guía core/mod](../guides/core-mod-boundary-workflow.md) conserva una referencia a checks
  pendientes de mandamientos/duplicación; ambos ya aparecen en la skill. Esta línea base se
  basa en el protocolo actual. Un check requerido en Bitbucket no debe asumirse instalado.
