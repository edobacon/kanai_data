---
id: DOC-kb-sp11-CM-09-escritura-segura-governedobjects
project: up1
type: doc
module: curriculum-mapping
tags:
  - sp11
  - mcp
  - curriculum-mapping
  - ticket
  - cm-plan
  - detalle
  - governedObjects
  - lockstep
  - fix-gated
  - CM-09
---

# CM-09 · Escritura segura: declarar los 10 governedObjects + activación coordinada — detalle

**Identificador interno:** CM-09 (sin código de Jira todavía; mapear a UPONE-xxxx al crear el issue). Tipo: feature (seguridad) + coordinación. Epic probable: Curriculum Mapping (UPONE-1452) / MCP. Asignado: propio (la declaración) + coordinación con otros equipos. Story Points: 1-2 (cm) + coordinación. Parte de [Plan cm MCP-ready opción mod](PLAN-cm-mcp-ready-opcion-mod). Pre-intake en [CM-09-pre-intake](CM-09-pre-intake). Evidencia de frontera en [CM-09-aduana](CM-09-aduana).

> **Único ticket atado al fix de core.** Se dispara cuando el fix pase verificación. La declaración (parte de cm) es mod-only; la activación es un lockstep multi-repo (ver Dependencias externas).

## 0. Gate de pre-ejecución (OBLIGATORIO antes de arrancar)
Este ticket depende del estado de DOS fixes de core (decisiones **D7** = fix en espera, **D6** = follow-up). NO ejecutar sin correr primero el gate: ver [Gate de validación: estado de los fixes de core](GATE-validacion-estado-fix-core) y [Decisiones para el PO](DECISIONES-PO-estado-verificado).

- **Verificar Check A** (blockGeneric mergeado + verificado en up1/mcp = D7) y **Check B** (interceptores componibles en object-manager = D6). Correr los comandos del gate y registrar abajo con fecha.
- **Decisión (matriz del gate):**
  - Check B implementado -> **reemplazar CM-09**: no declarar el bloqueo defensivo del MCP; migrar las reglas de cm a interceptores del core (pieza de CM-CORE).
  - Check B NO + Check A mergeado y verificado -> **activar CM-09** (declarar los 10 + lockstep).
  - Check B NO + Check A NO (estado a 2026-09-14) -> **no cerrar CM-09 como "seguro" todavía**; opcional pre-declarar (cm queda read-only seguro); la activación real espera a que Check A pase verificación. CM-01..CM-08 avanzan igual.

**Registro del gate:**
- [ ] 2026-09-14 — Check A (D7): NO mergeado (solo en origin/UPONE-1758; develop no tiene generic-write-block.js). Check B (D6): NO implementado. Acción: no activar aún; el resto del plan avanza. Re-verificar al momento de ejecutar.

## 1. Fuente canónica
Sin ticket Jira todavía. Fuente: [Reporte del fix de blockGeneric](Reporte-del-fix-de-blockGeneric-bloqueo-de-escritura-generica-del-MCP-para-core) + [Ticket cm auto-gobierno](Ticket-cm-auto-gobierno-en-el-MCP-sin-modificar-el-core-del-MCP-Camino-1) (Fase 1) + [Solicitud a academic-scheduling](Solicitud-a-academic-scheduling-migrar-as-set-rule-value-a-up1-write).

## 2. Historia de usuario
Como responsable del dato de cm, quiero que ninguna vía del asistente pueda escribir los objetos de cm salteando sus reglas, para que el asistente sea seguro y no solo usable.

## 3. Objetivo
Cubrir la dimensión Escritura segura: declarar `governedObjects` de los 10 objetos de cm (bloqueo defensivo del MCP) y coordinar la activación del bloqueo (lockstep con el motor del MCP y otros mods).

## 4. Contexto (para dimensionar)
- **Fix vs feature:** feature de seguridad + coordinación de despliegue.
- **Qué existe:** el motor del bloqueo (embudo `up1.write` + `assertGenericWriteAllowed`) ya está construido y pusheado en la rama `origin/UPONE-1758` del repo mcp; hoy protege CERO objetos porque falta la declaración de cm. El test `curriculum-mapping-pack.test.mjs` ya está en rojo por esto.
- **Linaje:** cm no puede autoprotegerse por override del genérico (slot de un solo dueño, lo ocupa cd); el bloqueo por declaración es la salida.
- **Gate todo-o-nada:** apenas se declara un objeto, el sync exige decidir los 10.
- **Estado transitorio:** declarar deja a cm read-only por MCP hasta que existan las tools (CM-02..CM-07). No es regresión (hoy no hay escritura segura por MCP).

## 5. Alcance
**Dentro:** declarar los 10 `governedObjects`/`blockGenericMutation` en `ai/` de cm, con mensajes de negocio; coordinar el lockstep de activación (ver Dependencias externas); cablear el gate de completitud como gate de PR; validar en checkout limpio.
**Fuera:** construir las tools (CM-02..CM-07); el arreglo en el core (CM-CORE, follow-up).

## 6. Criterios de aceptación (checkeables)
- [ ] cm declara los 10 objetos como gobernados (`blockGenericMutation` para CompetencyNode/Matrix, PerformanceScale, DevelopmentLevel; `governedObjects` para los 7 satélites).
- [ ] Los mensajes cumplen las reglas del test: contienen "UP1", no nombran el objectType técnico, no contienen `/Instance|mutation|GraphQL|recordType/i`, lenguaje de negocio.
- [ ] `curriculum-mapping-pack.test.mjs` pasa (los 10) y el gate del sync también.
- [ ] create/update/delete genéricos sobre cada objeto se bloquean SIN llamar al backend (incluye alias `rt__`/`ext__` y casing).
- [ ] La activación es coordinada: el motor, la declaración de cm y la migración de academic-scheduling mergean juntos (ver Dependencias externas).

## 7. Definition of Done (checkeable)
- [ ] **Estándar de terminado del equipo:** cada criterio de aceptación tiene test o "N/A" justificado, verificado en el gate de cierre (RULE-dev-013); escritura gobernada por mutations `*Validated`, nunca CRUD genérico ni Prisma directo (RULE-curriculum-design-003, RULE-mcp-011); lógica server-side / MCP-ready, ninguna vía de escritura saltea las reglas (RULE-server-side-logic-mcp-ready); tests unitarios verdes + typecheck (vue-tsc) en checkout limpio (RULE-mods-052, RULE-mods-058); smoke visual para cambios de UI o "N/A" justificado (RULE-curriculum-design-029); RBAC efectivo, un rol sin capability no ejecuta ni ve (RULE-mcp-004, RULE-layout-039); tenant isolation preservado; si toca archivos sincronizados, correr el sync sin dejar artefactos sin generar (RULE-dev-010).
- [ ] Específico de este ticket:
- [ ] Evidencia runtime: intento de escritura genérica sobre un objeto de cm por el asistente -> bloqueado.
- [ ] No-regresión: academic-scheduling (`as_set_rule_value`) sigue funcionando tras el merge.
- [ ] El gate `validate-governed-objects.js` corre como gate de PR (no solo en el build de Docker).
- [ ] Validación en checkout LIMPIO con `npm run sync` + suite completa.

## 8. Tests mínimos (checkeables; ampliables en ejecución)
- [ ] Pack de cm declara los 10; `curriculum-mapping-pack.test.mjs` pasa.
- [ ] Genérico create/update/delete sobre cada objeto -> `BlockedGenericWriteError` sin tocar backend.
- [ ] Alias `rt__`/`ext__` y casing distinto -> igual bloqueado.
- [ ] `as_set_rule_value` tras migrar a `up1.write` -> funciona.

## 9. Factores transversales (checkeables)
- [ ] Logica server-side / MCP-ready: **aplica y es el objetivo** (cierra la vía del asistente).
- [ ] Permisos (RBAC): N/A directo (el bloqueo es por declaración, complementa a RBAC).
- [ ] Convenciones de mod: aplica (contenido enforced de `ai/`).
- [ ] i18n / a11y / Storybook / historial: N/A.

## 10. Frontera core/mod (Aduana)
| Artefacto | Veredicto | Motivo | Fuente |
|---|---|---|---|
| Declaración `governedObjects`/`blockGenericMutation` de los 10 | `mod-only` | Config del pack del mod; el enforcement vive en el cliente GraphQL del MCP, no en un resolver del mod | mods/curriculum-mapping/ai/index.js:38; up1/mcp/src/contracts/generic-write-block.js |

**Veredicto global:** `mod-only` para la declaración, **con dependencias externas de activación** (lockstep multi-repo, ver sección 10bis). No requiere código nuevo de core (el motor ya está construido). Detalle en [CM-09-aduana](CM-09-aduana).

## 10bis. Dependencias externas (avaladas por Aduana)
| Dependencia | Qué es | Repo/equipo | Viabilidad este sprint |
|---|---|---|---|
| Merge del motor del bloqueo (D7) | Rama ya construida (`origin/UPONE-1758`) del motor del MCP; embudo `up1.write` + `assertGenericWriteAllowed` | up1/mcp (plataforma del MCP) | Viable (ya construida); requiere aprobación/merge |
| Migración `as_set_rule_value` | as pasa de `up1.request(CREATE/UPDATE_INSTANCE)` a `up1.write()` | academic-scheduling (otro mod), ~4 líneas | Viable |
| Sync de cd | Sincronizar fixes ya cerrados (a70c3ab) al runtime | curriculum-design (otro mod) | Viable |
| Gate de PR | Cablear `validate-governed-objects.js` como gate de PR | CI del repo mcp | Viable |

**Modo de falla si NO mergean juntos:** motor solo -> bloquea cero (falsa sensación de cierre); motor + cm sin as -> rompe `as_set_rule_value`; un mod sin motor -> `up1.write` no existe, rompe al revés. Por eso es lockstep.

## 11. Dependencias
- **Depende de:** el fix (verificación + merge del motor, D7) y del lockstep de la sección 10bis.
- **Recomendado tras:** CM-02..CM-07 (para no dejar cm read-only mucho tiempo), aunque puede ir antes (cm read-only seguro).

## 12. Estimación
1-2 SP la declaración de cm + coordinación (as ~medio día, gate, validación en limpio). El motor ya está gastado (no lo paga este ticket).

## 13. Decisiones abiertas
- [ ] **D6 / D7 (vía gate, sección 0):** el estado del fix (D7) y del follow-up de core (D6) determina si se activa, se reemplaza o se espera. Estado verificado 2026-09-14: ni el fix está integrado ni el core implementado -> no activar aún.
- [ ] **Timing del disparo:** ¿declarar ya (cm read-only seguro) o junto con las tools? Recomendación: junto con las tools, para no dejar cm read-only.
- [ ] **¿Se cierra bajo el diagnóstico existente (UPONE-1758) o necesita ticket propio de core + follow-up de as?** (a confirmar con el PO). Ver [Decisiones para el PO](DECISIONES-PO-estado-verificado).

## 14. Guía de ejecución: reglas y patrones up1 a considerar
- **[A favor]** El bloqueo es por DECLARACIÓN, no por resolver a mano: el pack declara, el motor enforza en `up1.write`. No reconstruir el guard-resolver revertido (7972381/068ec91). _Fuente: Ticket cm auto-gobierno, sección 0; up1/mcp/src/graphql-client.js:77._
- **[Advertencia]** El mapa base objeto->mutation está en el commit 7972381 (constante GOVERNED); corregir que CompetencyAlignment ya no va en NOT_GOVERNED_YET. _Fuente: git show 7972381:logic/genericWriteGuard.resolver.js._
- **[Gate]** El gate de completitud es todo-o-nada: declarar uno obliga a decidir los 10. _Fuente: up1/mcp/scripts/validate-governed-objects.js._
- **[Transversal]** Correr sync + suite en checkout limpio antes de aprobar. _Fuente: Reporte del fix de blockGeneric, sección 6._

## 15. Tickets relacionados
| Ticket | Qué es | Relación | Estado |
|---|---|---|---|
| CM-02..CM-07 | Tools del mod | La declaración deja cm read-only hasta que existan | Planeados |
| UPONE-1758 | Diagnóstico MCP de cm / rama del motor | El motor del bloqueo vive aquí | Developing (a confirmar) |
| CM-CORE | Arreglo en el core (follow-up) | Reemplazaría el bloqueo defensivo (D6) | No comprometido |

## 16. Referencias
Reporte del fix de blockGeneric, Ticket cm auto-gobierno (Fase 1), Solicitud a academic-scheduling, Gate de validación estado fix core, Decisiones para el PO (D6, D7), up1/mcp (src/contracts/generic-write-block.js, src/graphql-client.js:77, scripts/validate-governed-objects.js), mods/curriculum-mapping/ai/index.js.

## Nota de reajuste (si el core se implementa, Camino B)
**SE ELIMINA.** El override componible del core reemplaza el bloqueo defensivo del MCP; cm deja de necesitar la declaración `governedObjects`. En su lugar aparecería la migración de las reglas de cm a interceptores del core (parte de CM-CORE).
