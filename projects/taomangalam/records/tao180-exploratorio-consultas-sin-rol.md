---
id: tao180-exploratorio-consultas-sin-rol
project: taomangalam
type: bug
---

Hallazgo EXPLORATORIO (barrido automático del árbol semántico, no auditoría con lectores) del 2026-10-03 sobre las superficies provisionales de TAO-180:

- Pantalla provisional de Consultas (app/lib/features/consultas/presentation/consultas_screen.dart, marcador): 13 filas ListTile "Consulta N" expuestas como accionables (tap) SIN rol anunciable (flagsCollection.isButton=false); un lector no tiene garantía de anunciar "botón". Evidencia: barrido del SemanticsNode raíz en 390x844 por cada destino primario; los 13 nodos reportaron rol "sin-rol".
- Shell (real, HU-01-08): "Abrir menú" se anuncia con nombre y rol button (48x48); sin hallazgos en el encabezado.
- Destinos Inicio, Biblioteca, Productos, Ajustes, Cuenta y Ayuda: solo el control "Abrir menú" en el cuerpo (marcadores sin controles propios).

Alcance: la superficie pertenece a una historia distinta (Consulta/HU-01-11 en EP-05, hoy bloqueada) y es un marcador provisional; NO es bloqueante de EP-01 ni bloqueante de TAO-180, y no se corrige aquí. Se registra como insumo para la historia dueña cuando deje de ser marcador.

Este hallazgo NO sustituye la auditoría de REQ-06 (TalkBack/VoiceOver sobre V-31 y V-51 reales), que sigue pendiente.
