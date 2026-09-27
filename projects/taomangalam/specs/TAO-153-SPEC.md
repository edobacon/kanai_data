---
id: TAO-153-SPEC
project: taomangalam
ticket: TAO-153
status: approved
---

# HU-00-05 · PostgreSQL 18 local en Docker con Mailpit, cuatro roles de conexión y perfiles opcionales de fallo

## Resumen ejecutivo

Se crea `compose.yaml` con PostgreSQL major 18 (imagen fijada por digest, volumen nombrado, healthcheck y puerto host `54329` configurable por variable) con las bases `taomangalam_dev` y `taomangalam_test`, el script idempotente `infra/postgres/init/001_roles.sql` con los cuatro roles de DEC-200 y sus permisos, Mailpit como correo local, un perfil `failure` con Toxiproxy frente a PostgreSQL y `docs/development/local-services.md`. NO incluye backend en contenedor (HU-00-14), perfil `observability` (EP-15), Redis (DEC-195) ni `pnpm dev:services` (HU-00-13). Se sabe que funciona porque `docker compose up -d` deja PostgreSQL `healthy` con la major 18 en `54329`, los permisos por rol se verifican con un script, Mailpit muestra el correo y `docker compose up` sin perfiles no levanta Toxiproxy ni Redis. Tamaño: 3 puntos, 3 sesiones T1.

## Requirements

### REQ-01 `confirmed`
> Fuente: taomangalam/docs/backlog/EP-00_monorepo_y_experiencia_de_desarrollo.md:566-567

`compose.yaml` levanta un servicio PostgreSQL major 18 (imagen fijada por digest cuando sea posible, volumen nombrado, healthcheck visible en `docker compose ps` y puerto host `${POSTGRES_PORT:-54329}` configurable por variable) con las bases `taomangalam_dev` y `taomangalam_test`.

### REQ-02 `confirmed`
> Fuente: taomangalam/docs/product/tecnologia/21_despliegue_railway_y_operacion_v1.md:220

`infra/postgres/init/001_roles.sql` es idempotente y crea `taomangalam_app`, `taomangalam_migrator`, `taomangalam_queue` y `taomangalam_readonly` con los permisos de tecnologia/21 §5 y el schema `pgboss` propiedad del rol de cola.

### REQ-03 `confirmed`
> Fuente: taomangalam/docs/backlog/EP-00_monorepo_y_experiencia_de_desarrollo.md:556

Mailpit queda disponible como sustituto local de correo (SMTP local más interfaz web) dentro de `compose.yaml`.

### REQ-04 `confirmed`
> Fuente: taomangalam/docs/product/decisiones/DEC-192-dx-reproducible-y-validacion-humana.md:30

El perfil `failure` levanta Toxiproxy frente a PostgreSQL para provocar latencia y cortes, y `docker compose up` sin perfiles no trae Toxiproxy ni Redis.

### REQ-05 `inferred`
> Fuente: taomangalam/docs/backlog/EP-00_monorepo_y_experiencia_de_desarrollo.md:556

`docs/development/local-services.md` documenta puertos, perfiles y credenciales ficticias de los servicios locales, alineado con `.env.example`.
## Tasks

#### S1.T1 — Crear `compose.yaml` con el servicio `postgres` (imagen PostgreSQL major 18 fijada por digest cuando sea posible, volumen nombrado, healthcheck `pg_isready` y puerto host `${POSTGRES_PORT:-54329}`) y las bases `taomangalam_dev` y `taomangalam_test`.
Contrato: rollback: Eliminar `compose.yaml` y el volumen nombrado creado.. Status: done

#### S1.T2 — Añadir el script de verificación del servicio de base de datos: healthcheck `healthy`, `SELECT version()` con la major 18, puerto configurable por variable y fallo por puerto ocupado.
Contrato: rollback: Eliminar el script de verificación del servicio de base de datos.. Status: done

#### S2.T1 — Crear `infra/postgres/init/001_roles.sql` idempotente que crea `taomangalam_app`, `taomangalam_migrator`, `taomangalam_queue` y `taomangalam_readonly` con los permisos de tecnologia/21 §5 y el schema `pgboss` propiedad del rol de cola.
Contrato: rollback: Eliminar `infra/postgres/init/001_roles.sql` y recrear el volumen.. Status: done

#### S2.T2 — Añadir el script de verificación de permisos por rol (`app` no crea tablas, `readonly` no inserta, `queue` solo crea en `pgboss`, `migrator` crea tablas en el schema de aplicación) y de idempotencia al re-ejecutar `001_roles.sql`.
Contrato: rollback: Eliminar el script de verificación de permisos por rol.. Status: done

#### S3.T1 — Agregar a `compose.yaml` el servicio `mailpit` con SMTP local e interfaz web.
Contrato: rollback: Quitar el servicio `mailpit` de `compose.yaml`.. Status: done

#### S3.T2 — Agregar a `compose.yaml` el servicio `toxiproxy` bajo el perfil `failure` frente a PostgreSQL para latencia y cortes.
Contrato: rollback: Quitar el servicio `toxiproxy` y el perfil `failure` de `compose.yaml`.. Status: done

#### S3.T3 — Crear `docs/development/local-services.md` con puertos, perfiles y credenciales ficticias y el `.env.example` correspondiente.
Contrato: rollback: Eliminar `docs/development/local-services.md` y `.env.example`.. Status: done

#### S3.T4 — Añadir la verificación end-to-end de servicios auxiliares: correo visible en Mailpit, corte y recuperación con el perfil `failure`, y ausencia de Toxiproxy y Redis sin perfiles.
Contrato: rollback: Eliminar la verificación end-to-end de servicios auxiliares.. Status: done
## Sessions

### Session 1 · T1 · continue

**Tasks:**
- [x] S1.T1
- [x] S1.T2

**Gate (auto)**: `docker compose up -d` deja PostgreSQL `healthy`; `SELECT version()` informa la major 18 y las bases `taomangalam_dev`/`taomangalam_test` existen en el puerto 54329, comprobable con `docker compose ps` y `psql`.

### Session 2 · T1 · continue

**Tasks:**
- [x] S2.T1
- [x] S2.T2

**Gate (auto)**: Los cuatro roles existen con sus permisos aislados y re-ejecutar `001_roles.sql` sobre el volumen existente termina con código 0 sin duplicados, verificable con el script de permisos por rol.

### Session 3 · T1 · continue

**Tasks:**
- [x] S3.T1
- [x] S3.T2
- [x] S3.T3
- [x] S3.T4

**Gate (auto)**: Un correo enviado al SMTP local aparece en la interfaz de Mailpit, `docker compose --profile failure up -d` permite cortar y recuperar la conexión por el proxy, `docker compose up` sin perfiles no lista Toxiproxy ni Redis, y `local-services.md` permite arrancar en una máquina limpia.

### Session 4 · T0 · continue

**Gate (auto)**: El test de paridad doc<->.env.example cubre REQ-05 y la suite documental entera pasa.

### Session 5 · T0 · continue
