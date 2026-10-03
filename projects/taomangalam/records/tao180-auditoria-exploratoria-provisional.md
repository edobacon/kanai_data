---
id: tao180-auditoria-exploratoria-provisional
project: taomangalam
type: decision
---

Decisión del dev (2026-10-03): ante la falta de las vistas reales de V-31 (HU-01-12, TAO-183) y V-51 (HU-01-13, TAO-185), se decide correr una auditoría EXPLORATORIA sobre las superficies actuales (shell real de HU-01-08 y pantallas de marcador de Inicio/Ajustes y demás destinos provisionales), sin esperar a esas historias.

Límites registrados:
- NO satisface REQ-06 ni REQ-09 de TAO-180: la auditoría con TalkBack/VoiceOver sobre V-31 y V-51 reales sigue pendiente y no se sustituye por stubs.
- Los resultados de esta pasada son PROVISIONALES: no se promueven casos de prueba a verificados por ella, no se declara la aprobación de Diseño y no se cierran los bloqueantes de EP-01 con base en ella.
- Las tareas S4.T3/S4.T4 de TAO-180 permanecen pendientes para las vistas reales; esta pasada solo alimenta insumos.
- La ejecución con lectores de pantalla es trabajo HUMANO en dispositivo/emulador (TalkBack en Android, VoiceOver en iPhone/iPad o macOS); el agente no la ejecuta ni inventa hallazgos. El agente aporta un barrido automático del árbol semántico y el runbook.

Insumos generados en esta pasada: barrido semántico automático del shell y los marcadores (nombres, roles y rects de los controles), runbook de dispositivos y registro de lo que reporte el dev.
