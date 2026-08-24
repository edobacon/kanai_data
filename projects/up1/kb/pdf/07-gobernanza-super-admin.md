---
id: SPEC-reassess-007
project: up1
type: spec
module: reassess
tags: []
---

# 07 — Gobernanza y Rol del Super Admin

Fuente: Informe N 1660575, pags. 22-23
Seccion: 10. Recomendaciones generales (parcial)

---

## Estabilidad tecnica como condicion habilitante

La consultoria establece que la confianza de los usuarios y el valor percibido de la herramienta **dependen directamente de su correcto funcionamiento**. Las limitaciones tecnicas persistentes desvalorizan incluso funcionalidades conceptualmente solidas.

**Prioridades:**
- Confiabilidad operativa: procesos robustos de carga y descarga masiva de datos.
- Mecanismos que resguarden la integridad de la informacion.
- Gestion agil de incidencias con tiempos de respuesta claros.

## Rol del Super Admin

### Capacidades propuestas

El super admin debe poder, **sin abrir tickets de soporte**:
- Configurar identidad institucional (logos, terminologia, colores).
- Configurar capa de lenguaje.
- Configurar roles y permisos.
- Configurar reporteria y elementos visuales.
- Registrar problemas y dar seguimiento a su resolucion.
- Recibir reportes claros por parte del equipo de consultores y lider de producto de uPlanner.

### Capacitacion
- uPlanner debe realizar capacitaciones especificas para las contrapartes institucionales que asumiran este rol.
- Este perfil sera clave para configurar capa de lenguaje, roles y reporteria en cada modulo.
- Formacion solida para que comprendan funcionalidades avanzadas, optimicen UX y aseguren alineacion con procesos internos.

## Viaje del usuario propuesto (rediseno)

### Viaje actual vs propuesto

**Actual**: 6 pasos lineales con multiples intermediarios → demoras, baja visibilidad, frustracion.

**Propuesto**: Centralizar configuracion y gestion de incidencias en el super admin.

| Paso | Actores | Accion | Interacciones |
|------|---------|--------|---------------|
| 1. Configuracion del sistema | Contraparte del cliente | Implementa capa de lenguaje, roles, valida carga | Aborda configuracion en el modulo |
| 2. Define reporteria u otros requerimientos | Contraparte del cliente | Disena reportes, otros requerimientos, reporta incidencias | Genera incidencias si surgen problemas en el mismo modulo |
| 3. Gestion de incidencias | Consultor/a uPlanner | Recibe y analiza incidencias reportadas desde el modulo | Canaliza problemas hacia lider de producto y equipo de desarrollo |
| 4. Coordinacion y priorizacion | Lider de producto uPlanner | Supervisa priorizacion y resolucion de incidencias | Coordina con desarrollo y consultor |
| 5. Implementacion tecnica | Equipo de desarrollo | Desarrolla y prueba soluciones | Envia reporte de resolucion a consultor y lider |
| 6. Retroalimentacion | Consultor + lider producto | Informan al cliente sobre resolucion | Cierran el ciclo y dejan registro en el mismo modulo |

### Cambios clave
- El cliente opera directamente en el modulo (configuracion + reporte de incidencias).
- Se eliminan intermediarios innecesarios para tareas de configuracion basica.
- Canal directo para definicion de requerimientos, reporteria y seguimiento.
- Solicitudes gestionadas dentro del mismo modulo con trazabilidad clara y retroalimentacion en tiempo real.

## Correspondencia con uP1

| Propuesta del informe | Implementacion en uP1 |
|-----------------------|----------------------|
| Configuracion de identidad visual | Theming CSS por tenant: `suite/themes/{tenant_id}/theme.css` |
| Capa de lenguaje configurable | i18n con jerarquia de resolucion y overrides por objeto/tenant |
| Configuracion de roles/permisos | RBAC con contextos jerarquicos, capabilities por mod |
| Gestion de incidencias en plataforma | Pendiente: no hay modulo de ticketing interno en uP1 documentado |
| Reporteria configurable | Layout configs en BD, Report Builder personalizable |
