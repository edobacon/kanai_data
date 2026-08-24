# Estandar del equipo - Definicion de Listo (DoR) y de Terminado (DoD) - SP9

> Checklist estandar que aplica a todos los tickets de curriculum-design / curriculum-mapping en SP9.
> Cada ticket lo referencia y agrega solo su cierre especifico, para no repetir. Base: el estandar de
> SP8 (`kb/sp8/estandar-DoR-DoD.md`), mas el acuerdo de MCP cerrado en la planificacion del 2026-08-14.

## Definicion de Listo (DoR) - para entrar a sprint

- [ ] Dependencias (tickets predecesores) en Ready to test.
- [ ] Decisiones abiertas del ticket resueltas, o marcadas explicitamente como no bloqueantes.
- [ ] Draft/preview de UI aprobado si el ticket crea una vista.
- [ ] Alcance dentro/fuera confirmado con el PO.
- [ ] Ticket asignado (SP9: varios tickets entraron al sprint sin asignado).

## Definicion de Terminado (DoD) - para cerrar

Aplica lo que corresponda a la naturaleza del ticket (alta de objeto vs config vs fix de core);
marcar N/A con motivo lo que no aplique.

- [ ] Objeto JSON definido, `npm run codegen` sin errores y migracion aplicada (solo altas/cambios de objeto).
- [ ] `npm run sync` corrido; no se editaron a mano archivos sincronizados.
- [ ] Sin drift de schema tras el cambio (`drift:check`).
- [ ] Resolvers con validacion; sin `any`, sin `console.*` en produccion; tenant isolation en toda query.
- [ ] Layouts via LayoutOrchestrator con tokens `var(--up1-*)` (sin Bootstrap directo en molecules/organisms).
- [ ] Capabilities declaradas y cableadas a los roles.
- [ ] i18n de textos nuevos en es/en/pt con paridad de keys.
- [ ] Accesibilidad (WCAG AA) de la UI nueva o modificada.
- [ ] Storybook de componentes nuevos/modificados.
- [ ] Tests unit verdes + smoke en tenant UPU con evidencia runtime (no solo config/BD).
- [ ] Doc breve en `docs/` o KB si el cambio es observable (comportamiento/capacidad/API/RBAC/UI).
- [ ] PR en Bitbucket revisado.
- [ ] Artefactos de sync/seed no commiteados.

## Especifico de SP9: sincronizacion con el MCP

Acuerdo de la planificacion del 2026-08-14: **la sincronizacion con el MCP es parte de la misma
historia que introduce el cambio**, no un ticket posterior. Aplica a todo ticket que agregue o
modifique objetos, resolvers o capacidades que el MCP expone.

- [ ] Desarrollado y probado primero en UP1.
- [ ] Cambio reflejado en el MCP (tools nuevas o ajustadas segun corresponda).
- [ ] Tests del MCP agregados o actualizados.
- [ ] Protocolos del MCP cumplidos (guias de creacion, forma de los objetos, convenciones de
      presentacion, preview antes de commit en las tools de escritura).
- [ ] N/A justificado si el ticket no toca nada que el MCP exponga.

## Nota

Cada ticket de SP9 lista sus criterios de aceptacion, DoD especifico, tests minimos y factores
transversales propios; este estandar es la base comun que se da por incluida ademas de lo especifico.
