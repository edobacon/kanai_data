# SP5 — Definition of Ready (DoR) + flags abiertos

> Checklist de "listo para tomar" por ticket + los 2 puntos a confirmar antes de codear la parte afectada. Objetivo: que al crear los tickets, el dev arranque sin sorpresas.
> 🧭 Visión general y glosario: `README.md`. Orden/dependencias: `sp5-execution-order` (en `deckard/projects/up1/`).

---

## Definition of Ready (aplica a cada ticket MC-0X)

Un ticket está **listo para tomar** cuando:
- [ ] Tiene su **pre-spec** (`sp5/prespecs/MC-0X.md`) con REQ + tasks + tests + intake. ✅ (los 9 hechos)
- [ ] Sus **dependencias** (`Depende de` en el execution-order) están `closed`.
- [ ] Sus **`kb_refs`** están resueltos e inyectables (DET-34) — pre-mapeados en el execution-order. ✅
- [ ] Su **`execute_scope`** y **`layer`** están definidos. ✅ (en el execution-order)
- [ ] No tiene **flags abiertos** sin resolver que bloqueen su parte (ver abajo).

## Flags abiertos (confirmar antes de codear la parte afectada)

> Son los 2 únicos puntos con incógnita real tras la validación; ninguno bloquea el arranque del sprint, pero conviene cerrarlos antes de la tarea específica.

### FLAG-1 · Guard de borrado de `requirementCategory` — ✅ RESUELTO (mecanismo definido) (afecta MC-02)
- **Qué:** "No eliminable si tiene `planEntry` asignados" (REQ-09 de MC-02).
- **Hallazgo (verificado 2026-06-24):** el codegen **honra `onDelete` desde el JSON** de la FK (`generatePrismaSchema.js`). `categoryId` es opcional → default Prisma `SetNull` (limpia el FK silenciosamente — NO es lo deseado). No hay helper genérico de delete-guard.
- **Resolución (2 opciones, ambas válidas):**
  - **A (nativa, recomendada):** declarar `planEntry.categoryId` con `"onDelete": "Restrict"` → la DB rechaza borrar una categoría con `planEntry` → friendly-error de FK. Declarativo, sin código de resolver.
  - **B (mensaje claro):** validación de dominio en el resolver de delete (patrón `lineageUniqueness`/`sectionValidation`) → mensaje "reasigna primero".
- **Decisión pendiente (menor):** A vs B según si se requiere el mensaje exacto. **No es incógnita ni bloqueante.**

### FLAG-2 · Mecanismo de color/ícono de líneas — ✅ RESUELTO (con atoms existentes) (afecta MC-07 / C2)
- **Qué:** el modal de crear/editar línea captura `color` + `icon` (REQ-02 de MC-07; decisión DEC-032).
- **Hallazgo (verificado 2026-06-24):** no hay un picker color/ícono dedicado, **pero sí los atoms** `Icon`, `Select`, `Badge`, `Input` en `layout/src/components/atoms/`. Ningún objeto del mod usa color/ícono hoy (sin precedente, pero hay piezas).
- **Resolución:** armar el "componente view" con atoms existentes — `icon` = `Select` de un **set curado** de `bi-*` (preview con el atom `Icon`); `color` = `Select` de tokens de tema up1 / hex (swatch con `Badge`). **Sin componente nuevo complejo.**
- **Decisión pendiente (menor):** confirmar con Eduardo el **set curado** de íconos y colores a ofrecer. **No bloquea**: el resto de MC-07 (RecordList, validación min/max, nombre/código) es independiente.

## Resumen
- **9/9 pre-specs** listos · **kb_refs** pre-mapeados · **execute_scope/layer** definidos · **calibración** hecha · **KB** cargado e indexado.
- **2 flags abiertos**, ambos de bajo impacto y acotados (no bloquean el arranque): FLAG-1 (guard = patrón de dominio), FLAG-2 (color/ícono = confirmar con Eduardo).
- **Decisiones de producto:** todas resueltas (§5 del plan). **Riesgos técnicos:** despejados (auditoría; H-4 resuelto; bloqueantes de versionado → SP6).
