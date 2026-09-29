---
id: DOC-kb-sp11-DECISION-guard-publicacion-interino-y-retiro-con-BRE
project: up1
type: doc
module: curriculum-design
tags:
  - sp11
  - curriculum-design
  - curriculum-mapping
  - object-manager
  - UPONE-1770
  - D1
  - G-2
  - D4
  - BRE
  - motor-de-reglas
  - decision
  - interino
  - deuda-tecnica
  - condicion-de-retiro
---

# Decisión: guard de suma al publicar (interino en curriculum-design) y su retiro al llegar el motor de reglas (BRE)

> **Estado:** Decisión tomada. Interino **aprobado por plataforma/core** (respuesta del lead, 2026-09-23) como solución puente "por deprecar" hasta que exista el motor de reglas del core (BRE). Este documento registra el alcance intencional, los puntos débiles conocidos del interino, cómo el BRE los cubre, y la condición para aplicar el cambio definitivo.
>
> **En una frase:** el guard de "suma = 100 al publicar el plan" (D1) se implementa ahora como un guard interino en curriculum-design (opción B) para desbloquear el negocio; es deliberadamente parcial, y debe migrarse al BRE cuando el core lo tenga.

## El caso

Al publicar un plan de estudios (transición del plan de Aprobado a Vigente), cada grupo de pesos de tributación debe sumar 100 (los grupos de matrices con consolidación `Max` quedan eximidos; solo participan las tributaciones `Evaluates`/`Both`, R-6). Es requerimiento verificado del negocio (maqueta, plan de división y descripción de UPONE-1770). La regla es simple; la dificultad es que **el momento** (publicar) vive en curriculum-design y **el dato** (los pesos, en `CompetencyAlignment`) vive en curriculum-mapping. Análisis completo del caso y las alternativas en `Pendiente cross-mod - Guard de suma al publicar el plan (D1, derivado de 1770)` y en el artefacto `Guard de publicación del plan` (sp11).

## La decisión

1. **Ahora (interino, opción B):** implementar el guard en curriculum-design, como un `assertCurriculumWeightsOnPublish` sumado a la cadena de asserts pre-delegación del override de `updateInstance` (`logic/polymorphicUpdate.resolver.js`, rama no-rt, al lado de `assertActivityEvaluationsOnPublish`). Lee las tributaciones del plan por Prisma, agrupa por `(planId, competencyNodeId, developmentLevelId)`, exime `Max`, suma `Evaluates`/`Both`, y aborta la publicación si un grupo no da 100.
2. **End-state (definitivo):** cuando exista el BRE (motor de reglas del core, en desarrollo), la regla se registra ahí desde el módulo dueño (curriculum-mapping) y el guard interino de curriculum-design se retira.

## El alcance es intencional (no es un hueco por descuido)

- D1 se sacó de la ejecución de TICKET-149 (UPONE-1770) **a conciencia**: 149 es cm-interno y D1 es cross-mod hacia curriculum-design. Está declarado "fuera de alcance" en 149 y en sus Adendas 2 y 4.
- El interino se elige **a conciencia** como puente: la solución correcta es de core, el core la está construyendo (BRE), y no se debe construir un mecanismo paralelo. Mientras tanto se necesita avanzar.
- El core **aprobó explícitamente** el interino como "función por deprecar". No es un workaround silencioso: es una decisión registrada con condición de retiro.

## Puntos débiles del interino (conocidos y aceptados)

| Punto débil | Detalle | Por qué se acepta |
|---|---|---|
| **No cierra la escritura de atrás (G-2)** | El guard frena la publicación, no la escritura del peso. Un peso inválido escrito por GraphQL directo o el bulk-edit del core queda en la base; el error recién aparece al publicar, tarde y lejos de la causa. | El bloqueo del asistente MCP ya está puesto (blockGenericMutation), así que el vector real es acotado. La ventana de inconsistencia es tolerable como puente. |
| **Acoplamiento curriculum-design → curriculum-mapping** | Hoy curriculum-design no lee ningún objeto de curriculum-mapping (verificado). El guard lo estrena, quedando mutuo con la lectura cm→cd existente. | Es un read por Prisma (no un ciclo de imports, no frágil al orden de carga) y es temporal. |
| **Conocimiento de cm hardcodeado en cd + lógica duplicada** | El modelo (`CompetencyAlignment`, `contributionPercentage`, la clave de grupo), la exención (`courseAggregationMode = Max`, que vive en la matriz) y la regla (suma=100, R-6) pasan a vivir en cd, duplicando parcialmente lógica que ya existe en cm. | Se mantiene el guard mínimo y aislado para que retirarlo sea trivial. |
| **El gate debe ser por tenant, no por el permiso del usuario que publica** | El guard aplica solo si el cliente tiene tributación (existencia del modelo). NO gatear por `competencyalignment:view` del usuario que publica: un administrador curricular puede publicar legítimamente sin ese permiso de lectura, y gatear por él abre un hueco (no bloquea) o un bloqueo falso (no puede publicar). La lectura de cm se hace por Prisma directo (chequeo interno de integridad, no sujeto al RBAC de lectura de cm). | Es la forma correcta y está registrada como criterio del ticket. |
| **Solo cubre la transición Aprobado→Vigente** | No cubre borrado/edición de tributación por vías genéricas (parte de G-2). | No es el objetivo del guard; queda para el BRE. |
| **Es descartable** | Al llegar el BRE, el guard se migra o se borra; parte del esfuerzo es temporal. | Es el precio explícito del puente. |

## Cómo el BRE cubre el caso (end-state)

El BRE (motor de reglas del core, en desarrollo) es el mecanismo que hoy no existe: correr validaciones de negocio pre-escritura, incluidas las que cruzan tablas y las que corren en una transición de estado. Cuando esté, la regla de suma se registra ahí desde curriculum-mapping (su dueño), y eso resuelve, de raíz, cada punto débil del interino:

| Punto débil del interino | Cómo lo resuelve el BRE |
|---|---|
| No cierra G-2 | La regla corre server-side en la ranura pre-escritura para toda puerta (UI, API, GraphQL directo, bulk del core). El peso no se puede escribir mal por ninguna vía. |
| Acoplamiento cd→cm | Desaparece: curriculum-mapping registra su propia regla; curriculum-design no lee cm ni sabe de tributación. |
| Conocimiento de cm en cd + duplicación | El permiso, el modelo y la regla viven en curriculum-mapping. Sin duplicación. |
| Gate capability/tenant | Inherente: la regla la aporta el módulo dueño; un cliente sin tributación simplemente no tiene regla registrada. |
| Solo publish | El mismo mecanismo cubre create/update/delete, cerrando también las escrituras (G-2) y el borrado. |
| Paridad MCP (D4) | Con la regla server-side, el asistente MCP deja de duplicarla. |

> **A confirmar con el equipo del BRE (Van):** que su diseño contemple el caso concreto que este guard necesita, es decir **un agregado cross-table (sumar las filas de un grupo de otra tabla) evaluado en una transición de estado**. Las validaciones declarativas actuales del core (`core_ObjectValidation`) NO lo cubren: evalúan sobre los campos del propio registro (json-rules-engine + FormulaJS), sin poder juntar las filas hermanas del grupo ni cruzar a otra tabla. Si el BRE no contempla ese caso, este documento es el requerimiento a aportarle.

## Condición para aplicar el cambio definitivo (disparador de retiro)

**Cuándo:** cuando el BRE esté disponible en el core y soporte el agregado cross-table en una transición (ver "A confirmar" arriba).

**Qué hacer, en ese momento:**
1. Registrar la regla de suma=100 al publicar en el BRE, desde curriculum-mapping (con la exención `Max` y R-6).
2. Retirar el guard interino `assertCurriculumWeightsOnPublish` de curriculum-design (`polymorphicUpdate.resolver.js`).
3. Verificar que el bloqueo sigue firme por todas las puertas (ahora también las de escritura, cerrando G-2) y que el asistente MCP ya no duplica la regla (D4).
4. Cerrar G-2 y D4 como saldadas por el BRE.

**Por qué esto no se olvida:** el guard interino queda marcado en código como deprecable con referencia a este documento y al BRE; y este registro es la fuente que ata el interino a su retiro.

## Referencias (verificado contra el checkout real, 2026-09-23)

- **Punto de enganche del interino:** `curriculum-design/logic/polymorphicUpdate.resolver.js` (rama `!RT_PATTERN`, cadena de asserts antes de `generic.updateInstance`; precedente `assertActivityEvaluationsOnPublish`, UPONE-1381).
- **Transición de publicación:** `curriculum-design/objects/Curriculum.json:126-134` (`{from: Approved, to: Active, requiredCapabilities: [curriculum:publish]}`).
- **Dato y regla del peso:** `curriculum-mapping/logic/helpers/validateCompetencyAlignment.js` (`contributionPercentage` en WRITABLE_FIELDS, `validateContributionPercentageRow`, R-6); `planId = curriculumId`.
- **Límite de las validaciones declarativas del core:** `object-manager/docs/features/validation-rules.md` (facts = campos del propio registro; sin agregación cross-row/cross-table).
- **El modelo existe solo en clientes con tributación:** `object-manager/prisma/<tenant>/schema.prisma` (UPU sí; CONTINENTAL/DEMO01 no).
- **El bypass es trabajo pendiente, no decisión:** commits `7972381` (intento de guard en el mod) y `068ec91` (revert: "se buscará la forma de agregarlo al core"), UPONE-1758; `mcp/src/contracts/generic-write-block.js` (alcance: cierra el MCP, no el bypass cross-client; cierre integral escalado al core).
- **BRE en desarrollo (verificado):** rama `object-manager` `origin/feature/add-rules-engine-core-project` y `MGR-03-VALIDATION-RULES`; specs de BRE en `curriculum... /academic-scheduling/specs/backlog/bre-business-rule-storage.md` y `migracion-ruledefinition-a-bre.md`.
- **Aprobación del interino:** respuesta del lead de plataforma (2026-09-23): "va a ser core... aún no se puede hacer... hacer un resolver custom por este minuto... sería como una función por deprecar".

## Documentos hermanos

- `Pendiente cross-mod - Guard de suma al publicar el plan (D1, derivado de 1770)` (análisis del caso y alternativas).
- `Guard de publicación del plan` (artefacto de presentación, sp11).
- `UPONE-1770 - cierre de alcance y correcciones` (por qué D1 sale de 149).
- `NOTA-guard-publicacion-aporte-al-BRE-retiro-y-ventanas` (aporte al BRE, lista de retiro completa con rutas, orden de merge y ventanas conocidas del interino).

## Vigencia

Verificado el 2026-09-23 sobre la rama de trabajo de curriculum-design y curriculum-mapping y `develop` de object-manager. Caduca / re-verificar cuando el BRE llegue a `develop`: en ese momento este documento pasa de "decisión con interino vigente" a "cambio a aplicar", y su sección de disparador es la checklist de migración.
