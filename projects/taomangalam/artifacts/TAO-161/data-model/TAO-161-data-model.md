# Modelo de datos — TAO-161 (HU-00-17)

## Resumen
Se crean **dos tablas nuevas** en la base `taomangalam` (schema Prisma del `server/`): un **catálogo de claves** (`configuracion_clave`) y un **historial inmutable de versiones** (`configuracion_version`). No se modifica ninguna entidad existente. El rol de aplicación (`taomangalam_app`) conserva `SELECT`/`INSERT` sobre `configuracion_version` y pierde `UPDATE`/`DELETE` (REQ-01). Toda escritura ocurre por el script CLI, nunca por API.

---

## Entidades

### 1. `configuracion_clave` — **NUEVA**

Catálogo maestro de claves de configuración. Define el tipo y las restricciones con las que se valida cada valor (REQ-01, REQ-03).

| Campo | Tipo | Obligatorio | Default | Notas |
|---|---|---|---|---|
| `id` | `String @id` (uuid/cuid) | sí | autogenerado | PK técnica |
| `clave` | `String` | sí | — | Identificador lógico de la clave (p. ej. `feature.flag`, `precio.base`). **Unique**. Es el valor que el script recibe como parámetro y con el que nombra el error en clave inexistente (REQ-03). |
| `tipo` | `TipoConfiguracion` (enum) | sí | — | Tipo con el que se valida el valor. Ver enum abajo. |
| `alcance` | `AlcanceConfiguracion` (enum) | sí | — | Nivel al que aplica la clave (global / región / plataforma). Ver enum. |
| `sensibilidad` | `SensibilidadConfiguracion` (enum) | sí | `PUBLICA` | Determina si la salida/logs se redactan (REQ-05). |
| `descripcion` | `String?` | no | — | Texto libre de ayuda operativa. |
| `created_at` | `DateTime` | sí | `now()` | Auditoría técnica de alta del catálogo. |
| `updated_at` | `DateTime` | sí | `@updatedAt` | Auditoría técnica del catálogo. |

**Enums propuestos** (a confirmar contra tecnologia/20 §9):
- `TipoConfiguracion`: `STRING` · `INTEGER` · `DECIMAL` · `BOOLEAN` · `JSON` · `DATE`
- `AlcanceConfiguracion`: `GLOBAL` · `REGION` · `PLATAFORMA`
- `SensibilidadConfiguracion`: `PUBLICA` · `INTERNA` · `SENSIBLE`

**Índices / constraints**
- `UNIQUE (clave)` — evita claves duplicadas.
- `INDEX (alcance)` — filtrado por consumidores que leen configuración por región/plataforma.

---

### 2. `configuracion_version` — **NUEVA**

Historial append-only: cada ejecución del script inserta una fila nueva y jamás actualiza ni borra las previas (REQ-01, REQ-02).

| Campo | Tipo | Obligatorio | Default | Notas |
|---|---|---|---|---|
| `id` | `String @id` (uuid/cuid) | sí | autogenerado | PK técnica. |
| `clave_id` | `String` | sí | — | **FK** → `configuracion_clave.id`. `ON DELETE RESTRICT` (no se puede borrar una clave con versiones). |
| `valor` | `Json` (jsonb) | sí | — | Valor ya validado contra `configuracion_clave.tipo`. Se guarda como JSON para soportar escalares y objetos. La validación de tipo es **a nivel aplicación** (script), no hay CHECK de tipo en SQL. |
| `region` | `String?` | no | `null` | Dimensión opcional de alcance. |
| `plataforma` | `String?` | no | `null` | Dimensión opcional de alcance. Región **o** plataforma según `configuracion_clave.alcance`; ambos nullable. |
| `vigencia_desde` | `DateTime` | sí | `now()` | Inicio de vigencia de la versión (parámetro "vigencia" del script). |
| `vigencia_hasta` | `DateTime?` | no | `null` | Fin de vigencia; `null` = vigente indefinidamente. **Ver decisión abierta D1.** |
| `autor` | `String` | sí | — | Obligatorio (REQ-02/REQ-03). Identifica a quien ejecuta. |
| `motivo` | `String` | sí | — | Obligatorio (`--motivo`, REQ-02/REQ-03). |
| `caso` | `String?` | no | `null` | Opcional (`--caso`, REQ-02). Sin `--caso` se inserta `null`/vacío. |
| `created_at` | `DateTime` | sí | `now()` | Fecha de la versión (REQ-02). Es el "fecha" del criterio de aceptación. |

**Índices / constraints**
- `INDEX (clave_id, created_at DESC)` — recuperar la última versión por clave (consumo principal).
- `INDEX (clave_id, region, plataforma, vigencia_desde DESC)` — resolver la versión vigente por dimensión de alcance.
- `FK clave_id → configuracion_clave(id) ON DELETE RESTRICT ON UPDATE CASCADE`.

**Relaciones**
- `configuracion_clave 1 ── * configuracion_version` (`clave_id`).
- Sin otras FK salientes: `caso` y `autor` se guardan como texto (no hay entidades `caso`/`usuario` referenciadas en el alcance del ticket).

---

## Inmutabilidad y permisos (REQ-01)

Migración SQL de grants (fuera del schema Prisma; en la migración de Prisma como sentencia cruda):

```sql
-- El rol de aplicación sólo puede leer e insertar versiones
GRANT SELECT, INSERT ON "configuracion_version" TO taomangalam_app;
REVOKE UPDATE, DELETE ON "configuracion_version" FROM taomangalam_app;
```

- El catálogo `configuracion_clave` conserva `SELECT` para la app; su carga/edición es operativa.
- El criterio de aceptación "recibe `permission denied`" se verifica ejecutando `UPDATE`/`DELETE` como `taomangalam_app` (QA-00-17-04).

---

## Notas de migración

1. **Ambas tablas son nuevas**: no hay `ALTER` sobre tablas existentes; `migrate deploy` no toca datos previos.
2. **Orden de creación**: primero `configuracion_clave` (referenciada) y luego `configuracion_version`.
3. **Grants**: el `REVOKE UPDATE, DELETE` debe ir en la misma migración que crea la tabla (o inmediatamente después) para que el rol no quede con permisos amplios por default. Verificar que el rol no herede `UPDATE`/`DELETE` por membresía de otro grupo.
4. **Rollback (declarado en el ticket)**: revertir la migración dropea ambas tablas y el script; el historial de versiones ya insertado **se conserva** según el handoff — esto implica que el rollback de la migración debe evaluarse como *no destructivo del dato*; si se dropea la tabla, el historial se pierde. **Ver decisión abierta D2.**
5. **Tipado de `valor`**: `Json` (jsonb) evita columnas por tipo; la obligación de "valor validado" es responsabilidad del script, no del motor.
6. **Catálogo semilla**: el alcance no lo pide, pero las épicas consumidoras necesitan claves concretas; la carga inicial del catálogo queda **fuera de EP-00** (marcado en "No incluye").

---

## Decisiones abiertas (no resueltas por el pedido)

- **D1 — Forma de `vigencia`**: el ticket la nombra en singular. Modelo `vigencia_desde` (obligatoria, con `vigencia_hasta` opcional). Alternativa: un único `vigencia DateTime` sin rango. Elegir según tecnologia/20 §9.
- **D2 — Rollback vs. historial**: el ticket dice que el rollback conserva el historial insertado, pero revertir la migración que crea la tabla lo elimina. Confirmar si el rollback es solo del *script* (dejando tablas) o si prevé export previo del historial.
- **D3 — Enums exactos y nombres de campos**: deben cotejarse 1:1 con `tecnologia/20 §9` (no incluido en el request); los valores de arriba son una propuesta.
- **D4 — Unicidad de versión vigente**: ¿puede haber dos versiones vigentes simultáneas para la misma `(clave, region, plataforma)`? Si no, falta un constraint de exclusión (requiere `EXCLUDE` con rango temporal en Postgres, no expresable en Prisma puro).