# Ensayo aislado KT y TAO-192

Fecha: 2026-10-06. Código: c2993572b4db52fb504d8db76f20f92ab6b648f6. Node v24.21.0.

Proceso nuevo `node --import tsx .scratch-f3.mts` con DB_URL y KANAI_DATA_ROOT aislados; KANAI_DATA_SYNC=none. No se reinició ni se modificó el MCP vivo. Primer intento CLI tsx falló EPERM por socket IPC; ejecución directa mediante import tsx salió 0.

KT-2 sintético en SQLite copiada: dependencia KT-1 en árbol, fuera del diff; rama epic/isolated limpia. Sandbox real: ran=true, origin=target, typecheck=pass, tests 1 pass/0 fail. Evidencia persistida en meta.sandboxEvidence del ticket aislado. Primera cobertura 4 full/0 omitted; corregir value reabre value, consumer y test; untouched se reutiliza con foto exacta.

TAO-192 en clon: epic/EP-01a head 4b4798553cde338f93ebb31a0db7446af0046a3d; base bd50805c534d35618b0c31ca17f44a43503d4592 (última entrega TAO-191). Diff anterior main:188 archivos; nuevo:154; 34 rutas exclusivamente heredadas excluidas. Las rutas compartidas conservan cambios de TAO-192. Diff completo aprox785111 caracteres.

Código preparado (presupuesto + declaraciones):90355→88417 caracteres. Contexto contractual sin KB en ambos:22587→49669 caracteres. El cuerpo antiguo de TAO-192 (28433 caracteres) contiene fuentes y criterios obligatorios, no se puede omitir para aparentar ahorro. El contexto nuevo elimina instrucciones de ejecución y agrega pedido/decisiones antes ausentes; el tamaño neto sube. No se midieron tokens del proveedor.

Cobertura primera:15 full,0 partial,138 omitted; revisión completa=false. Diez armados deterministas sobre árbol idéntico y cobertura acumulada pasan por full15,21,32,43,54,71,92,116,134,153; omitted138→0. Se comprobó progreso estricto sin cambios ocultados ni aprobación de omitidos. Esta simulación no es una corrida de jueces: no prueba diez rondas LLM ni garantiza hallar todos los defectos.

Metas <=2 rondas y <1M tokens NO demostradas. La meta de dos pases de cobertura NO se cumple con presupuesto actual en TAO-192. KT cumple sandbox real y selección; TAO cumple frontera y completitud progresiva. Único juez de esta ejecución: Arbiter final aún pendiente.

Evidencias reproducibles locales fuera del código: workspace/work/f3-replay.json, f3-replay.log, .scratch-f3.mts (scratch ignorado del clon), isolated-data/replay.db, kt-replay y tao-replay. Datos originales intactos.
