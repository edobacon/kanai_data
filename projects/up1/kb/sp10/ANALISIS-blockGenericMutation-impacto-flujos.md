---
id: DOC-kb-sp10-ANALISIS-blockGenericMutation-impacto-flujos
project: up1
type: doc
module: mcp
tags:
  - sp10
  - mcp
  - blockGenericMutation
  - analisis
  - impacto
  - flujos
---

# blockGenericMutation: analisis de impacto sobre los flujos de escritura del MCP

Complemento de `DOC-kb-sp10-PLAN-blockGenericMutation-mcp`. El plan razona a nivel objeto; este documento baja el analisis a nivel FLUJO (tool por tool) y responde: ¿cuales flujos de escritura del MCP se rompen, cuales no, y donde queda un cruce peligroso? Verificado contra el codigo real.

## 1. Repo y punto verificado

`up1/mcp` en `git HEAD 7407b2d` ("Merged in fix/curriculum-mapping-pack-rename (pull request #14)"). Mods activos sincronizados en `src/mods/`: curriculum-design, curriculum-mapping, academic-scheduling.

## 2. Los tres patrones de escritura reales

Toda escritura del MCP cae en uno de tres patrones. El impacto de `blockGenericMutation` depende del patron, no del objeto en abstracto.

1. **Generica cruda** — `up1_create_object` / `up1_update_object` (`generic-tools.js:92-119`) y `up1_delete_object` (`delete-with-impact.js`, a mano). Llaman `CREATE_INSTANCE`/`UPDATE_INSTANCE`/`DELETE_INSTANCE` del object-manager (`graphql-client.js:100-116`). Es el punto donde se inserta el enforcement.
2. **Dominio (`*Validated`/resolver propio)** — fichas de mod que declaran `field` con una mutation de dominio. NO tocan las genericas.
3. **Upsert a mano con genericas** — una tool de dominio escrita a mano que por dentro usa las mutations genericas. Unico caso: `as_set_rule_value`.

## 3. Inventario por flujo y veredicto

| Flujo (tool) | objectType | Via real | ¿Lo afecta el bloqueo? |
|---|---|---|---|
| `up1_create_object` / `up1_update_object` | cualquiera | Generica | Si, por diseño (aca vive `governedCheck`) |
| `up1_delete_object` | cualquiera | Generica (a mano) | Si, segundo punto de enforcement |
| `cd_create_formtemplate_for_activity` | FormTemplate | Dominio (`createFormTemplateForActivity`) | No |
| `cd_add_plan_entries_batch` | planEntry | Dominio (`createPlanEntriesBatch`) | No |
| `cd_remove_plan_entries_batch` | planEntry | Dominio (`deletePlanEntriesBatch`) | No |
| `as_set_section_instructors` | ScenarioSection | Dominio (`setSectionInstructorsPerBlock`) | No |
| `as_set_section_resources` | ScenarioSection | Dominio (`setSectionResourcesManually`) | No |
| `as_set_section_timeblocks` | ScenarioSection | Dominio (`setSectionTimeBlocksManually`) | No |
| `as_run_scenario` | Scenario | Dominio (`runScenario`) | No |
| `as_set_rule_value` | RuleSetRule | Upsert a mano con genericas | No (ver seccion 4) |

curriculum-mapping no tiene tools de escritura (`ai/index.js` declara `tools: []`): su unica via de escritura por MCP hoy es la generica cruda.

## 4. El punto fino verificado: as_set_rule_value NO se auto-rompe

`as_set_rule_value` es el unico caso ambiguo: es tool de DOMINIO pero por dentro usa las mutations GENERICAS (`rule-value-upsert.js:63-65`, patron `LIST_INSTANCES` -> `UPDATE_INSTANCE || CREATE_INSTANCE` sobre `RuleSetRule`).

Se verifico si el enforcement propuesto la atraparia a si misma. **No la atrapa.** Se registra con `server.registerTool` propio (`rule-value-upsert.js:31`) y llama `up1.request(UPDATE_INSTANCE, ...)` directo: **no pasa por `registerOne`** ni carga `governedCheck`. Como el enforcement vive solo en `registerOne` (fichas genericas) y en el handler de delete, esta tool queda POR FUERA del chequeo.

Consecuencia deseada: si mañana se declara `blockGenericMutation` sobre `RuleSetRule`, se cierra el `up1_update_object` crudo pero la tool de dominio del mod sigue viva. El diseño (marca solo en las dos fichas genericas, nunca en fichas de mod) protege correctamente a las tools de dominio, incluso a la que usa genericas por dentro.

## 5. Veredicto por grupos

- **No se afectan (todos los flujos de dominio actuales).** curriculum-design entero y las 4 tools de escritura de academic-scheduling escriben por mutation propia. Cero cambio de comportamiento.
- **Se rompe a proposito, sin flujo que dependa de eso.** curriculum-mapping es read-only; su unica via de escritura de `CompetencyNode`/`PerformanceScale`/`DevelopmentLevel` por MCP es el generico crudo, que es justo lo que el bloqueo cierra. No hay tool de dominio que se rompa porque no existe ninguna. Pendiente de confirmar: que ningun agente estuviera escribiendo esos objetos por generico como workaround.
- **Cero impacto por opt-in.** `Scenario`/`ScenarioSection` (abiertos a proposito) y todo objeto sin contrato: no se tocan salvo declaracion explicita.

## 6. Riesgo remanente (granularidad, no flujo)

De los flujos que existen hoy, ninguno se rompe de forma NO intencional. El unico cruce a vigilar es `RuleSetRule`: si se decide bloquearlo, el bloqueo por `objectType` cierra el generico crudo pero `as_set_rule_value` lo sigue usando por dentro, con lo cual la deduplicacion `(ruleSetId, ruleDefinitionId)` queda dependiendo SOLO de esa tool, no del backend. No rompe nada, pero no cierra el hueco del todo: es la deuda N2 que marca el plan. Fix limpio: escalar esa constraint al resolver (N3) antes o junto con el bloqueo.

## 7. Conclusion para el plan

El paso 0 (auditoria) del plan puede arrancar con esta certeza: la superficie de flujos afectables es minima y esta acotada a las tres tools genericas. Ninguna tool de dominio actual (cd_*, as_set_section_*, as_run_scenario, as_set_rule_value) se ve tocada por el mecanismo. El primer caso real (B-CM-1, `CompetencyNode`) no tiene tool de dominio que colisione. El unico objeto que exige decision de diseño previa (bloquear ahora vs escalar a N3 primero) es `RuleSetRule`.
