---
id: SPEC-JOR-161-tech-debt-hygiene
project: jormat-evolution
ticket: JOR-161
status: in_progress
---

# SPEC-JOR-161-tech-debt-hygiene — Barrer marcadores resueltos, docs internos con solo deuda actual, historial al KB

# SPEC-JOR-161-tech-debt-hygiene — Barrer marcadores resueltos, docs internos con solo deuda actual, historial al KB

## Executive summary — lo que estas aprobando

**Que se quiere**: dejar la deuda tecnica del proyecto reflejando SOLO la realidad actual. Tres frentes: (1) cerrar los cabos cerrables de la revision de inventario (N7/N9r/N11/N13); (2) barrer los ~78 marcadores `DEUDA_TECNICA` de backend+front aplicando RULE-global-006 (borrar los resueltos, re-apuntar los parciales); (3) realinear los dos listados internos a solo-deuda-actual y mover el historial de lo resuelto al KB `jormat_docs`.

**Decisiones criticas (ya tomadas por el dev, registradas en `decisions_log` del ticket)**:

| # | Decision | Por que importa |
|---|----------|----------------|
| 1 | Barrido completo (2 listados + todos los marcadores), no solo inventario | el dev pidio higiene transversal, no acotada a items |
| 2 | Marcador resuelto se BORRA; parcial se re-apunta | RULE-global-006 (level must) lo manda como DoD; este ticket lo enforce sobre toda la deuda ya resuelta |
| 3 | Historial de resueltos al KB `jormat_docs`; docs internos con solo deuda actual | git preserva el borrado; el KB es el hogar del registro auditable. Cambia la premisa del catalogo interno (hoy conserva resueltos) |

**Riesgos principales y mitigacion**:

- **Borrar un marcador cuya deuda es solo PARCIAL** → cada candidato a `delete` se RE-VERIFICA contra el codigo con grep antes de borrar (DET-33); un "Resuelto (parcial)" se re-apunta, no se borra.
- **Quitar `precio_iva` del SELECT y romper una vista que lo consuma** → auditar consumidores del campo antes (DET-40); la vista recomputa el IVA aparte, se confirma paridad.
- **Perder trazabilidad al vaciar el catalogo interno** → el historial se archiva integro en el KB ANTES de borrarlo de los docs internos (S4 antes o junto a S3 en el registro).

**Que NO se hace**:
- No se resuelve ninguna deuda ABIERTA de negocio (DT-01/02/05/... siguen abiertas; solo se limpian las YA resueltas).
- No se toca el codigo base del proveedor original (solo lo construido por el equipo).

**Tamano estimado**: 4 sessions (S1 inventario, S2 marcadores, S3 docs internos, S4 KB), tier T2 global.

**Como vas a saber que funciona**:
- `grep -rniE "DEUDA[_ ]?TECNICA"` (excl. node_modules/.claude/worktrees/coverage/dist/.next) devuelve SOLO marcadores de deuda abierta o parcial, cada uno con tracking_ref vigente.
- `docs/deuda-tecnica.md` y el review de inventario listan solo deuda abierta/parcial.
- El KB `jormat_docs` tiene el registro historico de lo resuelto (cada DT/N cerrado + ticket + evidencia).
- Backend sigue verde (unit + e2e) y cobertura >=90%.

## Purpose

Reflejar la realidad actual de la deuda tecnica: limpiar el codigo de marcadores ya resueltos, dejar los docs internos con solo deuda vigente y mover el historial de lo cerrado al KB.

## Requirements

### REQ-1 (N7): Guard de produccion en el seed de inventario

> **Que cambia**: `seeds/11_inventory_data.ts` arranca con `if (process.env.NODE_ENV === 'production') return;`.
> **Por que**: es el unico seed del directorio sin el guard; sin el, correr `knex seed:run` en produccion contaminaria datos reales.

El sistema MUST agregar `if (process.env.NODE_ENV === 'production') return;` como primera sentencia de la funcion `seed()` en `backend/jormat-api/seeds/11_inventory_data.ts`, consistente con los otros 11 seeds.

**Certeza**: confirmed. **Source_ref**: `seeds/11_inventory_data.ts:1-9`; patron en `seeds/03_rbac.ts:91`, `seeds/12_customers_data.ts:48`.
**Actor**: system · **Layers**: backend (seed)

#### Acceptance
`grep -L "NODE_ENV === 'production'" seeds/*.ts` no lista `11_inventory_data.ts`.

### REQ-2 (N9r): Quitar la columna muerta `precio_iva` del SELECT del listado

> **Que cambia**: `buildDataQuery` deja de seleccionar `precio_iva` (que `mapRowToDto` nunca consume; el IVA se recomputa como `Math.round(precio*0.19)`).
> **Por que**: trabajo de query desperdiciado + doble formula de IVA latente.

El sistema MUST eliminar la columna calculada `precio_iva` del `SELECT` de `buildDataQuery` en `items.repository.ts`, PREVIA auditoria de consumidores (DET-40): si alguna vista/consumidor la usa, se mapea en vez de quitarla. El IVA del listado sigue derivandose en `mapRowToDto`.

**Certeza**: confirmed (columna no mapeada). **Source_ref**: `items.repository.ts:967,1015` (SELECT) vs `mapRowToDto` (no la asigna).
**Actor**: system · **Layers**: backend (query, mapper)

<details><summary>Scenarios</summary>

#### Scenario: el listado sigue devolviendo el mismo IVA
- **GIVEN** items con precio conocido
- **WHEN** se pide el listado tras quitar `precio_iva` del SELECT
- **THEN** el `iva` de cada fila es identico al de antes (se recomputa en `mapRowToDto`)

</details>

#### Acceptance
El e2e del listado sigue verde con los mismos valores de `iva`; el SELECT ya no proyecta `precio_iva`.

### REQ-3 (N13): Sacar la coleccion Postman del arbol de codigo

> **Que cambia**: `jormat-api-items.postman_collection.json` se mueve fuera de `src`/raiz del paquete a `postman/` (o `docs/`).
> **Por que**: no es codigo; convive en el arbol del paquete.

El sistema MUST mover `backend/jormat-api/jormat-api-items.postman_collection.json` a un directorio dedicado (`postman/`), PREVIA verificacion de que ningun script/CI referencie la ruta actual (DET-40).

**Certeza**: confirmed. **Source_ref**: `backend/jormat-api/jormat-api-items.postman_collection.json`.
**Actor**: system · **Layers**: repo (ubicacion de archivo)

#### Acceptance
El archivo vive en `postman/`; `grep -rn "jormat-api-items.postman"` no deja referencias rotas.

### REQ-4 (N11): Confirmar cobertura >=90%

> **Que cambia**: se corre `jest --coverage` y se registra el resultado; si baja de 90 se cubren las ramas faltantes.
> **Por que**: N10 (tests de aislamiento) ya esta cubierto; falta cerrar la verificacion de cobertura del review.

El sistema MUST correr la cobertura del backend y registrar el resultado con evidencia. Si las 4 metricas quedan >=90%, REQ cerrado por verificacion; si alguna baja, MUST agregar tests hasta recuperar el piso.

**Certeza**: inferred (probable verde). **Source_ref**: `backend/jormat-api/jest.config.ts` (umbral 90).
**Actor**: system · **Layers**: backend (tests)

#### Acceptance
Salida de cobertura con las 4 metricas >=90% adjunta en el ticket (o tests agregados si hubo gap).

### REQ-5 (barrido de marcadores, RULE-global-006): Borrar resueltos, re-apuntar parciales

> **Que cambia**: cada marcador `DEUDA_TECNICA`/`DEUDA_TECNICA_CONFIRMAR` de deuda RESUELTA se borra del codigo; los de deuda PARCIAL se re-apuntan al remanente; los huerfanos se ticketean o limpian.
> **Por que**: RULE-global-006 (must) — un marcador que sobrevive a su causa miente; borrarlo al resolver es DoD.

El sistema MUST, a partir del inventario clasificado (task S2.T1: grep canonico + cruce con codigo), para cada marcador:
- veredicto `delete` (deuda resuelta total, verificada en codigo) → **eliminar** el marcador;
- veredicto `repoint` (parcial) → **actualizar** el tracking_ref al remanente, sin borrar;
- veredicto `keep` (abierta) → dejar intacto;
- veredicto `orphan` (sin tracking_ref) → ticketear (backlog) o limpiar.

Cada `delete` MUST estar respaldado por evidencia en codigo de que la causa esta cerrada (DET-33), no solo por el estado del catalogo.

**Certeza**: confirmed (barrido); la clasificacion por marcador se materializo en S2.T1 (inventario 2026-08-18, 75 marcadores). **Resultado verificado**: delete=3 (DT-10, marcador stale contradicho por codigo), repoint=0, keep=70 (todo el resto es deuda abierta/parcial vigente; DT-03/DT-04 ya re-apuntados por JOR-157/159), orphan=2 (`TransactionBuilder.tsx:145` minPrice, `origen-factura.ts:121` bodega-al-clonar; sin tracking_ref, a ticketear). **Correccion DET-4**: los candidatos que se creian resueltos con marcador vivo (DT-18/20/25/26/27/28) NO tenian marcador en codigo (DT-18/20/26/27/28 ya limpiados; DT-25 sigue ABIERTA, duplicada). **Source_ref**: `docs/deuda-tecnica.md` (DT-01..DT-28) + grep vivo + `scratchpad/jor161-marker-inventory.md`.
**Actor**: system · **Layers**: backend + frontend (comentarios/marcadores)

<details><summary>Scenarios</summary>

#### Scenario: marcador resuelto ya no aparece
- **GIVEN** un marcador de deuda resuelta-total re-verificada en codigo (inventario S2.T1: los 3 marcadores DT-10 en `PurchaseInvoiceBuilder.tsx:106` + `seed.test.tsx:8,121`, cuya causa esta cerrada en `items.repository.ts:976` + `PurchaseInvoiceBuilder.tsx:112`)
- **WHEN** se completa el barrido
- **THEN** `grep DEUDA_TECNICA` ya no lo encuentra en su `file:line`

#### Scenario: marcador parcial re-apuntado
- **GIVEN** un marcador de DT-03/DT-04/DT-10/DT-20 (parcial)
- **WHEN** se completa el barrido
- **THEN** el marcador sigue presente pero su tracking_ref apunta al remanente, no a un ticket que solo resolvio una parte

</details>

#### Acceptance
`grep DEUDA_TECNICA` no devuelve ningun marcador de deuda resuelta-total; los parciales quedan re-apuntados; no quedan huerfanos sin ticket.

### REQ-6 (docs internos = solo deuda actual): Vaciar los resueltos del catalogo y del review

> **Que cambia**: `docs/deuda-tecnica.md` y `jormat_docs/ongoing/incorporacion-tablas-y-deuda-inventario.md` quedan con SOLO deuda abierta/parcial; se eliminan filas/secciones de DT/N resueltos y los "Resumen"/anexos de resueltos.
> **Por que**: los docs internos deben mostrar la realidad actual; el historial vive en el KB (REQ-7).

El sistema MUST editar `docs/deuda-tecnica.md` eliminando las entradas de DT resueltos-total (indice, "Cerrable AHORA", secciones DT) y dejando una sola linea que enlace al historial del KB; MUST editar el review de inventario dejando la tabla N solo con hallazgos abiertos. Las entradas parciales se conservan trimmadas al remanente.

**Certeza**: confirmed. **Source_ref**: `docs/deuda-tecnica.md` (Indice L66-97, "Cerrable AHORA" L99-127, secciones DT), review de inventario (seccion 3, tabla N1-N13).
**Actor**: system · **Layers**: docs internos (repo de codigo + KB narrativo)

#### Acceptance
Ninguna entrada de DT/N resuelto-total queda en los docs internos; los parciales quedan trimmados; ambos enlazan al historico del KB.

### REQ-7 (KB = historial de resueltos): Registro auditable en jormat_docs

> **Que cambia**: se crea/actualiza un doc `reference` en `jormat_docs` con el historial de deuda resuelta: cada DT/N cerrado, el ticket que lo cerro y evidencia `file:line`.
> **Por que**: es el nuevo hogar de la trazabilidad que se quita de los docs internos.

El sistema MUST crear el doc `jormat_docs/reference/deuda-tecnica-resuelta.md` (type `reference`, frontmatter DKC estandar) que registre cada deuda resuelta (DT-10/18/20/25/26/27/28 y N1-N13 cerrados) con: id, titulo, ticket que la cerro, fecha, evidencia en codigo. Este doc MUST existir ANTES de vaciar los docs internos (REQ-6), para que el enlace de S4 apunte a un destino real (mitiga la perdida de trazabilidad; ver Risks).

**Destino fijado (cierra el gate T9 del ticket)**: `jormat_docs/reference/deuda-tecnica-resuelta.md`, type `reference`. Se ubica en `reference/` (no `ongoing/`) por ser registro evergreen, no trabajo en curso.

**Certeza**: confirmed. **Source_ref**: catalogo `docs/deuda-tecnica.md` (resueltos) + review de inventario (N resueltos).
**Actor**: system · **Layers**: KB (jormat_docs)

#### Acceptance
`jormat_docs/reference/deuda-tecnica-resuelta.md` existe, lista cada resuelto con su ticket + evidencia, y es el destino del enlace desde los docs internos.

### REQ-PRESERVE-1 (no-regresion del barrido y la edicion de docs)

> **Que se preserva**: el barrido de marcadores (REQ-5) y la edicion de docs (REQ-6/7) son cambios en comentarios y documentacion; NO deben alterar ningun comportamiento en runtime fuera de lo cubierto por REQ-1..4.
> **Por que**: borrar/reapuntar comentarios y editar `.md` no cambia logica; el guardrail explicito evita que un borrado toque codigo por error.

El sistema MUST garantizar que, tras REQ-5/6/7, la suite backend (unit + e2e) queda IDENTICA en resultado a antes del barrido (mismo numero de tests verdes, misma cobertura >=90%), y que ningun diff de REQ-5 toca lineas de codigo ejecutable (solo comentarios `DEUDA_TECNICA`). Un diff de REQ-5 que modifique una linea no-comentario es un hallazgo (DET-33/DET-40).

**Certeza**: confirmed. **Source_ref**: naturaleza de los cambios (comentarios + docs).
**Actor**: system · **Layers**: backend + frontend (verificacion)

#### Acceptance
`git diff` de REQ-5 solo toca lineas de comentario; suite backend verde con el mismo conteo y cobertura que el baseline pre-barrido.

## Artifacts (necessity + reuse — DET-32)

| Artifact | Veredicto | Racional |
|----------|-----------|----------|
| Guard de produccion en seed | **reduce** | patron ya existente en 11 seeds; se replica 1 linea |
| Quitar `precio_iva` del SELECT | **drop** (codigo muerto) | la columna no se consume; se elimina, no se construye nada |
| Mover Postman | **reduce** | solo reubicacion de archivo |
| Barrido de marcadores | **build** (proceso) | ejecucion de RULE-global-006 sobre inventario real; no hay artefacto nuevo de codigo |
| Doc historico en KB | **build** | no existe; es el destino del historial (decision del dev) |
| Realineado de docs internos | **reduce** | edicion de docs existentes (quitar resueltos) |

## Constraints

- **RULE-global-006** (must): borrar marcador resuelto = DoD; parcial se re-apunta; huerfano se ticketea o limpia.
- **DET-33**: cada `delete` de marcador se RE-VERIFICA contra el codigo (grep + fix site), no se confia en el catalogo.
- **DET-40**: antes de quitar `precio_iva` (REQ-2) y mover Postman (REQ-3), auditar consumidores/referencias.
- **DET-16 (propagacion)**: el estado real tras el barrido (S2) se propaga a docs internos (S3) y al KB (S4); los tres deben quedar coherentes.
- **DET-13**: cierre por evidencia — grep final, corrida de cobertura, backend verde.

## Risks and mitigations

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| Borrar un marcador parcial como si fuera resuelto | media | alto | re-verificacion en codigo por marcador (DET-33); parciales conocidos (DT-03/04/10/20) van a repoint |
| Quitar `precio_iva` rompe una vista consumidora | baja | medio | auditoria de consumidores (DET-40); e2e del listado como red |
| Perder trazabilidad al vaciar el catalogo | media | medio | orden de sesiones enforce el orden: S3 (KB historico REQ-7) va ANTES de S4 (vaciar docs internos REQ-6); S4 depende de S3.GATE, asi el enlace apunta a un doc ya existente |
| Mover Postman rompe un script/CI | baja | bajo | grep de referencias antes de mover |

## Tasks

| # | Task | source_ref | Agent | Depends on | Files | Validation | Rollback | Rules | Status | Session |
|---|------|-----------|-------|------------|-------|------------|----------|-------|--------|---------|
| S1.T1 | Guard de produccion en `11_inventory_data.ts` | REQ-1 | developer | — | backend/jormat-api/seeds/11_inventory_data.ts | grep -L no lista el seed | git revert | DET-2 | done | 1 |
| S1.T2 | Auditar consumidores de `precio_iva` y quitarlo del SELECT | REQ-2 | developer | — | backend/jormat-api/src/items/items.repository.ts | e2e listado verde, mismo `iva` | git revert | DET-40 | done | 1 |
| S1.T3 | Mover Postman a `postman/` tras grep de referencias | REQ-3 | developer | — | backend/jormat-api/jormat-api-items.postman_collection.json | grep sin referencias rotas | git mv inverso | DET-40 | done | 1 |
| S1.T4 | Correr el gate real de cobertura (`test:cov:all`, merge unit+e2e) y registrar | REQ-4 | tester | S1.T1,S1.T2 | backend/jormat-api | merge >=90 (branches>=89) | (n/a) | DET-13 | done | 1 |
| S1.GATE | Gate sync S1 (T1): quality review + verificacion + commits | REQ-1..4,REQ-PRESERVE-1 | reviewer | S1.T1..T4 | ticket | gate persistido | (n/a) | DET-20,DET-23,DET-33 | done | 1 |
| S2.T1 | Inventario clasificado de marcadores (grep + cruce codigo): delete/repoint/keep/orphan | REQ-5 | researcher | — | backend, front | tabla de veredictos con evidencia | (n/a) | DET-33 | done | 2 |
| S2.T2 | Borrar marcadores `delete` (re-verificados) | REQ-5 | developer | S2.T1 | PurchaseInvoiceBuilder.tsx, PurchaseInvoiceBuilder.seed.test.tsx | grep no encuentra los borrados | git revert | RULE-global-006,DET-33 | done | 2 |
| S2.T3 | Re-apuntar `repoint` al remanente + resolver `orphan` | REQ-5 | developer | S2.T1 | TransactionBuilder.tsx, origen-factura.ts | grep: 0 huerfanos (re-apuntados a JOR-161 B1/B2) | git revert | RULE-global-006 | done | 2 |
| S2.T4 | Verificar REQ-PRESERVE: diff de REQ-5 solo toca comentarios; suite verde igual al baseline | REQ-PRESERVE-1 | tester | S2.T2,S2.T3 | backend, front | diff solo-comentarios; suite verde mismo conteo | (n/a) | DET-33,DET-40 | done | 2 |
| S2.GATE | Gate sync S2 (T2): verificacion del barrido (grep + diff) + no-regresion | REQ-5,REQ-PRESERVE-1 | reviewer | S2.T2,S2.T3,S2.T4 | ticket | gate persistido | (n/a) | DET-23,DET-35,DET-33 | done | 2 |
| S3.T1 | Crear `jormat_docs/reference/deuda-tecnica-resuelta.md` con cada resuelto (DT + N) + ticket + evidencia | REQ-7 | developer | S1.GATE,S2.GATE | jormat_docs/reference/deuda-tecnica-resuelta.md | doc historico completo e indexado | git revert | DET-16 | done | 3 |
| S3.GATE | Gate sync S3 (T1): verificacion del historico (completo antes de vaciar docs internos) | REQ-7 | reviewer | S3.T1 | ticket | gate persistido | (n/a) | DET-13,DET-16 | done | 3 |
| S4.T1 | Vaciar resueltos de `docs/deuda-tecnica.md` (indice + Cerrable AHORA + secciones DT), enlazar al KB historico | REQ-6 | developer | S3.GATE | jormat-evolution-mono/docs/deuda-tecnica.md | solo deuda abierta/parcial; enlace al KB vivo | git revert | DET-16 | done | 4 |
| S4.T2 | Trimmar review de inventario a hallazgos abiertos, enlazar al KB historico | REQ-6 | developer | S3.GATE | jormat_docs/ongoing/incorporacion-tablas-y-deuda-inventario.md | tabla N solo abiertos; enlace al KB vivo | git revert | DET-16 | done | 4 |
| S4.GATE | Gate sync S4 (T2): coherencia codigo↔docs↔KB + cierre pendiente de OK (DET-30) | REQ-6 | reviewer | S4.T1,S4.T2 | ticket | gate persistido | (n/a) | DET-13,DET-16,DET-30 | done | 4 |

## Acceptance checkpoints

- [ ] **Funcional**: seed con guard; `precio_iva` fuera del SELECT con mismo `iva`; Postman reubicado.
- [ ] **Marcadores** (RULE-global-006): grep no deja resueltos; parciales re-apuntados; 0 huerfanos.
- [ ] **No-regresion** (REQ-PRESERVE-1): diff de REQ-5 solo toca comentarios; suite backend verde con el mismo conteo y cobertura que el baseline pre-barrido.
- [ ] **KB primero** (REQ-7): `jormat_docs/reference/deuda-tecnica-resuelta.md` creado y verificado (S3.GATE) ANTES de vaciar los docs internos.
- [ ] **Docs internos** (REQ-6): `docs/deuda-tecnica.md` + review con solo deuda actual, enlazando al KB historico ya existente.
- [ ] **Tests** (DET-13): backend unit + e2e verdes; cobertura >=90% con evidencia.
- [ ] **Propagacion** (DET-16): codigo (S2) → KB (S3) → docs internos (S4) coherentes; el orden de sesiones enforce que el KB exista antes de vaciar los docs.
