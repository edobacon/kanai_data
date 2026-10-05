# Segunda prueba real (KT-015): encargo de sesión sin ajustes del host, y H9 en el gate

Fecha: 2026-10-05. Ticket chico en kanai_test (`shout.mjs`: código, tests y README), planificado como 1 sesión con 3 tareas.

## Qué se validó

- **H7 (6d7f5c9)**: el encargo de sesión trae cada tarea rotulada (`### Tarea S1.Tn`), las reglas generales una sola vez y un único contrato de salida con checkpoints. Se le pasó al subagente **tal cual**, sin contrato manual del orquestador, y devolvió exactamente ese formato: un resultado, tres checkpoints con su código correcto.
- El reporte entró **al primer intento**: las tres tareas avanzaron.
- **H8**: cada run quedó con el objetivo de su propia tarea.
- Telemetría registrada una sola vez: 21 s y 85,5 k tokens (sonnet).

## El gate y H9

El primer gate de la sesión **iteró** con dos hallazgos:

1. **Válido**: el criterio pedía 5 casos de test y había 4 (trim y signos configurables en un mismo test). Se corrigió con dos tests separados (6 en total).
2. **H9, defecto de Kanai**: el juez recibía "0 pass / 0 fail" en cada run de subagente. Ese conteo solo se arma con eventos de test, que estos runs nunca tienen, así que siempre daba 0 aunque el subagente hubiera reportado tests en verde. El juez lo leyó como "no corrió nada". Corregido en 1cbe667: con 0 y 0 el rótulo dice "sin conteo observado (lo declarado va en el resumen)", en la lista de runs recientes y en la vista por tarea.

Aparte: el repo de prueba no tiene `package.json`, así que el gate no encuentra cómo correr los tests por su cuenta. Para el re-gate se pasó el comando de verificación `node --test`, que el gate ejecuta y adjunta como evidencia.

## Resultado

Re-gate de la sesión **aprobado**, gate integral del ticket **aprobado**, autocommit b6a1280 en la rama del ticket. KT-015 queda en curso; el cierre es decisión de la persona.

## Lectura para el experimento

- La mecánica del encadenado quedó validada de punta a punta sin intervención del host en el contrato.
- El gate se mostró exigente y con razón en el hallazgo de los casos: la sesión encadenada no aflojó la revisión.
- Siguen siendo muestras chicas (T1): validan mecánica, no ahorro. La medición comparada de F4 sigue pendiente.
