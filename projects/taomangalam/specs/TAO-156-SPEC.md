---
id: TAO-156-SPEC
project: taomangalam
ticket: TAO-156
status: approved
---

# HU-00-08 · Contrato como fuente única: Spectral, openapi-diff, tipos TS, cliente Dart generado y validación de peticiones

## Resumen ejecutivo

Se hace de server/contract/openapi.yaml la fuente única: lint Spectral con reglas del proyecto, gate openapi-diff --fail-on-incompatible contra main, codegen reproducible (tipos TypeScript con openapi-typescript + cliente Dart dart-dio en server/contract/generated/), comando pnpm generate con gate git diff --exit-code y validación de peticiones en runtime con express-openapi-validator que responde 400 validacion_fallida en problem+json. NO se incluye: contrato de eventos Socket.IO, render Redocly (HU-00-16), operaciones de negocio, ni el workflow de CI job contract (HU-00-09) — este ticket deja los comandos y configs que HU-00-09 consume. Se sabe que funciona porque: el lint pasa y falla sin x-capacidad, openapi-diff falla con un cambio incompatible y pasa con campo opcional, un clon limpio no deja diff tras generar y editar un generado falla el gate, un campo requerido nuevo en Salud rompe tsc --noEmit, dart analyze compila y GET /v1/version?plataforma=windows responde 400 validacion_fallida con requestId. Tamaño estimado: 3 sesiones (T2/T3/T2), proporcional a los 5 puntos publicados.

## Requirements

### REQ-01 `confirmed`
> Fuente: taomangalam/docs/backlog/EP-00_monorepo_y_experiencia_de_desarrollo.md:830

El contrato server/contract/openapi.yaml se lintea con un ruleset Spectral versionado (server/contract/.spectral.yaml) que aplica el base de OpenAPI más las reglas del proyecto: operationId presente y único, x-capacidad y x-requiere-cuenta en cada operación y errores declarados como application/problem+json; el lint termina sin errores o con la excepción documentada con su motivo en el ruleset.

### REQ-02 `confirmed`
> Fuente: taomangalam/docs/backlog/EP-00_monorepo_y_experiencia_de_desarrollo.md:833

Un comando compara el contrato contra la versión de main con openapi-diff --fail-on-incompatible: un cambio incompatible (eliminar o renombrar una propiedad requerida) hace fallar el paso, mientras un campo opcional nuevo o un contrato idéntico pasan.

### REQ-03 `confirmed`
> Fuente: taomangalam/docs/backlog/EP-00_monorepo_y_experiencia_de_desarrollo.md:836

Los tipos TypeScript del contrato se generan con openapi-typescript en server/contract/generated/ y los handlers de salud los consumen, de modo que un cambio de esquema exigido se propaga al tipado (DEC-230).

### REQ-04 `confirmed`
> Fuente: taomangalam/docs/product/tecnologia/06_bibliotecas.md:27

El cliente Dart se genera con openapi-generator y generador dart-dio en server/contract/generated/ y la app lo consume como su único cliente generado, compilando sin errores con dart analyze y deserializando respuestas reales de salud (DEC-155, tecnologia/06).

### REQ-05 `confirmed`
> Fuente: taomangalam/docs/backlog/EP-00_monorepo_y_experiencia_de_desarrollo.md:838

Toda petición HTTP se valida en tiempo de ejecución contra el contrato antes de la lógica con express-openapi-validator (DEC-162, tecnologia/06); una petición que lo incumple responde 400 application/problem+json con codigo: validacion_fallida y requestId, e incluye una operación documentada aún sin handler.

### REQ-06 `confirmed`
> Fuente: taomangalam/docs/backlog/EP-00_monorepo_y_experiencia_de_desarrollo.md:840

Un comando pnpm generate regenera todos los artefactos (tipos TypeScript y cliente Dart) y el gate ejecuta git diff --exit-code tras regenerar: un clon limpio no deja diff y un archivo de server/contract/generated/ editado a mano hace fallar el gate; las versiones de los generadores quedan fijadas en lockfiles o configuración (tecnologia/17 §3).

### REQ-07 `confirmed` `enforcement`
> Fuente: taomangalam/docs/product/tecnologia/06_bibliotecas.md:113

Se reutilizan las herramientas ya elegidas del stack en lugar de implementaciones propias: Spectral para el lint del contrato, express-openapi-validator para la validación en runtime y openapi-generator (dart-dio) como único cliente generado (tecnologia/06).
## Tasks

#### S1.T1 — Crear y versionar server/contract/.spectral.yaml con el ruleset base de OpenAPI y las reglas del proyecto: operationId presente y único, x-capacidad y x-requiere-cuenta en cada operación y errores declarados como application/problem+json (DEC-227).
Contrato: rollback: Eliminar server/contract/.spectral.yaml; el contrato queda sin linter y el PR revierte al estado previo.. Status: done

#### S1.T1.1 — Escribir server/contract/.spectral.yaml extendiendo el ruleset base de OpenAPI con las reglas de operationId y de x-capacidad/x-requiere-cuenta.
Contrato: rollback: Eliminar el archivo del ruleset.. Status: done

#### S1.T1.2 — Agregar la regla que exige que los errores declarados usen media type application/problem+json; documentar en el ruleset cualquier excepción con su motivo.
Contrato: rollback: Quitar la regla y las excepciones del ruleset.. Status: done

#### S1.T2 — Agregar el comando de lint del contrato (Spectral sobre server/contract/openapi.yaml) y el comando de comparación openapi-diff --fail-on-incompatible contra la versión de main, con las versiones de Spectral y openapi-diff fijadas en la config/lockfile.
Contrato: rollback: Quitar los comandos y las dependencias fijadas; el contrato deja de lintearse y compararse.. Status: done

#### S1.T3 — Regresión de los gates de contrato: el lint pasa sobre el contrato vigente y falla sin x-capacidad, con operationId duplicado o con un error sin problem+json; openapi-diff falla al eliminar o renombrar una propiedad requerida de Salud y pasa con un campo opcional nuevo o un contrato idéntico a main (QA-00-08-02).
Contrato: rollback: Eliminar los fixtures y scripts de prueba de los gates.. Status: done

#### S1.T4 — Pruebas del gate de contrato: una operación sin x-capacidad y un operationId duplicado hacen fallar Spectral; eliminar una propiedad requerida de Salud hace fallar openapi-diff y un campo opcional nuevo pasa.
Contrato: rollback: Eliminar los archivos de prueba del gate de contrato.. Status: done

#### S2.T1 — Generar los tipos TypeScript del contrato con openapi-typescript en server/contract/generated/ y consumirlos desde los handlers de salud, sin tipos escritos a mano (DEC-230).
Contrato: rollback: Eliminar la configuración y el directorio generated/ de tipos y revertir los handlers a sus tipos locales previos.. Status: done

#### S2.T1.1 — Configurar openapi-typescript con versión fijada y generar los tipos de saludVivo/saludListo y del esquema Salud en server/contract/generated/.
Contrato: rollback: Eliminar la config y el directorio generated/ de tipos.. Status: done

#### S2.T1.2 — Tipar los handlers de salud con los tipos generados de Salud, quitando los tipos escritos a mano.
Contrato: rollback: Restaurar los tipos locales previos del handler de salud.. Status: done

#### S2.T2 — Generar el cliente Dart con openapi-generator y generador dart-dio en server/contract/generated/ y consumirlo desde app/ como único cliente generado (DEC-155, tecnologia/06).
Contrato: rollback: Eliminar la config y el paquete Dart generado y quitar la dependencia de app/.. Status: done

#### S2.T2.1 — Configurar openapi-generator con el generador dart-dio (versión fijada) hacia server/contract/generated/ y verificar dart analyze sin errores.
Contrato: rollback: Eliminar la config y el paquete Dart generado.. Status: done

#### S2.T2.2 — Incorporar el cliente generado como dependencia de app/ sin agregar un segundo cliente Dart generado.
Contrato: rollback: Quitar la dependencia de app/ y el import del cliente generado.. Status: done

#### S2.T3 — Agregar el comando pnpm generate que regenera todos los artefactos (tipos TypeScript y cliente Dart) y el gate de codegen que ejecuta git diff --exit-code tras regenerar; fijar las versiones de los generadores en lockfile/config (tecnologia/17 §3).
Contrato: rollback: Quitar el script pnpm generate, el gate de no-diff y las versiones fijadas.. Status: done

#### S2.T3.1 — Agregar el script pnpm generate que invoca, en orden, la generación de los tipos TypeScript (openapi-typescript) y del cliente Dart (openapi-generator dart-dio) hacia server/contract/generated/.
Contrato: rollback: Quitar el script pnpm generate del manifiesto que lo declara.. Status: done

#### S2.T3.2 — Agregar el gate de codegen que ejecuta git diff --exit-code sobre server/contract/generated/ tras correr pnpm generate, de modo que un generado editado a mano haga fallar el paso mostrando el diff.
Contrato: rollback: Quitar el gate de no-diff; regenerar deja de verificar que no haya ediciones a mano.. Status: done

#### S2.T3.3 — Fijar las versiones de openapi-typescript, openapi-generator, Spectral y openapi-diff en lockfile/config para que la regeneración sea determinista.
Contrato: rollback: Quitar las versiones fijadas de la config/lockfile.. Status: done

#### S2.T3.4 — Enganchar pnpm generate y el gate de codegen como paso del job contract.
Contrato: rollback: Quitar el paso de codegen del job contract.. Status: done

#### S2.T4 — Prueba de contrato mínima del codegen: clon limpio → pnpm generate → git diff --exit-code 0 (QA-00-08-01); editar a mano un archivo de server/contract/generated/ → el gate falla mostrando el diff (QA-00-08-04); agregar un campo requerido a Salud sin actualizar el handler → tsc --noEmit falla (QA-00-08-05); dart analyze del paquete generado compila y el modelo Dart deserializa una respuesta real de GET /health/live.
Contrato: rollback: Eliminar los tests de contrato y los fixtures de codegen.. Status: done

#### S2.T4.1 — Test de reproducibilidad: en un clon limpio, correr pnpm generate y luego git diff --exit-code, verificando que termina con código 0 sin diff (QA-00-08-01).
Contrato: rollback: Eliminar el test de reproducibilidad del codegen.. Status: done

#### S2.T4.2 — Test del gate de no-diff: editar a mano un archivo de server/contract/generated/ y correr el gate de codegen, verificando que falla mostrando el diff (QA-00-08-04).
Contrato: rollback: Eliminar el test del gate de no-diff y su fixture.. Status: done

#### S2.T4.3 — Test de propagación del tipado: agregar un campo requerido al esquema Salud sin actualizar el handler, correr pnpm generate y luego tsc --noEmit, verificando que el tipado falla (QA-00-08-05).
Contrato: rollback: Eliminar el test de propagación del tipado y su fixture de esquema.. Status: done

#### S2.T4.4 — Test del cliente Dart: correr dart analyze sobre el paquete generado (compila sin errores) y deserializar una respuesta real de GET /health/live con el modelo Dart, verificando un objeto Salud con estado ok.
Contrato: rollback: Eliminar el test del cliente Dart y su fixture de respuesta.. Status: done

#### S3.T1 — Montar express-openapi-validator sobre server/contract/openapi.yaml para validar cada petición antes de la lógica (DEC-162, tecnologia/06), cubriendo operaciones documentadas aún sin handler.
Contrato: rollback: Quitar el middleware de validación y su dependencia del servidor.. Status: done

#### S3.T2 — Mapear los fallos de validación a 400 application/problem+json con codigo: validacion_fallida y requestId, y registrar errorCode en el log del request.
Contrato: rollback: Revertir el mapeo a la respuesta de error previa y quitar el campo errorCode del log.. Status: done

#### S3.T3 — Supertest de validación: GET /v1/version?plataforma=windows responde 400 problem+json con codigo validacion_fallida y requestId; un enum inválido responde 400 (QA-00-08-03); una petición conforme llega al handler; y GET /health/live responde 200 válido contra Salud con el validador activo.
Contrato: rollback: Eliminar los tests de validación de peticiones.. Status: done

#### S4.T1 — Prueba Dart que deserializa una respuesta real de GET /health/live contra el modelo Salud generado.
Contrato: rollback: Eliminar la prueba Dart de deserialización.. Status: done

#### S4.T2 — Prueba de tipado: agregar un campo requerido a Salud sin actualizar el handler hace fallar tsc --noEmit, y las respuestas de salud validan contra Salud/SaludListo.
Contrato: rollback: Eliminar la prueba de tipado y la validación de esquemas de salud.. Status: done

#### S4.T3 — Regresión: correr en el job contract lint Spectral, openapi-diff, pnpm generate + git diff, tsc --noEmit, la suite del servidor y dart analyze, todo verde.
Contrato: rollback: Quitar el paso de regresión del job y sus scripts asociados.. Status: done
## Sessions

### Session 1 · T2 · continue

**Tasks:**
- [x] S1.T1
- [x] S1.T1.1
- [x] S1.T1.2
- [x] S1.T2
- [x] S1.T3
- [x] S1.T4

**Gate (auto)**: El contrato vigente pasa el lint Spectral con el ruleset; quitar x-capacidad de una operación hace fallar el lint y borrar o renombrar una propiedad requerida de Salud hace fallar openapi-diff --fail-on-incompatible contra main.

### Session 2 · T3 · continue

**Tasks:**
- [x] S2.T1
- [x] S2.T1.1
- [x] S2.T1.2
- [x] S2.T2
- [x] S2.T2.1
- [x] S2.T2.2
- [x] S2.T3
- [x] S2.T3.1
- [x] S2.T3.2
- [x] S2.T3.3
- [x] S2.T3.4
- [x] S2.T4
- [x] S2.T4.1
- [x] S2.T4.2
- [x] S2.T4.3
- [x] S2.T4.4

**Gate (auto)**: En un clon limpio, pnpm generate deja server/contract/generated/ con los tipos TypeScript y el cliente Dart y git diff --exit-code da 0; editar a mano un generado hace fallar el gate; agregar un campo requerido a Salud sin tocar el handler rompe tsc --noEmit; dart analyze del paquete generado compila y el modelo Dart deserializa una respuesta real de GET /health/live.

### Session 3 · T2 · continue

**Tasks:**
- [x] S3.T1
- [x] S3.T2
- [x] S3.T3

**Gate (auto)**: GET /v1/version?plataforma=windows responde 400 application/problem+json con codigo: validacion_fallida y requestId, antes de la lógica, y una petición con enum inválido responde igual; una petición conforme llega al handler y la respuesta de salud válida contra Salud.

### Session 4 · T2 · continue

**Tasks:**
- [x] S4.T1
- [x] S4.T2
- [x] S4.T3

**Gate (auto)**: La suite de contrato pasa en el job contract: la salud valida contra Salud/SaludListo, el modelo Dart deserializa GET /health/live, tsc --noEmit falla si el handler omite un campo requerido y la regresión (lint, diff, codegen, tests) queda verde.
