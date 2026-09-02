---
id: SPEC-frontend-invoice-customer-selection
project: jormat-evolution
ticket: JOR-067
status: done
---

# Crear factura cliente: RUT unico select-suggest, datos del cliente, DatePicker y "Actualizar receptor"

# Crear factura cliente: RUT unico select-suggest, datos del cliente, DatePicker y "Actualizar receptor"

## Executive summary — lo que estas aprobando

> *Revision rapida. El detalle vive en Requirements / Artifacts / Tasks.*

**Que se quiere**: alinear la seccion de cliente/receptor y el campo Fecha de la vista "Crear factura cliente" a la maqueta acordada. Hoy la vista tiene dos inputs de RUT (deberia ser uno), al elegir un cliente solo copia 2 de sus 5 datos, la fecha usa el picker nativo del navegador, y el boton "Actualizar receptor" no hace nada. Se cierra todo eso, 100% en frontend (el backend ya entrega lo necesario).

**Decisiones criticas que necesitan tu OK**:

| # | Decision | Por que importa |
|---|----------|----------------|
| 1 | Minimizar dependencias: DatePicker con `date-fns` (ya instalada) sobre un popover propio; select-suggest reutilizando el listbox que ya existe. A lo sumo se agrega `@radix-ui/react-popover` | Evita 2-3 deps nuevas (`react-day-picker`/`cmdk`) y rebuild mayor de imagen; respeta "solo aditivo" (RULE-global-003) |
| 2 | DatePicker como primitiva reusable en `ui/date-picker/` | Reusable a futuro; RULE-frontend-001 (carpeta + test + story). No se bloquea contra JOR-006 |
| 3 | Unificar los dos inputs de RUT en un solo select-suggest | Cambio visible de UI; hay que preservar los tests del autocompletado previo (JOR-058) |

**Riesgos principales y como los mitigamos**:

- **Romper el autocompletado existente (JOR-058) al unificar los inputs de RUT** → correr los tests `TransactionBuilder.extra.test.tsx` / `guard.test.tsx` como regresion antes de cerrar S2; adaptar selectores de test si cambian labels, sin cambiar la logica cubierta.
- **Coverage global cae bajo 90 al agregar el DatePicker** → test unit del DatePicker + story en la misma task que lo crea (S1.T2), no diferido.
- **Accesibilidad/teclado del DatePicker y del select-suggest hechos a mano** → usar Radix Popover para foco/escape; navegacion por teclado en el listbox (arriba/abajo/enter/escape) cubierta por test.

**Que NO se hace en este ticket**:

- No se toca backend: el endpoint `GET /api/catalogos/clientes` y el `ClienteDto` ya devuelven los 5 campos.
- No se promueve formalmente el DatePicker a la libreria UI de JOR-006 (queda como cross-ref; catalogarlo alla es follow-up).
- No se agregan `react-day-picker` ni `cmdk` (decision 1).

**Tamano estimado**: 2 sessions ejecutables (S1 DatePicker, S2 cliente/receptor), ~2.5-4h efectivas. La mas riesgosa es S2 (unificacion del RUT + regresion de tests JOR-058).

**Como vas a saber que funciona**:

- Abro Crear factura, veo **un solo** campo Rut/Razon social; escribo, sugiere clientes, elijo uno y "Datos del cliente" muestra razon social, RUT, telefono, ciudad y direccion.
- El campo Fecha abre un calendario propio y al elegir un dia el valor queda en el form.
- Con un cliente cargado, click en "Actualizar receptor" recarga sus datos.
- Los tests existentes del autocompletado siguen verdes; coverage global ≥90.

---

## Purpose

Completar la vista de crear factura del modulo de ventas (componente `TransactionBuilder` + `CustomerCard`) para que la seleccion de cliente sea un unico select-suggest que pobla todos los datos del receptor, la fecha use un DatePicker propio reusable, y "Actualizar receptor" recargue los datos por RUT. Consumidor: usuario que emite facturas. Valor: la UI queda alineada a la maqueta y sin comportamientos a medias.

## Requirements

### REQ-01: RUT unico como select-suggest que pobla los datos del cliente

> **Que cambia**: en vez de dos campos de RUT (un buscador + un campo suelto), ves uno solo; al elegir un cliente, "Datos del cliente" se llena completo (razon social, RUT, telefono, ciudad, direccion).
> **Por que**: hoy hay RUT duplicado (desvio de la maqueta) y al seleccionar solo se copian 2 de 5 campos, dejando la tarjeta a medio llenar.

El sistema MUST presentar un unico campo "Rut / Razon social" con typeahead (select-suggest) en "Datos del documento", y al seleccionar un cliente MUST poblar en el receptor los 5 campos (razonSocial, rut, telefono, ciudad, direccion).

<details><summary>Scenarios de validacion</summary>

#### Scenario: seleccion pobla todo
- **GIVEN** la vista de crear factura con el stub de clientes disponible
- **WHEN** escribo ≥2 caracteres en el campo Rut/Razon social y elijo un cliente
- **THEN** "Datos del cliente" muestra razonSocial, rut, telefono, ciudad y direccion del cliente elegido

#### Scenario: un unico input de RUT
- **GIVEN** la vista de crear factura
- **WHEN** inspecciono la seccion de documento/cliente
- **THEN** existe exactamente un campo de RUT (el select-suggest), no dos

#### Scenario: sin resultados
- **GIVEN** escribo un termino que no matchea ningun cliente
- **WHEN** el buscador responde vacio
- **THEN** se muestra un estado "sin resultados" y no se rompe el form

</details>

### REQ-02: Campo Fecha con DatePicker propio

> **Que cambia**: el campo Fecha abre un calendario de la app en vez del selector nativo del navegador.
> **Por que**: consistencia visual con la maqueta y control del formato; el nativo varia por navegador/OS.

El sistema MUST reemplazar el `<input type=date>` del campo Fecha por un componente DatePicker propio (`ui/date-picker/`), reusable, que integre con react-hook-form y exponga el valor en el mismo formato que consume el submit actual.

<details><summary>Scenarios de validacion</summary>

#### Scenario: elegir fecha
- **GIVEN** la vista de crear factura
- **WHEN** abro el DatePicker y elijo un dia
- **THEN** el campo Fecha del form toma ese valor y el popover se cierra

#### Scenario: valor inicial
- **GIVEN** el form con una fecha por defecto (hoy)
- **WHEN** se renderiza el DatePicker
- **THEN** muestra la fecha por defecto seleccionada

#### Scenario: integracion RHF
- **GIVEN** el DatePicker montado dentro del form
- **WHEN** se envia "Facturar"
- **THEN** el valor de fecha viaja en el payload igual que antes (sin romper el submit)

</details>

### REQ-03: "Actualizar receptor" recarga los datos por RUT

> **Que cambia**: el boton "Actualizar receptor" deja de ser un aviso vacio y recarga los datos del cliente por el RUT actual.
> **Por que**: hoy es un stub (`toast.info('… no implementado')`); no cumple su proposito.

El sistema MUST, al hacer click en "Actualizar receptor", re-consultar el catalogo de clientes por el RUT actual del receptor y repoblar los 5 campos con la respuesta. La consulta MUST propagar `AbortSignal` (RULE-api-client-001).

<details><summary>Scenarios de validacion</summary>

#### Scenario: refresh exitoso
- **GIVEN** un receptor ya seleccionado con RUT valido
- **WHEN** hago click en "Actualizar receptor"
- **THEN** se re-consulta por ese RUT y los campos se refrescan con la respuesta

#### Scenario: sin RUT
- **GIVEN** el receptor sin RUT cargado
- **WHEN** miro el boton "Actualizar receptor"
- **THEN** el boton esta deshabilitado (no hay por que refrescar)

</details>

### REQ-REGRESSION: preservar el autocompletado existente

> **Que cambia**: nada visible nuevo — se garantiza que el buscador de cliente que ya funcionaba (JOR-058) sigue funcionando tras unificar los inputs.
> **Por que**: la unificacion del RUT toca el mismo componente que el autocompletado previo.

El sistema MUST mantener verdes los tests existentes del autocompletado de cliente (`TransactionBuilder.extra.test.tsx`, `TransactionBuilder.guard.test.tsx`, `CustomerCard.test.tsx`) tras los cambios; adaptaciones de selector permitidas, cambios de comportamiento cubierto no.

## Artifacts

Sin meta-specs en el proyecto → los artifacts son componentes/archivos frontend:

### Componente nuevo: `ui/date-picker/`
- **Archivos**: `DatePicker.tsx`, `DatePicker.test.tsx`, `DatePicker.stories.tsx`, `index.ts` (RULE-frontend-001).
- **API (props)**: `value: Date | string`, `onChange: (v) => void`, `disabled?`, `id?`, integrable con `Controller` de RHF. Calendario con `date-fns` para meses/dias; popover para el panel.
- **Consumidor concreto**: campo Fecha de `TransactionBuilder` (S1.T3).

### Refactor: select-suggest unico de cliente (en `TransactionBuilder`)
- Extraer/reusar el listbox inline actual (`TransactionBuilder.tsx:362-401`) como el unico campo Rut/Razon social; eliminar el `receptor.rut` suelto (`:404-406`). `onSelect` setea los 5 campos.
- **Consumidor concreto**: la vista misma.

### Extension de schema: `receptor`
- Extender el schema del `receptor` (form del builder + `lib/schemas`) de `{rut, razonSocial}` a `{rut, razonSocial, telefono, ciudad, direccion}`. Reusa la forma de `clienteSchema` (`lib/schemas/catalogos.ts:50-56`).
- **Consumidor concreto**: `CustomerCard` (muestra los 5) + `onSelect` + handler de refresh.

### Handler: "Actualizar receptor" (en `CustomerCard`)
- Reemplaza el stub por re-fetch via `useClientes`/`listClientes(rut, { signal })`; repuebla el receptor. Deshabilitado si no hay RUT.

## Tasks

### Session 1 — DatePicker custom reusable + wiring al campo Fecha [tipo: ⚑ fuerte] [tier: T3]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S1.T1 | Crear componente `DatePicker` (calendario con date-fns + popover) + barrel `index.ts` | REQ-02 | developer | — | `front/jormat-front/src/components/ui/date-picker/DatePicker.tsx`, `.../date-picker/index.ts`, `package.json` (si se agrega `@radix-ui/react-popover`) | build ok + render manual | git revert de la carpeta `date-picker/` | DET-1, DET-2, DET-8, RULE-frontend-001, RULE-global-001 | done | 1 |
| S1.T2 | Test + story del DatePicker (jsdom + storybook), cubrir elegir/valor inicial/teclado | REQ-02 | developer | S1.T1 | `.../date-picker/DatePicker.test.tsx`, `.../date-picker/DatePicker.stories.tsx` | vitest run date-picker + coverage no baja | git revert de los archivos de test/story | DET-7, RULE-frontend-002, RULE-testing-coverage-threshold-002 | done | 1 |
| S1.T3 | Cablear DatePicker al campo Fecha en `TransactionBuilder` (reemplazar `<Input type=date>`, integrar con RHF) | REQ-02 | developer | S1.T1 | `front/jormat-front/src/components/ventas/builder/TransactionBuilder/TransactionBuilder.tsx` | vitest run builder + smoke UI del picker | restaurar `<Input type=date>` | DET-5, DET-8, DET-10, RULE-global-001 | done | 1 |
| **S1.GATE** | Gate de sync Session 1 (tier T3): quality review + smoke UI real (DET-36) | — | reviewer | S1.T3 | ticket | gate persistido | — | DET-20, DET-23, DET-36 | done | 1 |

### Session 2 — RUT unico select-suggest + poblado del cliente + "Actualizar receptor" [tipo: ⚑ fuerte] [tier: T3]

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S2.T1 | Extender el schema del `receptor` a 5 campos (form del builder + `lib/schemas`) | REQ-01 | developer | — | `front/jormat-front/src/lib/schemas/catalogos.ts`, schema del form en `components/ventas/builder/` | build + typecheck | revertir el schema a `{rut, razonSocial}` | DET-1, DET-2, DET-8, RULE-global-001 | done | 2 |
| S2.T2 | Unificar los dos inputs de RUT en un unico select-suggest; `onSelect` pobla los 5 campos del receptor | REQ-01 | developer | S2.T1 | `.../builder/TransactionBuilder/TransactionBuilder.tsx`, `.../builder/CustomerCard/CustomerCard.tsx` | vitest run builder + smoke UI | restaurar los 2 inputs + onSelect a 2 campos | DET-5, DET-8, DET-10, DET-16, RULE-global-003 | done | 2 |
| S2.T3 | Implementar "Actualizar receptor" (re-fetch por RUT con AbortSignal; disabled sin RUT) | REQ-03 | developer | S2.T1 | `.../builder/CustomerCard/CustomerCard.tsx`, `src/services/api/catalogos/clientes.ts` (si falta filtro por rut) | vitest run + smoke UI | restaurar el stub `toast.info` | DET-8, DET-10, RULE-api-client-001 | done | 2 |
| S2.T4 | Tests + story: regresion JOR-058 verde, TCs de poblado/refresh, actualizar `CustomerCard.stories` | REQ-01, REQ-03, REQ-REGRESSION | developer | S2.T2, S2.T3 | `.../TransactionBuilder/*.test.tsx`, `.../CustomerCard/CustomerCard.{test,stories}.tsx` | vitest run + coverage ≥90 | git revert de los tests | DET-7, RULE-frontend-002, RULE-testing-coverage-threshold-002 | done | 2 |
| **S2.GATE** | Gate de sync Session 2 (tier T3): quality review + regresion + smoke UI real (DET-36) | — | reviewer | S2.T4 | ticket | gate persistido | — | DET-20, DET-23, DET-36 | done | 2 |

## Technical reference

- Endpoint: `GET /api/catalogos/clientes?q=` → `ClienteDto[]` con `{id, razonSocial, rut, telefono, ciudad, direccion}` (`backend/.../catalogos/dto/catalogos.dto.ts:111-130`).
- Front: `listClientes(q, opts)` (`src/services/api/catalogos/clientes.ts:14-21`, ya propaga AbortSignal) + `useClientes(q, {enabled})` (`src/hooks/useCatalogos.ts:93-99`).
- Estado actual del onSelect: `TransactionBuilder.tsx:119-122` (setea rut+razonSocial). RUT suelto: `:403-406`. Boton stub: `CustomerCard.tsx:56-67`. Campos leidos: `CustomerCard.tsx:40-54`.
- `clienteSchema` (5 campos): `src/lib/schemas/catalogos.ts:50-56`.
- Dep disponible: `date-fns ^4.4.0`. Radix instalado (dialog/dropdown-menu/select/switch/tooltip/separator/label/slot/avatar). NO instalados: `@radix-ui/react-popover`, `react-day-picker`, `cmdk`.

## Constraints

- RULE-frontend-001: carpeta-por-componente (DatePicker con test+story+barrel).
- RULE-frontend-002: convenciones de test/story (Radix portal, RHF prop, storybook).
- RULE-api-client-001: GET propaga `AbortSignal` (aplica al refresh).
- RULE-testing-coverage-threshold-002: coverage global ≥90 (bloqueante).
- RULE-global-001..005: DoD calidad, seguridad, base entregada solo aditiva, dev stack limpio (rebuild si se agrega dep), docs+tests al cerrar.
- DEC-LOCAL-01 (intake): minimizar deps.

## Dependencies

| Dependency | Type | Description | Risk |
|------------|------|-------------|------|
| `@radix-ui/react-popover` | external | Solo si se decide usar popover Radix para DatePicker/select-suggest | Bajo — coherente con Radix ya presente; requiere rebuild de imagen |
| SPEC-catalogos-front-consumo | internal | `useClientes`/`listClientes` ya cableados | Ninguno — done |

## Risks and mitigations

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Unificar RUT rompe tests JOR-058 | medium | medio | Correr `TransactionBuilder.extra/guard` como regresion en S2.T4 antes del gate; adaptar selectores sin cambiar comportamiento |
| Coverage cae bajo 90 por el DatePicker | medium | alto (bloquea) | Test+story del DatePicker en S1.T2 (misma session que lo crea) |
| A11y/teclado del picker/listbox hechos a mano | low | medio | Radix Popover para foco/escape; test de navegacion por teclado |

## Open questions

- (ninguna abierta — la decision de deps quedo diferida a la ejecucion de S1.T1 con recomendacion DEC-LOCAL-01; no bloquea el spec)

## Decisions (cerradas durante design)

### DEC-LOCAL-01: minimizar dependencias del DatePicker/select-suggest
- **Contexto**: `ui/` no tiene Popover/Command/Calendar; construir "shadcn estandar" pediria `react-day-picker`+`cmdk`+`@radix-ui/react-popover`.
- **Drivers**: RULE-global-003 (aditivo), RULE-global-004 (rebuild al agregar deps), reuso del listbox existente, `date-fns` ya instalado.
- **Opcion elegida**: build con `date-fns` + reuso del listbox; a lo sumo `@radix-ui/react-popover`.
- **Alternativas**: shadcn estandar con 2-3 deps (descartado por superficie/rebuild); mantener nativo (descartado — el dev pidio custom).
- **Consecuencias**: mas codigo propio (a11y/teclado a mano) a cambio de cero/una dep.
- **Session**: intake/design.

### DEC-LOCAL-02: DatePicker como primitiva reusable en `ui/date-picker/`
- **Contexto**: el ticket pide componente reusable; JOR-006 (libreria UI) esta in_progress.
- **Opcion elegida**: construir en `ui/date-picker/` scoped a JOR-067, cross-ref a JOR-006 sin bloqueo.
- **Consecuencias**: disponible ya; catalogar en JOR-006 queda como follow-up.
- **Session**: intake/design.

## Acceptance checkpoints

- [ ] **Funcional**: scenarios de REQ-01, REQ-02, REQ-03 pasan
- [ ] **Tests**: TCs escritos y verdes; regresion JOR-058 verde
- [ ] **NFRs**: n/a (feature UI sin targets de performance/scale)
- [ ] **Rules**: RULE-frontend-001/002 respetadas (carpeta + test + story); RULE-api-client-001 (AbortSignal en refresh)
- [ ] **Integration**: un unico input de RUT; submit "Facturar" sigue funcionando; coverage global ≥90
- [ ] **Docs**: revisar `jormat_docs/frontend/` y `docs/` del repo — actualizar o registrar n/a+razon (RULE-global-005)
