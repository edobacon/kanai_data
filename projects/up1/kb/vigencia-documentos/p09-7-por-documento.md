---
id: DOC-kb-vigencia-documentos-p09-7-por-documento
project: up1
type: doc
module: curriculum-design
tags:
  - vigencia
  - workflow
  - estados
  - versionamiento
  - sp12
---

# Vigencia 09: 7 Aplicación por documento

> Grupo: Parte funcional · Parte 9 de 17 · Líneas 900 a 919 del original · [Índice](00-indice.md)

**Ver en HTML (mismo estilo del original):** [p09-7-por-documento.html](p09-7-por-documento.html)

## Qué dice esta parte

Para cada documento (plan, malla, programa, sílabo, perfil de egreso, matriz, escalas) indica qué es reforma y qué es ajuste y desde dónde se deriva su vigencia. El sílabo es la excepción: es operativo, no versiona y es libre durante su periodo.

## Dónde se habló en la reunión (6 oct 2026)

00:12:40 a 00:15:16 y 00:46:14. Transcripción: `TRANSCRIPT-2026-10-06-modelamiento-flujo-estatus-reglas-uassessment` (records).

## Verificado contra el código (8 oct 2026)

- Sin verificar campo por campo. Los objetos citados existen en `object-manager/objects/business/Base` y en `mods/curriculum-mapping/objects`.

## Decisiones y preguntas ligadas

Lista cerrada de campos por objeto: pendiente.

## Fragmento del documento (texto del artefacto)

```text
7 · Aplicación por documento
Qué es reforma y qué es ajuste en cada uno
Documento | Objeto | Vigencia por | Reforma | Ajuste
Plan de estudios | Curriculum | Cohorte de ingreso | Perfil, créditos, duración, obligatorias, menciones | Prerrequisitos, renombrar, mover de semestre, tributación puntual
Malla y requisitos | planEntry, requirement | Hereda del plan | Por la vía del plan. Hoy solo editable en Draft; gana la vía de ajuste
Programa de asignatura | Activity + CurricularSection | Periodo | RA del curso, créditos, horas | Evaluación, bibliografía, secuencia de contenidos, actividades
Sílabo | Offering | Su periodo (termId) | No versiona | Libre durante el periodo, con registro; inmutable al cierre
Perfil de egreso | CurricularSection GraduationProfile | Hereda del plan | Siempre reforma del plan | Redacción de descriptores
Matriz de competencias | CompetencyNode Matrix + MatrixAdoption | Adopción | Agregar o quitar competencias, estructura | Descriptores, rúbricas, ponderaciones
Escalas y niveles | PerformanceScale, DevelopmentLevel | Uso en mediciones | Cambiar umbrales, quitar niveles | Agregar niveles
```
