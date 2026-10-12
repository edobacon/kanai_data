---
id: DOC-kb-mvp-01-ficha-de-ticket
project: tao-v2
type: doc
tags:
  - mvp
  - plantilla
  - tickets
---

# MVP tao-v2: información que Kanai necesita por ticket

Define la ficha estándar de cada ticket del MVP y cómo se traduce a la creación en Kanai. Las fichas de `10` a `14` siguen este formato. Los tickets de Kanai no se crean todavía.

## Campos de la ficha

| Campo | Qué contiene | Uso en Kanai |
| --- | --- | --- |
| Id MVP | Identificador estable de este plan (X01, B1-04, T06b...) | Va en el cuerpo y como referencia externa hasta tener el id `TV2-n` y el issue de GitHub |
| Título | Frase corta de resultado | Título del ticket |
| Tipo | `implement` salvo que se indique (`explore` para spikes, `improvement` para cambios de alcance sobre algo existente) | `workType` |
| Módulo | Backend, Web, App, Docs o Integración | `module` |
| Cambio vs V3 | `=` igual, `C` cambia alcance, `P` partido, `N` nuevo | Contexto de intake |
| Depende de | Ids MVP que deben estar integrados antes | Relaciones entre tickets y dependencias contra la rama acumuladora |
| Repo y rutas | Dónde se trabaja | Alcance del spec y archivos esperados |
| Entregable | Qué existe al terminar | Alcance del spec |
| Aceptación local | Prueba observable, sin mocks que aprueben todo | Casos de test y verificación runtime o UI |
| Datos y fixtures | Datos de prueba requeridos | Preparación del intake |
| Recursos | Ids R01 a R11 del catálogo (ver `02-recursos-cuentas-y-assets`) | Teach-intake: qué leer y qué debe estar instalado |
| Cuentas | Cuentas ficticias locales usadas. Cuentas externas: siempre ninguna | Preparación de la verificación |
| Assets | Ids de assets o vistas que dependen de empaquetado | Entregables y verificación visual |
| Diseño | Solo en tickets de UI: muestra de referencia, familia de fondo y guía (ver `03-referencia-de-diseno-y-muestras`). Si la vista no tiene muestra, lo dice | Material de referencia del spec y verificación visual |
| Datos externos | Fuentes de contenido, textos aprobados, descargas de herramientas o decisiones de personas que el ticket necesita | Bloquea el avance si falta |
| Información por confirmar | Preguntas abiertas con responsable | Preguntas abiertas del ticket |
| Verificación | `backend`, `emulador`, `navegador`, `emulador y navegador` o `docs` | Indica si el cierre exige verificación de runtime o UI |
| Extensión v1 | Punto donde se enchufa funcionalidad futura | Nota de diseño, no alcance |

## Reglas para crear el ticket en Kanai

1. Un ticket por ficha, con el cuerpo en estas secciones: Contexto, Alcance (dentro y fuera), Criterios de aceptación, Dependencias, Recursos y cuentas, Assets y datos externos, Verificación, Riesgos.
2. Proyecto `tao-v2`, prefijo `TV2-`, repo único `tao-v2`. Flujo de épica en sitio con rama acumuladora (`accumulatorBranch: true`, `epicCi: local`): no hay CI remoto, los chequeos corren con `pnpm run check`, `pnpm run check:ci` y `DOCS_DIFF_BASE=main pnpm docs:check` con Node 24.
3. Las dependencias de esta ficha se declaran como relaciones entre tickets. Kanai exige las dependencias integradas en la rama acumuladora antes del intake.
4. Referencia externa: issue de GitHub de `edobacon/tao-v2` cuando exista; hasta entonces el Id MVP.
5. Los tickets de motor (sufijo `a`) no incluyen UI. Los de UI (sufijo `b` o `c`) no cambian el motor. Cualquier cambio de esquema Drift pasa por el ticket que lo declara; el esquema del servidor lo migra solo B0-03.
6. El campo tier no se define aquí: lo propone Kanai en el intake según el cambio real.
7. Ninguna aceptación se cierra con un doble que siempre devuelve éxito. Una corrida que no se pudo hacer queda pendiente, no aprobada.
8. Todo ticket de backend lista y cubre los `x-errores` que declara el contrato para sus operaciones, y no cuenta como verde si una suite de integración queda omitida.
9. Lo que se registra al cerrar: SHA, recursos usados, cambios de contrato o datos, comando y casos ejecutados, salida y pendientes. Nunca contraseñas, tokens, OTP ni códigos completos.
10. Todo ticket de UI (app o web) lleva el bloque estándar de línea visual de `03-referencia-de-diseno-y-muestras` y su lista de aceptación visual común, y declara el campo Diseño. El orden de referencia es: alcance V3, guía maestra y contrato, maqueta HTML, imágenes generadas. Si la muestra dibuja algo fuera del MVP, manda el alcance y se anota la divergencia.

## Estado de preparación

Todas las fichas parten en estado `pendiente de verificación`: ninguna se ha ejecutado, y "existe" en el código heredado no significa "validado". Los resultados de tests y emuladores no se han corrido en este análisis. Todas las fichas están revisadas contra el análisis de código; las de UI además contra el material de diseño.
