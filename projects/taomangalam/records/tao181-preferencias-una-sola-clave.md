---
id: tao181-preferencias-una-sola-clave
project: taomangalam
type: rule
module: EP-01
level: must
tags:
  - TAO-181
  - preferencias
  - accesibilidad
  - movimiento-reducido
---

Para que un ajuste local de accesibilidad rija en runtime **y** después de reiniciar la app, todos los consumidores (navegación, menú, transiciones, shell) deben leer la **misma clave versionada** a través del adaptador `PreferenceStoreReducedMotionStore`.

**Por qué**: mantener dos stores paralelos —la clave heredada `movimiento_reducido` y la clave versionada nueva— pierde la preferencia en silencio. Es un fallo que no se ve en la pantalla de Ajustes (donde el valor se acaba de escribir) y solo aparece al reiniciar o al navegar. Se detectó y corrigió durante TAO-181 (S1.T2), en el cableado del `PreferenceStore`.

**Cómo aplicarla**: un cambio de claves de preferencias se hace en el adaptador y sus pruebas, nunca leyendo la clave directa desde un consumidor.
