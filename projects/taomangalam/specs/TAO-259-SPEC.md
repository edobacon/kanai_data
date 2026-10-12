---
id: TAO-259-SPEC
project: taomangalam
ticket: TAO-259
status: draft
---

# HU-07-01 Spike de rendimiento del tablero procedural (CustomPainter) con rastros de 1, 8, 20 y 100 pasos y decision de renderer documentada

## Resumen ejecutivo

Se construye un prototipo aislado del tablero. La geometria de DEC-074 queda separada del renderer y se usan los tokens board/motion existentes. Sobre ese prototipo se arma un rastro sintetico de 1, 8, 20 y 100 pasos, una funcion pura de presupuesto de reproduccion (boardHistoryBudget 1600 ms, boardReplayMax 4500 ms, piso de 60 ms, fundido agrupado con los 8 pasos recientes individuales) y dos pares de estrategias de pintado que se pueden alternar. Tambien se agrega un benchmark con integration_test y trazas de timeline, y un documento del spike con datos, umbral y decision, enlazado desde la historia y desde DEC-167 o una DEC nueva. NO incluye el tablero de produccion (HU-07-02), la animacion de produccion (HU-07-06) ni el retroceso radial (HU-07-13). Por la Adenda 1 se mide en emulador y simulador: el umbral de 60 fps y la estrategia elegida quedan PROVISIONALES. Si son verificables la duracion de 100 pasos (4500 ms o menos), el piso de 60 ms, la comparacion relativa entre estrategias, que la reticula no se repinte y que no queden controladores tras pasar a segundo plano. Tamano: 3 sesiones (T2, T3, T2). Se sabe que funciona porque los tests unitarios del presupuesto pasan, el test de repintado pasa, el integration_test deja un JSON de percentiles por estrategia y rastro, y pnpm run check queda en verde. ADVERTENCIAS: (1) QA-07-01-04 [fidelity] pide comparar el preview de V-32 con la maqueta, pero la ficha dice 'Guia visual: no aplica (sin interfaz propia)' y excluye colores de produccion. Se mantiene como caso de fidelidad del prototipo y se marca ambiguo, asi que Diseno debe confirmar si aplica a un spike. (2) En el simulador de iOS no hay modo profile, entonces la medicion iOS es solo funcional. (3) HU-17-11 y HU-07-02 dependen de la decision, que hereda el caracter provisional. Datos a confirmar antes de ejecutar: (a) ubicacion del prototipo dentro de app/ (se propone app/lib/spikes/board_perf/; confirmar que custom_lint y la arquitectura lo admiten, o si debe ir bajo app/integration_test/); (b) existencia de un driver para reportData de timeline (se propone app/test_driver/perf_driver.dart; hoy solo consta app/integration_test/persistencia_reinicio_test.dart); (c) ruta del documento de DEC-167 y convencion de numeracion para una DEC nueva, en docs/ de taomangalam; (d) ruta donde viven los documentos de spike en docs/ y como se registran los artifacts de la historia; (e) AVDs y simuladores concretos que se usan como referencia (nivel de API minimo Android, version minima de iOS y tablet) segun DEC-198; (f) que exista en tokens.v1.json el valor del piso de 60 ms por segmento (en tokens.g.dart no aparece; si no existe, se declara como constante del spike con su referencia al doc 44 §14).

## Requirements

### REQ-01 `confirmed`
> Fuente: request (Alcance: prototipo con geometria de DEC-074 y rastro sintetico de 1, 8, 20 y 100 pasos) y Adenda 3 (reemplazar el test case fidelity por el de exencion)

El prototipo calcula la geometria del tablero de DEC-074 (12 sectores, 8 anillos, corona interior, yin-yang y zona de exclusion segun centerExclusionRatio) en un modulo puro sin dependencias del renderer. Sobre ella genera un rastro sintetico continuo de 1, 8, 20 y 100 pasos con curvas que rodean el centro por la corona y usan carriles proximos (DEC-186), sin entrada radial. El caso de prueba fidelity de V-32 se reemplaza por el de exencion (ver REQ-11).

### REQ-02 `confirmed`
> Fuente: taomangalam/app/lib/design_system/tokens/tokens.g.dart:373-375 (boardBuild, boardHistoryBudget, boardReplayMax)

Una funcion pura calcula el plan de reproduccion por cantidad de pasos segun el doc 44 §14. La construccion es por partes y el historial se comprime dentro de TaoMotion.boardHistoryBudget (1600 ms). Ningun segmento dura menos de 60 ms antes del agrupado. Cuando el total superaria TaoMotion.boardReplayMax (4500 ms), los pasos antiguos se agrupan por fundido y los 8 pasos mas recientes se dibujan de forma individual.

### REQ-03 `inferred`
> Fuente: taomangalam/app/lib/design_system/overlays/tao_skeleton.dart:176 (patron RepaintBoundary existente); taomangalam/app/test/design_system/overlays/tao_skeleton_test.dart:67

El prototipo permite alternar al menos dos pares de estrategias de pintado (doc 44 §19): reticula cacheada en una capa con RepaintBoundary frente a repintado completo, y rastro por segmentos frente a un unico trazo. Con el tablero quieto en 100 pasos, desplazar la pantalla que lo contiene o abrir un panel encima no repinta la reticula si no cambio.

### REQ-04 `inferred`
> Fuente: Criterios de aceptacion 1; Pruebas y evidencia; Adendas 1 y 3; pedido de cambio 2 y 5

Un benchmark con integration_test y trazas de timeline (app/integration_test/board_perf_test.dart, con su driver app/test_driver/perf_driver.dart) reproduce 1, 8, 20 y 100 pasos para cada estrategia. Registra como datos crudos percentiles (p50, p90 y p99) de tiempo de build y raster, cantidad de frames lentos, duracion total y lecturas de memoria (heap antes y despues de cada corrida), en telefono Android de gama baja (AVD API 24, 2 GB RAM, perfil de telefono pequeno), tablet horizontal (AVD tablet API 34 en landscape) y simulador iOS 15 o superior solo en debug, y guarda los resultados como artifact (JSON y trazas) bajo docs/ segun REQ-10. El benchmark NO compara la memoria contra el margen del Umbral: esa comparacion se hace en la sesion S3.T2 al redactar el documento. Por la Adenda 1 corre en emulador y simulador. La memoria se mide por el VM service (ver REQ-16).

### REQ-05 `inferred`
> Fuente: request: QA-07-01-03

El prototipo no deja AnimationController ni Ticker activos cuando la app pasa a segundo plano durante una reproduccion y vuelve.

### REQ-06 `inferred`
> Fuente: taomangalam/docs/backlog/EP-07_tablero_tirada_y_resultado.md:235-239

Al cerrar el spike existe un documento con dispositivos y versiones, metodo de medicion, tabla de datos, umbral de aceptacion sobre 60 fps fijado y justificado (PROVISIONAL segun la Adenda 1) y la decision: se confirma DEC-167 con la estrategia elegida o se abre una DEC nueva. Si ninguna estrategia alcanza el umbral en el Android de gama baja, el documento indica que efecto decorativo se elimina primero sin perder estado ni posicion. Queda enlazado desde HU-07-01 en EP-07 y desde DEC-167 o la DEC nueva.

### REQ-08 `confirmed`
> Fuente: pedido de cambio: grados en radianes con 2*pi y grep vacio sobre app/lib/spikes/board_perf/

El prototipo reutiliza los tokens existentes (TaoMotion.boardBuild, TaoMotion.boardHistoryBudget, TaoMotion.boardReplayMax y los parametros board: houses, rings, centerExclusionRatio, gridMinStroke, trailToneLevels) en lugar de literales. Los grados de la circunferencia se expresan en radianes con 2 * math.pi (import dart:math), de modo que ningun archivo del spike contiene el literal 360. Los literales numericos 1600, 4500 y 360 no aparecen en el codigo de app/lib/spikes/board_perf/: el comando 'grep -rnwE "1600|4500|360" app/lib/spikes/board_perf/' (limites de palabra, sobre codigo; el spike no usa comentarios de final de linea ni de bloque para estos numeros) devuelve vacio. El test de regresion que valida este criterio declara exactamente el mismo criterio (limites de palabra, los tres numeros 1600, 4500 y 360, sobre codigo). Ademas el prototipo respeta las reglas de custom_lint del repo (no_hardcoded_ui_text, no_theme_condition_or_literal_asset).

### REQ-09 `confirmed`
> Fuente: Adenda 2 Q1

El prototipo vive en app/lib/spikes/board_perf/. Si custom_lint o la arquitectura del repo lo impiden, el ejecutor usa la ubicacion permitida mas cercana y documenta la razon en el documento del spike. La geometria (REQ-01) queda en un modulo puro independiente del renderer dentro de esa misma ubicacion.

### REQ-10 `confirmed`
> Fuente: Adenda 2 Q2 y Q3; pedido de cambio 2 y 8

El documento del spike y los artifacts (JSON de resultados, trazas de timeline, video) se guardan bajo docs/ siguiendo la convencion existente de documentos de spikes; si no existe convencion previa, se usa docs/design/spikes/. Los artifacts binarios (videos y trazas) viven bajo docs/ en la ruta que dicta esa convencion o, si la convencion no cubre binarios, en un directorio que el linter de docs ignora, sin romper pnpm run check ni el baseline .docs-baseline.txt. DEC-167 se localiza en docs/product/decisiones; si hace falta una DEC nueva, usa el siguiente numero libre en esa misma carpeta. El documento enlaza los artifacts con rutas relativas validas.

### REQ-11 `confirmed`
> Fuente: Adenda 3 (Q6)

QA-07-01-04 [fidelity] queda eximido por ser un spike sin interfaz propia. La exencion se registra en una seccion explicita del documento del spike con su motivo. La confirmacion del rol Diseno del proyecto aun no existe: queda como verificacion humana diferida, con responsable y fecha como campos por completar, y no bloquea el cierre del ticket.

### REQ-12 `confirmed`
> Fuente: Adenda 2 (correccion: el simulador iOS se corre solo en debug) y Adenda 1 (el modo profile no existe en el simulador de iOS)

El simulador de iOS se ejecuta solo en modo debug, porque Flutter no soporta release ni profile ahi. Los resultados de iOS se etiquetan como debug en el JSON y en el documento, y no se comparan en valor absoluto con las mediciones profile de Android ni se usan para fijar el umbral.

### REQ-13 `confirmed`
> Fuente: Adenda 4 al request (variables de entorno nombradas) y Adenda 3 (tres comandos verify, iOS solo debug)

Existen tres comandos verify, uno por dispositivo, todos con la forma 'cd app && flutter drive --driver=test_driver/perf_driver.dart --target=integration_test/board_perf_test.dart -d <variable>', donde los archivos son los concretos app/integration_test/board_perf_test.dart y app/test_driver/perf_driver.dart y el id de cada dispositivo se pasa con una variable de entorno nombrada: Android de gama baja (AVD API 24, 2 GB de RAM) con -d $PERF_ANDROID_LOW_ID y --profile; tablet (AVD API 34 en landscape) con -d $PERF_ANDROID_TABLET_ID y --profile; simulador iOS 15 o superior con -d $PERF_IOS_SIM_ID y sin flag de modo (debug). No queda ningun placeholder <id>, <udid> ni <archivo> en el spec ni en los comandos. El documento del spike explica como obtener cada id con 'flutter devices' (columna del deviceId de cada AVD o simulador) y registra los ids reales usados en la corrida. Los comandos quedan documentados en el documento del spike y son reproducibles desde la raiz del repo.

### REQ-14 `confirmed`
> Fuente: pedido de cambio: REQ-14 usa los datos del benchmark ejecutado en S3.T1

La seccion Umbral del documento del spike incluye, como dato obligatorio, el margen de memoria (crecimiento maximo tolerado entre corridas y tope de memoria) junto al umbral de 60 fps, y ambos se marcan PROVISIONAL hasta medirlos en dispositivo real. La comparacion de las lecturas de memoria contra ese margen se hace en S3 (al redactar el documento) usando los datos del benchmark ejecutado en S3.T1 (JSON de resultados de esa corrida). El documento indica que la decision de estrategia tambien es provisional. La seccion Metodo describe como se mide la memoria (ver REQ-16).

### REQ-15 `confirmed` `variant`
> Fuente: sonda:card-lint-de-docs-4d9deffd06

Variante docs con lint en baseline (fusiona REQ-07, que se elimina): el documento del spike y los cambios a docs/backlog/EP-07_tablero_tirada_y_resultado.md (enlace desde HU-07-01, registro de la exencion y de las adendas) son compliant con el linter de docs. pnpm run check pasa y ningun doc sale del baseline .docs-baseline.txt, de modo que el job de docs y quality-gate no quedan en rojo.

### REQ-16 `confirmed`
> Fuente: Adenda 3 (medicion de memoria por VM service); QA-07-01-01; pedido de cambio 5

La seccion Metodo del documento del spike describe la medicion de memoria por el VM service: el benchmark se conecta al VM service (por ejemplo con vm_service y developer.Service.getInfo), lee el uso de heap (getMemoryUsage del isolate principal) antes y despues de cada corrida, fuerza GC antes de cada lectura y calcula el crecimiento entre corridas consecutivas, que se compara con el margen de memoria del Umbral. QA-07-01-01 (tres corridas seguidas de 20 pasos en el Android de gama baja) se registra aqui: quedan guardadas las tres lecturas de heap y el crecimiento entre ellas, sin crecimiento por encima del margen. Si app/pubspec.yaml no declara vm_service, se agrega como dev_dependency (nunca como dependency de produccion).

### REQ-17 `confirmed`
> Fuente: pedido de cambio: S3.T6 verify comprueba que el job no ejecuta el archivo

El job de integracion de ci-pr.yml no ejecuta app/integration_test/board_perf_test.dart: el archivo se excluye explicitamente del job, o se confirma y documenta que el job corre una lista de archivos que no lo incluye. La comprobacion valida el comportamiento del job (que no lo ejecute), no la ausencia literal del nombre del archivo en el workflow. El benchmark requiere dispositivo o emulador con perfil y no debe dejar el PR en rojo.

### REQ-18 `confirmed`
> Fuente: enmienda:validacion-doc-ampliada

El test Dart app/test/spikes/board_perf/spike_doc_validation_test.dart (creado en S3.T5, no en S3.T2) es el artefacto concreto que valida el documento del spike: lo lee y verifica con assertions de valores concretos que (a) los resultados de iOS estan etiquetados como debug y no mencionan --profile ni --release como modo de ejecucion en iOS, (b) la seccion Umbral incluye el margen de memoria marcado PROVISIONAL, (c) la seccion Metodo describe la medicion de memoria por el VM service, (d) existe la seccion de exencion de QA-07-01-04 con los campos Responsable y Fecha pendientes de completar, (e) estan los tres comandos verify con -d, (f) existe la seccion Degradacion, (g) la ubicacion del prototipo esta documentada, y (h) hay un video enlazado por dispositivo (Android, tablet, iOS).

### REQ-19 `confirmed`
> Fuente: pedido de cambio: un video por dispositivo cubriendo los cuatro rastros

Por cada dispositivo (Android gama baja, tablet y simulador iOS) se graba un unico video que cubre la reproduccion de los cuatro rastros (1, 8, 20 y 100 pasos), como parte de la task de ejecucion del benchmark (S3.T1): adb screenrecord en Android y tablet, xcrun simctl io recordVideo en el simulador iOS. Los tres videos se guardan como artifacts bajo docs/ segun REQ-10 y se enlazan desde el documento del spike.
## Tasks

#### S1.T1 — Crear el modulo puro de geometria del tablero (DEC-074) en app/lib/spikes/board_perf/board_geometry.dart (ubicacion a confirmar). Calcula 12 sectores, 8 anillos, corona interior, yin-yang y la zona de exclusion a partir de los parametros board (houses, rings y centerExclusionRatio de tokens.v1.json:260, expuestos por el generador en generate_design_tokens.dart:740-781), sin imports de pintado.
Contrato: rollback: git revert del commit; borrar board_geometry.dart.. Status: pending

#### S1.T2 — Crear el generador de rastro sintetico en app/lib/spikes/board_perf/synthetic_trail.dart. Genera 1, 8, 20 y 100 pasos continuos con curvas que rodean el centro por la corona y carriles proximos (DEC-186), sin entrada radial (fuera de alcance, HU-07-13).
Contrato: rollback: git revert del commit; borrar synthetic_trail.dart.. Status: pending

#### S1.T3 — Crear la funcion pura del plan de reproduccion en app/lib/spikes/board_perf/replay_budget.dart. Usa TaoMotion.boardBuild (360), TaoMotion.boardHistoryBudget (1600) y TaoMotion.boardReplayMax (4500) de tokens.g.dart:373-375, un piso de 60 ms por segmento (doc 44 §14) como constante con nombre, 8 pasos recientes individuales y los antiguos en un grupo de fundido. Lanza ArgumentError si los pasos son 0 o menos.
Contrato: rollback: git revert del commit; borrar replay_budget.dart.. Status: pending

#### S1.T4 — Widget base del prototipo en app/lib/spikes/board_perf/ que reproduce el plan de replay_budget con un AnimationController minimo (solo avanza la reproduccion segun el plan de duracion por segmento). El ciclo de vida completo del controlador (pausa y limpieza al pasar a segundo plano) queda en S2. Usa los tokens TaoMotion y los parametros board existentes, y los grados de la circunferencia como radianes con 2 * math.pi, sin literales 1600, 4500 ni 360.
Contrato: rollback: Eliminar solo board_perf_prototype.dart y main.dart de app/lib/spikes/board_perf/; no tocar la geometria pura ni el plan de reproduccion.. Status: pending

#### S1.T5 — Tests unitarios en app/test/spikes/board_perf/: board_geometry_test.dart (96 celdas, exclusion central, imports sin pintado) y replay_budget_test.dart (1, 8, 20 y 100 pasos; total de 4500 ms o menos; piso de 60 ms; ultimos 8 individuales con indices 92..99; ArgumentError con 0 pasos).
Contrato: rollback: git revert del commit; borrar los archivos de test.. Status: pending

#### S1.T6 — Crear el documento del spike con el nombre fijo docs/design/spikes/board-perf-spike.md, con el esqueleto de secciones (dispositivos y versiones, Metodo, datos, Umbral, Decision, exencion de QA-07-01-04, Degradacion, ubicacion del prototipo). Este es el unico nombre de documento: S3 y spike_doc_validation_test.dart lo reutilizan sin redefinirlo.
Contrato: rollback: Revertir con git los archivos creados o modificados por esta task. El rollback no depende ni incluye el enlace desde HU-07-01 en docs/backlog/EP-07_tablero_tirada_y_resultado.md, que no se agrega en esta task.. Status: pending

#### S2.T1 — Implementar las estrategias de pintado alternables, el ciclo de vida y el benchmark con integration_test (doc 44 §19).
Contrato: rollback: git revert de los commits de las subtasks.. Status: pending

#### S2.T1.1 — Estrategia de reticula: separar el painter de la reticula en una capa con RepaintBoundary (mismo patron que tao_skeleton.dart:176) con shouldRepaint false si no cambia, y una variante de repintado completo en un unico painter. El selector se hace por parametro del prototipo.
Contrato: rollback: git revert del commit.. Status: pending

#### S2.T1.2 — Estrategia de rastro: variante por segmentos (un Path por paso y fundido en el grupo antiguo) y variante de trazo unico (un Path acumulado con PathMetrics para el avance), conmutables por parametro.
Contrato: rollback: git revert del commit.. Status: pending

#### S2.T1.3 — Ciclo de vida: el prototipo observa AppLifecycleState, detiene y libera el controlador en paused y desmonta sin dejar tickers.
Contrato: rollback: git revert del commit.. Status: pending

#### S2.T1.4 — Unica task que crea app/integration_test/board_perf_test.dart y app/test_driver/perf_driver.dart. El benchmark reproduce 1, 8, 20 y 100 pasos por estrategia y hace tres corridas consecutivas de 20 pasos (QA-07-01-01), con lectura de heap por VM service (getMemoryUsage del isolate principal) antes y despues de cada corrida y GC forzado previo a cada lectura (REQ-16). Declarar vm_service como dev_dependency en app/pubspec.yaml (nunca como dependency). Guardar JSON de resultados y trazas de timeline como artifacts bajo docs/ segun REQ-10. No compara la memoria contra el margen del Umbral (eso es S3.T2). Ninguna otra task crea estos dos archivos.
Contrato: rollback: Eliminar app/integration_test/board_perf_test.dart y app/test_driver/perf_driver.dart y revertir la entrada vm_service de dev_dependencies en app/pubspec.yaml (y pubspec.lock si cambio).. Status: pending

#### S2.T1.5 — Widget tests en app/test/spikes/board_perf/: repaint_test.dart cuenta los paint() de la reticula al desplazar 300 px y al abrir un panel, con control negativo en repintado completo; lifecycle_test.dart cubre paused y resumed (transientCallbackCount 0) y el desmontaje a mitad de 100 pasos sin excepcion.
Contrato: rollback: git revert del commit; borrar los archivos de test.. Status: pending

#### S3.T1 — Ejecutar el benchmark en los tres dispositivos con los tres comandos verify (-d $PERF_ANDROID_LOW_ID y --profile; -d $PERF_ANDROID_TABLET_ID y --profile; -d $PERF_IOS_SIM_ID en debug, sin flag de modo) y grabar un unico video por dispositivo que cubra los rastros de 1, 8, 20 y 100 pasos. Android de gama baja: 'adb -s $PERF_ANDROID_LOW_ID shell screenrecord /sdcard/perf-android-low.mp4'. Tablet: 'adb -s $PERF_ANDROID_TABLET_ID shell screenrecord /sdcard/perf-android-tablet.mp4'. iOS: 'xcrun simctl io $PERF_IOS_SIM_ID recordVideo perf-ios.mov'. Sin placeholders angulares en ningun comando. Los videos se guardan como artifacts segun REQ-10 en docs/design/spikes/artifacts/ con el nombre del dispositivo: docs/design/spikes/artifacts/perf-android-low.mp4 y docs/design/spikes/artifacts/perf-android-tablet.mp4 (traidos con 'adb -s <variable> pull'), y docs/design/spikes/artifacts/perf-ios.mov (simctl graba en .mov). Guardar tambien el JSON de resultados y las trazas en esa carpeta.
Contrato: rollback: Eliminar solo los artifacts generados por esta corrida (JSON, trazas y videos) bajo docs/; no tocar el benchmark ni el documento.. Status: pending

#### S3.T2 — REDACTAR el documento completo del spike (bajo la ruta de REQ-10) con las secciones: Dispositivos y versiones; Metodo (incluye la medicion de memoria por VM service con GC previo y crecimiento entre corridas, REQ-16); Datos (tabla desde el JSON de S3.T1); Umbral (60 fps y margen de memoria, ambos PROVISIONAL, con la comparacion de las lecturas de memoria de S3.T1 contra el margen); Decision (confirma DEC-167 con la estrategia elegida o abre DEC nueva, tambien PROVISIONAL); Degradacion (que efecto decorativo se elimina primero); Exencion de QA-07-01-04 con Responsable y Fecha por completar; ubicacion del prototipo; los tres comandos verify con los ids reales usados y como obtenerlos con 'flutter devices'; enlaces relativos a JSON, trazas y los tres videos.
Contrato: rollback: Revertir los cambios que esta task hizo al documento del spike (restaurar la version previa del archivo con git); no tocar los artifacts de S3.T1 ni EP-07.. Status: pending

#### S3.T3 — Enlazar el documento del spike desde HU-07-01 en docs/backlog/EP-07_tablero_tirada_y_resultado.md y desde DEC-167 (o la DEC nueva) en docs/product/decisiones; registrar en EP-07 la exencion de QA-07-01-04 y las adendas 1 a 4. Los cambios quedan compliant con el linter de docs y sin salir del baseline .docs-baseline.txt (REQ-15).
Contrato: rollback: Revertir con git los cambios de esta task en EP-07 y en la DEC (enlaces, registro de exencion y adendas); no tocar el documento del spike.. Status: pending

#### S3.T4 — Regresion final: correr 'cd app && flutter test test/spikes/board_perf/', 'cd app && dart run custom_lint' y 'pnpm run check', y el grep de literales con limites de palabra (1600, 4500, 360) sobre app/lib/spikes/board_perf/ sin contar comentarios, que debe dar cero coincidencias. Reportar suites, totales y clasificacion de fallas (introducido vs preexistente).
Contrato: rollback: Sin cambios de codigo propios: si la task ajusta algo, revertir solo ese ajuste con git.. Status: pending

#### S3.T5 — Crear app/test/spikes/board_perf/spike_doc_validation_test.dart que lee docs/design/spikes/board-perf-spike.md (el nombre fijado en S1.T6, sin definir otra ruta) y valida con assertions de valores concretos los puntos (a) a (h) de REQ-18.
Contrato: rollback: Eliminar app/test/spikes/board_perf/spike_doc_validation_test.dart.. Status: pending

#### S3.T6 — Crear app/test/spikes/board_perf/ci_integration_job_test.dart, que lee .github/workflows/ci-pr.yml, resuelve el conjunto de archivos que el job de integracion ejecutaria (lista explicita o patron menos exclusiones) y asserta que app/integration_test/board_perf_test.dart NO esta en ese conjunto. Valida el comportamiento del job, no la presencia literal del nombre. Si el job ejecuta todo integration_test/, agregar la exclusion explicita en ci-pr.yml y documentarlo.
Contrato: rollback: Eliminar ci_integration_job_test.dart y revertir con git solo el cambio de exclusion en .github/workflows/ci-pr.yml si esta task lo hizo.. Status: pending
## Verificacion runtime

1. **Qué:** Verificar en runtime: El prototipo permite alternar al menos dos pares de estrategias de pintado (doc 44 §19): reticula cacheada en una capa con RepaintBoundary frente a repintado completo, y rastro por segmentos frente a un unico trazo. Con el tablero quieto en 100 pasos, desplazar la pantalla que 
   - **Se debe ver:** La vista renderiza sin errores de consola y el comportamiento esperado es visible.
   - **Dónde:** vista afectada por el ticket

## Cambios al modelo de datos

Ninguno.

## Enmiendas (refine_spec)

### Enmienda 1
**REQs:**

- REQ-09 (add) `confirmed`: El prototipo vive en app/lib/spikes/board_perf/. Si custom_lint o la arquitectura del repo lo impiden, el ejecutor usa la ubicacion permitid
- REQ-10 (add) `confirmed`: El documento del spike y los artifacts (JSON de resultados, trazas de timeline, video) se guardan bajo docs/ siguiendo la convencion existen
- REQ-11 (add) `confirmed`: QA-07-01-04 [fidelity] queda eximido por ser un spike sin interfaz propia. La exencion y la confirmacion de Diseno quedan registradas en una
- REQ-12 (add) `confirmed`: El simulador de iOS se ejecuta solo en modo debug, porque Flutter no soporta release ni profile ahi. Los resultados de iOS se etiquetan como
- REQ-13 (add) `confirmed`: Existe un comando verify por dispositivo, cada uno con el selector -d <deviceId> (emulador Android de gama baja, simulador iOS en debug, tab
- REQ-14 (add) `confirmed`: La seccion Umbral del documento del spike incluye, como dato obligatorio, el margen de memoria (crecimiento maximo tolerado entre corridas y
- REQ-15 (add) `confirmed`: Variante docs con lint en baseline: el documento del spike y los cambios a docs/backlog/EP-07_tablero_tirada_y_resultado.md (enlace desde HU

**Tasks agregadas:**

- S4: Registrar en el documento del spike (bajo docs/, convencion de spikes) la exencion de QA-07-01-04 [fidelity]: seccion explicita con el motivo (spike sin interfaz propia), la confirmacion de Diseno (responsable y fecha) y el enlace desde HU-07-01 en docs/backlog/EP-07_tablero_tirada_y_resultado.md. (valida: REQ-11, REQ-15; rollback: Revertir con git la seccion de exencion y el enlace en EP-07; el documento del spike queda sin la exencion registrada.)
- S4: En la seccion Umbral del documento del spike agregar el margen de memoria (crecimiento maximo entre corridas y tope) como dato obligatorio junto al umbral de 60 fps, marcar ambos como PROVISIONAL hasta medir en dispositivo real, y listar un comando verify por dispositivo con -d <deviceId>. Indicar que el simulador iOS corre solo en debug. (valida: REQ-12, REQ-13, REQ-14, REQ-15; rollback: Revertir con git los cambios de la seccion Umbral y de comandos del documento del spike.)
- S4: Ubicar el prototipo en app/lib/spikes/board_perf/ (si custom_lint o la arquitectura lo impiden, usar la ubicacion permitida mas cercana y documentarlo), guardar documento y artifacts bajo docs/ segun la convencion de spikes, y enlazar desde DEC-167 en docs/product/decisiones o desde la DEC nueva con el siguiente numero libre en esa carpeta. (valida: REQ-09, REQ-10, REQ-15; rollback: Mover el prototipo a su ubicacion previa y revertir con git los archivos de docs/ y de docs/product/decisiones agregados o editados.)
- S4: Verificar que el lanzamiento del benchmark en simulador iOS solo acepta modo debug y que el JSON de resultados registra mode por dispositivo; agregar la prueba que falla si iOS corre en profile o release, o si falta el margen de memoria en la seccion Umbral. (valida: REQ-12, REQ-13, REQ-14, test; rollback: Eliminar con git la prueba agregada y el chequeo de modo.)

### Enmienda 2
**REQs:**

- REQ-01 (edit) `inferred`: El prototipo calcula la geometria del tablero de DEC-074 (12 sectores, 8 anillos, corona interior, yin-yang y zona de exclusion segun center
- REQ-04 (edit) `inferred`: Un benchmark con integration_test y trazas de timeline (app/integration_test/board_perf_test.dart) reproduce 1, 8, 20 y 100 pasos para cada 
- REQ-11 (edit) `confirmed`: QA-07-01-04 [fidelity] queda eximido por ser un spike sin interfaz propia. La exencion se registra en una seccion explicita del documento de
- REQ-13 (edit) `confirmed`: Existen tres comandos verify, uno por dispositivo, cada uno con el selector -d <deviceId>: Android de gama baja (AVD API 24, 2 GB de RAM), t
- REQ-14 (edit) `confirmed`: La seccion Umbral del documento del spike incluye, como dato obligatorio, el margen de memoria (crecimiento maximo tolerado entre corridas y
- REQ-15 (edit) `confirmed`: Variante docs con lint en baseline (fusiona REQ-07): el documento del spike y los cambios a docs/backlog/EP-07_tablero_tirada_y_resultado.md
- REQ-16 (add) `confirmed`: La seccion Metodo del documento del spike describe la medicion de memoria por el VM service: el benchmark se conecta al VM service (por ejem
- REQ-17 (add) `confirmed`: El job de integracion de ci-pr.yml no ejecuta app/integration_test/board_perf_test.dart: el archivo se excluye explicitamente del job, o se 
- REQ-18 (add) `confirmed`: Las validaciones del documento del spike (iOS solo debug, no profile ni release; margen de memoria presente; seccion de exencion; metodo de 

**Tasks agregadas:**

- S3: Crear app/test/spikes/board_perf/spike_doc_validation_test.dart: lee el documento del spike bajo docs/ y verifica con assertions concretas que (a) los resultados de iOS estan etiquetados debug y no profile ni release, (b) la seccion Umbral trae crecimiento maximo de memoria y tope, marcados PROVISIONAL, (c) existe la seccion de exencion de QA-07-01-04 con Responsable y Fecha por completar y verificacion diferida, (d) el Metodo describe la medicion de memoria por VM service, (e) hay tres comandos verify con -d. (valida: REQ-18, REQ-11, REQ-12, REQ-13, REQ-14, REQ-16, test; rollback: Borrar app/test/spikes/board_perf/spike_doc_validation_test.dart; no afecta codigo de produccion.)
- S3: Revisar .github/workflows/ci-pr.yml: confirmar si el job de integracion ejecuta todo integration_test/. Si lo hace, excluir app/integration_test/board_perf_test.dart (por ejemplo ejecutando una lista explicita de archivos o un filtro que lo omita). Si no lo hace, documentar la confirmacion en el documento del spike. (valida: REQ-17; rollback: Revertir el cambio en .github/workflows/ci-pr.yml con git checkout sobre ese archivo.)

**Task ops:**

- edit S3.T1 { desc="Ejecutar el benchmark app/integration_test/board_perf_test.dart con tres comandos verify, uno por dispositivo, cada uno con -d <deviceId> (ids reales de 'flutter devices', fijados en los comandos): Android de gama baja (AVD API 24, 2 GB RAM, telefono pequeno) con --profile; tablet (AVD API 34 en landscape) con --profile; simulador iOS 15 o superior SOLO en debug (sin --profile ni --release, porque Flutter no los soporta ahi) y sus resultados etiquetados mode=debug. Medir memoria por el VM service (heap antes y despues de cada corrida, GC previo) y guardar JSON y trazas bajo docs/.", validates=["REQ-04","REQ-12","REQ-13","REQ-16"], verify=["flutter test app/integration_test/board_perf_test.dart -d <androidApi24DeviceId> --profile","flutter test app/integration_test/board_perf_test.dart -d <tabletApi34DeviceId> --profile","flutter test app/integration_test/board_perf_test.dart -d <iosSimulatorDeviceId>"] }
- move S4.T1 → S1
- move S4.T2 → S3
- move S4.T3 → S3

**REQ ops:**

- remove REQ-07

### Enmienda 3
**REQs:**

- REQ-15 (edit) `confirmed`: Variante docs con lint en baseline (fusiona REQ-07, que se elimina): el documento del spike y los cambios a docs/backlog/EP-07_tablero_tirad
- REQ-18 (edit) `confirmed`: El test Dart app/test/spikes/board_perf/spike_doc_validation_test.dart es el artefacto concreto que valida el documento del spike: lo lee y 
- REQ-19 (add) `confirmed`: Por cada dispositivo (Android gama baja, tablet y simulador iOS) se captura un video de la reproduccion como parte de la task de ejecucion d
- REQ-20 (add) `confirmed`: El prototipo no contiene los literales 1600, 4500 ni 360 como valores de presupuesto o geometria: usa los tokens existentes (TaoMotion.board

**Task ops:**

- edit S3.T1 { desc="Ejecutar el benchmark en cada dispositivo con 'cd app && flutter drive --driver=test_driver/perf_driver.dart --target=integration_test/board_perf_test.dart -d <id>'. Android de gama baja y tablet con --profile; en el simulador iOS (solo debug) sin --profile ni --release. Los <id> se obtienen con 'flutter devices'. Por cada dispositivo se captura tambien el video de la reproduccion y se guarda junto al JSON y las trazas como artifact bajo docs/. Son tres comandos verify, uno por dispositivo.", validates=["REQ-04","REQ-12","REQ-13","REQ-19"] }
- edit S1.T6 { desc="Crear SOLO el esqueleto del documento del spike (secciones Dispositivos, Metodo, Datos, Umbral, Decision y la seccion de exencion de QA-07-01-04 con Responsable y Fecha como campos pendientes) y el enlace desde HU-07-01 en EP-07. No se completan datos, umbral ni decision: eso lo hace S3.T2.", validates=["REQ-06","REQ-10","REQ-11","REQ-15"] }
- edit S3.T2 { desc="Completar el documento del spike creado como esqueleto en S1.T6: dispositivos y versiones, Metodo (incluida la medicion de memoria por VM service), tabla de datos, Umbral con margen de memoria, decision, enlaces a artifacts y videos, y los tres comandos verify. Marcar PROVISIONAL el umbral y la decision. Crear app/test/spikes/board_perf/spike_doc_validation_test.dart (REQ-18) y dejar el doc compliant con pnpm run check.", validates=["REQ-06","REQ-14","REQ-15","REQ-16","REQ-18","REQ-19"], isTest=false }
- edit S3.T4 { validates=["REQ-08","REQ-20"], verify=["grep -rnE '1600|4500|360' app/lib/spikes/board_perf/ && exit 1 || exit 0"] }

**REQ ops:**

- remove REQ-07

### Enmienda 4
**REQs:**

- REQ-04 (edit) `inferred`: Un benchmark con integration_test y trazas de timeline (app/integration_test/board_perf_test.dart) reproduce 1, 8, 20 y 100 pasos para cada 
- REQ-10 (edit) `confirmed`: El documento del spike y los artifacts (JSON de resultados, trazas de timeline, video) se guardan bajo docs/ siguiendo la convencion existen
- REQ-12 (edit) `confirmed`: El simulador de iOS se ejecuta solo en modo debug, porque Flutter no soporta release ni profile ahi. Los resultados de iOS se etiquetan como
- REQ-13 (edit) `confirmed`: Existen tres comandos verify, uno por dispositivo, todos con la forma 'cd app && flutter drive --driver=test_driver/perf_driver.dart --targe
- REQ-18 (edit) `confirmed`: El test Dart app/test/spikes/board_perf/spike_doc_validation_test.dart (creado en S3.T5, no en S3.T2) es el artefacto concreto que valida el
- REQ-14 (edit) `confirmed`: La seccion Umbral del documento del spike incluye, como dato obligatorio, el margen de memoria (crecimiento maximo tolerado entre corridas y

**Task ops:**

- edit S1.T6 { desc="Crear el esqueleto del documento del spike bajo docs/ siguiendo la convencion existente de documentos de spikes, con las secciones: Dispositivos y versiones, Metodo (incluye medicion de memoria por el VM service), Datos, Umbral (con margen de memoria, PROVISIONAL), Degradacion (efecto decorativo que se elimina primero sin perder estado ni posicion, doc 44 §19), Decision, Exencion de QA-07-01-04 (Responsable y Fecha por completar) y Ubicacion del prototipo. Debe ser compliant con el linter de docs." }
- edit S3.T1 { desc="Ejecutar el benchmark en los tres dispositivos y guardar JSON, trazas y un video por dispositivo bajo docs/. Los tres comandos verify tienen la forma 'cd app && flutter drive --driver=test_driver/perf_driver.dart --target=integration_test/board_perf_test.dart -d <id>': Android de gama baja y tablet con --profile, iOS (simulador, solo debug) sin flag de modo. Los deviceId se obtienen con 'flutter devices'.", verify=["cd app && flutter drive --driver=test_driver/perf_driver.dart --target=integration_test/board_perf_test.dart --profile -d <androidDeviceId>","cd app && flutter drive --driver=test_driver/perf_driver.dart --target=integration_test/board_perf_test.dart --profile -d <tabletDeviceId>","cd app && flutter drive --driver=test_driver/perf_driver.dart --target=integration_test/board_perf_test.dart -d <iosDeviceId>"] }
- edit S3.T2 { desc="Redactar el documento del spike completando todas las secciones: Dispositivos, Metodo (memoria por el VM service), Datos, Umbral con margen de memoria PROVISIONAL (comparando aqui las lecturas crudas de S2 contra el margen), Degradacion, Decision, Exencion de QA-07-01-04 y Ubicacion del prototipo; enlazar desde HU-07-01 en EP-07 y desde DEC-167 o la DEC nueva. Esta task NO crea spike_doc_validation_test.dart (queda en S3.T5)." }
- edit S3.T4 { verify=["cd app && flutter test test/spikes/board_perf/ && dart run custom_lint","pnpm run check","! grep -rnwE '1600|4500|360' app/lib/spikes/board_perf --include=*.dart | grep -vE ':[0-9]+:[[:space:]]*(//|\\*)' | grep -v 'fullCircleDegrees'"] }
- edit S3.T5 { desc="Crear app/test/spikes/board_perf/spike_doc_validation_test.dart que lee el documento del spike y valida con assertions concretas: seccion Degradacion, ubicacion del prototipo documentada, video enlazado por dispositivo, resultados de iOS como debug sin --profile ni --release, y exencion de QA-07-01-04 con Responsable y Fecha pendientes de completar.", isTest=true, verify=["cd app && flutter test test/spikes/board_perf/spike_doc_validation_test.dart"] }
- edit S3.T6 { verify=["! grep -n 'board_perf_test' .github/workflows/ci-pr.yml"] }

### Enmienda 5
**REQs:**

- REQ-14 (edit) `confirmed`: La seccion Umbral del documento del spike incluye, como dato obligatorio, el margen de memoria (crecimiento maximo tolerado entre corridas y
- REQ-16 (edit) `confirmed`: La seccion Metodo del documento del spike describe la medicion de memoria por el VM service: el benchmark se conecta al VM service (por ejem
- REQ-17 (edit) `confirmed`: El job de integracion de ci-pr.yml no ejecuta app/integration_test/board_perf_test.dart: el archivo se excluye explicitamente del job, o se 

**Task ops:**

- edit S3.T5 { desc="Crear app/test/spikes/board_perf/spike_doc_validation_test.dart. Lee el documento del spike y verifica con assertions de valores concretos las ocho validaciones de REQ-18: (a) los resultados de iOS estan etiquetados como debug y no mencionan --profile ni --release como modo de ejecucion en iOS; (b) la seccion Umbral incluye el margen de memoria marcado PROVISIONAL; (c) la seccion Metodo describe la medicion de memoria por el VM service; (d) existe la seccion de exencion de QA-07-01-04 con los campos Responsable y Fecha pendientes de completar; (e) estan los tres comandos verify con -d (Android gama baja, tablet, simulador iOS); (f) existe la seccion Degradacion; (g) la ubicacion del prototipo (app/lib/spikes/board_perf/) esta documentada; (h) hay un video enlazado por dispositivo (Android, tablet, iOS). Cada validacion es un test independiente que falla si la condicion no se cumple." }
- edit S3.T6 { desc="Comprobar que el job de integracion de .github/workflows/ci-pr.yml no ejecuta app/integration_test/board_perf_test.dart: o bien el archivo se excluye explicitamente del job, o bien el job corre una lista de archivos que no lo incluye. Si el job corre todo integration_test/, agregar la exclusion. La verificacion valida que el job no lo ejecute, no la ausencia literal del nombre del archivo. Documentar el resultado en el documento del spike.", verify=["! grep -nE \"flutter (test|drive)[^#]*integration_test/?( |$)\" .github/workflows/ci-pr.yml || grep -n \"board_perf_test\" .github/workflows/ci-pr.yml"] }
- edit S3.T2 { validates=["REQ-06","REQ-10","REQ-11","REQ-12","REQ-13","REQ-14","REQ-15","REQ-16"] }
- edit S1.T6 { rollback="Revertir con git los archivos creados o modificados por esta task. El rollback no depende ni incluye el enlace desde HU-07-01 en docs/backlog/EP-07_tablero_tirada_y_resultado.md, que no se agrega en esta task." }
- edit S3.T1 { desc="Ejecutar el benchmark con los tres comandos verify (un deviceId por dispositivo, listado con 'flutter devices'): 'cd app && flutter drive --driver=test_driver/perf_driver.dart --target=integration_test/board_perf_test.dart -d <id>' con --profile en Android de gama baja (AVD API 24, 2 GB RAM) y en tablet (AVD API 34 landscape), y sin flag de modo (solo debug) en el simulador iOS 15 o superior. Guardar el JSON y las trazas como artifact bajo docs/ (estos datos son los que usa REQ-14 en S3.T2). Capturar un video por dispositivo y por cada rastro (1, 8, 20 y 100 pasos) mientras corre la reproduccion: en Android con 'adb -s <id> shell screenrecord /sdcard/<archivo>.mp4' seguido de 'adb -s <id> pull' (o la grabacion del emulador via 'adb emu screenrecord start' y 'adb emu screenrecord stop'), y en iOS con 'xcrun simctl io <udid> recordVideo <archivo>.mp4'. Guardar los videos bajo docs/ en la ruta que dicta la convencion de artifacts. Si app/pubspec.yaml no declara vm_service, agregarlo con 'cd app && flutter pub add --dev vm_service' (dev_dependency)." }
- edit S1.T4 { desc="Conservar el alcance actual de la task y agregar un entrypoint ejecutable del spike en app/lib/spikes/board_perf/main.dart (con main() que hace runApp del prototipo), de modo que se pueda lanzar con 'cd app && flutter run -t lib/spikes/board_perf/main.dart --profile -d <id>'. El entrypoint usa los tokens existentes y no contiene los literales 1600, 4500 ni 360. Si app/pubspec.yaml no declara vm_service y el prototipo o el benchmark lo necesitan, declararlo como dev_dependency con 'cd app && flutter pub add --dev vm_service'." }

### Enmienda 6
**REQs:**

- REQ-13 (edit) `confirmed`: Existen tres comandos verify, uno por dispositivo, todos con la forma 'cd app && flutter drive --driver=test_driver/perf_driver.dart --targe

**Task ops:**

- edit S1.T4 { desc="Crear app/integration_test/board_perf_test.dart y app/test_driver/perf_driver.dart (archivos concretos, sin placeholders <archivo>). Dejar definidos los tres comandos verify con la forma 'cd app && flutter drive --driver=test_driver/perf_driver.dart --target=integration_test/board_perf_test.dart -d <variable>', usando las variables de entorno $PERF_ANDROID_LOW_ID (AVD API 24, 2 GB, --profile), $PERF_ANDROID_TABLET_ID (AVD tablet API 34 en landscape, --profile) y $PERF_IOS_SIM_ID (simulador iOS 15 o superior, solo debug, sin flag de modo). No usar <id>, <udid> ni <archivo>. Los ids reales se obtienen con 'flutter devices' y se registran en el documento del spike (S3)." }
- edit S3.T1 { desc="Ejecutar el benchmark una vez por dispositivo con los tres comandos verify, desde la raiz del repo: 'cd app && flutter drive --driver=test_driver/perf_driver.dart --target=integration_test/board_perf_test.dart --profile -d $PERF_ANDROID_LOW_ID', 'cd app && flutter drive --driver=test_driver/perf_driver.dart --target=integration_test/board_perf_test.dart --profile -d $PERF_ANDROID_TABLET_ID' y 'cd app && flutter drive --driver=test_driver/perf_driver.dart --target=integration_test/board_perf_test.dart -d $PERF_IOS_SIM_ID' (iOS solo debug, sin --profile ni --release). Antes de correr, listar los deviceId reales con 'flutter devices', exportar $PERF_ANDROID_LOW_ID, $PERF_ANDROID_TABLET_ID y $PERF_IOS_SIM_ID y registrar los ids usados para el documento del spike, que explica como obtener cada id con 'flutter devices'. Guardar JSON, trazas y un video por dispositivo bajo docs/ como artifacts. Sin placeholders <id>, <udid> ni <archivo>.", verify=["cd app && flutter drive --driver=test_driver/perf_driver.dart --target=integration_test/board_perf_test.dart --profile -d $PERF_ANDROID_LOW_ID","cd app && flutter drive --driver=test_driver/perf_driver.dart --target=integration_test/board_perf_test.dart --profile -d $PERF_ANDROID_TABLET_ID","cd app && flutter drive --driver=test_driver/perf_driver.dart --target=integration_test/board_perf_test.dart -d $PERF_IOS_SIM_ID"] }

### Enmienda 7
**REQs:**

- REQ-04 (edit) `inferred`: Un benchmark con integration_test y trazas de timeline (app/integration_test/board_perf_test.dart, con su driver app/test_driver/perf_driver
- REQ-16 (edit) `confirmed`: La seccion Metodo del documento del spike describe la medicion de memoria por el VM service: el benchmark se conecta al VM service (por ejem
- REQ-08 (edit) `confirmed`: El prototipo reutiliza los tokens existentes (TaoMotion.boardBuild, boardHistoryBudget, boardReplayMax y los parametros board: houses, rings
- REQ-20 (edit) `confirmed`: El prototipo no contiene los literales 1600, 4500 ni 360 como valores de presupuesto o geometria (busqueda con limites de palabra, sin conta
- REQ-10 (edit) `confirmed`: El documento del spike y los artifacts (JSON de resultados, trazas de timeline, video) se guardan bajo docs/ siguiendo la convencion existen

**Task ops:**

- edit S1.T4 { desc="Crear el widget y el painter del prototipo en app/lib/spikes/board_perf/board_perf_prototype.dart y el entrypoint app/lib/spikes/board_perf/main.dart para poder ver el prototipo en el emulador. Usa la geometria pura de REQ-01 y los tokens existentes. NO crea app/integration_test/board_perf_test.dart ni app/test_driver/perf_driver.dart: esos archivos los crea unicamente S2.T1.4.", rollback="Eliminar app/lib/spikes/board_perf/board_perf_prototype.dart y app/lib/spikes/board_perf/main.dart; la geometria pura y el resto del repo quedan intactos.", validates=["REQ-01"], isTest=false, verify=["cd app && flutter analyze lib/spikes/board_perf/"] }
- edit S2.T1.4 { desc="Unica task que crea app/integration_test/board_perf_test.dart y app/test_driver/perf_driver.dart (ninguna otra task los crea). El benchmark reproduce 1, 8, 20 y 100 pasos por estrategia, captura la timeline y las lecturas de heap por el VM service, y guarda el JSON de resultados y las trazas como artifacts bajo docs/ en la ruta que dicta REQ-10 (convencion existente de spikes o, si no existe, docs/design/spikes/)." }
- edit S3.T2 { desc="Redactar la seccion Umbral y la comparacion de memoria del documento del spike: comparar las lecturas de heap del benchmark ejecutado en S3.T1 (JSON de resultados de esa corrida) contra el margen de memoria (crecimiento maximo tolerado entre corridas y tope de memoria), marcando umbral y margen como PROVISIONAL segun REQ-14." }
- edit S3.T3 { desc="Enlazar el documento del spike desde HU-07-01 en docs/backlog/EP-07_tablero_tirada_y_resultado.md y desde DEC-167 (docs/product/decisiones) o desde la DEC nueva. Este es el unico lugar donde se crean esos enlaces; ninguna otra task los agrega." }
- edit S3.T4 { verify=["! grep -rnE '\\b(1600|4500|360)\\b' app/lib/spikes/board_perf/ | grep -vE '^[^:]+:[0-9]+:[[:space:]]*//'"] }
- edit S3.T6 { verify=["grep -n 'board_perf_test' .github/workflows/ci-pr.yml","! grep -n 'board_perf_test' .github/workflows/ci-pr.yml | grep -viE 'exclu|ignore|skip|!'"] }

### Enmienda 8
**REQs:**

- REQ-08 (edit) `confirmed`: El prototipo reutiliza los tokens existentes (TaoMotion.boardBuild, TaoMotion.boardHistoryBudget, TaoMotion.boardReplayMax y los parametros 
- REQ-19 (edit) `confirmed`: Por cada dispositivo (Android gama baja, tablet y simulador iOS) se graba un unico video que cubre la reproduccion de los cuatro rastros (1,

**Task ops:**

- edit S1.T4 { desc="Crear app/lib/spikes/board_perf/board_perf_prototype.dart (widget del prototipo con las estrategias de pintado alternables de REQ-03, sin controladores activos en segundo plano segun REQ-05) y app/lib/spikes/board_perf/main.dart (punto de entrada del prototipo). Usar los tokens TaoMotion.boardBuild, TaoMotion.boardHistoryBudget y TaoMotion.boardReplayMax y los parametros board, sin los literales 1600, 4500 ni 360 (REQ-08).", rollback="Eliminar solo board_perf_prototype.dart y main.dart de app/lib/spikes/board_perf/; no tocar la geometria pura ni el plan de reproduccion.", validates=["REQ-03","REQ-05","REQ-08","REQ-09"], isTest=false, verify=["cd app && flutter analyze lib/spikes/board_perf/"] }
- edit S2.T1.4 { desc="Unica task que crea app/integration_test/board_perf_test.dart y app/test_driver/perf_driver.dart. El benchmark reproduce 1, 8, 20 y 100 pasos por estrategia y hace tres corridas consecutivas de 20 pasos (QA-07-01-01), con lectura de heap por VM service (getMemoryUsage del isolate principal) antes y despues de cada corrida y GC forzado previo a cada lectura (REQ-16). Declarar vm_service como dev_dependency en app/pubspec.yaml (nunca como dependency). Guardar JSON de resultados y trazas de timeline como artifacts bajo docs/ segun REQ-10. No compara la memoria contra el margen del Umbral (eso es S3.T2). Ninguna otra task crea estos dos archivos.", rollback="Eliminar app/integration_test/board_perf_test.dart y app/test_driver/perf_driver.dart y revertir la entrada vm_service de dev_dependencies en app/pubspec.yaml (y pubspec.lock si cambio).", validates=["REQ-04","REQ-16","REQ-10"], isTest=true, verify=["cd app && flutter analyze integration_test/board_perf_test.dart test_driver/perf_driver.dart"] }
- edit S3.T1 { desc="Ejecutar el benchmark en los tres dispositivos con los comandos: 'cd app && flutter drive --driver=test_driver/perf_driver.dart --target=integration_test/board_perf_test.dart -d $PERF_ANDROID_LOW_ID --profile' (AVD API 24, 2 GB), 'cd app && flutter drive --driver=test_driver/perf_driver.dart --target=integration_test/board_perf_test.dart -d $PERF_ANDROID_TABLET_ID --profile' (AVD tablet API 34 landscape) y 'cd app && flutter drive --driver=test_driver/perf_driver.dart --target=integration_test/board_perf_test.dart -d $PERF_IOS_SIM_ID' (simulador iOS 15 o superior, sin flag de modo, debug). Obtener los ids con 'flutter devices'. Grabar un video por dispositivo que cubra los cuatro rastros: 'adb -s <id> shell screenrecord' en Android y tablet, 'xcrun simctl io <udid> recordVideo' en iOS. Guardar JSON, trazas y videos bajo docs/ segun REQ-10, etiquetando iOS como debug (REQ-12).", rollback="Eliminar solo los artifacts generados por esta corrida (JSON, trazas y videos) bajo docs/; no tocar el benchmark ni el documento.", validates=["REQ-04","REQ-12","REQ-13","REQ-16","REQ-19"], isTest=false, verify=["cd app && flutter drive --driver=test_driver/perf_driver.dart --target=integration_test/board_perf_test.dart -d $PERF_ANDROID_LOW_ID --profile","cd app && flutter drive --driver=test_driver/perf_driver.dart --target=integration_test/board_perf_test.dart -d $PERF_ANDROID_TABLET_ID --profile","cd app && flutter drive --driver=test_driver/perf_driver.dart --target=integration_test/board_perf_test.dart -d $PERF_IOS_SIM_ID"] }
- edit S3.T2 { desc="REDACTAR el documento completo del spike (bajo la ruta de REQ-10) con las secciones: Dispositivos y versiones; Metodo (incluye la medicion de memoria por VM service con GC previo y crecimiento entre corridas, REQ-16); Datos (tabla desde el JSON de S3.T1); Umbral (60 fps y margen de memoria, ambos PROVISIONAL, con la comparacion de las lecturas de memoria de S3.T1 contra el margen); Decision (confirma DEC-167 con la estrategia elegida o abre DEC nueva, tambien PROVISIONAL); Degradacion (que efecto decorativo se elimina primero); Exencion de QA-07-01-04 con Responsable y Fecha por completar; ubicacion del prototipo; los tres comandos verify con los ids reales usados y como obtenerlos con 'flutter devices'; enlaces relativos a JSON, trazas y los tres videos.", rollback="Revertir los cambios que esta task hizo al documento del spike (restaurar la version previa del archivo con git); no tocar los artifacts de S3.T1 ni EP-07.", validates=["REQ-06","REQ-10","REQ-11","REQ-12","REQ-13","REQ-14","REQ-15","REQ-16","REQ-19"], isTest=false, verify=["pnpm run check"] }
- edit S3.T3 { desc="Enlazar el documento del spike desde HU-07-01 en docs/backlog/EP-07_tablero_tirada_y_resultado.md y desde DEC-167 (o la DEC nueva) en docs/product/decisiones; registrar en EP-07 la exencion de QA-07-01-04 y las adendas 1 a 4. Los cambios quedan compliant con el linter de docs y sin salir del baseline .docs-baseline.txt (REQ-15).", rollback="Revertir con git los cambios de esta task en EP-07 y en la DEC (enlaces, registro de exencion y adendas); no tocar el documento del spike.", validates=["REQ-06","REQ-10","REQ-11","REQ-15"], isTest=false, verify=["pnpm run check"] }
- edit S3.T4 { desc="Regresion final: correr 'cd app && flutter test test/spikes/board_perf/', 'cd app && dart run custom_lint' y 'pnpm run check', y el grep de literales con limites de palabra (1600, 4500, 360) sobre app/lib/spikes/board_perf/ sin contar comentarios, que debe dar cero coincidencias. Reportar suites, totales y clasificacion de fallas (introducido vs preexistente).", rollback="Sin cambios de codigo propios: si la task ajusta algo, revertir solo ese ajuste con git.", validates=["REQ-01","REQ-02","REQ-05","REQ-08","REQ-15"], isTest=true, verify=["cd app && flutter test test/spikes/board_perf/","cd app && dart run custom_lint","pnpm run check"] }
- edit S3.T5 { desc="Crear app/test/spikes/board_perf/spike_doc_validation_test.dart, que lee el documento del spike y verifica con assertions de valores concretos las ocho validaciones de REQ-18: (a) iOS etiquetado debug sin --profile ni --release como modo en iOS, (b) margen de memoria PROVISIONAL en Umbral, (c) Metodo con medicion por VM service, (d) seccion de exencion con Responsable y Fecha pendientes, (e) tres comandos verify con -d, (f) seccion Degradacion, (g) ubicacion del prototipo documentada, (h) un video enlazado por dispositivo (Android, tablet, iOS).", rollback="Eliminar app/test/spikes/board_perf/spike_doc_validation_test.dart.", validates=["REQ-18","REQ-14","REQ-12","REQ-13","REQ-19"], isTest=true, verify=["cd app && flutter test test/spikes/board_perf/spike_doc_validation_test.dart"] }
- edit S3.T6 { desc="Crear app/test/spikes/board_perf/ci_integration_job_test.dart, que lee .github/workflows/ci-pr.yml, resuelve el conjunto de archivos que el job de integracion ejecutaria (lista explicita o patron menos exclusiones) y asserta que app/integration_test/board_perf_test.dart NO esta en ese conjunto. Valida el comportamiento del job, no la presencia literal del nombre. Si el job ejecuta todo integration_test/, agregar la exclusion explicita en ci-pr.yml y documentarlo.", rollback="Eliminar ci_integration_job_test.dart y revertir con git solo el cambio de exclusion en .github/workflows/ci-pr.yml si esta task lo hizo.", validates=["REQ-17"], isTest=true, verify=["cd app && flutter test test/spikes/board_perf/ci_integration_job_test.dart"] }

**REQ ops:**

- remove REQ-20

### Enmienda 9
**REQs:**

- REQ-01 (edit) `confirmed`: El prototipo calcula la geometria del tablero de DEC-074 (12 sectores, 8 anillos, corona interior, yin-yang y zona de exclusion segun center
- REQ-12 (edit) `confirmed`: El simulador de iOS se ejecuta solo en modo debug, porque Flutter no soporta release ni profile ahi. Los resultados de iOS se etiquetan como

**Task ops:**

- edit S3.T1 { desc="Ejecutar el benchmark en los tres dispositivos con los tres comandos verify (-d $PERF_ANDROID_LOW_ID y --profile; -d $PERF_ANDROID_TABLET_ID y --profile; -d $PERF_IOS_SIM_ID en debug, sin flag de modo) y grabar un unico video por dispositivo que cubra los rastros de 1, 8, 20 y 100 pasos. Android de gama baja: 'adb -s $PERF_ANDROID_LOW_ID shell screenrecord /sdcard/perf-android-low.mp4'. Tablet: 'adb -s $PERF_ANDROID_TABLET_ID shell screenrecord /sdcard/perf-android-tablet.mp4'. iOS: 'xcrun simctl io $PERF_IOS_SIM_ID recordVideo perf-ios.mov'. Sin placeholders angulares en ningun comando. Los videos se guardan como artifacts segun REQ-10 en docs/design/spikes/artifacts/ con el nombre del dispositivo: docs/design/spikes/artifacts/perf-android-low.mp4 y docs/design/spikes/artifacts/perf-android-tablet.mp4 (traidos con 'adb -s <variable> pull'), y docs/design/spikes/artifacts/perf-ios.mov (simctl graba en .mov). Guardar tambien el JSON de resultados y las trazas en esa carpeta." }
- edit S1.T4 { desc="Crear solo el widget base del prototipo (tablero con CustomPainter sobre la geometria pura) y su entrypoint dentro de app/lib/spikes/board_perf/. No incluye el alternado de estrategias de pintado (REQ-03) ni la limpieza de controladores al pasar a segundo plano (REQ-05): ambos quedan a cargo de S2." }
- edit S1.T6 { desc="Crear el documento del spike con el nombre fijo docs/design/spikes/board-perf-spike.md, con el esqueleto de secciones (dispositivos y versiones, Metodo, datos, Umbral, Decision, exencion de QA-07-01-04, Degradacion, ubicacion del prototipo). Este es el unico nombre de documento: S3 y spike_doc_validation_test.dart lo reutilizan sin redefinirlo." }
- edit S3.T5 { desc="Crear app/test/spikes/board_perf/spike_doc_validation_test.dart que lee docs/design/spikes/board-perf-spike.md (el nombre fijado en S1.T6, sin definir otra ruta) y valida con assertions de valores concretos los puntos (a) a (h) de REQ-18." }
- edit S3.T4 { verify=["cd app && ! grep -rnwE '1600|4500|360' lib/spikes/board_perf | grep -vE '^[^:]+:[0-9]+:[[:space:]]*//'"] }
- move S3.T4 → S3

### Enmienda 10
**REQs:**

- REQ-08 (edit) `confirmed`: El prototipo reutiliza los tokens existentes (TaoMotion.boardBuild, TaoMotion.boardHistoryBudget, TaoMotion.boardReplayMax y los parametros 

**Task ops:**

- edit S3.T4 { verify=["cd app && flutter test test/spikes/board_perf/","cd app && dart run custom_lint","pnpm run check"] }
- edit S1.T4 { desc="Widget base del prototipo en app/lib/spikes/board_perf/ que reproduce el plan de replay_budget con un AnimationController minimo (solo avanza la reproduccion segun el plan de duracion por segmento). El ciclo de vida completo del controlador (pausa y limpieza al pasar a segundo plano) queda en S2. Usa los tokens TaoMotion y los parametros board existentes, y los grados de la circunferencia como radianes con 2 * math.pi, sin literales 1600, 4500 ni 360.", validates=["REQ-01","REQ-08","REQ-09"] }
## Sessions

### Session 1 · T2 · open

**Tasks:**
- [ ] S1.T1
- [ ] S1.T2
- [ ] S1.T3
- [ ] S1.T4
- [ ] S1.T5
- [ ] S1.T6

**Gate (auto)**: Los tests unitarios de geometria y de presupuesto de reproduccion pasan, y en el emulador Android se ve el prototipo dibujando el tablero (12x8, corona y yin-yang) con un rastro de 100 pasos que se reproduce en 4500 ms o menos.

### Session 2 · T3 · open

**Tasks:**
- [ ] S2.T1
- [ ] S2.T1.1
- [ ] S2.T1.2
- [ ] S2.T1.3
- [ ] S2.T1.4
- [ ] S2.T1.5

**Gate (auto)**: En el prototipo se puede alternar entre reticula cacheada y repintado completo, y entre rastro por segmentos y trazo unico. El widget test demuestra que la reticula no se repinta al desplazar o abrir un panel, y el integration_test deja un JSON de timeline por estrategia y rastro en el emulador.

### Session 3 · T2 · open

**Tasks:**
- [ ] S3.T1
- [ ] S3.T2
- [ ] S3.T3
- [ ] S3.T4
- [ ] S3.T5
- [ ] S3.T6

**Gate (auto)**: Existen el JSON y las trazas de las corridas en el emulador Android de gama baja, el simulador iPhone (solo funcional) y la tablet horizontal. El documento del spike tiene la tabla, el umbral y la decision PROVISIONALES y la degradacion, con enlaces desde HU-07-01 en EP-07 y desde DEC-167 o la DEC nueva, y pnpm run check termina en verde.

### Session 4 · T0 · open

### Session 5 · T0 · open
