---
id: DECISION-up1-manager-layouts-wizard-MGR-LAYOUTS
project: up1
type: decision
module: up1-manager
---

Estado final del wizard de creacion de vistas (layout configs): entradas dedicadas desde aplicacion, objeto y tipo de registro, cada una generando el layout con useDefaultLayoutGenerator. Se probo un editor visual de contenido (layout-content-editor de core) y se revirtio a JSON crudo en textarea (fab9a0f) porque no cubria los casos del mod. El identificador es de texto libre (ya no autoPopulate silencioso {objeto}_{modo}) con pills de sugerencias y una regla asincrona layoutNameUnique. Los avisos usan up1-note. Las listas embebidas solo permiten edicion inline de label y activa.

**sourceRef:** a8f2669 config/layouts/layout-create-from-{app,object,recordtype}.json; 2d14bdf useDefaultLayoutGenerator.ts + IdentifierSuggestions; fab9a0f (revierte editor visual).
