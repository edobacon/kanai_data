---
id: TAO-182-SPEC
project: taomangalam
ticket: TAO-182
status: approved
---

# HU-01-16 · Verificación responsive con goldens de componentes, shell y plantillas

## Resumen ejecutivo

Se construye la suite de goldens responsive de EP-01: un harness estable (tipografías del sistema de diseño cargadas, tema claro forzado, plataforma fija, movimiento reducido) más una matriz por configuración de cinco tamaños (360×800, 390×844, 768×1024, 1024×768, 1440×900), escalas 100 % y 200 % y SO claro/oscuro; sobre ella, los goldens de los componentes de HU-01-03 a HU-01-05, del shell (panel persistente y superpuesto) y de las tres plantillas de HU-01-10. Se integra un job de CI que compara en cada PR, falla ante un cambio de 1 px y publica el artifact de diferencias, y se documenta el procedimiento de actualización con revisión del diff. NO incluye goldens del tablero ni de vistas de otras épicas (cada historia dueña) ni la matriz con tema oscuro, que espera a DEC-196. Se sabe que funciona cuando la suite falla ante un cambio de padding de 1 px y publica el diff, cuando el SO en oscuro produce goldens idénticos al claro, cuando 360×800 a 200 % no emite avisos de desborde y cuando 1024×768 muestra el panel persistente y 768×1024 el superpuesto cerrado. Tamaño estimado: 3 sesiones T2. El request entra en el techo de 4 sesiones y no se amplía alcance; cualquier blast-radius detectado (p. ej. goldens de otras épicas) queda fuera.

Datos a confirmar antes de ejecutar:
- Nombre y ruta exactos del workflow de PR (p. ej. .github/workflows/ci-pr.yml) y si ya tiene un job para la app Flutter, para colgar el job de goldens.
- Paquete de goldens preferido (matchesGoldenFile nativo vs alchemist/golden_toolkit) y si ya está declarado en app/pubspec.yaml.
- Ruta de las tipografías del sistema de diseño en el repositorio (DEC-230) para cargarlas con FontLoader.
- Dónde vive el shell, las tres plantillas de HU-01-10 y los puntos de montaje para los goldens (no aparecen en los extractos de la rama acumuladora).
- Política de retención de artifacts de CI (DEC-230).

## Requirements

### REQ-01 `confirmed`
> Fuente: taomangalam/app/test/accessibility/accessibility_matrix.dart:1

Harness de goldens reutilizable (que): carga las tipografías del sistema de diseño, fija la superficie de dibujo, el tema claro forzado, la plataforma y el movimiento reducido; (por qué): que los goldens sean estables y no dependan del entorno ni generen falsos positivos por fuente de reemplazo o animación.

### REQ-02 `confirmed`
> Fuente: taomangalam/app/test/accessibility/component_entries.dart:1

Goldens de los componentes de HU-01-03 a HU-01-05 en todos sus estados (que): generados desde el espejo de entradas del catálogo, para cada tamaño y escala; (por qué): detectar regresiones visuales de átomos, moléculas y overlays en CI.

### REQ-03 `inferred`
> Fuente: taomangalam/docs/backlog/EP-01_sistema_visual_navegacion_y_accesibilidad.md:129

Goldens del shell con el panel superpuesto y con el panel persistente en tablet vertical y horizontal (que): capturados en la matriz; (por qué): verificar el comportamiento responsive del shell por orientación.

### REQ-04 `inferred`
> Fuente: taomangalam/docs/backlog/EP-01_sistema_visual_navegacion_y_accesibilidad.md:1301

Goldens de las tres plantillas de HU-01-10 en los cinco tamaños (que): capturadas con la matriz de ancho; (por qué): verificar su composición responsive y el punto donde cambia el layout.

### REQ-05 `confirmed`
> Fuente: taomangalam/.github/workflows/nightly.yml:1

Job de CI que compara los goldens en cada PR (que): ejecuta la suite, falla ante cualquier diferencia y publica el artifact de diferencias; (por qué): bloquear regresiones visuales y dejar la evidencia adjunta al PR.

### REQ-06 `confirmed`
> Fuente: taomangalam/.github/CODEOWNERS:1

Procedimiento documentado para regenerar goldens (que): describe cómo actualizarlos, de modo que el PR muestre el diff y exija revisión; (por qué): que la baseline siempre pase por revisión y no se actualice a ciegas.

### REQ-07 `confirmed` `enforcement`
> Fuente: taomangalam/app/test/accessibility/accessibility_matrix.dart:14

La matriz de tamaños, escalas y sistema operativo se declara en un único archivo de configuración reutilizable, siguiendo el patrón de AccessibilityViewport, y las suites la consumen; (por qué): ampliar la matriz por configuración sin reescribir pruebas.

### REQ-08 `confirmed` `enforcement`
> Fuente: taomangalam/app/test/accessibility/component_entries.dart:1

Los goldens de componentes reutilizan el espejo de entradas ya existente y la carga de fuentes del sistema de diseño; (por qué): que el componente bajo prueba sea el mismo del catálogo y no se generen goldens con fuente de reemplazo.
## Tasks

#### S1.T1 — Crear el harness de goldens: un `flutter_test_config.dart` que cargue las tipografías del sistema de diseño con FontLoader, fije la superficie de dibujo, el tema claro forzado (HU-01-01), y active el movimiento reducido (HU-01-07). Usa matchesGoldenFile nativo; no agregues dependencia nueva sin confirmar.
Contrato: rollback: Borrar `app/test/golden/flutter_test_config.dart` y revertir cualquier import en las suites de goldens.. Status: done

#### S1.T2 — Definir la matriz de goldens en un archivo de configuración (tamaños 360x800, 390x844, 768x1024, 1024x768, 1440x900; escalas 100 % y 200 %; SO claro y oscuro sobre tema claro forzado) siguiendo el patrón AccessibilityViewport, sin literales repetidos en las suites.
Contrato: rollback: Borrar el archivo de matriz de goldens y volver a los literales previos; ninguna suite lo importa todavía.. Status: done

#### S1.T3 — Agregar el job de goldens al workflow de PR: corre `flutter test test/golden`, falla ante cualquier diferencia y sube el artifact de diferencias. Reutiliza el patrón de `.github/workflows/nightly.yml`.
Contrato: rollback: Quitar el job del workflow de PR y el paso de subida de artifacts.. Status: done

#### S1.T4 — Suite de regresión del harness y golden de humo del átomo botón: generar la baseline y verificar que un cambio de 1 px en el padding hace fallar la comparación.
Contrato: rollback: Borrar `atoms_golden_test.dart` y su baseline; el harness queda sin consumidores.. Status: done

#### S2.T1 — Generar los goldens de los componentes de HU-01-03 a HU-01-05 en todos sus estados, reutilizando el espejo de entradas de componentes y manteniendo su guard de sincronía con las anotaciones @UseCase.
Contrato: rollback: Borrar los goldens generados y la suite de componentes; el espejo de entradas queda intacto.. Status: pending

#### S2.T1.1 — Goldens de los átomos (botón, campo de texto, tipografía, iconos) en sus estados y variantes, por cada tamaño y escala de la matriz.
Contrato: rollback: Borrar `app/test/golden/goldens/atoms/` y sus entradas en la suite.. Status: pending

#### S2.T1.2 — Goldens de las moléculas de HU-01-03 a HU-01-05 en sus siete estados de catálogo, por cada tamaño y escala.
Contrato: rollback: Borrar `app/test/golden/goldens/molecules/` y sus entradas en la suite.. Status: pending

#### S2.T1.3 — Goldens de los overlays (diálogo incluido), verificando que en 360x800 a escala 200 % las acciones del diálogo son visibles.
Contrato: rollback: Borrar `app/test/golden/goldens/overlays/` y sus entradas en la suite.. Status: pending

#### S2.T2 — Suite de regresión de componentes: compara todos los goldens generados e incluye el caso de fuente ausente que debe fallar con mensaje claro en vez de usar fuente de reemplazo.
Contrato: rollback: Borrar `components_golden_test.dart`; los goldens quedan sin comparación automatizada.. Status: pending

#### S3.T1 — Generar los goldens del shell con el panel superpuesto y con el panel persistente en tablet vertical (768x1024) y horizontal (1024x768), con la matriz aplicada.
Contrato: rollback: Borrar `app/test/golden/goldens/shell/` y sus entradas en la suite.. Status: pending

#### S3.T1.1 — Golden del shell en 1024x768: el panel persistente está visible.
Contrato: rollback: Borrar el golden del shell en 1024x768.. Status: pending

#### S3.T1.2 — Golden del shell en 768x1024: el panel superpuesto está cerrado.
Contrato: rollback: Borrar el golden del shell en 768x1024.. Status: pending

#### S3.T2 — Generar los goldens de las tres plantillas de HU-01-10 en los cinco tamaños, comprobando que la plantilla de lista y detalle cambia de composición en 840 y no en otro ancho.
Contrato: rollback: Borrar `app/test/golden/goldens/templates/` y sus entradas en la suite.. Status: pending

#### S3.T2.1 — Golden de la plantilla de lista en los cinco tamaños, con el cambio de composición en 840.
Contrato: rollback: Borrar el golden de la plantilla de lista.. Status: pending

#### S3.T2.2 — Golden de la plantilla de detalle en los cinco tamaños.
Contrato: rollback: Borrar el golden de la plantilla de detalle.. Status: pending

#### S3.T2.3 — Golden de la tercera plantilla de HU-01-10 en los cinco tamaños.
Contrato: rollback: Borrar el golden de la tercera plantilla.. Status: pending

#### S3.T3 — Documentar el procedimiento de actualización de goldens y asegurar la revisión del diff: la ruta de goldens queda bajo CODEOWNERS de la app y el documento describe regenerar, revisar el diff y adjuntar artifacts.
Contrato: rollback: Revertir el documento y la entrada de CODEOWNERS.. Status: pending

#### S3.T4 — Suite de regresión de shell y plantillas: compara los goldens del shell y de las plantillas e incluye los casos QA-01-16-01 y QA-01-16-03.
Contrato: rollback: Borrar `shell_golden_test.dart` y `templates_golden_test.dart`; los goldens quedan sin comparación automatizada.. Status: pending
## Verificacion runtime

1. **Qué:** Smoke de la vista afectada por HU-01-16 · Verificación responsive con goldens de componentes, shell y plantillas
   - **Se debe ver:** La vista carga y responde sin errores.
   - **Dónde:** vista afectada por el ticket

## Sessions

### Session 1 · T2 · continue

**Tasks:**
- [x] S1.T1
- [x] S1.T2
- [x] S1.T3
- [x] S1.T4

**Gate (auto)**: Al correr `cd app && flutter test test/golden` existe un golden de humo del botón por tamaño y escala; un cambio de 1 px en su padding hace fallar el job de CI de PR y publica el artifact de diferencias.

### Session 2 · T2 · open

**Tasks:**
- [ ] S2.T1
- [ ] S2.T1.1
- [ ] S2.T1.2
- [ ] S2.T1.3
- [ ] S2.T2

**Gate (auto)**: Los goldens de todos los componentes de HU-01-03 a HU-01-05 en sus estados, para cada tamaño y escala, quedan versionados y la suite de componentes pasa, fallando si falta cargar una fuente.

### Session 3 · T2 · open

**Tasks:**
- [ ] S3.T1
- [ ] S3.T1.1
- [ ] S3.T1.2
- [ ] S3.T2
- [ ] S3.T2.1
- [ ] S3.T2.2
- [ ] S3.T2.3
- [ ] S3.T3
- [ ] S3.T4

**Gate (auto)**: Los goldens del shell (1024x768 con panel persistente; 768x1024 con panel superpuesto cerrado) y de las tres plantillas de HU-01-10 quedan versionados, y el procedimiento de actualización documentado hace que regenerar goldens muestre el diff en el PR.

### Session 4 · T0 · open
