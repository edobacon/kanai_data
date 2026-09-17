---
id: BUG-up1-manager-profile-write-without-view-UPONE-1512
project: up1
type: bug
module: up1-manager
---

(1) Admin UPlanner, Admin Institucion e Implementador declaraban mod/up1-manager/recordtype con create/edit sin view; no rompia nada porque los 3 puntos de enforcement evaluan en OR contra core_objectdefinition:*, pero otorgar escritura sin lectura es un descuido latente. (2) Admin Institucion enumeraba 11 capacidades reporttemplate.<campo>:modify, pero checkFieldPermissions solo corre desde updateInstance, mientras que los report templates se escriben via updateReportTemplate gateado solo por reporttemplate:edit, asi que el carve-out no protegia nada. Se restauro la capacidad de objeto y se agrego test que prohibe declarar capacidades de campo sobre ese objeto.

**sourceRef:** b6ec478 + profiles/Up1ManagerAdminInstitucion.json, AdminUplanner.json, Implementador.json; 73121b7 + docs/application-profiles.md.
