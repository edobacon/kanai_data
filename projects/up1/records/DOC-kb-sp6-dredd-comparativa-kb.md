---
id: DOC-kb-sp6-dredd-comparativa-kb
project: up1
type: doc
---

# Dredd — comparativa con-KB vs sin-KB + mejoras derivadas

> **Origen**: experimento controlado (2026-07-10) para medir que aporta el acceso directo al KB de
> Deckard en la review de PRs. Se corrio la MISMA review (cambio de UPONE-1380: retiro de
> `ChangeLog` → `core_DataLog` con atribucion polimorfica) con dos configuraciones:
> - `dredd-dkc` **con KB** (nativo) → `specs-external/sp6/dredd-1380.md`
> - `dredd` **sin KB** (portable, KB apagado) → esta corrida (mismo cambio, Modo B / git local)
> **Naturaleza**: learn de proceso + registro de las mejoras aplicadas a ambas skills.

---

## Setup

- Mismo sujeto (cambio de 1380), mismo metodo (flujo por capas + gate de verificacion + gate de
  frescura), unica variable: **acceso al KB**.
- El cambio no tiene PR de Bitbucket → ambas corridas fueron **Modo B** (diff de rama local
  `feat/UPONE-1380-datalog-history` vs `origin/develop`).
- Corridas en subagente de contexto limpio.

## Resultado (que aporta —y que NO— el KB)

| Dimension | Con KB | Sin KB |
|---|---|---|
| Hallazgo central (refs colgantes a `ChangeLog`) | ✅ por grep+hermanos (NO por el KB) | ✅ mismo medio — mas preciso (7 layouts, vs "8" del con-KB que listo 7) |
| Causa raiz del falso verde | "DET-16 propagacion incompleta" (encuadre) | pinpointeo el test exacto (`layouts-declared.test.ts` valida solo `objectName` de nivel superior, no anidados) — mas accionable |
| Seed stale (`_data-...cleanup-v2.js`) | ✅ flageado | ❌ perdido (miss NO KB-dependiente — cobertura) |
| Gap del propio spec (nomino 2 layouts, habia mas) | ✅ (insight KB-only) | ✗ no aplica sin spec |
| Decision de producto (destino del historial) | cerrada como "perdida aceptada" | dejada como 🔵 Consulta ("sin KB no confirmo la decision") |
| Comentarios stale en core / layout-suite sin cambios | — | ✅ detectados |
| Gate de frescura | (n/a) | ✅ funciono — verifico `origin/develop`, no cayo en checkout stale |

### Conclusion

- **El KB NO detecta el bug.** Ambas versiones cazaron el hallazgo central por **codigo +
  comparacion con hermanos**. El KB dio el *nombre* (DET-16), no la *evidencia*.
- **Sin KB fue igual o mas preciso** en detalles de codigo (conteo exacto, test culpable,
  comentarios stale), probablemente porque no se apoyo en el KB y cavo mas en el codigo.
- **El KB aporta**: calibracion normativa (regla `must` → 🔴 vs convencion → ⚪/🟡), cierre de
  preguntas de producto (una decision registrada convierte una Consulta en ✅/🔴), y framing por
  IDs/spec. **No aporta** deteccion.
- El unico miss del sin-KB (seed stale) **no era KB-dependiente** → es cobertura, arreglable con la
  auditoria de retiro destructivo (abajo).

## Mejoras aplicadas a las skills (a partir del experimento)

**Ambas (`dredd` + `dredd-dkc`):**
1. **Auditoria de retiro destructivo (obligatoria si el PR elimina algo)** — barrer TODO por
   referencias colgantes a lo eliminado: codigo, **`objectName` anidados en layouts JSON**,
   **seeds/migraciones**, docs/comentarios, i18n, y targets de sync. Tecnica: grep amplio + cruzar
   los hermanos que el PR SI actualizo vs los que dejo sin tocar (diff vs diffstat). Es el gate mas
   rentable en cambios de retiro (habria cazado tambien el seed stale que el sin-KB perdio).
2. **Test culpable del falso verde (Fase 1.5)** — si un defecto paso el CI en verde, identificar
   QUE test debio atraparlo y por que no (ej. un test que valida solo el nivel superior de un
   layout y no los anidados). Mas accionable que "faltan tests".
3. **Modo B (cambios locales sin PR)** — documentado en ambas: revisan una URL de PR *o* una
   rama/ticket local con el MISMO protocolo (fuente del diff = git local + gate de frescura). Cerro
   una inconsistencia: el propio review del DataLog fue Modo B.

**Solo `dredd-dkc`:**
4. **KB-first, NO KB-only** — verificar el alcance que ENUMERA un spec contra el arbol real por
   codigo (el spec nomino 2 layouts a retirar; habia 7 mas colgados). El KB calibra severidad y
   cierra preguntas; la deteccion sale del codigo. Misma logica que "gana el codigo sobre el doc
   stale", aplicada tambien al KB.

## Corolario para el uso

- `dredd` (sin KB) es viable para review de fondo: encuentra los defectos reales. Lo que pierde es
  el encuadre normativo y el cierre de decisiones de producto — cosmetico para un dev externo.
- `dredd-dkc` conviene cuando importa la calibracion must/should y cerrar preguntas contra
  decisiones/reglas registradas — pero no debe confiar ciegamente en el alcance del spec.
- La deteccion depende de **codigo + hermanos + retiro-destructivo + frescura**, no del KB. Esos 4
  gates son los que hay que mantener afilados en ambas.
