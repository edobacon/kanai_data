---
id: TAO-092-SPEC
project: taomangalam
ticket: TAO-092
status: approved
---

# HU-00-04 · Esqueleto Express + TypeScript autónomo en server/ con capas, zod, pino, health y errores problem+json

## Resumen ejecutivo

Se construye server/ como proyecto Node 24 + Express + TypeScript autónomo, con estructura de capas y gate de calidad (tsc, ESLint typescript-eslint strict+stylistic, Prettier y dependency-cruiser), configuración validada con zod con fallo temprano, logs pino con requestId y redactor de secretos, propagación de X-Request-Id, endpoints /health/live y /health/ready con sonda PostgreSQL inyectable, errores application/problem+json y arranque con SIGTERM. NO se hace: validación contra el contrato y tipos generados (HU-00-08), Prisma (HU-00-06), pg-boss (HU-00-07), Dockerfile (HU-00-14), helmet/CORS/rate limiting (EP-03a), Sentry (EP-15) ni gate X-App-Version/426. Se verifica con los gates de calidad en 0, arranque con env inválida (exit ≠ 0) y llamadas curl/Supertest a /health/*, 404 y 500. Cabe en 2 sesiones dentro del techo de 4; tamaño estimado ~5 puntos, sin alcance agregado fuera del request.

## Requirements

### REQ-01 `confirmed`
> Fuente: taomangalam/docs/backlog/EP-00_monorepo_y_experiencia_de_desarrollo.md:110

Qué: server/ es un proyecto Node 24 + Express + TypeScript con estructura de capas (routes, middleware, controllers, services, models, dtos, jobs, workers) y gate de calidad (tsconfig estricto, eslint.config.mjs con typescript-eslint strictTypeChecked+stylisticTypeChecked, Prettier y dependency-cruiser con reglas de capas). Por qué: es la base sobre la que construyen todas las épicas con API y debe impedir que se rompan las fronteras de capas y que entren imports/logs fuera de convención.

### REQ-02 `confirmed`
> Fuente: taomangalam/docs/backlog/EP-00_monorepo_y_experiencia_de_desarrollo.md:112

Qué: la configuración se valida con zod al arrancar (NODE_ENV, APP_ENV, PORT y las que agreguen HU-00-06/HU-00-07); ante variable obligatoria ausente o inválida el proceso falla temprano, termina con código ≠ 0 y nombra la variable sin imprimir su valor. Por qué: evita que el server arranque con configuración incompleta y que se filtren secretos en los mensajes.

### REQ-03 `confirmed`
> Fuente: taomangalam/docs/backlog/EP-00_monorepo_y_experiencia_de_desarrollo.md:114

Qué: pino y pino-http emiten JSON de una línea fuera de development, pino-pretty solo en development, con los campos base y un redactor central que elimina authorization, cookies, tokens y contraseñas antes de serializar. Por qué: provee observabilidad estructurada con requestId sin exponer secretos y sin romper el parseo en producción.

### REQ-04 `confirmed`
> Fuente: taomangalam/docs/backlog/EP-00_monorepo_y_experiencia_de_desarrollo.md:458

Qué: un middleware propaga el X-Request-Id válido si viene (respetándolo) o genera un ULID de 26 caracteres si falta o es inválido, y siempre lo devuelve en la respuesta y lo incluye en el log de la petición. Por qué: permite correlacionar petición, log y error en todo el ciclo.

### REQ-05 `confirmed`
> Fuente: taomangalam/docs/backlog/EP-00_monorepo_y_experiencia_de_desarrollo.md:240

Qué: GET /health/live responde 200 sin consultas costosas y GET /health/ready valida configuración y corre una sonda de PostgreSQL inyectable; ambas responden el schema Salud y ready responde 503 cuando no está listo; las rutas viven fuera de /v1 como declara el contrato. Por qué: da a los consumidores (HU-00-06/07/08/14) un contrato de salud estable y una sonda desacoplada de la conexión real.

### REQ-06 `confirmed`
> Fuente: taomangalam/docs/backlog/EP-00_monorepo_y_experiencia_de_desarrollo.md:386

Qué: toda falla sale como application/problem+json con type, title, status, codigo y requestId; una ruta inexistente responde 404 recurso_no_encontrado y lo no previsto responde 500 error_interno sin stack ni mensaje interno. Por qué: unifica el contrato de errores y evita filtrar detalles internos al cliente.

### REQ-07 `confirmed`
> Fuente: taomangalam/docs/backlog/EP-00_monorepo_y_experiencia_de_desarrollo.md:110

Qué: el server escucha en 0.0.0.0:$PORT, corre con tsx watch en development y hace cierre ordenado de HTTP ante SIGTERM (deja de aceptar conexiones nuevas y termina la petición en curso antes de salir). Por qué: permite desarrollo con recarga y despliegue sin cortar peticiones en curso.

### REQ-08 `confirmed` `enforcement`
> Fuente: taomangalam/.github/CODEOWNERS:3

Qué: server/ se integra como parte del monorepo y workspace pnpm existente (no como proyecto aislado), respetando .gitignore y CODEOWNERS ya definidos en HU-00-01. Por qué: el esqueleto debe reutilizar la base real del repositorio y no reinventar ubicación, ignore ni ownership.
## Tasks

#### S1.T1 — Crear el proyecto server/ (Node 24 + Express + TypeScript) con tsconfig.json estricto, eslint.config.mjs (typescript-eslint strictTypeChecked y stylisticTypeChecked), Prettier y dependency-cruiser con las reglas de capas; crear server/src/{routes,middleware,controllers,services,models,dtos,jobs,workers}.
Contrato: rollback: Eliminar server/ y sus entradas de workspace/tsconfig; el monorepo queda como tras HU-00-01.. Status: done

#### S1.T2 — Validar la configuración al arrancar con zod (NODE_ENV, APP_ENV, PORT y las que agreguen HU-00-06/HU-00-07), con fallo temprano que nombra la variable sin imprimir su valor.
Contrato: rollback: Quitar el módulo de config y su invocación en el bootstrap; revertir a lectura directa de process.env.. Status: done

#### S1.T3 — Configurar pino y pino-http (JSON de una línea fuera de development, pino-pretty solo en development, campos base y redactor central de secretos) y el middleware X-Request-Id que respeta un valor válido o genera un ULID de 26 caracteres y lo devuelve siempre.
Contrato: rollback: Quitar logger/pino-http, el redactor y el middleware de requestId; restaurar logging básico del bootstrap.. Status: done

#### S1.T4 — Bootstrap de arranque: escuchar en 0.0.0.0:$PORT, tsx watch en development y cierre ordenado de HTTP ante SIGTERM (deja de aceptar conexiones nuevas y termina la petición en curso).
Contrato: rollback: Revertir el bootstrap a un listen simple sin manejo de SIGTERM ni tsx watch.. Status: done

#### S1.T5 — Tests unitarios (Vitest) del schema de configuración (válido, variable ausente, PORT no numérico, sin imprimir valores) y de la gestión de requestId (respeta válido, genera ULID de 26).
Contrato: rollback: Eliminar los tests y la configuración de Vitest del server.. Status: done

#### S2.T1 — Implementar GET /health/live (sin consultas costosas) y GET /health/ready (validación de configuración + sonda de PostgreSQL inyectable), ambas con el schema Salud, ready 503 cuando no está listo, healthchecks exitosos excluidos o muestreados en logs y rutas fuera de /v1.
Contrato: rollback: Quitar las rutas de salud y la abstracción de sonda; el server queda sin /health/*.. Status: done

#### S2.T2 — Implementar el manejador de errores: toda falla sale como application/problem+json con type, title, status, codigo y requestId; 404 recurso_no_encontrado para ruta inexistente y 500 error_interno sin stack ni mensaje interno para lo no previsto.
Contrato: rollback: Quitar el manejador central y el handler de 404; el server vuelve a las respuestas por defecto de Express.. Status: done

#### S2.T3 — Tests de integración (Supertest) para salud (live 200 en schema Salud, ready 503 con sonda de base en fallo), 404 recurso_no_encontrado, 500 error_interno sin stack y propagación de requestId.
Contrato: rollback: Eliminar los tests de integración y el harness de Supertest.. Status: done
## Sessions

### Session 1 · T2 · continue

**Tasks:**
- [x] S1.T1
- [x] S1.T2
- [x] S1.T3
- [x] S1.T4
- [x] S1.T5

**Gate (auto)**: server/ instala y pasa tsc --noEmit, ESLint (sin warnings), prettier --check y dependency-cruiser en 0; arranca con tsx watch en 0.0.0.0:$PORT, loguea en JSON de una línea con requestId y, ante variable obligatoria ausente o PORT no numérico, termina con código ≠ 0 nombrando la variable.

### Session 2 · T2 · continue

**Tasks:**
- [x] S2.T1
- [x] S2.T2
- [x] S2.T3

**Gate (auto)**: Con curl/Supertest se observa GET /health/live 200 con {"estado":"ok"} v.
Salud, GET /health/ready 503 con la sonda de base en fallo (live sigue 200), ruta inexistente 404 application/problem+json con codigo recurso_no_encontrado y un handler que lanza 500 error_interno sin stack; la respuesta ecoa el X-Request-Id válido o devuelve un ULID de 26.
