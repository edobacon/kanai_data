---
id: tao176-umbral-skeleton-sin-token
project: taomangalam
type: decision
tags:
  - HU-01-05
  - overlays
  - skeleton
  - design-system
---

Contexto: el skeleton de HU-01-05 solo debe aparecer cuando la espera supera 300 ms (skeleton aparece pasados los 300 ms; una carga menor o igual no lo muestra). Ese umbral es un valor del contrato de la historia y no existe como token de movimiento ni de tiempo en `tokens.v1.json`: la escala de `motion` tiene `standard`=200, `emphasis`=260, `content`=360 y `skeletonCycle`=1200, pero ningun temporal de 300 ms.

Decision: declarar el umbral como constante NOMBRADA y documentada en el modulo de overlays (`taoSkeletonThresholdMilliseconds = 300` y `taoSkeletonThreshold`), en vez de un literal suelto dentro del widget `TaoSkeletonGate`. El umbral se aplica de forma ESTRICTA: el skeleton aparece cuando la espera lo SUPERA (se corre el vencimiento un microsegundo por detras del umbral), de modo que una carga que termina exactamente en 300 ms no lo muestra y una que lo supera si.

Alternativas descartadas: (a) reusar `motion.emphasis` (260) o `motion.content` (360) como umbral — no representan los 300 ms del contrato; (b) agregar un token de tiempo nuevo al design system — mayor alcance (afecta `tokens.v1.json` compartido y su regeneracion) y requiere decision de diseño sobre la escala completa; (c) dejar el 300 como literal suelto — opaco y fragil ante la guarda de literales.

Reversibilidad: alta. Cambiar la constante o migrarla a un token de tiempo es local a `tao_skeleton.dart`; el test fija el umbral y su frontera estricta (300 no, 301 si).
