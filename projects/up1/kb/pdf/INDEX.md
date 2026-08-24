---
id: SPEC-reassess-010
project: up1
type: spec
module: reassess
tags: [assessment, reassess, dictuc, consultoria, up1, migracion, curriculum, competencias, acreditacion]
clients: [uniandes, ust-cft, anahuac, upc]
---
# ReAssess — Indice de Analisis por Seccion

Informe N 1660575 — "ReAssess: Rediseno de uAssessment para la mejora continua curricular"
Elaborado por Dictuc S.A. (Dilab, UC) para uPlanner (Taneq SpA)
Fecha: enero 2026 | 32 paginas

PDF fuente: [usuite-up1-reporte-consultoria-externa.pdf](usuite-up1-reporte-consultoria-externa.pdf)
Analisis tecnico cruzado: [actual/INDEX.md](actual/INDEX.md) (15 documentos de validacion contra codigo)

---

## Archivos

| Archivo | Secciones PDF | Pags. | Contenido |
|---------|--------------|-------|-----------|
| [resume.md](resume.md) | Todo | 1-32 | Resumen ejecutivo del informe completo |
| [01-contexto.md](01-contexto.md) | 1-6 | 1-9 | Marco del estudio: datos, objetivo, alcances, metodologia, muestra de clientes |
| [02-diagnostico.md](02-diagnostico.md) | 7 | 9-12 | Dolores criticos: carga de datos, reporteria, personalizacion, confiabilidad, flujo de usuario |
| [03-arquetipos.md](03-arquetipos.md) | 8 | 13-14 | Tres arquetipos de instituciones segun madurez y estrategia de adopcion |
| [04-modulo-curriculum-management.md](04-modulo-curriculum-management.md) | 9 (M1) | 14-17 | Modulo 1: gestion curricular, carga masiva, IA para datos, coherencia curricular |
| [05-modulo-curriculum-mapping.md](05-modulo-curriculum-mapping.md) | 9 (M2) | 18-20 | Modulo 2: tributacion de competencias, comparacion de planes, estrategias evaluacion |
| [06-modulo-uassessment.md](06-modulo-uassessment.md) | 9 (M3) | 21 | Modulo 3: monitoreo de logro, reporteria, rutas de aprendizaje |
| [07-gobernanza-super-admin.md](07-gobernanza-super-admin.md) | 10 | 22-23 | Rol Super Admin, viaje de usuario actual vs propuesto, gestion de incidencias |
| [08-recomendaciones-y-conclusiones.md](08-recomendaciones-y-conclusiones.md) | 10-11 | 24-25 | Asesoria experta, red interinstitucional, modelo de negocio, conclusiones, estado en uP1 |
| [09-anexos.md](09-anexos.md) | 12, A, B | 26-32 | Referencias bibliograficas, protocolo de entrevista, consentimiento informado |

---

## Hallazgos principales

### Dolores diagnosticados
1. **Carga de datos**: documentacion fragmentada (PDF/Excel/Word), carga masiva manual y costosa
2. **Reporteria insuficiente**: no muestra metricas de logro; instituciones usan Power BI externo
3. **Rigidez**: no se adapta a jerarquias, terminologia ni modelos institucionales
4. **Confiabilidad**: perdida de datos (Uniandes), bibliografia rota (UPC), permisos inestables
5. **Flujo de usuario**: 6 pasos lineales con intermediarios, demoras, baja visibilidad

### Propuesta de rediseno modular

```text
┌───────────────────────────┐
│ Etapa 1                   │
│ Curriculum Management     │
└─────────────┬─────────────┘
              │
              ▼
┌───────────────────────────┐
│ Etapa 2                   │
│ Curriculum Mapping        │
└─────────────┬─────────────┘
              │
              ▼
┌───────────────────────────┐
│ Etapa 3                   │
│ uAssessment               │
└─────────────┬─────────────┘
              │
              ▼
┌───────────────────────────┐
│ Extension                 │
│ Rutas de aprendizaje      │
└───────────────────────────┘
```

### Recomendaciones clave
- Super Admin autonomo (sin tickets para configuracion basica)
- Asesoria experta en aseguramiento de calidad (no solo software)
- Red/consorcio interinstitucional de universidades uPlanner
- Curriculum Management como requisito minimo de entrada (modelo de venta)
- Pruebas piloto con instituciones de los 3 arquetipos

---

## Correspondencia informe → uP1

| Propuesta del informe | Estado en uP1 (abril 2026) |
|-----------------------|---------------------------|
| 3 modulos progresivos | Implementado: Curriculum Design, Mapping, Assessment |
| IA generativa en cada modulo | Implementado: asistentes en las 3 apps |
| Super Admin configurable | Parcial: RBAC, theming, i18n existen; ticketing interno no |
| Integraciones bidireccionales | Especificado: Banner, Anthology, LMS |
| Reporteria 3 niveles | Implementado: individual, grupal, global |
| Rutas de aprendizaje | Learning Pathways en definicion funcional |
| Red interinstitucional | No implementado (recomendacion de negocio) |
| Asesoria experta | No implementado (recomendacion de negocio) |
| Pruebas piloto por arquetipo | Sin informacion |

---

## Clientes entrevistados

| Institucion | Pais | Interes | Cobertura |
|-------------|------|---------|-----------|
| Uniandes | Colombia | Gestion curricular | Facultad |
| UST-CFT | Chile | Evaluacion competencias | Multi-institucion |
| Anahuac | Mexico | Evaluacion competencias | Multi-institucion |
| UPC | Peru | Gestion curricular | Institucional |
