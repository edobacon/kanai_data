---
id: SPEC-sales-mock-sii
project: jormat-evolution
ticket: JOR-059
status: done
---

# B2.5 · Mock interno del SII + advertencias de simulación

# B2.5 · Mock interno del SII + advertencias de simulación

## Executive summary — lo que estas aprobando

> *Revision rapida. El detalle tecnico vive en Requirements, Artifacts y Tasks.*

**Que se quiere**: el sistema emite facturas en modo demo, sin conexion real al SII (Servicio de Impuestos Internos). Hoy ese mock es un stub a medias: el folio es un numero fijo (`155278`) y el estado SII siempre es `aceptado`. Este ticket formaliza el mock — folio que avanza de a uno por tipo de documento y estado SII configurable — y, sobre todo, **advierte al usuario** en la UI que lo que ve es simulado: un banner al facturar, un aviso en el listado de documentos y la accion "Descargar XML/PDF" visible pero marcada como "no disponible en demo". La integracion real con el SII (XML, firma, envio, CAF) NO se hace aqui: queda registrada como faltante diferido.

**Decisiones criticas que necesitan tu OK**:

| # | Decision | Por que importa |
|---|----------|----------------|
| 1 | El mock backend (folio/estado) se limita a **sales** (DTE). Purchases (factura de proveedor) NO emite al SII → fuera del backend del mock | Evita inventar semantica SII donde no aplica; el banner UI sí va en builder 08 por pedido explicito del request |
| 2 | El folio secuencial es **in-memory por tipo** (no DB, no persistente entre reinicios) | El request dice "No toca DB". Es un mock de demo; un contador en el service alcanza. Se reinicia al reiniciar la API (aceptable para demo) |
| 3 | `estadoSII` configurable = **campo opcional en el input de emision**, default `aceptado` | Backward-compatible: los consumidores actuales que no lo mandan siguen viendo `aceptado`. Permite ejercitar `rechazado`/`aceptado_con_reparos` en demo |
| 4 | El "badge en el **detalle** del DTE" (DS-3) se **adapta a un aviso a nivel listado** + backlog | No existe vista de detalle hoy (`handleView` es un toast placeholder). No se construye una vista nueva fuera de alcance; el badge por-DTE se difiere |

**Riesgos principales y como los mitigamos**:

- **El folio in-memory colisiona o se comparte mal entre tipos** → contador `Map<TipoDTE, number>` con serie independiente por tipo + tests TC1/TC2 que verifican consecutividad e independencia.
- **Agregar `estadoSII` al DTO rompe consumidores existentes** → campo **opcional** con default en el service; test TC3 (sin campo → `aceptado`) protege el comportamiento previo (REQ-PRESERVE).
- **El banner en compras (08) confunde** (semantica SII es de ventas) → copy canonico unico en `SimulacionSiiBanner` (componente compartido), texto literal del request; el dev lo pidio explicito en ambos builders.
- **Coverage global baja de 90** (RULE-testing-coverage-threshold-002) → cada cambio entra con su test; S3 verifica coverage antes de cerrar.

**Que NO se hace en este ticket**:

- Integracion SII real: XML, firma electronica, envio, polling de estado, CAF → diferido, registrado como faltante en `external-dependencies.md`.
- Mock de folio/estado SII en **purchases** → no aplica (factura de proveedor no es DTE emitido).
- Vista de **detalle** del DTE → no existe; el badge por-DTE individual queda en backlog (should).
- Persistencia del folio (DB / reinicio) → el mock es in-memory por diseno.

**Tamano estimado**: 3 sessions ejecutables (~1.5-3h c/u). La mas relevante es S2 (frontend, user-facing, T3). S1 (backend) es acotada; S3 es docs + cierre.

**Como vas a saber que funciona**:

- Emites dos facturas del mismo tipo y los folios avanzan (155278 → 155279); cambias de tipo y la serie es independiente.
- Emites sin especificar estado y queda `aceptado`; lo especificas `rechazado` y queda `rechazado`.
- Abres "Crear factura" (03) y "Factura de proveedor" (08) y ves el banner "Emision simulada — sin conexion al SII (folio y estado demo)".
- En el listado de documentos ves un aviso de datos simulados y la accion "Descargar XML/PDF" presente que avisa "no disponible en demo" al usarla.

---

## Purpose

Formalizar el mock interno del SII en el modulo `sales` (folio secuencial por tipo de documento + estado SII configurable con default `aceptado`, in-memory, sin DB) y advertir la simulacion en la UI (banner en builders 03/08, aviso en listado 02, placeholder de descarga XML/PDF). Actor: usuario operativo de ventas/compras en entorno demo. Valor: el flujo se ve completo y honesto (nada finge ser una emision real al SII) sin construir la integracion real, que queda diferida y registrada.

## Requirements

### REQ-01: Folio interno secuencial por tipo de documento (DS-1)

> **Que cambia**: al emitir, el folio ya no es el numero fijo `155278`; avanza de a uno y cada tipo de DTE lleva su propia serie.
> **Por que**: el SII real asigna folios por serie/tipo; el mock debe parecerse para que la demo sea creible y el listado muestre folios variados.

El sistema MUST asignar, al emitir una factura (`issueFactura`), un folio tomado de una secuencia **independiente por `tipoDTE`**, incrementando esa serie en cada emision del mismo tipo. El folio MUST ser unico dentro de su tipo durante la vida del proceso (mock in-memory; no persiste entre reinicios de la API).

<details><summary>Scenarios de validacion</summary>

#### Scenario: dos emisiones del mismo tipo
- **GIVEN** el service recien inicializado
- **WHEN** se emiten dos facturas con `tipoDTE = factura_electronica`
- **THEN** el segundo folio es el primero + 1 (consecutivo)

#### Scenario: tipos distintos, series independientes
- **GIVEN** el service recien inicializado
- **WHEN** se emite una `factura_electronica` y luego una `nota_credito_electronica`
- **THEN** cada una usa su propia serie y no colisionan

</details>

### REQ-02: Estado SII configurable con default 'aceptado' (DS-2)

> **Que cambia**: quien emite puede indicar el estado SII demo (`aceptado` / `aceptado_con_reparos` / `rechazado`); si no lo indica, queda `aceptado`.
> **Por que**: el listado 02 mantiene ejemplos de los tres estados para ejercitar los badges; el mock debe poder producirlos.

El sistema MUST aceptar un `estadoSII` **opcional** en el input de emision, validado contra `ESTADO_SII_VALUES`, y MUST usar `aceptado` como default cuando no se provee. El sistema MUST NOT romper a los consumidores actuales que no envian el campo (backward-compatible).

<details><summary>Scenarios de validacion</summary>

#### Scenario: default cuando no se provee
- **GIVEN** un payload de emision sin `estadoSII`
- **WHEN** se emite la factura
- **THEN** el documento resultante tiene `estadoSII = 'aceptado'`

#### Scenario: valor provisto se respeta
- **GIVEN** un payload con `estadoSII = 'rechazado'`
- **WHEN** se emite la factura
- **THEN** el documento resultante tiene `estadoSII = 'rechazado'`

#### Scenario: valor invalido se rechaza
- **GIVEN** un payload con `estadoSII = 'foo'`
- **WHEN** se valida el request (ValidationPipe whitelist)
- **THEN** la API responde 400 (no acepta valor fuera del enum)

</details>

### REQ-03: Banner de emision simulada en builders 03/08 (DS-3)

> **Que cambia**: al abrir "Crear factura" (03) y "Factura de proveedor" (08) aparece un aviso fijo de que la emision es simulada.
> **Por que**: el usuario debe saber que no hay conexion real al SII antes de "facturar".

El sistema MUST mostrar, en los builders de venta (03) y compra (08), un banner con el texto **"Emisión simulada — sin conexión al SII (folio y estado demo)"**. El banner MUST provenir de un componente compartido reutilizable (`SimulacionSiiBanner`) para mantener el copy unico (RULE-frontend-001). El banner SHOULD ser informativo (no bloqueante, no descartable de forma que oculte permanentemente la advertencia).

<details><summary>Scenarios de validacion</summary>

#### Scenario: banner visible en builder 03
- **GIVEN** el usuario en "Crear factura" (TransactionBuilder)
- **WHEN** la vista monta
- **THEN** se ve el banner con el copy DS-3

#### Scenario: banner visible en builder 08
- **GIVEN** el usuario en "Factura de proveedor" (PurchaseInvoiceBuilder)
- **WHEN** la vista monta
- **THEN** se ve el banner con el copy DS-3 (mismo componente)

</details>

### REQ-04: Accion "Descargar XML/PDF" como placeholder con aviso (DS-4)

> **Que cambia**: aparece la accion "Descargar XML/PDF" en las acciones de un documento, visible pero que avisa "no disponible en demo" al usarla.
> **Por que**: el flujo se ve completo (la accion existe) sin fingir una descarga real; DS-4 pide mostrarla, no deshabilitarla.

El sistema MUST mostrar la accion "Descargar XML/PDF" en las acciones del documento (kebab del listado 02), **sin deshabilitarla**, y al activarla MUST informar **"no disponible en demo"** (toast/aviso). El sistema MUST NOT intentar una descarga real.

<details><summary>Scenarios de validacion</summary>

#### Scenario: accion presente y avisa
- **GIVEN** el listado de documentos
- **WHEN** el usuario abre las acciones de un DTE y elige "Descargar XML/PDF"
- **THEN** la accion esta presente (no deshabilitada) y muestra el aviso "no disponible en demo"

</details>

### REQ-05: Aviso de simulacion en el listado de documentos (DS-3 adaptado)

> **Que cambia**: el listado 02 muestra un aviso de que los datos son simulados (folio y estado demo).
> **Por que**: DS-3 pide advertir "en el detalle del DTE", pero no existe vista de detalle; el listado es donde el usuario ve los DTE hoy.

El sistema MUST mostrar, en la vista de listado de documentos (02), un aviso de que los folios/estados son simulados (sin conexion al SII). El badge "simulada" por-DTE individual en una vista de detalle SHOULD diferirse a backlog (no existe detalle hoy).

<details><summary>Scenarios de validacion</summary>

#### Scenario: aviso en el listado
- **GIVEN** el usuario en el listado de documentos (DocumentosListView)
- **WHEN** la vista monta
- **THEN** se ve un aviso de datos simulados (reusa `SimulacionSiiBanner` o variante)

</details>

### REQ-PRESERVE: No romper emision ni listado existentes

> **Que cambia**: nada para el usuario actual — las suites y contratos vigentes siguen verdes.
> **Por que**: es un cambio aditivo sobre stubs y vistas en produccion-demo.

El sistema MUST preservar el comportamiento existente: shape de los DTOs de respuesta, capabilities (`sales.invoices:edit|issue`), suites actuales de sales/builders/listado verdes, coverage global ≥90 (RULE-testing-coverage-threshold-002).

<details><summary>Scenarios de validacion</summary>

#### Scenario: suites existentes verdes
- **GIVEN** las suites de `sales`, `TransactionBuilder`, `PurchaseInvoiceBuilder`, `DocumentosListView`
- **WHEN** se corren tras los cambios
- **THEN** pasan sin regresion y coverage no baja de 90

</details>

## Non-functional requirements

- **Security (RULE-global-002)**: el campo `estadoSII` se valida contra el enum via ValidationPipe whitelist (no acepta valores libres). No se relajan capabilities ni aislacion de tenant. El placeholder de descarga no expone endpoint nuevo.
- **Tipado (RULE-global-001)**: sin `any`; `estadoSII` tipado como `EstadoSII`; folio counter tipado `Record<TipoDTE, number>` / `Map<TipoDTE, number>`.

## Artifacts

> **Necessity/reuse (DET-32)** — veredicto agregado: **mixed** (reuse mayoritario, 1 build).

| Artefacto | Veredicto | Racional |
|-----------|-----------|----------|
| Generador de folio secuencial por tipo (service) | **build** | No existe; necesidad confirmada (DS-1). Minimal: contador in-memory en `SalesService` |
| `estadoSII` configurable | **reduce** | No es artefacto nuevo: campo opcional en DTO existente + default en service (cambio minimo, no clase nueva) |
| `SimulacionSiiBanner` (componente compartido) | **build** | No existe un banner de simulacion reutilizable; se construye 1 vez y se reusa en 3 lugares (builders 03/08 + listado). Reusa la primitiva `Alert` existente |
| Aviso/placeholder en listado | **reuse** | Reusa `SimulacionSiiBanner` + el menu de acciones existente del listado (kebab) |
| Vista de detalle del DTE | **drop** | YAGNI para este ticket; no existe y el request no la pide construir. El badge por-DTE va a backlog |

**Backend (sales) — contrato afectado**:
- `issueFactura` (input): agregar campo opcional `estadoSII?: EstadoSII` al DTO de emision. Default `aceptado` en el service. Folio: asignado por el contador interno segun `tipoDTE` del payload.
- Respuesta `DocumentoDTEDto`: shape sin cambios (folio/estadoSII ya existen); cambia solo su **origen** (calculado vs literal).

**Frontend — componente nuevo**:
- `components/shared/SimulacionSiiBanner/SimulacionSiiBanner.tsx` (+ index + test + story si aplica RULE-frontend-002): banner con copy DS-3, basado en primitiva `Alert`. Variante/prop opcional para el aviso del listado.

## Tasks

### Session 1 — Backend mock SII en sales (DS-1 + DS-2) [tipo: auto] [tier: T2]

parallel_groups: []

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|------------|-------|------------|-------|------------|----------|-------|--------|---------|
| S1.T1 | Folio secuencial por tipo: contador in-memory `Record<TipoDTE,number>` en `SalesService`; `issueFactura` toma el siguiente folio segun `tipoDTE` | REQ-01 | developer | — | backend/jormat-api/src/sales/sales.service.ts | TC1, TC2 (jest) | git revert | DET-2, DET-8, RULE-global-001 | done | 1 |
| S1.T2 | `estadoSII` configurable: agregar campo opcional validado al DTO de emision + default `aceptado` en service | REQ-02 | developer | S1.T1 | backend/jormat-api/src/sales/dto/documento.dto.ts, backend/jormat-api/src/sales/sales.service.ts | TC3, TC4 (jest) | git revert | DET-5, DET-8, RULE-global-001, RULE-global-002 | done | 1 |
| S1.T3 | Tests Jest: folio consecutivo/independiente + estado default/provisto + regression de shape y caps | REQ-01, REQ-02, REQ-PRESERVE | developer | S1.T2 | backend/jormat-api/src/sales/sales.service.spec.ts, backend/jormat-api/src/sales/facturas.controller.spec.ts | jest sales verde, coverage | git revert | DET-7, DET-13, RULE-testing-coverage-threshold-002 | done | 1 |
| **S1.GATE** | Gate de sync Session 1 (tier: T2) | — | reviewer | S1.T3 | projects/jormat-evolution/tickets/JOR-059.md | gate persistido + dual-judge T2 | — | DET-20, DET-23, DET-27 | done | 1 |

### Session 2 — Frontend advertencias de simulacion (DS-3 + DS-4) [tipo: auto] [tier: T3]

parallel_groups: []

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|------------|-------|------------|-------|------------|----------|-------|--------|---------|
| S2.T1 | Componente compartido `SimulacionSiiBanner` (copy DS-3, basado en `Alert`) + index + test | REQ-03 | developer | — | front/jormat-front/src/components/shared/SimulacionSiiBanner/SimulacionSiiBanner.tsx, .../index.ts, .../SimulacionSiiBanner.test.tsx | vitest componente | git revert | DET-2, RULE-frontend-001, RULE-frontend-002, RULE-global-001 | done | 2 |
| S2.T2 | Wire del banner en builders 03 (TransactionBuilder) y 08 (PurchaseInvoiceBuilder) | REQ-03 | developer | S2.T1 | front/jormat-front/src/components/ventas/builder/TransactionBuilder/TransactionBuilder.tsx, front/jormat-front/src/components/compras/builder/PurchaseInvoiceBuilder.tsx | TC5 (vitest) | git revert | DET-5, RULE-frontend-001 | done | 2 |
| S2.T3 | Listado 02: aviso de simulacion (reusa banner) + accion "Descargar XML/PDF" placeholder con aviso "no disponible en demo" (no deshabilitar) | REQ-04, REQ-05 | developer | S2.T1 | front/jormat-front/src/components/ventas/list/DocumentosListView/DocumentosListView.tsx | TC6, TC7 (vitest) | git revert | DET-5, RULE-frontend-001, RULE-global-001 | done | 2 |
| S2.T4 | Component tests: banner en ambos builders, aviso + placeholder en listado, regression de listado/builders | REQ-03, REQ-04, REQ-05, REQ-PRESERVE | developer | S2.T2, S2.T3 | front/jormat-front/src/components/ventas/builder/TransactionBuilder/TransactionBuilder.test.tsx, front/jormat-front/src/components/compras/builder/PurchaseInvoiceBuilder.test.tsx, front/jormat-front/src/components/ventas/list/DocumentosListView/DocumentosListView.test.tsx | vitest verde, coverage | git revert | DET-7, DET-13, RULE-testing-coverage-threshold-002 | done | 2 |
| **S2.GATE** | Gate de sync Session 2 (tier: T3) | — | reviewer | S2.T4 | projects/jormat-evolution/tickets/JOR-059.md | gate persistido + dual-judge T3 | — | DET-20, DET-23, DET-27 | done | 2 |

### Session 3 — Docs + regression + cierre [tipo: ⚑ fuerte] [tier: T1]

parallel_groups: []

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|------------|-------|------------|-------|------------|----------|-------|--------|---------|
| S3.T1 | Docs: actualizar `jormat_docs/backend/` (mock SII: folio/estado) + `api/` si cambia contrato; mantener `external-dependencies.md` como registro del faltante real | REQ-PRESERVE | developer | S1.GATE, S2.GATE | jormat_docs/backend/modules/sales.md, jormat_docs/api/README.md, jormat_docs/ongoing/flows/external-dependencies.md | revision manual + links | git revert | DET-16, RULE-global-005 | done | 3 |
| S3.T2 | Regression full + coverage ≥90 (backend + frontend) + registrar `docs:`/`tests:` + backlog badge-detalle | REQ-PRESERVE | reviewer | S3.T1 | projects/jormat-evolution/tickets/JOR-059.md | suites completas verdes, coverage ≥90 | — | DET-7, DET-13, RULE-testing-coverage-threshold-002, RULE-global-005 | done | 3 |
| **S3.GATE** | Gate de sync Session 3 (tier: T1, ⚑ fuerte — cierre) | — | reviewer | S3.T2 | projects/jormat-evolution/tickets/JOR-059.md | gate persistido + acceptance verde | — | DET-20, DET-23, DET-27 | done | 3 |

## Technical reference

- **Tipos** (contrato front→back, DEC-002): `TIPO_DTE_VALUES` (`backend/.../dto/documento.dto.ts:17-22`) y `ESTADO_SII_VALUES` (`:9`); espejo front en `lib/schemas/ventas.ts:43-55`.
- **Stub actual**: `sales.service.ts:106-117` (STUB_CREATED), metodos `createDraft`/`issueFactura`.
- **Primitiva UI**: `Alert` (usado en `TransactionBuilder.tsx:284` para stock) — base del `SimulacionSiiBanner`.
- **Copy canonico DS-3**: `Emisión simulada — sin conexión al SII (folio y estado demo)`.
- **Copy DS-4**: `no disponible en demo`.

## Constraints

- RULE-global-001: clean code, tipado estricto, sin `any`, sin `console.*`.
- RULE-global-002: seguridad baseline — `estadoSII` validado contra enum (whitelist), sin relajar caps ni aislacion.
- RULE-global-005: docs + tests revisados al cerrar (actualizado | n/a + razon).
- RULE-testing-coverage-threshold-002: coverage global ≥90.
- RULE-frontend-001/002: organizacion `components/<domain>/<layer>/<Name>/` + test/story co-locados.
- DEC-002: contrato tipado front→back (Zod fuente); el campo opcional nuevo no rompe el contrato.

## Dependencies

| Dependency | Type | Description | Risk |
|------------|------|-------------|------|
| SPEC-sales-documents (JOR-014) | internal | Define vista 02/03 y el patron transaction-builder donde se inserta el banner | bajo — solo se extiende |
| SPEC-purchases-supplier-invoices (JOR-015) | internal | Define builder 08 donde va el banner | bajo — solo se extiende |
| Primitiva `Alert` (ui) | internal | Base visual del banner | bajo — ya existe y se usa |

## Risks and mitigations

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Folio in-memory colisiona entre tipos | low | medium | `Map<TipoDTE,number>` con serie por tipo + TC1/TC2 |
| `estadoSII` opcional rompe consumidores | low | medium | campo opcional + default en service + TC3 (sin campo → aceptado) |
| Coverage baja de 90 | medium | high | test por cada cambio; S3 verifica antes de cerrar |
| Banner en 08 confunde (semantica SII de ventas) | low | low | copy unico dictado por el request; componente compartido |

## Open questions

- (ninguna — todas las hipotesis del intake convergieron; DS-3 detalle resuelto via aviso de listado + backlog)

## Decisions (cerradas durante design)

### DEC-LOCAL-01: Mock backend limitado a sales
- **Contexto**: el request menciona "sales/purchases" para el backend del mock.
- **Drivers**: la factura de proveedor (purchases) no se emite al SII; no tiene folio/estado SII.
- **Opcion elegida**: backend del mock (folio/estado) solo en `sales`. Banner UI en ambos builders (pedido explicito).
- **Alternativas**: extender purchases con folio/estado ficticios — descartado (semantica incorrecta, scope creep).
- **Consecuencias**: backend acotado; purchases sin cambios de contrato.
- **Session**: design.

### DEC-LOCAL-02: DS-3 "detalle" → aviso de listado + backlog
- **Contexto**: DS-3 pide badge/aviso "en el detalle del DTE".
- **Drivers**: no existe vista de detalle (`handleView` es toast placeholder).
- **Opcion elegida**: aviso de simulacion a nivel listado 02 ahora; badge por-DTE diferido a backlog (should).
- **Alternativas**: construir la vista de detalle — descartado (fuera de alcance).
- **Consecuencias**: la simulacion se advierte donde el usuario ve los DTE hoy; el badge fino queda trackeado.
- **Session**: design.

## Acceptance checkpoints

- [ ] **Funcional**: scenarios de REQ-01..05 pasan
- [ ] **Tests**: TC1-TC8 escritos y verdes
- [ ] **NFRs**: `estadoSII` validado por enum; sin `any`
- [ ] **Rules**: RULE-frontend-001/002, RULE-global-001/002/005 respetadas
- [ ] **Integration**: suites sales/builders/listado verdes (REQ-PRESERVE), coverage ≥90
- [ ] **Docs**: `jormat_docs/backend` + `api` (si aplica) + `external-dependencies.md` actualizados/registrados
