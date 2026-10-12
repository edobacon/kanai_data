# Guía de implementación · TAO-248 (HU-03a-12 + HU-03a-13 · EP-03a · M1a · P1)

## 0. Alcance y principio rector

Esta historia **no tiene interfaz propia**. No se diseña ni se modifica ninguna pantalla. V-51 (texto, fondo, aviso, estados de carga y error) pertenece a **HU-01-13 (DEC-235)** y se reutiliza tal cual.

Lo que se implementa:

- **Disparadores nuevos o modificados** de V-51: respuesta 201 con `pendientes`, respuesta 403 `version_legal_pendiente` y rechazo de la aceptación diferida.
- **Retorno conservado** a la pantalla de origen tras aceptar en V-51, incluido el caso nuevo (disparo por 201).
- **Reintento con espera creciente** que **no agrega ningún elemento visible**.
- **Traza en el servidor** (sin interfaz).

Fuera de alcance: rediseño de V-51, textos nuevos, banners, spinners, toasts o pantallas de error por la cola o por el reintento.

### Leyenda de etiquetas de la maqueta

| Etiqueta | Significado |
|---|---|
| Referencia HU-01-13 | No se modifica. Se copia el comportamiento y los textos. |
| Nuevo (TAO-248) | Comportamiento a implementar aquí. |
| Existente | Ya está en main. Solo se verifica. |
| Pendiente de decisión / Verificar texto | No se asume. Se marca y se consulta. |

## 1. Flujo del primer uso sin red

Orden fijo al volver la red: **alta de cuenta, cola legal, resto de operaciones**.

| Paso | Qué ocurre | Estado |
|---|---|---|
| 1. Sin red | Se acepta términos y privacidad en V-51. Se guardan en `registro_legal_pendiente`. | Existente |
| 2. Uso local | Se crea una consulta. El recorrido local no se bloquea. | Existente |
| 3. Vuelve la red | Se procesa en el orden fijo indicado. | Existente |
| 4. Servidor 5xx | Reintento con espera creciente y acotada. Misma `Idempotency-Key` en todos los intentos. | **Nuevo** |
| 5. 201 | Se borra la entrada de la cola. Si la respuesta trae `pendientes`, se presenta V-51 con el documento nuevo. | **Nuevo** |
| 6. Cola vacía | Continúan las demás operaciones. | Existente |

## 2. Componente V-51 (referencia, sin cambios)

Jerarquía observada en la maqueta (bottom sheet sobre la pantalla de origen):

```
Pantalla de origen (queda debajo, sin cambios)
└─ Capa de oscurecimiento (rgba(0,0,0,.35), cubre toda la pantalla)
└─ Sheet (anclado abajo, esquinas superiores 18px, borde superior, sombra hacia arriba)
   ├─ Título del documento: "Términos y condiciones" o "Privacidad"
   ├─ [Banner informativo]  (solo en estado de versión actualizada)
   ├─ Área de documento (borde 1px, radio 8px, ocupa el espacio restante, overflow oculto)
   │   └─ Encabezado: "Versión N · vigente desde <fecha>" + texto
   ├─ [Enlace "Ver documento completo"]  (solo en estado de versión actualizada)
   └─ Botón primario "Aceptar y continuar"
```

Reglas:

- Reutilizar el componente existente de HU-01-13. **No crear un componente nuevo ni variantes.**
- El sheet debe sentirse como el de la maqueta: `top` a ~70px del borde superior de la pantalla del teléfono de 500px, es decir, deja ver la barra superior de la pantalla de origen.
- Tipografía y tokens: los definidos por el design system de la app. Los valores CSS de la maqueta (`--accent`, `--err`, etc.) son ilustrativos de rol, no se copian literales.

### Estados de V-51 que esta historia debe poder disparar

| Estado | Cuándo aparece | Contenido | Origen |
|---|---|---|---|
| **C. Versión actualizada** | 201 con `pendientes` | Etiqueta de trazabilidad (solo maqueta, no UI real). Título. Banner informativo: **"Actualizamos este documento. Revísalo para continuar"**. Documento "Versión 3 · vigente desde 10 oct 2026". Enlace **"Ver documento completo"**. Botón **"Aceptar y continuar"** habilitado (primario). | Referencia HU-01-13 |
| **D. Carga** | La versión nueva no está empaquetada y se obtiene con `obtenerDocumentoLegal` | Título. Área del documento centrada con indicador de carga y texto **"Cargando documento"**. Botón **"Aceptar y continuar"** **deshabilitado** hasta tener el texto. | Referencia HU-01-13 |
| **E. Error** | Falla la obtención del documento nuevo | Título. Banner de error: **"No pudimos cargar el documento. Revisa tu conexión e inténtalo de nuevo."** Área del documento vacía. Botón secundario **"Reintentar"**. | Referencia HU-01-13 (**Verificar texto**) |
| **F. Aceptación requerida** | Rechazo de la diferida (`aceptacion_fecha_invalida`) | Título **"Privacidad"** (o el tipo rechazado), documento con texto, botón primario **"Aceptar y continuar"**. Sin banner. | Existente |

Notas por estado:

- **C**: el documento mostrado debe ser el **nuevo**, no el ya aceptado. Fuente del texto: empaquetado en la app, o `urlPublicada` cuando no está empaquetado.
- **D**: el indicador de carga es un círculo con borde y un tramo transparente que gira. Con **movimiento reducido activado no debe animarse** (queda estático). Debe seguir mostrando el texto "Cargando documento".
- **E**: el texto del error **debe ser el de HU-01-13**. Si ese texto no existe allá, **no se define aquí**: se solicita en HU-01-13. El de la maqueta es el que se espera encontrar. Marcar como pendiente de verificación y no inventar variantes.
- **F**: la entrada rechazada ya salió de la cola. V-51 vuelve a pedir la aceptación desde cero.

## 3. Disparadores (comportamiento a implementar)

### 3.1 Respuesta 201 con `pendientes` (nuevo, estado C)

1. La aceptación diferida se registra en servidor.
2. Se borra la entrada de `registro_legal_pendiente`.
3. Si el cuerpo trae `pendientes` (existe una versión nueva), se presenta **V-51 de inmediato** con el documento nuevo, sobre la pantalla en la que esté la persona (en la maqueta, "Consulta #12").
4. Si la versión nueva no está empaquetada, se obtiene con `obtenerDocumentoLegal`: se pasa por el estado D y, si falla, por el E.
5. Al aceptar, se **vuelve a la pantalla de origen** (ver sección 4).

### 3.2 Respuesta 403 `version_legal_pendiente` (existente, estado G a H)

- Pantalla profunda de ejemplo: "‹ Consulta #12 · Seguimiento", botón **"Guardar seguimiento"** (la acción que origina la llamada).
- Al tocar, el servidor responde 403 con `version_legal_pendiente` sobre una operación **no exenta**.
- Se presenta V-51. No se muestra ningún banner adicional en la pantalla de origen (en la maqueta existe un `banner warn` oculto con `display:none`: **debe permanecer sin renderizarse**).

### 3.3 Rechazo de la aceptación diferida (existente, estado F)

- Rechazo 4xx (por ejemplo `aceptacion_fecha_invalida` por reloj adelantado).
- La entrada **sale de la cola**, la cola queda vacía y V-51 vuelve a pedir la aceptación.
- No se reintenta un 4xx.
- Caso ilustrado: la hora del dispositivo muestra "8:10 (+1 día)", sobre la pantalla "Bienvenida" (cuerpo vacío bajo el sheet).

## 4. Retorno conservado (estados C y H)

Tras aceptar en V-51:

- Se regresa a la **misma pantalla**, en la **misma posición** de contenido.
- El **foco** queda en el **botón que originó la acción** ("Guardar seguimiento" en el ejemplo), conforme a HU-01-09. En la maqueta se resalta con un contorno punteado de 2px (`focus`); en la app real se usa el indicador de foco estándar del sistema/diseño, no un contorno punteado propio.
- Debe cumplirse **igual en el caso C** (disparo por 201 con `pendientes`). Ahí lo nuevo es que el disparo no nace de un toque del usuario, así que hay que conservar la pantalla y el elemento enfocado que estaban activos cuando llegó la respuesta.
- No se muestra ningún aviso de confirmación.

## 5. Estados sin cambio visible (A y B)

Ambos son verificaciones **negativas**: no debe aparecer nada nuevo.

| Estado | Contexto | Resultado esperado |
|---|---|---|
| **A. Sin red, aceptaciones en cola** (Existente) | Modo avión. Pantalla "Inicio" con tarjeta "Consulta nueva". | Uso local libre. **Sin banner nuevo** por la cola. La cola trabaja en segundo plano. |
| **B. Red presente, servidor caído** (Nuevo) | Wi-Fi. Servidor responde 503, intento 3 de N, próximo en 8 s. | **Nada de esto se muestra.** Sin spinner bloqueante, sin pantalla de error, sin toast, sin contador. La maqueta rotula el teléfono con "sin cambio visible". |

Los textos de depuración que aparecen en la maqueta dentro de estas pantallas ("Servidor responde 503...", "Sin aviso nuevo de envío pendiente...") son **anotaciones para el verificador, no UI**. No se implementan.

## 6. Reintento con espera creciente (REQ-01)

### Se reintenta

- Red presente y servidor con **5xx** o **sin respuesta (timeout)**, mientras queden entradas en la cola.
- **Misma `Idempotency-Key` en cada intento.**

### No se reintenta

- Rechazos **4xx** de la diferida: salen de la cola y se presenta V-51.
- **Sin red**: se espera la reconexión, como hoy.
- Al **agotar el ciclo**: se retoma al reconectar o al reabrir la app.

### Parámetros

Ejemplo ilustrativo de la maqueta (no son valores finales):

| Intento | Resultado | Espera siguiente |
|---|---|---|
| 1 (t=0) | 503 | 2 s |
| 2 | 503 | 4 s |
| 3 | timeout | 8 s |
| 4 | 503 | 16 s |
| 5 | 503 | 30 s (tope) |
| 6 | 201, cola vacía | n/a |

Implementación:

- Los valores reales viven en **constantes con nombre**: base, factor, tope, intentos por ciclo. Sin magic numbers.
- La espera crece por factor y se **acota** en el tope.
- Nada de estos valores se muestra en la interfaz.
- Convención visual de la maqueta para el diagrama (solo documentación): punto rojo para fallo, punto verde para éxito.

## 7. Regla de pendientes (REQ-05, REQ-06)

| Situación de la versión vigente | 403 en operación no exenta | `legalPendiente` del manifiesto | Estado |
|---|---|---|---|
| Nunca aceptada por la cuenta, sin `exige_reaceptacion` | Bloquea (propuesta) | La incluye (propuesta) | **Decide Producto** |
| Con `exige_reaceptacion`, la aceptada es anterior | Bloquea | La incluye | Existente |
| Aceptada, versión nueva sin marca | No bloquea | No la incluye | Existente |

- El middleware y el manifiesto usan **la misma fuente**: `crearFuenteLegalPendiente`.
- La prueba unitaria debe fijar las **tres filas**.
- La fila 1 está **pendiente de decisión de Producto**: implementar según la propuesta, pero dejarla aislada para poder cambiarla sin tocar el resto, y no darla por cerrada.

## 8. Traza en el servidor (REQ-03, REQ-07)

Sin interfaz. Logs sin texto de documentos ni datos personales.

**Aceptación diferida registrada**

```json
{
  "evento": "aceptacion_legal_diferida",
  "tipo": "terminos",
  "versionId": "terminos-v2",
  "diferida": true,
  "diferenciaSegundos": 172800,
  "diferenciaDias": 2
}
```

- `aceptada_at` = fecha original de la aceptación. `registrada_at` = momento de recepción.

**Bloqueo por versión pendiente (muestreado)**

```json
{
  "evento": "bloqueo_version_legal",
  "errorCode": "version_legal_pendiente",
  "tiposPendientes": ["terminos"],
  "operacion": "crearSeguimiento",
  "muestreo": 0.1
}
```

- La tasa de muestreo va en una **constante con nombre**.

## 9. Accesibilidad y responsive

- **Movimiento reducido**: el indicador de carga de V-51 (estado D) no anima con la preferencia activada. Sin esa preferencia gira de forma continua y lineal.
- **Modo oscuro**: la maqueta define variantes oscuras de todos los roles de color (fondo, superficie, texto, acento, error, advertencia). Usar los tokens del design system que ya resuelven ambos temas; no fijar colores.
- **Dispositivos**: verificar en emulador (Android, iPhone, tablet virtual) en smartphone y tablet, según Adenda 1. Los teléfonos de la maqueta (ancho máx. ~270px, pantalla de 500px de alto) son representaciones, no medidas de diseño.
- Contraste del banner informativo, del de error y del botón deshabilitado: heredado de V-51 (HU-01-13).

## 10. Checklist de verificación visual

- [ ] **A y B**: no hay elementos nuevos en pantalla por la cola ni por el reintento.
- [ ] **C**: V-51 muestra el documento **nuevo** (no el ya aceptado) apenas llega el 201 con `pendientes`.
- [ ] **C y H**: al aceptar, se vuelve a la pantalla de origen con su posición y foco.
- [ ] **D y E**: carga y error de V-51 usan los textos de HU-01-13, sin textos nuevos inventados aquí.
- [ ] **F**: tras el rechazo de la diferida, la cola queda vacía y V-51 vuelve a pedir la aceptación.
- [ ] **Movimiento reducido**: el indicador de carga no anima con la preferencia activada.
- [ ] **Dispositivos**: smartphone y tablet en emulador (Android, iPhone, tablet virtual), según Adenda 1.
- [ ] **Regla de pendientes**: la prueba unitaria cubre las tres filas de la sección 7.

## 11. Puntos abiertos (no inventar)

1. **Texto del error de V-51 (estado E)**: confirmar que existe en HU-01-13. Si no, solicitarlo allá.
2. **Fila 1 de la regla de pendientes**: decisión de Producto sobre si una versión nunca aceptada y sin `exige_reaceptacion` bloquea y figura en `legalPendiente`.
3. **Valores del reintento** (base, factor, tope, intentos por ciclo) y **tasa de muestreo** del log: definirlos como constantes con nombre y acordarlos con quien corresponda.