---
id: DOC-kb-sp13-plan-verificador-sondas-y-barrido
project: up1
type: doc
module: mcp
tags:
  - sp13
  - plan
  - verificador
  - sondas
  - intake
  - kanai
  - detective-mode
  - barrido
  - fases
  - decisiones
  - multi-proyecto
---

# Plan: verificador de consistencia en el intake (sondas) y barrido a demanda (opciones A y C)

Plan de implementación de las opciones **A** (más tipos de sonda en el intake, con disparo por vocabulario) y **C** (skill de barrido a demanda) del documento "Verificador de consistencia: integración con Kanai (detective mode, intake y sondas)", misma carpeta. Incluye la mejora a detective mode. **Versión 4: el plan deja de ser exclusivo de up1.** El diseño es genérico (aplica a cualquier proyecto con `sondas/probes.yaml`) y up1, taomangalam y jormat son configuraciones con su propia calibración. **Estado: aprobado, sin iniciar. Nada implementado.**

El plan tiene dos partes: **Parte I, diseño genérico** (vive en `kanai-app`) y **Parte II, configuración y calibración por proyecto**. Durante la implementación, el diseño genérico también se documenta en `kanai-app/docs/sondas-intake.md`, que es donde ya se documentan las sondas y no depende de up1.

---

# Parte I. Diseño genérico

## Objetivo

Que las comprobaciones de consistencia entre capas (guardas de puntos de entrada, claves de idioma por campo, relaciones de listas y alcance por organización) lleguen al trabajo del equipo en tres momentos, sin recargar el intake y en cualquier proyecto que las configure:
1. **Intake:** como sondas por objeto que solo se disparan cuando el pedido trata de la superficie que revisan.
2. **Detalle de tickets (detective mode):** como señales deterministas que se incorporan como evidencia.
3. **A demanda:** como un barrido por objeto o por repo, sin ticket de Kanai, para descubrir candidatos a ticket y cubrir el trabajo que entra sin pasar por el intake.

## Principio de generalización

Se separan tres cosas, que hoy en el plan de up1 estaban mezcladas:
- **El mecanismo (código en `kanai-app`):** el tipo de sonda, su motor y sus tools. No sabe nada de un proyecto concreto.
- **La fuente de datos (adaptador):** de dónde salen los puntos de entrada o los objetos: GraphQL más resolvers, OpenAPI, decoradores de un framework, objetos JSON.
- **La convención (parámetros en el `probes.yaml` del proyecto):** vocabulario de guardas, plantilla de claves de idioma, ancla de organización, repos calibrados. Es dato del proyecto.

Regla: un tipo se generaliza cuando conocemos su comportamiento en al menos dos proyectos; si solo lo conocemos en uno, queda marcado como ligado a esa convención y no se abstrae a ciegas.

## Estado del motor (verificado leyendo el código y los proyectos)

- El motor ya es multi-proyecto. El catálogo admite varias fuentes: up1 usa objetos de sus mods; taomangalam usa un OpenAPI (`catalog.source: openapi`, 54 objetos). Los parámetros de cada sonda viven en el `probes.yaml` del proyecto.
- Registro de tipos: `OBJECT_KINDS` en `server/probes/engine.ts`, `PROBE_KINDS`, `REQUEST_KINDS`, `CORE_KINDS` y `VALIDATED_GLOB_PARAMS` en `server/probes/spec.ts` (zod). `labels.ts` da el nombre de trabajo de la tarjeta, `kn-tassadar` tiene la tabla de categorías y el backtest, `kn-probes` mantiene el `probes.yaml`.
- Un tipo por objeto es `(ctx, obj, input) => { signals, scanned }`. Los de escritura devuelven vacío si el pedido no escribe el objeto; los nuevos deben correr también en pedidos de solo lectura. `runKind` captura excepciones.
- El disparo por vocabulario (`trigger`) existe solo en `code-pattern`.
- El catálogo se indexa por `title` y `reference-coherence` ignora FK a objetos fuera del catálogo.
- `run_probes` exige `objects` (al menos uno), no usa el flag del intake y no hay tool que liste los objetos del catálogo. El intake extrae los objetos del pedido con `extractProbeObjects`.
- Jormat no tiene `probes.yaml` (`probe_health` lo confirma); taomangalam sí, con 9 sondas genéricas.

## Tipos de sonda: qué es genérico y qué no

| Tipo | Clasificación | Fuentes y parámetros | Notas |
|---|---|---|---|
| `entry-guards` (antes `query-guards`) | **Genérico, con adaptadores** | Fuente de puntos de entrada: `graphql` más resolvers (up1), `openapi` (taomangalam), `decorators` (jormat, NestJS). Vocabulario de guardas, frases de "abierta declarada", glob de implementación | Comprueba que cada punto de entrada de lectura tenga guarda. Se valida primero con la fuente `openapi` en taomangalam |
| `field-keys` (antes `column-keys`) | **Parametrizable** | Plantilla de clave (`column.<campo>`), ruta de los archivos de idioma, idiomas, campos de sistema | Aplicable a otros proyectos solo si usan claves de idioma por campo; se confirma en F0 |
| `list-relations` | **Ligado a up1** (Layen) | `layoutConfig.relations` y `relationDisplayFields` | Se generaliza cuando otro proyecto tenga una convención equivalente |
| `org-scope` | **Ligado a up1**, con ancla parametrizable | Ancla (`organization`), exentos, marcadores polimórficos | Requiere FK en el catálogo. Taomangalam no tiene aislamiento por tenant que se haya visto (solo un campo `tenant` de analítica en el esquema), por lo que no aplica ahí |

Los tipos nuevos arrancan con `enabled: false` y se activan por proyecto tras medirlos.

## Componentes transversales (genéricos desde el inicio)

1. **`trigger` para tipos por objeto.** Patrón o lista en minúsculas sin tildes, con el mismo chequeo de regex peligrosas que `code-pattern`. Una sonda omitida por `trigger` no cuenta como ciega.
2. **`run_probes` extendido.** `objects` opcional (se extrae del pedido con el mismo extractor del intake y la respuesta lista `unknownObjects`) y un parámetro de barrido de un repo completo del catálogo. Compatible hacia atrás.
3. **Mejora a detective mode.** Ver sección siguiente.
4. **Skill `kn-scout`** de barrido a demanda.
5. **Marca de calibrado por repo en el `probes.yaml`** (por ejemplo `calibrated: [academic-scheduling, ...]`), en lugar de una lista fija de mods en la skill. Si el repo del barrido no está marcado, la skill advierte.

## Mejora a detective mode

Detective mode (`skills/claude/kn-detective-mode`) verifica el código con subagentes que leen archivos, en 5 fases: ingesta de Jira, contexto por capas, frontera core/mod (Aduana), frescura y documentos en el KB. Hoy no usa las sondas. La mejora agrega las señales como **evidencia determinista** junto a esa lectura. Es genérica: se activa si el proyecto tiene `probes.yaml` y queda "N/A + motivo" si no. Dispara automática (D8) y se registra en el reporte.

**Fase 2, contexto por capas: paso nuevo "2ter · Señales de sondas".**
1. Derivar los objetos del ticket y sus operaciones desde la descripción. Con `run_probes` extendido los extrae Kanai; mientras tanto el agente los deriva y `unknownObjects` avisa los que no están.
2. Llamar a `run_probes` (solo lectura, sin tokens, unos 9 segundos medidos en up1). Registrar la revisión leída: las sondas leen `origin/<rama por defecto>` o `refs`, no el trabajo local.
3. Entregar las señales a los subagentes como pistas verificadas por máquina: "confirma o refuta con file:line y concentra tu lectura en lo que las sondas no ven".
4. Sin `probes.yaml` o sin señales: sección "N/A + motivo".

**Fase 2bis, Aduana (solo proyectos con frontera core/mod, hoy up1).** Las señales alimentan al subagente de Aduana como pista; no lo reemplazan. En proyectos sin esa frontera, el paso se omite.

**Fase 3, frescura.** Cada señal se clasifica como verificada, pendiente o contradicción, contra Jira y contra el código. Caso real (up1): UPONE-2036 sigue en Backlog, pero 12 de 30 consultas ya están guardadas tras el arreglo de UPONE-1611.

**Fase 4, documentos.** El `detalle.md` suma "Señales de sondas" (sonda, objeto, qué levanta, evidencia, revisión leída, frescura, implicación); si son muchas, las relevantes quedan ahí y el resto va a un anexo `<TICKET>-senales-de-sondas.md` (D10). En tickets propios, las señales entran al pre-intake como hipótesis.

**Fase 5, gate y cierre.** Las señales sin resolver pasan a Decisiones abiertas. Las convenciones durables son candidatas al KB normativo, con OK del dev. La línea de cierre suma "N señales de sondas, K verificadas".

**Pieza acotada.** "Solo las señales de sondas" de un ticket.

**Qué no cambia:** detective mode no abre ni resuelve tarjetas ni edita el `probes.yaml`; no reemplaza a los subagentes ni a Aduana; si el ticket después se planifica en Kanai, el intake vuelve a correr las sondas y no se arrastran decisiones.

**Qué cambia por proyecto:** la clave del ticket (UPONE, TAO, JOR), la carpeta del KB donde se guardan los documentos y, si existen, las dimensiones propias del proyecto (hoy `up1-mod-dimensions.md`). El paso genérico no debe nombrar a up1.

**Archivos que cambian** (`kanai-app`): `skills/claude/kn-detective-mode/SKILL.md` y sus referencias (`context-and-verification.md`, `ticket-template.md`, `output-scheme.md`, `up1-mod-dimensions.md`), `docs/skills.md` y `tests/unit/skills.test.ts` si cambia el contrato.

**Valor y límites:** menos lectura redundante de los subagentes y señales reproducibles con evidencia. El ahorro de tokens **no está medido** y no se promete; F3 lo mide con y sin el paso. Las sondas ven estructura, no semántica ni UI ni lógica de negocio.

## Fases

Cada fase deja el sistema funcional, con su validación. Tamaños relativos (intuición, no medidos): S, M, L. Antes de implementar, leer `kanai-app/CLAUDE.md` y pasar la paridad de CI del repo (lint, typecheck, pruebas, `docs:check` y `pnpm docs:catalog` cuando cambian los catálogos).

### F0. Spike multi-proyecto y criterios (M)

Riesgos primero. Solo lectura, sin código de producto.
- [ ] **Taomangalam (primero).** Averiguar: (a) cómo se aplica la seguridad declarada en `server/contract/openapi.yaml` (`security: []` para públicos y `[{}, {bearerAuth: []}]` para opcionales) en el servidor: framework, dónde se registran las rutas y dónde se verifica el token; (b) si la app Flutter usa claves de idioma por campo y dónde (hoy hay un lint `no_hardcoded_ui_text` en `app/custom_lint`); (c) si hay aislamiento por organización o tenant más allá del campo de analítica. Salida: ver si `entry-guards` con fuente `openapi` es viable y si `field-keys` aplica.
- [ ] **Up1.** Spike del catálogo con el core: `run_probes` sobre un objeto con FK al core (por ejemplo `Section` hacia `OrgUnit`) y leer cómo se comporta `reference-coherence`; deja la evidencia de D4.
- [ ] **Jormat (solo lectura).** Confirmar que las guardas por decorador (`@UseGuards(AuthGuard, CapabilitiesHydrationGuard, CapabilitiesGuard)`) son uniformes por controlador y cómo se ve una ruta pública o sin guarda.
- [ ] **Conjunto de referencia por proyecto:** up1: UPONE-2036, 2038, 2039, 2061 más los tickets 143 a 152 de `metrics.baseline`; taomangalam: tickets conocidos con problemas de permisos o de claves; jormat: a definir en F9.
- [ ] Confirmar criterios de D2 y que `KANAI_INTAKE_PROBES` está activo en el entorno de prueba.

Validación: documento actualizado con la evidencia por proyecto. **Si el spike de taomangalam muestra que `entry-guards` con fuente `openapi` no es viable, se reabre el diseño del tipo antes de seguir** (el criterio es del dev).

### F1. `trigger` para tipos por objeto (S a M)
- [ ] Contrato y aplicación en `runProbes`, validación en `spec.ts`, la sonda omitida no es ciega.
- [ ] Pruebas en `tests/unit/probes-engine.test.ts`: con y sin `trigger`, con lista, con patrón inválido.

Validación: las 9 sondas actuales de up1 y las de taomangalam se comportan igual.

### F2. `run_probes` extendido (M)
- [ ] `objects` opcional con extracción desde el pedido; `unknownObjects` en la respuesta.
- [ ] Parámetro de barrido de un repo completo del catálogo; salida compacta y opción `json`.
- [ ] Pruebas de ambos caminos; actualizar descripción, `docs/sondas-intake.md` y la nota de `kn-probes`.

Validación: con el texto de UPONE-2038 detecta `Section`; con barrido sobre `academic-scheduling` recorre sus 31 objetos en un tiempo comparable al intake. **Y en taomangalam** extrae objetos del OpenAPI desde el texto de un ticket TAO real.

### F3. Detective mode llama a `run_probes` (S a M)
- [ ] Implementar lo descrito en la sección de detective mode, con el paso genérico (sin nombres de up1), Aduana condicional y claves de ticket por proyecto.
- [ ] Documentos y pruebas de skills.

Validación: tickets de up1 (UPONE-2038, 2039, 2036 por frescura, y un control sin señales) **y al menos un ticket TAO de taomangalam** con las 9 sondas actuales. Medir tiempo y llamadas con y sin el paso. Depende de F2 solo para la extracción automática.

### F4. `entry-guards` (M a L)

Se parte en tres sub-fases, validando primero fuera de up1.
- [ ] **F4a. Fuente `openapi` y validación en taomangalam** (según el spike): comprobar cada operación de lectura contra su guarda. Parámetros: vocabulario de guardas y glob de implementación en el `probes.yaml`. Backtest sobre tickets TAO y revisión manual de las señales para medir ruido.
- [ ] **F4b. Fuente `graphql` más resolvers para up1:** asociar cada operación de `type Query` al resolver cuyo archivo la define (clave al inicio de línea) y clasificar en guardada (directa o por helper), abierta declarada o sin guarda. Backtest sobre `develop`: academic-scheduling 12 guardadas, 16 abiertas declaradas y 2 sin guarda; curriculum-design 1 sin guarda (`validateActivityEvaluations`); curriculum-mapping 9 de 9 guardadas.
- [ ] Registro en `PROBE_KINDS`, `OBJECT_KINDS`, `VALIDATED_GLOB_PARAMS`, `labels.ts` y tabla de `kn-tassadar`; documentar el contrato de adaptadores en `docs/sondas-intake.md` y `kn-probes`.
- [ ] Pruebas con fixtures por fuente. Debe correr también en pedidos de solo lectura.
- [ ] La limitación visible en la tarjeta: la guarda se atribuye por archivo (D5).
- [ ] La fuente `decorators` (jormat) queda para F9.

Validación: señales reproducibles en las dos fuentes, medidas contra el conjunto de referencia. Salida: tipo disponible con `enabled: false` en los `probes.yaml` reales hasta F8.

### F5. `field-keys` y `list-relations` (M)
- [ ] `field-keys`: propiedades que el selector de columnas ofrece (excluye `id`, JSON y arreglos y campos de sistema) frente a las claves por campo del archivo de idioma. Parametrizable (plantilla de clave, ruta, idiomas, campos de sistema). Un objeto sin archivo de idioma da una señal agregada. Se implementa para up1 y se aplica a otro proyecto solo si F0 confirmó la convención.
- [ ] `list-relations` (ligado a up1): FK frente a `layoutConfig.relations` y `relationDisplayFields`; marca aparte las FK visibles como columna.
- [ ] Registro, documentación, categorías de tassadar y pruebas.

Validación (up1): reproduce los 8 campos de Sección (UPONE-2038), las 4 relaciones de `section-list.json` (UPONE-2039) y `executionUnitId` visible sin relación en `default_Activity_list.json`. Taomangalam: según F0.

### F6. Skill de barrido `kn-scout` (M)
- [ ] `skills/claude/kn-scout/SKILL.md` y entrada en `server/skills/registry.ts`; entrada: proyecto, repo, objetos o combinación. Usa `run_probes` con barrido y presenta tarjetas agrupadas por repo y sonda. Advierte si el repo no está marcado como calibrado en el `probes.yaml` (D6).
- [ ] Salida: informe en el KB y borrador de texto para Jira (D7). **No crea ni publica tickets.**
- [ ] `kanai_guide` la recomienda ante frases de barrido o de planificación; pruebas en `tests/unit/guide-skills.test.ts`; `docs/skills.md`; confirmar que sus tools están en el perfil.

Validación: un barrido de academic-scheduling lista los mismos hallazgos que la sonda de prueba; un barrido en taomangalam corre y respeta la marca de calibrado.

### F7. `org-scope` (L, ligado a up1)
- [ ] Grafo no dirigido de FK hasta el ancla (parametrizable, por defecto `organization`), profundidad, primer salto directo o inverso, marca de polimórficos y lista de exentos.
- [ ] Leer los objetos del core dentro del tipo, sin cambiar el catálogo global (D4), con `core.repo` (`CORE_KINDS`). Documentar la aproximación frente al filtro real del core.
- [ ] Pruebas con fixtures (directo, solo inverso, sin camino, polimórfico) y de regresión de `reference-coherence`.

Validación: marca `requirement` e `instructionalcomponenttype` sin camino y los polimórficos con camino inverso. No aplica a taomangalam.

### F8. Activación gradual y medición por proyecto (M)
- [ ] Backtest de kn-tassadar (`scripts/probes-backtest.mts`) por proyecto, con el borrador que activa cada tipo; registrar recall y tarjetas antes y después.
- [ ] Activar tipo por tipo y proyecto por proyecto (`enabled: true`) si cumple D2, con OK del dev y a través de `kn-probes`.
- [ ] `probe_health` limpio; a las dos semanas, `probe_metrics` por proyecto (línea base de up1: 6 tarjetas y 50% de ruido sobre 1 ticket; la de los demás se mide, no se hereda).
- [ ] Documentar el cierre y dejar entrada en el worklog.

### F9. Incorporar jormat (M)
- [ ] Crear el `probes.yaml` mínimo de jormat con `kn-probes` (catálogo, sondas genéricas útiles) con OK del dev.
- [ ] Fuente `decorators` para `entry-guards` (NestJS): controlador y método frente a `@UseGuards` y vocabulario de guardas, con la guarda a nivel de clase o de método.
- [ ] Conjunto de referencia, backtest y activación como en F8.

Validación: `entry-guards` produce señales útiles en un tercer proyecto con otra fuente. Esto cierra la regla de generalización: dos o más proyectos validados.

## Decisiones

Todas **confirmadas por el dev el 2026-10-09**.

| # | Decisión | Resolución |
|---|---|---|
| A / C | Alcance de la integración | Adoptar A y C; descartar E; B para después de medir |
| G1 | Cómo generalizar | **Híbrido (C):** genérico ya lo barato (F1, F2, F3, F6 y `entry-guards`); `field-keys` parametrizable; `list-relations` y `org-scope` ligados a up1 hasta que otro proyecto los necesite. Descartados: todo genérico desde el inicio (riesgo de abstraer mal con un solo proyecto calibrado) y solo up1 (retrabajo seguro) |
| G2 | Proyecto de validación | **Taomangalam primero** (ya tiene `probes.yaml` y un catálogo OpenAPI), luego up1 y después jormat. Riesgo conocido: el valor medido de las comprobaciones viene de up1 y taomangalam puede tener menos señales; F0 lo aclara antes de invertir en F4 |
| G3 | Organización del plan | Un documento en dos partes (genérica y por proyecto). El diseño genérico se replica en `kanai-app/docs/sondas-intake.md` al implementar |
| G4 | Marca de calibrado | Por repo, dentro del `probes.yaml` de cada proyecto |
| D1 | Enumeración de objetos | Extender `run_probes` (extracción desde el texto y barrido). Descartadas: listarlos con tools de lectura (frágil y dependiente del LLM) y una tool nueva de listado |
| D2 | Umbral de ruido y tarjetas | **Por proyecto.** Medir en el backtest; criterio provisional: ruido no mayor al 50% actual de up1 y como máximo una tarjeta nueva por ticket en promedio sobre el conjunto de referencia del proyecto |
| D3 | Nombre de la skill | `kn-scout` |
| D4 | Objetos del core | Leerlos solo dentro de `org-scope`, sin cambiar el catálogo global (evita regresiones de `reference-coherence` y colisiones de título como `Section`). Es lógica de up1 |
| D5 | Guarda | Por archivo en v1, con la limitación visible; por función solo si aparecen falsos negativos reales |
| D6 | Alcance del barrido | Parametrizable por proyecto; por defecto los repos marcados como calibrados; en up1 son academic-scheduling, curriculum-design y curriculum-mapping |
| D7 | Informe | KB más borrador para Jira con confirmación; no crear tickets |
| D8 | Disparo en detective mode | Automático en proyectos con `probes.yaml`, registrado en el reporte, más la pieza acotada |
| D9 | Orden de detective mode | Temprano (F3), justo después de `run_probes` extendido |
| D10 | Señales en el detalle | Las relevantes en `detalle.md` y el resto en un anexo |

## Riesgos

| Riesgo | Qué puede fallar | Mitigación |
|---|---|---|
| Abstraer mal con un solo proyecto calibrado | Un adaptador pensado para GraphQL no sirve para OpenAPI o decoradores | Híbrido (G1), F0 en tres proyectos y la regla de las dos validaciones antes de generalizar |
| Taomangalam con pocas señales o sin aplicabilidad | Las comprobaciones se calibraron sobre up1: si taomangalam no usa guardas por consulta ni claves por campo, la validación no sirve | F0 lo decide antes de F4; si no es viable, se valida con jormat y se reabre el orden |
| Ruido en el intake | Los tipos nuevos suman tarjetas que frenan `plan_ticket`; hoy el 50% es ruido en up1 | `trigger`, activación gradual, D2 por proyecto y reuso de decisiones |
| Alcance del intake | Solo llega a tickets con ticket de Kanai | `kn-scout` y detective mode |
| Cambio de contrato de `run_probes` | Lo usan `kn-probes` y detective mode | Parámetros opcionales, compatibilidad hacia atrás y pruebas de ambos caminos |
| Extracción de objetos errónea | Toma un objeto equivocado o no encuentra el correcto | La respuesta lista detectados y desconocidos; se registran en el detalle |
| Señales desactualizadas | Leen una revisión, no el trabajo local | Registrar la revisión y clasificar frescura en la fase 3 |
| Detective mode acoplado a up1 | Nombres de Aduana, claves UPONE y `up1-mod-dimensions` en el paso genérico | Paso genérico sin nombres de up1; Aduana y dimensiones condicionales al proyecto |
| Falsos positivos al calibrar | Convenciones distintas por repo o mod | Parámetros en el `probes.yaml`, fixtures con casos que ya fallaron y backtest antes de activar |
| Regresión en tipos existentes | Cambiar motor o catálogo altera las 9 sondas actuales | Pruebas existentes verdes en cada fase y regresión de `reference-coherence` |
| Sondas ciegas | Cambia una convención y la sonda levanta cero señales sin avisar | `VALIDATED_GLOB_PARAMS` y `probe_health` por cada glob nuevo |
| Muestra chica | No se puede concluir sobre ruido ni ahorro | No prometer ahorro; medir por proyecto |
| Doble implementación | La sonda de prueba está en Python y el atlas del MCP en JavaScript | Una sola implementación en TypeScript; la sonda de prueba es referencia, no producto |

## Medición del éxito

Por proyecto: tarjetas nuevas por ticket, parte útil contra ruido (`probe_metrics`), recall del backtest sobre el conjunto de referencia, hallazgos que el barrido y detective mode detectan sin ticket, tiempo de la corrida (hoy unos 9 segundos con 0 tokens en up1) y costo de detective mode con y sin el paso. Transversal: cuántos proyectos tienen al menos un tipo nuevo activo con ruido dentro del umbral (meta: 2 o más).

## Reglas de ejecución

- Una fase a la vez, validada antes de seguir. Commit por fase, mostrando repo, mensaje y archivos antes de commitear; sin push sin pedido explícito.
- Los cambios en `sondas/probes.yaml` de cualquier proyecto se hacen con `kn-probes` y OK del dev, con las tools del KB, nunca editando el store a mano.
- Después de cambiar tipos de sonda, tools o skills hay que reiniciar el MCP de Kanai.
- Si aparece un hallazgo imprevisto, se informa antes de abordarlo.

## Checklist maestro

- [ ] F0 Spike multi-proyecto (taomangalam primero) y criterios
- [ ] F1 `trigger` para tipos por objeto
- [ ] F2 `run_probes` extendido (validado en up1 y taomangalam)
- [ ] F3 Detective mode genérico (validado en up1 y taomangalam)
- [ ] F4a `entry-guards` con fuente `openapi` en taomangalam
- [ ] F4b `entry-guards` con fuente `graphql` en up1
- [ ] F5 `field-keys` y `list-relations`
- [ ] F6 Skill `kn-scout`
- [ ] F7 `org-scope` (up1)
- [ ] F8 Activación gradual y medición por proyecto
- [ ] F9 Incorporar jormat y fuente `decorators`

## Archivos que se tocarían

En `kanai-app`: `server/probes/engine.ts`, `spec.ts`, `labels.ts`, `server/probes/kinds/` (cuatro tipos nuevos más los adaptadores de fuente), `server/mcp/probesTools.ts`, `server/skills/registry.ts`, `server/llm/guide.ts`, `skills/claude/kn-detective-mode/` (SKILL y referencias), `skills/claude/kn-scout/SKILL.md` (nuevo), `skills/claude/kn-probes/SKILL.md` y `kn-tassadar/SKILL.md`, `docs/sondas-intake.md` (diseño genérico), `docs/skills.md` y pruebas en `tests/unit/`. En el KB de cada proyecto: `sondas/probes.yaml` (parámetros, marca de calibrado y activación) y el informe de cierre de F8.

---

# Parte II. Configuración y calibración por proyecto

## up1 (calibrado, datos reales)

- Catálogo: 7 repos de mods, `core.repo=object-manager`, 9 sondas actuales, `metrics.baseline` tickets 143 a 152.
- Calibración de las comprobaciones (rama `develop` del 2026-10-08; up1 2c19522, academic-scheduling 3908d9c, curriculum-design 6e2988f, curriculum-mapping a456b14; 90 objetos):
  1. Guardas de consultas: academic-scheduling 30 consultas (12 guardadas, 16 abiertas declaradas, 2 sin guarda: `scenarioCreatedBy` y `scenarioSectionIdsByAssignment`); curriculum-design 3 (2 guardadas, 1 sin guarda: `validateActivityEvaluations`); curriculum-mapping 9 de 9 guardadas.
  2. Claves de columnas: 50 de 135 campos de negocio sin clave (es), en 18 objetos; Section sin 8 campos; 7 objetos de academic-scheduling sin archivo de idioma.
  3. Relaciones de listas: 27 de 43 FK sin relación declarada en 15 layouts.
  4. Alcance organizacional: de 54 objetos, 39 con salto directo, 13 solo inverso y 2 sin camino (`requirement` e `instructionalcomponenttype`).
- Tickets reproducidos: UPONE-2036 (parcialmente arreglado en develop, sigue en Backlog), 2038, 2039 y 2061, y relacionados 2041, 2043, 2007 y 2034.
- Conjunto de referencia, parámetros y calibrados (3 mods) como en las fases; los otros 4 repos (`ai-agent`, `retention-wellbeing`, `uengagement-up1`, `up1-manager`) no están calibrados y el barrido los advierte.
- Medición actual (`probe_metrics`, 2026-10-09): 1 ticket por las sondas desde el 2026-09-30, 6 tarjetas, 3 útiles y 3 ruido (50%), 1,9 minutos promedio hasta decidir; 25 hallazgos S0 a S2 de revisiones sin ticket de Kanai; sin backtest ni estimación de ahorro.

## taomangalam (validación primero)

- Hoy: monorepo, un repo (`taomangalam`, rama `main`), catálogo `openapi` (`server/contract/openapi.yaml`, 54 objetos), esquema Prisma en `server/prisma`, app Flutter en `app/`. Sondas: vías de escritura, perfil por operación, unicidad, reemplazo total, forma de entrada, coherencia de referencias, privilegios de rol (migraciones), lint de docs y docs de superficie. Todas las sondas encuentran su base en el código.
- Lo que se sabe del contrato de seguridad (verificado en el OpenAPI): bearer JWT corto con refresh rotado (DEC-161); los endpoints públicos declaran `security: []` y los de autenticación opcional `security: [{}, {bearerAuth: []}]`.
- **Lo que no se sabe y F0 debe aclarar:** el framework y dónde se verifica el token en el servidor (una búsqueda de `preHandler` y de `requireRole` no devolvió nada); si la app usa claves de idioma por campo (existe un lint `no_hardcoded_ui_text`); si hay aislamiento por organización o tenant (solo se encontró un campo `tenant` de analítica en el esquema).
- Claves de ticket TAO. Detective mode corre aquí con las 9 sondas actuales desde F3.
- Aplicabilidad esperada de los tipos nuevos (a confirmar en F0): `entry-guards` con fuente `openapi` es el candidato principal; `field-keys` depende de la app Flutter; `list-relations` y `org-scope` probablemente no aplican.

## jormat (después)

- Hoy: sin `probes.yaml`. Repos: backend, backend-legacy, frontend, frontend-legacy y monorepo (ramas `main` y `HEAD`).
- Lo que se vio: backend NestJS con guardas por decorador (`@UseGuards(AuthGuard, CapabilitiesHydrationGuard, CapabilitiesGuard)`), usado en controladores como catálogos, customers y guides.
- Se incorpora en F9 con el `probes.yaml` mínimo y la fuente `decorators`. Claves de ticket JOR.

## Documentos relacionados

"Verificador de consistencia entre capas: detalle, contexto, método y ventajas", "Verificador de consistencia: integración con Kanai (detective mode, intake y sondas)", la muestra HTML y el script de la sonda de prueba, todos en esta carpeta.
