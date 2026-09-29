# Modelo de datos — TAO-160 (HU-00-13)

> Comandos únicos desde la raíz, configuración de editor versionada, `.env.example` y acceso móvil al backend local.

## 1. Alcance del modelo

Este ticket **no introduce entidades persistentes ni cambios de esquema de base de datos**. No hay tablas, colecciones, migraciones ni backfill.

El "modelo de datos" afectado es de **configuración y contratos**: el esquema `zod` de variables de entorno como fuente de verdad, sus artefactos espejo (`.env.example`), los objetos de tooling versionados (`.editorconfig`, `.vscode/`, `docs/`) y los contratos deterministas que los validan en CI (paridad de configuración, existencia de comandos, higiene de `.vscode`).

Convención de estado: **EXISTENTE** = ya provisto por otro ticket/HU (no se redefine aquí); **NUEVO** = artefacto o contrato a crear por esta HU.

---

## 2. Entidad central — `EnvSchema` (esquema `zod` de configuración del backend)

**Estado: EXISTENTE** (fuente de verdad única, REQ-07 / REQ-E02). Esta HU **no** define variables nuevas: las deriva y las documenta.

### 2.1 Contrato de cada variable del schema (`EnvVar`)

| Campo (lógico) | Tipo | Obligatorio | Default | Regla |
|---|---|---|---|---|
| `key` | `string` (`UPPER_SNAKE_CASE`) | sí | — | Clave exacta en el schema `zod`; identificador de la fila |
| `zodType` | `ZodType` (`string`\|`number`\|`boolean`\|`enum`\|`url`\|…) | sí | — | Tipo de parseo/coerción |
| `required` | `boolean` | sí (derivado) | `false` | `true` si no tiene `.default()` ni `.optional()` |
| `default` | `unknown` | no | `undefined` | Valor por defecto declarado en el schema |
| `enumValues` | `string[]` | condicional | — | Obligatorio si `zodType` es `enum` |
| `secret` | `boolean` | no | `false` | Si `true`, se enmascara en logs y nunca lleva valor real en `.env.example` |
| `description` | `string` | sí | — | Explicación de una línea para el `.env.example` derivado |

### 2.2 Inventario (scaffold de categorías — la lista autoritativa es el schema, no esta tabla)

| Categoría | Variables representativas (a confirmar contra el schema) | Estado |
|---|---|---|
| Runtime app | `NODE_ENV`, `PORT` (puerto backend) | EXISTENTE |
| Base de datos | `DATABASE_URL` / `POSTGRES_*` (puerto `54329`) | EXISTENTE |
| Correo local (Mailpit) | `SMTP_HOST`, `SMTP_PORT` (Mailpit) | EXISTENTE |
| Autenticación / sesión | claves de firma / expiración (`secret: true`) | EXISTENTE |
| Observabilidad | nivel de log (`enum`) | EXISTENTE |

> Nota: la enumeración real se hace por reflexión del schema `zod` en la prueba de paridad (REQ-E02). No se mantiene a mano.

---

## 3. Objetos espejo y artefactos versionados (no-DB)

### 3.1 Par de documentación de entorno

| Objeto | Ruta | Estado | Restricción |
|---|---|---|---|
| `.env.example` raíz | `./.env.example` | NUEVO (o completar) | Nombre + explicación por variable, **sin credenciales** |
| `.env.example` backend | `./server/.env.example` | NUEVO (o completar) | Paridad bidireccional con `EnvSchema` |

**Invariante de paridad (REQ-07):** `set(EnvSchema.keys) == set(server/.env.example.keys)` en ambos sentidos. Una variable nueva en el schema sin documentar hace **fallar** la prueba nombrándola (QA-00-13-04).

### 3.2 Scripts raíz de `package.json`

| Script | Comando | Estado | Notas |
|---|---|---|---|
| `bootstrap` | instala deps → valida config → `generate` → hooks opcionales | NUEVO | Invocado con `pnpm run bootstrap` (DEC-230) |
| `doctor` | checks de toolchain y puertos | NUEVO | `pnpm run doctor`; `doctor --help` responde (REQ-09) |
| `dev:services` | Compose de HU-00-05 | NUEVO (wrapper) | Reutiliza el stack existente (REQ-E01) |
| `dev` | backend `tsx watch` + app `development` | NUEVO | Resuelve acceso móvil (REQ-04) |
| `generate` | generación de código | EXISTENTE/reexpuesto | Desde cualquier subdirectorio |
| `check` | formato + lint + tipado + unitarias afectadas | EXISTENTE/reexpuesto | Idéntico desde cualquier subdirectorio |
| `test` | suite local no nativa | EXISTENTE/reexpuesto | Idéntico desde cualquier subdirectorio |
| `setup` | — | **PROHIBIDO** | No debe existir (colisión con comando propio de pnpm, DEC-230) |

Resolución transversal: los scripts se resuelven desde cualquier subdirectorio del monorepo (REQ-01).

### 3.3 Configuración de editor versionada

| Artefacto | Ruta | Estado | Restricción |
|---|---|---|---|
| `.editorconfig` | `./.editorconfig` | NUEVO | Sin datos personales |
| Extensiones | `.vscode/extensions.json` | NUEVO | Sin tokens |
| Settings | `.vscode/settings.json` | NUEVO | Sin rutas absolutas |
| Launch | `.vscode/launch.json` | NUEVO | Depuración **compuesta** |
| Tasks | `.vscode/tasks.json` | NUEVO | Sin IDs de equipos Apple |

Exclusiones: los archivos generados quedan excluidos de búsqueda (REQ-06).

### 3.4 Documentación de desarrollo

| Documento | Ruta | Estado | Cubre |
|---|---|---|---|
| Setup | `docs/development/setup.md` | NUEVO | Prerrequisitos (macOS), clon limpio |
| Comandos | `docs/development/commands.md` | NUEVO | Invocación con `pnpm run` (DEC-230) |
| Configuración | `docs/development/configuration.md` | NUEVO | Variables, `.env.example` |
| Depuración | `docs/development/debugging.md` | NUEVO | Secciones *troubleshooting* enlazadas por `doctor` |

---

## 4. Contratos de verificación (`doctor` y CI) — "índices" del modelo

No hay índices de base de datos. Los equivalentes son **validaciones deterministas** con criterio pass/fail y código de salida.

### 4.1 Checks de `pnpm run doctor` (`DoctorCheck`)

| `id` | Recurso | Fuente esperada | Criterio | Estado |
|---|---|---|---|---|
| `flutter` | Flutter | versión de FVM (`.fvmrc`/config FVM) | versión coincide | NUEVO |
| `dart` | Dart | SDK de Flutter | presente | NUEVO |
| `node` | Node | `.nvmrc` | `major` coincide | NUEVO |
| `pnpm` | pnpm | `packageManager` | versión coincide | NUEVO |
| `docker` | Docker | — | daemon activo | NUEVO |
| `java` | Java | — | versión 17 | NUEVO |
| `xcode` | Xcode | macOS | presente | NUEVO |
| `android` | Android SDK | — | presente | NUEVO |
| `port:54329` | Puerto | — | libre / informado | NUEVO |
| `port:backend` | Puerto | `EnvSchema.PORT` | libre / informado | NUEVO |
| `port:mailpit` | Puerto | `EnvSchema.SMTP_PORT` | libre / informado | NUEVO |

Reglas transversales:
- Cada check expone **nombre, enlace a su sección de troubleshooting y criterio de salida**.
- `xcode` **o** `android` (basta uno).
- Ante cualquier fallo: se marca con enlace de solución y el proceso **sale con código ≠ 0** (REQ-02, QA-00-13-02).
- Puerto ocupado solo se **informa** (no aborta) (QA-00-13-03 de puerto `54329`).

### 4.2 Comprobaciones de CI (`CiInvariant`)

| `id` | Invariante | Fuente | Falla cuando | Estado |
|---|---|---|---|---|
| `commands-exist` | Comandos documentados existen en `package.json` | `docs/development/commands.md` × scripts | comando documentado ausente | NUEVO |
| `doctor-help` | `doctor --help` responde | script `doctor` | no responde | NUEVO |
| `env-parity` | Paridad bidireccional schema ↔ `server/.env.example` | `EnvSchema` | hay diferencia en cualquier sentido | NUEVO |
| `vscode-hygiene` | Sin rutas absolutas ni tokens | `.vscode/` | detecta ruta absoluta o token | NUEVO |

---

## 5. Relaciones

| Origen | Relación | Destino | Cardinalidad | Estado |
|---|---|---|---|---|
| `EnvSchema` | **deriva** | `server/.env.example` | 1:1 (paridad bidireccional) | NUEVO contrato |
| `EnvSchema` | **es fuente de verdad de** | `CiInvariant.env-parity` | 1:1 | NUEVO |
| `EnvSchema.PORT` / `SMTP_PORT` | **alimenta** | `DoctorCheck.port:*` | 1:1 | NUEVO |
| `Script` (`bootstrap`,`doctor`,`dev:services`,`dev`,`generate`,`check`,`test`) | **se documenta en** | `docs/development/commands.md` | N:1 | NUEVO |
| `DoctorCheck` | **enlaza a** | sección de `docs/development/debugging.md` | N:1 | NUEVO |
| `dev` | **reutiliza** | stack Compose (HU-00-05) y `GET /health/live` (*saludVivo*, EXISTENTE) | 1:1 | NUEVO wrapper |
| `dev` | **resuelve acceso móvil** | Android emu `10.0.2.2` / iOS loopback / `adb reverse` / IP de red | 1:N condicional | NUEVO |
| `.vscode/` | **excluido de búsqueda** en | archivos generados | — | NUEVO |

---

## 6. Notas de migración

- **Sin migración de base de datos.** No hay `ALTER`, `CREATE TABLE`, ni scripts de backfill; el ticket no toca el esquema persistente.
- **Migración de artefactos (aditiva):** se **crean** `.editorconfig`, `.vscode/*`, `.env.example` (raíz y `server/`), `docs/development/*.md` y las comprobaciones de CI. No se renombra ni se elimina nada existente.
- **Compatibilidad de comandos (DEC-230):** se **agregan** `bootstrap` y `doctor`; se garantiza la **ausencia** de `setup` (evita colisión con el comando propio de pnpm). No elimina scripts existentes (`generate`, `check`, `test` se conservan y se reexponen).
- **Reutilización, no duplicación (REQ-E01 / REQ-E02):** `dev:services` no reimplementa el Compose de HU-00-05; la prueba de paridad deriva del schema `zod`, no de una lista manual.
- **Rollback:** restaurar scripts y configuración previa; conservar `.env.example` sin secretos y retirar solo las opciones de `doctor` que resulten fallidas.
- **Riesgo de drift:** el único invariante con propensión a desincronizarse es schema ↔ `.env.example`; queda cubierto por `CiInvariant.env-parity` (falla, no advierte).