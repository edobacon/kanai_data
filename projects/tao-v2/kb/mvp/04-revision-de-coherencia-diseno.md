---
id: DOC-kb-mvp-04-revision-de-coherencia-diseno
project: tao-v2
type: doc
tags:
  - mvp
  - diseno
  - coherencia
  - assets
---

# Revisión de coherencia: diseño, contratos y assets

Revisión del 2026-10-12 de las guías de diseño web (`docs/product/diseno-web/` en tao-v2, sin commit), el contrato visual de la app y los tickets de este KB. Regla de lectura: las maquetas son guía visual y de diseño; el alcance lo fijan los tickets. Si una maqueta muestra algo que el ticket no pide, se construye lo del ticket.

## Helper de imágenes (Codex)

- Activado en el proyecto `tao-v2`: carpeta de salida `app/assets/generados`. Modelo `gpt-5.5` registrado el 2026-10-12 y vigente hasta el 2026-11-11 (30 días), con imagen de prueba real de 1254 x 1254. El registro lo declaró el agente, no pasó por el formulario de confirmación de una persona (`agent-declared`); si se quiere esa confirmación, se vuelve a proponer el modelo y se revisa la imagen. Vencido el plazo, las tasks de asset se bloquean hasta renovarlo.
- Una task de imagen se marca en el plan con `asset: { request, output, inputs? }`; no se infiere. Ver `kanai-app/docs/assets-codex.md`.
- Los activos del plan V3 se reutilizan byte a byte: el helper se usa solo para lo que no existe (imágenes provisionales de W00, ilustraciones de T06c o variantes pedidas por Diseño), siempre con `inputs` de referencia y salida nueva sin pisar originales.
- Para la web, la salida debe copiarse luego a `server/src/web/public/`; el helper no escribe fuera de la carpeta del repo.

## Estado de los hallazgos (2026-10-12)

| Id | Hallazgo | Estado |
| --- | --- | --- |
| H1 | Imágenes de `app/assets/` eran punteros LFS sin contenido | RESUELTO (objetos publicados y verificados) |
| H2 | Contradicción de línea visual web entre V3 y `diseno-web` | RESUELTO (autoridad de `diseno-web`) |
| H3 | Contrato visual JSON sin web ni tabla vista a familia | EN FICHA (X02) |
| H4 | Tokens de la web escritos a mano | EN FICHA (W01a) |
| H5 | Riesgo de doble lavado en la app | EN FICHA (A06 y lista de aceptación visual) |
| H6 | Rutas web nuevas sin reflejo en las fichas | RESUELTO en `11` y `03` (incluye el portal de eliminación, W04) |
| H7 | Discrepancias menores | RESUELTO salvo README de `diseno-web` ("65 fichas", a corregir en X02) |

### H1. Imágenes de tao-v2 (resuelto)

Los 1356 archivos de imagen de `app/assets/` eran punteros Git LFS de 130 bytes y el servidor LFS de `edobacon/tao-v2` respondía 404. Con autorización del dev, el 2026-10-12 se trajeron los objetos desde `upstream` (3077 objetos) y se publicaron en `origin` (3076 subidos, 708 MB). Tras `git lfs install --local` y `git lfs checkout` en el clon local, los 1167 derivados del manifiesto coinciden con su sha256 (0 diferencias). Todo clon nuevo necesita `git lfs install --local` y `git lfs pull`; vale para los agentes que ejecuten tickets. Un chequeo de integridad del manifiesto contra archivos reales queda en A06.

### H2. Línea visual web (resuelto)

`00-criterio-web.md` y el README de `diseno-web` declaran la "Autoridad de diseño web": ante una diferencia con V3 prevalecen esa guía y la ficha de cada vista; quedan sustituidas las asignaciones de paisajes a Productor y Administración del contrato V3. Backoffice neutro y sin paisajes; presentación pública con ilustración editorial; la app conserva sus fondos V3. La precedencia es solo visual: funciones, permisos y operaciones siguen en las fichas y contratos. El manifiesto web registra 74 artefactos y todos sus sha256 coinciden; `manifest.json` y `verificacion.json` no se registran a sí mismos (esperado). `verificacion.json` sigue con fecha 2026-10-11, sin Firefox ni backend: es estado de diseño.

### H3. Contrato visual legible por máquina (en ficha)

El contrato V3 solo define render, familias y páginas del prototipo, y la tabla vista a familia vive en Markdown. X02 entrega un contrato visual de tao-v2 con esa tabla y un bloque `web`, y un chequeo de docs que comprueba rutas y sha256 del manifiesto web. El manifiesto web ya es consistente: sus 17 páginas tienen `.md`, `.png` y `.html`, y sus operaciones existen en `server/contract/openapi.yaml` con el mismo método y ruta (excepción esperada: `iniciarSesionWeb`, nueva en B1-04).

### H4. Tokens de la web (en ficha)

`web-guia.css` usa valores que no están en `tokens.v1.json` (gris `#F4F4F2`, fondo de modal `#E9E9E5`, línea `#D8CBB4`, pastillas y avisos). W01a los suma primero a `tokens.v1.json` con su par de alto contraste y genera el CSS desde ese archivo; su aceptación comprueba que el CSS no tiene colores fuera de los tokens.

### H5. Doble lavado en la app (en ficha)

Las composiciones derivadas de `composiciones/` ya vienen atenuadas y `TaoBackgroundLayer` aplica además 0,18. A06 y la lista de aceptación visual de la app comparan la captura en emulador contra la muestra; si se ve más tenue se cambia la variante, no la opacidad.

### H6. Rutas y vistas web (resuelto)

Las fichas W01a (estados 401, 403, 404 y 500), W01b (`/backoffice/legal`), W02 (detalle, edición y suspensión con página propia), W03 (`/backoffice/admin/productores`), P01 y P02 (rutas de unidades, con el detalle y la revelación dentro de P02) y W04 (portal de eliminación, guía 17) ya recogen las rutas y comportamientos de las guías 02 a 17. La matriz completa guía, ruta y ficha está en `03-referencia-de-diseno-y-muestras`.

### H7. Otras discrepancias menores

La muestra V3 04 (título mal numerado, formulario editable, "Mi cuenta") queda sustituida por las guías web. Los errores `excluida_en_impersonacion` figuran en las operaciones web porque el contrato los declara, pero la impersonación está fuera del MVP: se cubren como error genérico, sin pantalla propia. El README de `diseno-web` cita "65 fichas" (el plan tiene 64 tickets): X02 lo corrige al commitear.

## Decisiones tomadas el 2026-10-12

1. Portal de eliminación de cuenta (guía 17, 4 pantallas): entra al MVP como W04, vista del servidor bajo `/eliminar-cuenta`, y la URL de configuración que la app abre se deriva de su ruta (D-12).
2. Contenido de W00: copy provisional de la guía 01 sin contacto ni tiendas; el definitivo se pide antes de publicar.
3. Modelo de imágenes del helper: `gpt-5.5` registrado (ver arriba); renovarlo al vencer si hay tasks de asset.
4. "Cambiar correo" en V-27, T05d, política de unidades al revocar, ventana del token y purga de 12 meses: resueltas y recogidas en `00`, `10`, `12` y `13`.
