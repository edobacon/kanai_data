# Modelo de datos — TAO-189 · Preparación de consentimiento para V-51

Preparación de la parte de HU-15-03 y HU-15-04 (política regional, persistencia de la decisión y bloqueo de emisión, headless, sin V-51). Este documento modela solo lo que el ticket toca.

## 0. Fuentes del modelo

- `docs/product/decisiones/DEC-130-...analitica.md` — políticas `opt_in`/`opt_out`/`disabled`, región por país del dispositivo, región/config ausente → `opt_in`; tabla versionada con vigencia y responsable.
- `docs/product/decisiones/DEC-232-...m1a.md` — `requerimiento` de tres valores en el contrato; schema de error; sujeto seudónimo.
- `docs/product/tecnologia/20_modelo_de_datos_v2_incremental.md` — tablas `politica_analitica_region` (L615) y `consentimiento_analitica` (L616, relación en L801–802), mapeo de V-51 (L867), colas locales §10.
- `docs/backlog/EP-15_metricas_observabilidad_y_auditoria.md` — HU-15-03 (L372–500), HU-15-04 (L501–597), API (L386–420).
- `server/contract/openapi.yaml` y `server/contract/generated/dart/...` — contrato 2.1.0 ya emitido: `PoliticaAnalitica`, `ConsentimientoAnalitica`, `ConsentimientoRequest`, `EstadoConsentimiento`; endpoints `GET /privacidad/politica-analitica`, `GET|POST /privacidad/consentimientos`.
- `server/prisma/schema.prisma` y migraciones — convenciones vigentes (TEXT/cuid, `@db.Timestamptz(3)`, `@@map` snake_case, enums minúscula, índices parciales y GRANTs en SQL crudo).
- `app/lib/data/drift/esquema_v2.dart` — patrón de cola local `registro_legal_pendiente` a espejar.

## 1. Resumen de cambios

| Objeto | Capa | Estado | Motivo |
|---|---|---|---|
| `politica_analitica_region` (+ enum `RequerimientoAnalitica`) | Backend (Prisma/Postgres) | **NUEVO** | Proveedor real de política regional (REQ-01, REQ-05) |
| `consentimiento_analitica` (+ enums `DecisionConsentimiento`, `FuenteConsentimiento`) | Backend (Prisma/Postgres) | **NUEVO** | Registro/actualización persistente de la decisión (REQ-02, REQ-03) |
| `consentimiento_analitica_pendiente` | App (Drift local) | **NUEVO** | Decisión tomada sin conexión, para HU-15-04 (REQ-02) |
| `PoliticaAnalitica`, `ConsentimientoAnalitica`, `ConsentimientoRequest`, `EstadoConsentimiento` | Contrato (OpenAPI/Dart) | **EXISTENTE** | Ya emitidos en 2.1.0; TAO-189 solo los implementa (REQ-05: no introducir contrato paralelo) |
| `cuenta`, `dispositivo` | Backend | **EXISTENTE** | Destinos de FK; no se modifican (REQ-06: se resuelven por su proveedor) |
| `capacidad` (`metrica.consentir`) | Backend/seed | **EXISTENTE** | Capacidad ya catalogada; el ticket no la crea |
| `configuracion_clave`, `configuracion_version` | Backend | **EXISTENTE** | No se usan para esta política (ver §9, alternativa descartada) |
| `documento_legal`, `aceptacion_documento_legal` | Backend | **EXISTENTE** | Frontera declarada: el consentimiento NO es la aceptación legal (DEC-208) |
| `evento_metrica`, `sesion_uso`, `evento_metrica_pendiente`, `sesion_metrica_local` | Backend/App | **EXISTENTE (otra HU)** | Destino del bloqueo (REQ-03), pero pertenecen a HU-15-05/06; fuera de alcance (§10) |

## 2. Entidad NUEVA — `politica_analitica_region` (backend)

Política de analítica versionada por región. Escritura solo por el pipeline/seed (secreto de operación, patrón de `documento_legal`); la aplicación solo lee.

| Campo | Tipo | Obligatorio | FK / Enum / Default | Notas |
|---|---|---|---|---|
| `id` | `TEXT` (cuid) | Sí (PK) | default cuid | Convención Prisma del repo |
| `region` | `TEXT` | Sí | — | Código de región o conjunto (p. ej. `UE_EEE`, `CL`); no es FK |
| `version` | `TEXT` | Sí | — | Versión de la política; viaja al consentimiento |
| `requerimiento` | `RequerimientoAnalitica` | Sí | enum | `opt_in` \| `opt_out` \| `disabled` |
| `texto` | `TEXT` | No | — | Snapshot del texto informativo, si aplica (doc 20 L615 “texto/ref”) |
| `texto_ref` | `TEXT` | No | — | Referencia/URL del texto (contrato `PoliticaAnalitica.textoRef`) |
| `vigente_desde` | `TIMESTAMPTZ(3)` | Sí | default `now()` | Vigencia preparable a futuro (DEC-130) |
| `vigente_hasta` | `TIMESTAMPTZ(3)` | No | — | Nulo = vigente |
| `responsable` | `TEXT` | Sí | — | Autor del cambio (DEC-130) |
| `motivo` | `TEXT` | No | — | Trazabilidad del cambio |
| `created_at` | `TIMESTAMPTZ(3)` | Sí | default `now()` | |
| `updated_at` | `TIMESTAMPTZ(3)` | Sí | `@updatedAt` | |

### Enum NUEVO `RequerimientoAnalitica`
```
opt_in | opt_out | disabled
```
Valores en minúscula y snake_case, como los demás enums de Prisma del proyecto.

### Índices y restricciones (SQL crudo donde Prisma no llega)
- `UNIQUE (region, version)`.
- `CHECK (vigente_hasta IS NULL OR vigente_hasta > vigente_desde)`.
- `INDEX (region, vigente_desde DESC)` — resolución de “la política vigente de la región”.

### Semilla (seed)
- `UE_EEE` = `opt_in` (DEC-130, DEC-232.7).
- Región de ejemplo configurable (p. ej. `CL`) = `opt_out` (EP-15, QA-15-03).
- `disabled` se cubre por configuración operativa; no hay fila obligatoria.

## 3. Entidad NUEVA — `consentimiento_analitica` (backend)

Historial **append-only** de la decisión de analítica (DEC-130, DEC-208 lo excluye de la aceptación legal). Cada decisión es una fila; “vigente” es la última fila del sujeto.

| Campo | Tipo | Obligatorio | FK / Enum / Default | Notas |
|---|---|---|---|---|
| `id` | `TEXT` | Sí (PK) | sin default | ULID de 26 caracteres generado en el cliente (contrato), para idempotencia del envío diferido |
| `cuenta_id` | `TEXT` | No* | FK → `cuenta(id)` `ON DELETE RESTRICT` | *Al menos uno de `cuenta_id`/`dispositivo_id` (ver CHECK) |
| `dispositivo_id` | `TEXT` | No* | FK → `dispositivo(id)` `ON DELETE RESTRICT` | *Idem |
| `region` | `TEXT` | Sí | — | Región de la política usada al decidir |
| `politica_version` | `TEXT` | Sí | — | Versión de política vigente al decidir |
| `decision` | `DecisionConsentimiento` | Sí | enum | `otorgado` \| `rechazado` \| `retirado` |
| `fuente` | `FuenteConsentimiento` | Sí | enum | `primer_uso` \| `revision` \| `diferido` |
| `decidido_at` | `TIMESTAMPTZ(3)` | Sí | sin default | Fecha original; puede ser pasada si fue diferida (DEC-219) |
| `registrado_at` | `TIMESTAMPTZ(3)` | Sí | default `now()` | Recepción en servidor |

### Enums NUEVOS
```
DecisionConsentimiento: otorgado | rechazado | retirado
FuenteConsentimiento:   primer_uso | revision | diferido
```

### Índices y restricciones
- `CHECK (cuenta_id IS NOT NULL OR dispositivo_id IS NOT NULL)`.
- `INDEX (cuenta_id, decidido_at DESC, id DESC)` — lectura del consentimiento **vigente** (soporta el bloqueo de emisión, REQ-03).
- `INDEX (dispositivo_id)`.
- Sin `updated_at`: la fila es inmutable.

### Regla de escritura
- Append-only: el rol de aplicación recibe `SELECT, INSERT`; **sin** `UPDATE` ni `DELETE` (mismo patrón que `aceptacion_documento_legal`, DEC-208).
- La “sobrescritura” de REQ-02 se modela como **nueva fila** + lectura por `decidido_at DESC`: el valor vigente cambia, la historia se conserva (ver §9).

## 4. Entidad NUEVA (app, Drift) — `consentimiento_analitica_pendiente`

Cola local de la decisión tomada sin conexión, espejo de `registro_legal_pendiente` (`app/lib/data/drift/esquema_v2.dart`). No guarda datos personales; se vacía al confirmar el envío.

| Campo | Tipo (SQLite/Drift) | Obligatorio | Default / CHECK | Notas |
|---|---|---|---|---|
| `id` | `TEXT` | Sí (PK) | — | ULID local |
| `region` | `TEXT` | Sí | — | Región al decidir |
| `politica_version` | `TEXT` | Sí | — | Versión de política al decidir |
| `decision` | `TEXT` | Sí | `CHECK decision IN ('otorgado','rechazado','retirado')` | |
| `fuente` | `TEXT` | Sí | `CHECK fuente IN ('primer_uso','revision','diferido')` | |
| `decidido_at` | `TEXT` | Sí | ISO-8601 UTC | Fecha original |
| `dispositivo_id` | `TEXT` | Sí | — | |
| `clave_idempotencia` | `TEXT` | Sí | `UNIQUE` | Evita reintento ambiguo (patrón legal) |
| `created_at` | `TEXT` | Sí | ISO-8601 UTC | Orden de la cola |

- `UNIQUE INDEX (clave_idempotencia)`; `INDEX (created_at)` para el orden de vaciado.
- Esquema Drift **nuevo** (el siguiente a `esquema_v3`): `esquema_v4.dart` + actualización de `migration_test.dart`.

## 5. Contrato EXISTENTE (mapeo 1:1, sin cambios)

No se crea contrato paralelo (REQ-05). Correspondencia ya emitida en 2.1.0:

| Schema OpenAPI | Campos | Dónde persiste / se resuelve |
|---|---|---|
| `PoliticaAnalitica` | `region`, `version`, `requerimiento`, `requiereConsentimiento` (obsoleto), `textoRef?`, `vigenteDesde?` | `politica_analitica_region` |
| `ConsentimientoRequest` | `region`, `politicaVersion`, `decision`, `fuente`, `decididoAt`, `dispositivoId?` | cuerpo del `POST` (entrada) |
| `ConsentimientoAnalitica` | lo anterior + `id`, `cuentaId?`, `registradoAt?` | `consentimiento_analitica` |
| `EstadoConsentimiento` | `vigente?`, `politica`, `historial[]` | lectura derivada de `consentimiento_analitica` + `politica_analitica_region` |

- `requiereConsentimiento` es campo de contrato obsoleto (compatibilidad), **no** una columna; se deriva como `requerimiento = opt_in`.
- Endpoints ya en `openapi.yaml`: `obtenerPoliticaAnalitica` (`?region=`), `registrarConsentimientoAnalitica` (`Idempotency-Key`), `obtenerEstadoConsentimiento`. Solo falta su implementación.

## 6. Relaciones

- `politica_analitica_region` — sin FK (catálogo de configuración).
- `consentimiento_analitica` N:1 `cuenta` (`cuenta_id`, `ON DELETE RESTRICT`).
- `consentimiento_analitica` N:1 `dispositivo` (`dispositivo_id`, `ON DELETE RESTRICT`).
- `consentimiento_analitica` — sin FK a `politica_analitica_region`: se guarda `region` + `politica_version` como **snapshot** (la política puede vencer o cambiar; la decisión debe quedar trazable como se tomó).
- Nada de FK dura hacia `evento_metrica`/`sesion_uso` (frontera del ticket).

## 7. Consumidores del dato y bloqueo de emisión (REQ-03)

El bloqueo es comportamiento, pero depende de lecturas concretas:

- **Ingesta de métricas** (`/metricas/eventos`, HU-15-06, fuera de alcance): antes de aceptar un lote debe leer la política de la región y la decisión vigente; con `disabled`, o con decisión `rechazado`/`retirado`, **descarta** el lote. Apoya la lectura en `INDEX (cuenta_id, decidido_at DESC)`.
- **Proveedor headless (app)**: expone `puedeEmitir(region, decision)` sin UI; la cola local (`evento_metrica_pendiente`, HU-15-05/06) lo consulta antes de enviar.
- **Regla de combinación**: se permite emitir solo con política `opt_in`/`opt_out` **y** decisión `otorgado`; `disabled` o `rechazado`/`retirado` bloquean.

## 8. Notas de migración

1. **Backend**: nueva migración Prisma (carpeta siguiente a `20261006010005_idempotencia`), p. ej. `.../migration.sql`:
   - `CREATE TYPE "RequerimientoAnalitica"`, `"DecisionConsentimiento"`, `"FuenteConsentimiento"`.
   - `CREATE TABLE "politica_analitica_region"`, `"consentimiento_analitica"`.
   - FKs, `UNIQUE (region, version)`, `CHECK` de vigencia y de sujeto, índices descritos.
   - GRANTs: `SELECT, INSERT` a `taomangalam_app` en `consentimiento_analitica` (sin UPDATE/DELETE); `SELECT` a `taomangalam_readonly`; `politica_analitica_region` escrita por el pipeline/seed, `SELECT` a app/readonly.
   - Seed de `UE_EEE=opt_in` y región `opt_out` en la misma migración o en el seed de operación.
2. **App**: `esquema_v4.dart` (Drift) con `consentimiento_analitica_pendiente` + actualización de `app/test/drift/migration_test.dart`. Orden de vaciado de colas: legal → consentimiento → métricas (DEC-225/DEC-219).
3. **Sin backfill**: tablas nuevas; no hay datos previos que migrar. La política no se copia desde `configuracion_version`.
4. **Rollback** (coherente con el ticket): revertir commits del código; como las tablas son aditivas, no se hace drop destructivo si ya hubiera filas de consentimiento — se conserva `consentimiento_analitica` y se bloquea la emisión hasta recuperar un contrato válido. El seed de política puede quedar inerte.

## 9. Conflictos y decisiones abiertas (a resolver antes de codear)

1. **Default de región desconocida: `disabled` (REQ-01) vs `opt_in` (canon DEC-130/DEC-232 y contrato).**
   El ticket pide “fail-closed a disabled”, pero REQ-05 manda preservar DEC-130, donde desconocido/ausente = `opt_in` (y el contrato genera `PoliticaAnalitica` con ese fallback). **Recomendación**: mantener `opt_in` como default canónico en el proveedor (no como default de columna) y resolver el conflicto con producto; cambiarlo a `disabled` exige enmendar DEC-130 y regenerar contrato. Impacto: solo el comportamiento del proveedor ante “sin fila”, no el schema.

2. **“Sobrescritura” (REQ-02) vs append-only.** El modelo es inmutable: actualizar = insertar nueva fila; “vigente” = última por `(decidido_at, id)`. Confirmar que REQ-02 se satisface con esa semántica (recomendado), en lugar de un `UPDATE` destructivo que rompería la trazabilidad de DEC-130.

3. **Cola local: tabla nueva vs reusar `registro_legal_pendiente`.** EP-03a (L1470) dice que HU-15-04 “comparte la tabla y el orden”. Reusar la tabla legal obligaría a ampliar su `CHECK (tipo IN ('terminos','privacidad'))` a un tipo de decisión no documental. **Recomendación**: tabla dedicada `consentimiento_analitica_pendiente` (fronteras y semántica distintas).

4. **`politica_analitica_region` dedicada vs `configuracion_clave`/`configuracion_version` (REGION).**
   El repo ya tiene una tabla versionada por región (`configuracion_version.region`, `alcance REGION`). Alternativa: una clave `politica_analitica` con valores versionados. **Recomendación**: tabla dedicada, como nombran explícitamente doc 20 (L615) y EP-15 (L384), para no acoplar la política a la resolución genérica de configuración ni cambiar `configuracion_*`. Alternativa descartada por menor legibilidad y por el texto/ref específico.

## 10. Fuera de alcance (NO crear en TAO-189)

- `sesion_uso`, `evento_metrica` (backend) y `sesion_metrica_local`, `evento_metrica_pendiente` (Drift) — HU-15-05/06; aquí solo se documenta que consultan el consentimiento.
- UI V-51, `draft`/artefactos visuales y cualquier tabla de vistas.
- Redacción legal y `docs/legal/`; no se toca `documento_legal` ni `aceptacion_documento_legal`.
- Cierre de proveedores (HU-15-03/04): el modelo queda preparado, pero su cierre depende de `ep01-consent-integration` con V-51.