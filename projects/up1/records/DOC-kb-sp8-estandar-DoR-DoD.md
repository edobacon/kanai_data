---
id: DOC-kb-sp8-estandar-DoR-DoD
project: up1
type: doc
---

# Estandar del equipo - Definicion de Listo (DoR) y de Terminado (DoD)

> Checklist estandar que aplica a todos los tickets de curriculum-design / curriculum-mapping. Cada ticket lo referencia y agrega solo su cierre especifico, para no repetir. Fuente: convencion del equipo (desglose curriculum-mapping) + DETs del workflow.

## Definicion de Listo (DoR) - para entrar a sprint

- [ ] Dependencias (tickets predecesores) en Ready to test.
- [ ] Decisiones abiertas del ticket resueltas, o marcadas explicitamente como no bloqueantes.
- [ ] Draft/preview de UI aprobado si el ticket crea una vista (DET-18).
- [ ] Alcance dentro/fuera confirmado con el PO.

## Definicion de Terminado (DoD) - para cerrar

Aplica lo que corresponda a la naturaleza del ticket (alta de objeto vs config vs fix de core); marcar N/A con motivo lo que no aplique.

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

## Nota

Los tickets de SP8 listan sus criterios de aceptacion, DoD especifico, tests minimos y factores transversales propios; este estandar es la base comun que se da por incluida ademas de lo especifico.
