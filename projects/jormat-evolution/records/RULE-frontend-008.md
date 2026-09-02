---
id: RULE-frontend-008
project: jormat-evolution
type: rule
module: frontend
level: should
tags:
  - frontend
  - banner
  - estado
  - testing
  - validacion
---

# Banners descartables ligados a una coleccion dinamica descartan por-clave (`Set<id>`), no con un boolean global

## What

Un banner/aviso descartable cuyo disparador depende de items de una coleccion dinamica (ej. "stock 0" por item de una lista que crece) NO debe usar un flag boolean global de "descartado". Con un boolean global, al descartar el aviso de un item, el mismo flag suprime el aviso de cualquier otro item agregado despues (aunque tenga una condicion distinta que si deberia mostrarse). El estado de dismiss debe ser un `Set<id>` (o mapa) por clave del item.

Relacionado: las garantias de validacion de submit ("bloquear si invalido") necesitan un test explicito que ejercite la **rama de fallo** (no solo el happy path) — un gap de cobertura ahi no lo detecta la corrida feliz.

## Why

Un boolean global de dismiss confunde "el usuario ya vio ESTE aviso" con "el usuario ya vio CUALQUIER aviso de este tipo" — el segundo item agregado con la misma condicion nunca vuelve a mostrar el banner, aunque el usuario no lo haya visto. Y una garantia central del ticket ("no emitir si invalido") sin test de la rama de fallo puede regresionar silenciosamente si alguien despues relaja la validacion, porque el happy path sigue verde.

## Where

- **Layers**: frontend (banners/avisos dismissibles atados a items de una coleccion, ej. carrito, lineas de factura).
- Ejemplo origen: banner de stock 0 en el builder de facturas (JOR-014, Session #4).

## When

- Al implementar un banner/aviso descartable cuya condicion de disparo depende de items individuales de una lista/coleccion que puede crecer.
- Al implementar una garantia de bloqueo de submit por invalidez: agregar el test que ejercita el caso invalido (no solo el valido).

## Verification

- El estado de dismiss es una estructura por-clave (`Set<string>`/mapa), no un `boolean` unico.
- Existe un test que agrega un item invalido, verifica que el submit se bloquea (toast de error llamado, success NO llamado).

## Source

- **Discovered in**: JOR-014, Session #4 (reviewer aislado, 2 bugs reales).
- **Evidence**: L3 (banner "Stock disponible: 0" hardcodeado + dismiss boolean global -> fix `dismissedStockItems: Set<string>`; gap de test de la garantia "0 lineas no emite" cubierto con spy de toast).
