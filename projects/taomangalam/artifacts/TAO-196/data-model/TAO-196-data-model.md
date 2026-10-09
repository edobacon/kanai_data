Reviso CI y el resolvedor antes de redactar el modelo de datos.# Modelo de datos: TAO-196 · HU-02-02 Inventario de assets (manifiesto v2)

> Estado verificado contra el repo `taomangalam` (rama actual, árbol limpio, 2026-10-09). El manifiesto **ya está en `schemaVersion: 2`** y el contrato, el validador y sus pruebas ya existen. Este documento declara el modelo vigente, marca qué es **EXISTENTE** y qué es **NUEVO** (brechas contra los REQ) y deja las notas de migración.

Leyenda: **[E]** existe hoy en el repo · **[N]** nuevo o ajuste requerido por este ticket · **[N?]** ajuste propuesto, requiere decisión

## 1. Alcance del modelo

No hay tablas ni base de datos. El "modelo" es un documento JSON versionado en el repo, más su contrato y el disco:

| Objeto | Ubicación | Estado |
|---|---|---|
| Manifiesto (raíz) | `app/assets/manifest.json` | [E] v2 |
| Contrato JSON Schema | `scripts/assets/manifest.schema.json` (`$id: urn:taomangalam:assets:manifest:2`, draft 2020-12) | [E] |
| Validador | `scripts/assets/validate_manifest.py` (463 líneas) | [E] |
| Pruebas | `tests/test_assets_manifest.py` (+ `test_assets_pipeline.py`, `test_assets_m1a.py`, `test_assets_provider.py`) | [E] |
| Registros de creación (destino de FK lógica) | `docs/content/imagenes/*.md` | [E] |
| Maestros PNG y derivados WebP (destino de FK lógica) | `app/assets/**` | [E] |
| Documentación del contrato | `docs/content/SCHEMA.md` §manifiesto, `docs/development/commands.md` | [E] parcial, ver §6 |

## 2. Entidad `Manifest` (raíz)

| Campo | Tipo | Obligatorio | Restricción / enum | Default | Estado |
|---|---|---|---|---|---|
| `schemaVersion` | integer | sí | `const: 2` | (sin default) | [E] |
| `visualSystem` | string | no | p.ej. `tao-mangalam-ink-v1` | | [E] |
| `updatedAt` | string | no | fecha ISO `YYYY-MM-DD` (hoy sin `format`) | | [E] · [N?] agregar `format: date` |
| `nonProductive` | string[] | sí | rutas relativas a `app/assets/`, `uniqueItems: true` | `[]` | [E] |
| `assets` | `Asset[]` | sí | | | [E] |

`additionalProperties: false` en la raíz. [E]

Conteo actual: 104 `assets` + 19 `nonProductive` = 123 PNG (64 entradas históricas + 59 PNG de arcanos, zodiaco e identidad).

## 3. Entidad `Asset`

### 3.1 Campos núcleo (exigidos por la HU)

| Campo | Tipo | Obligatorio (schema) | Restricción / enum | FK lógica | Estado |
|---|---|---|---|---|---|
| `id` | string | sí | `minLength: 1`; **único** en `assets[]` (lo verifica el validador, no el schema) | | [E] |
| `family` | string | sí | `ashura-animal`, `arrival-illustration`, `permanence-illustration`, `view-background`, `view-background-family`, `role-illustration`, `section-illustration`, `action-illustration`, `mineral-illustration`, `ritual-material-illustration`, `arcano`, `signo`, `identidad` | | [E] |
| `master` | string \| null | condicional | ruta relativa a `app/assets/`; obligatoria salvo `state = faltante` (regla del validador) | → archivo PNG en disco | [E] |
| `state` | string | sí | `aprobado`, `provisional`, `por-corregir`, `por-optimizar`, `faltante` | | [E] |
| `provenance` | `Provenance` | sí | ver §3.3 | | [E] |
| `destinations` | string[] | sí | `minItems: 1` (vistas o componentes) | → id de vista/componente (no validado contra catálogo) | [E] · [N?] |
| `dimensions` | `{width:int≥1, height:int≥1}` | sí | debe coincidir con el PNG real; en `faltante` son las **medidas objetivo** | | [E] |
| `theme` | string | sí | `light` (único valor en V1) | | [E] |
| `dark` | null | no | `type: null` (DEC-196); el validador también falla si no es nulo | `null` | [E] |
| `platform` | string | sí | `all`, `ios`, `android` | | [E] |
| `mode` | string | sí | `empaquetado`, `descargable` (valor inicial DEC-173) | | [E] |
| `alt` | string | sí | `minLength: 1` | | [E] |
| `approvals` | `Approvals` | no (schema) | ver §3.4; exigido con valores por el validador cuando `state = aprobado` | | [E] · [N] ver §3.4 |
| `derivatives` | `Derivative[]` | no (schema) | ver §3.5; vacío con `state = aprobado` falla → debe ser `por-optimizar` | → archivo WebP en disco | [E] |

### 3.2 Campos de clasificación por familia (opcionales)

| Campo | Tipo | Uso | Presencia actual | Estado |
|---|---|---|---|---|
| `usages` | `{name:string, logicalSize:int≥1}[]` | tamaños lógicos de los que HU-02-03 deriva 1x/2x/3x | 45 | [E] |
| `exportName` | string | nombre numerado del derivado (p.ej. `arcano-08-la-fuerza`) | | [E] |
| `kind` | string | subtipo libre | | [E] |
| `house` | integer | casa 1..12 (Ashura, llegadas, permanencia, signos) | 36 | [E] · [N?] acotar `minimum 1, maximum 12` |
| `animal` | string | animal Ashura | 12 | [E] |
| `views` | string[] | vistas de un fondo | 10 | [E] |
| `viewFamily` | string | familia de fondos | 6 | [E] |
| `role`, `section`, `action`, `mineral`, `material` | string | discriminador por familia | 3 / 2 / 4 / 6 / 3 | [E] |
| `aliases` | string[] | ids históricos que el resolvedor sigue aceptando | 1 | [E] |

Nota: hoy no hay `if/then` por `family` en el schema; un `house` en un `mineral-illustration` pasa. [N?] ver §7.

### 3.3 Objeto `Provenance` (doc 46 §10)

| Campo | Tipo | Obligatorio | Regla | FK lógica | Estado |
|---|---|---|---|---|---|
| `type` | string | sí | `source`, `authorship`, `pending` | | [E] |
| `register` | string | si `type = authorship` | ruta al registro de creación; el validador comprueba que resuelve (`_check_register_resolves`) | → `docs/content/imagenes/05`, `09`, `10`, `11`, ... | [E] |
| `reference` | string | si `type = source` | fuente externa | | [E] |

Reglas: `aprobado` con `type = pending` falla (`approved-pending-provenance`). [E]

Distribución actual: 70 `authorship`, 34 `source`, 0 `pending`.

Pendiente externo (licencia): **no** se modela. Se amplía este objeto cuando el propietario del producto defina la licencia (fuera de alcance).

### 3.4 Objeto `Approvals` (DEC-230)

| Campo | Tipo hoy | Regla | Estado |
|---|---|---|---|
| `design` | string \| null | no nulo y no vacío si `state = aprobado`; si falta, error `approved-without-approval` nombrando "Diseño" | [E] |
| `content` | string \| null | idem, nombrando "Contenido" | [E] |

[N?] **Brecha de trazabilidad**: hoy la aprobación es un string libre, sin quién ni cuándo. El criterio dice "aprobación registrada en la entrada". Opciones:

- **A. Mantener string** con convención documentada (`"<persona> · <YYYY-MM-DD> · <enlace>"`). Pros: cero migración. Contras: no validable.
- **B. Objeto estructurado** `{by: string, date: date, ref: string}` \| null. Pros: validable, auditable. Contras: cambio de schema (sigue siendo v2 si se admite `string | object` en transición; si no, bump a v3, que la HU no pide).

Recomendación: A en este ticket (todos los assets están en `provisional`, no hay datos que migrar) y B cuando el primer asset pase a `aprobado`.

### 3.5 Objeto `Derivative` (lo produce HU-02-03, lo consume este validador)

| Campo | Tipo | Obligatorio | Estado |
|---|---|---|---|
| `path` | string (relativo a `app/assets/`) | sí | [E] |
| `width`, `height` | integer ≥ 1 | sí | [E] |
| `bytes` | integer ≥ 0 | no | [E] |
| `sha256` | string | no | [E] · [N?] `pattern: ^[0-9a-f]{64}$` |
| `variant` | string (`1x`, `2.0x`, `3.0x`) | no | [E] · [N?] enum |
| `usage` | string (→ `usages[].name`) | no | [E] |
| `colorSpace` | string (`sRGB`) | no | [E] |

Nota: `Derivative` no tiene `additionalProperties: false` (el resto de objetos sí). [N?] cerrarlo por consistencia.

## 4. Índices e invariantes (los aplica el validador)

| Invariante | Clave | Código de error | Estado |
|---|---|---|---|
| Unicidad de `id` en `assets[]` | `id` | duplicado nombrando el `id` | [E] |
| Unicidad de `nonProductive` | ruta | schema `uniqueItems` | [E] |
| Disjunción `assets[].master` ∩ `nonProductive` = ∅ | ruta | `_check_non_productive` | [E] |
| Cobertura: todo PNG bajo `app/assets/` está en `master` o `nonProductive` | ruta | nombra la ruta | [E] |
| Existencia del maestro y medidas reales = `dimensions` | `id` | lectura de cabecera PNG (`read_png_size`, sin dependencias) | [E] |
| Estado fuera de enum | `id` + valor | `invalid-state` | [E] |
| `aprobado` exige `approvals.design` y `approvals.content` | `id` + aprobación faltante | `approved-without-approval` | [E] |
| `aprobado` sin `derivatives` | `id` | `approved-without-derivatives` (indica `por-optimizar`) | [E] |
| `faltante`: sin archivo, exige `destinations` y `dimensions` | `id` | `missing-target-values` | [E] |
| `dark` no nulo | `id` | `dark-variant-not-allowed` | [E] |
| `register` resuelve a un archivo existente | `id` | `_check_register_resolves` | [E] |
| Todos los errores se informan juntos, con `id` y motivo | | lista de `Finding` | [E] |

Índice secundario implícito usado por consumidores: `aliases[] → id` (resolvedor). [E]

## 5. Relaciones

| Origen | Cardinalidad | Destino | Tipo |
|---|---|---|---|
| `Manifest` | 1 : N | `Asset` | composición |
| `Asset` | 1 : 0..1 | PNG maestro en `app/assets/` | FK lógica por ruta (0 si `faltante`) |
| `Asset` | 1 : 0..N | `Derivative` (WebP) | composición; archivos los genera HU-02-03 |
| `Asset` | 1 : 0..N | `usages` | composición; `Derivative.usage → usages.name` |
| `Asset` | N : 1 | registro de creación (`docs/content/imagenes/*.md`) | FK lógica vía `provenance.register` |
| `Asset` | N : M | vistas / componentes | `destinations[]`, sin catálogo validado |
| `Manifest.nonProductive` | 1 : N | PNG históricos | lista de exclusión |
| Consumidores | | `Manifest` | HU-01-02 (resolvedor), HU-02-03 (exportación), HU-02-07, HU-02-08, vistas |

Consumidores de lectura verificados en el repo: `scripts/assets/export_assets.py`, `scripts/ci/ep01-assets-provider.mjs` (corre el validador), `app/lib/core/images/fixtures/image_manifest_fixture.dart` y la regla de `pubspec.yaml` (DEC-240: solo derivados WebP de modo `empaquetado`).

## 6. Notas de migración

1. **v1 → v2: ya aplicada.** Las 64 entradas históricas conservan `id` y `alt`; se sumaron 40 entradas (22 arcanos, 12 signos, 6 identidad) y 19 PNG pasaron a `nonProductive` (13 arcanos `rev-*`/`-v1`, 6 variantes de zodiaco). No queda trabajo de transformación sobre el JSON.
2. **Clasificación inicial**: las 104 entradas están en `provisional`. Cumple "permanencia = `provisional`" (doc 09) y "fondos 940/941×1672 ≠ `aprobado`" (doc 12). [N] Falta la **revisión de Contenido y Diseño** de esa clasificación (QA humana) y decidir si alguna pieza debe ir a `por-corregir` según doc 03.
3. **QA-02-02-04** (borde `por-optimizar`): ninguna entrada real está en ese estado; se cubre con fixture en `tests/fixtures`. [E] verificar que el caso exista en `test_assets_manifest.py`.
4. **Modo**: 99 `descargable`, 5 `empaquetado` (DEC-173). Si HU-02-01 cambia la regla, se edita el dato; el schema no cambia.
5. **Resolvedor (REQ-06)**: el contrato es v2 único (`schemaVersion: const 2`). [N] confirmar que el lector Dart no conserve una rama de compatibilidad v1.
6. **CI (REQ-05)**: el validador corre desde `scripts/ci/ep01-assets-provider.mjs`. [N] confirmar que ese runner esté enganchado a un job de `.github/workflows/ci-pr.yml` o `main.yml` y que un error del validador haga fallar el job (no apareció referencia directa en los workflows).
7. **Dependencias (REQ-07)**: el validador es Python y lee cabeceras PNG sin librerías; `ajv` existe en `package.json` pero no se usa aquí. No se agregan dependencias.
8. **Docs (REQ-08, REQ-09)**: `SCHEMA.md` ya referencia el contrato. [N] falta la entrada del validador en `docs/development/commands.md` (uso, parámetros, ejemplo de salida con error) y correr markdownlint, cspell y vale sin agregar líneas a `.docs-baseline.txt`.
9. **Rollback**: revertir en un solo commit `manifest.schema.json`, `manifest.json` y `validate_manifest.py` a la versión previa; los maestros PNG no se tocan.

## 7. Ajustes de schema propuestos (opcionales, no bloquean los criterios)

| # | Ajuste | Beneficio | Riesgo |
|---|---|---|---|
| 1 | `if state ≠ faltante then required: [master]` en el schema | la regla vive en el contrato, no solo en Python | bajo |
| 2 | `required: [approvals, derivatives]` con default `{design:null, content:null}` y `[]` | alinea con REQ-01 ("exige... aprobaciones y derivados registrados"); hoy los 104 los traen, pero el schema no lo obliga | bajo, sin migración |
| 3 | `additionalProperties: false` en `Derivative` | consistencia con el resto | bajo |
| 4 | `house` 1..12, `variant` enum, `sha256` pattern, `updatedAt` `format: date` | detecta errores de tipeo | bajo |
| 5 | `if/then` por `family` para los discriminadores | evita campos cruzados entre familias | medio (más mantenimiento del schema) |
| 6 | `Approvals` estructurado (opción B §3.4) | trazabilidad auditable | medio; diferir al primer `aprobado` |