# Modelo de datos — HU-00-08 / TAO-156

## 1. Resumen y alcance

Esta historia **no introduce entidades de dominio ni persistencia**. Su referencia canónica declara `Datos: ninguno`. El "modelo de datos" afectado es la **capa de contrato** (`server/contract/openapi.yaml`), que actúa como fuente única, más los **artefactos derivados** de esa fuente (tipos TypeScript y cliente Dart) y los **artefactos de gobierno** (ruleset Spectral, config de generadores, gate). El contrato es la autoridad; los generados son proyecciones no editables a mano.

Leyenda: `[N]` nuevo · `[E]` existente · `[?]` a verificar en el repo (no visible en el pedido).

| Capa | Naturaleza | Autoridad |
|---|---|---|
| `server/contract/openapi.yaml` | Esquemas y operaciones | Fuente de verdad (manual) |
| `server/contract/generated/` | Tipos TS + cliente Dart | Derivado (reproducible, no editable) |
| `server/contract/.spectral.yaml` | Reglas de lint | Fuente de verdad (manual) |
| config de generadores / lockfiles | Versiones fijadas | Fuente de verdad (manual) |

---

## 2. Objetos del contrato (fuente única)

### 2.1 Esquema `Salud` [E]

Es el esquema de respuesta que validan las operaciones de salud. La forma exacta vive en `openapi.yaml`; el pedido solo garantiza que **tiene al menos una propiedad requerida** (AC-06 / QA-00-08-05 dependen de ello).

| Campo | Tipo | Obligatorio | Enum | Default | FK | Notas |
|---|---|---|---|---|---|---|
| *(propiedades reales)* | `?` | `?` | `?` | — | — | `[?]` Completar leyendo `openapi.yaml`. Una de ellas es requerida y su omisión debe romper `tsc --noEmit`. |
| *(campo nuevo de prueba)* | `?` | `?` | — | — | — | No es una entidad nueva de negocio: es el fixture que ejercita AC-06/QA-00-08-05 (agregar requerido sin actualizar handler → falla el tipado). |

### 2.2 Esquema de error `ProblemJson` (media type `application/problem+json`) [E — DEC-227]

Contrato de errores de todas las operaciones. Debe estar declarado como media type en cada operación (regla del ruleset).

| Campo | Tipo | Obligatorio | Enum | Default | FK | Notas |
|---|---|---|---|---|---|---|
| `type` | string (uri) | sí (RFC 9457) | — | `about:blank` | — | Base problem+json. |
| `title` | string | no | — | — | — | |
| `status` | integer | sí | — | — | — | `400` en el caso de validación. |
| `detail` | string | no | — | — | — | |
| `instance` | string (uri) | no | — | — | — | |
| `codigo` | string | sí (proyecto) | incluye `validacion_fallida` | — | — | Clave de negocio consumida por AC-07 / QA-00-08-03. |
| `requestId` | string | sí (proyecto) | — | — | — | Correlación/observabilidad; obligatorio en la respuesta 400. |

### 2.3 Operaciones (contratos de API) [E]

| operationId | Path / método | Handler | Extensión `x-capacidad` | Extensión `x-requiere-cuenta` | Notas |
|---|---|---|---|---|---|
| `saludVivo` | `GET` (liveness) | sí | requerida | requerida | Respuesta valida contra `Salud`. `[?]` path exacto (`/health/live` vs `/v1/health/live`). |
| `saludListo` | `GET` (readiness) | sí | requerida | requerida | Respuesta valida contra `Salud`. |
| `version` | `GET /v1/version?plataforma=...` | **no** (documentada sin handler) | requerida | requerida | Ejercita la validación runtime: `plataforma` inválida → 400 (AC-07). |

### 2.4 Parámetro `plataforma` (query en `version`) [E]

| Campo | Tipo | Obligatorio | Enum | Default | FK | Notas |
|---|---|---|---|---|---|---|
| `plataforma` | string (query) | `?` | incluye `windows` (+ otros valores válidos) | `?` | — | Un valor fuera del enum dispara 400 `validacion_fallida` (QA-00-08-03). |

### 2.5 Extensiones de gobernanza `x-` [E — con enforcement nuevo]

| Extensión | Alcance | Tipo | Obligatorio | Regla nueva |
|---|---|---|---|---|
| `x-capacidad` | cada operación | string/lista | sí | El ruleset Spectral **falla** si falta (AC-02). |
| `x-requiere-cuenta` | cada operación | boolean | sí | El ruleset falla si falta. |

---

## 3. Artefactos generados (derivados — no autoritativos)

> Principio: se regeneran desde el contrato. Editarlos a mano hace **fallar** el gate (`git diff --exit-code`, AC-05 / QA-00-08-04).

### 3.1 Tipos TypeScript [N]

| Objeto | Ruta | Origen | Consumidor | Notas |
|---|---|---|---|---|
| Tipos del contrato (incl. `Salud`) | `server/contract/generated/` | `openapi-typescript` | handlers de salud | Un cambio en `Salud` se propaga; un handler que omite un requerido no compila con `tsc --noEmit`. |

### 3.2 Cliente Dart `dart-dio` [N]

| Objeto | Ruta | Origen | Consumidor | Notas |
|---|---|---|---|---|
| Cliente + modelos Dart | `server/contract/generated/` | `openapi-generator` (`dart-dio`) | `app/` (cliente generado **único**) | `dart analyze` sin errores (se pueden excluir reglas de estilo). Deserializa respuestas reales de `GET /health/live`. |

---

## 4. Configuración de gobierno (nueva)

| Objeto | Ruta | Campos / claves | Tipo | Obligatorio | Notas |
|---|---|---|---|---|---|
| Ruleset Spectral `[N]` | `server/contract/.spectral.yaml` | ruleset base OpenAPI + reglas de proyecto | YAML | sí | Reglas: `operationId` presente y único; `x-capacidad` y `x-requiere-cuenta` por operación; errores `application/problem+json`. Excepciones documentadas con motivo. |
| Config de codegen `[N]` | junto a generadores | generador, output, opciones | JSON/YAML | sí | `dart-dio` → `server/contract/generated/`; `openapi-typescript` → `server/contract/generated/`. |
| Versiones fijadas `[N]` | lockfiles / config | versión de `openapi-generator`, `openapi-typescript`, `@stoplight/spectral`, `openapi-diff` | — | sí | tecnologia/17 §3. |
| Script `pnpm generate` `[N]` | raíz / `server/` | comando de regeneración total | script | sí | Regenera TS + Dart. |
| Gate de codegen `[N]` | CI job `contract` | `pnpm generate && git diff --exit-code` | job | sí | Consumido por HU-00-09. |

---

## 5. Índices e invariantes

No hay índices de base de datos. Se traducen a **invariantes de estructura** verificadas por lint/gate:

| Invariante | Tipo | Verificado por |
|---|---|---|
| `operationId` único en todo el documento | unicidad | Spectral (AC-01) |
| `x-capacidad` presente en **toda** operación | presencia | Spectral (AC-02) |
| `x-requiere-cuenta` presente en **toda** operación | presencia | Spectral |
| Todo error declarado como `application/problem+json` | conformidad | Spectral |
| `server/contract/generated/` idéntico a su regeneración | integridad | `git diff --exit-code` (AC-04/AC-05) |
| Contrato sin cambios incompatibles vs `main` | compatibilidad | `openapi-diff --fail-on-incompatible` (AC-03) |

---

## 6. Relaciones

```
openapi.yaml  ──(openapi-typescript)──▶  generated/ (tipos TS)  ──▶  handlers de salud   [DEC-230]
openapi.yaml  ──(openapi-generator dart-dio)──▶  generated/ (cliente Dart)  ──▶  app/   [DEC-155, tecnologia/06]
openapi.yaml  ──(Spectral)──▶  veredicto de lint (gate contract)
openapi.yaml(rama)  ◀──(openapi-diff vs main)──▶  clasificación compatible/incompatible
openapi.yaml  ──(express-openapi-validator)──▶  validación runtime → 400 problem+json  [DEC-162]
```

| Desde | Hacia | Tipo | Cardinalidad | Notas |
|---|---|---|---|---|
| `openapi.yaml` | generated TS | derivación | 1 → N | Reprocesable; no se edita el derivado. |
| `openapi.yaml` | generated Dart | derivación | 1 → N | Cliente generado **único** del `app/`. |
| `openapi.yaml` | `main` | comparación | 1 ↔ 1 | `--fail-on-incompatible`. |
| operación | `x-capacidad` / `x-requiere-cuenta` | obligación | 1 → 1 | Falla el lint si ausente. |
| operación | `ProblemJson` | referencia | N → 1 | Media type de errores. |

---

## 7. Notas de migración y rollback

- **Sin migración de datos**: no hay cambios de esquema persistido ni de modelo de dominio.
- **Compatibilidad (tecnologia/17 §5)**: un cambio incompatible exige nueva versión mayor o convivencia explícita; **no se fuerza dentro de `/v1`**. Un campo opcional nuevo es compatible y pasa.
- **Atomicidad**: contrato, codegen, validadores y versión se despliegan como una unidad. **Nunca** dejar código generado apuntando a una versión distinta del contrato.
- **Rollback**: revertir en bloque `openapi.yaml`, `generated/`, config de validación y pin de versión, **antes** de publicar cualquier consumidor (HU-00-09, HU-00-13, HU-00-18).
- **Cuarentena de derivados**: `server/contract/generated/` debe tratarse como solo-lectura; cualquier edición manual es un defecto detectado por el gate, no una corrección válida.

---

## 8. Campos a verificar en el repositorio (vacíos de información)

`[?]` El pedido no incluye la forma real del contrato. Antes de implementar, confirmar leyendo `server/contract/openapi.yaml`:

1. Propiedades y flags `required` de `Salud`.
2. Paths exactos de `saludVivo` / `saludListo` (¿`/health/*` o `/v1/health/*`?) y de `version`.
3. Valores completos del enum de `plataforma` (el pedido solo menciona `windows`).
4. Forma exacta de `ProblemJson` (si `codigo`/`requestId` ya están declarados o son nuevos).
5. Versiones actuales de los generadores en lockfiles.