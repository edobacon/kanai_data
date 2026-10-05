# Verificación solo en macOS; Linux y Windows aplazados

Fecha: 2026-10-05. Decisión del usuario. Reemplaza la decisión anterior de verificar Claude Code en macOS, Linux y Windows desde la primera entrega.

## Decisión

- La ejecución del plan y toda su verificación (suites, smoke de Claude Code, juez final) ocurren en macOS.
- La verificación real en Linux y Windows queda fuera de este plan y se hará después de la implementación, como seguimiento aparte.

## Qué se mantiene

- El código sigue con diseño portable: sin depender de fcntl, Bash, chmod ni rutas POSIX, para no tener que rehacerlo cuando se verifique en Linux y Windows.
- La matriz por sistema (F1.C2) documenta los mecanismos; macOS queda verificado y Linux y Windows marcados como diseño sin verificar.
- La documentación 1.1 declara de forma explícita que Linux y Windows no están verificados.

## Consecuencias en el plan

- Se quitó el criterio de asignar responsables de Linux y Windows en F0.
- F7 pasó a "Validación integral en macOS y juez final".
- El juez final verifica que el pendiente de Linux y Windows quede declarado.
- Riesgo asumido: el diseño portable puede fallar al probarse después en otros sistemas.

## Dato relacionado para F0.2

En esta máquina conviven Python 3.9.25 (python3 de la terminal) y 3.14.4 (registrado en el análisis). Antes de 3.12, unittest sale con código 0 cuando corre 0 tests; los mínimos de tests por fase cubren ese caso. La versión soportada se fija en F0.2.
