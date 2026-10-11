---
id: TAO-254-SPEC
project: taomangalam
ticket: TAO-254
status: approved
---

# TAO-254 · Motor de conteo de días de práctica: ciclos desde la activación, cumplimientos y correcciones append-only, detección de día omitido con reinicio o continuación (HU-06-06)

## Resumen ejecutivo

Qué se hace: un servicio de dominio local (Dart/Drift) que abre ciclo_practica desde el evento activacion de evento_plan, confirma días en cumplimiento_dia con local_date, instante UTC y zona, desmarca o corrige con cumplimiento_correccion append-only, completa la acción al llegar a dias_requeridos consecutivos, detecta días omitidos con umbral 0 y aplica las salidas reinicio y continuar_con_retraso con metadatos dias_retraso, dia_que_tocaba y dias_exigidos. Incluye la guarda de reloj hacia atrás (DEC-172) y excluye del retraso las fases de espera y la renovación pendiente.
Qué NO se hace: sin interfaz (V-01 y V-08 son consumidoras), sin caso 2 de DEC-030 (HU-06-16 y HU-08-16), sin recordatorios, sin migración: el esquema ya tiene las cuatro tablas, la unicidad por ciclo y fecha y los tipos reinicio y continuar_con_retraso.
Cómo se sabe que funciona: pruebas unitarias e integración con reloj y zona inyectados que cubren los 10 criterios de aceptación y QA-06-06-01 a 04 (completado al tercer día, retraso de 1 y 2 días, inicio el lunes de activación, fechas sin cambio tras cambio de zona, doble confirmación sin fila duplicada).
Tamaño: 2 sesiones T2 (unas 5 a 6 h), riesgo alto por la dependencia con HU-06-05 (G2, #150), que tiene que estar integrada en epic/EP-06 antes de empezar.
ADVERTENCIAS: (1) el baseline es main debeb05f; actualizar el SHA y comprobar que TAO-249 (Drift v4 y repositorios) y HU-06-05 ya están en la rama acumuladora. (2) La fórmula de retraso que se deduce de los criterios es retraso = hoy - dia_que_tocaba, sin contar hoy, con dia_que_tocaba = último cumplido + 1 o el inicio del ciclo si no hay cumplidos. (3) Los docs se tocan solo si hace falta registrar el estado; si se tocan, tienen que pasar docs:check.
Datos a confirmar antes de ejecutar: (a) ruta del módulo de dominio de práctica y nombres de los repositorios y la transacción de TAO-249 (en app/lib/data/drift/dao/); (b) API de HU-06-05 para evaluar plan completado y leer el estado de fase (esperando_conexion, esperando_material, renovación pendiente) y dónde vive ese estado; (c) valores permitidos por los CHECK de ciclo_practica.estado, ciclo_practica.motivo_cierre y cumplimiento_dia.estado en el esquema vigente (esquema_v1.dart:236 y siguientes, esquema_v3.dart); (d) si ya hay una abstracción de reloj o zona inyectable en app/lib/core; (e) comando de test de la app (flutter test o dart test dentro de app/).

## Requirements

### REQ-01 `confirmed`
> Fuente: taomangalam/app/lib/data/drift/esquema_v1.dart:234

Al activar un plan, cada acción diaria abre su ciclo_practica número 1 con inicio igual a la local_date del evento activacion de evento_plan (DEC-232). No usa la fecha de la tirada, de la consulta ni del primer cumplimiento.

### REQ-02 `confirmed`
> Fuente: taomangalam/app/lib/data/drift/esquema_v1.dart:255

Confirmar el día crea un cumplimiento_dia con local_date, occurred_at_utc y timezone_id del momento. La clave ciclo + local_date evita duplicados: una segunda confirmación del mismo día devuelve el cumplimiento vigente sin insertar otra fila, y un cambio de zona posterior no reescribe fechas ya guardadas.

### REQ-03 `confirmed`
> Fuente: taomangalam/app/lib/data/drift/esquema_v1.dart:276

Las correcciones son append-only en cumplimiento_correccion. Desmarcar hoy no exige motivo; corregir un día anterior exige motivo y guarda estado_anterior y estado_nuevo. cumplimiento_dia.estado es la proyección de la última corrección y la confirmación original sigue en la base.

### REQ-04 `confirmed`
> Fuente: taomangalam/app/lib/data/drift/esquema_v1.dart:220

La acción queda completada y su ciclo cerrado como cumplido cuando los días cumplidos consecutivos del ciclo llegan a dias_requeridos. Al completar la última acción diaria obligatoria se dispara la evaluación de plan completado de HU-06-05.

### REQ-05 `confirmed`
> Fuente: taomangalam/app/lib/data/drift/esquema_v1.dart:236

Al evaluar un ciclo abierto, el motor informa el día omitido con umbral 0 (DEC-030 caso 1): dias_retraso = hoy - dia_que_tocaba, con dia_que_tocaba = último día cumplido + 1 o el inicio del ciclo si no hay cumplidos, más dias_exigidos = dias_requeridos. Mientras tanto no avanza el conteo. Los días en esperando_conexion, esperando_material o renovación pendiente no cuentan como omitidos.

### REQ-06 `confirmed`
> Fuente: taomangalam/app/lib/data/drift/esquema_v3.dart:98

Ante un retraso hay dos salidas. reinicio cierra el ciclo con motivo reinicio y abre el ciclo siguiente desde el día 1. continuar_con_retraso sigue el conteo desde el día pendiente. Las dos agregan un evento_plan con metadatos JSON dias_retraso, dia_que_tocaba y dias_exigidos y conservan los ciclos y cumplimientos anteriores.

### REQ-07 `confirmed`
> Fuente: taomangalam/app/lib/data/drift/esquema_v1.dart:258

Guarda suave de reloj (DEC-172): si la fecha local actual es anterior a la del último cumplimiento del ciclo, no se confirma y se devuelve un aviso tipado sin crear cumplimiento.

### REQ-08 `confirmed` `enforcement`
> Fuente: taomangalam/app/lib/data/drift/dao/entidades.dart:39

La implementación reutiliza el esquema vigente y la capa de repositorios transaccional de TAO-249: no hay DDL nuevo; cumplimiento_correccion y evento_plan solo reciben INSERT (EntidadAppendOnly); cada operación que escribe varias filas (cerrar y abrir ciclo junto con su evento) va en una sola transacción; reloj y zona se inyectan, sin leer DateTime.now() ni dormir en las pruebas; las notas del cumplimiento no se registran en logs.

### REQ-09 `confirmed` `variant`
> Fuente: sonda:card-lint-de-docs-4d9deffd06

Todo doc del baseline que el ticket modifique (EP-06 backlog, SCHEMA.md, modelo de datos v2, PLAN.md) queda compliant con el linter de docs sin tocar .docs-baseline.txt.
## Tasks

#### S1.T1 — Crear el servicio de dominio de práctica (ubicación a confirmar junto al patrón de TAO-249) con puertos de reloj y zona inyectables (instante UTC y timezone_id para calcular local_date YYYY-MM-DD) y la operación abrirCicloInicial, que lee el evento 'activacion' de evento_plan (esquema_v3.dart:98) y crea ciclo_practica numero_ciclo 1 con inicio = local_date del evento, usando los repositorios transaccionales existentes y sin DDL nuevo. Si no hay activación, devuelve un error tipado.
Contrato: rollback: Revertir el commit; no hay migración ni datos que compensar.. Status: done

#### S1.T2 — Implementar confirmarDia, que inserta cumplimiento_dia con local_date, occurred_at_utc y timezone_id y es idempotente por ciclo + local_date (devuelve el vigente). Antes aplica la guarda DEC-172: si la fecha local actual es anterior al último cumplimiento, devuelve AvisoReloj tipado sin insertar. No escribe notas en logs.
Contrato: rollback: Revertir el commit.. Status: done

#### S1.T3 — Implementar desmarcarHoy (corrección sin motivo) y corregirDia (exige motivo si local_date es anterior a hoy y guarda estado_anterior y estado_nuevo), las dos con INSERT en cumplimiento_correccion (EntidadAppendOnly). Actualizar cumplimiento_dia.estado como proyección de la última corrección dentro de la misma transacción.
Contrato: rollback: Revertir el commit.. Status: done

#### S1.T4 — Escribir tests unitarios con reloj y zona falsos sobre base Drift en memoria: AC de inicio el lunes, QA-06-06-04 (activación el día 3 y doble cumplimiento sin duplicado), medianoche, cambio de zona (QA-06-06-03), desmarcado de hoy, corrección de ayer con y sin motivo, reloj un día atrás y append-only sin UPDATE ni DELETE. Correr también la suite de migración existente como regresión.
Contrato: rollback: Borrar los archivos de test nuevos.. Status: done

#### S2.T1 — Implementar el conteo y la detección de retraso del ciclo.
Contrato: rollback: Revertir el commit.. Status: pending

#### S2.T1.1 — Conteo de días cumplidos consecutivos (ignora los desmarcados por proyección). Al llegar a dias_requeridos marca accion_practica completada y cierra ciclo_practica como cumplido con fin, en una transacción. Si era la última acción diaria obligatoria, invoca la evaluación de plan completado de HU-06-05 (API a confirmar).
Contrato: rollback: Revertir el commit.. Status: pending

#### S2.T1.2 — evaluarRetraso: dia_que_tocaba = último cumplido + 1 o el inicio del ciclo; dias_retraso = hoy - dia_que_tocaba con umbral 0; dias_exigidos = dias_requeridos. Descontar los días en esperando_conexion, esperando_material o renovación pendiente según el estado de fase de HU-06-05. No modifica el conteo.
Contrato: rollback: Revertir el commit.. Status: pending

#### S2.T2 — Implementar las salidas. reiniciar cierra el ciclo con motivo_cierre 'reinicio' y abre numero_ciclo + 1 con inicio hoy. continuarConRetraso deja el ciclo abierto y la próxima confirmación cuenta como el día pendiente. Las dos insertan evento_plan (tipo 'reinicio' o 'continuar_con_retraso') con metadatos JSON {dias_retraso, dia_que_tocaba, dias_exigidos}, todo en una sola transacción y sin tocar cumplimientos previos. Rechazan la llamada si no hay retraso.
Contrato: rollback: Revertir el commit.. Status: pending

#### S2.T3 — Si se registra el estado de HU-06-06 en docs (EP-06 backlog u otro doc del baseline), dejarlos compliant con el linter sin editar .docs-baseline.txt. Si no se toca ningún doc, la task se cierra sin cambios.
Contrato: rollback: Revertir el commit de docs.. Status: pending

#### S2.T4 — Escribir los tests unitarios de retraso y salidas y el test de integración de secuencia de días con reloj falso: QA-06-06-01 (completado el miércoles), evaluación de plan completado, retraso a 3 días (2), activado el lunes sin confirmaciones y evaluado el miércoles (2, el lunes), QA-06-06-02 (1), fases de espera sin retraso, reinicio con ciclo 2 y metadatos, continuar con metadatos, conservación del ciclo 1 y rollback si falla el evento.
Contrato: rollback: Borrar los archivos de test nuevos.. Status: pending
## Cambios al modelo de datos

Ninguno.

## Sessions

### Session 1 · T2 · continue

**Tasks:**
- [x] S1.T1
- [x] S1.T2
- [x] S1.T3
- [x] S1.T4

**Gate (auto)**: En app/test/practica, los tests de apertura de ciclo, confirmación, correcciones y guarda de reloj pasan: inicio el lunes de activación, una sola fila ante la doble confirmación, desmarcado sin motivo con la original conservada, corrección de ayer rechazada sin motivo y aviso de reloj sin cumplimiento.

### Session 2 · T2 · open

**Tasks:**
- [ ] S2.T1
- [ ] S2.T1.1
- [ ] S2.T1.2
- [ ] S2.T2
- [ ] S2.T3
- [ ] S2.T4

**Gate (auto)**: Pasan el test de integración de secuencia de días con reloj falso y los unitarios de retraso: acción completada el miércoles, retraso 1 y 2 con dia_que_tocaba correcto, ninguna fase de espera cuenta como retraso, y evento_plan reinicio y continuar_con_retraso con dias_retraso, dia_que_tocaba y dias_exigidos. docs:check en verde si se tocaron docs.

### Session 3 · T0 · open
