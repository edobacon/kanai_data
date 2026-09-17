---
id: DOC-kb-sp11-PLAN-cd-mcp-ready-opcion-mod
project: up1
type: doc
module: curriculum-design
tags:
  - sp11
  - mcp
  - curriculum-design
  - plan
  - opcion-mod
  - tickets
  - mcp-readiness
---

# Plan de trabajo cd MCP-ready (opción mod) — índice de tickets CD-01..CD-08

Plan de trabajo COMPROMETIDO para llevar curriculum-design (cd) a MCP-ready por la **opción mod (Camino A)**: cada mod se resuelve solo, sin tocar el motor del MCP ni el core. Es el plan seguro. El fix de core queda CONSIDERADO pero NO bloqueante. Gemelo del [Plan cm MCP-ready opción mod](PLAN-cm-mcp-ready-opcion-mod). Verificado contra código real (file:line). Base: [Análisis cd para el MCP](Analisis-cd-para-el-MCP-paridad-1-1-postura-blockGeneric-y-gaps-client-side) + [Matriz de MCP-readiness](Matriz-MCP-readiness-cm-y-cd-estado-dependencias-decisiones-esfuerzo-y-de-avance).

## 1. Encuadre: cd es el opuesto de cm

- **cd es N0:** sus reglas viven en los overrides del CRUD genérico (create/update/delete), así que el genérico YA pasa por la validación y el asistente por el genérico respeta las reglas. Escritura segura ~85%, y la dependencia del fix es **SOFT** (declarar genericWriteAllowed es formalización, no condición de seguridad).
- **Pero N0 no implica 1:1:** hay **4 reglas de negocio que viven solo en el cliente** y que tanto el genérico como las tools saltean. Por eso cd necesita MÁS trabajo de resolver que cm (4 gaps vs 1) y MENOS de tools (ya tiene 4).
- **Ya funciona (0 SP):** cd expone 4 tools (validar evaluaciones, crear FormTemplate, alta/borrado batch de planEntry) y los 2 huecos de create (Activity/Offering) ya están sincronizados. El genérico N0 reproduce las orquestaciones multi-mutation de la malla.
- **El core (Camino B) NO elimina tickets de cd** (cd ya es cross-client por N0); solo destraba lo estructural. Ningún ticket de cd se descarta si aparece el core; solo CD-07 (declaración) está condicionado al fix, de forma soft.

## 2. Las 5 dimensiones de MCP-ready (cobertura del plan)

1. **Escritura segura** (~85% ya, por N0) → CD-07 (declarar genericWriteAllowed, formalización + gate, soft-fix).
2. **Escritura completa** (~78%, genérico N0 + 4 tools) → ya funciona; mejoras opcionales en CD-03 y CD-08.
3. **Integridad** (~65%, 4 gaps client-only) → CD-01, CD-02, CD-03, CD-04. **Es el trabajo dominante de cd.**
4. **Lectura** (~15%, la agregación NI existe) → CD-05. Cuello real.
5. **Guía** (~10%, 1/13) → CD-06.

Estado de partida (matriz): cd ~54% MCP-ready. El cuello es lectura (~15%) y guía (~10%); el riesgo activo es un gap de integridad (prereq-on-ADD) alcanzable HOY por una tool existente.

## 3. Plan seguro (comprometido, opción mod) — tickets en orden

| # | Ticket | Dimensión | ¿Necesita el fix? | SP | Nota mejor escenario (si core) |
|---|---|---|---|---|---|
| CD-01 | Prerrequisitos/correq/créditos en el ALTA de planEntry | Integridad (riesgo activo) | No | 2-3 | SOBREVIVE (resolver propio) |
| CD-02 | Consistencia K<=N en pools K-de-N | Integridad | No | 0.5-1 | SOBREVIVE |
| CD-03 | Ensamblado del árbol de requisitos por vías | Integridad + escritura | No | 2-3 | SOBREVIVE |
| CD-04 | Cascada de borrado de Groups vacíos | Integridad (higiene) | No | 1 | SOBREVIVE |
| CD-05 | Lectura de dominio: construir + exponer malla y árbol de requisitos | Lectura | No | 3-6 | SOBREVIVE |
| CD-06 | Guía: contratos/fieldDocs (12 objetos sin guía) | Guía | No | 1-3 | SOBREVIVE |
| CD-07 | Postura genericWriteAllowed: declarar los 13 + 2 decisiones técnicas | Escritura segura | SÍ (soft, lockstep) | 1 + decisiones | Se reajusta (si core: migrar override a interceptores) |
| CD-08 | Ergonomía (opcional): exponer movePlanEntry + tools del Requirement Editor | Escritura completa (mejora) | No | 2-4 | SOBREVIVE |

Total del núcleo comprometido (CD-01..CD-07): ~10.5 a 20 SP. Núcleo obligatorio de 1:1 de integridad (CD-01 + CD-02 + CD-07): ~4 a 6 SP. CD-08 opcional.

## 4. Orden de ejecución (sin depender del fix)

1. **CD-01 PRIMERO: es riesgo de integridad VIGENTE**, alcanzable hoy por `cd_add_plan_entries_batch` (una tool ya expuesta). El asistente puede insertar cursos violando prerrequisitos, algo que la UI nunca permite. Prioridad, independiente de todo lo demás.
2. **CD-02 + CD-03 + CD-04**: los otros 3 gaps de integridad.
3. **CD-05**: la lectura (el cuello); requiere decidir el alcance de la agregación.
4. **CD-06**: guía, en paralelo.
5. **CD-07**: cuando el fix pase verificación (gate de pre-ejecución); es formalización, cd ya es seguro.
6. **CD-08**: mejora opcional de ergonomía/atomicidad.

## 5. Plan "mejor escenario" (si el fix de core aparece verificado)

cd cambia poco: es N0, ya cross-client. Ningún ticket se elimina.
- **CD-07 se reajusta:** en vez de declarar genericWriteAllowed (opt-out del bloqueo del MCP), cd migraría su override total a interceptores componibles del core (decisión de diseño abierta: migración gradual vs override que llama al componedor). Es un reajuste de forma, no una eliminación.
- **CD-01..CD-06, CD-08 quedan iguales:** los 4 gaps son resolver propio (el core no los cubre), la lectura y la guía son ejes que el core no toca.

## 6. Lo que cd YA cierra que cm no

Al ser N0, cuando cd cierra un gap en su resolver (CD-01..CD-04), la regla vale para TODAS las vías (pantalla, API, asistente, bulk-edit) a la vez, sin necesidad del core. cd ya es cross-client; el core solo le aporta lo estructural (dejar de ser el dueño único del punto de escritura), que importa para destrabar a cm, no para la correctitud de cd.

## 7. Decisiones abiertas (técnicas, del equipo de cd)
- **Delete sin override** en Activity/Curriculum/CurricularSection/Offering: ¿backstop intencional por constraint de DB o guard faltante? Confirmar antes de declarar todo genericWriteAllowed (afecta CD-07).
- **movePlanEntry vs update genérico** de position/period: ¿se cablea el renumerado atómico al genérico o se resuelve solo con la mutation dedicada? Afecta CD-07 y CD-08.
- **Alcance de la agregación de lectura** (CD-05): qué se construye de la malla y el árbol de requisitos, y con qué alcance (decisión PO + equipo cd).

## 8. Nomenclatura
Los identificadores CD-01..CD-08 son internos de ESTE proceso. Sin código de Jira todavía; se mapea a UPONE-xxxx al crear los issues.
