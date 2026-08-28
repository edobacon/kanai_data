---
id: DOC-kb-sp9-PLAN-integracion-elric-mcp-por-capas
project: up1
type: doc
module: mcp
tags:
  - mcp
  - elric
  - integracion
  - curriculum-design
  - curriculum-mapping
  - capas
  - plan
  - harness-e2e
  - oauth
---

# SP9 - Plan de integracion Elric -> MCP online (cd + cm) por capas

> Estado: propuesta / plan de ejecucion. Alcance: **curriculum-design (cd)** y **curriculum-mapping (cm)**. Engagement y layouts quedan **fuera**.
> Complementa a `PLAN-migracion-cd-cm-al-mcp-online.md` (analisis) desglosando el trabajo por **sesion, tarea, capa y esfuerzo**, con "que evaluar / que se tiene / contexto" por tarea.

## 1. Marco

Dos implementaciones del mismo MCP:
- **Elric** (`uplanner/mcp`, rama `main`, paquete `up1-mcp`): PoC local, stdio + OTP, TypeScript, una funcion escrita a mano por tool. Superficie de cd madura y probada: **38 tools cd** + harness E2E real (25/25).
- **MCP online** (`uplanner/up1/mods/<mod>/ai/`, rama `develop`, paquete `@uplanner/mcp`): linea productiva. HTTP + OAuth, multi-tenant, JS, **arquitectura declarativa** (la tool de mod es una "ficha" de datos que un motor generico convierte en tool).

No es un merge de codigo: es reexpresar el dominio en la forma del online. El peso NO esta en el MCP en si, esta en la logica de dominio que Elric compensaba del lado cliente.

## 2. Las tres capas (eje de evaluacion)

- **Capa A - MCP-en-si** (transversal, reutilizable): preview->commit, capability-gate, `get_create_guide`, `get_field_options`, delete-con-impacto, historial, higiene de salida, harness E2E, `blockGenericMutation`.
- **Capa B - Mod-dominio** (pack `mods/<mod>/ai/`): fichas + `registerExtra` que apuntan a resolvers; lecturas con calculo (`cd_get_mesh`, `cd_get_prereqs`).
- **Capa C - Mod-backend / Core**: reglas de negocio que deben vivir en el resolver `*Validated` o en el object-manager (no reimplementarse en el pack). Lo decide **Aduana**.

Certeza por tarea: `firme` (mecanismo conocido) · `verificar` (auditar el online antes de construir) · `spike` (no se sabe si porta directo).

## 3. Gap de dominio

**CD (38 tools):** 14 lecturas se eliminan (las cubre el generico via allowlist); 2 lecturas se construyen (`cd_get_mesh`, `cd_get_prereqs`); 22 escrituras (68% custom-logic). Solo `cd_create_syllabus` es ficha simple.
**CM:** greenfield; su backend ya gobierna (`*Validated`) -> fichas livianas. Primer corte: `levelScheme`, `alignmentScale`, matriz en lectura. Matriz en escritura diferida.

## 4. Plan por sesiones (capa + esfuerzo + certeza + "que evaluar / que se tiene / contexto")

### S0 - Auditoria de base y frontera (L)
- **T0.1** Auditar paridad real de la Capa A del online. Capa A · M · verificar. Evaluar: si preview->commit, capability-gate, guides, field-options, delete-impacto, historial, higiene existen como el doc afirma. Se tiene: ROADMAP del online + tools genericas `up1_*`. Contexto: define el scope de S1.
- **T0.2** Spike OAuth headless. Capa A · L · spike. Evaluar: como mintear token Clerk test-mode para OAuth sin humano. Se tiene: Elric usa OTP fijo `424242` (no aplica a OAuth). Contexto: riesgo real del proyecto.
- **T0.3** Spike harness E2E a transporte HTTP. Capa A · M · spike. Evaluar: reusar read-back + 4 fronteras sobre HTTP. Se tiene: `test/e2e/harness.ts` (25/25). Contexto: mecanismo agnostico a auth; transporte y login no.
- **T0.4** Confirmar B2 (`object-manager` `feature/mcp-oauth-auth` mergeada). Capa A/plataforma · S · verificar. Contexto: sin ese merge el online no autentica contra datos.
- **T0.5** Aduana: que regla client-side baja al resolver del mod vs al core. Capa B/C · M · verificar. Se tiene: `validations.ts`, contract registry con `blockGenericMutation`.

### S1 - Capa A pendiente (L)
- **T1.1** Portar/construir harness E2E HTTP+OAuth. Capa A · L · spike->firme (dep T0.2/T0.3).
- **T1.2** `blockGenericMutation` en el online. Capa A · M · firme. Contexto: bloqueante de seguridad (B3).
- **T1.3** Elevar `get_field_options` (FK polimorfica, sinonimos, acentos, candidates). Capa A · M · firme.
- **T1.4** Gate "E2E obligatorio para escritura". Capa A · S · firme.

### S2 - CD lecturas (M)
- **T2.1** Allowlist de tipos cd -> 14 lecturas genericas. Capa B(config) · S · firme.
- **T2.2** `cd_get_mesh`. Capa B · M. **T2.3** `cd_get_prereqs`. Capa B · M. **T2.4** E2E lectura. A/B · S.

### S3 - CD dominio: reponer reglas (Capa C, NO es del MCP) (L-XL)
- **T3.1** Bajar validaciones cruzadas al resolver/core. C · L · verificar. **T3.2** `autoAssign`. C/A · M. **T3.3** Motor `statusFlow`. C · M. **T3.4** Enforce `requiresComment` en core. C · M.

### S4 - CD escrituras: pack (Capa B) (L-XL)
- **T4.1** Crear pack + contracts. B · M. **T4.2** Fichas gobernadas (incl. `cd_create_syllabus`). B · M. **T4.3** `registerExtra` uno por patron (saga/upsert/tree-op/transicion). B · L. **T4.4** Repetir el resto (volumen). B · M. **T4.5** `blockGenericMutation` en objetos cd. A/B · S. **T4.6** E2E alto riesgo (paridad 25/25). A/B · M.

### S5 - CM primer corte (M)
- **T5.1** Crear `mods/curriculum-mapping/ai/`. B · S. **T5.2** Fichas `*Validated` (levelScheme, alignmentScale). B · M. **T5.3** Upsert LevelScheme registerExtra. B · S. **T5.4** Matriz en lectura. B · S. **T5.5** `blockGenericMutation` cm. A/B · S. **T5.6** E2E cm. A/B · M.

### S6 - Endurecimiento produccion (M-L)
- **T6.1** Filtrado genericas por capability por objectType. A · M. **T6.2** Rate limiting + auditoria. A · M. **T6.3** Gate CI. A · S. **T6.4** Deploy EKS dev+staging. A/plataforma · M.

## 5. Bloqueantes
- **B2** OAuth en object-manager (S0, dependencia plataforma). **B3** `blockGenericMutation` (S4/S5, seguridad). **B4** sagas/tree-ops/upserts que no entran en ficha (S4, esfuerzo/volumen). **B5** matriz cm en escritura (S5, backend en construccion).

## 6. Lectura por capa
- Capa A (MCP-en-si): finita y casi cerrada, pero es donde vive la incertidumbre (T0.1/T0.2/T0.3). Reutilizable.
- Capa B (pack): mecanica una vez resueltos los patrones. Volumen, no dificultad.
- Capa C (mod-backend/core): buena parte del peso de cd, y NO es trabajo del MCP. cm casi no tiene C.

## 7. Referencias
- `PLAN-migracion-cd-cm-al-mcp-online.md`, `PLAN-mcp-testing-automatizado.md`, `FOLLOWUP-mcp-testing-automatizado`, `estandar-DoR-DoD`.
- Elric `uplanner/mcp@main`: `src/contracts/registry.ts`, `resolve-inputs.ts`, `validations.ts`, `test/e2e/harness.ts`, `src/mods/curriculum-design/`.
- Online `uplanner/mcp@develop` + `uplanner/up1/mods/*/ai/` (`academic-scheduling/ai/rule-value-upsert.js`).
