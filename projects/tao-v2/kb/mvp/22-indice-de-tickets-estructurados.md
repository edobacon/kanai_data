---
id: DOC-kb-mvp-22-indice-de-tickets-estructurados
project: tao-v2
type: doc
tags:
  - mvp
  - tickets
  - indice
  - epicas
  - dependencias
---

# Índice de los tickets estructurados del MVP

Índice buscable de los 64 tickets del MVP en el orden de las épicas. El detalle completo (alcance, criterios, verificación, riesgos) está en el archivo `tickets-mvp.txt` de esta carpeta, copia exacta del markdown con el que se crearon en Kanai, y las dependencias en `relaciones.json`. El respaldo por ticket indexado está en las fichas `10` a `14`.

Notas de uso:

- El archivo `.txt` separa tickets por encabezado H1 (`# ID. Título`). Para cargarlo en Kanai se usa una copia con extensión `.md`.
- `create_tickets_from_markdown` no cablea dependencias: las 117 relaciones se registraron después con `add_relation`, leyendo `relaciones.json`.
- El módulo Integración se escribe `Integracion` (el lector acepta solo una palabra ASCII).
- Los tickets no llevan referencia externa ni id de issue.
- Estado: los tickets están creados en Kanai (2026-10-12) como TV2-001 a TV2-064, numerados en el mismo orden que este índice, con las 117 relaciones `depends_on` registradas. La columna Kanai da el id de cada uno.

## EP-01 Cimientos

| Ticket | Kanai | Título | Depende de |
| --- | --- | --- | --- |
| X01 | TV2-001 | DEC del MVP: web de administración y productor, y recordatorios | ninguno |
| X02 | TV2-002 | Incorporar el plan V3, las muestras y el diseño web al repo | X01 |

## EP-02 Base del servidor y registro

| Ticket | Kanai | Título | Depende de |
| --- | --- | --- | --- |
| B0-01 | TV2-003 | Conciliar base heredada y recuperar la regresión | ninguno |
| B0-02 | TV2-004 | Backend aislado y verificable | B0-01 |
| B0-03 | TV2-005 | Migración única del modelo de datos con ULID | B0-02 |
| B1-01 | TV2-006 | Dispositivo, configuración, lectura de cuenta y manifiesto | B0-03 |

## EP-03 Acceso y sesión

| Ticket | Kanai | Título | Depende de |
| --- | --- | --- | --- |
| B1-02 | TV2-007 | Recuperar contraseña por correo | B1-01 |
| B1-03 | TV2-008 | Protección HTTP y límites: construcción nueva | B1-01, B1-02 |
| B1-04 | TV2-009 | Sesión web, estado de cuenta efectivo, seed de perfiles y CLI de cuentas | B1-03, X01 |
| B2-01 | TV2-010 | Registro y lectura legal de versiones | B1-01 |

## EP-04 Legal, eliminación y consumo de unidades

| Ticket | Kanai | Título | Depende de |
| --- | --- | --- | --- |
| B2-02 | TV2-011 | Aceptación, pendientes y privacidad: verificación y ajustes | B2-01, B1-03 |
| B5-02 | TV2-012 | Seed de productos y validar, usar, renovar y reponer Kuberani y Corrector | B0-03, B1-03, B2-02 |
| B3-01 | TV2-013 | Registro, verificación y cambio de correo pendiente | B1-03, B2-02 |
| B3-02 | TV2-014 | Eliminación de cuenta: núcleo con componentes registrados | B3-01 |
| B3-03 | TV2-015 | Integración de cuenta y privacidad | B3-02 |

## EP-05 Administración y productor (backend)

| Ticket | Kanai | Título | Depende de |
| --- | --- | --- | --- |
| B4-01 | TV2-016 | Listar, ver, editar, suspender y reactivar cuentas con roles fijos | B1-04, B3-02 |
| B7-01 | TV2-017 | Habilitar perfil Productor y asignar productos | B5-02, B4-01, B1-04 |
| B3-04 | TV2-018 | Eliminación: componente de producto y política de Productor | B3-02, B7-01 |

## EP-06 Unidades del productor (backend)

| Ticket | Kanai | Título | Depende de |
| --- | --- | --- | --- |
| B6-01 | TV2-019 | Productos autorizados y lecturas de unidades propias | B7-01 |
| B6-02 | TV2-020 | Generar, confirmar o descartar unidad y revelar código | B6-01 |

## EP-07 Web: portal público y base

| Ticket | Kanai | Título | Depende de |
| --- | --- | --- | --- |
| W01a | TV2-021 | Infraestructura web: Pug, rutas, cookies, CSRF, tokens y runner de navegador | B1-03, X01, X02 |
| W04 | TV2-022 | Portal público de eliminación de cuenta | W01a, B3-02 |
| W00 | TV2-023 | Presentación pública del producto (`/`) | W01a, B2-01, W04 |
| W01b | TV2-024 | Sesión web, aceptación legal y shell del backoffice | W01a, B1-04, B2-02 |

## EP-08 Web: cuentas y productor

| Ticket | Kanai | Título | Depende de |
| --- | --- | --- | --- |
| W02 | TV2-025 | Gestión web de cuentas (V-17, V-18, V-19) | W01b, B4-01 |
| W03 | TV2-026 | Habilitar productores y asignar productos desde la web | W02, B7-01 |
| P01 | TV2-027 | Área web del productor (V-36) | W01b, W03, B6-01 |
| P02 | TV2-028 | Registrar unidades, confirmar y revelar código (V-37, V-49) | P01, B6-02 |

## EP-09 App base

| Ticket | Kanai | Título | Depende de |
| --- | --- | --- | --- |
| A00 | TV2-029 | Capa de aplicación del motor local | X02 |
| A05 | TV2-030 | Espacio de datos por cuenta | A00 |
| A06 | TV2-031 | Assets y fondos para uso sin conexión | A00 |

## EP-10 Tablero: lienzo y perfil

| Ticket | Kanai | Título | Depende de |
| --- | --- | --- | --- |
| T01a | TV2-032 | Inicio (V-01) | A00, A05 |
| T01b | TV2-033 | Consultas (V-44) y Acerca de (V-45) | T01a |
| T02a | TV2-034 | Motor de personalidad del consultante | A00 |
| T02b | TV2-035 | Mi perfil y personalidad (V-28, V-29) | T02a, T01a |

## EP-11 Dados: ritual y Casa

| Ticket | Kanai | Título | Depende de |
| --- | --- | --- | --- |
| T04a | TV2-036 | Detalle de consulta y siguiente acción (V-03) | T01b |
| T04b | TV2-037 | Tablero y organismos del mandala (V-32) | T04a, A06 |
| T04c | TV2-038 | Preparar sesión y ritual (V-04) | T04b |
| T04d | TV2-039 | Ficha de Casa (V-05) | T04b, A06 |

## EP-12 Dados: interfaz

| Ticket | Kanai | Título | Depende de |
| --- | --- | --- | --- |
| T05a | TV2-040 | Dados y revisión (V-06) | T04c |
| T05b | TV2-041 | Resultado de movimiento (V-07) | T05a |
| T05c | TV2-042 | Corrección de la última tirada | T05b |
| T05d | TV2-043 | Animación de registro y recorrido | T05b, T04b |

## EP-13 Cuenta en app

| Ticket | Kanai | Título | Depende de |
| --- | --- | --- | --- |
| A02 | TV2-044 | Arranque, splash, legal, sesión y módulos por capacidad (V-31, V-51) | A00, B1-03 |
| A03a | TV2-045 | Registro, verificación de correo y acceso (V-23, V-24, V-25) | A02, A05, B3-01 |
| A03b | TV2-046 | Recuperar contraseña (V-26) | A03a, B1-02 |

## EP-14 Consumo y cuenta

| Ticket | Kanai | Título | Depende de |
| --- | --- | --- | --- |
| A04 | TV2-047 | Cuenta, privacidad, salida y eliminación (V-27, V-51) | A03a, B3-03 |
| T03a | TV2-048 | Adaptador de validación de unidad | A00, A03a, B5-02 |
| T03b | TV2-049 | Crear e iniciar consulta (V-02, V-39) | T03a, T02b |

## EP-15 Práctica y recordatorios

| Ticket | Kanai | Título | Depende de |
| --- | --- | --- | --- |
| T06 | TV2-050 | Práctica, días omitidos y siguiente tirada (V-08) | T05c, T03a, B5-02, T04d |
| T06b | TV2-051 | Motor de recordatorios locales | T06, A05 |
| T06c | TV2-052 | Recordatorios: preferencia, permisos y destino (V-27, V-08) | T06b, A02 |

## EP-16 Retroceso

| Ticket | Kanai | Título | Depende de |
| --- | --- | --- | --- |
| T07a | TV2-053 | Motor de intentos y lectura pendiente | T05c |
| T07b | TV2-054 | Diagnóstico de retroceso y detalle de anillo (V-09, V-10) | T07a, A06 |
| T08a | TV2-055 | Motor de reparación y consumo de corrector | T07a, T03a, B5-02 |

## EP-17 Reparación

| Ticket | Kanai | Título | Depende de |
| --- | --- | --- | --- |
| T08b | TV2-056 | Reparación (V-11) | T08a, A06 |
| T09a | TV2-057 | Motor de coherencia vibracional y ciclos RKL | T08a |
| T09b | TV2-058 | Coherencia vibracional (V-12) | T09a |

## EP-18 Historial y cierre del tablero

| Ticket | Kanai | Título | Depende de |
| --- | --- | --- | --- |
| T10a | TV2-059 | Motor de retoma e historial | T06, T09a |
| T10b | TV2-060 | Historial de la consulta (V-13) | T10a, T09b |
| T11a | TV2-061 | Motor de cierre completo | T10a |

## EP-19 Recorrido final

| Ticket | Kanai | Título | Depende de |
| --- | --- | --- | --- |
| T11b | TV2-062 | Cierre en Casa 12 (V-14) | T11a, T10b |
| Q01 | TV2-063 | Recorrido de punta a punta | P02, T11b, T06c, T03b |
| Q02 | TV2-064 | Permisos, navegación, diseño y entrega | Q01, A04, W02, W03, W04, B3-04 |
