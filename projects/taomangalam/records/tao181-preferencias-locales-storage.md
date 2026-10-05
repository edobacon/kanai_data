---
id: tao181-preferencias-locales-storage
project: taomangalam
type: decision
module: EP-01
tags:
  - TAO-181
  - preferencias
  - accesibilidad
  - almacenamiento
  - EP-06
---

En taomangalam la preferencia local de accesibilidad se guarda hoy en `flutter_secure_storage` con claves versionadas propias (`movimiento`/`contraste`/`lectura` `.v1`). La tabla `preferencia_local` en Drift está planificada por EP-06 y todavía no existe.

El contrato tipado `PreferenceStore` (`app/lib/core/preferences/preference_store.dart`) es el **punto de extensión** para ese cambio futuro: cuando EP-06 traiga Drift, la implementación cambia detrás del contrato y los consumidores no se tocan.

Contexto: TAO-181 (HU-01-17) implementó la pantalla de Ajustes con previsualización y persistencia local por dispositivo. El registro queda para que el salto a Drift no reintroduzca claves sueltas.
