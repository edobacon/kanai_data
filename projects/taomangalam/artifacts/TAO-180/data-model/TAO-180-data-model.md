# Modelo de datos — HU-01-15 (TAO-180): Auditoría y pruebas automáticas de accesibilidad

## 0. Veredicto de alcance

**Esta historia no introduce entidades persistentes en la base de datos de la app.** Es una historia de infraestructura de testing, CI y auditoría manual: sus "entidades" son modelos **en memoria** (objetos de resultado de las pruebas) y **artefactos versionados** (informe de auditoría en el repo, reporte de CI como artifact). El único modelo de dominio que toca es de **lectura**: los tokens del tema (`TaoStrokes.focus`) y el registro de componentes de Widgetbook, ambos **existentes**.

Se documenta igualmente el modelo completo de objetos porque REQ-01 y REQ-08 exigen una **firma pública estable** que otras épicas adoptarán sin cambios: esa firma es, en los hechos, el contrato de datos de la historia.

| Capa | Persistencia | Estado |
|---|---|---|
| Objetos de resultado de accesibilidad (Dart, en memoria) | ninguna | **NUEVO** |
| Configuración de la suite (viewports, escalas) | constantes compiladas | **NUEVO** |
| Informe de auditoría manual (markdown + front matter) | archivo en repo | **NUEVO** |
| Reporte de CI (JSON) | artifact de CI, efímero | **NUEVO** |
| Tokens del tema (`TaoStrokes`, `TaoColors`) | compilado | **EXISTENTE** (solo lectura) |
| Registro de Widgetbook (`WidgetbookComponent`) | compilado | **EXISTENTE** (solo lectura) |
| Esquema SQLite / Drift de la app | — | **SIN CAMBIOS** |

---

## 1. Entidades en memoria (biblioteca de pruebas)

Ubicación propuesta: `test/support/a11y/` (paquete interno del repo de la app), exportado por un único barrel `a11y_harness.dart` para que la firma pública sea un solo punto de import.

### 1.1 `A11yGuideline` — **NUEVO** (enum)

Identifica la guía de Flutter evaluada. Es el eje de agregación del reporte y lo que REQ-01 exige nombrar al fallar.

| Valor | Semántica | Umbral |
|---|---|---|
| `androidTapTarget` | `androidTapTargetGuideline` | 48 × 48 dp |
| `iosTapTarget` | `iOSTapTargetGuideline` | 44 × 44 dp |
| `labeledTapTarget` | `labeledTapTargetGuideline` | etiqueta semántica no vacía |
| `textContrast` | `textContrastGuideline` | AA: 4.5:1 normal, 3:1 grande |
| `focusOrder` | orden de foco = orden visual | — (REQ-04) |
| `focusRingThickness` | grosor = `TaoStrokes.focus` | token, sin literal |
| `focusTrap` | modal atrapa y devuelve el foco | — |
| `modalAnnounced` | modal anuncia su título | — |
| `noOverflow` | sin desbordes ni acciones ocultas | — (REQ-03) |

Notas:
- Los primeros cuatro valores **mapean 1:1** a las `AccessibilityGuideline` que provee `flutter_test`; los restantes son guías propias implementadas sobre el mismo contrato (`AccessibilityGuideline.evaluate`), para que la utilidad tenga una sola superficie.
- `focusRingThickness` **no** almacena el valor `3`: lo lee de `TaoStrokes.focus` en `theme_tokens.dart` (REQ-08). El enum nombra la guía, no el número.
- **Enum cerrado y aditivo**: agregar valores es compatible; renombrar o quitar rompe a los consumidores de otras épicas. Ver §6.

### 1.2 `A11ySeverity` — **NUEVO** (enum)

| Valor | Efecto en CI | Uso |
|---|---|---|
| `blocking` | falla el job | incumplimiento de guía automatizada; hallazgo manual bloqueante |
| `nonBlocking` | reporta, no falla | hallazgo manual menor, deuda registrada como issue |

Default al construir una violación automática: `blocking`. Los `nonBlocking` solo se originan en la auditoría manual (§3) o en una supresión explícita con issue enlazado.

### 1.3 `A11yViewport` — **NUEVO** (value object inmutable)

| Campo | Tipo | Oblig. | Default | Notas |
|---|---|---|---|---|
| `name` | `String` | sí | — | clave estable del caso de test; debe ser único dentro de `A11ySuiteConfig.viewports` |
| `size` | `Size` | sí | — | en píxeles lógicos |
| `devicePixelRatio` | `double` | no | `1.0` | |
| `orientation` | `A11yOrientation` (enum: `portrait`, `landscape`) | no | derivado de `size` | el requisito transversal pide ambas orientaciones |

Constantes provistas (**NUEVO**): `A11yViewport.phone` (390 × 844, cubre QA-01-15-01), `A11yViewport.phoneLandscape`, `A11yViewport.tablet`, `A11yViewport.tabletLandscape`. Sin magic numbers en los tests: los tests referencian las constantes.

### 1.4 `A11yTextScale` — **NUEVO** (value object)

| Campo | Tipo | Oblig. | Default | Notas |
|---|---|---|---|---|
| `label` | `String` | sí | — | `'100%'`, `'200%'`; entra en el nombre del caso |
| `factor` | `double` | sí | — | se aplica vía `MediaQuery.textScaler` (`TextScaler.linear`), no el deprecado `textScaleFactor` |

Constantes: `A11yTextScale.base` (1.0) y `A11yTextScale.double` (2.0). REQ-02 y REQ-03 exigen exactamente estas dos.

### 1.5 `A11ySuiteConfig` — **NUEVO** (value object)

Controla la matriz de ejecución. Es el parámetro que REQ-02 obliga a mantener **acotado**.

| Campo | Tipo | Oblig. | Default | Notas |
|---|---|---|---|---|
| `guidelines` | `Set<A11yGuideline>` | no | las cuatro automatizadas de Flutter | subconjunto explícito por caso |
| `viewports` | `List<A11yViewport>` | no | `[phone, tablet]` | nombres únicos (invariante validada en el constructor) |
| `textScales` | `List<A11yTextScale>` | no | `[base, double]` | |
| `caseTimeout` | `Duration` | no | `Duration(seconds: 30)` | REQ-02: timeout **por caso** |
| `suppressions` | `List<A11ySuppression>` | no | `const []` | ver 1.6 |

**Invariante de cardinalidad (REQ-02).** El recorrido es `componentes × viewports × textScales` resuelto como **un caso de test por entrada del registro**, que internamente itera la matriz de 4 combinaciones y acumula violaciones. No se anidan `testWidgets` por combinación ni se generan casos por producto cartesiano completo: con N componentes se crean N casos, no 4N. Esto mantiene el tiempo del job acotado y el reporte legible.

### 1.6 `A11ySuppression` — **NUEVO** (value object)

Permite el rollback declarado en el handoff ("desactivar solo la regla que cause errores tras registrar el defecto") sin borrar pruebas.

| Campo | Tipo | Oblig. | Default | Notas |
|---|---|---|---|---|
| `guideline` | `A11yGuideline` | sí | — | |
| `targetKey` | `String` | sí | — | id del componente o de la entrada de Widgetbook |
| `issueUrl` | `Uri` | **sí** | — | **sin issue no hay supresión**: el constructor lo exige |
| `reason` | `String` | sí | — | texto libre, en español |
| `expiresOn` | `DateTime?` | no | `null` | si vence, la suite vuelve a fallar |

Una supresión convierte la violación en `nonBlocking` y la deja visible en el reporte. **No la oculta.**

### 1.7 `A11yViolation` — **NUEVO** (value object)

Unidad atómica del reporte. Un fallo de test se construye concatenando estas.

| Campo | Tipo | Oblig. | Default | Notas |
|---|---|---|---|---|
| `guideline` | `A11yGuideline` | sí | — | REQ-01: el mensaje de fallo **nombra la guía** |
| `severity` | `A11ySeverity` | sí | `blocking` | degradada a `nonBlocking` si hay supresión vigente |
| `targetKey` | `String` | sí | — | componente / entrada de Widgetbook |
| `viewport` | `String` | sí | — | `A11yViewport.name` |
| `textScale` | `String` | sí | — | `A11yTextScale.label` |
| `message` | `String` | sí | — | descripción accionable, en español |
| `measured` | `String?` | no | `null` | p.ej. `'40.0 × 40.0'`, `'3.1:1'` |
| `expected` | `String?` | no | `null` | p.ej. `'48.0 × 48.0'`, `'4.5:1'` |
| `suppressionIssue` | `Uri?` | no | `null` | presente solo si fue suprimida |

`measured` / `expected` como `String` y no como tipos numéricos: la misma estructura describe tamaños, ratios de contraste y grosores de trazo. Tipar cada caso exigiría una jerarquía de subclases cuyo único consumidor es el formateo del mensaje; no se justifica.

### 1.8 `A11yCaseResult` — **NUEVO**

| Campo | Tipo | Oblig. | Default |
|---|---|---|---|
| `caseName` | `String` | sí | — |
| `targetKey` | `String` | sí | — |
| `violations` | `List<A11yViolation>` | sí | `const []` |
| `duration` | `Duration` | sí | — |
| `timedOut` | `bool` | sí | `false` |

Derivado: `passed => violations.where(blocking).isEmpty && !timedOut`.

### 1.9 `A11yRunReport` — **NUEVO** (agregado raíz del reporte)

| Campo | Tipo | Oblig. | Default | Notas |
|---|---|---|---|---|
| `schemaVersion` | `int` | sí | `1` | versiona el JSON del artifact |
| `generatedAt` | `DateTime` | sí | — | UTC |
| `commitSha` | `String` | sí | — | de la variable de entorno de CI |
| `cases` | `List<A11yCaseResult>` | sí | — | |
| `config` | `A11ySuiteConfig` | sí | — | serializada para trazar qué matriz corrió |

Derivados: `blockingCount`, `nonBlockingCount`, `byGuideline: Map<A11yGuideline, int>`.

### 1.10 Firma pública estable (REQ-01, REQ-08)

```dart
Future<void> expectA11y(
  WidgetTester tester, {
  required Widget widget,
  String? targetKey,
  A11ySuiteConfig config = const A11ySuiteConfig(),
});
```

Un único punto de entrada; todo lo demás viaja en `A11ySuiteConfig` con defaults. Es la forma que hace **aditivos** los cambios futuros (un campo nuevo con default no rompe a ningún consumidor), que es exactamente lo que pide el requisito de compatibilidad. La alternativa de parámetros nombrados sueltos se descarta: cada guía nueva obligaría a tocar la firma y, con eso, a todas las épicas que ya la adoptaron.

El helper reusa `ensureSemantics` del patrón de tests actuales en vez de abrir su propio `SemanticsHandle` (REQ-08).

---

## 2. Entidades existentes consumidas (solo lectura)

| Entidad | Origen | Uso | Cambios |
|---|---|---|---|
| `TaoStrokes.focus` | `theme_tokens.dart` | umbral de `focusRingThickness` | **ninguno**. El literal `3` queda prohibido en la suite; lo vigila `tool/check_design_literals.dart` |
| `TaoColors` / `ColorScheme` | tema | color esperado del anillo de foco y fondos para contraste | ninguno |
| `WidgetbookComponent` / `WidgetbookUseCase` | registro de HU-01-03 a HU-01-05 | fuente de la lista de componentes a recorrer | **ninguno en el esquema**. REQ-05 sí exige que una entrada sin etiqueta semántica falle |

**Dependencia de enumeración.** REQ-02 pide recorrer "los componentes registrados en Widgetbook". Si ese registro no expone hoy una lista enumerable en tiempo de test (por ejemplo, porque solo se arma dentro del `WidgetbookApp`), hace falta extraer esa colección a una constante compartida que consuman tanto Widgetbook como la suite. **Es el único cambio estructural que esta historia puede necesitar sobre código existente**, y afecta a HU-01-03/04/05. Se asume que la extracción es viable y de bajo costo; si el registro resultara no enumerable, la alternativa es un registro paralelo en la suite, con el riesgo conocido de divergir del real y de que REQ-05 deje de detectar componentes nuevos.

---

## 3. Artefacto persistido: informe de auditoría manual — **NUEVO**

REQ-06 pide un informe con hallazgos clasificados, issue enlazado y cierre sin bloqueantes. Va **versionado en el repo**, no en base de datos: es documentación de un momento, se revisa en PR y debe sobrevivir a la retención de artifacts de CI.

Ruta: `docs/accessibility/audit-ep-01.md`, con front matter YAML parseable para el gate de documentación.

### 3.1 Cabecera

| Campo | Tipo | Oblig. | Default | Notas |
|---|---|---|---|---|
| `auditId` | `string` | sí | — | `AUD-EP-01` |
| `epic` | `string` | sí | — | `EP-01` |
| `auditedAt` | `date` | sí | — | ISO 8601 |
| `tools` | `string[]` | sí | — | `['TalkBack', 'VoiceOver']` |
| `devices` | `string[]` | sí | — | Android, iPhone, iPad |
| `scope` | `string[]` | sí | — | `['shell', 'V-31', 'V-51', 'Ajustes']` |
| `status` | enum `open` \| `closed` | sí | `open` | `closed` exige cero `blocking` abiertos |

### 3.2 Hallazgo (`findings[]`)

| Campo | Tipo | Oblig. | Default | Notas |
|---|---|---|---|---|
| `id` | `string` | sí (PK) | — | `AUD-EP-01-001`, correlativo |
| `surface` | `string` | sí | — | shell / V-31 / V-51 / Ajustes |
| `guideline` | enum `A11yGuideline` \| `manualOnly` | sí | — | reusa el enum de §1.1 para que el informe agregue por la misma dimensión que el reporte automático |
| `severity` | enum `A11ySeverity` | sí | — | `blocking` / `nonBlocking` |
| `ownerEpic` | `string` | sí | `EP-01` | si ≠ `EP-01`, el hallazgo se resuelve fuera de esta historia |
| `issueUrl` | `uri` | **sí** | — | REQ-06: todo hallazgo tiene issue |
| `status` | enum `open` \| `fixed` \| `linked` \| `wontFix` | sí | `open` | `linked` = delegado a otra épica |
| `description` | `string` | sí | — | español |
| `evidence` | `string?` | no | `null` | captura o grabación |

**Invariantes de cierre (criterio de aceptación).**
1. Todo `findings[]` tiene `issueUrl` no vacío.
2. No existe hallazgo con `severity == blocking && ownerEpic == 'EP-01' && status == 'open'`.
3. `status: closed` en la cabecera solo si se cumple (2).

Estas tres se verifican en el gate de documentación (REQ-07), no a mano: un informe mal formado o con un bloqueante abierto falla el job. Es lo que convierte al criterio "ningún bloqueante queda abierto" en algo comprobable en vez de declarativo.

**QA-01-15-03** (etiqueta de estado que solo se distingue por color) se registra como `guideline: manualOnly`, `severity: blocking` — es exactamente el caso que la suite automática **no** detecta, porque el contraste pasa y lo que falla es la ausencia de un segundo canal de información.

---

## 4. Artefacto efímero: reporte de CI — **NUEVO**

REQ-05 pide publicar el reporte como artifact. Serialización de `A11yRunReport` (§1.9).

Ruta de salida: `build/reports/a11y/report.json` (+ `report.md` legible en el resumen del job).

```jsonc
{
  "schemaVersion": 1,
  "generatedAt": "2026-10-03T12:00:00Z",
  "commitSha": "…",
  "summary": { "cases": 42, "blocking": 0, "nonBlocking": 2,
               "byGuideline": { "androidTapTarget": 0, "labeledTapTarget": 2 } },
  "config": { "viewports": ["phone", "tablet"], "textScales": ["100%", "200%"],
              "caseTimeoutMs": 30000 },
  "cases": [
    { "caseName": "TaoButton · primary", "targetKey": "TaoButton/primary",
      "duration": 1200, "timedOut": false,
      "violations": [
        { "guideline": "labeledTapTarget", "severity": "nonBlocking",
          "viewport": "phone", "textScale": "200%",
          "message": "El control no expone etiqueta semántica.",
          "measured": "\"\"", "expected": "etiqueta no vacía",
          "suppressionIssue": "https://github.com/edobacon/taomangalam/issues/123" }
      ] }
  ]
}
```

`schemaVersion` existe porque el artifact lo consumirán jobs y posiblemente un panel; sin versión, cualquier cambio de forma rompe silenciosamente a quien lo lea. Es un entero, y se incrementa solo ante cambios no retrocompatibles.

`duration` en milisegundos como entero: JSON no tiene tipo duración y los `ISO-8601 duration` obligan a parsear en el consumidor sin aportar nada.

---

## 5. Índices y relaciones

**No hay índices de base de datos**: no hay tablas. Se consignan las claves y relaciones lógicas que sí deben sostenerse:

| Clave / relación | Dónde se sostiene |
|---|---|
| `A11yViewport.name` único dentro de `A11ySuiteConfig.viewports` | assert en el constructor |
| `A11yCaseResult.caseName` único dentro de `A11yRunReport.cases` | garantizado por "un caso por entrada del registro" |
| `AuditFinding.id` único y correlativo | validación del gate de docs |
| `A11yViolation.targetKey` → entrada del registro de Widgetbook | referencia por string, **no verificada en compilación**; un `targetKey` obsoleto deja una violación huérfana en el reporte. Mitigación: el `targetKey` lo emite la propia suite al recorrer el registro, nunca se escribe a mano |
| `A11ySuppression.(guideline, targetKey)` → `A11yViolation` | matcheo en runtime; una supresión que no matchea nada es ruido. Se recomienda que la suite **avise** de supresiones sin uso, señal de que el bug ya se arregló y la supresión sobra |
| `AuditFinding.guideline` ↔ `A11yGuideline` | enum compartido: el informe manual y el reporte automático agregan por la misma dimensión |

**Relación conceptual** (sin FK físicas):

```
A11ySuiteConfig ─1:N→ A11yViewport
                ─1:N→ A11yTextScale
                ─1:N→ A11ySuppression ──(guideline,targetKey)──┐
                                                               │ degrada severity
A11yRunReport ─1:N→ A11yCaseResult ─1:N→ A11yViolation ←───────┘
                                              │ guideline
AuditReport ─1:N→ AuditFinding ───────────────┘ (enum compartido)
```

---

## 6. Notas de migración

**No hay migración de base de datos.** No se crean, alteran ni eliminan tablas; el esquema de la app queda intacto. Lo que sí requiere cuidado de versionado:

1. **Estabilidad de la firma pública (REQ-08).** `expectA11y` y `A11ySuiteConfig` son contrato para todas las épicas. Regla: **solo cambios aditivos** — campos nuevos siempre con default, valores nuevos de enum al final. Renombrar un valor de `A11yGuideline` o quitar un parámetro es un cambio rompedor que obliga a tocar cada épica que ya lo adoptó. Si llega a ser inevitable, se hace con deprecación en un ciclo, no de un salto.

2. **`schemaVersion` del reporte JSON.** Arranca en `1`. Se incrementa solo ante cambio no retrocompatible (quitar o resignificar un campo); agregar campos no lo incrementa.

3. **Adopción incremental.** La suite se aplica primero a los componentes de HU-01-03/04/05, después al shell (HU-01-08, que es su bloqueante) y a las plantillas (HU-01-10). Cada tramo entra como job verde. **No se mergea la utilidad con hallazgos bloqueantes abiertos y sin supresión con issue**: eso dejaría CI rojo para todo el equipo.

4. **Prohibición de literales (REQ-08).** `tool/check_design_literals.dart` debe cubrir también `test/support/a11y/`. Si su alcance actual está acotado a `lib/`, hay que ampliarlo — es un cambio de configuración de la herramienta, no de su lógica, pero conviene verificarlo antes de dar REQ-08 por cumplido.

5. **Retención del artifact vs. el informe.** El reporte de CI es efímero (retención del proveedor). El informe de auditoría es permanente y versionado. No confundirlos: el criterio de aceptación de cierre se verifica contra el **informe**, nunca contra un artifact que puede haber expirado.

6. **Costo en tiempo de CI.** Con la matriz acotada de §1.5 el crecimiento es lineal en cantidad de componentes. Si el job se vuelve lento, la palanca correcta es reducir `viewports`/`textScales` para los componentes triviales vía `A11ySuiteConfig` por caso, **no** quitar guías: quitar una guía apaga la detección para todos.

---

## 7. Riesgos del modelo

| Riesgo | Dónde | Por qué | Mitigación |
|---|---|---|---|
| Supresiones que se vuelven permanentes | `A11ySuppression` | un `expiresOn: null` nunca caduca y la deuda se naturaliza | avisar de supresiones sin uso; considerar exigir `expiresOn` si la lista crece |
| Registro de Widgetbook no enumerable en test | §2 | REQ-02 y REQ-05 dependen de recorrer el registro real | extraer la colección a constante compartida; registro paralelo solo como último recurso, con riesgo de divergencia |
| `targetKey` como string libre | §5 | sin verificación en compilación, una violación puede referenciar algo inexistente | emitirlo siempre desde el recorrido del registro, nunca a mano |
| El informe manual queda desactualizado | §3 | es un documento, no un chequeo continuo | el gate de docs valida invariantes; `auditedAt` expone la antigüedad |
| Cobertura falsa de accesibilidad | transversal | las cuatro guías automáticas **no** detectan color como único canal (QA-01-15-03), orden de lectura confuso ni etiquetas presentes pero inútiles | la auditoría manual es parte del criterio de cierre, no un complemento opcional; el modelo lo refleja con `guideline: manualOnly` |