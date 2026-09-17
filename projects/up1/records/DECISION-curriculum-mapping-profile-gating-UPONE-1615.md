---
id: DECISION-curriculum-mapping-profile-gating-UPONE-1615
project: up1
type: decision
module: curriculum-mapping
---

config/app.json reemplaza el defaultObjects unico por navByRole (un menu por cada uno de los 5 roles curriculares) y agrega profileRoleMapping, que ata cada rol interno del mod a los perfiles institucionales que lo habilitan (los 4 roles Learning Assurance, mas Admin/Consultor para el rol combinado Disenador Autoridad). Es la pieza de mod correspondiente a la particion del baseline RBAC por ownership (Opcion A de 1615).

**sourceRef:** ea7a1fa + config/app.json:8-33 (navByRole, profileRoleMapping).
