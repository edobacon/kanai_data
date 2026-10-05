# Modelo de datos afectado — TAO-191

## 1. Alcance y estado de definición

Este modelo cubre el proveedor de versiones y configuración pública, el estado persistente del adaptador de app y sus permisos. Las pantallas de actualización corresponden a TAO-184 y TAO-187.

**Leyenda**

- **Existente referenciado:** objeto nombrado por la fuente; su estructura física no está incluida en el material proporcionado.
- **Nuevo propuesto:** estructura lógica necesaria para esta preparación, pendiente de contrastar con el código y las migraciones existentes.
- **Existente por conservar:** contrato o comportamiento que no debe perder compatibilidad.

Los nombres de campos, tipos físicos, índices y restricciones siguientes son una **propuesta lógica**, no una descripción verificada del esquema actual. Si ya existe una estructura equivalente, debe reutilizarse sin crear un segundo origen de verdad.

## 2. Entidades persistentes del servidor

### 2.1. `app_release`

**Estado:** existente referenciado; campos y restricciones por verificar.

**Responsabilidad:** definir la política vigente de compilación mínima y recomendada por plataforma.

| Campo lógico | Tipo propuesto | Obligatorio | FK / enum | Default | Regla |
|---|---|---|---|---|---|
| `plataforma` | Texto | Sí | Dominio de plataformas del contrato existente | Sin default | Identifica la plataforma a la que aplica la política. |
| `version_minima` | Entero | Sí | — | Sin default | Compilación mínima soportada; valor no negativo. |
| `version_recomendada` | Entero | Sí | — | Sin default | Compilación recomendada; no menor que `version_minima`. |

**Clave e índices**

- Debe existir una única política vigente por plataforma dentro del ámbito real de consulta.
- Si la tabla almacena solo la política vigente, `plataforma` puede ser la clave primaria o tener un índice único.
- Si almacena historial, conservar su identificador y mecanismo existente de vigencia; garantizar unicidad de la política vigente sin eliminar versiones anteriores.
- No añadir un campo de entorno por la sola mención de staging. Si los entornos comparten almacenamiento, la unicidad debe incluir el ámbito existente.

**Restricciones propuestas**

- `version_minima >= 0`.
- `version_recomendada >= version_minima`.
- Los umbrales se comparan contra la **compilación**, no mediante orden lexicográfico del texto `semver+build`.

**Reglas de lectura**

| Condición | Estado lógico resultante |
|---|---|
| No existe política para la plataforma | `al_dia` |
| Compilación menor que la mínima | Actualización obligatoria; rechazo HTTP 426 `version_minima` cuando aplica el middleware |
| Compilación igual o mayor que la mínima y menor que la recomendada | `actualizacion_recomendada` |
| Compilación igual o mayor que la recomendada | `al_dia` |

El literal de actualización obligatoria en la respuesta de consulta debe tomarse del contrato fuente; no se define uno nuevo en este documento.

### 2.2. `configuracion_clave`

**Estado:** existente referenciado; campos y restricciones por verificar.

**Responsabilidad:** almacenar configuración y permitir una proyección pública que excluya datos sensibles.

| Campo lógico | Tipo propuesto | Obligatorio | FK / enum | Default | Regla |
|---|---|---|---|---|---|
| `clave` | Texto | Sí | — | Sin default | Nombre único dentro del ámbito de configuración existente. |
| `valor` | Tipo existente; JSON si el almacén admite valores heterogéneos | Sí | Tipo validado según la clave | Sin default | No cambiar la representación física sin verificar consumidores. |
| `sensible` | Booleano | Sí | — | `true` para nuevas claves, propuesto | Solo las claves clasificadas explícitamente como no sensibles pueden exponerse. |

**Clave e índices**

- Índice único sobre `clave` dentro de su ámbito real.
- Conservar los índices existentes.
- No se justifica un índice aislado sobre `sensible` sin conocer volumen y patrón de consulta.

**Reglas de exposición**

- Excluir siempre las claves sensibles.
- Proyectar y validar los campos permitidos por el contrato público.
- No devolver automáticamente todas las claves no sensibles si el contrato público solo admite un subconjunto.
- La clasificación de claves existentes debe conservarse o revisarse explícitamente; no inferirla a partir del nombre.

### 2.3. Entrada `accountDeletionPortalUrl`

**Estado:** exigida por la fuente; existencia y valor actuales por verificar. Es una entrada de configuración, no una entidad nueva.

| Propiedad | Definición |
|---|---|
| Clave | `accountDeletionPortalUrl` |
| Tipo del valor público | Cadena con formato URI, conforme al contrato fuente |
| Obligatoria | Sí, para la configuración pública del entorno M1a |
| Sensible | `false`, establecido explícitamente |
| Default | Ninguno |
| Valor | URL provisional configurada para el entorno; no inventar ni fijar una URL en código |
| FK | Ninguna |

Un cambio de esta entrada debe modificar el ETag de la configuración pública y producir 200 ante una petición que presente el ETag anterior.

## 3. Estado persistente de la app

### 3.1. `KnownAppVersionState`

**Estado:** nuevo propuesto, salvo que el adaptador existente ya disponga de una estructura equivalente.

**Responsabilidad:** conservar la última evidencia válida recibida del proveedor y exponerla a los consumidores después de un reinicio.

**Ubicación:** almacenamiento persistente local de la app, mediante el mecanismo existente. No requiere una tabla de servidor.

| Campo lógico | Tipo propuesto | Obligatorio | FK / enum | Default | Regla |
|---|---|---|---|---|---|
| `schemaVersion` | Entero | Sí | — | `1` | Versión del formato de persistencia, no de la app. |
| `platform` | Texto | Sí | Dominio del contrato | Sin default | Plataforma a la que corresponde la evidencia. |
| `evaluatedAppVersion` | Texto `semver+build` | Sí | — | Sin default | Versión instalada con la que se obtuvo la evidencia. |
| `knownStatus` | Enum lógico | Sí | `al_dia`, `actualizacion_recomendada`, actualización obligatoria | Sin default | Usar los literales reales del contrato y su adaptación existente. |
| `minimumBuild` | Entero no negativo | Condicional | — | Sin default | Obligatorio al registrar un 426; opcional si la respuesta válida no lo incluye. |
| `recommendedBuild` | Entero no negativo | No | — | Sin default | Guardar solo si lo proporciona el contrato real. |
| `observedAt` | Fecha/hora UTC | Sí | — | Momento de recepción válida | Fecha de la evidencia, no de la última apertura de la app. |

**Clave e índices**

- Una entrada por plataforma en el espacio de almacenamiento de la app.
- No requiere índices relacionales.
- Conservar el mecanismo existente de aislamiento del almacenamiento.

**Invariantes**

1. La ausencia de una entrada significa **estado desconocido**, no `al_dia`.
2. Solo una respuesta válida del proveedor o un 426 validado actualiza el estado conocido.
3. Un fallo de red no modifica `knownStatus`, los umbrales ni `observedAt`.
4. La conectividad es un dato separado del estado de versión: estar sin red no implica necesitar una actualización.
5. Al cambiar la versión instalada, conservar la evidencia previa con su versión evaluada; no presentarla como una evaluación nueva.
6. Una respuesta que declare actualización obligatoria o recomendada debe conservar los datos exigidos por el contrato para ese estado.
7. Los consumidores de presentación leen este estado; sus pruebas visuales permanecen para TAO-184 y TAO-187.

## 4. Objetos de contrato y datos derivados

### 4.1. Contexto de versión de la petición

**Estado:** existente por conservar; implementación del adaptador y middleware afectada.

| Dato | Tipo | Obligatorio | Origen / regla |
|---|---|---|---|
| `X-App-Version` | Texto `semver+build` | Sí en toda petición emitida por la app | Metadatos reales de la instalación |
| `X-Plataforma` | Texto | Sí en toda petición emitida por la app | Dominio de plataformas del contrato |
| Compilación interpretada | Entero | Cuando se evalúa la política | Extraída mediante el parser compatible con el contrato |

No se persiste cada contexto de petición como una entidad de negocio.

**Bordes conservados**

- `/v1/version` sin `X-App-Version` responde 200 sin aplicar el gate.
- Una plataforma sin `app_release` no se rechaza por versión mínima.
- El comportamiento ante cabeceras malformadas o incompletas debe conservar la definición del contrato; no se deduce de la excepción anterior.

### 4.2. Respuesta de versión

**Estado:** contrato existente por reutilizar.

Contenido lógico:

- Plataforma evaluada, si el contrato la incluye.
- Versión mínima y recomendada según la política encontrada.
- Estado calculado.

La ausencia de política produce `al_dia`; no autoriza crear umbrales ficticios de cero ni una fila automática.

### 4.3. Error de versión mínima

**Estado:** respuesta exigida; no es una entidad persistente.

| Elemento | Tipo / valor | Obligatorio |
|---|---|---|
| Estado HTTP | `426` | Sí |
| Código de error | `version_minima` | Sí |
| `versionMinima` | Entero correspondiente al umbral de compilación | Sí |

La envoltura y los demás campos se toman del contrato de error existente.

### 4.4. Configuración pública y ETag

**Estado:** proyección del almacén existente; ETag derivado.

| Elemento | Tipo | Persistencia |
|---|---|---|
| Configuración pública | Objeto validado contra el contrato | Derivado de configuración autorizada |
| `accountDeletionPortalUrl` | Cadena URI | Persistido como entrada de configuración |
| `ETag` | Cadena de validador HTTP | Derivado de la representación pública |
| `If-None-Match` | Cadena de petición | No persistente |

**Reglas**

- Calcular el ETag sobre una representación pública determinista, una vez excluidas las claves sensibles.
- Una modificación del contenido público debe cambiar el ETag.
- Una modificación exclusivamente sensible no debe cambiar el ETag público.
- Si el validador coincide, devolver 304 sin cuerpo.
- No hace falta una tabla de ETags.
- Si la app ya dispone de caché HTTP persistente, reutilizarla; no crear otra caché en este alcance sin necesidad comprobada.

## 5. Relaciones

| Origen | Destino | Cardinalidad lógica | Relación |
|---|---|---|---|
| Contexto de petición | Política vigente de `app_release` | Muchos a cero o uno | Consulta por plataforma y ámbito; sin FK persistente |
| `configuracion_clave` | Configuración pública | Varias entradas a una representación | Proyección filtrada y validada |
| Respuesta de versión / error 426 | `KnownAppVersionState` | Varias observaciones a un último estado conocido | Actualización local tras validar la respuesta |
| `KnownAppVersionState` | TAO-184 / TAO-187 | Un estado a varios consumidores | Consumo del adaptador real |

No se introduce una FK entre configuración y releases. Tampoco se introduce una relación con consentimientos o versiones legales.

## 6. Permisos efectivos

**Estado:** revisión y ajustes exigidos por REQ-08.

| Objeto | Consumo previsto del proveedor | Política propuesta |
|---|---|---|
| `app_release` | Lectura de política vigente | Lectura por el rol del proveedor; escritura solo por el mecanismo de administración autorizado |
| `configuracion_clave` | Lectura para construir la proyección pública | Acceso mínimo necesario; sin escritura desde el proveedor |
| Proyección pública, si ya existe o se implementa como vista | Lectura de campos autorizados | Conceder lectura al rol que realmente la consume |
| Estado local de app | Lectura/escritura del adaptador | Sin privilegios de base de datos del servidor |

Antes de aplicar cambios:

- Verificar permisos directos, heredados y privilegios por defecto de `taomangalam_app`.
- Identificar consumidores reales que necesiten `INSERT`, `UPDATE` o `DELETE`.
- Aplicar `GRANT`/`REVOKE` explícitos conforme a esa revisión.
- No retirar permisos de escritura compartidos sin verificar los consumidores que dependen de ellos.
- El filtrado de la respuesta HTTP no sustituye el control de acceso a los datos sensibles.

## 7. Migración y compatibilidad

1. **Verificar el esquema integrado.** Contrastar `app_release`, `configuracion_clave`, sus ámbitos, restricciones y permisos con los antecedentes EP-00 ya entregados.
2. **Reutilizar estructuras existentes.** Añadir únicamente los campos o restricciones que falten; no duplicar entidades, políticas ni configuración.
3. **Validar datos antes de restringir.** Detectar duplicados de políticas vigentes, umbrales inválidos y claves sin clasificación antes de imponer unicidad, checks o `NOT NULL`.
4. **No fabricar políticas.** Una plataforma sin release mantiene el comportamiento `al_dia`.
5. **Configurar M1a explícitamente.** Incorporar la URL provisional autorizada, conservando valores existentes cuando corresponda.
6. **Migrar el estado local con versión de formato.** La ausencia de datos previos conserva el estado desconocido. Datos inválidos no se convierten en una actualización confirmada.
7. **Regenerar tipos por el mecanismo existente.** Conservar las cabeceras declaradas por `obtenerManifiesto` y `sincronizar`, y la respuesta 426 de `sincronizar`.
8. **Mantener la documentación exigible.** Si se modifica la fuente de HU-03a-09, debe superar sus checks de documentación.
9. **Rollback conservador.** Revertir código y cambios de esquema específicos mediante migraciones compatibles, preservando registros existentes. El formato local versionado debe permitir que la versión revertida ignore datos que no comprenda. No modificar consentimientos ni inventar versiones legales.

## 8. Evidencia requerida del modelo

| Área | Verificación trazable |
|---|---|
| Política de versiones | Android mínima 20, recomendada 25, compilación 22 → `actualizacion_recomendada` |
| Restricción mínima | Compilación 18 con cabeceras → 426 `version_minima` con `versionMinima` |
| Ausencia de política | Plataforma sin `app_release` → `al_dia`, sin rechazo por versión |
| Consulta de borde | `/v1/version` sin `X-App-Version` → 200 sin gate |
| Configuración pública | URL M1a configurada y respuesta válida contra el contrato |
| Confidencialidad | Clave sensible ausente de la representación pública |
| Caché | ETag coincidente → 304; URL pública modificada con ETag anterior → 200 |
| Adaptador | Cabeceras reales `semver+build` y plataforma en toda petición |
| Persistencia | Tras 426, reinicio sin red conserva la evidencia previa sin inventar una nueva evaluación |
| Permisos | Operaciones efectivas limitadas a las necesarias para consumidores verificados |

Estas verificaciones deben alimentar `ep01-release-provider`. La revisión agregada corresponde a `ep01-release-integration`; la presentación de los avisos obligatorio y recomendado queda pendiente de TAO-184 y TAO-187.