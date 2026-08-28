---
id: DOC-kb-sp8-BUG-core-recordlist-harddelete-block-renders-as-load-error
project: up1
type: doc
---

# BUG core: un bloqueo legitimo de hard-delete en RecordList se renderiza como error de carga full-view con mensaje generico

> Registro de analisis (SP8). Fuente del incidente: reporte de Francisco Navarro (dev curriculum-mapping) al probar el borrado de esquemas de niveles en la rama `UPONE-1573`, investigado 2026-08-07. Este documento verifica el reporte contra el codigo real de las tres capas (resolver del mod, `useFriendlyErrors`, `RecordList.vue`), aisla el defecto de front del comportamiento correcto de backend, y define fix, malla de seguridad y plan de tests. No es un ticket: es el analisis previo que alimenta el ticket DKC.
>
> **Relacionado**: [[BUG-core-bulkdelete-rt-projection-false-restrict]] (mismo dominio: robustez del hard-delete en core). Ver seccion 10.

- **Modulo**: layout-engine core (`RecordList.vue` + composable `useFriendlyErrors`). El backend del mod NO tiene defecto.
- **Severidad**: media. No corrompe datos. Degrada de forma severa un rechazo legitimo: el usuario ve una pantalla de error full-view con texto generico en vez de un aviso accionable, y pierde la vista de la lista.
- **Alcance**: cualquier layout que use `customDeleteMutation` y cuyo resolver de borrado lance un error de dominio (no solo levelScheme: tambien coverageScheme, objectDefinition, y todo mod que gobierne su delete). El texto personalizado del backend nunca llega al usuario en NINGUN contexto (ver seccion 4), pero el borrado es donde ademas rompe la vista.
- **Estado**: diagnosticado y verificado contra codigo. Fix propuesto (Opcion A1) pendiente de implementar.

---

## 1. Sintoma

Al borrar el esquema de niveles "Escala 100 (cuantitativa)" (`code = LS-100`) desde el listado de LevelScheme:

1. El backend responde con un GraphQL error sobre `deleteLevelSchemeValidated`:
   ```
   No se puede eliminar un esquema en uso: al menos una matriz lo referencia.
   Inactivalo en su lugar: deja de ofrecerse en nuevas selecciones y no se pierde nada.
   ```
   con `extensions.code = "INTERNAL_SERVER_ERROR"`.
2. La UI **reemplaza toda la lista** por una pantalla roja: "Error al cargar rt__scheme__levelscheme / Ocurrio un error inesperado".

El mensaje util del backend ("inactivalo en su lugar") **nunca se ve**. El usuario ve un error generico de carga, como si la lista se hubiera roto.

---

## 2. Que paso (causa raiz precisa)

Son **tres hechos encadenados**, en dos capas. Solo los dos ultimos son defecto; el primero es correcto.

### 2.1 El backend bloquea BIEN (no es el bug)

`deleteLevelScheme` corre el guard R9 (`mods/curriculum-mapping/logic/levelScheme-upsert.resolver.js:483`): `assertSchemeNotInUse` -> `isLevelSchemeInUse` (`logic/helpers/schemeUsage.js:50`) hace `rt__Matrix__competencynode.findFirst({ levelSchemeId: id })`. El seed `seed/_data-competencynode.js` crea la matriz `MAT-GEN` apuntando a `LS-100`, asi que el esquema esta legitimamente en uso y el hard-delete (fisico, con cascada de niveles) se rechaza. **Esto es el comportamiento de dominio esperado.** Una escala NO referenciada por ninguna matriz se borra sin problema.

### 2.2 El code personalizado no llega al front (defecto habilitante)

`personalisedError` (`logic/helpers/personalisedError.js`) lanza un `Error` **plano**: `.message` = texto es interpolado, `.code` = propiedad custom del objeto Error. Apollo Server NO promueve esa `.code` a `extensions.code`: la serializa como `INTERNAL_SERVER_ERROR` (confirmado en el payload del sintoma). O sea, el unico dato estructurado que identificaria el error personalizado **se pierde** en la frontera GraphQL. Al front solo le llega el texto es en `.message`.

### 2.3 El front no reconoce el mensaje y lo trata como error critico de carga (el bug visible)

Dos sub-defectos en el core, ambos verificados:

**(a) `useFriendlyErrors` no hace passthrough del mensaje personalizado.** `layout/src/composables/useFriendlyErrors.ts` matchea por **texto** contra una lista cerrada de ~40 patrones (regex/substring, todos en ingles). No hay ninguno para el sufijo `_PERSONALISED_ERROR` ni para el texto en español. El mensaje del backend no matchea nada -> cae al `DEFAULT_ERROR` (`useFriendlyErrors.ts:414`): "An unexpected error occurred" / "Ocurrio un error inesperado", severity `error`. El `{passthrough}` existe, pero solo esta cableado a patrones hardcodeados (ej. `Formula validation failed`), no al sufijo de la convencion.

**(b) `handleCriticalDeleteConfirm` escribe el error en el ref de CARGA de la lista.** `layout/src/layouts/RecordList/RecordList.vue:6416`: el `catch` del borrado hace `error.value = 'Error deleting record: ' + err.message`. Ese `error` es **el mismo ref** que gobierna el `<ErrorState>` full-view de la lista (`RecordList.vue:60`, `v-if="error"`, titulo `recordList.errors.loadError`). Resultado: en vez de un toast descartable, se reemplaza la vista entera, y el mensaje se pasa por `translateError(error)` (el mismo matcher de (a)) que devuelve el generico.

---

## 3. El bloqueo es correcto; lo roto es como se muestra

Igual que en [[BUG-core-bulkdelete-rt-projection-false-restrict]] la clave fue separar "que se bloquea" de "que se ejecuta", aca la clave es separar **el rechazo de dominio (correcto)** de **su renderizado (roto)**:

| Aspecto | Estado |
|---|---|
| Hard-delete de esquema EN USO bloqueado (guard R9) | Correcto por diseño. No es bug. |
| Hard-delete de esquema LIBRE | Funciona (se borra). |
| El texto del backend "inactivalo en su lugar" llega al usuario | NO (defecto 2.2 + 2.3a). |
| La lista sobrevive a un delete fallido | NO: se reemplaza por ErrorState (defecto 2.3b). |
| Soft-delete / Inactivar (`setLevelSchemeActive`) | Correcto: no pasa por el guard; se expone como rowAction `type: mutation` con toast. |

---

## 4. Por que el delete es la superficie que importa (y no el upsert)

El defecto 2.2/2.3a es transversal: NINGUN mensaje `_PERSONALISED_ERROR` del backend llega hoy al usuario. Pero el borrado es el unico lugar donde eso duele de verdad:

- **Upsert (crear/editar)**: el `LevelSchemeEditor` (custom component) valida en cliente reusando `formatPersonalisedError` ANTES de enviar (los codigos R1/R2/R5-R8/R11). El error de backend casi nunca aflora, y si aflora, es una carrera. La banda de validacion en vivo ya muestra el texto correcto.
- **RowAction mutation (Inactivar/Activar)**: `layout/src/composables/useRowMutation.ts:151` muestra `onError.notification` como toast via `$t(key)`. Es una key **estatica** (no passthrough del backend), pero es un toast y NO rompe la vista. Es el patron de referencia del comportamiento correcto.
- **customDeleteMutation (el caso)**: es el UNICO path que (a) nuke la vista entera y (b) muestra el generico. Ademas es el unico rechazo que el usuario no puede pre-ver en cliente, porque "en uso" es una query cross-tabla que solo el backend conoce.

El oraculo de correctitud existe: `useRowMutation` ya renderiza un error de mutation como toast sin tocar la vista. El fix lleva `customDeleteMutation` a **paridad** con ese path. Es el analogo de "llevar bulk a paridad con single" del bug hermano: no es especulativo, es alinear dos caminos que deberian coincidir.

---

## 5. Soluciones posibles

### Opcion A1: renderizar el error de `customDeleteMutation` como toast (passthrough), sin tocar el ref de carga (recomendada)

En `handleCriticalDeleteConfirm` (`RecordList.vue`), cambiar el manejo de error del path `customMutation`: mostrar el mensaje del backend con `showWarning`/`showErrorNotification` (passthrough directo del texto, que es user-ready por D-11) y **no** setear `error.value`. Espeja el comportamiento de `useRowMutation`.

- **Pros**: corrige ambos sintomas visibles (vista intacta + texto util) con una sola funcion; blast radius minimo (no toca `useFriendlyErrors`, ni el backend, ni el mod); aplica a TODOS los consumers de `customDeleteMutation` (coverageScheme, objectDefinition, etc.), no per-objeto; reversible; paridad con un path que ya funciona.
- **Contras**: acopla el toast al texto es del backend (aceptable hoy por D-11 es-only; el mensaje esta diseñado para mostrarse). No cierra la convencion `_PERSONALISED_ERROR` en el resto de la plataforma (queda como A2/follow-up).
- **Esfuerzo**: bajo, ~1.5 dia (2 SP) con la malla de tests de la seccion 7.

### Opcion A2: implementar la convencion `_PERSONALISED_ERROR` end-to-end (el fix "mayor", NO recomendada como respuesta a este incidente)

Que `useFriendlyErrors` reconozca el error personalizado y haga passthrough del mensaje del backend en toda la plataforma.

- **Bloqueante**: NO es un cambio de front. El code personalizado se pierde en `extensions` (llega como `INTERNAL_SERVER_ERROR`, seccion 2.2). Para keyear por `extensions.code` hay que **cambiar el backend de cada mod** para que lance un `GraphQLError` estructurado con `extensions.code`, y ademas threadear `extensions` hasta `translateError`. La alternativa (matchear el texto es en `useFriendlyErrors`) es fragil y acoplada al locale.
- **Contras**: toca `useFriendlyErrors` (composable compartido por RecordDetail, errores de carga, ErrorAlertModal) + backend transversal (curriculum-mapping, curriculum-design, cualquier mod). Riesgo de regresion sobre los ~40 patrones existentes y todo el render de errores. Superficie amplia.
- **Esfuerzo**: alto, 5+ SP. Ticket aparte.

### Opcion A2': contrato de errores estructurados backend->front (el fix "mayor" correcto, follow-up)

Si algun dia se quiere la convencion completa, la jugada es: (1) que el backend lance `GraphQLError` con `extensions.code` (+ params) para TODO `*_PERSONALISED_ERROR`, y (2) que `useFriendlyErrors` priorice `extensions.code` sobre el match por texto, con passthrough del mensaje ya interpolado. Cierra la clase entera "el texto del backend no llega al usuario" sin depender del locale ni del match por substring.

- **Pros**: elimina de raiz el defecto 2.2/2.3a para todos los mods y contextos (upsert, delete, rowAction).
- **Contras**: refactor transversal backend + core, superficie de regresion amplia, requiere matriz de tests que hoy no existe.
- **Esfuerzo**: alto. Follow-up de deuda tecnica, no respuesta a este incidente.

---

## 6. Por que A1 es mejor que A2 (aunque A2 parezca "mas consistente")

Mismo criterio que en [[BUG-core-bulkdelete-rt-projection-false-restrict]] seccion 6: "mayor" no es "mejor".

- **Blast radius**: A1 toca una funcion (`handleCriticalDeleteConfirm`). A2 toca un composable compartido por toda la plataforma + el backend de todos los mods.
- **Riesgo**: A1 solo cambia como se renderiza un delete fallido, y siempre a mejor. A2 puede regresar los ~40 patrones y todo el render de errores.
- **Evidencia de correctitud**: A1 lleva `customDeleteMutation` a paridad con `useRowMutation`, que ya funciona. A2 depende de un contrato (`extensions.code`) que hoy no existe en el wire.
- **Escalabilidad**: A1 arregla el render para TODOS los `customDeleteMutation` sin trabajo per-objeto. A2 "escala" en el papel pero al costo de un refactor coordinado.
- **Reversibilidad**: A1 es una edicion localizada trivial de revertir. A2 es un cambio de contrato de errores.

Recomendacion: **A1 ahora**, con **A2' anotado como follow-up de deuda tecnica**. Descartar A2 (el swap por match de texto o el keyeo por code sin el backend estructurado).

---

## 7. Malla de seguridad: que NO se puede romper al implementar A1

El cambio debe ser quirurgico sobre la rama `customMutation` del catch. Lo que debe sobrevivir intacto:

1. **Error de CARGA de la lista** sigue mostrando el `<ErrorState>` full-view (el path de `error.value` para fallos de fetch/filtro NO se toca). Este es el equivalente al "no sobre-excluir" del bug hermano: el fix afecta solo el borrado, no el ref de carga.
2. **customDeleteMutation exitoso** sigue con toast de exito + refetch (`fetchData(true)`).
3. **Bulk delete** (`handleDeleteConfirmed`, `RecordList.vue:6464/6514`) sigue usando su propio `bulkDeleteErrors` en el modal; no se toca.
4. **Otros consumers de `customDeleteMutation`** (ej. `deleteObjectDefinition` del editor de object-manager) siguen borrando y ahora muestran el error como toast, sin romper la vista.
5. **Precision del match**: cambiar SOLO la rama `if (customMutation)` del catch, no la rama de bulk ni el `error.value` de carga.

---

## 8. Analisis de tests

### 8.1 Cobertura existente

- `RecordList.spec` (Vitest, layout): cubre render y flujos de la lista. No hay test especifico de "customDeleteMutation que rechaza -> como se renderiza el error".
- `useFriendlyErrors.spec.ts`: cubre los patrones existentes. Ningun caso para el sufijo `_PERSONALISED_ERROR` ni para texto es (coherente: la convencion no esta implementada).

### 8.2 Por que la cobertura actual no nos protege

El path `handleCriticalDeleteConfirm` con `customMutation` que rechaza no tiene test. El comportamiento actual (escribir `error.value` y nuke la vista) no esta afirmado por ningun assert, asi que el bug pasa silencioso. Es el mismo patron del bug hermano: el flujo que falla es justo el que ningun test ejercita.

### 8.3 Orden de implementacion: los tests primero (igual que el bug hermano, seccion 8.4)

1. **Asegurar lo que ya funciona (VERDE sobre codigo actual, antes de tocar nada):**
   - Un error de CARGA (fetch/filtro) sigue mostrando el `<ErrorState>` full-view.
   - Un `customDeleteMutation` exitoso muestra toast de exito + refetch.
   - El bulk delete con errores sigue usando su modal `bulkDeleteErrors`.
   Si alguno sale rojo aca, el diagnostico esta mal y hay que revisar antes de seguir.
2. **Escribir el test que falla (RED del bug):** un `customDeleteMutation` que rechaza con un error de dominio -> assert que (a) se muestra un **toast** con el mensaje del backend y (b) la lista **no** se reemplaza (`error.value` queda null, el `<ErrorState>` no se monta). Rojo contra el codigo actual.
3. **Implementar A1:** el render por toast en la rama `customMutation` del catch.
4. **Cerrar:** `RecordList.spec` completo verde + verificacion viva (OM + suite + tenant UPU sembrado): borrar `LS-100` (en uso) muestra el toast "...inactivalo..." con la lista intacta; borrar una escala libre la elimina.

Nota: la verificacion viva es la que confirma el runtime real (DET-36); el unit de componente sirve de guard barato, no de reemplazo.

---

## 9. Referencias de codigo

- `mods/curriculum-mapping/logic/levelScheme-upsert.resolver.js`
  - `deleteLevelScheme` (475), `assertSchemeNotInUse` (353): guard R9. **Correcto, no se toca.**
- `mods/curriculum-mapping/logic/helpers/schemeUsage.js`
  - `isLevelSchemeInUse` (50): `rt__Matrix__competencynode.findFirst({ levelSchemeId })`.
- `mods/curriculum-mapping/logic/helpers/personalisedError.js`
  - `personalisedError`: Error plano con `.code` custom (se pierde en `extensions`). **Origen de 2.2.**
- `mods/curriculum-mapping/seed/_data-competencynode.js`
  - `MAT-GEN -> LS-100`: por que "Escala 100" esta en uso.
- `mods/curriculum-mapping/config/layouts/default_LevelScheme_list.json:82`
  - `customDeleteMutation: deleteLevelSchemeValidated` + `deleteWarning.type: critical`.
- `layout/src/composables/useFriendlyErrors.ts`
  - `ERROR_PATTERNS` (65): match por texto, sin patron para `_PERSONALISED_ERROR`. `DEFAULT_ERROR` (414), `translateError` (484). **Defecto 2.3a.**
- `layout/src/layouts/RecordList/RecordList.vue`
  - `handleCriticalDeleteConfirm` (6359): rama `customMutation` (6373), `catch` -> `error.value` (6416). **Punto del fix A1.**
  - `<ErrorState v-if="error">` (60): el ref compartido que rompe la vista.
  - Bulk delete (`handleDeleteConfirmed`, 6464/6514): path con `bulkDeleteErrors` propio; NO se toca.
- `layout/src/composables/useRowMutation.ts:151`
  - `onError.notification` -> toast via `$t(key)`. **Oraculo del comportamiento correcto (toast, vista intacta).**
- `layout/src/layouts/RecordDetail/recordDetailErrorHandling.ts`
  - Usa `useFriendlyErrors`; el editor valida en cliente, por eso el upsert no sufre el sintoma (seccion 4).

---

## 10. Relacion con BUG-core-bulkdelete-rt-projection-false-restrict

Ambos son **errores de hard-delete en core**, y son **complementarios**, pero NO deberian ir en el mismo ticket:

| | [[BUG-core-bulkdelete-rt-projection-false-restrict]] | Este (render del bloqueo) |
|---|---|---|
| Capa | object-manager (backend) | layout-engine (frontend) |
| Defecto | Bloqueo INCORRECTO (false RESTRICT por contar la proyeccion RT propia) | Renderizado INCORRECTO de un bloqueo correcto |
| Fix | `referenceValidationService.js` (exclusion quirurgica) | `RecordList.vue` (toast en vez de nuke) |
| Repo / execute_scope | object-manager | layout |
| Harness de test | integracion contra BD real | spec de componente Vue |

**Por que separados**: distinto workspace, distinto repo, distinto reviewer, distintas suites, e independientes (uno puede shippear sin el otro). Juntarlos violaria fases atomicas y la guarda de rama por repo destino.

**Por que relacionados (y por que importa registrarlo)**: forman la clase "robustez del hard-delete de cara al usuario en core". Y hay sinergia directa: aunque el bug hermano arregle el false-restrict del backend, un bloqueo legitimo que quede (ej. FK externa real) se seguiria viendo como "Error al cargar" hasta que aterrice ESTE fix. Uno corrige que se bloquee lo que no debe; el otro corrige que un bloqueo legitimo se comunique bien. Recomendacion: dos tickets DKC hermanos bajo el tema comun, cross-linkeados (esta relacion), no un ticket unico.
