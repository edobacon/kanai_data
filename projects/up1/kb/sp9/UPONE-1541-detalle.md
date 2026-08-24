# UPONE-1541 - Curriculum Design | Programa de asignatura | Ajustar Seed de requisitos para consistencia con capacidad actual del sistema

> Tarea · Prioridad Menor · Epic UPONE-1267 Curriculum Design · Asignado: Eduardo Bacon · Story Points en Jira: sin asignar
> Sprint: Migracion uAssessment SP9 (arrastre de SP8, no alcanzo a ejecutarse)
> Enlace: https://u-planner.atlassian.net/browse/UPONE-1541

## Fuente canonica (PO)

El ticket **no tiene descripcion en Jira**: el titulo es el unico enunciado del PO.

> Curriculum Design | Programa de asignatura | Ajustar Seed de requisitos para consistencia con
> capacidad actual del sistema

Sin comentarios ni adjuntos. En la planificacion de SP9 (2026-08-14) se registro como pendiente de
SP8 que se mueve al sprint siguiente, sin agregar alcance.

**Nota para postear en Jira:** al estar la descripcion vacia, todo este detalle va en la
**descripcion** del ticket, no como comentario.

## Historia de usuario

Como **disenador curricular** que abre el ejemplo sembrado del sistema, quiero que el arbol de
requisitos de ejemplo sea uno que yo mismo podria construir y mantener desde el editor, para no ver
propuesta una forma que no puedo replicar ni completar.

## Objetivo

Que el arbol de requisitos sembrado sea reproducible y editable con la capacidad real de la UI. El
seed hoy propone una forma que el usuario ve bien, pero que el alta no puede crear: eso convierte el
ejemplo en una promesa que el sistema no cumple.

## Alcance

**Dentro:**

1. Reestructurar el arbol EST200 del seed a la forma que produce el alta: `Group[OR]` contenedor en la
   raiz, un `Group[AND]` por via, hojas debajo.
2. Duplicar en cada via las dos condiciones que hoy son globales, para preservar su semantica (una
   condicion global bajo un OR dejaria de exigirse cuando se cumple la otra via).
3. Alinear los labels a los literales que persiste la UI, sin autorar ninguno: contenedores y hojas.
4. Declarar el momento en las hojas de via, para que las condiciones sean las que el selector produce.
5. Retirar el bloque electivo sembrado sobre el Plan, que no es reproducible ni visible en ninguna
   pantalla, y preservar el caso K-de-N sembrando un electivo alcanzable dentro de una via.
6. Cerrar el hueco de cobertura con una prueba que corra el loader real y asegure la forma resultante.

**Fuera:** cambios de esquema en el objeto de requisitos o sus RecordTypes; el motor que evalua el
avance del estudiante; habilitar la creacion de condiciones globales en el editor; completar la
edicion de una hoja; y el tratamiento del label como key traducible. Los cuatro ultimos quedan
registrados como limites del editor, no se abordan aca.

## Forma objetivo

```
Group[OR]  "Cualquiera de las vias"                    (raiz)
├─ Group[AND]  "Todos de la via"                       (se rinde como "Via 1")
│  ├─ RecordState  Calculo I (code)                    aprobado, antes
│  ├─ RecordState  Algebra Lineal (code)               aprobado, antes
│  ├─ MetricThreshold  creditos >= 60
│  └─ RecordState  Fundamentos de Programacion (code)  cursado, cualquiera, recomendado
└─ Group[AND]  "Todos de la via"                       ("Via 2")
   ├─ RecordState  Calculo II (code)                   aprobado, antes
   ├─ MetricThreshold  creditos >= 60
   └─ RecordState  Fundamentos de Programacion (code)  cursado, cualquiera, recomendado
```

Profundidad 3, dentro del techo del alta (4 solo con pool electivo). El nombre visible de cada via lo
pone el render ("Via N"), no el dato, igual que el verbo de las hojas.

### Labels a persistir

Cada label del seed debe coincidir con el literal que el alta aplica por defecto para ese tipo de
nodo: ninguno se autora a mano.

| Label actual | Pasa a | Origen |
|---|---|---|
| "Requisitos EST200" (raiz AND) | el nodo desaparece | la raiz pasa a ser el contenedor de vias |
| "Vía de ingreso" (OR) | "Cualquiera de las vias" | default del contenedor de vias |
| "Cálculo + Álgebra" (AND) | "Todos de la via" | default del grupo de via, y ademas nunca se muestra |
| "Aprobar {nombre}" (x4) | "{nombre} ({codigo})" | label derivado de la asignatura elegida |
| "≥ 60 créditos" | el literal que deriva la UI para la metrica | label derivado de operador y valor |
| "Cursar {nombre}" | "{nombre} ({codigo})" | idem hojas; el verbo lo prefija el render |
| "Electivo de Especialización" | el nodo se retira | bloque del Plan fuera del seed |

## Criterios de aceptacion (checkeables)

- [ ] Cada nodo del arbol sembrado corresponde a un nodo que el alta del editor puede crear: forma,
      profundidad, posicion del contenedor de vias y campos de cada hoja.
- [ ] Ninguna hoja del arbol sembrado queda fuera de una via.
- [ ] Ningun label del seed es autorado: todos coinciden con el literal que persiste la UI para ese
      tipo de nodo.
- [ ] Las condiciones que hoy son globales se siguen exigiendo en todas las vias tras el cambio.
- [ ] Existe una prueba que corre el loader real del seed y verifica la forma resultante (combinador de
      cada grupo, jerarquia por padre y campos de las hojas), de modo que un cambio futuro que la
      altere falle.
- [ ] El bloque electivo sobre el Plan ya no se siembra, y el seed conserva un ejemplo de electivo
      K-de-N que si es creable desde la UI.
- [ ] El retiro se propago a sus consumidores: el resultado que devuelve el loader, la linea de log del
      orquestador del seed y el test de entrada que la mockea quedan coherentes, sin referencias a un paso
      que ya no existe.
- [ ] El seed sigue siendo idempotente: correrlo dos veces no duplica el arbol ni deja nodos huerfanos.

## Definition of Done (checkeable)

> Aplica el estandar DoR/DoD del equipo (`sp9/estandar-DoR-DoD.md`). Ademas, especifico de este ticket:

- [ ] Verificado en el tenant UPU con evidencia runtime: abrir el requisito sembrado y uno creado a
      mano desde el editor, y contrastar lo que se ve (no solo el dato en base).
- [ ] Comprobado en runtime que el arbol sembrado se puede **extender** desde el editor (agregar una
      condicion a una via existente y agregar una via nueva) sin crear contenedores duplicados.
- [ ] Re-seed corrido sin duplicar ni dejar nodos huerfanos.
- [ ] Suite del mod verde; los tests existentes del seed siguen pasando.
- [ ] No se toco la logica de busqueda del contenedor ni la derivacion de vias (sin regresion de la
      capacidad entregada en UPONE-1378).
- [ ] Artefactos de sync/seed no commiteados.

## Tests minimos (checkeables; ampliables en ejecucion)

- [ ] Loader real del seed: la raiz es el contenedor de vias, cada via es un grupo con combinador de
      conjuncion, y no hay ninguna hoja fuera de una via.
- [ ] Cada hoja de condicion de curso declara estado y momento, con los valores que produce el selector
      de condicion de la UI.
- [ ] Las condiciones antes globales aparecen en todas las vias.
- [ ] Re-seed: no duplica el arbol.
- [ ] El bloque electivo sobre el Plan no se siembra.
- [ ] El orquestador del seed corre sin referencias muertas al bloque retirado, y el test de entrada que
      mockea el resultado del loader refleja la forma nueva.
- [ ] Regresion de alta sobre el arbol sembrado: agregar una condicion a una via existente la cuelga
      bajo esa via, y "nueva via" reusa el contenedor existente en vez de crear otro.
- [ ] Regresion de lectura: el arbol sembrado renderiza con su jerarquia real tras el cambio de datos.

## Factores transversales (checkeables)

- [ ] Permisos (RBAC): N/A. No cambia capabilities; el editor ya esta gateado por la capability de
      edicion del objeto.
- [ ] Historial / auditoria (DataLog): N/A. Cambio de datos de ejemplo, no de comportamiento auditable.
- [ ] Capa de lenguaje (i18n): los labels del seed son texto persistido, no keys, igual que los que
      graba la UI. La deuda de i18n del campo se evalua aparte y no entra aca.
- [ ] Accesibilidad (WCAG): N/A. No se modifica UI.
- [ ] Storybook: N/A. No hay componente nuevo ni modificado.
- [ ] Design tokens: N/A.
- [ ] Documentacion: aplica. Quedan registrados los limites de alta y de edicion del editor, y el
      motivo del retiro del bloque electivo del Plan.
- [ ] Convenciones de mod: aplica. Seed idempotente, tenant isolation, `npm run sync` corrido sin
      editar archivos sincronizados a mano.

## Dependencias

Depende de UPONE-1378 (Finalizada), que construyo el editor y el alta con vias. No bloquea a ningun
otro ticket del sprint.

**Coordinar con UPONE-1619**, que tambien toca el seed del mod. Precision para no serializar de mas: los
**archivos de datos son distintos** (`_data-requirement.js` aqui, `_data-syllabus-sections.js` alla), asi
que los dos pueden avanzar en paralelo. Lo que si comparten es
`tests/integration/seed-counts.test.ts`, `docs/reference/seed-counts.md` y la corrida del seed: ahi hay
que acordar el orden.

## Estimacion

**3 SP.** Palancas: reestructurar el arbol sembrado, duplicar condiciones para preservar semantica,
retirar el bloque electivo, ajustar el guard de idempotencia y agregar la prueba de forma. Baja a
**2 SP** si se decide no sembrar el electivo de reemplazo.

## Guia de ejecucion: reglas y patrones up1 a considerar

- **[A favor]** Escribir primero la prueba de forma contra el loader real y verla pasar con el seed
  actual, para congelar el comportamiento vigente antes de cambiar los datos. Asi la prueba es red y
  no espejo.
- **[Advertencia]** El guard de idempotencia busca hoy por el label de la raiz
  (`_data-requirement.js:59-61`). La raiz no se renombra: **cambia de nodo** (deja de ser el `Group[AND]`
  autorado y pasa a ser el contenedor de vias con label por defecto). El guard hay que cambiarlo **en el
  mismo paso**, o el re-seed duplica el arbol porque busca una raiz que ya nadie siembra.
- **[Advertencia]** Una base que ya tiene el arbol viejo no se actualiza sola: el guard nuevo la
  reconoce y no replanta, asi que sigue mostrando la forma vieja hasta un re-seed limpio.
- **[Advertencia]** Retirar el bloque electivo no termina en el archivo de datos: el loader devuelve
  `results.electiveBlock` y hay dos consumidores de esa clave, la linea de log del orquestador
  (`seed/seed.js:171`) y el mock del test de entrada (`tests/integration/seed-entry.test.ts:121`).
  Enumerar que hacia el camino viejo y verificar que el nuevo lo replica, antes de borrar.
- **[A favor]** Cuando un campo se deja intencionalmente vacio, dejarlo comentado en el propio seed: ya
  hay precedente (`_data-requirement.js:136-139`).
- **[A favor]** Los casos sembrados deben ser reales y alcanzables: los objetivos se resuelven a
  asignaturas existentes por codigo, y si no resuelven el arbol no se siembra.
- **[Evitar]** No confiar en que un fixture cubre el seed: cuatro specs replican la forma como fixture,
  pero ninguna corre el loader real.
- **[Evitar]** No tocar la busqueda del contenedor de vias ni la derivacion: es la capacidad de
  UPONE-1378 y tiene cobertura propia.
- **Transversal:** tenant isolation en toda query; correr sync; no editar archivos sincronizados a mano
  ni commitear artefactos de sync/seed; en codigo, commits y PR usar solo el id de Jira.

## Tickets relacionados

| Ticket | Que es | Relacion | Estado |
|---|---|---|---|
| UPONE-1267 | Epic Curriculum Design | contenedor | Backlog |
| UPONE-1378 | Requisitos de asignatura: editor visual Y/O + alerta de impacto | construyo el editor y el alta con vias; define el techo de forma que este ticket toma como referencia | Finalizada |
| UPONE-1619 | Implementacion de InstructionalComponent | hermano SP9; tambien toca el seed del mod, coordinar orden de ejecucion | Backlog |

## Referencias

- Fuente canonica: UPONE-1541 (titulo; descripcion vacia en Jira).
- Planning SP9: `transcripts/2026-08-14-sprint-planning-sp9-uassessment.md`.
- Limites de alta y edicion verificados, y motivo del retiro del bloque electivo (interno):
  `sp9/UPONE-1541-limites-de-escritura-y-retiros.md`.
- Evaluacion del label como key traducible (interno, fuera de alcance):
  `sp9/ANALISIS-requirement-label-i18n-key-vs-texto.md`.
- Analisis de origen (interno): `sp8/requirement-seed-vs-ui-shape.md`. Su conclusion de fondo (la UI no
  puede reproducir la forma del seed) **se confirma** para el alta; lo que no aplica es atribuirlo a la
  lectura.
- Codigo: `mods/curriculum-design/seed/_data-requirement.js`,
  `mods/curriculum-design/modsComponents/RequirementEditor/`,
  `mods/curriculum-design/modsComponents/ReglaUnificadaView/`.
