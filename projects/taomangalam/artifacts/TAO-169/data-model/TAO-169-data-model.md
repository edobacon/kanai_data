# Modelo de datos — TAO-169 (HU-00-18)

Documentación como código: validador de frontmatter (Ajv), Mermaid → SVG, DartDoc, TypeDoc y detección de documentos huérfanos.

## 1. Naturaleza del modelo

Esta historia **no introduce una base de datos**. El almacén es el sistema de archivos del monorepo y la fuente de verdad son los archivos versionados en Git. El modelo distingue dos capas:

- **Fuente de verdad (source):** frontmatter de los documentos de `docs/`, archivos `.mmd` y registros citables (DEC y vistas V-xx). Todo lo demás deriva de aquí.
- **Derivados regenerables (derived):** SVG, salidas de DartDoc/TypeDoc, índices de referencias, grafo de backlinks y summaries de `ci-pr.yml`/`nightly.yml`. No se versionan como fuente; se regeneran y se comparan con `git diff --exit-code`.

Convención de marcado: **[NUEVO]** = lo crea esta historia · **[EXISTENTE]** = ya en el repo, esta historia lo lee/valida · **[DERIVADO NUEVO]** = artefacto regenerable nuevo.

## 2. Entidades

### 2.1 Documento con frontmatter — `docs/**/*.md` [EXISTENTE, contrato NUEVO]

Unidad central. El contenido es libre; el frontmatter es el registro validado contra el JSON Schema.

| Campo | Tipo | Obligatorio | Enum / formato | Default | FK | Notas |
|---|---|---|---|---|---|---|
| `id` | string | sí | patrón estable por familia (ej. `HU-00-18`, `DEC-193`) | — | — | Único global entre documentos; la duplicación es fallo (REQ-01) |
| `title` | string | sí | texto no vacío | — | — | — |
| `type` | string | sí | enum **por familia** | — | — | Valores canónicos: tecnologia/19 §4 |
| `status` | string | sí | enum **por familia** | — | — | Valores canónicos: tecnologia/19 §4 |
| `family` | string | sí (o derivada de la ruta) | enum de familias de `docs/` | derivada de la carpeta | — | Determina los enums válidos de `type`/`status` |
| `date` | string | sí | `date` ISO 8601 (`YYYY-MM-DD`) | — | — | Formato estricto (REQ-01) |
| `dec_refs` | array<string> | no | ids `DEC-\d+` | `[]` | → 2.4 | Cada valor debe resolver; irresoluble en modificado ⇒ fallo (REQ-02) |
| `view_refs` | array<string> | no | ids `V-\d{2}` | `[]` | → 2.5 | Igual criterio que `dec_refs` |
| `tags` | array<string> | no | texto | `[]` | — | — |
| `updated` | string | no | `date` ISO 8601 | — | — | Metadata de frescura, usada por nightly (REQ-07) |

### 2.2 Esquema de frontmatter versionado [NUEVO]

Artefacto JSON Schema que define el contrato de 2.1.

| Campo | Tipo | Obligatorio | Enum / formato | Notas |
|---|---|---|---|---|
| `$schemaVersion` | string | sí | SemVer (`\d+\.\d+\.\d+`) | Versionado explícito del contrato (tecnologia/19 §4) |
| `families` | object | sí | mapa `familia → { type: enum[], status: enum[] }` | Enums por familia |
| `requiredFields` | array<string> | sí | subconjunto de 2.1 | Campos mínimos |
| `idPattern` | string | sí | regex por familia | Base de detección de duplicados |
| `dateFormat` | string | sí | `date` | — |

El esquema es el contrato que consume el verificador Ajv (REQ-01). Su versión se referencia desde la baseline (2.3).

### 2.3 Baseline de documentos heredados [NUEVO]

Lista explícita de documentos que quedan exentos mientras no se toquen (tecnologia/19 §4 y §13).

| Campo | Tipo | Obligatorio | Enum / formato | Default | Notas |
|---|---|---|---|---|---|
| `path` | string | sí | ruta relativa a la raíz | — | PK de esta entidad |
| `schema_version_at_baseline` | string | sí | SemVer | — | Versión del schema vigente al congelar |
| `reason` | string | sí | texto | — | Por qué se hereda |
| `grandfathered_at` | string | sí | `date` ISO 8601 | — | Trazabilidad |

Regla derivada: un `path` en baseline que **no** se modifica no bloquea; al modificarse sale de la exención y debe cumplir 2.1 y 2.8 (REQ-02, REQ-08).

### 2.4 Registro de decisiones citables — DEC [EXISTENTE]

Conjunto de ids `DEC-\d+` resolubles desde el frontmatter. No lo crea esta historia; el verificador lo consume como tabla de referencia para resolver `dec_refs`.

| Campo | Tipo | Obligatorio | Notas |
|---|---|---|---|
| `dec_id` | string | sí | PK lógica (`DEC-155`, `DEC-193`, `DEC-230` citadas en el pedido) |
| `path` | string | sí | Documento fuente que la define |

### 2.5 Registro de vistas citables — V-xx [EXISTENTE]

Análogo a 2.4 para referencias `V-\d{2}`.

| Campo | Tipo | Obligatorio | Notas |
|---|---|---|---|
| `view_id` | string | sí | PK lógica (`V-\d{2}`) |
| `path` | string | sí | Documento de la vista |

### 2.6 Diagrama Mermaid — `docs/product/tecnologia/diagramas/*.mmd` [EXISTENTE + DERIVADO NUEVO]

| Campo/Artefacto | Tipo | Origen | Notas |
|---|---|---|---|
| `.mmd` | archivo fuente | EXISTENTE | Fuente de verdad del diagrama; contenido sin cambios en esta historia |
| `.svg` | archivo derivado | DERIVADO NUEVO | Generado por `@mermaid-js/mermaid-cli` con **versión fijada** (REQ-03) |
| HTML Mermaid con CDN | archivo existente a reemplazar | EXISTENTE | Se sustituye por el SVG generado; deja de usar CDN (REQ-03) |

### 2.7 Artefacto DartDoc [DERIVADO NUEVO]

Salida de `dart doc --dry-run` sobre la API pública de `app/`.

| Campo | Tipo | Notas |
|---|---|---|
| `member` | símbolo público | Miembro sin `///` ⇒ fallo vía lint `public_member_api_docs` |
| `comment_reference` | referencia en comentario | Referencia inválida ⇒ fallo vía lint `comment_references` |
| `artifact` | salida generada | No incluye secretos; portal privado por defecto (tecnologia/19 §9) |

### 2.8 Artefacto TypeDoc [DERIVADO NUEVO]

Salida de TypeDoc sobre los exports de `server/`.

| Campo | Tipo | Notas |
|---|---|---|
| `export` | símbolo exportado | Unidad documentada |
| `tsdoc_link` | enlace TSDoc | Enlace inválido ⇒ warning tratado como error ⇒ fallo (REQ-05) |
| `artifact` | salida generada | Sin secretos (tecnologia/19 §9) |

### 2.9 Grafo de backlinks / detección de huérfanos [DERIVADO NUEVO]

Derivado de los enlaces entre documentos de `docs/` y de la navegación de MkDocs.

| Campo | Tipo | Notas |
|---|---|---|
| `path` | string | Documento evaluado |
| `incoming_links` | number | Enlaces entrantes (documentos + navegación) |
| `orphan` | boolean | `true` si `incoming_links == 0` ⇒ lo informa `nightly.yml` (REQ-07) |

### 2.10 Summary de verificación [DERIVADO NUEVO]

Resultado por herramienta expuesto en el summary de CI/nightly.

| Campo | Tipo | Enum / formato | Notas |
|---|---|---|---|
| `tool` | string | `frontmatter` \| `dartdoc` \| `typedoc` \| `mermaid` \| `regen` \| `orphans` | Una entrada por verificador (REQ-07) |
| `status` | string | `pass` \| `fail` \| `skip` | — |
| `findings` | array<object> | `{path, field?, message}` | Falla nombrando archivo y campo (criterio 1) |
| `orphans` | array<string> | rutas | Solo para `tool=orphans` |
| `stale_metadata` | array<object> | `{path, field, expected, actual}` | Metadata atrasada (REQ-07) |

## 3. Claves e índices (lógicos)

| Índice | Tipo | Sobre | Efecto |
|---|---|---|---|
| `pk_document_id` | único | `Documento.id` (2.1) | Duplicado ⇒ fallo listando ambos archivos (criterio 2) |
| `idx_family` | no único | `Documento.family` | Selecciona enums válidos de `type`/`status` |
| `idx_baseline_path` | único | `Baseline.path` (2.3) | Membership test de exención |
| `idx_dec_id` / `idx_view_id` | único | 2.4 / 2.5 | Resolución de `dec_refs`/`view_refs` |
| `idx_backlink_target` | no único | destino de enlace | Conteo de entrantes para huérfanos |
| `idx_updated` | no único | `Documento.updated` | Detección de metadata atrasada |

## 4. Relaciones

- `Documento.dec_refs` → **N:1** con `Registro DEC` (2.4). Ref irresoluble en documento modificado ⇒ fallo; en heredado de baseline no modificado ⇒ se ignora.
- `Documento.view_refs` → **N:1** con `Registro V-xx` (2.5). Mismo criterio.
- `Documento.path` → **0:1** con `Baseline.path` (2.3). Presencia = exento mientras no se modifique.
- `Documento.family` → **N:1** con `Esquema.families` (2.2). Determina enums válidos.
- `Diagrama.mmd` → **1:1** con `Diagrama.svg` (2.6). Gate de regeneración sin diff.
- `Documento` → **N:M** consigo mismo por enlaces de navegación/contenido; fuente del grafo de huérfanos (2.9).
- `Summary` (2.10) → **1:N** con hallazgos de cada verificador.

## 5. Notas de migración

- **Adopción incremental con baseline (REQ-02, REQ-08).** No hay migración masiva: los documentos heredados se migran al tocarlos. Un archivo nuevo o modificado debe cumplir el schema; el heredado sin tocar no bloquea.
- **Normalización del patrón rechazado.** Los heredados que ya traen el patrón que el linter rechaza (y se modifican) quedan compliant normalizando ese patrón (REQ-08), sin reescritura de contenido no relacionado.
- **Versionado.** La baseline fija `schema_version_at_baseline`; al subir `$schemaVersion`, la baseline se re-evalúa y los heredados siguen exentos hasta que se toquen.
- **Mermaid.** Versión de `@mermaid-js/mermaid-cli` **fijada** para reproducibilidad; se reemplazan los HTML con CDN por el SVG generado; el gate compara el SVG regenerado y falla mostrando el diff (REQ-03).
- **Derivados y gate limpio.** SVG, DartDoc, TypeDoc y summaries son regenerables; la verificación es `pnpm docs:generate` + `git diff --exit-code == 0` en clon limpio (REQ-06).
- **Seguridad.** Los artifacts de DartDoc/TypeDoc no incluyen secretos; el portal es privado por defecto (tecnologia/19 §9).
- **Compatibilidad.** Los scripts documentales existentes de HU-00-16 siguen pasando; solo se agregan pasos al job `docs` y a `nightly.yml` (REQ-07).
- **Rollback.** Retirar los pasos documentales nuevos y volver al job `docs` de HU-00-16; al ser todo derivado o de CI, el rollback no toca el frontmatter ya compliant.

## 6. Trazabilidad REQ → entidades

| REQ | Entidades |
|---|---|
| REQ-01 | 2.1, 2.2; índices `pk_document_id`, `idx_family` |
| REQ-02 | 2.1, 2.3, 2.4, 2.5; relaciones N:1 y baseline |
| REQ-03 | 2.6; gate de regeneración |
| REQ-04 | 2.7 |
| REQ-05 | 2.8 |
| REQ-06 | 2.6, 2.7, 2.8; gate `docs:generate` |
| REQ-07 | 2.9, 2.10 (jobs `docs` y `nightly.yml`) |
| REQ-08 | 2.1, 2.2, 2.3 (normalización en modificados) |

## 7. A confirmar contra la fuente canónica

Los **valores concretos de los enums** de `type` y `status` por familia (2.1, 2.2) y el **listado inicial de la baseline** (2.3) provienen de tecnologia/19 §4 y §13; este modelo fija la estructura y su validación, no los catálogos literales. La lista efectiva de `DEC-*` y `V-*` resolubles (2.4, 2.5) sale del propio `docs/` al correr el verificador.