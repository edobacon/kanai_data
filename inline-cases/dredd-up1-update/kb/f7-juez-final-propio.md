# F7: juez final propio (alcance completo)

Fecha: 2026-10-05. Revisor: subagente opus de contexto limpio, en solo lectura, sobre `git log 348ea29..HEAD`. Revisó 10 checks: helper portable, protocolo y rúbrica, carriles y publicación, expediente, métricas, autonomía, conservación v1, docs con Linux y Windows sin verificar, tests y rollback.

Se corrió aquí porque Kanai solo entrega el brief del juez final cuando todas las fases están cerradas, y F7 no puede cerrar sin F7.C3. El juez de Kanai (`judge_brief scope:final`) queda para después del cierre.

## Ronda 1: rechazado

- **Bloqueante real**: se podía publicar sin aprobación humana. `bb.py co''mment` esquivaba el "ask" del guard, y `dredd-progress.py approve` lo corría el agente sin preguntar.
- **Bloqueante por error del brief**: el instalador de hooks es global. El brief decía "hooks de proyecto", pero el alcance real nunca lo pidió. El instalador global viene de la v1, solo instala con OK explícito, y lo que quedaba fuera de alcance era la instalación global *automática*.
- **Menores**: `close` desarma el guard sin preguntar; bypasses de egress (`$(echo curl)`, `osascript`, `awk system`, `perl -M`, `ruby -r`, `-m http.server`, `lynx`); `evidence` y `actor` de los outcomes sin scrub; el filtro `--repo` aparecía en claro; raya larga en archivos migrados.

Correcciones:
- 7a93581: el guard pide confirmación para `approve` y `close`, compara el subcomando sin comillas, revisa las sustituciones de comando y deniega los bypasses listados. También se agregó scrub a outcomes y alias al filtro de repo.
- dff7ca8: 0 U+2014 en la skill.

## Ronda 2: aprobado con nits

- Con el alcance corregido, el juez confirmó que el instalador no es bloqueante.
- Nits:
  1. La autoaprobación seguía siendo posible por tres vías: código inline con `dredd_state`, un glob sobre `dredd-progress.p?` y Write sobre `state.json`.
  2. Un subcomando en variable (`bb.py $c`).
  3. `-mhttp.server` pegado.
- Corrección en f757205: se deniega la edición a mano de `runs/`, `cases/` y `metrics/` dentro de DREDD_HOME; se pide confirmación para código inline que importe los módulos de estado, para `bb.py` con el subcomando en variable y para `approve` o `close` escritos con glob; se deniega `-m` pegado. La guía ahora dice que el guard "dificulta, no impide" la autoaprobación.
- No requieren scrub `refs`, `diffstat` ni `coverage`, según el juez: el reporte no los imprime y no contienen rutas personales.

## Estado final

- Suite: 182 tests OK en Python 3.9.25 y 3.14.4, con 20 suites.
- Flujo e2e: 16 de 16 pasos.
- v1 idénticos a 348ea29.
- Los commits solo tocan `.claude/skills/dredd/` y `docs/`.
