---
id: RULE-layout-045
project: up1
type: rule
module: layout
tags:
  - layout
  - RecordDetail
  - contrato-declarativo
  - source
  - emptyDisplayKey
  - confirmOnChange
---

# Preferir las keys declarativas de campo de RecordDetail antes de reimplementar el comportamiento en el mod

## What

RecordDetail expone tres contratos declarativos de campo, todos agregados en la misma ventana. Antes de escribir logica propia en un mod para resolver alguno de estos casos, verificar si ya existe la key:

- `source: { relation, path }`: toma el valor del campo desde un registro relacionado to-one (`relation` es el nombre de la relacion sin el sufijo `Id`; `path` admite un segundo salto, `relacionToOne.field`, la misma profundidad que ya soportan las listas). Solo lectura: el entry se descarta en modo `create`/`edit`.
- `emptyDisplayKey`: en modo vista, cuando el valor de un campo esta vacio, muestra el texto traducido de esa key en vez del marcador generico de vacio. Solo aplica a los tipos de `EMPTY_DISPLAY_SUPPORTED_TYPES`.
- `confirmOnChange`: declara que valor de un campo dispara un dialogo de confirmacion antes de que el cambio llegue al backend (`when`, `titleKey`, `messageKey`). Solo dispara al entrar al valor declarado, no al salir; cancelar restaura unicamente ese campo.

## Why

Las tres son la version generica de patrones que antes cada mod reimplementaba a mano. `emptyDisplayKey` ya lo consume uengagement, prueba de que el contrato es genuinamente generico y no un caso puntual. `confirmOnChange` reemplaza la confirmacion ad hoc que un mod escribiria para, por ejemplo, desactivar una app: cualquier campo booleano de consecuencia amplia la necesita, no solo ese caso.

`source` evita duplicar el dato via una FK adicional: el layout declara la relacion y el path, y RecordDetail deriva que relaciones incluir en `getInstance` a partir de las entradas `source` declaradas. Un layout nunca declara la relacion por separado ni describe una query.

## Where

- `layout/docs/features/recorddetail.md:256` (fila de la tabla de keys de campo, `source`), `:258-280` (seccion "Fields from a related object")
- `layout/src/layouts/RecordDetail/applyEmptyDisplayFallback.ts:64` (condicion `field.emptyDisplayKey && (!field.type || EMPTY_DISPLAY_SUPPORTED_TYPES.has(field.type))`), `:71-72` (resolucion via `translate` y fallback si la key no traduce)
- `layout/src/layouts/RecordDetail/RecordDetail.vue:4022` (doc del schema `confirmOnChange` en comentario), `:4042-4046` (deteccion del campo declarado, `findChangeNeedingConfirmation`)

## When

Al necesitar en un mod: mostrar un campo de un registro relacionado sin duplicarlo via FK (usar `source`), mostrar un texto de reemplazo cuando un campo esta vacio en modo vista (usar `emptyDisplayKey`), o pedir confirmacion antes de un cambio de alto impacto (usar `confirmOnChange`). Evaluar la key declarativa antes de agregar logica custom al componente del mod.

## Source

- **Discovered in**: UPONE-1489, UPONE-1609, UPONE-1504
