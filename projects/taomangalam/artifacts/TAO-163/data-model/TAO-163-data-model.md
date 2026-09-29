# Modelo de datos — TAO-163 / HU-00-14

> Despliegue Railway aislado desde `server/` con `railway.toml`, staging por workflow manual, migración previa y smoke.

## 1. Veredicto

**Este ticket NO introduce cambios de esquema en la base de datos.** No hay entidades Prisma nuevas, ni columnas, ni índices, ni enums, ni relaciones de modelo de datos.

El alcance es de **infraestructura de despliegue**: el único contacto con la persistencia es la ejecución de `prisma migrate deploy` en pre-deploy (REQ-02), que aplica **migraciones ya existentes** en el repositorio. El "modelo de datos" afectado se compone, por lo tanto, de:

- **Objetos persistentes:** ninguno nuevo; se reutilizan los definidos por HU-00-05 (roles/usuarios) y HU-00-07/HU-00-09.
- **Objetos de configuración (no-tabla):** servicio Railway, variables de entorno, volumen de PostgreSQL, archivos versionados.
- **Contratos de lectura (no-tabla):** endpoints de salud existentes.

## 2. Entidades persistentes (Prisma / PostgreSQL)

### 2.1 Entidades nuevas

**Ninguna.** El ticket no define modelos Prisma, tablas, ni migraciones nuevas.

### 2.2 Entidades existentes involucradas

| Entidad | Origen | Uso en este ticket | Cambio |
|---|---|---|---|
| Modelos Prisma del dominio | HU-00-09 (base de `server/`) | Destino de `prisma migrate deploy` en pre-deploy | Sin cambios de esquema |
| Roles de base de datos (`server`, `postgres`) | HU-00-05 | Se pueblan en staging con el script de roles existente (usuario admin solo para bootstrap) | Reutilizado, sin cambios |
| `_prisma_migrations` (tabla de control de Prisma) | Prisma (existente) | Registra las migraciones aplicadas en staging; determina si un rollback de esquema es válido | Sin cambios |

> **Nota:** el pre-deploy falla cerrado. Si una migración no aplica, `_prisma_migrations` no avanza y el despliegue se aborta; la versión anterior sigue sirviendo (CA-03, QA-00-14-03).

## 3. Objetos de configuración (no son tablas)

Se modelan aquí porque son los artefactos persistentes reales del ticket y rigen el despliegue.

### 3.1 Servicio Railway `server`

| Campo | Tipo | Obligatorio | Default | Valor / referencia |
|---|---|---|---|---|
| `rootDirectory` | string | Sí | — | `/server` |
| `watchPaths` | string[] | Sí | — | `[/server/**]` |
| `configFilePath` | string | Sí | — | `/server/railway.toml` |
| `autoDeploy` (GitHub source) | boolean | Sí | `false` | Deshabilitado para staging (DEC-230) |
| `replicas` | number | Sí | `1` | Una sola réplica (REQ-02) |
| `restartPolicy` | enum | Sí | `On Failure` | `On Failure` |
| `startCommand` / entrypoint | string | Sí | — | Escucha en `0.0.0.0:$PORT` |
| `preDeployCommand` | string | Sí | — | `prisma migrate deploy` con `MIGRATION_DATABASE_URL` |
| `healthcheckPath` | string | Sí | — | `/health/ready` |
| `healthcheckTimeout` | number | Sí | acotado | Valor explícito; no indefinido (REQ-02) |

**Nuevo.**

### 3.2 Ambiente Railway `staging`

| Campo | Tipo | Obligatorio | Valor | Notas |
|---|---|---|---|---|
| `name` | enum | Sí | `staging` | Ambiente dedicado |
| `services` | string[] | Sí | `[server, postgres]` | REQ-04 |
| `projectToken` | secret (referencia) | Sí | — | Limitado al ambiente staging; guardado en el GitHub Environment `staging` |

**Nuevo.** Sin ambiente de producción (fuera de alcance, EP-17).

### 3.3 Volumen de PostgreSQL

| Campo | Tipo | Obligatorio | Valor | Notas |
|---|---|---|---|---|
| `mountPath` | string | Sí | ruta de datos de Postgres | Persistencia del servicio `postgres` |
| `size` | number | Sí | según plan Railway | Sin acceso público permanente (tecnologia/21 §3) |

**Nuevo** (instancia de staging). Sin backup/PITR (fuera de alcance, EP-17).

### 3.4 Variables de entorno (por referencia privada)

| Variable | Tipo | Obligatorio | Ambiente | Notas |
|---|---|---|---|---|
| `DATABASE_URL` | string (ref privada) | Sí | staging (`server`) | Referenciada, no literal |
| `MIGRATION_DATABASE_URL` | string (ref privada) | Sí | staging (pre-deploy) | Usada por `prisma migrate deploy` |
| `PORT` | string | Sí | staging (`server`) | Railway lo inyecta; app escucha en `0.0.0.0:$PORT` |
| `DATABASE_PUBLIC_URL` | — | **Prohibida** | staging | No debe existir (REQ-04) |

**Nuevas.** Secretos solo en GitHub Environment y Railway; nunca en el repositorio (REQ-09).

### 3.5 Archivos versionados (nuevos)

| Archivo | Tipo | Rol | Trazabilidad |
|---|---|---|---|
| `server/Dockerfile` | build multietapa | Build + runtime sin devDependencies, lockfile congelado, contexto aislado a `server/` | REQ-01, DEC-205 |
| `server/railway.toml` | config | Declara build, pre-deploy, start, healthcheck, restart, réplicas | REQ-02 |
| `.github/workflows/<staging>.yml` | workflow | Disparo manual por SHA, verificación `main` + `main.yml`, `railway up … --path-as-root --ci` | REQ-05 |
| `docker-compose*.yml` (perfil de paridad) | compose | Backend en contenedor con el mismo Dockerfile | REQ-03 |
| `package.json` (`server/`) | scripts | `railway:db:tunnel`, `db:studio:remote` con `--env` | REQ-06 |
| `docs/development/release-runbook.md` | doc | Sección staging: despliegue y rollback | REQ-07 |

**Nuevos** (el runbook puede preexistir: en ese caso, **sección nueva**).

## 4. Contratos de salud (no son tablas)

Reutilizan endpoints existentes de HU-00-04; no se crean endpoints nuevos (REQ-09).

| Endpoint | Método | Campo de respuesta | Tipo | Obligatorio | Valor esperado | Estado |
|---|---|---|---|---|---|---|
| `/health/live` (`saludVivo`) | GET | cuerpo/estado | — | — | 2xx | Existente |
| `/health/ready` (`saludListo`) | GET | `estado` | enum | Sí | `ok` | Existente |

**Sin cambios.** El ticket solo los consume (healthcheck de Railway y smoke del workflow).

## 5. Índices

**Ninguno nuevo.** No se agregan índices de base de datos ni de esquema. El único "índice" relevante es operativo: `watchPaths = /server/**` acota qué commits disparan build (aunque con auto-deploy apagado no dispara).

## 6. Relaciones

```
GitHub (main) ──(workflow manual, SHA)──▶ Railway
                                            └── ambiente staging
                                                 ├── servicio server ──build── server/Dockerfile
                                                 │        │
                                                 │        ├──pre-deploy── MIGRATION_DATABASE_URL ──▶ postgres
                                                 │        ├──healthcheck── /health/ready
                                                 │        └──runtime──── DATABASE_URL ─────────────▶ postgres
                                                 └── servicio postgres ── volumen persistente
GitHub Environment staging ──(projectToken)──▶ Railway
Compose (perfil paridad) ──mismo Dockerfile──▶ backend ──▶ PostgreSQL local
```

- `server` → `postgres`: dependencia de runtime y de pre-deploy (vía referencias privadas).
- `postgres` → volumen: persistencia 1:1.
- Workflow → Railway: autenticado con projectToken del GitHub Environment `staging` (sin exponerlo).

## 7. Notas de migración

1. **Sin migraciones nuevas.** `prisma migrate deploy` solo aplica migraciones ya versionadas. Este ticket no agrega ni edita migraciones.
2. **Falla cerrado.** Si `prisma migrate deploy` falla, el pre-deploy aborta y el despliegue no se promueve; la versión previa sigue sirviendo (CA-03).
3. **Rollback no destructivo.** El rollback es un redespliegue del SHA anterior; solo es válido con migraciones compatibles *expand/contract*. No se revierten datos de forma destructiva si el smoke falla (DEC-199).
4. **Migración descartable de prueba.** Para validar CA-03/QA-00-14-03 se usa una migración con SQL inválido en un entorno descartable; no debe quedar versionada en el repositorio.
5. **Bootstrap de roles.** La creación de los roles de `server` y `postgres` en staging reutiliza el script de HU-00-05 (admin solo para bootstrap); no se crean roles ad-hoc (REQ-08).
6. **Sin cambios de esquema ⇒ sin impacto en consumidores de datos.** Al no alterar el esquema, ningún consumidor de los modelos Prisma se ve afectado.

## 8. Trazabilidad REQ → objeto del modelo

| REQ | Objeto del modelo |
|---|---|
| REQ-01 | `server/Dockerfile` (§3.5) |
| REQ-02 | Servicio `server` (§3.1), variables (§3.4), tabla `_prisma_migrations` (§2.2) |
| REQ-03 | Perfil Compose (§3.5), endpoint `/health/ready` (§4) |
| REQ-04 | Ambiente `staging` (§3.2), volumen (§3.3), variables (§3.4) |
| REQ-05 | Workflow manual (§3.5), `projectToken` (§3.2) |
| REQ-06 | Scripts `package.json` (§3.5) |
| REQ-07 | `release-runbook.md` (§3.5) |
| REQ-08 | Roles HU-00-05 (§2.2) |
| REQ-09 | Redactor de secretos y endpoints de salud existentes (§3.4, §4) |