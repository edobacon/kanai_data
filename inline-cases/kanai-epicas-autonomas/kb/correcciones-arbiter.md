# Correcciones y revisión de implementación

## Alcance y registro

La persona autorizó corregir los hallazgos, repetir el ciclo si aparecen otros y actualizar documentación afectada. Se agregó F11 antes del piloto F10 al mismo caso inline, sin eliminar el historial de fases cerradas.

Commits registrados:
- 80c2d51dcced57d84e5e1802eb9a50ed40689ab4 — fix(epics): enforce canonical integration and autonomous run boundaries.
- bd004db5261a4e72dc49a64155823b9bb4cdaa8d — fix(epics): surface canonical proof infrastructure failures.
- 364eb16afcd35f7fe8879f20f645c00a76e7561e — fix(epics): preserve Git ancestry verifier errors.

## Correcciones

1. Sesiones correctamente reemplazadas y sus tasks/commits dejan de bloquear; el historial conserva su estado original.
2. SHA confirmado debe contener todos los commits canónicos del ticket y pertenecer a la rama de épica; se rechazan SHA base ajeno al trabajo, prueba parcial y prueba ausente. Dependencias y cierre contrastan los commits vigentes con el checkpoint.
3. Plazo vencido pausa sin avanzar; se comprueba también después de observación asíncrona.
4. Aprobación de artefactos usa autonomía temporal efectiva sin cambiar configuración persistida y revalida antes de aprobar.
5. Propuestas de ramas excluyen repos fuera de la épica.
6. Update concurrente rechaza el snapshot si la corrida se reanudó o cambió durante lecturas.
7. Grounding lee la rama acumuladora local sin fetch implícito.
8. Pruebas atraviesan revisión y cierre humanos, CI exacto, permisos, merge, deriva y recuperación parcial con cierre canónico/auditoría sin duplicados.
9. Hallazgo adicional del primer cierre: falla de infraestructura al leer prueba de commits ya no se absorbe como 'ticket no integrado'; se conserva el error original y el runner pausa cuando lo observa.

10. Segundo hallazgo adicional: la garantía de conservar errores ahora también se cumple en helpers Git. Sólo exit 1 indica no-ancestor; otros errores no se convierten en prueba negativa y conservan la causa. Pruebas reales/inyectadas cubren ambos chequeos.

## Verificación

Última suite completa: 2652/2652 en 335 archivos, exit 0, /private/tmp/kanai-epic-git-infra-tests.log. Regresiones del ajuste Git: 41/41, /private/tmp/kanai-epic-git-infra-regressions.log. Typecheck, documentación y build finales pasan, logs /private/tmp/kanai-epic-git-infra-{types,docs,build}.log. UI pasó después del primer conjunto de correcciones. Regresiones del segundo ajuste 43/43 también pasaron. Revisión independiente ejecutó pruebas adicionales sobre archives de commits exactos y datos temporales; no prueba harnesses reales ni sustituye el piloto.

La primera prueba nueva de artefactos tenía un helper fuera de scope: se corrigió y repitió con éxito antes del primer commit. La configuración de lint existente no cubre TypeScript; no se declara verificación TS por lint.

## Revisión

Primera revisión de cierre, 20261003-epicas-closure1-kanai-app: ocho hallazgos originales corregidos por re-chequeo, nuevo S2 de infraestructura. Cobertura completa de los 19 archivos delta, combinada con el juicio original. No se descartó ni se aceptó sin corregir ningún hallazgo. Ledger canónico: /Users/edobacon/.kanai/data/kanai_data/arbiter/plans/kanai-epicas-autonomas/ledger.md.

Segunda revisión de cierre, 20261003-epicas-closure2-kanai-app: hallazgo de infraestructura SQL corregido por re-chequeo; nuevo S2 de contradicción documental de la garantía Git. Se corrigió el helper en el tercer commit. Tercera revisión de cierre, 20261003-epicas-closure3-kanai-app: aprobado, sin nuevos hallazgos. Re-chequeo independiente confirmó corregida la garantía Git. Reconciliación de Kanai: diez hallazgos fixed, cero pendientes/dropped/desviaciones aceptadas. Cobertura del plan 52/52 archivos y 1710/1710 líneas modificadas, sin huecos. Resultado JSON /private/tmp/kanai-epics-arbiter/final-run.json; ledger canónico conserva las cuatro corridas.

## Documentación y límites

Actualizada /Users/edobacon/Workspace/kanai/kanai-app/docs/development/epic-execution.md y la guía operacion-y-piloto.md del caso. Incluyen prueba de commits, autonomía efectiva, alcance del repo, plazos, error de infraestructura y límites de squash/rebase/checkpoints antiguos. Índices y catálogo coinciden con código; no se modifican manualmente datos vivos.

F10 sigue pendiente: seleccionar 3–5 tickets Tao Mangalam, baseline, host/roles/permisos y observar 14 días después del merge real. Todavía no hay evidencia operativa para concluir ahorro ni expansión.

## Cierre de fase

F11 cerrada el 2026-10-03 con evento e0126. El plan queda con 10 de 11 fases cerradas, sin advertencias de commits. F10 permanece bloqueada exclusivamente por selección/preparación y ejecución del piloto real y seguimiento de 14 días; se retiró el bloqueo anterior de revisión de código. No se emitió juez final del plan completo porque F10 aún no cumple sus criterios.
