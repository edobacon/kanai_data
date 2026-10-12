---
id: DOC-kb-mvp-14-tickets-h4-h5-tablero-t07-t11-y-cierre
project: tao-v2
type: doc
tags:
  - mvp
  - tickets
  - app
  - cierre
  - h5
---

# MVP tao-v2: tickets H4 y H5, tablero T07 a T11 y cierre

Fichas de T07a a T11b (10 tickets) y Q01 y Q02 (2 tickets), revisadas contra el análisis de frontend y el material de diseño (`03-referencia-de-diseno-y-muestras`, guía 09 del plan V3). Formato en `01-ficha-de-ticket`. Repo `tao-v2`. Cuentas externas: ninguna. Todo ticket de UI incluye el bloque estándar de línea visual de `03`.

## Motor que falta antes de T07 a T11

Verificado en el código heredado (solo hay enums y restricciones, ningún escritor):

- No existe tabla de intentos de reconocimiento inmutables (DEC-206) ni la fase `lectura_pendiente`. El retroceso termina en `_dejarEsperandoReparacion` (`retroceso_consulta.dart:341`) sin plan ni diagnóstico.
- `generador_plan_energizacion.dart` solo cubre energización: no hay plan de reparación, consumo único de corrector, quema y reposición, ni regla distinta de Casa 12. `PuertoValidacionUnidad` no tiene implementación (la hace T03a).
- No hay lógica RKL en `app/lib/data`: `medicionRkl` es solo un enum (DEC-135 y DEC-137).
- Los pasos `retoma` y `retorno_casa_1` no tienen manejador.
- La estrategia de cierre completo (fase `cierre_en_curso`, HU-06-12) no existe; `estrategia_cierre.dart` solo trae la mínima.

Regla común: una sola migración Drift coordinada por ticket de motor, aditiva, con fixture congelado del esquema anterior (los congelados existentes llegan a v3 en `app/test/drift/fixtures/`). TAO-257 y TAO-258 aparecían duplicados en V3: aquí cada uno se asigna a una sola pareja.

Pendiente de Contenido que afecta a T07 y T08: la guía 09 señala una precisión por resolver sobre pasos previos propios de ciertos anillos (V-10, V-11 y DEC-234). No se aprueban todos los casos hasta resolverla y no se inventa el cuarto anillo de la documentación antigua; los ejemplos de diseño usan el anillo 1.

## T07a. Motor de intentos y lectura pendiente

- Tipo: implement. Cambio: P (de FE-T07). Depende de: T05c.
- Entregable: tabla de intentos de reconocimiento inmutables, registro Sí o No (no se fuerza el Sí; con No se puede continuar o dejar lectura pendiente), producción de la fase `lectura_pendiente`, reanudación entre pasos, esquema Drift v7 con fixture v6 congelado (la v6 es de A05). La fuerza del kipot sale de la tirada ya registrada (Casa, anillo y D4); las ocho variantes de anillo son comunes a las Casas, no 96 pantallas. Salir y volver reabre la etapa pendiente conservando intentos y fechas.
- Aceptación local: pruebas del motor y de migración; retoma lectura pendiente e intentos sin gastar días ni reiniciar; ejemplo de diseño: retroceso 5 a 1, anillo 1, D4 en 3, fuerza alta.
- Datos y fixtures: retroceso, reconocimiento fallido y exitoso, interrupción entre pasos. Recursos: R07, R08. Datos externos: fuente y criterios explícitos por paso; no se inventan instrucciones ausentes.

## T07b. Diagnóstico de retroceso y detalle de anillo (V-09, V-10)

- Tipo: implement. Cambio: P. Depende de: T07a, A06.
- Diseño: muestra 08 izquierda (V-10, anillo 1 reconocimiento); V-09 sin muestra; familia Retroceso.
- Entregable: diagnóstico, reconocimiento del anillo con Sí o No, opciones de continuar o dejar la lectura pendiente, y el camino diagnóstico, anillo, reparación y coherencia cuando corresponda.
- Aceptación local: en emulador, retoma tras reinicio; el botón Sí no se fuerza; la lectura pendiente no consume días. Recursos: R05, R06, R07, R08. Assets: fondo Retroceso (A06).

## T08a. Motor de reparación y consumo de corrector

- Tipo: implement. Cambio: P (de FE-T08). Depende de: T07a, T03a, B5-02.
- Entregable: generador del plan de reparación con el orden lectura, acción del anillo y corrector, solicitud o Rhema, práctica, quema declarada y reposición; aviso inicial de que hacen falta corrector y un Kuberani nuevo; consumo único de corrector que no ocurre antes de la lectura y el reconocimiento; regla distinta de Casa 12; adaptador de `PuertoValidacionUnidad` para el motivo `corrector`; "esperando material" sin consumir días y con el detalle exacto de lo que falta (sin tienda ni catálogo). La validación online verifica el uso de la unidad; la app no certifica la aplicación física ni la quema; validar no completa por sí solo todo el paso.
- Aceptación local: orden de pasos y consumo únicos; pérdida de respuesta no consume dos veces; retoma tras reinicio; sin red no persiste el código crudo.
- Datos y fixtures: casas con y sin campos opcionales, C-DISP, C-USADA, respuesta perdida. Recursos: R02, R07, R08, R09. Datos externos: procedimientos de reparación del catálogo (anillos, minerales y materiales).

## T08b. Reparación (V-11)

- Tipo: implement. Cambio: P. Depende de: T08a, A06.
- Diseño: muestra 08 derecha (Validar corrector); familia Retroceso; el consumo contextual (V-39) hereda este fondo.
- Entregable: UI de la reparación con entrada manual de código y estados; el aviso "Paso 2 de 6" y las tarjetas de pasos comparten ancho, margen exterior y bordes (el contenedor padre aporta el margen y el aviso solo su padding interior, con crecimiento vertical); animal, asset y frase de la Casa salen del mismo objeto del catálogo (por ejemplo Casa 1, lobo, "Astuto como un lobo", conservando "Advertencia de la Casa" con el pasaje del dragón); ilustraciones provisionales con trazabilidad; la ficha de reparación rotula que no corresponde al estado actual cuando se abre desde llegada.
- Aceptación local: en emulador, orden de pasos correcto, Casa 12 con tratamiento diferenciado, alineación a distintos anchos y texto grande, fila de acción de al menos 56 dp. Recursos: R05, R06, R07, R08. Assets: V-11 (A06).

## T09a. Motor de coherencia vibracional y ciclos RKL

- Tipo: implement. Cambio: P (de FE-T09). Depende de: T08a.
- Entregable: coherencia con minerales, chakras, duración y días de la Casa (ejemplo de diseño: Casa 1, cornalina y amatista, chakras 2 y 6, tres minutos durante tres días, sin campo RKL); servicio de ciclos RKL solo donde la capacidad esté autorizada: la medición es un ingreso manual de una medición externa (no un sensor del teléfono) con umbrales: 9000 o más cierra el ciclo, de 5000 a 8999 agrega tres días y menos de 5000 agrega nueve, con nueva medición; cada visita y ciclo conserva su identidad; sin capacidad o sin tablilla no se inventa una medición pendiente; tramos excluyentes; progreso persistente.
- Aceptación local: progreso y desbloqueos reproducibles con reloj controlado; conserva el avance sin red; no exige sensores, audio ni dispositivos físicos.
- Datos y fixtures: ciclos y tramos completos e incompletos, reinicio intermedio. Recursos: R07, R08.

## T09b. Coherencia vibracional (V-12)

- Tipo: implement. Cambio: P. Depende de: T09a.
- Diseño: muestra 07 derecha (Coherencia personal, día 1); familia Retroceso.
- Entregable: vista de coherencia y RKL según la casa, con instrucciones del catálogo.
- Aceptación local: en emulador, avance conservado tras reinicio y sin campo RKL en el usuario base. Recursos: R05, R07, R08.

## T10a. Motor de retoma e historial

- Tipo: implement. Cambio: P (de FE-T10). Depende de: T06, T09a.
- Entregable: manejador de los pasos `retoma` y `retorno_casa_1`, reglas de retoma, proyección textual de la historia por consulta con todas las revisiones, fechas, movimientos y decisiones; para una indicación omitida, las salidas específicas del octavo anillo mantienen la confirmación y todo el historial (comenzar desde Casa 1 o rehacer desde el incumplimiento según la regla); no es un botón libre de deshacer pasos; sin adjuntos, fotos, notas multimedia ni exportación.
- Aceptación local: el historial conserva todas las revisiones; la retoma solo en fases permitidas, también tras reinicio.
- Datos y fixtures: consulta con correcciones, omisiones y práctica pendiente. Recursos: R07, R08.

## T10b. Historial de la consulta (V-13)

- Tipo: implement. Cambio: P. Depende de: T10a, T09b.
- Diseño: muestra 09 derecha (consulta activa); familia Recorrido.
- Entregable: vista del historial y decisiones de retoma; el último hito abre su detalle; la lectura histórica ampliada depende de la capacidad y los chevrones de la muestra no conceden permisos ni acceso libre a contenido anterior.
- Aceptación local: en emulador, historial completo y retoma solo donde corresponde; la corrección de la última tirada se alcanza desde aquí. Recursos: R05, R07, R08.

## T11a. Motor de cierre completo

- Tipo: implement. Cambio: P (de FE-T11). Depende de: T10a.
- Entregable: llegada directa a Casa 12 inicia Cierre en curso con práctica final y sus días (no cierra de inmediato); llegada y remisión con instrucciones y mantras propios, sin unirlos; sin reparación, anillo de reconocimiento, quema ni coherencia de kipot; ninguna fase permite otra tirada en el proyecto; estado Completado tras cumplir los días; un proyecto cerrado no se reinicia; cierre idempotente.
- Aceptación local: cierre persistente e idempotente; ninguna tirada posterior.
- Datos y fixtures: consulta lista y no lista para cierre, Casa 12 en curso y completada, doble cierre. Recursos: R07, R08.

## T11b. Cierre en Casa 12 (V-14)

- Tipo: implement. Cambio: P. Depende de: T11a, T10b.
- Diseño: muestra 09 izquierda (cierre cumplido, tres días); familia Recorrido.
- Entregable: UI de práctica final y cierre; en curso la acción es continuar la práctica (nunca Crear nueva consulta como sustituto); completado ofrece el historial o una nueva consulta independiente desde Casa 1; el resultado se refleja en Inicio e historial.
- Aceptación local: en emulador, práctica final cumplida, cierre persistente y consulta cerrada visible. Recursos: R05, R07, R08.

## Q01. Recorrido de punta a punta

- Tipo: implement. Módulo: Integración. Cambio: =.
- Depende de: P02, T11b, T06c, T03b.
- Entregable: ejecutor del flujo cruzado con evidencia correlacionada: Administrador asigna perfil y productos, Productor genera y confirma, usuario consume en el tablero, Productor consulta el estado, la consulta llega a su cierre; sin cargar unidades finales por seed.
- Aceptación local: navegador y emulador contra la misma API y base locales: creación real, uso único, respuesta perdida y cierre; sin mocks de éxito ni endpoints de sincronización.
- Datos y fixtures: ADM-1, PRD-A, USR-A, K-DISP generada en el recorrido.
- Recursos: R02, R03, R04, R05, R06, R07, R08, R09, R10, R11. Verificación: emulador y navegador.

## Q02. Permisos, navegación, diseño y entrega

- Tipo: implement. Módulo: Integración. Cambio: C (suma recordatorios, sesión web, presentación pública, portal de eliminación y revisión visual).
- Depende de: Q01, A04, W02, W03, W04, B3-04.
- Entregable: informe local reproducible de permisos, navegación, accesibilidad, empaquetado y pendientes futuros; casos nuevos: cerrar sesión cancela los recordatorios, un token web no sirve en la app, Estándar rechazado en la web, la presentación pública no emite cookies; portal de eliminación: la app lee `accountDeletionPortalUrl` de la configuración, abre el portal y una cuenta de prueba (USR-DEL) completa la eliminación por navegador y la app deja de tener sesión; revisión visual: una captura de cada vista del MVP comparada con su muestra según la matriz de `03` y su lista de aceptación común (fondo visible, opacidad, superficies opacas, contraste, objetivos táctiles).
- Aceptación local: se repite desde un entorno limpio y un build local (APK debug y build de Simulator, sin distribución); teléfono y tablet; Chromium y Firefox; texto grande; las corridas faltantes se reportan pendientes, no aprobadas.
- Recursos: R01, R02, R04 a R11. Verificación: emulador y navegador.
