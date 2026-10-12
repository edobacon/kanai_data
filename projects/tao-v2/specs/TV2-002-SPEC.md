---
id: TV2-002-SPEC
project: tao-v2
ticket: TV2-002
status: approved
---

# TV2-002 (X02): plan V3, muestras, diseño web y contrato visual propio dentro de tao-v2

## Resumen ejecutivo

Se incorpora a tao-v2 el plan V3 (docs 00 a 13, plan_v3.json, CSV) y sus muestras desde taomangalam/docs/product/v3/ (única copia, sin commit), con los textos corregidos a las decisiones del MVP (D-05, D-07, D-10, D-12, 64 tickets, mapa de ids de 20-mapa-de-dependencias). También se commitea docs/product/diseno-web/ con docs/README.md y mkdocs.yml, se crea un contrato-visual.json propio que reemplaza al heredado y se agrega un chequeo de rutas y sha256 del manifiesto web. No se toca código de app/ (Flutter) ni lo diferido a 21-extensiones-v1. Para verificarlo: DEFAULT_DOCS_DIFF_BASE no aplica; se corre DOCS_DIFF_BASE=main pnpm docs:check en verde con Node 24, git lfs ls-files lista las imágenes nuevas, existen las rutas de 13_linea_visual_y_fondos.md y del contrato, y el chequeo del manifiesto web pasa. ADVERTENCIA: docs/product/v2/ (460 KB, supersedida) queda fuera del alcance pedido; si se quiere archivar, abrir un ticket aparte. ADVERTENCIA: el contrato consumido C-dec-mvp (TV2-001) debe estar integrado en la rama acumuladora antes del intake, porque las correcciones de texto citan D-01 a D-12 por su ruta final.
Datos a confirmar antes de ejecutar:
- Ruta final del archivo DEC del MVP en docs/decisiones/ (la declara TV2-001 al integrarse; confirmar en origin/main de tao-v2).
- activos-reales/: traerlo completo dentro de docs/product/v3/ (opción recomendada por el request) o enlazar al original; confirmar al aprobar el spec.
- Ubicación final de contrato-visual.json: docs/product/v3/muestras/ o docs/product/design-system/ (el request admite las dos).
- Ruta del contrato visual heredado que se reemplaza y sus consumidores (confirmar con búsqueda en tao-v2 antes de S2).
- Cómo se engancha un script nuevo a pnpm docs:check (nombre del script en package.json y del runner de docs de tao-v2); confirmar en package.json de tao-v2.
- Dónde vive hoy docs/product/diseno-web/ (sin commit en el checkout de tao-v2 o en otra ruta) y si .gitattributes cubre también .mp4 y fuentes (.woff2/.ttf) además de las imágenes.
- Ubicación del catálogo de vistas donde se registran presentación pública y portal de eliminación (documento de V3 o de design-system).

## Requirements

### REQ-01 `inferred`
> Fuente: Request del ticket TV2-002 (Alcance, Dentro) y fichas del KB mvp/00-alcance-y-decisiones y mvp/05-epicas-y-orden-de-ejecucion

El plan V3 (documentos 00 a 13, plan_v3.json, CSV) y sus muestras (imágenes, manifest.json, prompts, maquetas HTML, video, fondos-muestras.css, activos-reales/) quedan versionados en tao-v2 bajo docs/product/v3/, con los binarios como objetos LFS. Por qué: hoy la única copia vive sin commit en taomangalam y se puede perder.

### REQ-02 `inferred`
> Fuente: Request del ticket TV2-002 (Alcance, Dentro) y fichas del KB mvp/00-alcance-y-decisiones y mvp/05-epicas-y-orden-de-ejecucion

Los textos del plan V3 quedan alineados a las decisiones del MVP: recordatorios locales incluidos (D-07) en README, 02, 03, 06, 09, plan_v3.json y tickets_recursos.csv; cambio de correo solo con el correo pendiente (D-05); presentación pública, portal de eliminación y backoffice (D-10, D-12); conteo de 64 tickets y mapa de ids de 20-mapa-de-dependencias; y las vistas nuevas (presentación pública, portal de eliminación) registradas en el catálogo. Las referencias a la DEC del MVP toman la ruta final del contrato C-dec-mvp que declara TV2-001 al integrarse, sin fijarla en este ticket. Por qué: el plan heredado contradice las decisiones ya tomadas en la DEC del MVP.

### REQ-03 `inferred`
> Fuente: Request del ticket TV2-002 (Alcance, Dentro) y fichas del KB mvp/00-alcance-y-decisiones y mvp/05-epicas-y-orden-de-ejecucion

docs/product/diseno-web/ (17 guías, variantes, maquetas, assets, manifiesto) queda commiteado junto con los cambios de docs/README.md y mkdocs.yml; su README dice 64 fichas (no 65) y la guía 17 deja de figurar como pendiente y se asocia a W04.

### REQ-04 `confirmed`
> Fuente: Request del ticket TV2-002 (Alcance, Dentro) y fichas del KB mvp/00-alcance-y-decisiones y mvp/05-epicas-y-orden-de-ejecucion

Existe un contrato-visual.json propio de tao-v2 en docs/product/design-system/contrato-visual.json (ruta decidida por la persona, pregunta TV2-002-Q1) que reemplaza al heredado, con la tabla vista a familia de la app, las familias de fondo, y un bloque web con la regla de diseno-web (backoffice neutro sin paisajes, público con ilustración); las familias productos y administracion quedan marcadas como no usadas en el MVP.

### REQ-05 `inferred`
> Fuente: Request del ticket TV2-002 (Alcance, Dentro) y fichas del KB mvp/00-alcance-y-decisiones y mvp/05-epicas-y-orden-de-ejecucion

Un chequeo de docs comprueba que las rutas declaradas en docs/product/design-system/contrato-visual.json y en el manifiesto de diseno-web existen en el repo y que los sha256 del manifiesto coinciden con los archivos; falla con salida distinta de cero si alguno no cumple.

### REQ-06 `inferred`
> Fuente: Request del ticket TV2-002 (Criterios de aceptación) y fichas del KB mvp/00-alcance-y-decisiones y mvp/05-epicas-y-orden-de-ejecucion

Los documentos incorporados respetan los chequeos de docs existentes de tao-v2 con Node 24 (markdownlint, cspell con .cspell.json, Vale, lychee, validador de frontmatter, documentos huérfanos) en vez de excluir carpetas del chequeo; las palabras nuevas legítimas se agregan a .cspell.json.
## Tasks

#### S1.T1 — Antes de copiar, verificar que .gitattributes cubre como objetos LFS las imágenes (png, jpg, webp, svg según las muestras), el video .mp4 y las fuentes (woff, woff2, ttf, otf) que se traen a docs/product/v3/ y docs/product/diseno-web/. Si algo no está cubierto, agregar la regla correspondiente (filter=lfs diff=lfs merge=lfs -text) y confirmarlo con git check-attr antes de continuar con la copia.
Contrato: rollback: git revert del commit de incorporación; el origen en taomangalam queda intacto porque solo se copia.. Status: done

#### S1.T2 — Copiar los documentos 00 a 13, plan_v3.json, el CSV y las muestras desde taomangalam/docs/product/v3/ a docs/product/v3/ en tao-v2, y registrar en la misma tarea la entrada de navegación de docs/product/v3 en mkdocs.yml, para que docs:check y el chequeo de documentos huérfanos no fallen al cierre de S1. La entrada de navegación de diseno-web se mantiene en su sesión actual.
Contrato: rollback: git revert del commit de correcciones; la copia original sigue en el commit anterior.. Status: done

#### S1.T2.1 — D-07: pasar los recordatorios locales de excluidos a incluidos en README, 02, 03, 06, 09, plan_v3.json y tickets_recursos.csv.
Contrato: rollback: git checkout de esos archivos al commit de incorporación.. Status: done

#### S1.T2.2 — D-05 (cambio de correo solo con el correo pendiente) y D-10/D-12 (presentación pública, portal de eliminación, backoffice) en los documentos de V3 que los tratan; registrar presentación pública y portal de eliminación en el catálogo de vistas.
Contrato: rollback: git checkout de los documentos tocados al commit de incorporación.. Status: done

#### S1.T2.3 — Ajustar el conteo de tickets a 64 y el mapa de ids según 20-mapa-de-dependencias en los documentos, plan_v3.json y CSV de V3.
Contrato: rollback: git checkout de los archivos tocados al commit de incorporación.. Status: done

#### S1.T3 — Alinear los textos del plan V3 a las decisiones del MVP (D-05, D-07, D-10, D-12), el conteo de 64 tickets, el mapa de ids de 20-mapa-de-dependencias y las vistas nuevas en el catálogo. Los enlaces o citas a la DEC del MVP toman la ruta final del contrato C-dec-mvp que declara TV2-001 al integrarse; no se fija por cuenta propia. Verificar LFS, JSON.parse de plan_v3.json, número de columnas constante en tickets_recursos.csv y que los enlaces relativos de las maquetas HTML resuelven.
Contrato: rollback: No modifica archivos de producto; si se agregó un ajuste de lint, git revert de ese commit.. Status: done

#### S2.T1 — Commitear docs/product/diseno-web/ (17 guías, variantes, maquetas, assets, manifiesto) con los cambios de docs/README.md y mkdocs.yml (agregar v3 y diseno-web a la navegación sin quitar las entradas existentes, como docs/archivo-v1/). En el README de diseno-web cambiar '65 fichas' por 64 y la guía 17 deja de figurar como pendiente y se asocia a W04.
Contrato: rollback: git revert del commit; mkdocs.yml y docs/README.md vuelven a su estado anterior.. Status: pending

#### S2.T2 — Crear docs/product/design-system/contrato-visual.json como contrato visual propio de tao-v2 (reemplaza al heredado): tabla vista a familia de la app, familias de fondo y bloque web con la regla de diseno-web (backoffice neutro sin paisajes, público con ilustración); marcar productos y administracion como no usadas en el MVP. Dejar las rutas de 13_linea_visual_y_fondos.md apuntando a docs/product/design-system/contrato-visual.json.
Contrato: rollback: git revert del commit; las referencias vuelven al contrato heredado.. Status: pending

#### S2.T3 — Crear el chequeo de docs que comprueba que las rutas declaradas en docs/product/design-system/contrato-visual.json y en el manifiesto de diseno-web existen y que los sha256 del manifiesto coinciden; sale con código distinto de cero si algo falla.
Contrato: rollback: git revert del commit; se elimina el script y su enganche en package.json.. Status: pending

#### S2.T4 — Ajustar .cspell.json con los términos nuevos legítimos y corregir los hallazgos de markdownlint, Vale, lychee, frontmatter y huérfanos en las carpetas nuevas, sin agregar exclusiones de carpetas.
Contrato: rollback: git revert del commit de ajustes de lint.. Status: pending

#### S2.T5 — Regresión de la sesión: correr el chequeo del manifiesto en verde y con un caso de falla (copia temporal con un hash alterado y una ruta inexistente, fuera del repo o revertida), y confirmar que la navegación previa de mkdocs.yml sigue intacta. Registrar SHA, comando, salida y pendientes sin credenciales.
Contrato: rollback: Restaurar el archivo alterado con git checkout; la task no deja cambios commiteados salvo el registro.. Status: pending
## Cambios al modelo de datos

Ninguno.

## Enmiendas (refine_spec)

### Enmienda 1
**REQs:**

- REQ-01 (edit) `inferred`: El plan V3 (documentos 00 a 13, plan_v3.json, CSV) y sus muestras (imágenes, manifest.json, prompts, maquetas HTML, video, fondos-muestras.c
- REQ-02 (edit) `inferred`: Los textos del plan V3 quedan alineados a las decisiones del MVP: recordatorios locales incluidos (D-07) en README, 02, 03, 06, 09, plan_v3.
- REQ-03 (edit) `inferred`: docs/product/diseno-web/ (17 guías, variantes, maquetas, assets, manifiesto) queda commiteado junto con los cambios de docs/README.md y mkdo
- REQ-04 (edit) `confirmed`: Existe un contrato-visual.json propio de tao-v2 en docs/product/design-system/contrato-visual.json (ruta decidida por la persona, pregunta T
- REQ-05 (edit) `inferred`: Un chequeo de docs comprueba que las rutas declaradas en docs/product/design-system/contrato-visual.json y en el manifiesto de diseno-web ex
- REQ-06 (edit) `inferred`: Los documentos incorporados respetan los chequeos de docs existentes de tao-v2 con Node 24 (markdownlint, cspell con .cspell.json, Vale, lyc

**Task ops:**

- edit S1.T1 { desc="Antes de copiar, verificar que .gitattributes cubre como objetos LFS las imágenes (png, jpg, webp, svg según las muestras), el video .mp4 y las fuentes (woff, woff2, ttf, otf) que se traen a docs/product/v3/ y docs/product/diseno-web/. Si algo no está cubierto, agregar la regla correspondiente (filter=lfs diff=lfs merge=lfs -text) y confirmarlo con git check-attr antes de continuar con la copia.", verify=["git check-attr filter -- docs/product/v3/muestras/ejemplo.png docs/product/v3/muestras/ejemplo.mp4 docs/product/v3/muestras/ejemplo.woff2"] }
- edit S1.T2 { desc="Copiar los documentos 00 a 13, plan_v3.json, el CSV y las muestras desde taomangalam/docs/product/v3/ a docs/product/v3/ en tao-v2, y registrar en la misma tarea la entrada de navegación de docs/product/v3 en mkdocs.yml, para que docs:check y el chequeo de documentos huérfanos no fallen al cierre de S1. La entrada de navegación de diseno-web se mantiene en su sesión actual." }
- edit S1.T3 { desc="Alinear los textos del plan V3 a las decisiones del MVP (D-05, D-07, D-10, D-12), el conteo de 64 tickets, el mapa de ids de 20-mapa-de-dependencias y las vistas nuevas en el catálogo. Los enlaces o citas a la DEC del MVP toman la ruta final del contrato C-dec-mvp que declara TV2-001 al integrarse; no se fija por cuenta propia. Verificar LFS, JSON.parse de plan_v3.json, número de columnas constante en tickets_recursos.csv y que los enlaces relativos de las maquetas HTML resuelven.", verify=["git lfs ls-files","node -e \"JSON.parse(require('fs').readFileSync('docs/product/v3/plan_v3.json','utf8'))\"","node -e \"const l=require('fs').readFileSync('docs/product/v3/tickets_recursos.csv','utf8').trim().split('\\n');const n=l[0].split(',').length;if(l.some(x=>x.split(',').length!==n)){process.exit(1)}\""] }
- edit S2.T2 { desc="Crear docs/product/design-system/contrato-visual.json como contrato visual propio de tao-v2 (reemplaza al heredado): tabla vista a familia de la app, familias de fondo y bloque web con la regla de diseno-web (backoffice neutro sin paisajes, público con ilustración); marcar productos y administracion como no usadas en el MVP. Dejar las rutas de 13_linea_visual_y_fondos.md apuntando a docs/product/design-system/contrato-visual.json." }
- edit S2.T3 { desc="Crear el chequeo de docs que comprueba que las rutas declaradas en docs/product/design-system/contrato-visual.json y en el manifiesto de diseno-web existen y que los sha256 del manifiesto coinciden; sale con código distinto de cero si algo falla." }

## Sessions

### Session 1 · T2 · continue

**Tasks:**
- [x] S1.T1
- [x] S1.T2
- [x] S1.T2.1
- [x] S1.T2.2
- [x] S1.T2.3
- [x] S1.T3

**Gate (auto)**: docs/product/v3/ commiteado en la rama del ticket con imágenes y video en LFS (git lfs ls-files los lista) y el diff de textos muestra las correcciones D-05, D-07, D-10, D-12, 64 tickets y mapa de ids.

### Session 2 · T2 · open

**Tasks:**
- [ ] S2.T1
- [ ] S2.T2
- [ ] S2.T3
- [ ] S2.T4
- [ ] S2.T5

**Gate (auto)**: docs/product/diseno-web/ y contrato-visual.json commiteados, el chequeo del manifiesto termina en 0 (y falla con un hash alterado) y DOCS_DIFF_BASE=main pnpm docs:check pasa en verde con Node 24.
