# HU-01-08 — Guía de implementación: encabezado y menú de navegación del consultor

> Fiel a la maqueta aprobada (TAO-177 · HU-01-08 · EP-01 · M0). Todo valor citado aquí sale de un token; la maqueta usa literales solo porque es HTML de verificación.

---

## 0. Alcance

Shell de navegación del consultor: encabezado compacto, panel lateral (superpuesto o persistente según ancho disponible), destino activo, grupo de pie, foco, movimiento reducido, escala 200 % y orientación. Los siete destinos llevan a pantallas de marcador en M0.

**Fuera de alcance** (sección 9 de la maqueta, no implementar ni reclamar en QA-01-08-05):

- Paisaje, ilustración de fondo o cajas por pictograma dentro del panel. El panel es **una sola superficie marfil opaca** (doc 43 §7 y §9, DEC-235). El fondo de la vista anfitriona solo asoma detrás del scrim.
- Filtrado de destinos por manifiesto de cuenta (HU-01-11, M1a). Aquí se ven los siete siempre.
- Contenido real de cada destino (EP-05, EP-10, EP-11, EP-03b).
- Franja de impersonación (EP-14b): no hay espacio reservado en este shell.
- Menús de Productor y Administrador (EP-13, EP-14a/b). Este es el del consultor (doc 36, sección I).
- Pictogramas ilustrados: faltantes en contenido/assets. Los iconos son los operativos de HU-01-03 y son **provisionales**.

---

## 1. Árbol de componentes

```
TaoAppShell                        ← decide superpuesto vs persistente
├─ TaoNavDrawer (persistente)      ← solo si anchoDisponible >= expandedMin
├─ Columna de contenido
│  ├─ TaoAppHeader
│  │  ├─ TaoIconButton  (volver | ocultar/mostrar panel)   ← condicional
│  │  ├─ TaoHeaderTitle (titulo + contexto opcional)
│  │  └─ TaoIconButton  (hamburguesa)                      ← condicional
│  └─ Vista anfitriona (slot)
├─ TaoScrim                        ← solo en modo superpuesto abierto
└─ TaoNavDrawer (superpuesto)      ← solo en modo superpuesto abierto
   ├─ TaoDrawerHeader
   │  ├─ marca + rol
   │  └─ TaoIconButton (cerrar)
   ├─ TaoDrawerScroll
   │  └─ TaoNavItem × 4            ← grupo principal
   └─ TaoDrawerFooter              ← ancla; se vuelve flujo a 200 %
      ├─ TaoGroupCaption ("Tu cuenta")
      └─ TaoNavItem × 3            ← grupo de pie
```

Orden en el eje Z del modo superpuesto: vista anfitriona → scrim → panel. El panel nunca queda debajo del scrim.

---

## 2. Modelo declarativo de destinos (REQ-01, REQ-10)

Lista en memoria, **sin red**: el menú abre y navega aunque la vista falle. Ninguna etiqueta es literal en el widget; se resuelven por clave i18n (claves ARB de TAO-179) y las rutas reutilizan `AppRouteNames`.

| Grupo | Id estable | Clave i18n | Etiqueta en español | Icono | Ruta (M0) |
|---|---|---|---|---|---|
| principal | `home` | `homeTitle` | Inicio | casa | `/home` |
| principal | `consultas` | `consultasTitle` | Consultas | globo de diálogo | `/consultas` |
| principal | `biblioteca` | `bibliotecaTitle` | Biblioteca | libro | `/biblioteca` |
| principal | `productos` | `productosTitle` | Productos | caja | `/productos` |
| pie | `ajustes` | `ajustesTitle` | Ajustes | engranaje | `/ajustes` |
| pie | `cuenta` | `cuentaTitle` | Cuenta | persona | `/cuenta` |
| pie | `ayuda` | `ayudaTitle` | Ayuda | interrogación | `/ayuda` |

**El destino activo se deriva de la ruta actual**, no de un estado propio del panel. Cambiar de destino no guarda nada en el shell.

### Textos restantes

| Clave | Texto |
|---|---|
| `nav.group.account` | Tu cuenta |
| `nav.drawer.brand` | Tao Mangalam |
| `nav.drawer.role` | Consultor |
| `nav.open` | Abrir menú de navegación |
| `nav.close` | Cerrar menú |
| `nav.back` | Volver |
| `nav.hide` | Ocultar panel de navegación |
| `nav.show` | Mostrar panel de navegación |

---

## 3. Tokens: medidas, duraciones y límites (REQ-09)

Ningún color literal, ningún número mágico. Esta tabla es el contrato contra el que se comparan los goldens.

| Concepto | Token | Valor |
|---|---|---|
| Alto del encabezado, teléfono | `TaoSize.headerCompact` | 64 |
| Alto del encabezado, tablet | `TaoSize.headerMedium` | 72 |
| Área táctil de los controles | `TaoSize.touchTarget` | 48 × 48 |
| Ancho del panel superpuesto | 80 % · `TaoSize.drawerPhoneMax` | 80 % con tope 360 |
| Ancho del panel persistente | `TaoSize.drawerPersistent` | 320 |
| Entrada del panel | `TaoDuration.drawerIn` | 260 ms |
| Aparición del scrim | `TaoDuration.scrimIn` | 180 ms |
| Salida del panel | `TaoDuration.drawerOut` | 200 ms |
| Movimiento reducido | `TaoDuration.reducedFade` | ≤ 120 ms o inmediato |
| Panel persistente desde | `TaoBreakpoint.expandedMin` | 840 de **ancho disponible** |
| Se considera tablet desde | `TaoBreakpoint.mediumMin` | 600 de lado más corto |
| Barra del destino activo | `TaoSize.activeIndicator` | 4 de ancho |

### Color (doc 43 §7 — superficie marfil única)

| Rol | Valor de la maqueta |
|---|---|
| Superficie marfil (encabezado, panel, cuerpo) | `#F7F3EA` |
| Superficie marfil alterna (tarjetas) | `#FBF8F2` |
| Tinta | `#2E2A24` |
| Tinta media | `#5C564C` |
| Tinta suave | `#8A8275` |
| Borde | `#E3DCCD` |
| Acento (barra activa, texto activo) | `#6B5B3E` |
| Fondo tonal del activo | `#EAE0CA` |
| Scrim | `rgba(46,42,36,.48)` |
| Anillo de foco | `#3B6FB5` |
| Error (icono y marca) | `#9B3B32` |

Encabezado, panel y cuerpo comparten la **misma** superficie marfil: no hay elevación de color entre ellos, solo la línea de borde.

---

## 4. Encabezado — `TaoAppHeader`

**Composición**: fila con `align-items:center`, separación de 4 entre controles, padding horizontal 8, línea inferior de 1 en `borde`, fondo marfil. Alto `headerCompact` (64) en teléfono, `headerMedium` (72) en tablet.

**Ranura inicial** (excluyentes entre sí):
- **Volver** — solo cuando hay historial para retroceder. Icono chevron izquierdo, `aria-label` = `nav.back`.
- **Ocultar / mostrar panel** — solo en modo persistente (≥ 840). Reemplaza a la hamburguesa, nunca coexiste con ella. `nav.hide` cuando el panel está visible, `nav.show` cuando está oculto.
- **Nada** — teléfono sin historial (caso 1a): el título empieza al borde.

**Título** — ocupa el espacio flexible, `min-width:0`, una sola línea con elipsis. 17, peso 620, tracking −0.01em. Debajo, opcional, la **línea de contexto** que aporta la vista: 11.5, peso 500, color tinta suave, sin tracking negativo. Ejemplo de la maqueta: título «Detalle de la consulta», contexto «Consultas · folio 4821».

**Ranura final**:
- **Hamburguesa** — siempre al final, en teléfono y en tablet superpuesto. `aria-label` = `nav.open`. Desaparece mientras el panel persistente está visible y reaparece al ocultarlo.
- No hay barra de navegación inferior (DEC-230). La hamburguesa es el único control de navegación en teléfono.

**Botones de icono** (`TaoIconButton`): caja de `touchTarget` (48 × 48), icono de 22 centrado, radio 12, sin fondo en reposo, trazo `currentColor` sobre tinta.

**El shell nunca entra en estado de carga.** El encabezado y el menú están disponibles desde el primer fotograma, independientes de la vista anfitriona.

---

## 5. Panel — `TaoNavDrawer`

### 5.1 Modo superpuesto (teléfono, y tablet con ancho disponible < 840)

- Anclado al **borde inicial**, de arriba a abajo. Ancho **80 % del ancho disponible**, con tope `drawerPhoneMax` 360. En 390 de ancho eso da 312.
- Superficie marfil **opaca** (no translúcida), borde derecho de 1 en `borde`, sombra `2px 0 18px rgba(28,26,23,.18)`.
- Modal: scrim debajo, foco atrapado dentro, `aria-label` = «Navegación principal».
- `overflow:hidden` en el contenedor; el área media se desplaza si el contenido no cabe.

### 5.2 Modo persistente (ancho disponible ≥ `expandedMin` 840)

- Vive **junto** al contenido, no encima: columna fija de `drawerPersistent` 320, contenido a la derecha.
- **Sin scrim, sin sombra, sin modalidad**: no atrapa el foco y no bloquea la vista.
- Cambiar de destino **solo mueve el indicador activo**; el panel no anima (DEC-230).
- Puede ocultarse y mostrarse desde el encabezado; ocultarlo **conserva el destino activo**.

### 5.3 Estructura interna

| Zona | Especificación |
|---|---|
| **Cabecera** | Alto igual al encabezado. Padding `0 6px 0 14px`, línea inferior de 1. Marca «Tao Mangalam» 16/650 con rol «Consultor» debajo en 11/500 tinta suave. A la derecha, el botón cerrar (`nav.close`) — **solo en modo superpuesto**; en persistente no existe. |
| **Cuerpo desplazable** | `flex:1`, `overflow:auto`, padding `8px 8px 0`. Contiene los cuatro destinos principales. |
| **Pie** | Anclado abajo, línea superior de 1, padding 8, fondo marfil. Rótulo «Tu cuenta» y los tres destinos de cuenta. |

El pie está separado por **dos señales**: la línea y el rótulo. La posición anclada es una tercera, prescindible (ver §8).

**Rótulo de grupo** (`TaoGroupCaption`): 10.5, mayúsculas, tracking 0.12em, peso 600, tinta suave, padding `6px 14px 4px`.

---

## 6. Destino — `TaoNavItem`

**Reposo**: fila con icono de 20, separación 12, etiqueta flexible. Alto mínimo `touchTarget` (48), padding `0 12px 0 14px`, radio 12, margen inferior 2. Texto 14.5, peso 500, color tinta media.

**Activo** (REQ-05) — tres señales simultáneas, **ninguna dependiente solo del color**:

1. **Barra lateral** en el borde inicial: ancho `activeIndicator` 4, pegada a la izquierda, con margen vertical de 10 arriba y abajo, radio `0 3px 3px 0`, color acento.
2. **Fondo tonal** `#EAE0CA` en toda la fila.
3. **Peso tipográfico** 700 y texto en color acento.

**Semántica**: `aria-selected="true"` / `Semantics(selected: true)`. El rótulo «Seleccionado» que aparece en la maqueta **representa esa semántica, no es texto visible en el producto** — no lo pintes.

**Foco de teclado**: anillo doble — 2 de la superficie marfil y 4 del color de foco (`box-shadow:0 0 0 2px marfil, 0 0 0 4px foco`). El anillo de foco y la marca de activo son **señales distintas y pueden coincidir** en el mismo elemento (QA-01-08-01), como en la lámina 2b.

### Anuncio del lector de pantalla

> «Biblioteca, seleccionado, elemento 3 de 4, menú de navegación»

El grupo de pie se anuncia como **lista aparte**: «Tu cuenta, 3 elementos».

---

## 7. Apertura, cierre y foco (REQ-02, REQ-03, REQ-04, REQ-07)

### Apertura (solo modo superpuesto)

| Elemento | Duración | Comportamiento |
|---|---|---|
| Panel | `drawerIn` 260 ms | Entra desplazándose desde el borde inicial |
| Scrim | `scrimIn` 180 ms | Aparece fundiendo |

Al terminar la apertura, **el foco pasa al primer destino** de la lista (Inicio), no al botón cerrar.

### Cierre — cuatro vías, un resultado

1. Control de cerrar del panel
2. Toque sobre el scrim
3. Tecla Escape
4. Gesto o acción Atrás del sistema

Las cuatro cierran en `drawerOut` **200 ms** y las cuatro **devuelven el foco al botón hamburguesa** (QA-01-08-02).

### Foco atrapado

Mientras el panel superpuesto está abierto, el ciclo de tabulación es cerrado y en este orden:

```
cerrar → Inicio → Consultas → Biblioteca → Productos → Ajustes → Cuenta → Ayuda → cerrar
```

Tab desde «Ayuda» vuelve al control de cerrar; **no se escapa al contenido de fondo**. En modo persistente **no** hay trampa de foco.

### Movimiento reducido

Con la preferencia activa **no se usan 260 / 200 ms**: fundido de hasta `reducedFade` 120 ms, o cambio inmediato. El panel **no se desplaza**: aparece directamente en su posición final y solo cambia la opacidad (lámina 4b muestra el fotograma intermedio: panel y scrim a opacidad parcial, sin desplazamiento).

---

## 8. Escala de texto 200 % (REQ-03)

Verificado en 360 × 800. Con escala 200 %:

- Todos los destinos siguen **legibles y completos**: el texto escala (≈25) y el alto mínimo de fila crece (≈62), el icono acompaña (≈28).
- **El pie deja de estar anclado** y pasa a ser parte del flujo desplazable, después de los cuatro principales.
- La separación del pie se mantiene con **línea (`group-sep`) y rótulo**, no con posición. Esa es la razón por la que la separación no puede depender solo de que el pie esté abajo.
- El panel se desplaza si el contenido no cabe; la cabecera del panel crece con el texto (marca ≈22, rol ≈15).

---

## 9. Adaptación por tamaño y orientación (REQ-06, REQ-08)

El umbral se evalúa **sobre el ancho disponible de la app, no sobre el tamaño físico del dispositivo** (doc 43 §6). Esto importa en pantalla dividida y multiventana.

| Caso | Ancho disponible | Encabezado | Panel | Control del encabezado |
|---|---|---|---|---|
| Teléfono 390 | 390 | 64 | Superpuesto + scrim | Hamburguesa |
| Tablet vertical 768 | 768 | 72 | Superpuesto + scrim | Hamburguesa |
| Pantalla dividida 839 | 839 | 72 | Superpuesto + scrim | Hamburguesa |
| Tablet horizontal 1024 | 1024 | 72 | Persistente 320, sin scrim | Ocultar / mostrar |

**QA-01-08-04**: al pasar de 840 a 839 el panel cambia a superpuesto y vuelve la hamburguesa; **el destino activo se conserva** (Biblioteca sigue activo).

### Orientación

- **Teléfono** (lado corto < `mediumMin` 600): la app permanece **solo en vertical** aunque el aparato gire. La composición no rota; el panel no se deforma y sigue a 80 % del ancho vertical (QA-01-08-03).
- **Tablet** (lado corto ≥ 600): admite ambas orientaciones. Girar de 768 vertical (superpuesto) a 1024 horizontal (persistente) **conserva el destino activo**.

---

## 10. Destinos de marcador, carga y error (M0)

Los siete destinos llevan a pantallas de marcador. **La carga y el error pertenecen a la vista anfitriona, nunca al panel.**

### Marcador de destino

Centrado vertical y horizontalmente, texto centrado, padding 24:

- Icono del destino en 40, trazo 1.4, color tinta suave, margen inferior 12.
- Título = nombre del destino. 16, peso 650.
- Cuerpo, 13, tinta media, ancho máximo 30ch:
  > Esta sección llega más adelante. Ya puedes navegar hasta aquí desde el menú.

El fondo de familia lo monta HU-01-10; aquí se ve la superficie base.

### Carga de la vista

Esqueletos (tarjetas con líneas) dentro del cuerpo. **El encabezado y el menú no esperan a la vista**: la hamburguesa responde desde el primer fotograma.

### Error de la vista

Centrado, mismo tratamiento que el marcador:

- Icono de alerta circular en 34, trazo 1.5, color de error `#9B3B32`, margen inferior 10.
- Título 15/650: **«No pudimos cargar tus consultas»** (el nombre del destino varía).
- Cuerpo 13, tinta media, 30ch: **«Revisa tu conexión e inténtalo de nuevo. El menú sigue disponible.»**
- Acción **«Reintentar»**: píldora de alto 40, padding horizontal 18, borde 1 en acento, radio completo, texto 13.5 peso 620 en acento.

Sin red, el menú abre y navega igual: la lista de destinos es declarativa y local.

---

## 11. Checklist de verificación (QA-01-08)

- [ ] **QA-01-08-01** — Anillo de foco y marca de activo se distinguen y pueden coincidir en el mismo destino.
- [ ] **QA-01-08-02** — Las cuatro vías de cierre devuelven el foco al botón hamburguesa.
- [ ] **QA-01-08-03** — Teléfono girado: la composición sigue vertical.
- [ ] **QA-01-08-04** — 840 → 839: persistente pasa a superpuesto, vuelve la hamburguesa, el activo se conserva.
- [ ] **QA-01-08-05** — Comparación visual contra la maqueta, acotada por la lista de exclusiones de §0.
- [ ] El activo se reconoce **sin color**: barra + fondo tonal + peso.
- [ ] Ningún color literal ni número mágico en el código: todo por token de §3.
- [ ] Ninguna etiqueta literal en el widget: todo por clave i18n de §2.
- [ ] El panel abre y navega con la red caída.
- [ ] Movimiento reducido: sin desplazamiento, solo fundido ≤ 120 ms.
- [ ] Escala 200 % en 360 × 800: siete destinos legibles, pie en el flujo, separado por línea y rótulo.