---
id: DOC-kb-sp13-verificador-integracion-kanai
project: up1
type: doc
module: mcp
tags:
  - sp13
  - verificador
  - kanai
  - detective-mode
  - intake
  - sondas
  - plan
  - idea
---

# Verificador de consistencia: integración con Kanai (detective mode, intake y sondas)

Diseño de cómo integrar las 4 comprobaciones del verificador de consistencia en el flujo de Kanai: detective mode, intake, sondas, gate y revisión de PR. Complementa "Verificador de consistencia entre capas: detalle, contexto, método y ventajas" (misma carpeta). **Estado: propuesta. Nada implementado.** Lo que se verificó leyendo código y KB está separado de lo que no.

## Qué existe hoy (verificado leyendo kanai-app y el KB)

**Sondas del intake.** Recetas deterministas, sin LLM, que corren antes de planificar y levantan tarjetas de decisión (variante, no aplica o pregunta al PO). Doc: `docs/sondas-intake.md` en kanai-app.
- Las recetas son dato del proyecto: `sondas/probes.yaml` del KB de up1 (9 sondas, 7 repos en el catálogo). kanai-app solo aporta los tipos (`kind`), registrados en `server/probes/engine.ts` (`OBJECT_KINDS` por objeto y `REQUEST_KIND_FNS` a nivel pedido) y validados en `server/probes/spec.ts`.
- Se disparan en `plan_ticket` (`server/dispatch/planTicket.ts`, `intakeProbesStep`) con el flag `KANAI_INTAKE_PROBES`. El motor extrae los objetos del pedido por nombre técnico, etiqueta de negocio o i18n, y corre los kinds sobre ellos.
- Una tarjeta sin decidir **frena el intake** (`needs_probe_decisions`) hasta resolverla; DET-45 no deja aprobar el spec con tarjetas pendientes ni con una variante sin su REQ.
- El gate (recheck) compara el punto donde nació la rama contra HEAD y suma a la evidencia solo lo que el trabajo agregó. No agrega llamadas LLM.
- Medición y mantenimiento: kn-tassadar (clasifica hallazgos tardíos y corre el backtest `scripts/probes-backtest.mts`), kn-probes (arma y repara el `probes.yaml`), `probe_health` (avisa si una sonda quedó ciega) y `probe_metrics`.
- kn-dredd, en un PR sin ticket de Kanai, corre las sondas sobre el commit base y guarda las tarjetas que habrían salido (`probes_backtest`). Solo lee.

**Tools de Kanai relevantes.** `run_probes`: solo lectura, sin LLM, no requiere ticket de Kanai; recibe el texto del pedido y los objetos con sus operaciones. `open_probe_cards`: igual pero abre tarjetas para un ticket. `probe_health` y `probe_metrics`.

**Detective mode** (`skills/claude/kn-detective-mode`): toma tickets de Jira y arma el detalle exhaustivo verificado contra el código, en 5 fases, persistido en el KB del sprint. Verifica con subagentes tres dimensiones de plataforma (permisos, historial, convenciones: `references/up1-mod-dimensions.md`) y la frontera core/mod (Aduana, fase 2bis). **No menciona sondas.**

**Pre-intake y otros pasos de `plan_ticket`:** triage previo (`KANAI_INTAKE_TRIAGE`), pre-intake (`KANAI_PREINTAKE_GATE`, pide datos si el pedido está sub-especificado), nivelación pre-plan y planner proporcional (`KANAI_PLANNER_PROPORTIONAL`: fix e improvement salen con spec mínimo). El nivel de autopilot del ticket decide si el intake frena y pregunta (`manual`, `per_session`) o procede (`autonomous`).

## Datos de adopción (probe_metrics de up1, 2026-10-09)

- Desde la primera corrida (2026-09-30) **solo 1 ticket de Kanai pasó por las sondas**, con 6 tarjetas.
- De esas 6 tarjetas decididas, 3 fueron útiles (50%) y 3 ruido (no aplica por irrelevante). Tiempo medio hasta decidir: 1,9 min. Corrida de sondas: unos 9 segundos y 0 tokens.
- **25 hallazgos S0 a S2 de revisiones sin ticket de Kanai** desde esa fecha: ese trabajo no pasó por las sondas y no se puede medir.
- Eficacia sobre 4 hallazgos tardíos de ese ticket: 3 fueron escapes en una categoría con sonda por tarjeta incompleta y 1 quedó fuera de toda sonda. No hay backtest corrido, así que no hay recall medido.
- Ahorro de tokens: no se estima, la muestra es chica (1 ticket con sondas, 10 de referencia sin sondas).

**Lectura.** El intake llega a pocos tickets de up1, porque buena parte del trabajo entra por Jira sin ticket de Kanai. Y la mitad de las tarjetas actuales son ruido. Esas dos cosas condicionan cualquier integración: agregar tipos de sonda al intake sirve solo a los tickets que pasan por él, y cada tipo nuevo puede sumar ruido que frena el intake. La muestra es de un solo ticket, así que son indicios, no conclusiones.

## Cómo encaja cada comprobación

| Comprobación | Tipo de sonda propuesto | Se dispara cuando el pedido... | Reutiliza |
|---|---|---|---|
| 1. Guardas de consultas (`query-guards`) | por objeto | lee o escribe el objeto (sin operaciones corren las sondas de contexto) | `write-paths` ya busca el objeto en `logic/*.resolver.js` |
| 2. Claves de columnas (`column-keys`) | por objeto | toca listas, columnas o campos nuevos | el catálogo ya carga `lang/es/{objeto}` clave `column` (`catalog.fieldLabels`) |
| 3. Relaciones de listas (`list-relations`) | por objeto | toca una lista o una FK | lectura de `config/layouts` |
| 4. Alcance organizacional (`org-scope`) | por objeto, requiere `core.repo` | crea u opera un objeto con FK o polimórfico | el recorrido de FK de `reference-coherence` |

Los parámetros específicos de up1 (vocabulario de guardas por mod, campos de sistema, ancla `organization`) irían en el `probes.yaml`, no en kanai-app. Cada tipo necesita además: entrada en `PROBE_KINDS` (`spec.ts`), nombre de trabajo en `labels.ts`, categoría en la tabla de kn-tassadar, glob validado para `probe_health` y pruebas.

**Riesgos técnicos sin resolver:**
- El catálogo carga solo los objetos de los mods (`catalog.repos` y `objects/**/*.json`). La comprobación 4 necesita también los objetos del core (por ejemplo `orgunit`) para recorrer el grafo. No se verificó si el catálogo los resuelve.
- La sonda de prueba está escrita en Python y habría que portarla a TypeScript. El atlas del MCP sería una segunda implementación, en JavaScript.
- Las sondas por objeto se activan cuando el pedido nombra objetos; no hacen barridos por mod.

## Mejoras a detective mode

1. En la fase 2 (contexto por capas), llamar a `run_probes` con los objetos del ticket. Es de solo lectura y sin tokens. Funciona para tickets de Jira sin ticket de Kanai.
2. Las tarjetas entran al `detalle.md` en una sección "Señales de sondas", con archivo como evidencia.
3. En las dimensiones 1 (permisos) y 3 (convenciones) de `up1-mod-dimensions.md`, las señales reemplazan la lectura del subagente donde la sonda cubre el caso; el subagente conserva lo que la sonda no ve.
4. En Aduana (2bis), las comprobaciones 2 y 3 apuntan a archivos del mod y la 4 al core: orienta si el ticket es solo del mod o necesita core.
5. Detective mode solo lee y no abre tarjetas. Las decisiones se toman después, en el intake del ticket planificado, para no decidir dos veces.

## Opciones para el intake

El objetivo es que las comprobaciones lleguen a más trabajo sin recargar el intake. Las opciones no se excluyen.

- **A. Más tipos en el mismo paso, con disparo por vocabulario.** Cada tipo declara palabras del pedido (lista, columna, consulta, permiso) y solo corre si aparecen, como el parámetro `trigger` de `code-pattern`. Cada tarjeta decidida se reutiliza en otros tickets si los archivos no cambiaron.
  - Pros: no cambia el flujo, entra al spec como REQ de variante, DET-45 y el recheck del gate ya funcionan.
  - Contras: cada tarjeta sin decidir frena el intake; con 50% de ruido medido, 4 tipos nuevos pueden empeorarlo. Solo alcanza a tickets con ticket de Kanai.
- **B. Tarjetas informativas que no frenan.** Un nivel nuevo en las tarjetas: las informativas se muestran en el resumen del plan y no exigen decisión.
  - Pros: cero fricción para el dev.
  - Contras: cambio en el modelo de tarjetas, en DET-45 y en las métricas; riesgo de que nadie las lea.
- **C. Skill extra a demanda ("barrido" por objeto o por mod).** Una skill delgada que llama a `run_probes` sobre una lista de objetos o un mod y entrega un informe, sin ticket de Kanai. `kanai_guide` la recomienda ante frases como "revisar la consistencia del mod" o al planificar un sprint.
  - Pros: llega al trabajo que no pasa por el intake (los 25 hallazgos sin ticket), sirve para descubrir candidatos a ticket, no frena nada.
  - Contras: depende de que alguien la invoque; otro punto de entrada que mantener.
- **D. Enganchar donde ya hay camino sin ticket:** el backtest de kn-dredd sobre PRs sin ticket y el recheck del gate (reporta solo lo agregado).
  - Pros: sin fricción en el intake, alcanza a PRs de otros devs, es el modo "bloquear solo lo nuevo".
  - Contras: la señal llega al PR y no al planificar.
- **E. Paso nuevo aparte en `plan_ticket`.** Un bloque previo al planner, distinto de las sondas, con salida compacta.
  - Pros: control total del formato.
  - Contras: duplica el mecanismo de las sondas (tarjetas, decisiones, métricas, salud); descartada salvo que A y B no alcancen.

**Recomendación:** A (con disparo por vocabulario) más C (barrido a demanda), y aprovechar D sin cambios. Dejar B para después de medir el ruido por tipo. Descartar E.

**Condición para A:** medir antes, con el backtest de kn-tassadar sobre los tickets de referencia (143 a 152) y los recientes, cuántas tarjetas por ticket agregaría cada tipo y cuántas serían ruido. Un umbral aceptable de ruido es una decisión de negocio pendiente: hoy es 50% sobre 6 tarjetas.

## Fases propuestas

Sin estimar. Los riesgos van primero y cada fase deja el sistema funcional.

- **F0, medir y probar bloqueantes.** Confirmar si el catálogo resuelve objetos del core. Correr el backtest de tassadar sobre la línea base. Salida: tarjetas por ticket que agregaría cada tipo, ruido esperado y recall sobre hallazgos reales. Si el ruido es alto, ajustar disparos o descartar tipos antes de programar.
- **F1, `query-guards`.** Evidencia más madura (UPONE-2036). Validación: sobre `develop` reproduce 12 de 30 consultas guardadas en academic-scheduling y las 3 sin justificación. Agrega `probe_health` y pruebas.
- **F2, `column-keys` y `list-relations`.** Validación: los 8 campos de UPONE-2038 y las 4 relaciones de UPONE-2039.
- **F3, detective mode.** Cambio en `SKILL.md` y `up1-mod-dimensions.md`. Validación: detallar un ticket conocido (UPONE-2038) y comprobar la sección de señales con evidencia.
- **F4, `org-scope`.** Depende de F0. Validación: marca `requirement` sin camino.
- **F5, skill de barrido (opción C).** Validación: un barrido de academic-scheduling lista los mismos hallazgos que la sonda de prueba.

## Decisiones abiertas

1. Qué opciones de intake se adoptan (A, B, C, D, E).
2. Umbral de ruido aceptable por tipo de sonda y quién lo revisa.
3. Si detective mode llama a `run_probes` siempre o bajo confirmación (recomendado: siempre, es barato y de solo lectura).
4. Granularidad de la guarda en `query-guards`: por archivo (como la sonda de prueba) o por función. Recomendado empezar por archivo, separando "abierta declarada" de "sin guarda" y mostrando la limitación en la tarjeta.
5. Una sola implementación del flujo de Kanai en TypeScript (tipos de sonda) y el atlas del MCP como herramienta aparte, o compartir lógica.
6. Qué hacer con el trabajo que no pasa por Kanai (los 25 hallazgos sin ticket): C y D lo cubren en parte; falta decidir si se promueve que más tickets de up1 entren por `plan_ticket`.

## Qué no está verificado

- No se ejecutó ninguna sonda nueva dentro de Kanai: todo se basa en la lectura del motor, el `probes.yaml` y las tools.
- La adopción medida es de un ticket; no hay base para estimar ruido o ahorro con confianza.
- No se probó que el catálogo resuelva objetos del core ni cómo se comportan las tarjetas con 4 tipos más.
- No se midió el recall de las 4 comprobaciones contra hallazgos tardíos reales: los 4 tickets reproducidos (UPONE-2036, 2038, 2039, 2061) ya eran conocidos.
