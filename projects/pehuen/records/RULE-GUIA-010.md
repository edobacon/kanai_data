---
id: RULE-GUIA-010
project: pehuen
type: rule
module: guias
level: must
tags:
  - legacy-paridad
  - migration
  - sockets
  - realtime
---

# POST /api/guias emite `new-guide` a tres rooms: `guias-ALL`, `guias-{origen}`, `guias-{destino}`

## What

Al crear una guía exitosamente, el handler debe emitir el evento socket `new-guide` con el documento populado a tres rooms simultáneamente:
1. `guias-ALL`
2. `guias-{id_de_origen}`
3. `guias-{id_de_destino}`

## Why

El cliente legacy suscribe a la room de su cancha para recibir guías en tiempo real. La room `guias-ALL` sirve para usuarios con `cancha: 'ALL'`. Las rooms específicas de origen y destino garantizan que las canchas involucradas en el movimiento reciban la notificación, independientemente de cuál es la cancha del receptor conectado.

## Where

- **Files**: `server/api/guias/index.post.ts`, `server/utils/emitToRooms.ts` (auto-importado), `shared/constants/socket-rooms.ts` (verificar naming)
- **Endpoints**: `POST /api/guias`
- **Layers**: backend (después de crear y popular la guía)

## When

Solo en POST exitoso (201). No en PATCH ni en creación con error.

## Verification

- Test: crear guía → verificar que el mock de socket recibió `new-guide` en `guias-ALL`.
- Test: crear guía con `origen: 'abc'`, `destino: 'def'` → emitido también a `guias-abc` y `guias-def`.
- `grep -n "new-guide\|guias-ALL\|emitToRoom" server/api/guias/index.post.ts` → debe aparecer.

## Source

- **Discovered in**: PEH-001, Session 1
- **Evidence**: `pehuen-server/docs/01-data-model/core/guia.md` side effects create: "`new-guide` → rooms `guias-ALL`, `guias-{origen}`, `guias-{destino}` (con doc populated)".
- **Related**: RULE-GUIA-011
