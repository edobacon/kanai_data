---
id: TAO-160-DEC-E2E-DISPOSITIVO
project: taomangalam
type: decision
module: EP-00
tags:
  - TAO-160
  - GH-13
  - pnpm-dev
  - e2e
  - verificacion
---

Decision (HU-00-13 / TAO-160, sesion 2): el criterio de cierre de la sesion 2 se acota a lo demostrable hoy: el comando `pnpm dev:services` levanta/baja el Compose existente; `pnpm dev` arranca el backend real (`tsx watch`, leyendo `server/.env`) y resuelve el host por tipo de dispositivo (10.0.2.2 emulador Android, loopback iOS Simulator, `adb reverse` Android fisico por USB, IP de red) inyectandolo a la app por `--dart-define=API_BASE_URL` con precedencia sobre el JSON del sabor; la sonda usa el endpoint existente `saludVivo` (GET /health/live).

Motivo: el criterio original «en emulador Android la app alcanza GET /health/live sin editar codigo» no es demostrable todavia porque la app NO tiene capa HTTP (no hay cliente que llame al backend). Esa capa es de una epica consumidora, no de EP-00. Evidencia de lo demostrable ya ejecutada: tests de `scripts/dev` (69/69), tests Dart del loader con la precedencia del define (18/18 en el archivo de config, 21/21 la suite de la app), ciclo REAL up/down del Compose conservando el volumen, y arranque REAL del backend con `fetch` real a GET /health/live (200) y `--dart-define` inyectado con el host resuelto.

Pendiente (manual): cuando la app tenga capa HTTP, verificar en emulador Android y Android fisico por USB que la app alcanza el backend usando el host inyectado. Se deja como verificacion manual/de verificacion, no como bloqueo de HU-00-13.
