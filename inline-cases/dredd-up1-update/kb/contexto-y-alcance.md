# Dredd up1: contexto, alcance y decisiones de diseño

Fecha: 2026-10-04. Estado: investigación; no implementación autorizada en esta etapa.

## 1. Objetivo y restricciones confirmadas

El caso estudia y prepara la evolución autónoma de la skill Dredd de up1. Debe concluir con
un alcance verificable y, cuando se autorice implementar, una única entrega final de todas
las mejoras acordadas. Las fases internas son una secuencia de construcción, no entregas
que posterguen funcionalidades. Claude Code en macOS, Linux y Windows es obligatorio desde
esa entrega. Codex no está incluido como cliente objetivo.

El usuario exige que la skill y su documentación vivan como producto propio: sin referencias
ni dependencias de Kanai, kn-dredd, DKC/Deckard Cain o arbitrer. Kanai gestiona este caso;
no será parte del runtime, persistencia o exportación de Dredd. La comparación de fuentes
pertenece a este análisis, no a los archivos finales de up1.

Si hay métricas debe existir un comando de generación de reporte Markdown para compartir.
Se mantiene la prohibición temporal de modificar la skill/scripts mientras se completa
contexto. No hay autorización de push, PR, publicación ni modificación de hooks globales.

## 2. Base verificada y trabajo previo

- Repo objetivo: up1; base develop, rama feat/dredd-update.
- Origin: Bitbucket uplanner/up1. Ruta local configurada en el intake de la máquina.
- Base actualizada inicialmente: 374db48. Último commit del trabajo documental: 348ea29.
- Skill: .claude/skills/dredd/SKILL.md; cinco scripts: bb.sh, guard, progress, statusline y notify.
- Inventario v1: docs/reference/dredd-v1.md.
- Guía operativa v1: docs/guides/dredd-operacion-v1.md; 845 líneas que incluyen divergencias.
- Skill/scripts sin cambios frente a la base; las menciones del proveedor de búsqueda aún
  están en el protocolo y tendrán que retirarse de verdad al implementar autonomía.
- Cambios locales ajenos: package-lock.json y directorios de módulos, coverage y worktrees.
  No descartarlos, incorporarlos ni tratarlos como entregables de este caso.
- Esta máquina: macOS, Python 3.14.4 y git 2.54.0. Eso no acredita compatibilidad con otros
  sistemas ni establece versiones mínimas del producto.

La investigación leyó directamente el protocolo y scripts objetivo, documentación/fragmentos
y helpers de la versión de referencia, package.json de up1 y usos de configuración en los
refs locales origin/develop de layout y object-manager. No se ejecutó una review ni pruebas
de compatibilidad. Los refs de esos paquetes no se actualizaron durante esta investigación:
son evidencia de estructura, no certificación del último estado remoto.

## 3. Qué ya tiene Dredd y debe preservarse

Dos modos: PR Bitbucket y cambios locales; parent interactivo y un analista fresco;
Sonnet por defecto y consulta de Opus con riesgo; revisión por capas; tests/CI/tipado/lint;
contexto de consumidores/hermanos y duplicación; documentación/mandamientos; i18n y Storybook;
atribución multiticket y contraste de AC; KB local opcional; gate de evidencia y base remota;
persona en chat, comentario público neutro; publicación sólo del cuerpo presentado y aprobado;
memoria estructural local, avance y guard opcional con estado declarado.

No agregar como novedad algo que ya existe: mejorar su precisión, contrato o enforcement.
Sin MCP/clone/runner deben distinguirse análisis parcial, verificación no ejecutada y defecto
confirmado. Un build verde no prueba el flujo real ni cobertura completa.

## 4. Problemas que condicionan el diseño

| Evidencia actual | Consecuencia | Decisión que necesita el diseño |
|---|---|---|
| bb.sh usa Bash/curl/jq y paginación de una sola página; no fuerza error HTTP. | Compatibilidad Windows y cobertura/API pueden fallar silenciosamente. | Adaptador Python portable o dependencia explícita de shell, manejo de next, timeout, rate-limit y errores. Preferencia a evaluar: Python como núcleo. |
| Progreso usa un active.json global sin lock. | Sesiones se pisan y guard puede afectar otra revisión. | Identidad run/session, estado aislado, lock portable, TTL/cancelación coherentes. |
| Referencia multi-lane usa fcntl.flock. | No se puede copiar directamente para Windows. | Backend de exclusión por plataforma o coordinador único escritor; pruebas de procesos reales. |
| F1.5 invoca npx y guard deniega npx. | El flujo documentado de tests no puede cumplirse con ese guard. | Ejecutar herramientas ya instaladas con permisos definidos, sin instalar por red ni abrir un bypass general. |
| Merge de ejemplo modifica checkout y no fija base. | Puede tocar trabajo del dev o confundir un fallo con conflicto. | Comprobación no mutante por capacidad de git o workspace temporal aislado, sin reset/clean del checkout original. |
| Analista no delega/escribe pero se le ordena Core Extension, memoria y temporales. | Responsabilidades contradictorias. | Workers sólo retornan resultados/updates; parent persiste y gestiona candidatos externos autorizados. |
| S2 admite incertidumbre y gate exige confirmar; KB opcional vs must bloqueante. | Severidad y veredicto inconsistentes. | Consulta no confirmada sin severidad; política de reglas configuradas separada de mantenimiento/ausencia. |
| Modo local incluye working tree sin especificación completa de staged/untracked. | Diff de commits puede omitir cambios relevantes. | Snapshot coherente del alcance exacto; identidad para contenido sin commit. |

No basta con actualizar documentos para dar estas divergencias por corregidas.

## 5. Alcance funcional propuesto para la única entrega

1. Protocolo fragmentado: coordinador, núcleo, fases y salida, con mapa de cobertura de la v1.
2. Prefetch único y contrato de refs/head/base por repo; helper con inventarios completos.
3. Triage mecánico con evidencia: fases aplicables, señales de riesgo, ejes de razonamiento;
   descartes de señales justificados. No tratar JSON/config automáticamente como inocuo.
4. Rúbrica autónoma: impacto, alcance, certeza y efecto informativo de docs/tests; deduplicación
   por mecanismo; veredicto calculable y validable. No adoptar umbrales sin justificar.
5. Verificador independiente para S0/S1 de comportamiento; intenta refutar, cita evidencia
   y distingue falta de certeza de cobertura insuficiente. Recalcular informe tras resultado.
6. Configuración/layouts: seguir render, filtros, orden, export, permisos y navegación;
   chequeo de campos referenciados con resolución explícita de definiciones/versiones.
7. Operación segura y portable: sesiones, guard, tareas, estado, progreso, cancelación y cleanup.
8. Concurrencia adaptativa sólo con ejes independientes; síntesis/deduplicación; jurado según
   política pendiente; límite de workers y degradación transparente si el cliente no los ofrece.
9. Seguimiento local de hallazgos: IDs por mecanismo, criterio de cierre, rondas, decisiones,
   delta y cobertura por contenido. Pre-envío propio y re-revisión ajena con salidas distintas.
10. Métricas locales versionadas con exportador Markdown compartible, desde la misma entrega.

Nada incluye runtime de plataforma de gestión, sincronización de KB compartido, dashboards
servidor, auto-posteo, instalación automática de hooks o check obligatorio remoto.

## 6. Contexto específico de up1

package.json declara workspaces object-manager, layout, suite, report-builder, mcp y mods/*.
Estos repos pueden tener rama/HEAD propios; fetch o test del repo raíz no verifica los demás.
Los comandos de setup/update-repos/sync afectan muchos proyectos y no sirven como operación
indiscriminada de este caso.

Para cada review se necesita mapa repo → ruta → base → head → paquete → consumidor. La
lectura de contexto debe usar refs exactos, no copias synced o worktrees viejos. El acceso a
un repo no equivale a garantía de ausencia de duplicación en todos los repos hermanos.

relationDisplayFields aparece en RecordList de layout y en instance.resolver.js de
object-manager, incluido reescritura de filtros. En los refs inspeccionados: layout
7ecf493cc38ef292a2cc57edead197b9a2ccc55d y object-manager
a20aa14e4404a7de3e3b33d8c2a63557d1e0ca9e. Los checkouts HEAD eran distintos de esos refs.
Antes de convertir esta evidencia en tests finales debe refrescarse y trazarse el mecanismo.

El helper de referencia une properties por nombre y hereda record types. Importa elegir
directorios/versiones válidos: mezclar snapshots viejos puede ocultar campos faltantes. Su
alcance actual es relationDisplayFields, no toda la semántica de layouts. Sale 0 aun con
findings: el consumidor debe procesar su JSON, no inferir éxito por exit code.

## 7. Arquitectura autónoma a evaluar

Núcleo en Python con biblioteca estándar cuando sea viable, git externo y adaptadores del
cliente. Versiones mínimas todavía por definir mediante compatibilidad, no por esta máquina.
No copiar imports acoplados a validadores gigantes: triage/rúbrica/esquemas deben tener
contratos propios. No symlinks a otras skills. Python no elimina la necesidad de validar
invocación del cliente y runners instalados en cada sistema.

Persistencia propuesta bajo ~/.dredd, por repo/run, separando configuración, progreso,
memoria estructural, expediente y métricas. El schema_version permite migración explícita.
Sanear nombres/IDs de rutas; escritura atómica y control de concurrencia portable. No
guardar secretos ni depender de una ruta personal de la máquina del autor.

Un parent escritor reduce carreras para findings/cases/memory/metrics; los workers emiten
contratos estructurados y progreso mediante interfaz controlada. Definir comportamiento si
session_id falta, si cambia TTL, si muere worker/parent y si un subagente recibe otra sesión.
No copiar el fallback global que mezcla todas las sesiones sin evaluar aislamiento.

Windows exige paths con espacios/no ASCII, CRLF, quoting, resolución de Python/git,
ejecutables .cmd, replace/locks de archivos abiertos y eliminación de temporales propios.
macOS/Linux exigen igual contrato, no asumir que un smoke Windows equivale al test POSIX.

## 8. Métricas y comando de reporte

Interfaz propuesta, aún no implementada:

```text
python <skill>/scripts/dredd-metrics.py report --repo up1 --from AAAA-MM-DD --to AAAA-MM-DD --output reporte.md
```

El runner Python real se resolverá por cliente/sistema. El comando lee métricas locales,
produce Markdown UTF-8 y no publica ni envía información. Necesita política para archivo
existente, filtros inválidos, intervalo sin datos y registros corruptos. No sustituir
formato de consola por una extensión .md.

Datos mínimos: schema/run ID, versión de skill/config, inicio/fin/status, duración, modo,
refs por repo, diffstat, fases aplicables/ejecutadas/omitidas, modelos/roles reales, tests y
su resultado, cobertura de review, findings por nivel, verificación independiente, veredicto
emitido/calculado y limitaciones. Una corrida abortada sigue registrada como incompleta.

Tokens/costo: sólo de fuente del cliente verificable; null/no disponible si falta. Mostrar
completitud, sin promediar parciales como si fueran costo total. Precios/versiones, si se
usan, deben ser trazables; no inventar costo desde longitud de texto.

Outcomes: corrected/confirmed/dismissed/pending con evidencia y actor. accepted o wont-fix
son decisiones, no automáticamente true positive. Merge/cierre tampoco valida todos los
findings. Separar precisión sobre casos adjudicados de cobertura de adjudicación, con
denominador visible. Dedupe no borra tiempo/costo de corridas repetidas.

Reporte: filtros/fecha, resumen, duración (mediana/percentiles con tamaño de muestra),
distribución de veredictos/severidades, verificaciones no ejecutadas, completitud de costos,
outcomes/pendientes y limitaciones. Anonimización para compartir: sin paths personales,
autores, secretos, títulos sensibles ni fragmentos de código. Política de incluir URLs de
PR/tickets e identificadores de repo debe ser explícita; default propuesto, anonimizado.
Retención/borrado de registros y si métricas son opt-out u opt-in quedan por definir.

## 9. Seguimiento y cobertura: condiciones de seguridad lógica

Un hallazgo se conserva por repo/archivo/mecanismo, no sólo número de línea. Corregido exige
criterio de cierre + head/ref verificado; no basta respuesta del autor o test verde genérico.
Una decisión aceptada/pospuesta conserva motivo sin borrar historia ni simular corrección.

Cobertura usa blob/hash de contenido y lectura full/partial/not-read. Sólo full marca
contenido revisado; tests verdes no son cobertura de revisión. Si el blob cambia, invalidar
marca y revisar delta + consumidores afectados + pendientes + huecos anteriores.
Interdiff vacío no cierra archivos nunca leídos. Rebase/force-push o base nueva requieren
recalcular alcance o fallback completo, sin borrar expediente. Binarios conservan límites
del guard y no se anuncian como leídos completos por inspección del nombre.

## 10. Evidencia requerida para aceptar la entrega

| Área | Casos mínimos |
|---|---|
| Autonomía | Sin servicios excluidos, sin imports/symlinks externos, KB de archivos o sin KB. |
| Tres sistemas | Ejecución real de helper/CLI/hooks/lock/reporte en macOS, Linux y Windows; versiones y entorno registrados. |
| Repo original | Merge/tests/cleanup no alteran cambios dirty, ramas, stashes ni worktrees ajenos. |
| API | Paginación >100, 401/403/404, timeout, rate-limit y Unicode; inventario completo o límite declarado. |
| Sesiones | Dos reviews concurrentes sin pérdida de eventos ni guard cruzado; worker muerto, close/end/TTL y sesión ausente. |
| Rúbrica | Casos tabulados S0-S3/consulta, pisos docs/tests, dedup, acumulación, contrato compartido y override explícito. |
| Verificador/jurado | Hallazgo confirmado/refutado, desacuerdo, evidencia insuficiente y worker faltante; nadie publica por consenso solo. |
| Config/layout | Campo válido, inexistente, objeto no resuelto, record type/extensión, referencias anidadas, config usada fuera del render. |
| Seguimiento | Correcto cierre, no corregido, renombre, base cambiada, rebase, force-push y blob sin cobertura previa. |
| Métricas/MD | Campos faltantes/corruptos, parciales, duplicados, abortos, no datos, filtros y anonimización; Markdown realmente legible. |
| Publicación | Sin consentimiento no publica; cuerpo aprobado exacto; HTTP fallo no anunciado como éxito. |

Pruebas de la herramienta con fixtures/repos temporales, no suite completa de todos los
productos de up1. Un smoke integrado se suma para el flujo del cliente; no sustituye
pruebas de lógica ni los tres sistemas. Los comandos de un futuro plan inline serán
ejecutados/reportados por el dev según el flujo del caso, no marcados como corridos ahora.

## 11. Decisiones abiertas y dependencias del plan

- Política de jurado/costo y excepción Jira en modo local: consultadas al usuario, respuesta
  pendiente al redactar este documento. Actualizar por un registro de decisiones.
- Nombres finales del veredicto y umbral de acumulación S2: revisar con ejemplos reales.
- Concurrencia máxima, modelos por rol y presupuesto/timeout: deben ser configurables;
  no asumir disponibilidad de todos los modelos del producto de referencia.
- Versiones mínimas Python/git y entorno Windows: validar feature probes y runner real.
- Retención, opt-in/out de métricas, alcance de anonymización y formato de outcomes.
- Host/session_id, metadatos de uso disponibles y API de subagentes/hooks de Claude Code:
  falta validar en versiones reales antes de prometer comportamiento.
- Quién valida Linux/Windows y quién revisa/entrega: no se asignaron personas específicas.

El plan futuro necesita tareas, criterios, esfuerzo y rollback por fase. Como hay cambios
ajenos en el checkout, debe elegir entorno de trabajo que preserve ese estado y registrar
commits nuevos sin atribuir los commits documentales anteriores como ejecución futura.
No crear un plan definitivo ni avanzar a implementación mientras estas decisiones de
contexto se confundan con supuestos confirmados.
