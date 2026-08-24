# Escala de esfuerzo y sensibilidad

> Dos ejes independientes para medir un ticket con etiquetas legibles, en vez de story points. Reutilizable para futuras mediciones en up1.
>
> - **Esfuerzo**: cuánto trabajo cuesta (Trivial / Menor / Considerable / Mayor).
> - **Sensibilidad**: cuánto cuidado exige (Baja / Media / Alta).
>
> Son ejes distintos: un cambio puede ser poco trabajo y muy sensible a la vez (ej. eliminar una columna). No mezclar el riesgo con el tamaño.
>
> Fecha: 2026-08-12.

---

## 1. Por qué dos ejes, y no story points

- **Story points** miden esfuerzo relativo (Fibonacci) pero, en la práctica, terminan absorbiendo también el riesgo, y su precisión es ilusoria en los tramos altos.
- Separar **esfuerzo** de **sensibilidad** evita el error de inflar la estimación de un cambio pequeño solo porque es delicado. El tamaño guía la planificación; la sensibilidad guía el cuidado (revisión, consentimiento, coordinación), no el tamaño.
- Las categorías son legibles sin conocer la velocity del equipo y autoexplicativas ("Considerable / Alta" ya comunica el peso).

---

## 2. Eje ESFUERZO

Cuánto trabajo cuesta. El techo de un ticket es **Mayor**: si algo sería más grande, se divide (sección 4).

| Categoría | Definición | SP equivalente |
|---|---|---|
| **Trivial** | Cambio localizado, sin incertidumbre ni efecto colateral | 1 |
| **Menor** | Un artefacto de alcance claro, el "cómo" es evidente, se testea directo | 2 – 3 |
| **Considerable** | Varios artefactos o cruza mods; algún comportamiento cambia; exige pruebas cuidadas | 5 |
| **Mayor** | Reescritura grande o "cómo" con incertidumbre real. **Es el máximo de un ticket** | 8 – 13 |

### Dimensiones para clasificar el esfuerzo

Se mira dónde cae el ticket en cada dimensión; **la más alta manda**. El **riesgo no está aquí**: va en el eje de sensibilidad.

1. **Superficie**: cuántos artefactos y mods toca (1 archivo → varios cross-mod).
2. **Incertidumbre**: qué tan claro está el "cómo" (evidente → hay que investigar o hacer spike).
3. **Impacto colateral**: cuántos consumidores hay que reapuntar (ninguno → resolvers / algoritmo / seeds).
4. **Verificación**: unit directo → integración contra BD real + smoke real.

**Desempate**: ante la duda entre dos categorías, gana la de mayor **incertidumbre** o **impacto colateral**.

---

## 3. Eje SENSIBILIDAD

Cuánto cuidado exige, independiente del tamaño. Guía revisión, consentimiento y coordinación, no la estimación de trabajo.

| Nivel | Definición | Señales |
|---|---|---|
| **Baja** | Aditivo y reversible, sin coordinación externa | Objeto/campo nuevo nullable, catálogo, layout |
| **Media** | Cambia un comportamiento que otros consumen, o toca un objeto core muy usado | Derivación que el algoritmo lee, cambio de payload, objeto compartido |
| **Alta** | Destructivo o irreversible; requiere consentimiento por tenant y coordinación con core | Drop de columnas, borrado de datos, migración con backfill |

### Cómo maneja la plataforma un cambio de Sensibilidad Alta

En up1 (schema-driven) un drop no es "mucho código": el modelo vive en JSON en el mod, `codegen` regenera el schema y **el `sync` genera y aplica la migración/drop por tenant**; luego se **coordina con core** para que actualicen su modelo. Es más trabajo que una adición (backfill del dato viejo, consentimiento por tenant, handoff a core), pero acotado: el drop mecánico lo hace la plataforma, no se codea a mano. Por eso un drop suele ser **Esfuerzo Menor / Sensibilidad Alta**, no un ticket grande.

---

## 4. Regla de división (techo en Mayor)

**Mayor es el máximo de esfuerzo de un ticket.** Un ticket solo se deja en Mayor cuando es **atómico** (no separable en partes con valor propio).

Se divide por dos motivos distintos:

- **Por esfuerzo**: un "Mayor" separable se parte para que ninguna pieza quede en el techo.
- **Por sensibilidad**: aunque las partes sean de poco esfuerzo, conviene aislar lo de **Sensibilidad Alta** del resto, para desplegar y verificar lo aditivo antes de tocar lo destructivo o irreversible.

Patrón típico: separar la parte **aditiva** (se despliega y verifica primero) de la parte **destructiva o de cambio de comportamiento** (se aplica después, sobre algo ya probado).

Ejemplos aplicados en este proyecto:
- Reformular un objeto con drop: dividir en "derivación aditiva" (Considerable / Baja) + "drop + migración" (Menor / **Alta**). Se divide por **sensibilidad**, no por tamaño.
- Reescribir un seed grande con cambio de loader: "extender el loader" (Considerable) + "reescribir datos + tests" (Menor).
- Agregar FKs + derivar comportamiento: "FKs aditivas" (Menor / Baja) + "derivación en resolver" (Considerable / Media).

---

## 5. Cómo usarla

1. Clasificar el **esfuerzo** por sus 4 dimensiones (la más alta manda).
2. Clasificar la **sensibilidad** (¿aditivo, cambia comportamiento consumido, o destructivo?).
3. Si el esfuerzo es **Mayor** o la sensibilidad es **Alta**, evaluar dividir (sección 4).
4. Anotar en el ticket ambos ejes: `Esfuerzo: <categoría> · Sensibilidad: <nivel>`, con la razón cuando ayude, ej.: `Esfuerzo: Menor · Sensibilidad: Alta (drop destructivo, coordinación core)`.

La clasificación se hace sobre el ticket ya acotado, no sobre la idea original: acotar y dividir es parte de estimar.
