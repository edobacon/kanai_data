---
id: DOC-kb-sp11-UPONE-1770-cierre-de-alcance-y-correcciones
project: up1
type: doc
module: curriculum-mapping
tags:
  - sp11
  - curriculum-mapping
  - UPONE-1770
  - alcance
  - decisiones
  - correccion
---

# UPONE-1770 - cierre de alcance y correcciones

Cierre del alcance de UPONE-1770 tras revisarlo contra la maqueta del PO (ver `UPONE-1770 - referencias visuales de la maqueta`) y el código real. **Este documento es la versión autoritativa del alcance; supera las secciones del `UPONE-1770-detalle` que se listan abajo como corregidas.**

> Contexto: al detallar el ticket aparecieron tres imprecisiones arrastradas por el detalle generado. Dos eran artefactos (no requerimientos del PO) y una era una mala lectura de "malla". El único punto cross-mod real (D1) quedó verificado. La maqueta muestra el estado final de TODA la función de tributación (1756 + 1770 + 1771 + ...); 1770 es solo una parte de ella.

## Alcance de 1770 (firme, todo curriculum-mapping)

1. **Guardado en conjunto y transaccional** (upsert de `CompetencyAlignment` por `(planId, matrixId)`, reemplazo total; la pantalla trabaja como sesión Guardar/Descartar).
2. **Peso del eje 1**: `contributionPercentage` en la escritura gobernada + validación por fila (0 a 100, 2 decimales) + R-6 (solo Evaluates/Both pesan). La columna **sigue nullable** (obligatoriedad condicional, no siempre existe; ver "Origen del nullable").
3. **Reparto en partes iguales** (client-side, G-6).
4. **Estado automático/manual del grupo derivado** (no persistido).
5. **Vista "Por malla"** dentro de tributación (asignaturas por período). **Interna de curriculum-mapping**, dibujada con `planEntry` (código, nombre, período) que el mod ya lee vía `alignmentView.resolver.js`.
6. **Vía masiva**: "Agregar asignaturas" a una competencia y "Agregar competencias" a una asignatura (troceo backend, AD-12).
7. **Deuda MCP (solo test)**: extender el test de paridad para `contributionPercentage`; el cierre real es de los tickets de MCP de cm (`blockGenericMutation`).

## Fuera de 1770

- **D1 - Validación "suma 100 al publicar el plan"**: cross-mod hacia curriculum-design, su propio ticket (ver abajo).
- Indicadores y versionado del plan (**UPONE-1771**); outcomeAlignment y retiro (**UPONE-1772**); migración de niveles (**UPONE-1773**).

## Decisiones (D1-D5)

| Punto | Decisión |
|---|---|
| D1 - Guard de suma al publicar | **Fuera de 1770**, ticket cross-mod aparte. Requerimiento **verificado** del PO. |
| D2 - Asignar desde la malla | **Corregido: cm-interno**, dentro de 1770. NO es cross-mod (era mala lectura). |
| D3 - Gate del peso por institución (R-9) | **Eliminado**: legacy, no aplica (ver abajo). |
| D4 - Paridad MCP del peso | Solo test; cierre real en el contrato MCP de cm. |
| D5 - Story Points | 13 (apropiado con el alcance firme; el ticket vuelve a ser el follow-up completo). |

## Las tres correcciones (por qué el detalle arrastraba imprecisiones)

### 1. El nullable del peso NO es "opcional" arbitrario
Es regla de dominio del PO (detalle de 1756, §7): el peso nace `null` porque `Develops` no mide, un nodo que consolida no forma grupo, y una asignatura única no reparte. Es **obligatoriedad condicional** ("requeridos condicionales por sourceType"). 1770 mantiene la columna nullable y agrega la obligatoriedad condicional (suma 100 por grupo medible, validada al publicar). No hacer la columna NOT NULL.

### 2. R-9 (gate del peso por institución) queda FUERA
Es conducta de **legacy** (flag de `imp_courses_competencies`, observado en `false`). **Hoy no existe en up1**: el único parámetro de tenant del mod es `cm.displayDecimals`. No hay mecanismo vivo. El peso aparece donde el modelo de medición lo usa (matrices `WeightedAvg`; en `Max` no hay peso). Si el PO quiere reintroducir el gate, es un parámetro nuevo con default apagado. Por ahora **no aplica** y no es una decisión de 1770.

### 3. D2 "asignar desde la malla" es cm-interno, no cross-mod
La maqueta muestra "Por malla" como un **modo de vista de la propia tributación**, no la malla curricular de curriculum-design. cm ya lee `planEntry` con período/posición, así que dibuja esa vista solo. **No hay reuso del componente `CurriculumMesh` de cd, ni punto de extensión, ni dependencia cíclica.** El análisis previo de componente compartido/1b queda descartado.

## D1 verificado (no es alucinación)

A diferencia de los dos artefactos anteriores, D1 está escrito en **tres fuentes del PO**:
- Plan de división de tickets del PO (`UPONE-1756-plan-po.html`): "validación de suma 100 por grupo al publicar el plan (grupos con Max eximidos)".
- La maqueta del PO.
- La descripción de Jira de 1770: "la suma se valida al publicar".

Es cross-mod real: la publicación del plan (Curriculum a Vigente) es de curriculum-design. Lo que queda es una decisión **técnica** (cómo implementar el gate sin acoplamiento cíclico: interceptor de core vs lectura acoplada), no de producto. Matiz menor a confirmar con el PO por cortesía: bloqueo duro vs aviso (la maqueta lo dibuja como indicador; "validación al publicar" se lee como gate).

## Deuda observada (UI)

**El selector de asignatura se cuela en la vista solo lectura.** Hoy la vista de tributación (solo lectura) muestra el selector de asignatura, y no debería: pertenece al editor (ahí la asignatura es necesaria para asignar, en los dos modos, malla y competencia). El arreglo: quitarlo de la vista solo lectura. A ubicar en qué ticket (la vista solo lectura pesa hacia 1771; el editor es 1756/1770).

## Secciones del detalle que quedan superadas por este cierre

- "Decisiones abiertas" del `UPONE-1770-detalle`: el **gate por institución (R-9)** ya no es decisión (eliminado, legacy). La **paridad MCP** queda como test (D4). Los **encauses cross-mod D1/D2** cambian: D2 no es cross-mod; D1 sale a ticket aparte.
- "Frontera core/mod (Aduana)" y `UPONE-1770-aduana`: el veredicto sobre la **asignación desde la malla** (fila "sin precedente de reuso", cross-mod hacia curriculum-design) queda **corregido**: es cm-interno. El resto de la aduana (mod-only sin core) sigue válido.

## Referencias

- Referencias visuales: `UPONE-1770 - referencias visuales de la maqueta` (10 capturas en `sp11/`).
- Contrato base: `UPONE-1770-detalle` (leer con este cierre encima). Frontera: `UPONE-1770-aduana`.
- Origen del peso y del nullable: `UPONE-1756-detalle-tecnico` §7. División de tickets del PO: `UPONE-1756-plan-po`.
