---
id: KT-011-SPEC
project: kanai_test
ticket: KT-011
status: draft
---

# Fix: badge de estado "Anulada" con variante destructiva en la tabla de facturas

## Resumen ejecutivo

Se corrige el mapeo estado -> variante del badge de la celda Estado para que "anulada" resuelva a la variante destructiva (tokens --destructive-bg / --destructive-fg) en vez de caer al neutro por defecto, quedando alineado con "aceptada" (success) y "pendiente" (warning). NO se toca el filtro de estado, la fuente de datos, ni la definicion de los tokens del design system. Se verifica en la tabla de facturas: una fila en estado Anulada muestra el badge en color destructivo y el resto de estados no cambia, respaldado por una suite que fija el mapeo completo estado -> variante. ADVERTENCIA (fuera de alcance, no se implementa): si otras vistas consumen el mismo mapa de variantes, el cambio se propaga a ellas; y si el estado llega con mayusculas o acentos desde el backend, la normalizacion de la clave puede ser la causa raiz real, lo que ameritaria un ticket aparte.

## Requirements

#### REQ-01 `inferred`
> Fuente: componente de badge/celda Estado de la tabla de facturas (ruta no verificada contra el codigo)
> Necesidad: build
El badge de la celda Estado de la tabla de facturas resuelve el estado "anulada" a la variante destructiva, que aplica los tokens --destructive-bg / --destructive-fg, en lugar de la variante neutra por defecto.

#### REQ-02 `confirmed`
> Fuente: request inmutable KT-011: "Incluir un test de regresion que fije el mapeo estado -> variante del badge"
> Necesidad: build
Existe una suite de regresion que fija el mapeo completo estado -> variante del badge (aceptada -> success, pendiente -> warning, anulada -> destructive) y falla si alguno de esos pares cambia.

#### REQ-03 `inferred`
> Fuente: tokens de variante del design system (--success-*, --warning-*, --destructive-*) usados por el badge de estado; ruta no verificada contra el codigo
> Necesidad: build
El fix reutiliza el mapa de variantes y los tokens de variante ya existentes del design system (mismo mecanismo que success y warning), sin introducir colores hardcodeados, clases nuevas ni cambios en el filtro de estado ni en la fuente de datos de la tabla.

## Tasks

#### S1.T1 — Fijar el mapeo actual estado -> variante del badge con una suite de tests: casos de regresion para "aceptada" (success) y "pendiente" (warning) con sus tokens actuales, el caso por defecto neutro para un estado desconocido, y el caso de "anulada" esperando la variante destructiva (que debe FALLAR antes del fix, evidenciando el bug). Antes de escribir, localizar el componente real del badge/celda Estado y listar sus consumidores para que la suite proteja el contrato que ya usan.
Contrato: rollback: Eliminar el archivo de tests agregado (o revertir el commit de la suite); no hay cambio de codigo productivo que deshacer en esta task.. Status: pending

#### S1.T2 — Corregir el mapa de variantes del badge de estado para que "anulada" resuelva a la variante destructiva reutilizando el mecanismo existente de tokens (--destructive-bg / --destructive-fg), sin tocar el filtro de estado ni la fuente de datos, y dejando la suite anterior en verde.
Contrato: rollback: Revertir la entrada del mapa a su valor previo (variante neutra por defecto) con git revert del commit del fix; el cambio es de una sola linea en el mapa de variantes, sin migracion ni estado persistido.. Status: pending
