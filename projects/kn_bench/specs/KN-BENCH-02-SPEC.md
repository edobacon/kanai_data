---
id: KN-BENCH-02-SPEC
project: kn_bench
ticket: KN-BENCH-02
status: approved
---

# Módulo de duración en TypeScript

## Requirements

#### REQ-01 `confirmed`
> Fuente: Ticket KN-BENCH-02 Request; RULE-duration-02
parseDuration(input) MUST convertir segmentos combinables de unidades d, h, m, s y ms a milisegundos, admitiendo orden libre y espacios opcionales entre segmentos.

#### REQ-02 `confirmed`
> Fuente: Ticket KN-BENCH-02 Request; RULE-duration-03
parseDuration(input) MUST lanzar DurationError ante entrada vacía, unidad desconocida o valores negativos, incluyendo el input ofensor en el mensaje.

#### REQ-03 `confirmed`
> Fuente: Ticket KN-BENCH-02 Request; RULE-duration-02
formatDuration(ms) MUST convertir milisegundos a una representación canónica compacta usando d, h, m, s y ms, con 0 representado como "0ms".

#### REQ-04 `confirmed`
> Fuente: Ticket KN-BENCH-02 Request; RULE-duration-03
formatDuration(ms) MUST lanzar DurationError para valores negativos o no finitos, incluyendo el input ofensor en el mensaje.

#### REQ-05 `confirmed`
> Fuente: RULE-duration-01; RULE-duration-02
El módulo MUST exportar UNIT_MS como Record<string, number> con los factores únicos y correctos para d, h, m, s y ms, sin dependencias externas de runtime.

#### REQ-06 `confirmed`
> Fuente: RULE-duration-03
El módulo MUST exportar DurationError como clase que extiende Error, y todos los errores lanzados por parseDuration y formatDuration MUST ser instancias de DurationError.

#### REQ-07 `confirmed`
> Fuente: Ticket KN-BENCH-02 Criterios de aceptación; DET-7
La implementación MUST tener typecheck limpio y una suite de tests verde que cubra unidades, combinaciones, round-trip y errores.

## Tasks

#### S1.T1 — Crear el módulo TypeScript de duración con UNIT_MS como única fuente de factores, DurationError exportado, parseDuration y formatDuration; usar únicamente APIs nativas y mantener los mensajes de error vinculados al input ofensor.
Contrato: rollback: Eliminar los archivos nuevos del módulo de duración y restaurar únicamente los archivos previamente existentes; no modificar dependencias ni configuración compartida.. Status: pending

#### S1.T2 — Añadir tests unitarios y de regresión para cada unidad, combinaciones en orden libre, espacios opcionales, casos canónicos, round-trip, cero, entradas vacías, unidades desconocidas, negativos, valores no finitos y verificación de DurationError; ejecutar la suite completa y typecheck.
Contrato: rollback: Eliminar únicamente los archivos de tests añadidos y restaurar la configuración de tests si hubiera sido modificada; conservar el módulo de producción sin cambios.. Status: pending

#### S1.T3 — Ejecutar validación final del alcance: revisar exports públicos, ausencia de dependencias runtime nuevas, typecheck limpio y suite completa verde; registrar el resultado del gate de sesión.
Contrato: rollback: Revertir exclusivamente cualquier ajuste de configuración o documentación realizado durante la validación, sin alterar los archivos funcionales ni los tests.. Status: pending
