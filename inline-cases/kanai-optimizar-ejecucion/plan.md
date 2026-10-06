# Plan inline: Optimizar la ejecución de tickets en Kanai

> Vista generada por Kanai desde plan.yaml y log.ndjson. No la edites a mano: se regenera en cada registro.

**Intención:** Menos rebotes, tokens y tiempo al ejecutar tickets con alcance fijo, cambiando solo el cómo.
**Tags:** repos: kanai-app · tickets: TAO-192, TAO-191 · labels: kanai, ejecucion, gates, optimizacion
**Estado:** 0 de 5 fases cerradas. Juez final: pendiente.

## Registro de avance

| Fase | Meta | Estado | Fecha real | Commits | Criterios | Pendiente |
|---|---|---|---|---|---|---|
| F0 Línea base | Congelar las cifras de TAO-192 y TAO-191 como referencia comparable. | Pendiente | - → - | - | 0/1 | F0.1; F0.2 |
| F1 Diagnóstico de causas | Confirmar contra el código cada causa probable antes de cambiar nada. | Pendiente | - → - | - | 0/1 | F1.1; F1.2; F1.3; F1.4; F1.5 |
| F2 Cambios en la ejecución | Implementar en kanai-app solo los cambios que F1 confirme. | Pendiente | - → - | - | 0/1 | F2.1; F2.2; F2.3; F2.4; F2.5 |
| F3 Pruebas en KT | Validar los cambios con un ticket sintético en KT y repitiendo el gate N3 de TAO-192. | Pendiente | - → - | - | 0/3 | F3.1; F3.2; F3.3 |
| F4 Medición y cierre | Comparar contra la línea base y cerrar el caso. | Pendiente | - → - | - | 0/1 | F4.1 |

## Riesgos

- Cambiar el cálculo del diff del gate puede alterar el veredicto de tickets en curso.
- El MCP debe reiniciarse para que los cambios apliquen.
- Hay cambios ajenos sin commitear en kanai-app.

## Fuera de alcance

- Modificar el alcance, spec o REQs de cualquier ticket existente.
- Hacer push (solo con pedido explícito).

## Fases

### F0. Línea base

**Meta:** Congelar las cifras de TAO-192 y TAO-191 como referencia comparable.
**Esfuerzo:** 1 h

**Registro F0** (estado: Pendiente)
- **Fecha real:** inicio - · fin -
- **Antes de empezar:**
  - [ ] F0-P1: El KB del caso contiene linea-base-tao-192.md.
- **Commits:**
  - Sin commits registrados.
- **Qué se hizo:**
  - **F0.1** pendiente: Validar las cifras de la línea base contra get_execution_summary y get_runs de TAO-192 y TAO-191.
  - **F0.2** pendiente: Completar los 26 runs antiguos que get_runs no devuelve, o declarar el límite en el KB.
- **Criterios cumplidos:**
  - **F0-C1** pendiente (evidence): El KB trae la línea base validada con cifras y límites declarados.
- **No cumplido:**
  - Sin registros.
- **Desvíos del plan:**
  - Sin registros.
- **Hallazgos:**
  - Sin registros.
- **Bloqueos:**
  - Sin registros.
- **Cierre y siguiente paso:** Sin cerrar.

### F1. Diagnóstico de causas

**Meta:** Confirmar contra el código cada causa probable antes de cambiar nada.
**Esfuerzo:** 4 h

**Registro F1** (estado: Pendiente)
- **Fecha real:** inicio - · fin -
- **Antes de empezar:**
  - [ ] F1-P1: F0 cerrada.
- **Commits:**
  - Sin commits registrados.
- **Qué se hizo:**
  - **F1.1** pendiente: Encontrar por qué el sandbox no detecta cambios en la rama de trabajo (rama acumuladora epic/EP-01) en kanai-app.
  - **F1.2** pendiente: Encontrar contra qué base se calcula el diff del gate N3 y por qué incluye lo ya integrado de TAO-191.
  - **F1.3** pendiente: Entender por qué cada ronda del N3 entrega hallazgos nuevos y qué contexto infla el gate de 6,35M tokens.
  - **F1.4** pendiente: Explicar el hueco de 6,4 h y el crecimiento de contexto por lote en S4.
  - **F1.5** pendiente: Guardar en el KB un documento de causas confirmadas con archivo:línea.
- **Criterios cumplidos:**
  - **F1-C1** pendiente (evidence): Cada causa tiene archivo:línea o queda descartada con motivo.
- **No cumplido:**
  - Sin registros.
- **Desvíos del plan:**
  - Sin registros.
- **Hallazgos:**
  - Sin registros.
- **Bloqueos:**
  - Sin registros.
- **Cierre y siguiente paso:** Sin cerrar.

### F2. Cambios en la ejecución

**Meta:** Implementar en kanai-app solo los cambios que F1 confirme.
**Esfuerzo:** 1 a 2 días
**Cómo deshacerla:** Revertir los commits de la rama; no hay migraciones ni datos.
**Cambia código:** sí (no cierra sin commits registrados)

**Registro F2** (estado: Pendiente)
- **Fecha real:** inicio - · fin -
- **Antes de empezar:**
  - [ ] F2-P1: F1 cerrada y causas confirmadas en el KB.
  - [ ] F2-P2: Rama feat/optimizar-ejecucion creada desde setup.
- **Commits:**
  - Sin commits registrados.
- **Qué se hizo:**
  - **F2.1** pendiente: Calcular el diff del gate N3 contra la base real de las dependencias integradas.
  - **F2.2** pendiente: Hacer que el sandbox detecte los cambios de ramas acumuladoras y deje evidencia de que corrió.
  - **F2.3** pendiente: Hacer que la primera ronda del N3 agote hallazgos y que los reruns revisen solo lo corregido.
  - **F2.4** pendiente: Recortar el contexto del gate y avisar cuando un ticket supere un umbral de tamaño, sin cambiar su alcance.
  - **F2.5** pendiente: Correr typecheck, lint y la suite de kanai-app, y commitear por tarea.
- **Criterios cumplidos:**
  - **F2-C1** pendiente (command): Typecheck, lint y suite de kanai-app pasan sin fallas nuevas.
- **No cumplido:**
  - Sin registros.
- **Desvíos del plan:**
  - Sin registros.
- **Hallazgos:**
  - Sin registros.
- **Bloqueos:**
  - Sin registros.
- **Cierre y siguiente paso:** Sin cerrar.

### F3. Pruebas en KT

**Meta:** Validar los cambios con un ticket sintético en KT y repitiendo el gate N3 de TAO-192.
**Esfuerzo:** 4 h

**Registro F3** (estado: Pendiente)
- **Fecha real:** inicio - · fin -
- **Antes de empezar:**
  - [ ] F3-P1: F2 cerrada y MCP de Kanai reiniciado.
- **Commits:**
  - Sin commits registrados.
- **Qué se hizo:**
  - **F3.1** pendiente: Crear en KT un ticket sintético chico que dependa de otro ya integrado, para reproducir diff heredado y rama acumuladora.
  - **F3.2** pendiente: Ejecutar el ticket sintético y medir sandbox, hallazgos repetidos, rondas y tokens del gate.
  - **F3.3** pendiente: Repetir el gate N3 de TAO-192 sobre su rama y comparar contra la línea base.
- **Criterios cumplidos:**
  - **F3-C1** pendiente (evidence): El sandbox corre y deja evidencia en el ticket sintético.
  - **F3-C2** pendiente (evidence): Cero hallazgos por diff heredado en el ticket sintético y en la repetición de TAO-192.
  - **F3-C3** pendiente (evidence): El gate N3 aprueba en 2 rondas o menos con menos de 1M de tokens por gate.
- **No cumplido:**
  - Sin registros.
- **Desvíos del plan:**
  - Sin registros.
- **Hallazgos:**
  - Sin registros.
- **Bloqueos:**
  - Sin registros.
- **Cierre y siguiente paso:** Sin cerrar.

### F4. Medición y cierre

**Meta:** Comparar contra la línea base y cerrar el caso.
**Esfuerzo:** 1 h

**Registro F4** (estado: Pendiente)
- **Fecha real:** inicio - · fin -
- **Antes de empezar:**
  - [ ] F4-P1: F3 cerrada.
- **Commits:**
  - Sin commits registrados.
- **Qué se hizo:**
  - **F4.1** pendiente: Guardar en el KB la comparación final contra las metas y las señales de mejora pendientes.
- **Criterios cumplidos:**
  - **F4-C1** pendiente (evidence): El KB trae la tabla final contra las metas, con los incumplidos explicados.
- **No cumplido:**
  - Sin registros.
- **Desvíos del plan:**
  - Sin registros.
- **Hallazgos:**
  - Sin registros.
- **Bloqueos:**
  - Sin registros.
- **Cierre y siguiente paso:** Sin cerrar.
