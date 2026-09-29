---
id: TAO-157-SPEC
project: taomangalam
ticket: TAO-157
status: approved
---

# Preparar convenciones y fuentes para las sondas de intake de DEC-236 (parser compartido, metadata OpenAPI, checker y matriz de preparación)

## Resumen ejecutivo

Se extrae un parser compartido (`scripts/lib/markdown_tables.py`), se estructuran las tablas del modelo (doc 20 §11) y se crea la matriz de preparación de sondas (doc 28). El contrato OpenAPI se anota con su línea base: `x-entidades-escritas` en las 71 escrituras REST (menos `/sync`), `x-client-offline-policy` en las 72, `x-replace-semantics` en 2 operaciones y las precondiciones `x-preconditions`/`x-preconditions-por-operacion`, documentadas en el preámbulo con subida patch. Se implementa `scripts/check_contrato.py` (yaml.safe_load, sin regex) con pruebas e integración al gate. NO se cambia comportamiento de producto, ni autorización, ni persistencia; NO se crea el registro de escrituras no REST, ni se compara unicidad contra Prisma, ni se implementa el adaptador de Kanai en `kanai-app`. Se sabe que funciona porque `check_contrato.py` informa 72/72 escrituras, 2/2 reemplazos y sale 0; un fixture inválido falla nombrando operationId/método/path; `check_backlog.py` conserva su salida y la suite `unittest` queda verde. Tamaño: 4 sesiones (dentro del techo). Advertencias: (1) premisa corregida por la Adenda 1 (el adaptador OpenAPI de Kanai ya existe e integrado; la integración sigue bloqueada por la metadata REST faltante), (2) el job documental `docs` de `ci-pr.yml` todavía no existe, así que la integración se hace sobre el workflow existente `.github/workflows/contract.yml` y la lista de comandos documentales de `tecnologia/17` §8, y (3) el request lista cinco extensiones pero un criterio habla de "cuatro"; se documentan las cinco listadas.

## Requirements

### REQ-01 `confirmed`
> Fuente: scripts/check_backlog.py:59

El parser reutilizable de frontmatter y tablas se extrae de `scripts/check_backlog.py` a `scripts/lib/markdown_tables.py`, se le agrega el parser de la matriz perfil × capacidad del documento 14, y `check_backlog.py` lo importa sin cambiar su salida ni el resultado de `check_citas.py`; el módulo queda disponible para `check_contrato.py` y `HU-03a-06`.

### REQ-02 `confirmed`
> Fuente: docs/product/tecnologia/20_modelo_de_datos_v2_incremental.md:696

La sección 11 del documento 20 se convierte en la tabla estructurada `| Restricción | Entidad | Motivo |` y agrega las tablas `| Entidad | Campo | Referencia | Cardinalidad |` y `| Entidad | Campo de estado | Valores |`, sin perder ninguna de las restricciones actuales, todas parseables por el módulo compartido.

### REQ-03 `confirmed`
> Fuente: server/contract/openapi.yaml:1627

Toda operación REST de escritura declara `x-entidades-escritas` como lista no vacía de identificadores canónicos del documento 20 (sin duplicados), las operaciones de lectura no la llevan, y `/sync` no duplica la lista sino que sus claves de `x-capacidad-por-operacion` coinciden con su `oneOf` discriminado por `entidad`.

### REQ-04 `confirmed`
> Fuente: docs/product/decisiones/DEC-236-convenciones-para-sondas-de-intake.md:53

Las dos operaciones de reemplazo conocidas llevan `x-replace-semantics` con enumeraciones válidas, y la línea base de precondiciones (`aceptarInvitacion`, `reenviarInvitacion`, descarte de consulta y corrección de la última tirada) se expresa con `x-preconditions` y `x-preconditions-por-operacion` con `cuando` obligatorio y `respaldo` a documentos existentes.

### REQ-05 `confirmed`
> Fuente: docs/product/decisiones/DEC-236-convenciones-para-sondas-de-intake.md:189

Las 72 operaciones de escritura declaran `x-client-offline-policy` con un valor `sin-red` de la enumeración, sin excluir operaciones públicas ni administrativas.

### REQ-06 `confirmed`
> Fuente: server/contract/openapi.yaml:5

El preámbulo del contrato documenta las extensiones `x-entidades-escritas`, `x-replace-semantics`, `x-preconditions`, `x-preconditions-por-operacion` y `x-client-offline-policy`, y la versión del contrato sube un patch (2.4.0 → 2.4.1).

### REQ-07 `confirmed`
> Fuente: docs/product/decisiones/DEC-236-convenciones-para-sondas-de-intake.md:220

Se crea `docs/product/tecnologia/28_matriz_preparacion_sondas_kanai.md` con las ocho familias (`write-paths`, `parent-lifecycle`, `profile-ops`, `uniques`, `full-replace`, `cross-consumers`, `input-shape`, `reference-coherence`), cada una con su fuente parseable o su dependencia/bloqueo explícito, sin declarar ninguna activa.

### REQ-08 `confirmed`
> Fuente: docs/product/decisiones/DEC-236-convenciones-para-sondas-de-intake.md:248

`scripts/check_contrato.py` carga el contrato con `yaml.safe_load` (sin expresiones regulares), valida forma y enumeraciones de las extensiones, referencias de `respaldo`, cobertura de `x-entidades-escritas` y `x-client-offline-policy`, coherencia de `/sync`, tabla de unicidad y registro de escrituras no REST cuando exista, y termina con código distinto de cero ante YAML o metadata inválida, indicando operationId, método, path y regla.

### REQ-09 `confirmed`
> Fuente: .github/workflows/contract.yml:1

`check_contrato.py` queda integrado al gate documental y se agregan las pruebas unitarias `tests/test_check_contrato.py` y `tests/test_markdown_tables.py`, con la suite completa y los checkers existentes en verde sin excepciones temporales ni baseline incompleta.
## Tasks

#### S1.T1 — Crear `scripts/lib/markdown_tables.py` con el parser reutilizable de frontmatter (`leer_frontmatter`) y de tablas (`filas_tabla`) extraído de `scripts/check_backlog.py:59-91`, más el parser de la matriz perfil × capacidad de `docs/product/tecnologia/14_catalogo_de_vistas_y_capacidades.md:337`.
Contrato: rollback: Eliminar `scripts/lib/markdown_tables.py`; ningún consumidor lo importa todavía.. Status: done

#### S1.T2 — Refactorizar `scripts/check_backlog.py` para importar `leer_frontmatter` y `filas_tabla` desde `scripts/lib/markdown_tables.py` y eliminar las copias locales, preservando exactamente la salida actual.
Contrato: rollback: Restaurar las funciones locales en `check_backlog.py` y quitar el import del módulo compartido.. Status: done

#### S1.T3 — Reestructurar la sección 11 del documento 20 (`docs/product/tecnologia/20_modelo_de_datos_v2_incremental.md:694`) en la tabla `| Restricción | Entidad | Motivo |` y agregar las tablas `| Entidad | Campo | Referencia | Cardinalidad |` y `| Entidad | Campo de estado | Valores |`, sin perder ninguna regla de la lista.
Contrato: rollback: Revertir `20_modelo_de_datos_v2_incremental.md` a la lista de viñetas original de la sección 11.. Status: done

#### S1.T4 — Agregar `tests/test_markdown_tables.py` (parser de frontmatter y tablas, matriz del documento 14, lectura de las tres tablas del documento 20) y verificar la regresión de `check_backlog.py` y `check_citas.py`.
Contrato: rollback: Eliminar `tests/test_markdown_tables.py`.. Status: done

#### S2.T1 — Anotar la línea base de metadata OpenAPI en `server/contract/openapi.yaml` (entidades escritas, política sin red y reemplazos).
Contrato: rollback: Revertir `server/contract/openapi.yaml` al commit previo; las extensiones son aditivas y no tienen consumidor publicado.. Status: done

#### S2.T1.1 — Agregar `x-entidades-escritas` (lista no vacía, sin duplicados, con identificadores canónicos del documento 20) a las 71 operaciones REST de escritura salvo `/sync`, y verificar que las claves de `x-capacidad-por-operacion` de `/sync` (`server/contract/openapi.yaml:1627`) coincidan con su `oneOf` discriminado por `entidad`.
Contrato: rollback: Quitar las extensiones `x-entidades-escritas` agregadas.. Status: done

#### S2.T1.2 — Agregar `x-client-offline-policy` con un `sin-red` de la enumeración a las 72 operaciones de escritura, sin excluir públicas ni administrativas.
Contrato: rollback: Quitar la extensión `x-client-offline-policy` agregada.. Status: done

#### S2.T1.3 — Agregar `x-replace-semantics` con `alcance` y `omitidos` válidos a `asignarCapacidadesPerfil` (`server/contract/openapi.yaml:4491`) y `asignarPerfilesCuenta` (`server/contract/openapi.yaml:4019`).
Contrato: rollback: Quitar la extensión `x-replace-semantics` de ambas operaciones.. Status: done

#### S2.T2 — Agregar pruebas de cobertura de anotaciones (71/71 entidades vía `check_sondas_readiness.py`, 72/72 política sin red y 2/2 reemplazos) y de enumeraciones válidas.
Contrato: rollback: Eliminar las pruebas nuevas de cobertura de metadata.. Status: done

#### S2.T2.1 — Agregar pruebas de cobertura de `x-entidades-escritas`: que `check_sondas_readiness.py` reporta 71/71 escrituras REST con lista no vacía y sin duplicados, y que una escritura sin la extensión o con entidad desconocida/duplicada hace fallar la verificación.
Contrato: rollback: Eliminar las pruebas de cobertura de entidades escritas.. Status: done

#### S2.T2.2 — Agregar pruebas de presencia y cobertura de `x-client-offline-policy` en las 72 escrituras (incluidas públicas y administrativas), y que un valor `sin-red` fuera de {encolar-sync,bloquear-y-reintentar,omitir-hasta-conexion} hace fallar la verificación.
Contrato: rollback: Eliminar las pruebas de cobertura de política sin red.. Status: done

#### S2.T2.3 — Agregar pruebas de `x-replace-semantics` en `asignarCapacidadesPerfil` y `asignarPerfilesCuenta` (2/2) con `alcance` y `omitidos` en enumeración válida, y que un valor fuera de enumeración hace fallar la verificación.
Contrato: rollback: Eliminar las pruebas de reemplazos y sus enumeraciones.. Status: done

#### S3.T1 — Agregar `x-preconditions` a `aceptarInvitacion` (`server/contract/openapi.yaml:536`) y `reenviarInvitacion` (`server/contract/openapi.yaml:3724`), agregar `x-preconditions-por-operacion` con `cuando` obligatorio para el descarte de consulta y la corrección de la última tirada, e inventariar las operaciones que declaran `conflicto_estado` dejando el motivo de los casos no contractuales para la evidencia del PR.
Contrato: rollback: Quitar las extensiones de precondiciones y el inventario de `conflicto_estado`.. Status: done

#### S3.T2 — Documentar en el preámbulo del contrato las extensiones `x-entidades-escritas`, `x-replace-semantics`, `x-preconditions`, `x-preconditions-por-operacion` y `x-client-offline-policy`, y subir la versión patch en `server/contract/openapi.yaml:5`.
Contrato: rollback: Revertir el preámbulo y la línea `version` del contrato a 2.4.0.. Status: done

#### S3.T3 — Crear `docs/product/tecnologia/28_matriz_preparacion_sondas_kanai.md` con las ocho familias de sondas, su fuente parseable o su bloqueo explícito, sin declarar ninguna activa.
Contrato: rollback: Eliminar `docs/product/tecnologia/28_matriz_preparacion_sondas_kanai.md`.. Status: done

#### S3.T4 — Agregar pruebas de forma y enumeración de `x-preconditions`/`x-preconditions-por-operacion` (incluido `cuando` y sus operadores), de coherencia de la matriz con las ocho `PROBE_KINDS` y de la versión patch del contrato.
Contrato: rollback: Eliminar las pruebas nuevas de precondiciones, matriz y versión.. Status: done

#### S4.T1 — Implementar `scripts/check_contrato.py` con `yaml.safe_load` y las reglas 1-7 de `docs/product/decisiones/DEC-236-convenciones-para-sondas-de-intake.md:248`, sin expresiones regulares sobre el contrato y con mensajes que nombren operationId, método, path y regla incumplida.
Contrato: rollback: Eliminar `scripts/check_contrato.py`.. Status: done

#### S4.T2 — Agregar `tests/test_check_contrato.py` y sus fixtures (contrato válido, un caso inválido por regla, YAML inválido y una restricción de unicidad duplicada).
Contrato: rollback: Eliminar `tests/test_check_contrato.py` y sus fixtures.. Status: done

#### S4.T3 — Integrar `python3 scripts/check_contrato.py` al gate documental mediante el workflow existente `.github/workflows/contract.yml` y la lista de comandos documentales de `docs/product/tecnologia/17_estrategia_ci_cd_y_calidad.md` §8 y `docs/backlog/README.md`.
Contrato: rollback: Quitar el paso de `check_contrato.py` del workflow y la referencia del comando en la documentación.. Status: done

#### S4.T4 — Correr la regresión completa (`python3 -m unittest discover -s tests` y los checkers existentes `check_backlog.py`, `check_citas.py`, `check_cobertura.py`, `check_sondas_readiness.py`) y dejar la verificación del contrato en verde, sin excepciones temporales ni baseline incompleta.
Contrato: rollback: No aplica: la tarea solo ejecuta verificación y no modifica archivos.. Status: done

#### S5.T1 — (f1) Ampliar el trigger del job `contract` en `.github/workflows/contract.yml` para que tambien corra ante cambios en `docs/product/**` y `scripts/**`, ademas de los paths ya declarados (contrato OpenAPI). Mantener el resto del workflow sin cambios y verificar con `act`/inspeccion del YAML que la sintaxis de `paths` sigue valida.
Contrato: rollback: Revertir el bloque `on.pull_request.paths` / `on.push.paths` de `.github/workflows/contract.yml` a la lista previa; no hay estado persistido.. Status: done

#### S5.T2 — (f2) Declarar la dependencia PyYAML de forma explicita (archivo de requirements de los checkers o instalacion en el step de CI) y fijar `python3` como interprete en el paso que ejecuta `scripts/check_contrato.py` en `.github/workflows/contract.yml`, para que el gate no dependa del interprete por defecto del runner ni de una libreria preinstalada.
Contrato: rollback: Revertir el requirements agregado y restaurar el step original del workflow; sin migracion ni estado.. Status: done

#### S5.T3 — (f4) En `docs/product/tecnologia/20_modelo_de_datos_v2_incremental.md` §11, renombrar el campo de estado `acción` de `ciclo_practica` a `accion` y normalizar los valores de `evento_plan.tipo` a identificadores snake_case canonicos en la tabla `| Entidad | Campo de estado | Valores |`. No agregar ni eliminar reglas; solo normalizar identificadores para que el parser compartido y `check_contrato.py` los consuman sin ambiguedad de acentos ni de formato.
Contrato: rollback: Revertir las celdas modificadas de la tabla §11 del documento 20 a sus valores previos (`acción` y los valores originales de `evento_plan.tipo`).. Status: done

#### S5.T4 — (f5) Acotar el vocabulario canonico de entidades en `scripts/check_contrato.py` a las entidades realmente declaradas en el documento 20, de modo que identificadores legacy (por ejemplo `paso_unidad`) sean rechazados como entidad desconocida, sin romper la validacion de las 37 entidades declaradas ni la cobertura actual de `x-entidades-escritas`.
Contrato: rollback: Restaurar el conjunto de entidades aceptadas previo en `scripts/check_contrato.py`; cambio local al checker, sin efecto sobre el contrato.. Status: done

#### S5.T5 — (c1) Corregir `x-entidades-escritas` en las operaciones de revelado/exportacion (`revelarCodigoUnidad`, `exportarUnidades`, `revelarDatosConsultante`, `exportarEstadisticas`, `exportarAuditoria`) de `server/contract/openapi.yaml` para que declaren la entidad cuya persistencia la operacion modifica realmente (traza de revelado/exportacion), usando identificadores canonicos del documento 20. Mantener la version del contrato en 2.4.1 y el cambio aditivo (solo correccion de valores, sin quitar la extension de ninguna escritura).
Contrato: rollback: Revertir los valores de `x-entidades-escritas` de esas cinco operaciones a los declarados previamente en `server/contract/openapi.yaml`.. Status: done

#### S5.T6 — (f6) Refactorizar `tests/test_contrato_metadata.py` para que importe y reutilice los validadores de `scripts/check_contrato.py` en vez de reimplementar la logica de validacion, eliminando la duplicacion y garantizando que el test falle cuando el checker cambie de reglas. Conservar la misma cobertura de casos actual.
Contrato: rollback: Restaurar la version previa de `tests/test_contrato_metadata.py` con sus validadores propios; sin impacto en el checker ni en el contrato.. Status: done

#### S5.T7 — (f7) Migrar `scripts/export_github_backlog.py` al parser compartido `scripts/lib/markdown_tables.py`, eliminando su parseo propio de frontmatter/tablas y verificando que la salida exportada sea identica a la anterior (comparacion del output antes y despues sobre el backlog vigente).
Contrato: rollback: Restaurar el parseo propio en `scripts/export_github_backlog.py`; el modulo compartido queda intacto para los demas consumidores.. Status: done

#### S5.T8 — Correr la bateria completa de gates tras las correcciones f1/f2/f4/f5/f6/f7 y c1: `python3 scripts/check_contrato.py`, `python3 scripts/check_sondas_readiness.py`, `python3 -m unittest discover -s tests`, `python3 scripts/check_backlog.py --resumen`, `python3 scripts/check_citas.py`, `python3 scripts/check_cobertura.py`. Confirmar cobertura de escrituras sin regresion, 2/2 reemplazos, version del contrato en 2.4.1 y cero excepciones temporales.
Contrato: rollback: No aplica: verificacion sin cambios de codigo.. Status: done
## Sessions

### Session 1 · T1 · continue

**Tasks:**
- [x] S1.T1
- [x] S1.T2
- [x] S1.T3
- [x] S1.T4

**Gate (auto)**: El módulo compartido se importa desde `check_backlog.py` sin cambiar su salida, el documento 20 §11 tiene las tres tablas estructuradas y `python3 -m unittest discover -s tests` y `python3 scripts/check_backlog.py --resumen` quedan verdes.

### Session 2 · T3 · continue

**Tasks:**
- [x] S2.T1
- [x] S2.T1.1
- [x] S2.T1.2
- [x] S2.T1.3
- [x] S2.T2
- [x] S2.T2.1
- [x] S2.T2.2
- [x] S2.T2.3

**Gate (auto)**: El contrato queda anotado en su línea base: `check_sondas_readiness.py` reporta `71/71 escrituras REST con lista válida`, las 72 escrituras tienen política sin red y las 2 operaciones de reemplazo declaran `x-replace-semantics`.

### Session 3 · T2 · continue

**Tasks:**
- [x] S3.T1
- [x] S3.T2
- [x] S3.T3
- [x] S3.T4

**Gate (auto)**: El contrato declara las precondiciones de la línea base y las variantes de `/sync` con `cuando`, el preámbulo documenta las extensiones, la versión es 2.4.1 y existe `docs/product/tecnologia/28_matriz_preparacion_sondas_kanai.md` con las ocho familias sin declararlas activas.

### Session 4 · T2 · continue

**Tasks:**
- [x] S4.T1
- [x] S4.T2
- [x] S4.T3
- [x] S4.T4

**Gate (auto)**: `python3 scripts/check_contrato.py` informa 72/72 y 2/2 y sale con código 0; un fixture inválido falla nombrando operationId, método, path y regla; el comando corre en el gate y la suite `unittest` queda verde.

### Session 5 · T1 · continue

**Tasks:**
- [x] S5.T1
- [x] S5.T2
- [x] S5.T3
- [x] S5.T4
- [x] S5.T5
- [x] S5.T6
- [x] S5.T7
- [x] S5.T8

**Gate (auto)**: Correcciones de la review kn-dredd aplicadas: f1 (trigger del workflow cubre docs/ y scripts/), f2 (dependencia de PyYAML declarada en CI), f4 (identificadores canónicos en doc 20 §11), f5 (vocabulario canónico acotado al modelo), f6 (tests reusan los validadores del checker), f7 (export_github_backlog usa el parser compartido), c1 (entidades escritas correctas en operaciones de revelado/exportación). Los gates existentes y check_contrato.py quedan en verde.
## Enmiendas (refine_spec)

### Enmienda 1

**Tasks agregadas:**

- S5: (f1) Ampliar el trigger del job `contract` en `.github/workflows/contract.yml` para que tambien corra ante cambios en `docs/product/**` y `scripts/**`, ademas de los paths ya declarados (contrato OpenAPI). Mantener el resto del workflow sin cambios y verificar con `act`/inspeccion del YAML que la sintaxis de `paths` sigue valida. (valida: REQ-09; rollback: Revertir el bloque `on.pull_request.paths` / `on.push.paths` de `.github/workflows/contract.yml` a la lista previa; no hay estado persistido.)
- S5: (f2) Declarar la dependencia PyYAML de forma explicita (archivo de requirements de los checkers o instalacion en el step de CI) y fijar `python3` como interprete en el paso que ejecuta `scripts/check_contrato.py` en `.github/workflows/contract.yml`, para que el gate no dependa del interprete por defecto del runner ni de una libreria preinstalada. (valida: REQ-08, REQ-09; rollback: Revertir el requirements agregado y restaurar el step original del workflow; sin migracion ni estado.)
- S5: (f4) En `docs/product/tecnologia/20_modelo_de_datos_v2_incremental.md` §11, renombrar el campo de estado `acción` de `ciclo_practica` a `accion` y normalizar los valores de `evento_plan.tipo` a identificadores snake_case canonicos en la tabla `| Entidad | Campo de estado | Valores |`. No agregar ni eliminar reglas; solo normalizar identificadores para que el parser compartido y `check_contrato.py` los consuman sin ambiguedad de acentos ni de formato. (valida: REQ-02, REQ-08; rollback: Revertir las celdas modificadas de la tabla §11 del documento 20 a sus valores previos (`acción` y los valores originales de `evento_plan.tipo`).)
- S5: (f5) Acotar el vocabulario canonico de entidades en `scripts/check_contrato.py` a las entidades realmente declaradas en el documento 20, de modo que identificadores legacy (por ejemplo `paso_unidad`) sean rechazados como entidad desconocida, sin romper la validacion de las 37 entidades declaradas ni la cobertura actual de `x-entidades-escritas`. (valida: REQ-03, REQ-08; rollback: Restaurar el conjunto de entidades aceptadas previo en `scripts/check_contrato.py`; cambio local al checker, sin efecto sobre el contrato.)
- S5: (c1) Corregir `x-entidades-escritas` en las operaciones de revelado/exportacion (`revelarCodigoUnidad`, `exportarUnidades`, `revelarDatosConsultante`, `exportarEstadisticas`, `exportarAuditoria`) de `server/contract/openapi.yaml` para que declaren la entidad cuya persistencia la operacion modifica realmente (traza de revelado/exportacion), usando identificadores canonicos del documento 20. Mantener la version del contrato en 2.4.1 y el cambio aditivo (solo correccion de valores, sin quitar la extension de ninguna escritura). (valida: REQ-03; rollback: Revertir los valores de `x-entidades-escritas` de esas cinco operaciones a los declarados previamente en `server/contract/openapi.yaml`.)
- S5: (f6) Refactorizar `tests/test_contrato_metadata.py` para que importe y reutilice los validadores de `scripts/check_contrato.py` en vez de reimplementar la logica de validacion, eliminando la duplicacion y garantizando que el test falle cuando el checker cambie de reglas. Conservar la misma cobertura de casos actual. (valida: REQ-08, REQ-09, test; rollback: Restaurar la version previa de `tests/test_contrato_metadata.py` con sus validadores propios; sin impacto en el checker ni en el contrato.)
- S5: (f7) Migrar `scripts/export_github_backlog.py` al parser compartido `scripts/lib/markdown_tables.py`, eliminando su parseo propio de frontmatter/tablas y verificando que la salida exportada sea identica a la anterior (comparacion del output antes y despues sobre el backlog vigente). (valida: REQ-01; rollback: Restaurar el parseo propio en `scripts/export_github_backlog.py`; el modulo compartido queda intacto para los demas consumidores.)
- S5: Correr la bateria completa de gates tras las correcciones f1/f2/f4/f5/f6/f7 y c1: `python3 scripts/check_contrato.py`, `python3 scripts/check_sondas_readiness.py`, `python3 -m unittest discover -s tests`, `python3 scripts/check_backlog.py --resumen`, `python3 scripts/check_citas.py`, `python3 scripts/check_cobertura.py`. Confirmar cobertura de escrituras sin regresion, 2/2 reemplazos, version del contrato en 2.4.1 y cero excepciones temporales. (valida: REQ-01, REQ-02, REQ-03, REQ-08, REQ-09, test; rollback: No aplica: verificacion sin cambios de codigo.)

