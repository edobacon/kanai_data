---
id: DOC-kb-mvp-05-epicas-y-orden-de-ejecucion
project: tao-v2
type: doc
tags:
  - mvp
  - epicas
  - orden
  - ejecucion
---

# Épicas y orden de ejecución

Agrupación de los 64 tickets del MVP en 19 épicas de 2 a 5 tickets, con el orden de ejecución, los puntos de sincronización entre carriles y la forma de optimizarlo. Las dependencias por ticket están en `20-mapa-de-dependencias`; los cortes de esta tabla se verificaron contra ellas (ver "Verificación"). Los 64 tickets y sus 117 dependencias ya existen en Kanai (TV2-001 a TV2-064, creados el 2026-10-12, en el orden de esta tabla); las épicas se crean a continuación.

## Criterio

- Las épicas se ordenan por dependencias reales, no por pantalla. Todo lo de la app que no toca servidor puede arrancar apenas termine X02, en paralelo con el servidor.
- Tamaño objetivo: unos 4 tickets por épica (de 2 a 5). Cada épica cierra con un resultado verificable propio y deja una rama acumuladora integrable.
- Flujo de épica en sitio (rama acumuladora `epic/EP-nn`, dependencias contra esa rama, `epicCi: local`, sin CI remoto). Dentro de una épica la ejecución es en serie; si dos épicas pueden correr a la vez no está documentado, y se prueba con la primera pareja (EP-02 y EP-09).
- Cada épica se prepara con `prepare` antes de lanzarla (decisiones y contratos entre tickets resueltos), se valida cada fase con un juez ciego barato y se pasa un solo arbiter al cerrarla.
- Tickets: unidad revisable de entre medio día y dos días tras fundir cinco pequeños (B1-05, B4-02, B5-01, W01c, P03). Los pares motor y UI (sufijos a y b) se mantienen separados.
- Costo de épicas chicas: cada una paga su preparación, aprobación y arbiter. A cambio hay más puntos de cierre, revisiones más acotadas y menos tickets afectados por un fallo.

## Épicas y tickets (64)

Los tickets van en el orden de ejecución dentro de la épica.

| Épica | Objetivo verificable | Tickets | N.º |
| --- | --- | --- | --- |
| EP-01 Cimientos | DEC publicada; plan V3, muestras y `diseno-web` dentro del repo | X01, X02 | 2 |
| EP-02 Base del servidor y registro | Entorno local limpio, base y esquema, registro de cuenta contra API real | B0-01, B0-02, B0-03, B1-01 | 4 |
| EP-03 Acceso y sesión | Acceso, recuperación y sesión web; seed de perfiles y CLI de cuentas; estado de cuenta | B1-02, B1-03, B1-04, B2-01 | 4 |
| EP-04 Legal, eliminación y consumo de unidades | Aceptación legal, eliminación de cuenta (núcleo) con suite de integración, y validar y usar unidades | B2-02, B5-02, B3-01, B3-02, B3-03 | 5 |
| EP-05 Administración y productor (backend) | Suspender y reactivar cuentas, alta de Productor y eliminación de producto | B4-01, B7-01, B3-04 | 3 |
| EP-06 Unidades del productor (backend) | El productor genera, confirma y revela unidades; el servidor las valida | B6-01, B6-02 | 2 |
| EP-07 Web: portal público y base | Presentación pública en `/`, portal de eliminación de cuenta y entrada al backoffice | W01a, W04, W00, W01b | 4 |
| EP-08 Web: cuentas y productor | Administración de cuentas y operación de productor en el navegador | W02, W03, P01, P02 | 4 |
| EP-09 App base | Motor local expuesto, espacio por cuenta, assets sin conexión y verificación visual | A00, A05, A06 | 3 |
| EP-10 Tablero: lienzo y perfil | Inicio, consultas, perfil local y personalidad (V-01, V-44, V-45, V-28, V-29) | T01a, T01b, T02a, T02b | 4 |
| EP-11 Dados: ritual y Casa | Detalle de consulta, tablero, ritual y ficha de Casa (V-03, V-32, V-04, V-05) | T04a, T04b, T04c, T04d | 4 |
| EP-12 Dados: interfaz | Lanzar, corregir y confirmar dados en pantalla (V-06, V-07) y animación | T05a, T05b, T05c, T05d | 4 |
| EP-13 Cuenta en app | Entrada, legal, registro, acceso y recuperación en la app (V-31, V-51, V-23, V-24, V-25, V-26) | A02, A03a, A03b | 3 |
| EP-14 Consumo y cuenta | Cuenta (V-27), consumo de unidades Kuberani (V-02, V-39) | A04, T03a, T03b | 3 |
| EP-15 Práctica y recordatorios | Práctica (V-08) y recordatorios locales con permiso | T06, T06b, T06c | 3 |
| EP-16 Retroceso | Retroceso con reconocimiento (V-09, V-10) y motor de reparación | T07a, T07b, T08a | 3 |
| EP-17 Reparación | Reparación y coherencia (V-11, V-12) | T08b, T09a, T09b | 3 |
| EP-18 Historial y cierre del tablero | Historial (V-13) y motor de cierre en Casa 12 | T10a, T10b, T11a | 3 |
| EP-19 Recorrido final | Cierre en pantalla (V-14) y recorrido de punta a punta con informe local | T11b, Q01, Q02 | 3 |

Total: 2 + 4 + 4 + 5 + 3 + 2 + 4 + 4 + 3 + 4 + 4 + 4 + 3 + 3 + 3 + 3 + 3 + 3 + 3 = 64.

Equivalencia con las 9 épicas anteriores: EP-01 = EP-01; EP-02 a EP-04 = antigua EP-02 (más B5-02 que venía de EP-03); EP-05 y EP-06 = antigua EP-03; EP-07 y EP-08 = antigua EP-04 (más W04); EP-09 y EP-10 = antigua EP-05; EP-11 y EP-12 = antigua EP-06; EP-13 y EP-14 = antigua EP-07; EP-15 a EP-17 = antigua EP-08; EP-18 y EP-19 = antigua EP-09. La web se corta en base (W01a, W04, W00, W01b: solo dependen del núcleo de cuenta y de B3-02) y en cuentas y productor (W02, W03, P01, P02: dependen del backend de administración y de unidades). B5-02 vive en EP-04 porque, con las dependencias relajadas, solo necesita B0-03, B1-03 y B2-02.

## Verificación de dependencias entre épicas

Cada épica depende solo de épicas anteriores en la lista de abajo; no hay ciclos. Se revisó cada ticket contra el mapa `20`.

| Épica | Requiere (épicas) | Motivo (dependencia entre épicas) |
| --- | --- | --- |
| EP-01 | ninguna | |
| EP-02 | ninguna | B0-01 no depende de nadie |
| EP-03 | EP-01, EP-02 | B1-02 y B1-03 siguen a B1-01; B1-04 necesita X01 |
| EP-04 | EP-03 | B2-02 necesita B2-01 y B1-03; B5-02 necesita B0-03, B1-03 y B2-02 |
| EP-05 | EP-04, EP-03 | B4-01 necesita B1-04 y B3-02; B7-01 necesita B5-02; B3-04 necesita B3-02 y B7-01 |
| EP-06 | EP-05 | B6-01 necesita B7-01 |
| EP-07 | EP-01, EP-03, EP-04 | W01a necesita B1-03, X01, X02; W04 necesita B3-02; W00 necesita B2-01 y W04; W01b necesita B1-04 y B2-02 |
| EP-08 | EP-07, EP-05, EP-06 | W02 necesita B4-01; W03 necesita B7-01; P01 necesita B6-01; P02 necesita B6-02 |
| EP-09 | EP-01 | A00 necesita X02 |
| EP-10 | EP-09 | T01a necesita A00 y A05 |
| EP-11 | EP-10, EP-09 | T04a necesita T01b; T04b necesita A06 |
| EP-12 | EP-11 | T05a necesita T04c |
| EP-13 | EP-09, EP-03, EP-04 | A02 necesita A00 y B1-03; A03a necesita A05 y B3-01; A03b necesita B1-02 |
| EP-14 | EP-13, EP-04, EP-10 | A04 necesita B3-03; T03a necesita B5-02 (ahora en EP-04); T03b necesita T02b |
| EP-15 | EP-12, EP-14, EP-11, EP-13 | T06 necesita T05c, T03a, T04d; T06c necesita A02 |
| EP-16 | EP-12, EP-14 | T07a necesita T05c; T08a necesita T03a y B5-02 |
| EP-17 | EP-16 | T08b y T09a necesitan T08a |
| EP-18 | EP-15, EP-17 | T10a necesita T06 y T09a; T10b necesita T09b |
| EP-19 | EP-18, EP-08, EP-05, EP-14, EP-15 | Q01 necesita P02, T11b, T06c, T03b; Q02 necesita A04, W02, W03, W04 y B3-04 |

Dentro de cada épica el orden de la tabla respeta las dependencias entre sus tickets (comprobado: ningún ticket depende de otro de su misma épica que quede después en la lista). Observación: EP-07 no necesita EP-05 ni EP-06, así que puede correr en cuanto cierre EP-04 y en paralelo con ellas si se admiten épicas simultáneas.

## Orden de ejecución

```
Servidor:  EP-01 → EP-02 → EP-03 → EP-04 → EP-05 → EP-06 → EP-07 → EP-08
App:       EP-01 → EP-09 → EP-10 → EP-11 → EP-12
Cuenta en app:  EP-13 (tras EP-04 y EP-09) → EP-14 (tras EP-04 y EP-10)
Método:         EP-15 y EP-16 (tras EP-12 y EP-14) → EP-17 → EP-18 → EP-19 (con EP-05, EP-08)
```

EP-07 puede adelantarse a EP-05 y EP-06 si se admiten épicas en paralelo. Si no, el orden de arriba pone a EP-05 temprano por B4-01 y B7-01.

Puntos de sincronización entre carriles:

| Punto | Qué espera | Por qué |
| --- | --- | --- |
| S1 | EP-13 espera a EP-03 y EP-04 | A02, A03a y A03b necesitan B1-03, B3-01 y B1-02 |
| S2 | EP-14 espera a EP-04 y a EP-10 | A04 necesita B3-03; T03a consume unidades (B5-02, ya en EP-04); T03b necesita T02b |
| S3 | EP-15 y EP-16 esperan a EP-12 y a EP-14 | T06, T07a y T08a necesitan los dados y T03a |
| S4 | EP-08 espera a EP-05 y EP-06 | W02, W03, P01 y P02 usan el backend de administración y de unidades |
| S5 | EP-19 espera a EP-08, EP-05, EP-14, EP-15 y EP-18 | El recorrido usa la web de productor, la eliminación de producto y la app completa |

## Decisiones cerradas el 2026-10-12 que afectan a esta organización

- Relajación de dependencias aprobada: B5-02 depende de B0-03, B1-03 y B2-02; B4-01 depende de B1-04 y B3-02. Por eso B5-02 pasó a EP-04 y EP-14 ya no espera a EP-05.
- Portal público de eliminación de cuenta (W04) dentro del MVP, como vista del servidor: pasó de 63 a 64 tickets y entró en EP-07.
- T05d dentro del MVP, último de EP-12 (no bloquea Q01).
- Purga de 12 meses fuera del MVP; no hay job programado en ningún ticket.

## Cómo optimizar la ejecución

1. Arrancar los dos carriles a la vez apenas X02 esté integrado. El carril de la app es el camino crítico (36 tickets contra 28 del servidor y la web).
2. Dentro de una oleada de tickets independientes, ejecución en paralelo con worktrees (kn-parallel). Ejemplos: B1-02 con B2-01; A00 con A06 tras X02; B5-02 con B3-01 tras B2-02.
3. Dejar T05d y T06c, que no tienen muestra, como últimos de su épica para que no bloqueen el cierre.
4. Declarar contratos entre tickets antes de lanzar cada épica (`provides` y `requirements`): ids deterministas (D-06), `accountDeletionPortalUrl` y `rutas-publicas.ts` (B1-01, W04), nombres de rutas web, `iniciarSesionWeb`, `tokens.v1.json`, versiones del esquema Drift (A05 v6, T07a v7) y la tabla de recordatorios de T06b.
5. Primera prueba de paralelismo entre épicas: lanzar EP-02 y EP-09 a la vez, y comprobar que no chocan las ramas acumuladoras ni el estado de Kanai.

## Estado de la carga en Kanai y pendientes

- Hecho (2026-10-12): los 64 tickets creados como TV2-001 a TV2-064 y las 117 relaciones `depends_on` registradas. Las épicas se crean a continuación.
- Decisiones del dev: ninguna estructural abierta. Quedan datos de Producto y Contenido que no bloquean el desarrollo: texto definitivo y contacto de W00, textos legales aprobados, texto de alcance del portal de eliminación, copy de recordatorios y política de pasos previos de anillos (DEC-234).
- Entorno: renombrar los contenedores y puertos de `compose.yaml` (conflicto con el stack del repo legacy), asignado a B0-02; Flutter vive en `~/fvm` y no está en el PATH. El helper de imágenes de Codex tiene un modelo registrado (`gpt-5.5`, vigente hasta 2026-11-11, sin confirmación humana por formulario): se renueva cuando venza si hay tasks de imagen.
- Datos de Kanai pendientes: contratos de las épicas, referencia externa (issues de `edobacon/tao-v2` o el id MVP), sondas del proyecto, comandos de verificación del gate (Flutter por fvm y Node 24), quién ejecuta las verificaciones de emulador y navegador, y reiniciar el MCP de Kanai.
- Documentos: la tabla de alias de `20` cubre los ids absorbidos que aún citan `03` y `21`.
