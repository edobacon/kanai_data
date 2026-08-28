---
id: BR-MIG-002
project: up1
type: doc
module: curriculum-design
status: in-spec
tags:
  - business-rule
  - migracion
  - parametros
  - curriculum-design
---

# BR-MIG-002: Control de sincronizacion

## Texto verbatim

Tres parametros institucionales (gestionados desde el modulo de configuraciones de uP1) controlan el comportamiento de la migracion:

- **`migrationOverUserEdition`** (default: false): Si true, la migracion sobrescribe ediciones manuales del docente. Si false, respeta ediciones manuales (datos modificados por un usuario distinto al sistema no se actualizan)
- **`migrationWithDataDeactivation`** (default: false): Si true, inactivaciones en el programa de curso se replican en la seccion. Si false, los datos de la seccion permanecen activos aunque se inactiven en el programa
- **`migrationWithSyllabusTransition`** (default: false): Si true, la migracion ejecuta la transicion de workflow del syllabus automaticamente

## Aplicacion en Programa de asignatura

Configuraciones por institucion (probablemente en tabla de configuracion institucional, fuera de este mod). El programa NO almacena estos parametros — los consume MADS al ejecutar la migracion.

## SP2

Fuera de scope. Documentado para coherencia.

## Referencias

- [BR-MIG-001](BR-MIG-001.md) (herencia)
- [BR-MIG-003](BR-MIG-003.md) (bloqueo por calificaciones — prioridad maxima sobre estos parametros)
