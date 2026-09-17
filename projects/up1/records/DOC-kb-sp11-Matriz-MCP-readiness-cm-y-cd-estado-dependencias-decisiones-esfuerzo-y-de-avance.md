---
id: DOC-kb-sp11-Matriz-MCP-readiness-cm-y-cd-estado-dependencias-decisiones-esfuerzo-y-de-avance
project: up1
type: doc
module: mcp
tags:
  - sp11
  - mcp
  - curriculum-mapping
  - curriculum-design
  - matriz
  - mcp-readiness
  - avance
  - PO
  - metodologia
---

# Matriz MCP-readiness cm y cd: estado, dependencias, decisiones, esfuerzo y % de avance

Consolidacion de sp11 de todo el analisis de cm y cd para el MCP de up1, como matriz operable. **El plan asume el ARREGLO EN EL MODULO** (cada mod se resuelve solo). El arreglo en el core (que cerraria todas las vias y simplificaria a cm) se documenta APARTE en "El arreglo en el core"; no forma parte de este plan. Por cada elemento: estado, si depende del fix (y por que), si depende de una decision (y cual), dependencias con otras tareas, y esfuerzo; mas el % de avance por mod, una seccion de decisiones (que se decide + en que afecta) y un Anexo de metodologia. Existe tambien como artefacto interactivo para el PO. Verificado contra codigo real en cuatro pasadas de auditoria.

## 1. Que significa "MCP-ready" (5 dimensiones)

Un mod esta MCP-ready cuando un agente puede OPERARLO por el asistente igual que un usuario por la pantalla, respetando las reglas y sin corromper datos. Se descompone en 5 dimensiones:
1. **Escritura segura**: el asistente no puede escribir salteando las reglas de negocio.
2. **Escritura completa**: todas las operaciones de escritura del dominio son invocables por el asistente respetando esas reglas.
3. **Integridad**: no hay reglas de negocio que vivan solo en el cliente (que el asistente saltearia).
4. **Lectura**: el agente puede leer el estado agregado del dominio para decidir que escribir.
5. **Guia**: el agente tiene la guia (contratos/fieldDocs) para saber como llenar cada objeto.

## 2. Matriz — curriculum-mapping (cm)

| # | Elemento | Dimension | Estado MCP | Depende del fix? (por que) | Depende de decision? (cual) | Depende de tarea (cual) | Esfuerzo |
|---|---|---|---|---|---|---|---|
| M1 | Declarar governedObjects de los 10 objetos | Escritura segura | Falta | **SI**. El mecanismo (assertGenericWriteAllowed) vive en la rama origin/UPONE-1758; la declaracion es inerte sin el, y el gate + as atan al lockstep. | No (bloquear ya decidido). | Co-integra con M8 (as) y la rama del fix. Deja cm solo-lectura por MCP hasta M2/M3. | 1-2 |
| M2 | Tools de dominio COMPUESTAS (matriz, arbol, adopcion) | Escritura completa | Falta | No. Llaman a *Validated de nombre propio. | No (arreglo en el modulo elegido). | **Requiere M4 (B.4) antes o junto**. Sobrevive aunque despues se haga el arreglo en el core. | 6-10 |
| M3 | Tools de dominio SIMPLES (alignment, adopcion 1-fila) | Escritura completa | Falta | No. | No. | El arreglo en el core (aparte) las volveria innecesarias; en el modulo se construyen salvo que se anticipe ese arreglo. | 1-2 |
| M4 | Cerrar B.4 (+ levelId) en el resolver propio | Integridad | Falta | No. Resolver *Validated de cm. | No | **Prerrequisito de M2** (arbol/rubrica). | 1-2 |
| M5 | Exponer 6 queries de dominio como tools | Lectura | Falta | No. Queries. | No (priorizar) | Independiente; recomendada antes de M2/M3 (leer para decidir). | 2-4 |
| M6 | Contratos/fieldDocs para 7 objetos sin guia | Guia | Parcial 3/10 | No. | No | Se hace junto con exponer cada tool (M2/M3). | 1-2 |
| M7 | Deuda documental (CLAUDE.md/PATTERNS.md) | Guia | Falta | No | No | Independiente; conviene antes (lo lee el agente y Dredd). | 0.5 |
| M8 | Migracion de as_set_rule_value | (dep externa) | Falta | **SI**. Co-inquilino del merge del bloqueo; sin migrar rompe as. | No | Co-integra con M1 (mismo despliegue). | <1 (de as) |
| M9 | Huecos server RM7/RP5 | (fuera de alcance) | Fuera de alcance | No | **SI**: PO. | Independiente. | 2-4 |

## 3. Matriz — curriculum-design (cd)

| # | Elemento | Dimension | Estado MCP | Depende del fix? (por que) | Depende de decision? (cual) | Depende de tarea (cual) | Esfuerzo |
|---|---|---|---|---|---|---|---|
| D1 | Declarar genericWriteAllowed de los 13 objetos | Escritura segura | Falta declarar (ya seguro por N0) | **Soft**. cd ya es seguro por N0; declarar es formalizacion + gate, no condicion de seguridad. | **SI**: 2 preguntas (delete overrides, movePlanEntry). | Despues de resolver las 2 preguntas tecnicas (decisiones 01/02). | 1 + decisiones |
| D2 | Escritura de dominio (generico N0 + 4 tools) | Escritura completa | **Funciona** | No. | No | Ya funciona; pero expone el camino que D3 (prereq) aun no protege. | 0 |
| D3 | Cerrar los 4 gaps client-only | Integridad | Falta | No. Resolvers propios de cd. | No (prereq-en-alta = PRIORIDAD, riesgo vigente). | **El prereq protege el camino de escritura que D2 ya expone -> va primero.** | 5-8 |
| D4 | Construir + exponer queries de dominio (malla, arbol requisitos) | Lectura | Falta (ni existe la agregacion) | No. | **SI**: construir la agregacion. | Habilita D6 (editor de requisitos) y ayuda a validar D3. | 3-6 |
| D5 | Contratos/fieldDocs para 12 objetos | Guia | Parcial 1/13 | No | No | Independiente. | 1-3 |
| D6 | Tools ergonomicas (movePlanEntry, Requirement Editor) | Escritura completa (mejora) | Opcional | No | No | Idealmente despues de D4 (leer el arbol de requisitos). | 2-4 |
| D7 | Sync de los 2 huecos de create | Integridad | **Funciona** (ya sincronizado) | No | No | Ya resuelto. | 0 |

## 4. Dependencias del fix

- **cm depende FUERTE**: hoy todos sus objetos son escribibles salteando las 62 reglas (solo RBAC). Su "escritura segura" (M1) no existe hasta declarar el bloqueo e integrarlo en el lockstep (cm declara + as migra + la rama se mergea juntas).
- **cd depende SOFT**: cd ya es seguro por N0. Declarar genericWriteAllowed (D1) es formalizacion + gate de completitud, no condicion de seguridad.
- **Nada mas depende del fix**: tools (M2/M3), integridad (M4/D3), lectura (M5/D4), guia (M6/D5) son independientes del bloqueo.

## 4.1 Decisiones abiertas (que se decide + en que afecta + quien)

**Decision de fondo RESUELTA:** se hace el arreglo EN EL MODULO (cada mod se resuelve solo). El arreglo en el core (que cerraria todas las vias y volveria innecesarias las tools simples de cm) queda como opcion estructural en el documento aparte "El arreglo en el core". Las decisiones que siguen son puntuales y no bloquean el plan.

1. **cd: el borrado de ciertos objetos no tiene override** (Activity/Curriculum/CurricularSection/Offering). Que se decide: si es intencional (backstop por constraint de DB) o guard faltante. En que afecta: si falta, agregar la validacion antes de declarar D1; si es intencional, se declara. Decide: equipo de cd.
2. **cd: movePlanEntry vs update generico** de position/period. Que se decide: si se cablea el renumerado atomico al generico o se resuelve solo con la mutation dedicada. En que afecta: sin refuerzo, el asistente podria dejar el orden inconsistente moviendo de a una. Afecta a D1 y opcionalmente a D6. Decide: equipo de cd.
3. **cd: construir la agregacion de lectura** (D4). Que se decide: si se construye la lectura de la malla y el arbol de requisitos (hoy no existe) y con que alcance. En que afecta: es la dimension Lectura de cd (~15%); sin ella el agente no lee bien el estado. Habilita D6. Suma 3-6 puntos. Decide: PO + equipo de cd.
4. **cm: huecos server RM7/RP5** (M9). Que se decide: si se implementan la completitud de rubrica (RP5) y el retiro/borrado de matriz (RM7). En que afecta: NO cambian el % de MCP-ready (ni la pantalla ni el asistente las aplican hoy). Mejoras de calidad de datos, no requisito. Decide: PO.
5. **cd: prioridad del prereq-en-alta** (D3). Que se decide: no es diseño sino prioridad: cuando abordarlo. En que afecta: mientras no se cierre, el asistente puede agregar materias violando prerrequisitos via cd_add_plan_entries_batch (ya disponible). Riesgo activo. Decide: PO.

## 4.2 Dependencias ENTRE tareas (orden que imponen)

**cm:**
- **M4 (B.4) es prerrequisito de M2** (tools de arbol/rubrica): esas tools son las que violarian la regla que B.4 cierra.
- **M1 (governedObjects) + M8 (as) co-integran en el mismo despliegue del fix** (lockstep).
- Declarar M1 sin M2/M3/M5 deja a cm de solo-lectura por MCP hasta construirlas.
- M6 (guia) junto con exponer cada tool. M5 (lectura) y M7 (doc) independientes; M5 antes de las escrituras.
- Secuencia sugerida: (M5 + M7) -> M4 -> M2; M1 + M8 en el mismo despliegue; M3 se construye salvo que se anticipe el arreglo en el core.

**cd:**
- **D3-prereq protege el camino que D2 (ya activa) expone hoy -> va PRIMERO.**
- **D1 (postura) despues de las decisiones 01 y 02.**
- **D4 (lectura) habilita D6** y ayuda a validar D3. D5 independiente.
- Secuencia sugerida: D3-prereq -> resolver preguntas tecnicas -> D1 -> D4 -> D6. D5 en paralelo.

## 5. % de avance "MCP-ready" (por mod, independiente)

Ponderacion (ajustable): Escritura segura 20% · Escritura completa 25% · Integridad 20% · Lectura 20% · Guia 15%.

| Dimension | cm (score) | cd (score) |
|---|---|---|
| Escritura segura | 0% | ~85% |
| Escritura completa | ~5% | ~78% |
| Integridad | ~90% | ~65% |
| Lectura | ~15% | ~15% |
| Guia | ~30% | ~10% |
| **AVANCE TOTAL** | **~27%** | **~54%** |

Esfuerzo restante a MCP-ready completo (arreglo en el modulo): **cm ~12.5 a 22.5 SP**, **cd ~12 a 22 SP** (convergen). Rangos orientativos.

Interpretacion: el % de cd bajo respecto de la impresion "casi listo" porque lectura y guia (mitad del trabajo de "operable por MCP") no estaban contadas en los analisis de escritura. Hoy, en ambos mods, un agente puede escribir algo pero NO puede leer el estado agregado para decidir que escribir: ese es el cuello real.

---

## ANEXO A — Metodologia (como se calcula, donde se busca, como se hizo)

### A.1 Como se calcula el %
- Cada dimension se puntua 0-100% segun un criterio propio (A.3), estimado a partir de la evidencia de codigo.
- El total del mod = suma ponderada normalizada: `total = SUM(avance_i * peso_i) / SUM(peso_i)`.
- La ponderacion es editable: cambiar los pesos recalcula el total sin re-auditar.

### A.2 Donde se busca (fuentes verificadas)
- Repos: `up1/mods/curriculum-mapping`, `up1/mods/curriculum-design`, `up1/mcp` (develop y rama origin/UPONE-1758), `up1/object-manager`.
- Por dimension: mecanismo de bloqueo + overrides (segura); resolvers *Validated + tools (completa); frontend contrastado contra server (integridad); queries de dominio + lo que expone el pack + que devuelve el generico (lectura); contratos de campos (guia).

### A.3 Criterio de puntuacion por dimension
- **Escritura segura**: 0 si el generico escribe salteando reglas (cm); alto si N0 (cd). cd -15 por delete sin override no confirmado + postura no declarada.
- **Escritura completa**: fraccion de operaciones de dominio invocables respetando reglas. cm ~5 (tools:[]); cd ~78 (generico N0 + 4 tools; -22 por orquestaciones/move sin tool).
- **Integridad**: fraccion de reglas efectivas enforced donde el MCP escribe. cm ~90 (solo falta B.4); cd ~65 (4 gaps, uno vigente).
- **Lectura**: capacidad de leer el estado agregado. cm ~15 (6 vistas sin exponer); cd ~15 (la agregacion ni existe).
- **Guia**: fraccion de objetos con contrato. cm 3/10 ~30; cd 1/13 ~10.

### A.4 Como se hizo (pasadas de auditoria)
Cuatro relevamientos independientes por mod, leyendo el codigo directo con file:line y verificacion cruzada: (1) gobernanza + tools + N0/N1 + postura; (2) logica client-side (integridad); (3) workflow de guardado; (4) lectura + capa de guia.

### A.5 Caveats
- Los SP son rangos orientativos; la estimacion fina va por la calibracion del proyecto.
- Los % son estimaciones reproducibles con el criterio A.3, no medidas exactas.
- Dos pasadas superficiales se auto-corrigieron con las profundas: "cm cero client-only" -> 1 gap (B.4); "cd casi 1:1" -> 4 gaps. La clasificacion N0/N1 mide enforcement server-side, NO detecta reglas client-only.
- Confirmaciones pendientes que pueden mover scores: las decisiones tecnicas de cd.
- No se audito linea por linea el validador generico de createInstance del object-manager; la fila "requeridos por schema" de cd se asume server-tambien por convencion, marcada como supuesto.

Ver los documentos hermanos de sp11: Ticket cm auto-gobierno, Analisis cd para el MCP, El arreglo en el core, Reporte del fix de blockGeneric, Solicitud a academic-scheduling, Comparativo cm vs cd para el PO. (La "Decision de camino para cm" queda como historico: la decision es el arreglo en el modulo.)
