# Resultado de la prueba controlada de F2 (medición antes y después)

Fecha: 2026-10-05. Caso: kanai-pre-epica, tareas F2.2 y F2.3. Diseño y valores esperados: prueba-controlada-f2.md
(registrado antes de correr). Nada de esta medición escribió en el store: las épicas se leyeron como archivo, la
épica demo vivió en memoria y kanai.db se abrió con `mode=ro`.

## 1. Planificador sobre la épica demo (I1 a I3)

Épica demo `demo-pre-epica` con los 8 cuerpos canónicos (DEMO-181 a DEMO-188, renombrados desde TAO-n y GH-n;
el script verifica que no quede ningún TAO- ni GH-n). Mismo punto de partida para las dos versiones: sin aristas
guardadas, solo las dependencias declaradas.

| Indicador | Antes (abe6359) | Después (HEAD setup) | Esperado después | Resultado |
|---|---|---|---|---|
| Aristas inferidas del cuerpo | 127 | 40 | - | -69% |
| I3 auto-referencias | 8 (una por ticket) | 0 | 0 | cumple |
| I2 identificadores truncados | 14 aristas (HU-01, HU-02, HU-08, HU-10, HU-15) | 0 | 0 | cumple |
| Aristas a metadatos DEC-/V-/QA-/EP- | 101 | 0 | 0 | cumple |
| Referencias reales entre tickets del conjunto | 2 | 5 | se conservan todas | cumple: 0 perdidas y 3 recuperadas |
| Referencias a tickets fuera del conjunto | 2 | 35 | solo referencias reales | ver §3 |
| Avisos "Dependencia externa pendiente" | 126 | 44 | - | -65% |
| Avisos "Decidir dependencia inferida" | 128 | 41 | - | -68% |

Las 3 referencias recuperadas (DEMO-181→DEMO-183, DEMO-187→DEMO-184, DEMO-188→DEMO-185) son menciones por id
jerárquico (HU-01-12 y similares) que antes se truncaban y no resolvían; ahora resuelven por el id entre corchetes
del título. Es mejora además de lo esperado: el arreglo no solo quita ruido, también encuentra dependencias reales
que antes se perdían.

Los 126 avisos de "Dependencia externa pendiente" del antes reproducen el hallazgo original de la épica real
(126 aristas inferidas): el escenario demo es fiel.

## 2. Telemetría por ejecución (I4, lectura del store)

Mismo instrumento que el baseline. Al reproducirlo apareció que "con tokens" en el baseline significa
`tokens_in` o `tokens_out` informados (66,8% global y 57,4% en Claude Code, que redondean al 67% y 57% publicados);
se usa esa misma definición.

| Ventana | Ejecuciones | Con duración | Con tokens | Etiqueta de backend canónica |
|---|---|---|---|---|
| Antes (las 1684 del baseline) | 1684 | 63,2% | 66,8% | 78,6% |
| Después del fix `abe6359` | 32 | 100% | 81,2% | 90,6% (29 de 32) |
| Después, Claude Code | 18 | 100% | 66,7% | 83,3% (15 de 18) |
| Después, OpenCode | 14 | 100% | 100% | 100% |

Muestra "después" de 32 ejecuciones: se lee como indicio, no como tasa (umbral declarado: 30, apenas superado).

- **Duración**: 100% en lo nuevo. Es consistente con el hallazgo de F0: el servidor la completa cuando el host no
  la informa.
- **Tokens**: OpenCode 100%. En Claude Code faltan en 6 de 18, y las 6 son ejecuciones de subagente (developer,
  `mcp-subagent`, ticket KT-012). Confirma el hallazgo de F0: el hueco es del host, no de kanai-app. No se esperaba
  mejora y no la hay.
- **Etiqueta canónica**: 3 de 32 ejecuciones nuevas guardaron la etiqueta cruda `claude`. Son las tres del
  2026-10-04 entre 21:05 y 21:06 (gate de KT-008, plan de KT-012 y gate de KT-012). Las tres rutas de escritura de
  agentes (persistAgentRun, persistToolRun y persistChatRun, que recibe la etiqueta ya canónica) canonicalizan en
  HEAD, y las 29 ejecuciones posteriores a 21:06 tienen la etiqueta canónica. La explicación consistente con el
  código es un proceso del MCP arrancado antes del commit (el caso kanai-ejecucion-ticket ya documentó procesos
  viejos corriendo el piloto). No se puede verificar el inicio de aquel proceso: ya no corre.

## 3. Lo que el arreglo no cubre (hallazgos)

1. **Dos metadatos fuera de la lista de contexto.** `REQ-07` (un requisito interno de Kanai citado en la nota
   de reajuste del plan de TAO-181) y `P-225` (el id de un asset de producto citado en TAO-183) siguen saliendo
   como dependencia externa. La lista de prefijos de contexto es DEC-/V-/QA-/EP-; REQ- y P- no están.
2. **Referencias a historias fuera de la selección.** 33 de las 35 aristas externas son ids jerárquicos completos
   (HU-01-01, HU-03a-08...) de historias que no están en la épica; varias son tickets ya cerrados (por ejemplo
   HU-01-01 es TAO-170, cerrado). Son referencias reales y legítimas para decisión humana, pero el planificador no
   distingue una ya cerrada (dependencia satisfecha) de una abierta: la persona tiene que decidir 44 avisos donde
   muchos se resuelven solos mirando el estado del ticket.

## 4. Estado del suite

`pnpm vitest run` con Node 24.21.0 sobre `setup` (2026-10-05 16:14 -0300): 357 archivos y 2820 tests pasan, 0
fallan. El rojo preexistente (tool-profiles.test.ts: el perfil reducido pesaba el 35,4% del completo contra un
techo de un tercio) quedó corregido en esta misma fase con `e6478a7`, que mudó el protocolo de épica de la
descripción de `epic_operate` a la skill kn-epic (core pasó de 35,4% a 31,3%). Margen contra el techo: unos 1.900
caracteres; una tool nueva con descripción larga en core lo vuelve a romper.
