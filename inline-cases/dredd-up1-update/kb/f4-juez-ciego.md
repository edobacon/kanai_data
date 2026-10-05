# F4: juez ciego de fase

Fecha: 2026-10-05. Juez sonnet de contexto limpio; corrió experimentos en repos temporales y las suites en worktrees aparte.

| Ronda | Commit | Veredicto | Hallazgos |
|---|---|---|---|
| 1 | 2e8a1d3 | iterar | F1 (S1) rutas no ASCII entrecomilladas y blob corrupto; F2 (S1) todo binario escalaba en la ronda 2; F3 (S1) un archivo cambiado y no re-reportado seguía como leído; F4 worktree contra la base cruda atribuía cambios ajenos al autor; F5 cierre sin comprobar estado, reaparición ni lectura completa; F6 colisiones de id sin mechanism y de clave feature/x vs feature-x; F7 consumidores no expuestos y regex rota; F8 traspaso de cobertura por blob demasiado amplio |
| 2 | b4c91db | **aprobado con nits** | F1-F8 resueltos; N1 (S3) cierre de archivo fuera del alcance y binarios solo decidibles |

N1 documentado en protocol/rounds.md. Tests: F4 32 OK, suite completa 145 OK (python 3.9).
