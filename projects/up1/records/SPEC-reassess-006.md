---
id: SPEC-reassess-006
project: up1
type: doc
module: reassess
---

# 06 — Modulo 3: uAssessment

Fuente: Informe N 1660575, pags. 21
Seccion: 9. Oportunidad de diseno (Modulo 3)

---

## Descripcion

Modulo orientado al monitoreo sistematico del logro de competencias y resultados de aprendizaje a nivel de curso y programa. Requiere complementarse con Curriculum Mapping + integracion con sistemas institucionales (ERP y LMS) para calificaciones parciales y finales.

## Posicionamiento

- **Etapa 3** de la adopcion progresiva (requiere los dos modulos anteriores).
- Precio similar o mayor que Curriculum Mapping.
- Debe incorporar una instancia de **asesoria experta** para que cada cliente pueda:
  - Dar cuenta de su modelo educativo y sus procesos de medicion y evaluacion de competencias.
  - Consensuar los objetivos de uso de la herramienta.
  - Verificar la consolidacion de su modelo.
  - Reforzar el rol del cuerpo docente.
  - Socializar la herramienta con profesores involucrados en aseguramiento de calidad.

## Funcionalidades principales

1. **Medicion directa** de resultados de aprendizaje (no solo calificaciones finales).
2. **Integracion con ERP/LMS** para incorporar calificaciones parciales y finales.
3. **Reporteria de logros de aprendizaje** personalizable por un rol super admin u otros roles.
4. Descarga masiva de datos visualizados para autonomia analitica de la institucion.

## Creacion de valor

### Reporteria para mejora continua
- Facilitar visualizacion de logros de aprendizaje.
- Reporte personalizable por super admin u otros roles definidos por la institucion.
- Interaccion dinamica con la informacion segun necesidad.
- Descarga masiva de datos visualizados para otros analisis.

## Posibles extensiones

### Rutas de aprendizaje personalizadas
- Analisis de la progresion del aprendizaje y diseno de rutas orientadas al logro de competencias de egreso.
- Basado en trabajo previo con sistemas recomendadores en ambientes de aprendizaje en linea.
- **Condiciones necesarias** para que funcione:
  - Analisis constructivista del curriculo, los recursos de aprendizaje y las estrategias de evaluacion.
  - Enmarcado en estandares de calidad previamente definidos por la institucion.
  - La institucion debe contar con informacion organizada, suficiente y de calidad.
  - Capacidades institucionales para interpretacion y uso adecuado.
- Se considera extension **solo habiendo adoptado los tres modulos**.

## Correspondencia con uP1

| Propuesta del informe | Implementacion en uP1 |
|-----------------------|----------------------|
| Monitoreo logro competencias | Learning Assessment: calculo automatico en 3 capas (CAP-ASM-001 a CAP-ASM-043) |
| Integracion ERP/LMS | Banner (Ethos API), Anthology (REST/OData), Brightspace, Canvas |
| Reporteria personalizable | Reporteria en 3 niveles: individual, grupal, global. Configurable por rol |
| Descarga masiva | Exportacion Excel/PDF/CSV via Report Builder |
| Rutas de aprendizaje | Learning Pathways (en definicion funcional) |
| Asesoria experta | Recomendacion de negocio, no implementada como feature |
