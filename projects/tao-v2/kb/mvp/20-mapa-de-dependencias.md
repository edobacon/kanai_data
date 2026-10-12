---
id: DOC-kb-mvp-20-mapa-de-dependencias
project: tao-v2
type: doc
tags:
  - mvp
  - dependencias
  - ids
---

# MVP tao-v2: mapa de dependencias y equivalencia de ids

Resumen de las dependencias entre los 64 tickets (68 menos 5 absorbidos, más W04), camino crítico, paralelismo y equivalencia con los ids del plan V3. El detalle por ticket está en las fichas `10` a `14`. El orden por épicas está en `05-epicas-y-orden-de-ejecucion`.

## Ids absorbidos

Cinco tickets pequeños se fundieron en otro para no pagar el costo fijo de intake, spec, gate y review en cada uno. Los documentos que aún los nombran (02, 03, 21) se leen con esta tabla; al crear los tickets se usan solo los ids vigentes.

| Id absorbido | Vigente | Qué quedó dentro |
| --- | --- | --- |
| B1-05 | B1-04 | Seed de perfiles y CLI de cuentas con perfil |
| B4-02 | B4-01 | Suspender y reactivar con revocación |
| B5-01 | B5-02 | Seed de productos y fixtures de unidades |
| W01c | W01b | Shell del backoffice y guardas por capacidad |
| P03 | P02 | Detalle de unidad y revelar código |

## Cambios de dependencias decididos el 2026-10-12

- B5-02 depende de B0-03, B1-03 y B2-02 (antes B3-03, la suite de integración de cuenta).
- B4-01 depende de B1-04 y B3-02 (antes B3-03 y B1-04).
- W04 (nuevo) depende de W01a y B3-02. W00 pasa a depender también de W04 porque enlaza al portal. Q02 suma W04.
- Alineación con las fichas: X02 depende de X01; T04d depende de T04b y A06 (no de T04c); T05d depende de T05b y T04b (no de T05c).

## Dependencias por ticket

| Ticket | Depende de |
| --- | --- |
| X01 | ninguno |
| X02 | X01 |
| B0-01 | ninguno |
| B0-02 | B0-01 |
| B0-03 | B0-02 |
| B1-01 | B0-03 |
| B1-02 | B1-01 |
| B1-03 | B1-01, B1-02 |
| B1-04 | B1-03, X01 |
| B2-01 | B1-01 |
| B2-02 | B2-01, B1-03 |
| B3-01 | B1-03, B2-02 |
| B3-02 | B3-01 |
| B3-03 | B3-02 |
| B3-04 | B3-02, B7-01 |
| B4-01 | B1-04, B3-02 |
| W01a | B1-03, X01, X02 |
| W04 | W01a, B3-02 |
| W00 | W01a, B2-01, W04 |
| W01b | W01a, B1-04, B2-02 |
| W02 | W01b, B4-01 |
| B5-02 | B0-03, B1-03, B2-02 |
| B7-01 | B5-02, B4-01, B1-04 |
| W03 | W02, B7-01 |
| B6-01 | B7-01 |
| B6-02 | B6-01 |
| P01 | W01b, W03, B6-01 |
| P02 | P01, B6-02 |
| A00 | X02 |
| A02 | A00, B1-03 |
| A05 | A00 |
| A06 | A00 |
| A03a | A02, A05, B3-01 |
| A03b | A03a, B1-02 |
| A04 | A03a, B3-03 |
| T01a | A00, A05 |
| T01b | T01a |
| T02a | A00 |
| T02b | T02a, T01a |
| T03a | A00, A03a, B5-02 |
| T03b | T03a, T02b |
| T04a | T01b |
| T04b | T04a, A06 |
| T04c | T04b |
| T04d | T04b, A06 |
| T05a | T04c |
| T05b | T05a |
| T05c | T05b |
| T05d | T05b, T04b |
| T06 | T05c, T03a, B5-02, T04d |
| T06b | T06, A05 |
| T06c | T06b, A02 |
| T07a | T05c |
| T07b | T07a, A06 |
| T08a | T07a, T03a, B5-02 |
| T08b | T08a, A06 |
| T09a | T08a |
| T09b | T09a |
| T10a | T06, T09a |
| T10b | T10a, T09b |
| T11a | T10a |
| T11b | T11a, T10b |
| Q01 | P02, T11b, T06c, T03b |
| Q02 | Q01, A04, W02, W03, W04, B3-04 |

## Camino crítico

1. Servidor y productor: X01, B0-01, B0-02, B0-03, B1-01, B1-02, B1-03, B1-04, B2-01, B2-02, B3-01, B3-02, B4-01, B7-01, W03, B6-01, B6-02, P01, P02 (con B5-02, B3-03, W01a, W04, W00, W01b y W02 en paralelo). B3-04 cierra cuando B7-01 esté listo.
2. App: X02, A00, A05, T01a, T01b, T04a, T04b, T04c, T04d, T05a, T05b, T05c, T06, T07a, T08a, T09a, T10a, T11a, T11b (con T03a y T03b, que necesitan B5-02 y A03a).
3. Ambos convergen en Q01 y luego Q02. El carril de la app es el más largo (36 tickets contra 28 del servidor y la web).

## Paralelismo

- Arrancan sin dependencias: X01, B0-01. X02 espera a X01 y A00 espera solo a X02 (que es de documentación y assets, no de servidor).
- Todo el trabajo de la app que no toca servidor (A00, A05, A06, T01a, T01b, T02a, T02b, T04a a T04d, T05a a T05d) puede correr en paralelo con el servidor.
- La web (W01a en adelante) y la app corren en paralelo después de B1-03 y X02.
- W04 y W00 corren en paralelo con W01b y no están en el camino crítico; W04 puede entregarse en cuanto exista B3-02.
- B5-02 ya no espera a la suite de cuenta: corre en paralelo con B3-01, B3-02, B3-03 y B4-01 tras B2-02.
- T05d corre en paralelo con T06 y no bloquea otros tickets (está dentro del MVP, como último de su épica).
- Orden de entrega del servidor: B0, B1, B2, luego B5-02 y B3 (núcleo), B4-01, B7-01, B6 y la web (W01a, W04, W00, W01b, W02, W03, P01, P02); B3-04 al final.

## Conteo

- X01 más B0 a B3 (incluye B3-04): 14 tickets. B4-01, B5-02, B6-01, B6-02, B7-01: 5. Web (W00, W01a, W01b, W02, W03, W04): 6. P01 y P02: 2. App base (X02, A00, A02, A05, A03a, A03b, A04, A06): 8. Tablero T01a a T11b (incluye T04d, T05d, T06b y T06c): 27. Cierre (Q01, Q02): 2. Total: 64.

Detalle del tablero: 17 tickets en `13` (T01a a T06c) más 10 en `14` (T07a a T11b) = 27.

## Equivalencia con el plan V3

| Id MVP | Id V3 | Cambio |
| --- | --- | --- |
| X01 | nuevo | N |
| X02 | nuevo | N |
| B0-01, B0-02 | V3-B0-01, V3-B0-02 | C |
| B0-03 | nuevo | N |
| B1-01, B1-02, B1-03 | V3-B1-01, 02, 03 | C o = |
| B1-04 (con B1-05) | nuevo | N |
| B2-01, B2-02 | V3-B2-01, 02 | = o C |
| B3-01, B3-02, B3-03 | V3-B3-01, 02, 03 | C o = |
| B3-04 | nuevo (parte de V3-B3-02) | N |
| B4-01 (con B4-02) | V3-B4-01, 02 | = o C |
| B5-02 (con B5-01) | V3-B5-01, 02 | C o = |
| B6-01, B6-02 | V3-B6-01, 02 | = |
| B7-01 | V3-B7-01 | C |
| W00 | nuevo | N |
| W04 | nuevo (portal de eliminación, guía 17 de `diseno-web`) | N |
| W01a, W01b (con W01c) | FE-W01 | P |
| W02 | FE-W02 y FE-W03 | C (fusión) |
| W03 | FE-W04 | C |
| P01, P02 (con P03) | FE-P01, 02, 03 | = |
| A00 | nuevo | N |
| A02 | FE-A01 y FE-A02 | C (fusión) |
| A05 | nuevo | N |
| A03a, A03b | FE-A03 | P |
| A04 | FE-A04 | = |
| A06 | nuevo | N |
| T01a, T01b | FE-T01 | P |
| T02a, T02b | FE-T02 | P |
| T03a, T03b | FE-T03 | P |
| T04a, T04b, T04c | FE-T04 | P |
| T04d | FE-T04 (ficha de Casa V-05) | P |
| T05a, T05b, T05c | FE-T05 | P |
| T05d | FE-T05 (animación de dados) | P |
| T06 | FE-T06 | C |
| T06b, T06c | nuevo | N (recordatorios, D-07) |
| T07a, T07b | FE-T07 | P |
| T08a, T08b | FE-T08 | P |
| T09a, T09b | FE-T09 | P |
| T10a, T10b | FE-T10 | P |
| T11a, T11b | FE-T11 | P |
| Q01, Q02 | FE-Q01, FE-Q02 | = o C |

La referencia con los tickets cerrados de v1 (TAO-249 a TAO-254 para el motor local) está en `historico-v1/tickets-cerrados-taomangalam`; TAO-255 a TAO-258 estaban planificados y se rehacen aquí como T07a a T11b (cada uno asignado a una sola pareja de motor y UI).

## Vistas por ticket (matriz que faltaba en V3)

V-31 y V-51 en A02; V-27 en A04 y T06c; V-23, V-24, V-25 en A03a; V-26 en A03b; V-01 en T01a; V-44 y V-45 en T01b; V-28, V-29 en T02b; V-02, V-39 en T03b; V-03 en T04a; V-32 en T04b; V-04 en T04c; V-05 en T04d; V-06 en T05a; V-07 en T05b; V-08 en T06 y T06c; V-09, V-10 en T07b; V-11 en T08b; V-12 en T09b; V-13 en T10b; V-14 en T11b; V-17, V-18, V-19 en W02; V-36 en P01; V-37 y V-49 en P02. La presentación pública (W00) y el portal de eliminación (W04) no corresponden a ninguna de las 33 vistas del MVP: son páginas nuevas fuera del catálogo de vistas, y el catálogo debe sumarlas (a registrar en la DEC de X01). La matriz completa vista a muestra a familia de fondo está en `03-referencia-de-diseno-y-muestras`.
