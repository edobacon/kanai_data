# Modelo de datos — TAO-157 / TASK-EP-00-DEC-236

Metadata y fuentes estructuradas para las sondas de intake de `DEC-236`

Este ticket no introduce persistencia nueva. Su "modelo de datos" es el de las **fuentes deterministas** que consumirán el checker documental (`scripts/check_contrato.py`), el detector de preparación (`scripts/check_sondas_readiness.py`) y, a futuro, el adaptador de sondas de Kanai: las **extensiones `x-*` del contrato OpenAPI** (que califican cada operación), las **tablas estructuradas del documento 20** y la **matriz de preparación del documento 28**. Se modelan aquí como entidades/objetos con sus campos, enums, claves e integridad referencial.

**Leyenda de estado**

| Marca | Significado |
|---|---|
| `EXIST` | Objeto o campo ya presente en el sistema; la tarea solo lo lee o lo califica. |
| `NEW` | Objeto o campo introducido por esta tarea. |
| `NEW-COND` | Objeto introducido de forma condicional (solo cuando exista su disparador). |
| `REESTR` | Contenido existente que cambia de forma (de prosa a tabla) sin perder reglas. |

---

## 1. Alcance del modelo

- **Contrato OpenAPI** `server/contract/openapi.yaml` — operation es la entidad central; las extensiones `x-*` son campos nuevos sobre ella.
- **Documento 20** (modelo de datos de producto), sección 11 y tablas de referencias/estados — fuente estructurada del modelo, en formato de tablas legibles por el parser compartido.
- **Documento 14** — matriz perfil × capacidad, cuyo parser se agrega al módulo compartido.
- **Documento 28** `docs/product/tecnologia/28_matriz_preparacion_sondas_kanai.md` — matriz de las ocho familias de sondas.
- **Módulo compartido** `scripts/lib/markdown_tables.py` — estructuras de salida del parser (no persiste; alimenta a los checkers).

Fuera de modelo: `IdempotencyKey`, `x-capacidad` y `x-exenta-version-legal` (se leen, no se duplican); el motor de sync y el adaptador de Kanai (no se modifican).

---

## 2. Entidad: `Operation` (operación REST)

Representa cada entrada de `paths.<path>.<method>` del contrato. Es la entidad a la que se adosan las extensiones nuevas.

| Campo | Tipo | Oblig. | FK | Enum / Valores | Default | Estado |
|---|---|---|---|---|---|---|
| `operationId` | string | sí | — | único en el contrato | — | EXIST |
| `method` | enum | sí | — | `get` `post` `put` `patch` `delete` | — | EXIST |
| `path` | string | sí | — | patrón `/recurso/{id}` | — | EXIST |
| `write` (derivado) | boolean | sí | — | `true` si `method ∈ {post,put,patch,delete}` | `false` | EXIST (derivado) |
| `summary` / `description` | string | no | — | — | — | EXIST (no fuente de semántica) |
| `x-entidades-escrituras` | array\<string\> | **sí si `write`** | → `EntidadCanonica.id` | ids canónicos del documento 20; sin duplicados; `minItems: 1` | — | **NEW** |
| `x-replace-semantics` | object | no | — | ver §4 | — | **NEW** |
| `x-preconditions` | object | no | → `DocumentoReferenciable.id` | ver §5 | — | **NEW** |
| `x-preconditions-por-operacion` | object | no | → `DocumentoReferenciable.id` | ver §5 | — | **NEW** |
| `x-client-offline-policy` | object | **sí si `write`** | — | enum de §6 (incluye `sin-red`) | — | **NEW** |
| `x-capacidad-por-operacion` | object | no | → matriz 14 | clave = entidad | — | EXIST (se lee) |
| `conflicto_estado` | marca | no | — | — | — | EXIST (se inventaría) |
| `IdempotencyKey` | header param | no | — | — | — | EXIST (no duplicar) |
| `x-capacidad` / `x-exenta-version-legal` | marca | no | — | — | — | EXIST (no duplicar) |

**Reglas de integridad (válidas por `check_contrato.py`)**

- Operación de lectura NO debe declarar `x-entidades-escrituras` ni `x-client-offline-policy`.
- Operación de escritura DEBE declarar `x-entidades-escrituras` no vacía, sin duplicados y solo con ids canónicos.
- Operación de escritura DEBE declarar `x-client-offline-policy` con exactamente una política válida (cobertura exigida `72/72`).

---

## 3. Entidad: `EntidadCanonica` (vocabulario del documento 20)

Vocabulario cerrado de identificadores contra el que se valida `x-entidades-escrituras`. Ya existe como concepto en el documento 20; la tarea lo vuelve **citable y verificable** por máquina.

| Campo | Tipo | Oblig. | Enum / Valores | Estado |
|---|---|---|---|---|
| `id` | string (clave) | sí | identificador canónico del documento 20 | EXIST |
| `nombre` | string | sí | — | EXIST |
| `documentoOrigen` | string | sí | `docs/product/.../20_*.md` | EXIST |
| `seccion` | string | no | p.ej. `11` | EXIST |

**Uso:** `x-entidades-escrituras` referencia `id`; cualquier valor fuera de este conjunto es un error de metadata (QA-03).

---

## 4. Objeto: `x-replace-semantics` (operaciones de reemplazo)

Anota las operaciones que reemplazan el conjunto completo de un recurso asociado.

| Campo | Tipo | Oblig. | Enum / Valores | Estado |
|---|---|---|---|---|
| `entidades` | array\<string\> | sí | → `EntidadCanonica.id` | NEW |
| `modo` | enum | sí | `full-replace` · (`incremental` · `upsert` según fuente) | NEW |
| `respaldo` | string | sí | documento/artefacto existente | NEW |

**Alcance:** las dos operaciones conocidas, `asignarCapacidadesPerfil` y `asignarPerfilesCuenta`. Cualquier valor o campo desconocido es rechazado (QA-02).

> Nota de modelado: la lista exacta de valores de `modo` debe espejar la fuente canónica (`DEC-236` / `kanai-app/server/probes/spec.ts`), no inferirse. No se deriva de `summary`, `description` ni de nombres plurales.

---

## 5. Objetos: `x-preconditions` y `x-preconditions-por-operacion`

Precondiciones contractuales de una operación, con respaldo trazable a documentos existentes.

### 5.1 `x-preconditions`

| Campo | Tipo | Oblig. | FK | Enum / Valores | Estado |
|---|---|---|---|---|---|
| `sujeto` | string | sí | → `EntidadCanonica.id` (o campo de estado) | — | NEW |
| `condicion` | enum | sí | — | p.ej. `estado-en`, `existe`, `no-existe` | NEW |
| `valores` | array\<string\> | **sí si `condicion = estado-en`** | → `Documento20Estado.Valores` | — | NEW |
| `error` | string | sí | — | — | NEW |
| `respaldo` | string | sí | → `DocumentoReferenciable.id` | documento existente | NEW |

### 5.2 `x-preconditions-por-operacion`

Variantes de una misma operación (caso `/sync`), seleccionadas por selector explícito.

| Campo | Tipo | Oblig. | Enum / Valores | Estado |
|---|---|---|---|---|
| `operacion` / `accion` | string | sí | p.ej. `descartarConsulta`, `corregirUltimaTirada` | NEW |
| `cuando` | enum / selector | **sí** | selector permitido (p.ej. `entidad`) | NEW |
| `operador` | enum | sí | operadores permitidos (p.ej. `en`, `=`); rechaza no permitidos | NEW |
| `valores` | array\<string\> | **sí si `operador = estado-en`** | → `Documento20Estado.Valores` | NEW |
| `respaldo` | string | sí | → `DocumentoReferenciable.id` | NEW |

**Reglas:** toda variante sin `cuando` o con operador fuera de la lista permitida es error (QA-05); una condición `estado-en` sin `valores` es error (QA-06); un `respaldo` a documento inexistente es error.

**Línea base mínima:** `aceptarInvitacion`, `reenviarInvitacion` (en `x-preconditions`); descarte de consulta y corrección de la última tirada (en `x-preconditions-por-operacion` con `cuando`).

---

## 6. Objeto: `x-client-offline-policy`

Política de conducta del cliente sin red, obligatoria en toda operación de escritura (sin excepción por pública o administrativa).

| Campo | Tipo | Oblig. | Enum / Valores | Estado |
|---|---|---|---|---|
| `politica` | enum | sí | `sin-red` · (valores adicionales de la enumeración canónica) | NEW |

**Reglas:** exactamente un valor por operación; cobertura exigida `72/72`; eliminar una política rompe el checker (QA-01/QA-11).

---

## 7. Entidad: `DocumentoReferenciable` (respaldos)

Índice lógico de artefactos citables como `respaldo` (precondiciones y reemplazos). No se materializa como tabla propia; se resuelve contra los documentos existentes del proyecto.

| Campo | Tipo | Oblig. | Enum / Valores | Estado |
|---|---|---|---|---|
| `id` | string | sí | ruta o clave canónica del documento | NEW |
| `tipo` | enum | sí | `documento-producto` · `contrato` · `historia` · `decision` | NEW |
| `existe` | boolean (derivado) | sí | verificado por el checker | NEW |

---

## 8. Documento 20 — tablas estructuradas (`REESTR`)

La sección 11 pasa de prosa a tabla sin perder ninguna regla.

### 8.1 `Documento20Unicidad`

| Campo | Tipo | Oblig. | FK | Enum / Valores | Estado |
|---|---|---|---|---|---|
| `Restriccion` | string (clave) | sí | — | sin identificadores duplicados | REESTR |
| `Entidad` | string | sí | → `EntidadCanonica.id` | — | REESTR |
| `Motivo` | string | sí | — | — | REESTR |

**Regla:** toda restricción actual queda representada; duplicado de `Restriccion` es error (QA-07).

### 8.2 `Documento20Referencia` (relaciones padre/FK — sonda `parent-lifecycle`)

| Campo | Tipo | Oblig. | FK | Enum / Valores | Estado |
|---|---|---|---|---|---|
| `Entidad` | string | sí | → `EntidadCanonica.id` | — | NEW |
| `Campo` | string | sí | — | — | NEW |
| `Referencia` | string | sí | → `EntidadCanonica.id` | — | NEW |
| `Cardinalidad` | enum | sí | — | `1:1` · `1:N` · `N:1` · `N:M` | NEW |

### 8.3 `Documento20Estado` (enums y campos de estado — sonda `reference-coherence`)

| Campo | Tipo | Oblig. | FK | Enum / Valores | Estado |
|---|---|---|---|---|---|
| `Entidad` | string | sí | → `EntidadCanonica.id` | — | NEW |
| `CampoEstado` | string | sí | — | — | NEW |
| `Valores` | array\<string\> | sí | — | conjunto cerrado del enum | NEW |

**Regla condicional:** cuando exista Prisma, el checker contrasta estas tablas con el schema implementado; antes de eso, la fuente es solo el documento (no se valida contra código inexistente).

---

## 9. Documento 28 — `MatrizPreparacionSonda` (`NEW`)

Una fila por familia de sonda de Kanai.

| Campo | Tipo | Oblig. | Enum / Valores | Estado |
|---|---|---|---|---|
| `familia` | enum (clave) | sí | `write-paths` · `parent-lifecycle` · `profile-ops` · `uniques` · `full-replace` · `cross-consumers` · `input-shape` · `reference-coherence` | NEW |
| `descripcion` | string | sí | — | NEW |
| `fuente` | string | sí | ruta/fuente parseable o dependencia | NEW |
| `tipoFuente` | enum | sí | `parseable` · `dependencia` · `bloqueo` | NEW |
| `estado` | enum | sí | `disponible` · `pendiente-codigo` · `bloqueada-adaptador` | NEW |
| `responsable` | string | no | equipo/sistema | NEW |

**Reglas:** las ocho familias sin huecos ni sobrantes respecto de los `PROBE_KINDS` de Kanai (QA-10); cada fila cita fuente parseable o dependencia explícita; ninguna fila puede declararse **activa** mientras no supere adaptador, backtest y `probe_health`.

---

## 10. Detector: `ReadinessEstado` (`NEW`)

Salida del detector liviano `check_sondas_readiness.py` (estructura lógica, no persistida).

| Campo independiente | Condición | Efecto en `--require-ready` | Estado |
|---|---|---|---|
| `contratoOpenApi` | metadata REST presente | bloquea | NEW |
| `coberturaRest` | `72/72` escrituras | bloquea | NEW |
| `coherenciaSync` | claves `/sync` = `oneOf` discriminado | bloquea | NEW |
| `fuenteModelo` | documento 20 estructurado | bloquea | NEW |
| `implementacionInspeccionable` | código real inspeccionable | bloquea | NEW |
| `adaptadorKanai` | adaptador cargable | bloquea | NEW |

| Campo | Tipo | Enum / Valores | Estado |
|---|---|---|---|
| `gate` | enum | `ready-for-probes` · `blocked` | NEW |
| `causas` | array\<objeto\> | cada bloqueo con su causa independiente | NEW |

**Reglas:** sin `--require-ready` termina con código 0 informando `blocked`; con `--require-ready` cualquier causa pendiente vuelve no cero; no crea `probes.yaml`, no declara cobertura ni sustituye backtests/`probe_health` (QA-12).

> Con la adenda 1, `adaptadorKanai` deja de ser "ausente": la integración queda `bloqueada` por `contratoOpenApi` (`x-entidades-escrituras` en `0/71`), no por falta de adaptador (QA-11).

---

## 11. Módulo: `scripts/lib/markdown_tables.py` (`NEW`)

Estructuras de salida del parser compartido (extraído de `check_backlog.py`, ampliado con la matriz del documento 14).

| Objeto | Campos | Estado |
|---|---|---|
| `Frontmatter` | `campos: dict<string, string>` | NEW (extraído) |
| `MarkdownTable` | `headers: array<string>`, `rows: array<array<string>>` | NEW (extraído) |
| `KeyValueTable` | `pares: array<{clave, valor}>` | NEW (extraído) |
| `MatrizPerfilCapacidad` | `perfiles: array<string>`, `capacidades: array<string>`, `celdas: array<array<valor>>` | NEW (doc 14) |

**Contrato de compatibilidad:** `check_backlog.py` importa el módulo sin cambiar su salida; `check_citas.py` conserva 0 errores y la misma cobertura (QA-09).

---

## 12. Registro de escrituras no REST (`NEW-COND`)

| Campo | Tipo | Oblig. | Estado |
|---|---|---|---|
| `artefacto` | string | sí | NEW-COND |
| `tipo` | enum | sí | NEW-COND |
| `entidades` | array\<string\> | sí | NEW-COND |
| `respaldo` | string | sí | NEW-COND |

**Condición de creación:** se materializa solo cuando exista el primer seed, job, worker o script de corrección verificable. Antes de eso, el checker no exige su presencia.

---

## 13. Relaciones (integridad referencial lógica)

```
EntidadCanonica.id
  ├──< Operation.x-entidades-escrituras
  ├──< x-replace-semantics.entidades
  ├──< Documento20Unicidad.Entidad
  ├──< Documento20Referencia.Entidad / .Referencia
  └──< Documento20Estado.Entidad

DocumentoReferenciable.id
  ├──< x-preconditions.respaldo
  ├──< x-preconditions-por-operacion.respaldo
  └──< x-replace-semantics.respaldo

Documento20Estado.Valores
  ├──< x-preconditions.valores (condicion = estado-en)
  └──< x-preconditions-por-operacion.valores (operador = estado-en)

Operation (write)  ──1:1──  x-client-offline-policy
Operation (/sync)  ──1:N──  oneOf discriminado por entidad
                              ≡ claves de x-capacidad-por-operacion
```

Relaciones adversas / prohibidas: no duplicar `IdempotencyKey`, `x-capacidad` ni `x-exenta-version-legal`; no reutilizar `summary`/`description` como fuente de semántica.

---

## 14. Índices y claves de unicidad

| Clave | Ámbito | Regla |
|---|---|---|
| `operationId` | global (contrato) | único (EXIST) |
| `EntidadCanonica.id` | vocabulario | clave de validación de `x-entidades-escrituras` |
| `Documento20Unicidad.Restriccion` | documento 20 | sin duplicados |
| `MatrizPreparacionSonda.familia` | documento 28 | cubre exactamente los 8 `PROBE_KINDS` |
| claves de `/sync` | `x-capacidad-por-operacion` | deben igualar la unión del `oneOf` discriminado (sin duplicar la lista) |

---

## 15. Notas de migración y compatibilidad

- **Contrato:** extensiones `x-*` **aditivas**; sin cambio de comportamiento de producto, autorización, sync ni persistencia. Versión patch `2.4.0 → 2.4.1`.
- **Documento 20:** la sección 11 cambia de forma (prosa → tabla) preservando **todas** las reglas; no hay migración de datos, sí un cambio de formato de fuente que debe validarse con el parser compartido.
- **Parser:** extracción refactorizada; requisito de no-regresión sobre `check_backlog.py` y `check_citas.py`.
- **Rollback:** revertir en conjunto extensiones, checker y versión patch **antes** de que exista un consumidor publicado; no dejar metadata parcialmente validada.
- **Dependencia externa:** el adaptador de Kanai ya existe e integrado (adenda 1); no se implementa ni modifica aquí. La integración sigue `bloqueada` por metadata REST faltante.
- **Convergencia:** `probes.yaml`, backtest y `probe_health` son de una tarea externa posterior; no se simulan dentro de Tao Mangalam.

---

## 16. Trazabilidad modelo ↔ REQ/criterios

| Objeto de este modelo | REQ | Casos |
|---|---|---|
| `markdown_tables` / parser | REQ-01 | QA-09 |
| Tablas documento 20 (§8) | REQ-02 | QA-07 |
| `x-entidades-escrituras` y `/sync` (§2, §13) | REQ-03 | QA-03, QA-04 |
| `x-replace-semantics` / precondiciones (§4, §5) | REQ-04 | QA-02, QA-05, QA-06 |
| `x-client-offline-policy` (§6) | REQ-05 | QA-01, QA-11 |
| Preámbulo + versión patch (§15) | REQ-06 | — |
| `MatrizPreparacionSonda` (§9) | REQ-07 | QA-10 |
| `check_contrato.py` (§2–§8) | REQ-08 | QA-02–QA-08 |
| `ReadinessEstado` (§10) y pruebas (§11) | REQ-09 | QA-12 |