# Smoke report de migración — 2026-08-24

## Resultado

Estado: **PASS con hallazgos controlados**.

- Foreign keys: PASS; `PRAGMA foreign_key_check` no devolvió filas.
- IDs duplicados dentro de un mismo proyecto: PASS; no se encontraron duplicados.
- Matrices por ticket: PASS; `up1` 138, `kanai_self` 1, `kanai_test` 5, `kn_bench` 2.
- Guías generadas: PASS; 1 guía global y 4 matrices por proyecto.
- Suite del core: PASS; 46 archivos y 197 tests.
- Fuente `up1`: sin modificaciones; el smoke solo leyó DB y archivos.

## Conteos actuales

| Proyecto | Tickets | Specs | Learns | Tests | Records |
| --- | ---: | ---: | ---: | ---: | ---: |
| `kanai_self` | 1 | 1 | 0 | 13 | 0 |
| `kanai_test` | 5 | 2 | 3 | 6 | 0 |
| `kn_bench` | 2 | 2 | 0 | 61 | 3 |
| `up1` | 138 | 50 | 465 | 1.632 | 496 |
| **Total** | **146** | **55** | **468** | **1.712** | **499** |

La cifra de specs tipadas por proyecto se obtiene por tickets vinculados; el inventario global anterior reporta 56 filas porque incluye un spec huérfano que debe conservarse con `ticket_id = null`.

## Inventario KB de up1

439 archivos: 360 Markdown, 36 HTML, 25 PNG, 6 JS, 4 DS_Store, 3 SQL, 3 PDF, 1 ZIP y 1 JSON.

Los binarios y auxiliares no se convierten automáticamente a records. Deben conservar path, MIME, hash y referencia al ticket/proyecto cuando exista.

## Hallazgo de identidad

Hay `external` repetidos dentro de `up1`, incluyendo:

- `UPONE-1038`: 11 tickets.
- `UPONE-1219`: 7 tickets.
- `UPONE-1345`: 6 tickets.
- `UPONE-1100`, `UPONE-1270`, `UPONE-1382` y otros: múltiples tickets.

Esto confirma que `external` no puede ser la clave primaria. La migración debe usar `project_id + ticket.id`, conservar el external como índice y generar reporte de colisiones.

## Próximo gate

No se ejecutó limpieza ni recarga de `up1`. Antes de esa fase todavía faltan:

1. dry-run del migrador completo;
2. manifiesto de hashes de origen/destino;
3. reporte de cuarentena;
4. smoke de round-trip de cada tipo de artefacto;
5. aprobación explícita para el borrado controlado de los artefactos actuales de `up1`.
