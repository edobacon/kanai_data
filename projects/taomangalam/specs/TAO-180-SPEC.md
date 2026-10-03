---
id: TAO-180-SPEC
project: taomangalam
ticket: TAO-180
status: approved
---

# Suite automática de accesibilidad (objetivo táctil, etiqueta, contraste, escala y foco) con auditoría manual de EP-01

## Resumen ejecutivo

Se construye una utilidad de prueba reusable que aplica a un widget las guías de Flutter (androidTapTargetGuideline 48x48, iOSTapTargetGuideline 44x44, labeledTapTargetGuideline y textContrastGuideline) y falla el test ante cualquier incumplimiento; se la aplica a los componentes de HU-01-03 a HU-01-05, al shell de HU-01-08 y a las plantillas de HU-01-10 en teléfono y tablet con escala 100 % y 200 %; se agregan pruebas de foco (orden visual, anillo de stroke.focus, modales que anuncian título, atrapan y devuelven el foco); se cablea un job de CI que publica el reporte como artifact y falla ante un componente sin etiqueta semántica; y se registra la auditoría manual con TalkBack y VoiceOver sobre shell, V-31, V-51 y Ajustes con hallazgos clasificados.
NO incluye: semántica propia del tablero ni de vistas de otras épicas (HU-07-02), la prueba de contraste de tokens en CI (HU-01-01), ni los goldens responsive (HU-01-16); los hallazgos que pertenecen a otra épica se enlazan como issues, no se corrigen aquí.
Se sabe que funciona cuando: un botón de muestra de 40x40 hace fallar el test nombrando el objetivo táctil, la suite completa de accesibilidad pasa en CI con el reporte adjunto, a escala 200 % no hay excepciones de overflow ni acciones fuera de pantalla, un diálogo atrapa el foco y lo devuelve al control que lo abrió, y el informe de auditoría no deja bloqueantes abiertos en EP-01.
Tamaño: 4 sesiones T2 (cabe en el techo de entrada); riesgo medio concentrado en el inventario real de componentes de Widgetbook y en la parte humana de la auditoría.
ADVERTENCIA (fuera de alcance, no se implementa): si la suite detecta incumplimientos en componentes ya integrados, corregirlos puede tocar código de HU-01-03 a HU-01-05 y HU-01-10; solo los bloqueantes de EP-01 se corrigen aquí, el resto se registra como issue enlazado.

Datos a confirmar antes de ejecutar:
- Tamaño lógico del viewport de tablet y sus dos orientaciones (el request solo fija el teléfono 390x844 en QA-01-15-01): confirmar contra doc 43 y los breakpoints de HU-01-16.
- Ruta real de "la documentación de la app" para la guía breve y el comando del gate de docs (markdownlint, cspell, vale): confirmar contra `taomangalam/.docs-baseline.txt:461` y el workflow de docs del repo.
- Nombre del workflow y del job de CI de la app donde se agrega la suite y el upload del artifact: confirmar en `taomangalam/.github/workflows/`.
- Forma real del registro de Widgetbook (archivo y API de enumeración de los casos de HU-01-03 a HU-01-05) y nombres de los widgets de shell (HU-01-08) y plantillas (HU-01-10) ya integrados en origin/epic/EP-01.
- Repositorio y etiqueta a usar para los issues enlazados de hallazgos de otras épicas (el request solo cita `https://github.com/edobacon/taomangalam/issues/58`).

## Requirements

### REQ-01 `confirmed`
> Fuente: taomangalam/docs/backlog/EP-01_sistema_visual_navegacion_y_accesibilidad.md:1783

Existe una utilidad de prueba común, invocable sobre cualquier widget bajo test, que aplica las guías de Flutter de objetivo táctil Android (48 x 48), objetivo táctil iOS (44 x 44), objetivo táctil etiquetado y contraste de texto, y falla el test nombrando la guía incumplida.

### REQ-02 `confirmed`
> Fuente: docs/backlog/EP-01_sistema_visual_navegacion_y_accesibilidad.md:1783-1889 (HU-01-15, alcance: componentes HU-01-03 a HU-01-05 en telefono y tablet, escala 100 % y 200 %) + pedido de enmienda S1.T2

La suite vive en app/test/accessibility y recorre los componentes registrados en Widgetbook (HU-01-03 a HU-01-05) aplicando la utilidad en los viewports concretos telefono 390x844 y tablet 768x1024 y 1024x768, con textScaleFactor 1.0 y 2.0, un caso por entrada del registro, con timeout por caso y sin recorridos anidados por combinacion; ninguna entrada incumple objetivo tactil, etiqueta semantica ni contraste de texto. No quedan viewports ni escalas descritos como "a confirmar".

### REQ-03 `confirmed`
> Fuente: docs/backlog/EP-01_sistema_visual_navegacion_y_accesibilidad.md:1783-1889 (alcance: shell HU-01-08 y plantillas HU-01-10) + pedido de enmienda (dependencia TAO-178/HU-01-10)

El shell (HU-01-08) y las tres plantillas de HU-01-10 pasan la utilidad en telefono 390x844 y tablet 768x1024 y 1024x768 con escalas 1.0 y 2.0 sin desbordes ni acciones ocultas. La cobertura de plantillas se ejecuta sobre las plantillas reales integradas por HU-01-10 (TAO-178, en curso); no se sustituyen por fixtures ni maquetas locales de esta historia.

### REQ-04 `confirmed`
> Fuente: taomangalam/app/lib/design_system/theme_tokens.dart:170

Las pruebas de foco verifican que el orden de foco coincide con el orden visual, que el foco visible usa el grosor stroke.focus del tema sin alterar el tamaño de layout, y que los modales anuncian su título, atrapan el foco y lo devuelven al control que los abrió.

### REQ-05 `confirmed` `enforcement`
> Fuente: .github/workflows/ci-pr.yml:349 y :366 (job Flutter existente) + pedido de enmienda S4.T1

La ejecucion en CI reusa el job de Flutter existente en .github/workflows/ci-pr.yml:349 (flutter test --coverage --reporter expanded > coverage/pruebas.txt y el upload-artifact de la linea 366): la suite nueva app/test/accessibility queda descubierta por ese mismo flutter test, se preserva la propagacion del exit code y el upload con if: always(), y el reporte de accesibilidad queda identificable en el artifact. No se crea un job de test duplicado ni un quality-gate nuevo. Un cambio que agregue un componente sin etiqueta semantica hace fallar ese job.

### REQ-06 `confirmed`
> Fuente: docs/backlog/EP-01_sistema_visual_navegacion_y_accesibilidad.md:1783-1889 (criterio de auditoria manual y casos QA-01-15-01 a QA-01-15-03) + pedido de enmienda (tarea humana, sin aprobaciones asumidas)

La auditoria manual con TalkBack (Android) y VoiceOver (iPhone y iPad) sobre el shell, V-31, V-51 y Ajustes es trabajo HUMANO con evidencia real de dispositivo; su informe clasifica cada hallazgo en bloqueante o no bloqueante y enlaza su issue cuando existe. Mientras no se ejecute, sus tareas quedan en pending: no se dan por obtenidos ni la auditoria, ni los hallazgos, ni la aprobacion de Diseno, y no se inventan hallazgos ni identificadores de issue. El cierre de la historia exige que ningun bloqueante de EP-01 quede abierto.

### REQ-07 `confirmed` `enforcement`
> Fuente: app/README.md (archivo existente) + pedido de enmienda S1.T3

La guia breve de uso de la utilidad se agrega como una seccion de accesibilidad dentro de app/README.md existente, con el ejemplo minimo de invocacion y las escalas (1.0 y 2.0) y viewports (390x844, 768x1024, 1024x768) a cubrir. No se crea un archivo de documentacion nuevo ni se modifica .docs-baseline.txt por este cambio.

### REQ-08 `confirmed` `enforcement`
> Fuente: taomangalam/app/test/design_system/tao_button_states_test.dart:31

La utilidad y las suites reusan lo que ya existe en el repo: los valores del tema (TaoStrokes.focus desde theme_tokens.dart, sin el literal 3), el helper de literales tool/check_design_literals.dart y el patrón de ensureSemantics de los tests actuales, sin duplicar helpers ni introducir números mágicos; su firma pública queda estable para que otras épicas la adopten sin cambios.

### REQ-09 `confirmed` `enforcement`
> Fuente: Pedido de enmienda (pre-intake: TAO-178 en curso, V-31/V-51 como marcadores provisionales) + docs/backlog/EP-01_sistema_visual_navegacion_y_accesibilidad.md:1783-1889 (bloqueada por HU-01-08)

Las dependencias por etapa quedan explicitas y respetadas: la cobertura de plantillas depende de las tres plantillas de HU-01-10 (TAO-178) integradas; la auditoria fisica de V-31 (HU-01-12, TAO-183) y V-51 (HU-01-13, TAO-185) depende de esas vistas reales, hoy solo marcadores provisionales. Esta historia no implementa HU-01-12 ni HU-01-13 ni sustituye una vista real por un stub o marcador para dar por cumplida una cobertura. El trabajo que no depende de ellas (utilidad, documentacion y componentes ya existentes) puede avanzar en paralelo.

### REQ-10 `confirmed` `enforcement`
> Fuente: docs/backlog/EP-01_sistema_visual_navegacion_y_accesibilidad.md:1783-1889 (seccion "No incluye") + pedido de enmienda (no inventar hallazgos ni tocar trabajo ajeno)

El alcance queda acotado a esta historia: no se generan hallazgos ni identificadores de issue ficticios, no se declaran aprobaciones humanas no obtenidas, no se tocan los cambios dirty de TAO-178 ni de otros trabajos en curso, y no se incorpora alcance de HU-01-16 (goldens responsive) ni de HU-01-01 (contraste de tokens en CI).
## Tasks

#### S1.T1 — Crear la utilidad común en app/test/support/accessibility_guidelines.dart con una función que reciba el WidgetTester y aplique con expectLater las guías de Flutter androidTapTargetGuideline (48 x 48), iOSTapTargetGuideline (44 x 44), labeledTapTargetGuideline y textContrastGuideline, con parámetro de plataforma y mensajes de fallo que nombren la guía incumplida. No duplicar helpers: reusar el patrón de ensureSemantics y SemanticsHandle de test/design_system/tao_button_states_test.dart:187 y dejar la firma pública estable para otras épicas.
Contrato: rollback: Borrar app/test/support/accessibility_guidelines.dart; ningún archivo existente queda modificado.. Status: done

#### S1.T2 — Dejar la utilidad de accesibilidad como helper reutilizable con matriz de ejecucion concreta: telefono 390x844 y tablet 768x1024 y 1024x768, con textScaleFactor 1.0 y 2.0, expuestos como constantes compartidas en app/test/accessibility (sin literales dispersos y sin ningun tamano "a confirmar"). Mantener las pruebas negativas del helper: un boton de 40x40 falla por objetivo tactil Android (48x48) y un boton de 44x44 pasa iOS pero falla Android, y el mensaje de fallo nombra la guia incumplida. La firma publica del helper queda estable para que otras epicas la adopten sin cambios.
Contrato: rollback: Revertir app/test/accessibility al commit anterior (las constantes de viewport y las pruebas negativas son del mismo commit); el helper vuelve a su version previa sin afectar otras suites.. Status: done

#### S1.T3 — Agregar la guia breve como seccion de accesibilidad dentro de app/README.md EXISTENTE (no crear archivo nuevo): como invocar la utilidad en una historia nueva, ejemplo minimo de invocacion sobre un widget bajo test, y las escalas (1.0 y 2.0) y viewports (390x844, 768x1024, 1024x768) a cubrir. No modificar .docs-baseline.txt por este cambio.
Contrato: rollback: Revertir la seccion agregada en app/README.md con git checkout del archivo; no hay otros archivos de documentacion tocados.. Status: done

#### S1.T4 — Tests de la utilidad en app/test/accessibility/accessibility_guidelines_test.dart: botón de muestra de 40 x 40 que falla por objetivo táctil, control táctil sin Semantics.label que falla por etiqueta, texto de bajo contraste que falla por contraste, control de 44 x 44 que pasa en iOS y falla en Android, y TaoButton real que pasa las cuatro guías.
Contrato: rollback: Borrar app/test/accessibility/accessibility_guidelines_test.dart.. Status: done

#### S2.T1 — Crear app/test/accessibility/components_accessibility_test.dart que enumere las entradas del registro de Widgetbook de los componentes de HU-01-03 a HU-01-05 y genere un caso por entrada aplicando la utilidad. Mantener la forma acotada: un caso por entrada, sin producto cartesiano anidado, con timeout por caso, y viewport y escala como parámetros del caso.
Contrato: rollback: Borrar app/test/accessibility/components_accessibility_test.dart; no hay cambios en lib/.. Status: done

#### S2.T2 — Extender la suite de componentes a los cuatro contextos exigidos: teléfono 390 x 844 y tablet, cada uno con TextScaler.linear(1) y TextScaler.linear(2), fallando el caso ante excepción de overflow o control con tamaño cero, e incluir el caso del campo con mensaje de error a escala 200 % leyendo el mensaje completo del árbol semántico (QA-01-15-02).
Contrato: rollback: Dejar la suite solo con el contexto de teléfono a escala 100 % (estado de la task anterior).. Status: done

#### S2.T3 — Corregir los incumplimientos de componentes que la suite detecte y que sean bloqueantes de EP-01 (tamaño de objetivo táctil, etiqueta semántica faltante, contraste de texto), tomando los valores del tema y sin introducir literales. Si un incumplimiento pertenece a otra épica, no tocarlo: anotarlo para el informe de la sesión final.
Contrato: rollback: Revertir los cambios en los componentes afectados; la suite vuelve a marcar el incumplimiento y queda como hallazgo registrado.. Status: done

#### S2.T4 — Regresión de la sesión: correr la suite de componentes junto con las pruebas de design system afectadas y dejar ambas en verde, verificando que las correcciones no alteraron estados ni tamaños ya cubiertos.
Contrato: rollback: Revertir los ajustes de test de esta task; las correcciones de componentes se evalúan aparte.. Status: done

#### S3.T1 — Cubrir las tres plantillas de HU-01-10 con la utilidad en 390x844, 768x1024 y 1024x768 a escalas 1.0 y 2.0, verificando que no hay desbordes ni acciones ocultas. DEPENDENCIA: requiere las tres plantillas de TAO-178 (HU-01-10) integradas y publicas; TAO-178 esta en curso con las plantillas sin integrar, asi que esta tarea no se ejecuta contra fixtures propios ni maquetas locales. Si al llegar aqui las plantillas no estan integradas, dejar la tarea bloqueada y declarado el motivo, y continuar con el resto de las sesiones. No tocar los cambios dirty de TAO-178.
Contrato: rollback: Eliminar el archivo de cobertura de plantillas de app/test/accessibility; la suite de componentes y el helper quedan intactos.. Status: done

#### S3.T2 — Crear app/test/accessibility/focus_order_test.dart con el orden de foco del shell recorrido por Tab comparado contra el orden visual, y la verificación de que el anillo de foco usa el grosor TaoStrokes.focus leído del tema (theme_tokens.dart:170) sin cambiar el tamaño de layout del control enfocado.
Contrato: rollback: Borrar app/test/accessibility/focus_order_test.dart.. Status: done

#### S3.T3 — Agregar al test de foco los casos de modal: el diálogo expone su título en la semántica de la ruta, el recorrido por teclado no sale del diálogo, y al cerrarlo el foco vuelve al control que lo abrió. Corregir en el shell o en el componente de diálogo lo que falle, si el arreglo pertenece a EP-01.
Contrato: rollback: Revertir los casos de modal del test y los ajustes de diálogo asociados; los demás casos de foco siguen en pie.. Status: done

#### S3.T4 — Regresión de la sesión: correr las pruebas de shell, plantillas y foco junto con el caso de foco existente de TaoButton, confirmando que el anillo y los estados previos no cambiaron.
Contrato: rollback: Revertir los ajustes de test de esta task.. Status: done

#### S4.T1 — Integrar la suite de accesibilidad al job de Flutter YA EXISTENTE en .github/workflows/ci-pr.yml:349, que corre flutter test --coverage --reporter expanded > coverage/pruebas.txt y sube el resultado con upload-artifact en la linea 366: la suite app/test/accessibility queda descubierta por ese mismo flutter test sin invocacion adicional. Ajustar solo los steps necesarios para que el reporte de accesibilidad sea identificable en el artifact si hoy no queda cubierto, preservando la propagacion del exit code y el if: always() del upload. NO crear un job de test duplicado ni un quality-gate nuevo.
Contrato: rollback: git checkout .github/workflows/ci-pr.yml para volver al job original; la suite local sigue corriendo con flutter test sin depender del cambio de workflow.. Status: done

#### S4.T2 — Verificar la puerta negativa de CI: introducir temporalmente un componente táctil de muestra sin etiqueta semántica, comprobar que la suite y por lo tanto el job fallan nombrando el componente, y revertir el componente de muestra dejando el caso cubierto por el test de la utilidad.
Contrato: rollback: Eliminar el componente de muestra temporal; no queda rastro en el árbol.. Status: done

#### S4.T3 — Tarea HUMANA de auditoria fisica con lectores de pantalla (TalkBack en Android, VoiceOver en iPhone y iPad) sobre el shell, V-31, V-51 y Ajustes. DEPENDENCIA: requiere las vistas reales de V-31 (HU-01-12, TAO-183) y V-51 (HU-01-13, TAO-185); hoy existen solo marcadores provisionales y esas historias NO se implementan dentro de TAO-180. Mientras falten, la tarea y sus derivadas quedan trazables en pending: no se auditan stubs, no se dan por obtenidos hallazgos ni la aprobacion de Diseno, y no se inventan hallazgos ni identificadores de issue.
Contrato: rollback: Volver la tarea a pending y retirar cualquier registro de evidencia parcial; no hay cambio de codigo asociado.. Status: pending

#### S4.T4 — Corregir los hallazgos bloqueantes que pertenecen a EP-01 y abrir issues enlazados para los que pertenecen a otra épica, actualizando el informe hasta que no quede ningún bloqueante de EP-01 abierto.
Contrato: rollback: Revertir las correcciones de código y reabrir los hallazgos en el informe con su estado anterior.. Status: pending

#### S4.T5 — Regresión de cierre: correr los archivos de test de accesibilidad escritos en la historia más el test de estados del botón, y ajustar los casos que cubren los bloqueantes corregidos para que fallen si la corrección se revierte.
Contrato: rollback: Revertir los ajustes de test de esta task.. Status: pending

#### S5.T1 — Reproducir localmente el reporte de la suite de accesibilidad tal como lo publica CI y dejar la evidencia: correr la suite app/test/accessibility con el mismo comando del job de .github/workflows/ci-pr.yml:349 (flutter test --coverage --reporter expanded > coverage/pruebas.txt) y confirmar que los casos de accesibilidad aparecen identificables en coverage/pruebas.txt y que el exit code se propaga. Adjuntar el nombre del artifact del step de la linea 366 que lo transporta. Queda pending hasta contar con la corrida real de CI del PR.
Contrato: rollback: Borrar app/coverage/pruebas.txt y la nota de evidencia; no se modifica codigo ni workflow en esta tarea, asi que no hay revert de fuente.. Status: pending

#### S5.T2 — Tarea HUMANA: recorrer con lectores de pantalla reales el shell, V-31, V-51 y Ajustes (TalkBack en Android, VoiceOver en iPhone y en iPad) ejecutando QA-01-15-01, QA-01-15-02 y QA-01-15-03, y registrar la evidencia por dispositivo. Depende de las vistas reales de V-31 (HU-01-12, TAO-183) y V-51 (HU-01-13, TAO-185), hoy marcadores provisionales: mientras no existan, la tarea permanece pending y no se sustituyen por stubs. No se registran resultados no observados.
Contrato: rollback: Marcar la evidencia como no valida y volver la tarea a pending; no hay cambio de codigo que revertir.. Status: pending

#### S5.T3 — Tarea HUMANA: consolidar el informe de auditoria con cada hallazgo clasificado en bloqueante o no bloqueante y su issue enlazado cuando exista (sin inventar identificadores), y comprobar contra el tablero de EP-01 que ningun hallazgo bloqueante queda abierto antes del cierre. Los hallazgos que pertenecen a otra epica se registran como issues enlazados, no se corrigen aqui. Queda pending hasta que la auditoria con lectores se haya ejecutado.
Contrato: rollback: Retirar el informe consolidado y volver la tarea a pending, conservando los hallazgos individuales ya registrados.. Status: pending

#### S5.T4 — Tarea HUMANA: obtener de Diseno la aprobacion explicita de los hallazgos visuales de la auditoria contra el doc 43 y dejarla registrada con autor y fecha. No se da por obtenida ni se infiere de la ausencia de objeciones; la tarea queda pending hasta contar con la aprobacion real.
Contrato: rollback: Retirar el registro de aprobacion y volver la tarea a pending.. Status: pending
## Verificacion runtime

1. **Qué:** Smoke de la vista afectada por Suite automática de accesibilidad (objetivo táctil, etiqueta, contraste, escala y foco) con auditoría manual de EP-01
   - **Se debe ver:** La vista carga y responde sin errores.
   - **Dónde:** vista afectada por el ticket

## Enmiendas (refine_spec)

### Enmienda 1
**REQs:**

- REQ-02 (edit) `confirmed`: La suite vive en app/test/accessibility y recorre los componentes registrados en Widgetbook (HU-01-03 a HU-01-05) aplicando la utilidad en l
- REQ-03 (edit) `confirmed`: El shell (HU-01-08) y las tres plantillas de HU-01-10 pasan la utilidad en telefono 390x844 y tablet 768x1024 y 1024x768 con escalas 1.0 y 2
- REQ-05 (edit) `confirmed`: La ejecucion en CI reusa el job de Flutter existente en .github/workflows/ci-pr.yml:349 (flutter test --coverage --reporter expanded > cover
- REQ-06 (edit) `confirmed`: La auditoria manual con TalkBack (Android) y VoiceOver (iPhone y iPad) sobre el shell, V-31, V-51 y Ajustes es trabajo HUMANO con evidencia 
- REQ-07 (edit) `confirmed`: La guia breve de uso de la utilidad se agrega como una seccion de accesibilidad dentro de app/README.md existente, con el ejemplo minimo de 
- REQ-09 (add) `confirmed`: Las dependencias por etapa quedan explicitas y respetadas: la cobertura de plantillas depende de las tres plantillas de HU-01-10 (TAO-178) i
- REQ-10 (add) `confirmed`: El alcance queda acotado a esta historia: no se generan hallazgos ni identificadores de issue ficticios, no se declaran aprobaciones humanas

**Tasks agregadas:**

- S5: Reproducir localmente el reporte de la suite de accesibilidad tal como lo publica CI y dejar la evidencia: correr la suite app/test/accessibility con el mismo comando del job de .github/workflows/ci-pr.yml:349 (flutter test --coverage --reporter expanded > coverage/pruebas.txt) y confirmar que los casos de accesibilidad aparecen identificables en coverage/pruebas.txt y que el exit code se propaga. Adjuntar el nombre del artifact del step de la linea 366 que lo transporta. Queda pending hasta contar con la corrida real de CI del PR. (valida: REQ-05, test; rollback: Borrar app/coverage/pruebas.txt y la nota de evidencia; no se modifica codigo ni workflow en esta tarea, asi que no hay revert de fuente.)
- S5: Tarea HUMANA: recorrer con lectores de pantalla reales el shell, V-31, V-51 y Ajustes (TalkBack en Android, VoiceOver en iPhone y en iPad) ejecutando QA-01-15-01, QA-01-15-02 y QA-01-15-03, y registrar la evidencia por dispositivo. Depende de las vistas reales de V-31 (HU-01-12, TAO-183) y V-51 (HU-01-13, TAO-185), hoy marcadores provisionales: mientras no existan, la tarea permanece pending y no se sustituyen por stubs. No se registran resultados no observados. (valida: REQ-06, REQ-09; rollback: Marcar la evidencia como no valida y volver la tarea a pending; no hay cambio de codigo que revertir.)
- S5: Tarea HUMANA: consolidar el informe de auditoria con cada hallazgo clasificado en bloqueante o no bloqueante y su issue enlazado cuando exista (sin inventar identificadores), y comprobar contra el tablero de EP-01 que ningun hallazgo bloqueante queda abierto antes del cierre. Los hallazgos que pertenecen a otra epica se registran como issues enlazados, no se corrigen aqui. Queda pending hasta que la auditoria con lectores se haya ejecutado. (valida: REQ-06, REQ-10; rollback: Retirar el informe consolidado y volver la tarea a pending, conservando los hallazgos individuales ya registrados.)
- S5: Tarea HUMANA: obtener de Diseno la aprobacion explicita de los hallazgos visuales de la auditoria contra el doc 43 y dejarla registrada con autor y fecha. No se da por obtenida ni se infiere de la ausencia de objeciones; la tarea queda pending hasta contar con la aprobacion real. (valida: REQ-06, REQ-10; rollback: Retirar el registro de aprobacion y volver la tarea a pending.)

**Task ops:**

- edit S1.T2 { desc="Dejar la utilidad de accesibilidad como helper reutilizable con matriz de ejecucion concreta: telefono 390x844 y tablet 768x1024 y 1024x768, con textScaleFactor 1.0 y 2.0, expuestos como constantes compartidas en app/test/accessibility (sin literales dispersos y sin ningun tamano \"a confirmar\"). Mantener las pruebas negativas del helper: un boton de 40x40 falla por objetivo tactil Android (48x48) y un boton de 44x44 pasa iOS pero falla Android, y el mensaje de fallo nombra la guia incumplida. La firma publica del helper queda estable para que otras epicas la adopten sin cambios.", rollback="Revertir app/test/accessibility al commit anterior (las constantes de viewport y las pruebas negativas son del mismo commit); el helper vuelve a su version previa sin afectar otras suites.", validates=["REQ-01","REQ-02","REQ-08"], isTest=true, verify=["cd app && flutter test test/accessibility/"] }
- edit S1.T3 { desc="Agregar la guia breve como seccion de accesibilidad dentro de app/README.md EXISTENTE (no crear archivo nuevo): como invocar la utilidad en una historia nueva, ejemplo minimo de invocacion sobre un widget bajo test, y las escalas (1.0 y 2.0) y viewports (390x844, 768x1024, 1024x768) a cubrir. No modificar .docs-baseline.txt por este cambio.", rollback="Revertir la seccion agregada en app/README.md con git checkout del archivo; no hay otros archivos de documentacion tocados.", validates=["REQ-07"], isTest=false, verify=["grep -n -i 'accesibilidad' app/README.md","git diff --name-only -- .docs-baseline.txt"] }
- edit S3.T1 { desc="Cubrir las tres plantillas de HU-01-10 con la utilidad en 390x844, 768x1024 y 1024x768 a escalas 1.0 y 2.0, verificando que no hay desbordes ni acciones ocultas. DEPENDENCIA: requiere las tres plantillas de TAO-178 (HU-01-10) integradas y publicas; TAO-178 esta en curso con las plantillas sin integrar, asi que esta tarea no se ejecuta contra fixtures propios ni maquetas locales. Si al llegar aqui las plantillas no estan integradas, dejar la tarea bloqueada y declarado el motivo, y continuar con el resto de las sesiones. No tocar los cambios dirty de TAO-178.", rollback="Eliminar el archivo de cobertura de plantillas de app/test/accessibility; la suite de componentes y el helper quedan intactos.", validates=["REQ-03","REQ-09"], isTest=true, verify=["cd app && flutter test test/accessibility/"] }
- edit S4.T1 { desc="Integrar la suite de accesibilidad al job de Flutter YA EXISTENTE en .github/workflows/ci-pr.yml:349, que corre flutter test --coverage --reporter expanded > coverage/pruebas.txt y sube el resultado con upload-artifact en la linea 366: la suite app/test/accessibility queda descubierta por ese mismo flutter test sin invocacion adicional. Ajustar solo los steps necesarios para que el reporte de accesibilidad sea identificable en el artifact si hoy no queda cubierto, preservando la propagacion del exit code y el if: always() del upload. NO crear un job de test duplicado ni un quality-gate nuevo.", rollback="git checkout .github/workflows/ci-pr.yml para volver al job original; la suite local sigue corriendo con flutter test sin depender del cambio de workflow.", validates=["REQ-05","REQ-08"], isTest=false, verify=["grep -n -e 'flutter test' -e 'upload-artifact' -e 'always()' .github/workflows/ci-pr.yml","cd app && flutter test test/accessibility/ --reporter expanded"] }
- edit S4.T3 { desc="Tarea HUMANA de auditoria fisica con lectores de pantalla (TalkBack en Android, VoiceOver en iPhone y iPad) sobre el shell, V-31, V-51 y Ajustes. DEPENDENCIA: requiere las vistas reales de V-31 (HU-01-12, TAO-183) y V-51 (HU-01-13, TAO-185); hoy existen solo marcadores provisionales y esas historias NO se implementan dentro de TAO-180. Mientras falten, la tarea y sus derivadas quedan trazables en pending: no se auditan stubs, no se dan por obtenidos hallazgos ni la aprobacion de Diseno, y no se inventan hallazgos ni identificadores de issue.", rollback="Volver la tarea a pending y retirar cualquier registro de evidencia parcial; no hay cambio de codigo asociado.", validates=["REQ-06","REQ-09","REQ-10"], isTest=false, verify=[] }

## Sessions

### Session 1 · T2 · continue

**Tasks:**
- [x] S1.T1
- [x] S1.T2
- [x] S1.T3
- [x] S1.T4

**Gate (auto)**: Un archivo de test ejecutable donde un botón de muestra de 40 x 40 falla nombrando el objetivo táctil y un TaoButton real pasa las cuatro guías, más la guía de uso visible en la documentación de la app.

### Session 2 · T2 · continue

**Tasks:**
- [x] S2.T1
- [x] S2.T2
- [x] S2.T3
- [x] S2.T4

**Gate (auto)**: La suite de componentes corre sobre todas las entradas del registro de Widgetbook en teléfono y tablet a escala 100 % y 200 % y termina en verde, con el listado de casos visible en la salida del test.

### Session 3 · T2 · continue

**Tasks:**
- [x] S3.T1
- [x] S3.T2
- [x] S3.T3
- [x] S3.T4

**Gate (auto)**: Las pruebas de shell y plantillas pasan en teléfono y tablet a 100 % y 200 %, y el test de foco demuestra en verde que un diálogo atrapa el foco y lo devuelve al control que lo abrió.

### Session 4 · T2 · open

**Tasks:**
- [x] S4.T1
- [x] S4.T2
- [ ] S4.T3
- [ ] S4.T4
- [ ] S4.T5

**Gate (auto)**: La corrida de CI del PR muestra el job de accesibilidad con su reporte adjunto como artifact, y el informe de auditoría manual queda publicado con cada hallazgo, su severidad y su issue, sin bloqueantes abiertos en EP-01.

### Session 5 · T0 · open

**Tasks:**
- [ ] S5.T1
- [ ] S5.T2
- [ ] S5.T3
- [ ] S5.T4

**Gate (strong)**: Verificación humana con evidencias reales. No cerrar hasta contar con suite completa en CI, auditoría en dispositivos sobre vistas implementadas, hallazgos bloqueantes resueltos y aprobación de Diseño registrada.
