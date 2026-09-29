---
id: DECISION-object-manager-objetos-base-plataforma-UPONE-1525
project: up1
type: decision
module: object-manager
tags:
  - UPONE-1525
  - sp11
  - objetos-base
  - multi-tenant
---

objects/business/Base/*.json se mergea en el BASEMODEL de todo tenant sin condicion, sin importar que tenants liste el config/app.json del mod que los define. Cualquier mod puede construir su propio CRUD o vista sobre un objeto Base de otro mod, incluso en un tenant donde el mod dueno no esta instalado. Antes de construir esa vista se revisa si el mod dueno ya trae un layout reusable (regla 4.E de mods/.ai/COMMANDMENTS.md, ver el record de up1-superrepo de UPONE-1525).

sourceRef: 784a8b06 docs/reference/multi-tenant-architecture.md:288
