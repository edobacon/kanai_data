# Correcciones durante el único juicio final

Fecha: 2026-10-06, fase F5. No se emitió ningún dictamen intermedio ni se lanzó un segundo juez.

El único Arbiter revisó el diff y solicitó probes al ejecutor:
- Archivo >80000 caracteres quedaba omitido permanentemente (marcador de corte superaba total).
- Consumidor fuera del diff >24000 se omitía permanentemente.
- Import Dart relativo anidado lib/value.dart no se detectaba; consumer podía reutilizarse pese API cambiado. Se descartó primero el caso raíz porque path_citation sí lo rescataba.
- Grafo truncado de81consumidores necesitaba límite ampliable y deuda persistida: siguiente rerun sin delta no podía olvidar impacto pendiente.

Correcciones:
- integralBudget.ts usa KANAI_GATE_INTEGRAL_DIFF_CHARS default400000; calcula tamaño fusionado de cada archivo y permite un indivisible mayor que el objetivo. Se entregan archivos completos, sin corte perpetuo.
- Consumidores presentes se entregan íntegros, con aviso si superan24000. KANAI_GATE_CONSUMERS_MAX default80 permite ampliar grafo y candidatos; truncado/missing conservan reviewComplete=false.
- GateCoverage/JSON guardan impactRoots por repo; delta se une con deuda previa. Rerun sin cambios, foto inválida, repo ausente y errores mantienen deuda; se limpia solo con lecturas completas.
- Detector compartido incluye Dart import/export/part/part of, relative URI y package. Sufijo conservador /lib permite monorepos app/lib y packages/*/lib; sobreinclusión es segura ante paquetes homónimos.
- Docs de presupuesto reemplazadas, sin contradicción80000/400000.

Tests integral-review-limits: archivo80001+patch pendiente completo; consumidor externo>24k completo; Dart app/lib+app/test imports relativos, package export y part/of reabiertos; graph81default80 incompleto y persisted impactRoots vía recordGateRunState + priorIntegralGate; siguiente snapshot sin delta permanece incompleto, snapshot inválido conserva roots, max200 entrega81 y limpia deuda. Pruebas dirigidas43/43 +últimas5/5 verdes. Typecheck/lint/suite final registrados en logs f5-*-final.log.

Replay TAO actualizado (Node24, proceso aislado, sin LLM): primera cobertura50full/103omitted y segunda153full/0omitted. Default400000 completa cobertura estructural en2pases deterministas, frente a10con80000. Code preparado primera408489caracteres (incluye encabezados y declaraciones); contexto49669. No se midieron tokens de proveedor, número de rondas semánticas ni tiempo de gate. La meta <=2pasadas de selección cumple; <=2rondasLLM y<1Mtokens continúan sin demostrar.

Evidencias: work/arbiter-probes.log (pre-corrección), work/f5-replay.json y f5-replay.log; work/f5-debt-persisted.log; work/f5-suite-final.log, f5-typecheck-final.log y f5-lint-final.log. Código y tests se agrupan en un único commit F5; dictamen final después de ese commit.
