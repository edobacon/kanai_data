# Borrador: aviso al lead sobre secretos escritos en el código (hallazgos de USUITE-15425)

Estado: **borrador sin enviar** (2026-10-02). Lo envía el dev por el canal que elija, después de revisarlo.
No incluye ningún valor: solo archivo, línea y tipo de secreto.

---

Hola, [nombre del lead]:

Trabajando en USUITE-15425 (contraseñas en los logs de suite-api) aparecieron tres secretos escritos en el
código de los repos. No son parte del ticket y no los toqué, pero creo que conviene revisarlos pronto porque
cualquier persona con acceso a los repos, o a su historial, puede verlos.

| # | Repo y archivo | Qué es | Estado en el archivo |
|---|---|---|---|
| 1 | `user-api` · `services.js:263` | Clave del cifrado de ids de `getUsrDetails` (agregado en ISO-636, marzo de 2025): se arma con `clientName` más un texto fijo | Activa en el código. El backend solo descifra, así que quien cifra el id (presumiblemente el frontend) también la tiene; no lo verifiqué en el repo del frontend |
| 2 | `sandbox-api` · `server/config/local.env.sample.backend.js:87` | `CLIENT_SECRET` de Power BI, junto con el `CLIENTID` y el `TENANTID` de Azure | Activo en la plantilla de configuración (no comentado) |
| 3 | `sandbox-api` · `server/config/local.env.sample.backend.js:147` | `CLIENT_SECRET` de Keycloak de desarrollo | Dentro de un ejemplo comentado de `OPENID_CONNECT` |

Lo que propongo, a decidir por ti:

1. **Confirmar si están vigentes.** Si lo están, rotarlos: sacarlos del archivo no alcanza, porque siguen en
   el historial de git.
2. **Plantilla (2 y 3):** reemplazar los valores por marcadores, como ya están `POWERBI_USERNAME` y
   `POWERBI_USER_PASSWORD` en el mismo archivo.
3. **Clave de ISO-636 (1):** moverla a la configuración de cada ambiente (`local.env.js`) en vez de dejarla en
   el código. Hay que coordinarlo con quien cifra el id (presumiblemente el frontend) y con quien despliega.

Ninguno de estos cambios va en el PR de USUITE-15425, para no mezclar alcances. Si te parece, abro un ticket
aparte con estos tres puntos.

Gracias,
[firma]

---

## Notas para el dev (no van en el mensaje)

- Registrado como hallazgo preexistente en F8 del caso, eventos e0168 (clave de `services.js`) y e0174
  (plantilla).
- El test `userdetail.test.js` se arregló en F8.0 sin copiar la clave del punto 1 (reemplaza el descifrado
  durante el test).
- Durante la revisión del 2026-10-02 los valores de los puntos 2 y 3 aparecieron por error en la salida de la
  sesión de trabajo. Ya estaban en el repo, así que no cambia la exposición, pero conviene tenerlo en cuenta si
  esa conversación se comparte.
