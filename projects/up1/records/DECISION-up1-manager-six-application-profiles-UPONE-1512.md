---
id: DECISION-up1-manager-six-application-profiles-UPONE-1512
project: up1
type: decision
module: up1-manager
---

Se definieron 6 perfiles (Super Admin, Admin UPlanner, Admin Institucion, Soporte, Implementador, Analista Reportes) con matriz documentada en docs/application-profiles.md. Admin Institucion = Admin UPlanner menos cuentas de servicio y Flujos; Soporte pierde Flujos. Las escrituras sobre core_User, ReportTemplate y core_ServiceAccount se enumeran por campo para que ningun perfil pueda escribir clerkUserId, activeRoleId, secretHash, query ni createdById; Super Admin retiene las capacidades a nivel de objeto. La visibilidad de layouts queda sin tocar (73 de 80 layouts siguen gateados por roles institucionales).

**sourceRef:** 467bbcc + profiles/*.json + docs/application-profiles.md; 96dd529 (field-level enumerado).
