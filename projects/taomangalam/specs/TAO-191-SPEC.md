---
id: TAO-191-SPEC
project: taomangalam
ticket: TAO-191
status: approved
---

# TAO-191 · Proveedor real de versiones, configuración pública y estado persistente para EP-01

## Resumen ejecutivo

Preparar el proveedor real de versión mínima/recomendada, configuración pública y estado persistente que consumirán TAO-184 y TAO-187, trabajando en epic/EP-01.
Reutilizar el contrato existente y verificar los antecedentes de EP-00 contra commits integrados; los extractos de tipos y comentarios no demuestran una implementación ejecutable del proveedor.
No construir pantallas, simular proveedores, cerrar HU-03a-09 completa ni declarar aprobadas verificaciones manuales o avisos pendientes de sus consumidores.
La entrega se comprobará mediante respuestas API concretas, privilegios efectivos, persistencia sin red y casos trazados a ep01-release-provider; ep01-release-integration quedará preparado para la revisión agregada posterior.
Estimación provisional: tres sesiones T2 de 1,5–3 horas; la aprobación requiere resolver los datos pendientes y completar los comandos verify, que quedan vacíos para no inventar scripts ni archivos de pruebas.
Datos a confirmar antes de ejecutar:
- Leer el alcance completo, referencias canónicas, requisitos transversales y rollback de HU-03a-09 en docs/backlog/EP-03a_identidad_de_dispositivo_autorizacion_y_legal.md; consultar las reglas y bugs del módulo en el KB, no incluidos en este contexto.
- Verificar en epic/EP-01 los commits integrados de EP-00 y localizar las implementaciones, consumidores, contratos fuente, esquema, adaptador HTTP y almacenamiento de app realmente disponibles; origin/main es la única revisión aportada.
- Confirmar en el contrato fuente las rutas y firmas de obtenerVersionApp y configuración pública, los esquemas de respuesta y la interpretación de semver+build frente a los umbrales por plataforma.
- Confirmar en el esquema y migraciones los roles existentes y las operaciones necesarias sobre las tablas afectadas; el antecedente conocido es server/prisma/migrations/20260927223537_init/migration.sql.
- Confirmar la URL provisional M1a configurada para accountDeletionPortalUrl y la representación persistida del último estado conocido según DEC-086.
- Localizar la configuración de CI, los archivos de pruebas y los scripts reales del repositorio; sustituir verify: [] por uno a tres comandos focalizados por tarea antes de aprobar. Confirmar cómo se incorporan ep01-release-provider y ep01-release-integration.

## Requirements

### REQ-01 `confirmed`
> Fuente: docs/backlog/EP-03a_identidad_de_dispositivo_autorizacion_y_legal.md:1078

Qué: exponer mediante obtenerVersionApp la versión mínima, recomendada y el estado correspondiente a la plataforma y compilación recibidas. Por qué: TAO-184 y TAO-187 necesitan consultar el proveedor real; una plataforma sin app_release debe responder al_dia.

### REQ-02 `confirmed`
> Fuente: docs/backlog/EP-03a_identidad_de_dispositivo_autorizacion_y_legal.md:1099

Qué: aplicar el middleware de versión mínima a las peticiones /v1 con cabeceras de app y responder 426 version_minima con versionMinima cuando la compilación no está soportada. Por qué: impedir el consumo con versiones incompatibles, conservando la consulta sin cabecera y el acceso de plataformas sin app_release.

### REQ-03 `confirmed`
> Fuente: docs/backlog/EP-03a_identidad_de_dispositivo_autorizacion_y_legal.md:1078

Qué: servir la configuración pública conforme al contrato, incluyendo accountDeletionPortalUrl configurada para M1a, excluyendo claves sensibles y soportando ETag e If-None-Match. Por qué: los consumidores necesitan configuración actualizada sin exponer secretos ni reutilizar una respuesta obsoleta.

### REQ-04 `confirmed`
> Fuente: docs/backlog/EP-03a_identidad_de_dispositivo_autorizacion_y_legal.md:1098

Qué: integrar el adaptador real de app para enviar X-App-Version en formato semver+build y X-Plataforma en toda petición, consumir el contrato y exponer un estado persistente de versión. Por qué: los consumidores posteriores necesitan un estado conocido que sobreviva a reinicios sin inventar actualización cuando falta red.

### REQ-05 `confirmed`
> Fuente: docs/backlog/EP-03a_identidad_de_dispositivo_autorizacion_y_legal.md:1078

Qué: preparar ep01-release-provider con trazabilidad entre los casos de esta preparación y tests ejecutables, y ep01-release-integration para la revisión agregada posterior. Por qué: EP-01 consumirá únicamente entregas con CI real y commits integrados; las verificaciones de presentación obligatoria y recomendada permanecen pendientes de TAO-184 y TAO-187.

### REQ-06 `confirmed` `enforcement`
> Fuente: server/contract/generated/api.d.ts:4240

Qué: reutilizar el contrato fuente y regenerar sus tipos mediante el mecanismo existente cuando corresponda, protegiendo obtenerManifiesto y sincronizar. Por qué: sus tipos ya contemplan cabeceras de app y sincronizar declara 426; esas declaraciones deben conservarse compatibles con el proveedor implementado.

### REQ-07 `confirmed` `variant`
> Fuente: sonda:card-lint-de-docs-4d9deffd06

Qué: si se modifica el documento fuente de HU-03a-09 incluido en el baseline de lint, dejarlo conforme al linter y superar los checks de documentación sin modificar documentos ajenos al alcance. Por qué: la variante aprobada exige conservar el gate de documentación operativo.

### REQ-08 `confirmed` `variant`
> Fuente: sonda:card-privilegios-de-rol-b4cc421145

Qué: revisar los privilegios efectivos de cada rol sobre las tablas creadas o modificadas, determinar las operaciones necesarias según consumidores reales y aplicar GRANT/REVOKE explícitos cuando los permisos por defecto excedan el contrato. Por qué: las tablas nuevas pueden heredar INSERT, UPDATE y DELETE para taomangalam_app, aunque el proveedor solo necesite lectura.
## Tasks

#### S1.T1 — Completar la revisión de fuentes, reglas y bugs antes del diseño: leer HU-03a-09 completa y sus referencias; comprobar los antecedentes EP-00 en commits integrados y la rama epic/EP-01. Localizar el proveedor existente, contrato fuente, middleware, esquema, migraciones y todos sus consumidores. Registrar el impacto sobre obtenerManifiesto, sincronizar, TAO-184 y TAO-187. Preparar el teach-intake y el diseño usando el flujo canónico, sin ejecutar antecedentes ya entregados.
Contrato: rollback: Retirar únicamente los artefactos preparatorios de esta tarea mediante el flujo canónico, conservando el request, las fuentes originales y los registros existentes.. Status: done

#### S1.T2 — Implementar o completar obtenerVersionApp y el middleware real /v1 en las ubicaciones verificadas durante el intake. Usar los umbrales por plataforma, devolver al_dia sin app_release y 426 version_minima con versionMinima bajo el mínimo; preservar 200 sin gate para /v1/version sin X-App-Version. Reutilizar el contrato fuente y actualizar sus derivados mediante el mecanismo existente, respetando server/contract/generated/api.d.ts:4240 y :4959.
Contrato: rollback: Revertir los commits del proveedor, middleware y contrato como una unidad coherente; conservar datos de releases y registros existentes. Aplicar el rollback específico de la fuente sin degradar consentimientos ni versiones legales.. Status: done

#### S1.T3 — Para las tablas de versión creadas o modificadas, contrastar los consumidores reales con los privilegios efectivos de cada rol. Revisar el antecedente server/prisma/migrations/20260927223537_init/migration.sql y aplicar GRANT/REVOKE explícitos cuando los permisos heredados excedan las operaciones necesarias. Limitar cualquier migración a los objetos afectados y preservar sus datos.
Contrato: rollback: Revertir únicamente los cambios de privilegios y estructura de esta tarea según la matriz previa registrada; no borrar filas ni alterar permisos ajenos al alcance.. Status: done

#### S1.T4 — Escribir los tests focalizados del proveedor de versión, middleware y privilegios sobre los archivos de pruebas confirmados. Cubrir mínima 20/recomendada 25/build 22, build 18 con 426, igualdad con el mínimo, ausencia de app_release y QA-03a-09-01/02. Verificar los consumidores del contrato y permisos efectivos mediante roles reales de prueba. Registrar citas caso→test y cerrar la sesión con la regresión real del gate.
Contrato: rollback: Revertir únicamente los tests y datos de prueba añadidos; restaurar cualquier ajuste a tests existentes que haya sido aprobado, sin modificar datos de aplicación.. Status: done

#### S2.T1 — Implementar o completar la consulta real de configuración pública en los archivos verificados, utilizando configuracion_clave y el contrato existente. Incluir accountDeletionPortalUrl con el valor M1a confirmado, excluir claves sensibles y resolver ETag/If-None-Match sobre la representación pública para distinguir 304 sin cambios de 200 cuando cambia la URL.
Contrato: rollback: Revertir los commits de la consulta y sus ajustes de contrato de forma coherente, conservando valores de configuración, claves sensibles y registros existentes.. Status: pending

#### S2.T2 — Revisar la matriz de operaciones por rol para las tablas de configuración que esta sesión cree o modifique. Aplicar los GRANT/REVOKE necesarios para que la lectura pública y la administración real tengan solo sus permisos requeridos, sin extender la revisión a tablas ajenas.
Contrato: rollback: Restaurar exclusivamente los privilegios y estructura afectados por esta tarea conforme al estado previo registrado, conservando todos los valores de configuración.. Status: pending

#### S2.T3 — Escribir los tests focalizados de configuración y privilegios: validar el contrato y la URL M1a, ausencia de claves sensibles, 304 con ETag vigente y QA-03a-09-03 con 200 y URL nueva usando el ETag anterior. Verificar operaciones permitidas y denegadas para los roles afectados. Registrar citas caso→test y ejecutar la regresión real al cerrar el gate.
Contrato: rollback: Revertir únicamente los tests y fixtures introducidos, retirando los datos de prueba sin tocar configuración ni registros existentes.. Status: pending

#### S3.T1 — Integrar el adaptador HTTP real y el almacenamiento de app existentes con la entrega de las sesiones anteriores. Enviar X-App-Version en formato semver+build y X-Plataforma en toda petición; exponer y persistir el estado obtenido del contrato y de 426 version_minima. Aplicar DEC-086: un fallo de red no inventa actualización ni reemplaza el último estado conocido. No implementar pantallas ni avisos.
Contrato: rollback: Revertir los cambios del adaptador y persistencia manteniendo legibles los datos y registros ya almacenados; no borrar el estado conocido ni alterar consentimientos o versiones legales.. Status: pending

#### S3.T2 — Preparar ep01-release-provider en la configuración de CI verificada, trazando los casos de esta preparación a los tests reales y propagando sus fallos. Preparar ep01-release-integration con las verificaciones originales de aviso obligatorio después de TAO-184 y recomendado después de TAO-187, conservándolas pendientes hasta contar con evidencia real. Registrar el handoff, el requisito de commits integrados y el límite de cierre de HU-03a-09. Si se modifica docs/backlog/EP-03a_identidad_de_dispositivo_autorizacion_y_legal.md, cumplir sus checks de documentación sin modificar fuentes ajenas.
Contrato: rollback: Revertir los cambios de CI y documentación de esta tarea, conservando el historial de ejecuciones y los criterios originales de las fuentes.. Status: pending

#### S3.T3 — Escribir los tests focalizados del adaptador, persistencia y preparación de CI: cabeceras reales, estado recomendado, 426 seguido de reinicio sin red, estado al_dia conservado y ausencia de actualización inventada sin estado previo. Comprobar que los tests usan el contrato y proveedor implementados; verificar propagación de fallos del check y conservación de casos visuales pendientes. Incluir la comprobación condicional de lint del documento fuente si fue modificado. Registrar citas caso→test; el gate ejecutará la regresión completa y la revisión integral antes del handoff.
Contrato: rollback: Revertir únicamente los tests y fixtures añadidos, preservando la evidencia ya registrada y los datos de aplicación.. Status: pending
## Verificacion runtime

1. **Qué:** Smoke de la vista afectada por TAO-191 · Proveedor real de versiones, configuración pública y estado persistente para EP-01
   - **Se debe ver:** La vista carga y responde sin errores.
   - **Dónde:** vista afectada por el ticket

## Sessions

### Session 1 · T2 · continue

**Tasks:**
- [x] S1.T1
- [x] S1.T2
- [x] S1.T3
- [x] S1.T4

**Gate (auto)**: El proveedor real devuelve actualizacion_recomendada para build 22 con mínima 20 y recomendada 25, rechaza build 18 con 426 y permite la consulta sin X-App-Version. Los roles tienen únicamente las operaciones necesarias sobre los datos de versión.

### Session 2 · T2 · open

**Tasks:**
- [ ] S2.T1
- [ ] S2.T2
- [ ] S2.T3

**Gate (auto)**: La configuración pública devuelve la URL M1a configurada sin claves sensibles; un ETag vigente produce 304 y cambiar accountDeletionPortalUrl produce 200 con la URL nueva. Los privilegios de sus tablas respetan los consumidores reales.

### Session 3 · T2 · open

**Tasks:**
- [ ] S3.T1
- [ ] S3.T2
- [ ] S3.T3

**Gate (auto)**: El adaptador real envía las cabeceras exigidas, consume el proveedor y conserva el último estado tras un 426 y un reinicio sin red. ep01-release-provider dispone de casos trazados y ep01-release-integration mantiene explícitas las verificaciones visuales pendientes de TAO-184 y TAO-187.

### Session 4 · T0 · open

**Gate (auto)**: Verificación real del proveedor sin pantalla propia: respuesta 426 y estado obligatorio en Android con build de prueba contra staging; configuración pública actualizada con ETag anterior; conservación del estado conocido tras reiniciar sin conexión. Registrar evidencia concreta por ítem y, si no se puede ejecutar, la causa; no declarar aprobadas pruebas de avisos de TAO-184/TAO-187.
