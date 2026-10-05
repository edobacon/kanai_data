# F1: juez ciego de fase

Fecha: 2026-10-05. Juez: subagente sonnet de contexto limpio. Brief armado desde el plan (tareas F1.1-F1.4, criterios C1 y C3), las decisiones aprobadas D7-D12 y la regla de autonomía; leyó el código vía git y corrió la suite en un worktree aparte.

## Rondas

| Ronda | Commit | Veredicto | Hallazgos principales |
|---|---|---|---|
| 1 | e7778ec | iterar | J1 instaladores sin cubrir (npm ci, yarn); J2 egress por wrappers (sh -c, xargs, node -e) y bb.py de cualquier ruta; J3 comment sin confirmación; J4 end reabre corrida cerrada; J5 menciones DKC en SKILL.md; J6 carrera del lock; J7 manifiesto viejo en prefetch |
| 2 | 7ac44c4 | iterar | J4, J6, J7 resueltos; N1 yarn con flags y otros ecosistemas; N2 flags combinados (-lc), pipe a sh, eval; N3 comment vía $HELP; N4 inline ofuscado; N5 ventana mínima del lock (S3) |
| 3 | 1eed401 | iterar | N1-N3 resueltos; N7 os.system inline cortado por `;`; N6 más ecosistemas; N8 falsos deny en búsquedas |
| 4 | 2d80dc0 | **aprobado con nits** | N6-N8 resueltos; N10 (S3) falso deny conservador de os.system inocuo y `host` sin argumentos |

## Criterio de aceptación del guard (decidido por el dueño del caso)

Defensa en profundidad por análisis del texto del comando, no sandbox. Bloqueante solo un comando directo y común que instala o abre red con allow, o un falso deny de un comando que el protocolo necesita. Formas ofuscadas y scripts escritos y luego ejecutados: límite documentado en protocol/core.md.

## Pendientes

- J5 (menciones DKC en el protocolo): diferido a F2, que fragmenta el protocolo y las retira (ya retiradas en el árbol de trabajo de F2).
- N5, N9, N10: S3 aceptados.

Suite final de F1: 55 tests, OK en Python 3.9 y 3.14, sin skips.
