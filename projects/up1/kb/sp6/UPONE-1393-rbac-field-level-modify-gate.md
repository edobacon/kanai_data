# UPONE-1393 — Asimetría RBAC en core: el permiso field-level de escritura no habilita edición granular

> **Para**: team core / reviewers de `object-manager`.
> **Origen**: análisis del enforcement de capabilities al implementar los roles estándar de `curriculum-design` ([UPONE-1393](https://u-planner.atlassian.net/browse/UPONE-1393)).
> **Naturaleza**: candidato a **fix de plataforma** independiente de 1393. Este doc **presenta el caso**; no propone tocar core sin decisión del team.
> **Archivos de core involucrados** (solo lectura para este análisis): `src/services/auth/authChecker.js`, `src/services/auth/withAuth.js`, `src/graphql/resolvers/instance.resolver.js`.

---

## TL;DR

- **Lo esperado**: tener la capability field-level `objeto.campo:modify` debería permitir editar **solo ese campo** aunque el usuario no tenga el `objeto:modify` object-level. La lógica para eso **existe** en `checkFieldPermissions` (override jerárquico documentado).
- **Lo que pasa**: en la práctica **no funciona para escritura**. La mutación `updateInstance` corre primero un gate object-level (`withObjectAuth('modify')` → `checkObjectPermissions`) que **solo tiene fallback field-level para `view`, no para `modify`**. El usuario con solo `objeto.campo:modify` es rechazado en la puerta, antes de llegar a `checkFieldPermissions`.
- **No es una regresión**: el fallback field-level de `checkObjectPermissions` **nació view-only** (commit `1917ef8`). El modify-por-field-cap nunca pasó la puerta. Es una **funcionalidad incompleta**, no algo que un cambio rompió.
- **Impacto**: afecta a **hijos directos** (objetos base vía `updateInstance`/`updateBulkInstances`) y a **hijos polimórficos** (RecordTypes `rt__*` vía el override del mod), con un matiz de seguridad distinto en cada uno (ver §5).
- **Por qué importa a 1393**: bloquea la separación de funciones "transiciona el estado pero no edita todo el objeto". Sin este fix, un rol como *Revisor Curricular* necesita `objeto:modify` (edita todo) para poder aprobar.

---

## 1. Qué se quiere hacer (desde el ticket)

UPONE-1393 crea 4 roles con **separación de funciones** sobre el ciclo de vida curricular:

| Rol | Debe poder | **No** debe poder |
|---|---|---|
| Consultor Curricular | leer / auditar | escribir |
| Diseñador Curricular | crear/editar/versionar/clonar, enviar a revisión | aprobar / publicar / revertir / eliminar |
| Revisor Curricular | **aprobar** (InReview→Approved) | editar contenido / publicar |
| Autoridad Curricular | publicar, revertir, deprecar, archivar, eliminar | — |

El caso conflictivo es **"cambiar el estado sin poder editar el resto de los campos"** (Revisor aprueba; Autoridad publica/revierte). El cambio de estado se implementa como una **escritura del campo `status`** vía `updateInstance` (motor enum de core, `enforceEnumTransitions`). La forma natural de expresar "solo puede tocar `status`" sería una capability field-level: `activity.status:modify`.

---

## 2. Cómo se intentaría hacer

Dos caminos posibles con el modelo actual de RBAC:

- **Object-level** — cablear `activity:modify` al rol. Funciona, pero `modify` object-level **concede todos los campos** ([authChecker.js:373](../../up1/object-manager/src/services/auth/authChecker.js)). El Revisor podría editar cualquier campo de contenido → rompe la separación de funciones.
- **Field-level** — cablear `activity.status:modify` (+ la cap de transición `activity:approve`). Es lo que el equipo asume disponible: "si tienes `objeto.columna:modify` editas ese campo granularmente". **Este es el camino que falla.**

---

## 3. Qué está pasando y por qué se rompe

El enforcement de una escritura tiene **dos capas**, y corren en este orden dentro de `updateInstance` ([instance.resolver.js:3848-4075](../../up1/object-manager/src/graphql/resolvers/instance.resolver.js)):

```
updateInstance
  └─ withObjectAuth('modify')            ← CAPA 1: gate object-level (puerta de entrada)
        └─ checkObjectPermissions(objectType, 'modify')
  └─ checkFieldPermissions(user, objectType, camposCambiados, 'modify')   ← CAPA 2: granular
  └─ enforceEnumTransitions(...)         ← CAPA 3: capability por transición
```

### Capa 2 (`checkFieldPermissions`) — el mecanismo granular SÍ existe

[authChecker.js:361-375](../../up1/object-manager/src/services/auth/authChecker.js) — por cada campo cambiado:

1. si existe `base.campo:modify` → permite ese campo (**override field-level, precede al object-level**)
2. si es RT y existe `base:rt.campo:modify` → permite
3. si tiene object-level (`base:modify` o `base:rt:modify`) → permite todos
4. si no → lanza error

El docstring lo confirma: *"If a field-specific capability exists, it takes precedence (can override object-level permission)"*. En aislamiento, `activity.status:modify` autorizaría editar solo `status`.

### Capa 1 (`checkObjectPermissions`) — la puerta que bloquea

[authChecker.js:232-313](../../up1/object-manager/src/services/auth/authChecker.js). Para `action` cualquiera:

1. ¿tiene `objeto:modify` (object-level)? → pasa
2. ¿es RT y tiene `base:rt:modify`? → pasa
3. **`if (action === 'view')`** → recién ahí revisa caps field-level y deja pasar ([línea 285](../../up1/object-manager/src/services/auth/authChecker.js))
4. si no → **lanza `"You do not have permission to modify … objects"`**

**El bloque field-level del paso 3 está guardado por `action === 'view'`.** Para `modify` se salta. Traza con un usuario que tiene `{ activity.status:modify, activity:approve }` (sin `activity:modify`):

- paso 1: `activity:modify` ausente → sigue
- paso 2: no es RT → sigue
- paso 3: `action` es `'modify'` ≠ `'view'` → **se salta el fallback field-level**
- → **throw**. Nunca llega a la Capa 2.

**Conclusión**: la capacidad field-level de escritura es **inalcanzable** vía `updateInstance`, salvo que el usuario ya tenga object-level modify — en cuyo caso la field-level es redundante. El feature "editar campo granular" funciona **end-to-end para `view`** (Capa 1 abre la puerta con field-caps de view y la lectura filtra columnas), pero **no para `modify`**.

### Notas de precisión

- El naming real de la acción es **`modify`**, no `edit`. El resolver pasa `'modify'` hardcodeado ([instance.resolver.js:4075](../../up1/object-manager/src/graphql/resolvers/instance.resolver.js)); no hay mapeo `edit→modify`. Una cap `objeto.campo:edit` **ni siquiera matchea**.
- Hoy `curriculum-design/capabilities.json` **no declara ninguna cap field-level** → el caso ni se puede probar todavía.

---

## 4. No es una regresión (evidencia git)

`checkObjectPermissions` en su origen simplemente lanzaba si faltaba la cap object-level — **sin ningún fallback field-level**. El fallback se agregó después, **ya scopeado a `view`**:

- commit `1917ef8` (*"resolvers change"*): introduce el bloque `if (action === 'view') { … field-level view caps … }`.
- commit `d560ed1` (*"add record type RBAC capabilities…"*): extiende ese **mismo** bloque view-only para cubrir field-caps de RecordTypes (`base:rt.campo:view`).

Es decir: **el modify-por-field-cap nunca existió en la Capa 1**. El intent de diseño está presente (la Capa 2 sí lo soporta, con docstring explícito), pero la puerta de entrada solo se abrió para `view`. Es una **implementación incompleta de un feature intencionado**, no un cambio que rompió algo que funcionaba.

---

## 5. Impacto: hijos directos e hijos polimórficos

El gate está en la escritura, así que afecta **todo lo que se escribe por estos paths**. Con un matiz de seguridad clave entre ambos:

### 5.1 Hijos directos (objetos base: Activity, Curriculum, etc.)

- Path: `updateInstance` genérico → Capa 1 (`modify`) **+** Capa 2 (`checkFieldPermissions` sobre campos cambiados, [línea 4075](../../up1/object-manager/src/graphql/resolvers/instance.resolver.js)).
- Estado: field-modify **bloqueado en la puerta**. Pero como la Capa 2 **sí** existe aquí, abrir la puerta para field-caps sería **seguro**: la granularidad la enforça `checkFieldPermissions` campo a campo.
- `updateBulkInstances` ([línea 4459](../../up1/object-manager/src/graphql/resolvers/instance.resolver.js)) también usa `withObjectAuth('modify')` **pero NO llama a `checkFieldPermissions`** (la única llamada está en `updateInstance`). ⚠️ Si se abre la puerta para field-caps sin agregar la Capa 2 al bulk, un usuario con solo field-cap podría editar **cualquier** campo en masa → **hueco de escalamiento**.

### 5.2 Hijos polimórficos (RecordTypes `rt__*__curricularsection`)

- Path: override del mod `polymorphicUpdateMutation` → `rtUpdateHandler` envuelto **solo** con `withObjectAuth('modify')` ([polymorphicUpdate.resolver.js:613](../../up1/object-manager/src/graphql/resolvers/mods/curriculum-design/polymorphicUpdate.resolver.js)). **No hay llamada a `checkFieldPermissions` en este handler.**
- Capa 1 para RT: `checkObjectPermissions` parsea el RT y chequea `base:modify` (paso 1) y `base:rt:modify` (paso 2); el fallback field-level sigue siendo **view-only** (los caps RT field-level solo se consideran para `view`, [líneas 291-298](../../up1/object-manager/src/services/auth/authChecker.js)).
- Estado: field-modify **doblemente no soportado** — bloqueado en la puerta **y** sin Capa 2 en el handler. ⚠️ Un fix que solo abra la puerta para field-caps en RT, sin agregar enforcement field-level al handler polimórfico, sería un **hueco** (editaría todos los campos del RT).

> **Resumen del impacto**: el bloqueo es simétrico (ambos afectados), pero **la seguridad del arreglo no lo es**: en hijos directos vía `updateInstance` el fix es seguro por la Capa 2 preexistente; en bulk y en el path polimórfico **hay que agregar la Capa 2** o el fix introduce escalamiento de privilegios.

---

## 6. Alternativas / líneas de arreglo a evaluar

### L1 — Fix de raíz en core: simetría `view`/`modify` en el fallback field-level *(recomendada como "lo correcto")*

Extender el paso 3 de `checkObjectPermissions` para que **también** deje pasar cuando el usuario tenga caps field-level de la acción solicitada (no solo `view`). Con esto, `objeto.campo:modify` abre la puerta y `checkFieldPermissions` hace cumplir el detalle campo a campo.

- **Pros**: arregla el feature de raíz, transversal a todos los objetos/mods; habilita la separación de funciones de 1393 sin mutaciones paralelas; consistente con el intent ya presente en la Capa 2.
- **Contras / qué revisar (bloqueante)**:
  1. **Bulk sin Capa 2**: agregar `checkFieldPermissions` a `updateBulkInstances` **antes** de abrir la puerta, o el fix es un hueco (§5.1).
  2. **Path polimórfico sin Capa 2**: agregar enforcement field-level al `rtUpdateHandler` del mod, o excluir RT del fix (§5.2).
  3. **Alcance de acciones**: scopear a `modify` (no tocar `create`/`delete`, que tienen semántica distinta y no corren `checkFieldPermissions`).
  4. **Blast radius**: afecta **toda** escritura de todos los objetos. Requiere tests de RBAC transversales.
  5. **RT field-caps**: replicar el manejo `base:rt.campo:modify` que hoy el bloque view ya hace para view.

### L2 — Helper compartido simétrico

Refactor: extraer la lógica de "¿hay field-caps de esta acción?" a un helper único usado por Capa 1 y Capa 2, parametrizado por acción. Misma corrección que L1 pero reduce duplicación y el riesgo de que view y modify vuelvan a divergir. Mismo blast radius que L1.

### L3 — Mutación de transición mod-owned (sin tocar core)

Un resolver del mod (p.ej. `transitionInstance(objectType, id, toStatus)`) gateado **solo** por la cap de transición, sin `withObjectAuth('modify')`.

- **Pros**: cero core; el mod ya registra mutaciones (precedente: `polymorphicUpdateMutation`).
- **Contras**: **path paralelo de escritura de `status`** → debe re-ejecutar `enforceEnumTransitions` **y** los guards de integridad que hoy viven en el override de `updateInstance` (suma exacta del árbol de evaluación al publicar — TICKET-061; bloqueo de plan activo), o se vuelve un **bypass**. Además reabre la consolidación hecha en UPONE-1381/P4 (que **retiró** justamente la mutación `transitionActivityValidated`). Solo cubre objetos del mod (Offering es cross-mod).

### L4 — Aceptar el caso (opción pragmática, sin core)

Cablear `objeto:modify` object-level a los roles que transicionan (Revisor, Autoridad).

- **Pros**: desbloquea 1393 ya, cero repos extra, UI y MCP funcionan igual.
- **Contras**: **diluye la separación de funciones** — quien aprueba/publica también puede editar contenido.

---

## 7. Recomendación

1. **Para no bloquear UPONE-1393**: cerrar con **L4** (dar `objeto:modify` a Revisor y Autoridad), documentando la limitación.
2. **En paralelo, elevar a core** este caso como **L1/L2** (fix de raíz de la asimetría `view`/`modify`), con los tres puntos bloqueantes de §6-L1 resueltos en el diseño (bulk, polimórfico, scope de acción). Es el arreglo que hace realidad la edición granular de escritura que el modelo de capabilities promete.
3. **Descartar L3** salvo que el negocio pida explícitamente "transiciona sin editar" **antes** de que core priorice L1: es deuda (path paralelo + guards a replicar) y contradice la consolidación de UPONE-1381.

---

## 8. Referencias de código

| Archivo | Punto | Rol en el caso |
|---|---|---|
| `src/services/auth/authChecker.js:232` | `checkObjectPermissions` | **Capa 1** — puerta; fallback field-level solo `view` (:285) |
| `src/services/auth/authChecker.js:331` | `checkFieldPermissions` | **Capa 2** — granular; soporta override field-level de `modify` (:361-375) |
| `src/services/auth/withAuth.js:122` | `withObjectAuth` | envuelve resolvers y dispara Capa 1 |
| `src/graphql/resolvers/instance.resolver.js:3848` | `updateInstance` | orden Capa1 → Capa2 (:4075) → Capa3 |
| `src/graphql/resolvers/instance.resolver.js:4459` | `updateBulkInstances` | Capa 1 **sin** Capa 2 (riesgo del fix) |
| `.../mods/curriculum-design/polymorphicUpdate.resolver.js:613` | `rtUpdateHandler` wrapped | path RT: Capa 1 **sin** Capa 2 (riesgo del fix) |
| commits `1917ef8`, `d560ed1` | git history | prueban que el fallback nació/creció **view-only** (no regresión) |
