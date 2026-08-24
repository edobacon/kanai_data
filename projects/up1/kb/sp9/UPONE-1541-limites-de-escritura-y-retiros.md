# UPONE-1541 - Limites de escritura del editor de requisitos, y lo que se retira del seed

> Material interno de SP9. **No va a Jira.** Registra los limites exactos del alta y de la edicion
> del editor de requisitos, verificados contra el codigo, y deja constancia de lo que se retira del
> seed por no ser alcanzable desde ninguna pantalla. Contrato del ticket: `UPONE-1541-detalle.md`.
>
> Verificado el 2026-08-17 contra `uplanner/up1/mods/curriculum-design` (rutas relativas al mod).

## El limite no esta en la lectura, esta en el alta

La lectura del arbol es fiel a cualquier forma: `buildRequirementTree` reconstruye por `parentId` y
ordena por `position`, sin asumir profundidad. El editor **lee y extiende** arboles anidados, incluida
la forma del seed: `findViaContainer` localiza el `Group[OR]` a cualquier profundidad por BFS
(`modsComponents/RequirementEditor/requirementEditor.logic.ts:69-77`).

Lo que **no** puede es producir esa forma desde cero, ni editar mas que un campo de una hoja ya
creada. Ahi esta la incoherencia que motiva el ticket: el usuario ve un ejemplo que no puede
reproducir ni completar.

## Techo del alta

Profundidad maxima que el alta produce:

```
Group[OR]  contenedor de vias      (raiz, parentId null)
└─ Group[AND]  via
   ├─ hojas (RecordState / MetricThreshold)
   └─ Group[OR]  pool electivo (minToSatisfy)
      └─ hojas del pool
```

Tres niveles para condiciones simples, cuatro con pool electivo. El contenedor de vias se crea
**siempre en la raiz** (`parentId: null`) y, si ya habia roots, los reparenta **debajo** de el
(`requirementCreate.logic.ts:68-81`). No existe camino que cree un `Group` por encima del contenedor.

## Inventario: nodos del seed EST200 vs capacidad del alta

Estado del seed al momento de esta verificacion: `seed/_data-requirement.js:97-143`.

| Nodo sembrado | Alcanzable por el usuario | Evidencia |
|---|---|---|
| `Group[AND]` raiz "Requisitos EST200" | **No** | el contenedor se crea en la raiz y envuelve hacia abajo (`requirementCreate.logic.ts:68-81`) |
| `Group[OR]` "Via de ingreso" anidado bajo el AND raiz | **No en esa posicion** | la UI lo crea con `parentId: null` |
| `Group[AND]` "Calculo + Algebra" bajo el OR | Si | es el AND de via de `createViaGroup` (`:86-102`) |
| Hojas con `mustBe: Approved` **sin** `timing` | **No como hoja de via** | el selector de condicion setea `mustBe` y `timing` juntos, siempre (`requirementFamilies.logic.ts:75-79`). Si es alcanzable como **hoja de pool electivo**, que usa `REQUIREMENT_FAMILIES.Course.presets` y no pasa por el selector (`RequirementEditorElement.vue:832-843`) |
| Hoja suelta directa bajo el `Group[OR]` ("Calculo II") | **No por alta normal** | toda hoja cuelga de un `Group[AND]` destino (`resolveTargetGroup:108-138`). Solo aparece si el OR reparento un root preexistente |
| `MetricThreshold` global (hermana del OR, bajo la raiz) | **No** | ninguna hoja se crea fuera de una via o de un pool |
| `RecordState` advisory global | **No como global** | idem. Si es creable dentro de una via, con exigencia "Recomendado" |
| Labels autorados de contenedores | **No** | la UI persiste literales i18n fijos (`RequirementEditorElement.vue:812-813`) |
| `position` explicita | **No** | el payload de alta no la manda; queda null y el render la normaliza a 0 (`buildRequirementTree.logic.ts:105,140-144`) |

Los layouts genericos no son escapatoria: `default_rt__*__requirement_create.json` exponen los
escalares pero **no** `parentId` ni el owner, asi que la jerarquia solo se escribe por el editor.

## La edicion es parcial, y eso no se arregla con el seed

"Editar" sobre una hoja cambia **solo** `isHardRule` (Obligatorio / Recomendado):
`confirmEditExigencia` en `RequirementEditorElement.vue:917-935`. No se puede cambiar el curso
objetivo, la condicion, la nota minima, el valor de la metrica ni el label. Para cualquier otra
correccion hay que eliminar y volver a crear.

Es **simetrico**: tampoco se puede editar lo que el propio usuario creo. Por eso no se resuelve
ajustando datos del seed, y queda como limite del editor a evaluar aparte.

Asimetria de listado, en cambio, si se resuelve al aplanar: las hojas fuera de via no aparecen en la
tabla plana (`deriveRows` solo recorre vias) pero **si** tienen menu en la vista arbol, porque
`onNodeAction` arma la fila sintetica cuando el nodo no esta en `rows`
(`RequirementEditorElement.vue:941-959`). Al no haber mas hojas fuera de via, la diferencia
desaparece.

## Quien pone cada nombre en pantalla

Relevante para decidir que persiste el seed: parte de los nombres los deriva el render y el label
guardado nunca se ve.

| Nodo | El render usa el label persistido | Lo que persiste la UI |
|---|---|---|
| `Group[OR]` contenedor de vias | **Si**, y solo se muestra con 2+ vias (`collapseSingleVia` lo oculta con una) | "Cualquiera de las vias" |
| `Group[AND]` de via | **No**: se reemplaza por "Via N" (`RequirementTreeNode.ts:263,268`) | "Todos de la via", que queda invisible |
| `Group[OR]` pool electivo | Si | "Electivo: K de N" (`RequirementEditorElement.vue:831`) |
| Hoja `RecordState` | Si, con el verbo prefijado por el render si el label no lo trae (`RequirementTreeNode.ts:270-272`) | "{name} ({code})" (`deriveLeafLabel:725-732`) |
| Hoja `MetricThreshold` | Si | "Metrica (creditos) ≥ 60" |

Nota sobre el label de la metrica: el docstring dice que arma `"Creditos {simbolo} {valor}"`, pero el
codigo concatena `t('requirementAddModal.family.Metric')`, que en español vale "Metrica (creditos)"
(`RequirementEditorElement.vue:733-736` + `lang/es/common.i18n.json:131`). El literal real se lee
raro. Se sigue el criterio de no autorar: el seed persiste el literal real y el label feo queda como
follow-up de la UI, no algo que el seed disimule.

## Retiro: bloque electivo del Plan

Se retira del seed el bloque "Electivo de Especializacion" sembrado sobre un `curriculum`
(`seed/_data-requirement.js:184-196`). Razones, todas verificadas:

- **Campos que ninguna pantalla captura**: `effect: 'ProgressGate'` (el alta fija
  `DEFAULT_EFFECT = 'EligibilityToEnroll'`, `requirementFamilies.logic.ts:62`) y `creditsRequired: 24`
  (la familia Electivo solo pide pool y K, `:124-127`).
- **La escritura esta acotada a `activity`**: `ownerType: 'activity'` hardcodeado en
  `requirementCreate.logic.ts:69,94` y `requirementFamilies.logic.ts:195`. El componente acepta la
  prop `ownerType`, pero el alta no la usa.
- **No se ve en ninguna parte**: no hay ninguna referencia a `ReglaUnificadaView` ni a
  `RequirementEditorElement` en `config/layouts/`. El editor se monta como custom element de Vueform
  en el tab "Requisitos" del Programa de asignatura, o sea sobre `Activity` (`.ai/CONTEXT.md:98`).

Es el caso extremo del problema del ticket: dato que no es reproducible **ni** visible.

### Que consume el resultado del bloque, y por lo tanto se retira con el

El retiro no termina en el archivo de datos. El loader arma `results.electiveBlock`
(`seed/_data-requirement.js:43` lo inicializa, `:201` lo llena) y hay dos consumidores verificados:

| Consumidor | Que hace con la clave |
|---|---|
| `seed/seed.js:171` | Imprime la linea de log del paso: `existed` / `created` / `skip` |
| `tests/integration/seed-entry.test.ts:121` | Mockea el resultado del loader con `electiveBlock` presente |

Sin tocarlos, el orquestador reporta un paso que ya no existe y el test afirma un contrato muerto. Se
ajustan en el mismo paso que el retiro.

Consecuencia a cubrir en ejecucion: el seed se queda sin ningun ejemplo de electivo K-de-N. La UI
**si** puede crear electivos sobre una asignatura (pool `Group[OR, minToSatisfy]` mas hojas, sin
`creditsRequired`), asi que el caso se puede preservar sembrandolo dentro de una via del arbol EST200,
reproducible al 100%.

## Follow-ups candidatos (no creados en Jira)

Sin ticket de Jira hasta OK explicito del dev. Registrados aca para no perderlos:

1. **Edicion completa de una hoja** (curso objetivo, condicion, nota minima, valor de metrica). Hoy
   obliga a borrar y recrear. Limite del editor, simetrico para dato sembrado y creado.
2. **Condicion global creable** ("aplica a todas las vias"). El editor las lee, las preserva y les da
   menu, pero no las crea. Requiere definicion de producto y diseño de la afordancia.
3. **Label de la metrica** que deriva la UI: "Metrica (creditos) ≥ 60" en vez de la intencion
   documentada "Creditos ≥ 60".
4. **Requisitos de owner `curriculum` sin superficie**: el bloque electivo sobre un Plan se puede
   persistir pero no se ve ni se edita. Definir si el modelo lo sigue admitiendo o si necesita
   pantalla.
5. **Label estructural como key traducible**: evaluado aparte en
   `ANALISIS-requirement-label-i18n-key-vs-texto.md`.
