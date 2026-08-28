---
id: RULE-platform-002
project: up1
type: rule
module: platform
tags:
  - platform
  - vue
  - css
  - scoped
  - vueform
---

# style scoped no aplica a sub-componentes inline definidos con render functions

## What

En SFCs Vue 3 que definen sub-componentes inline via `defineComponent({ render() })` (patron usado por necesidad cuando el sync admite 1 .vue por folder), NO usar `<style scoped>` ni `<style module>`. Las reglas con scope NO se aplican a los sub-componentes que se renderean fuera del template raiz del SFC — los sub-componentes no reciben el atributo `data-v-xxxx` que scoped requiere.

## Why

scoped funciona inyectando un atributo `data-v-xxxx` en los elementos del template del SFC y agregando ese atributo como selector adicional en cada regla CSS. Los sub-componentes definidos con `defineComponent({ render() })` rederean elementos via la render function que NO recibe el data-v scope automaticamente. Resultado: las reglas .X[data-v-xxxx] no matchean los elementos del sub-componente, los estilos no aplican. Caso documentado: CompositeSectionTreeElement.vue del mod curriculum-design tiene 4 sub-componentes inline (Node recursivo, Form modal, View modal, Element raiz) — si usaramos scoped, los nodos del tree saldrian sin estilos.

## Where

SFCs custom Vueform o cualquier .vue del mod que defina sub-componentes inline.

## When

Siempre, hasta que Vue 3 soporte propagar scope a render functions o se refactoree a sub-componentes en archivos separados (limitado por el sync que admite 1 .vue por folder).

## Verification

Para aislar CSS sin scoped, usar prefix unico de clases (ej. `.cst-*` para CompositeSectionTree). NO mezclar scoped con sub-componentes inline. Si se necesita validar isolation, agregar test integration que verifique que ningun otro mod usa el mismo prefix.

## Source

- **Discovered in**: TICKET-010 (discusion C1)
