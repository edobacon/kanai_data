# Comparación final contra la línea base

Fecha: 2026-10-06. Plan kanai-optimizar-ejecucion, F0–F6 (F5/F6 corrigen límites detectados durante el único juicio final). Rama feat/optimizar-ejecucion en clon aislado, sin push.

| Señal/meta | Línea base validada | Ensayo actual | Resultado |
|---|---|---|---|
| Runs/tokens TAO-192 |76 runs,27419595 tokens|Sin gates LLM intermedios|No medido; no atribuir ahorro |
| Runs/tokens TAO-191 |43 runs,19588246 tokens|Solo antecedente|Referencia |
| Sandbox N3|7 visibles no corrieron|KT ran=true, target, typecheck pass,1test pass|Mecanismo corregido y comprobado |
| Diff propio TAO-192|Base main:188 archivos|Base entrega bd50805:154,34 rutas heredadas fuera|Mejora comprobada |
| Rerun|Sin foto integral/coverage vigente|KT delta+consumers+findings+unreviewed; unchanged reutilizado|Mecanismo comprobado, no ahorro LLM medido |
| Contexto contractual sin KB|22587 caracteres; sin pedido íntegro|49669, incluye fuentes/adendas/REQs/casos/decisiones|No reducción neta: prioridad conservar alcance |
| Código preparado|90355 caracteres|408489 en el primer pase final (F2:88417)|Pase inicial mayor para cubrir50archivos y completar153en2pases; no equivale a tokens |
| <=2 rondas N3|6iterate+1approve visibles (5iterate finales consecutivos)|F2:10pases; final F5:2pases para153full|Dos pases de selección comprobados; rondas LLM no medidas |
| <1M tokens por gate|Mayor run6359386in+76691out acumulados|No corrida proveedor|Pendiente medir en ejecución real |
| Pausa6,4h/fuga contexto|Sin causa confirmada|Sin cambios especulativos|Descartadas como causalidad probada |
| Verificación kanai-app|Estado base|Final370files/2946tests verdes; typecheck/lint exit0;19tests dirigidos verdes|Sin regresiones observadas |

El cuerpo legado TAO-192 contiene28433 caracteres de fuentes/criterios obligatorios, no secciones generadas prescindibles. Se conserva completo para no cambiar el alcance. El nuevo contexto elimina instrucciones del developer pero subsana ausencia del pedido/decisiones, por eso aumenta.

Con F2, cobertura inicial15full/138omitted completó153full en10pases; tras F5,50full/103omitted completa153full/0omitted en2pases deterministas. Se impide aprobar con omisiones. La simulación supone revisión efectiva del material entregado y no sustituye un juicio semántico ni prueba convergence<=2.

F0/F1/F3/F4 son hitos Git vacíos: los documentos del caso viven en el KB de Kanai fuera del código, como exige AGENTS.md. F2, F5 y F6 contienen código y tests. Original setup con cambios ajenos permanece intacto. El MCP vivo no carga aún esta rama: validación en proceso nuevo aislado. Activación en entorno habitual requiere usar esta rama y reiniciar su runtime; no se hizo despliegue ni push.

Evidencias: linea-base-validada.md, causas-confirmadas.md, ensayo-aislado.md; workspace/work/f2-suite-final.log, f2-typecheck-final.log, f2-lint-final.log, f2-obligations-final.log, f3-replay.json y f3-replay.log.

Único Arbiter final en curso sobre resultado corregido final a193628 (F6); ver correcciones-juicio-final.md y completitud-contenido.md. El caso ejecutó sus fases; no se declara alcanzada la meta de ahorro de tokens/tiempo hasta medirla en una corrida real.

F6 clasifica marcadores UNREAD_FILE como cobertura parcial (no full/reusable) y exige completitud de contenido al aprobar el N3. Regresión real >200KB y replay final verdes. Comprobaciones finales: f6-suite.log370archivos2946pruebas, f6-typecheck.log/f6-lint.log exit0. Commit final a19362842af07c347dd8d1ff0a5521ea01cc862f.
