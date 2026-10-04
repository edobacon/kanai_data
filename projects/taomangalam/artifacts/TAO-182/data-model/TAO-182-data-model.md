# Modelo de datos — TAO-182 (`HU-01-16`)

## 0. Naturaleza del modelo

Esta historia no toca base de datos ni API: es una suite de *goldens* (regresión visual) en Flutter. Por lo tanto el "modelo de datos" son las **entidades de configuración, de identidad de caso dorado y de artefactos** que la suite persiste en el repositorio y publica como artifacts de CI.

- **Persistencia**: archivos versionados (Dart const / JSON) + PNG de goldens en `test/goldens/**` + manifest de catálogo + artifacts de CI.
- **Sin migración de datos de usuario**: no hay esquema relacional ni migraciones de negocio. Las "migraciones" son renombrados/altas de archivos y reconciliación de la config existente.
- **Convenciones**: identificadores de código en inglés; descripciones en español. Tipos expresados en Dart y, entre paréntesis, su serialización JSON cuando aplique.

Mapa REQ → entidad:

| REQ | Entidad(es) |
|---|---|
| REQ-07 | `GoldenMatrix`, `ViewportSpec` (config única, patrón `AccessibilityViewport`) |
| REQ-01 | `GoldenHarness` (fuentes, superficie, tema, plataforma, movimiento reducido) |
| REQ-08 | `EntryMirror` (existente), `FontAsset` (existente) |
| REQ-02 | `GoldenCase` (subject `component`) |
| REQ-03 | `ShellGolden` (extiende `GoldenCase`) |
| REQ-04 | `TemplateGolden` (extiende `GoldenCase`) |
| REQ-05 | `GoldenArtifact`, `CiGoldenJob` |
| REQ-06 | `GoldenUpdateProcedure` (doc), `GoldenManifest` |
| cierre EP-01 / DEC-196 | `GoldenMatrix.osThemes[].enabled` + `ThemeComparison` |

---

## 1. `GoldenMatrix` — NUEVO (REQ-07)

Única fuente de verdad de la matriz. Config declarativa; ninguna suite debe hardcodear tamaños, escalas ni temas.

| Campo | Tipo | Obligatorio | FK | Enum / Default | Notas |
|---|---|---|---|---|---|
| `id` | `String` | sí | — | default `"default"` | Permite más de una matriz (p. ej. smoke/full) |
| `viewports` | `List<ViewportSpec>` | sí | → `ViewportSpec` | default `[]` | 5 entradas (ver §2) |
| `textScales` | `List<double>` | sí | — | default `[1.0, 2.0]` | Escala de texto |
| `osThemes` | `List<OsThemeSpec>` | sí | — | default `[light]` | Dimensión de sistema operativo |
| `forcedAppTheme` | `AppTheme` | sí | — | default `light` (DEC-196) | Tema claro forzado |
| `reducedMotion` | `bool` | sí | — | default `true` | Captura estado final sin animación |
| `ciPlatform` | `Platform` | sí | — | default `ci` | Plataforma fija de CI |
| `maxWidth` | `int` | sí | — | default `1440` | Ancho máximo esperado |
| `layoutBreakpoints` | `Map<String,int>` | no | — | default `{}` | p. ej. `{"list-detail": 840}` (QA-01-16-01) |
| `tolerance` | `double` | no | — | default `0.0` (exacto) | Umbral de comparación de pixel |

---

## 2. `ViewportSpec` — NUEVO (instancias), patrón EXISTENTE `AccessibilityViewport` (REQ-07)

| Campo | Tipo | Obligatorio | FK | Enum / Default | Notas |
|---|---|---|---|---|---|
| `label` | `String` | sí | — | — | p. ej. `phone-360x800` |
| `width` | `int` | sí | — | — | 360, 390, 768, 1024, 1440 |
| `height` | `int` | sí | — | — | 800, 844, 1024, 768, 900 |
| `deviceClass` | `DeviceClass` | sí | — | enum `phone\|tablet\|desktop` | Derivado del ancho |
| `orientation` | `Orientation` | sí | — | enum `portrait\|landscape` (derivado) | 1024×768 → landscape |
| `osThemes` | `List<OsThemeSpec>` | no | — | default hereda `GoldenMatrix` | Override por viewport |

Instancias canónicas: `360×800`, `390×844`, `768×1024`, `1024×768`, `1440×900`.

---

## 3. `OsThemeSpec` — NUEVO (REQ-07, DEC-196)

| Campo | Tipo | Obligatorio | FK | Enum / Default | Notas |
|---|---|---|---|---|---|
| `osTheme` | `OsTheme` | sí | — | enum `light\|dark` | Sistema operativo |
| `enabled` | `bool` | sí | — | `light=true`, `dark=false` | Oscuro se activa cuando DEC-196 lo permita |
| `comparison` | `ThemeComparison` | sí | — | enum `identical\|independent`; dark default `identical` | CR-3: dark debe ser idéntico a claro hoy |

---

## 4. `GoldenHarness` — NUEVO (REQ-01, REQ-08)

Fixture que envuelve cada test. Reutiliza cargador de fuentes y espejo de entradas existentes.

| Campo | Tipo | Obligatorio | FK | Enum / Default | Notas |
|---|---|---|---|---|---|
| `id` | `String` | sí | — | default `"golden-harness"` | — |
| `fonts` | `List<FontAsset>` | sí | → `FontAsset` | default `[]` | Fallback: suite falla con mensaje claro (QA-01-16-02) |
| `surfaceSize` | `Size` | sí | → `ViewportSpec` | — | Fijada por viewport |
| `forcedAppTheme` | `AppTheme` | sí | — | default `light` | — |
| `platform` | `Platform` | sí | — | default `ci` | — |
| `reducedMotion` | `bool` | sí | — | default `true` | — |
| `requireFontsLoaded` | `bool` | sí | — | default `true` | Guard anti-goldens con fuente de reemplazo |

---

## 5. `EntryMirror` — EXISTENTE (REQ-08)

Espejo de entradas del catálogo que alimenta los goldens de componentes. **No se crea**: se referencia y debe seguir siendo la misma instancia que el catálogo para que el componente bajo prueba coincida.

| Campo | Tipo | Obligatorio | FK | Enum / Default | Notas |
|---|---|---|---|---|---|
| `componentKey` | `String` | sí | — | — | Identidad del componente |
| `state` | `String` | sí | — | enum de estados del componente | p. ej. default/hover/pressed/disabled |
| `args` | `Map<String,dynamic>` | sí | — | `{}` | Entradas del espejo ya existente |

---

## 6. `FontAsset` — EXISTENTE (DEC-230)

| Campo | Tipo | Obligatorio | FK | Enum / Default | Notas |
|---|---|---|---|---|---|
| `family` | `String` | sí | — | — | Tipografía del sistema de diseño |
| `weight` | `int` | sí | — | — | 400/500/600/700 |
| `sourcePath` | `String` | sí | — | — | En el repositorio (aprobado) |
| `license` | `String` | sí | — | — | — |

---

## 7. `GoldenCase` — NUEVO (derivado; REQ-02, REQ-03, REQ-04)

Identidad de un golden. La clave es compuesta y determinista.

| Campo | Tipo | Obligatorio | FK | Enum / Default | Notas |
|---|---|---|---|---|---|
| `caseId` | `GoldenKey` (String) | sí | — | — | `subject/component/state/{w}x{h}@scale{scale}-{osTheme}` |
| `subject` | `GoldenSubject` | sí | — | enum `component\|shell\|template` | Discriminador |
| `sourceRef` | `String` | sí | → `EntryMirror` / `ShellGolden` / `TemplateGolden` | — | Componente, shell o plantilla |
| `viewport` | `ViewportSpec` | sí | → `ViewportSpec` | — | FK lógica |
| `textScale` | `double` | sí | — | `1.0\|2.0` | De `GoldenMatrix.textScales` |
| `osTheme` | `OsTheme` | sí | → `OsThemeSpec` | `light\|dark` | — |
| `goldenPath` | `String` | sí | — | — | `test/goldens/<caseId>.png` |
| `status` | `GoldenStatus` | no | — | enum `active\|skipped\|quarantined`; default `active` | — |
| `generatedAt` | `String (ISO-8601)` | no | — | — | Metadato del último regenerado |

### 7.1 `ShellGolden` — NUEVO, extiende `GoldenCase`(subject=`shell`) — REQ-03

| Campo | Tipo | Obligatorio | FK | Enum / Default | Notas |
|---|---|---|---|---|---|
| `panelMode` | `ShellPanelMode` | sí | — | enum `overlay\|persistent` | CR-5 |
| `panelState` | `ShellPanelState` | sí | — | enum `open\|closed` | 768×1024 → overlay+closed; 1024×768 → persistent |
| `orientationBinding` | `bool` | sí | — | default `true` | El modo se deriva de la orientación |

### 7.2 `TemplateGolden` — NUEVO, extiende `GoldenCase`(subject=`template`) — REQ-04

| Campo | Tipo | Obligatorio | FK | Enum / Default | Notas |
|---|---|---|---|---|---|
| `templateId` | `String` | sí | — | 3 plantillas de HU-01-10 | Bloqueada por HU-01-10 |
| `transitionWidth` | `int` | no | → `GoldenMatrix.layoutBreakpoints` | default `840` | Ancho donde cambia la composición |

---

## 8. `GoldenManifest` — NUEVO (soporte de REQ-05, REQ-06)

Índice del catálogo de goldens para detectar huérfanos (golden sin `GoldenCase` y viceversa) y auditar regeneraciones.

| Campo | Tipo | Obligatorio | FK | Enum / Default | Notas |
|---|---|---|---|---|---|
| `entries` | `List<GoldenCase>` | sí | → `GoldenCase` | default `[]` | Catálogo completo |
| `baselineCommit` | `String (sha)` | sí | — | — | Commit de la baseline vigente |
| `updateReviewedIn` | `String` | no | — | — | PR que aprobó el último regenerado (REQ-06) |

---

## 9. `GoldenArtifact` — NUEVO (REQ-05, REQ-06)

Publicado por CI al fallar o al regenerar.

| Campo | Tipo | Obligatorio | FK | Enum / Default | Notas |
|---|---|---|---|---|---|
| `artifactId` | `String` | sí | — | — | — |
| `caseId` | `GoldenKey` | sí | → `GoldenCase` | — | Caso que originó el artefacto |
| `kind` | `GoldenArtifactKind` | sí | — | enum `new\|master\|diff\|isolatedDiff` | — |
| `path` | `String` | sí | — | — | Ruta del artefacto en el job |
| `prNumber` | `int` | sí | → `CiGoldenJob` | — | PR asociado |
| `runId` | `String` | sí | → `CiGoldenJob` | — | Corrida de CI |
| `pixelDiff` | `int` | no | — | default `0` | Píxeles distintos (para 1 px de padding) |
| `retentionDays` | `int` | sí | — | según política DEC-230 | Retención de artifacts |

---

## 10. `CiGoldenJob` — NUEVO (REQ-05)

| Campo | Tipo | Obligatorio | FK | Enum / Default | Notas |
|---|---|---|---|---|---|
| `jobId` | `String` | sí | — | default `goldens` | — |
| `trigger` | `CiTrigger` | sí | — | enum `pull_request\|manual` | Corre en cada PR |
| `failOnDiff` | `bool` | sí | — | default `true` | CR-2 |
| `publishArtifacts` | `bool` | sí | — | default `true` | — |
| `updateOnlyWhenFlagged` | `bool` | sí | — | default `true` | Regenerar exige revisión (REQ-06) |

---

## 11. `GoldenUpdateProcedure` — NUEVO (REQ-06, documental)

| Campo | Tipo | Obligatorio | FK | Enum / Default | Notas |
|---|---|---|---|---|---|
| `docPath` | `String` | sí | — | — | Procedimiento de regeneración |
| `requiresDiffReview` | `bool` | sí | — | default `true` | CR-6 |
| `command` | `String` | sí | — | — | Comando de regenerado |
| `appliesToSubjects` | `List<GoldenSubject>` | sí | — | default `[component,shell,template]` | — |

---

## 12. Relaciones

```text
GoldenMatrix 1 ──▶ N ViewportSpec
GoldenMatrix 1 ──▶ N OsThemeSpec
GoldenHarness N ──▶ N FontAsset            (reutiliza cargador existente)
GoldenHarness 1 ──▶ 1 ViewportSpec          (surfaceSize)
GoldenCase    N ──▶ 1 ViewportSpec
GoldenCase    N ──▶ 1 OsThemeSpec
GoldenCase    N ──▶ 1 (EntryMirror | ShellGolden | TemplateGolden)
ShellGolden   1 ──▶ 1 GoldenCase            (herencia)
TemplateGolden1 ──▶ 1 GoldenCase            (herencia)
GoldenManifest1 ──▶ N GoldenCase
GoldenArtifactN ──▶ 1 GoldenCase
GoldenArtifactN ──▶ 1 CiGoldenJob
CiGoldenJob   1 ──▶ N GiuGoldenArtifact
```

- `EntryMirror` es **EXISTENTE** y compartido con el catálogo: los goldens no lo clonan (REQ-08).
- `AccessibilityViewport` es **EXISTENTE**: se reconcilia para consumir `GoldenMatrix`, no se reemplaza.

---

## 13. Índices / claves

| Entidad | Clave / índice | Tipo | Propósito |
|---|---|---|---|
| `GoldenCase` | `caseId` | único | Evita colisiones y duplicados |
| `GoldenManifest` | `entries.caseId` | índice | Detectar huérfanos golden↔caso |
| `GoldenManifest` | `baselineCommit` | índice | Auditoría de baseline |
| `ViewportSpec` | `(width,height)` | único en matriz | Tamaños no repetidos |
| `FontAsset` | `(family,weight)` | único | Fallo por fuente ausente (QA-01-16-02) |
| `GoldenArtifact` | `(prNumber,runId,caseId,kind)` | compuesto | Recuperar artifacts del PR |
| `CiGoldenJob` | `jobId` | único | Referencia de CI |

---

## 14. Notas de migración

**No hay migración de base de datos.** Las "migraciones" son altas y reconciliaciones de archivos:

1. **REQ-07 (config única)** — MEDIANA. Crear `GoldenMatrix`/`ViewportSpec`/`OsThemeSpec`. Reconciliar `AccessibilityViewport` (EXISTENTE) para **consumir** la matriz sin cambiar su comportamiento. Reversibilidad alta: al ser config, revertir no rompe goldens si los paths no cambian.
2. **REQ-01/08 (harness)** — MEDIANA. Introducir `GoldenHarness` reutilizando cargador de fuentes y `EntryMirror` existentes. Riesgo de falsos positivos si la fuente no carga → guard `requireFontsLoaded` (QA-01-16-02).
3. **Baseline de componentes HU-01-03..05 (REQ-02)** — ALTA en volumen. Genera N goldens nuevos (`component × state × viewport × scale × osTheme`). El volumen es `estados × 5 tamaños × 2 escalas`; el eje `osTheme` queda en `light` hasta DEC-196.
4. **Shell y plantillas (REQ-03/04)** — **Bloqueada por HU-01-10**. No generar `TemplateGolden` hasta que las tres plantillas existan. `ShellGolden` depende de que el shell con panel overlay/persistent esté implementado.
5. **DEC-196 (tema oscuro)** — DIFERIDA. La dimensión existe en el modelo (`OsThemeSpec.enabled=false`, `comparison=identical`); activarla es **solo configuración**, sin cambio de esquema (cumple "ampliar la matriz por configuración"). No migrar ahora.
6. **DEC-230 (fuentes/artifacts)** — Los `FontAsset` y la política de retención ya están aprobados; solo se referencian.
7. **Rollback** (según ticket) — Revertir goldens y matriz solo si la baseline estaba equivocada; conservar capturas de referencia y corregir goldens de forma deliberada ante cambios aprobados.

### Resumen nuevo vs existente

- **NUEVO**: `GoldenMatrix`, `ViewportSpec`, `OsThemeSpec`, `GoldenHarness`, `GoldenCase`, `ShellGolden`, `TemplateGolden`, `GoldenManifest`, `GoldenArtifact`, `CiGoldenJob`, `GoldenUpdateProcedure`.
- **EXISTENTE (reutilizado)**: `EntryMirror` (espejo de entradas), `FontAsset` (fuentes del sistema de diseño), `AccessibilityViewport` (patrón de config a reconciliar).
- **DIFERIDO por DEC-196**: goldens con `osTheme=dark` (dimensión presente, `enabled=false`).