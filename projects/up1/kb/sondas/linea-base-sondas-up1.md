---
id: DOC-kb-sondas-linea-base-sondas-up1
project: up1
type: doc
tags:
  - sondas
  - metricas
  - intake
  - linea-base
---

# Línea base del sistema de sondas del intake (up1)

Este documento fija el **"antes"** del sistema de sondas del intake en up1. Sirve para medir, con los mismos criterios, cuánto ahorra y qué tan bien anticipa el sistema una vez activo. Los datos salen de Kanai (resumen de ejecución y métricas de intake por ticket), de las métricas de kn-dredd del KB (`kn-dredd-metrics/`) y del análisis de hallazgos tardíos del 2026-09-25.

## En una frase

Antes de las sondas, los tickets de up1 revisados (143, 145 y 149 a 152) consumieron **al menos 14,6M de tokens en Kanai y 8,0M más en revisiones de kn-dredd**. Tuvieron **~45 hallazgos tardíos** que cambiaron código, y la mitad eran detectables en el intake.

## Glosario

- **Hallazgo tardío**: un problema que obligó a cambiar código o comportamiento y apareció después del intake: en un gate, en kn-dredd, en arbiter, en la revisión del dev o como adenda post-cierre.
- **Sonda**: una receta determinista que lee el código base antes de planificar y levanta una tarjeta de decisión. No usa LLM.
- **Categoría de sonda**: el tipo de riesgo que cubre una sonda. Son 8: vías de escritura, ciclo de vida del padre, perfil x operación, unicidad, reemplazo total, consumidores cruzados, forma de entrada y coherencia de referencias. Todo lo demás es "sin sonda".
- **Cota inferior**: los tokens de Kanai no incluyen la conversación del host (el agente que orquesta) y algunas corridas no registraron tokens. El costo real es mayor que el que figura aquí.

## Costo por ticket (Kanai)

| Ticket | Jira | Corridas | Gates | Rondas de refine | Interacciones | Tokens Kanai |
|---|---|---|---|---|---|---|
| 143 | UPONE-1756 | 91 | 32 | 14 | 197 | 3,31M |
| 145 | UPONE-1757 | 29 | 8 | 1 | 116 | 1,95M |
| 149 | UPONE-1770 | 78 | 29 | 10 | 193 | 2,50M |
| 150 | UPONE-1770 (D1) | 41 | 12 | 13 | 59 | 3,30M |
| 151 | UPONE-1770 | 30 | 11 | 10 | 50 | 3,09M |
| 152 | UPONE-1770 | 10 | 3 | 0 | 19 | 0,42M |
| **Total** | | **279** | **95** | **48** | **634** | **14,57M** |

Cobertura de la telemetría: 143 registró tokens en 21 de 51 corridas de intake y 149 en 24 de 40. Por eso los totales son cota inferior.

## Costo de revisión (kn-dredd)

| Ticket | Corridas | Tokens | Veredictos |
|---|---|---|---|
| 143 | 0 (sin métrica del PR) | 0 | |
| 145 | 1 | 0,53M | iterar |
| 149 (pre-cierre y cm #41 r1, r2) | 3 | 3,03M | iterar, iterar, aprobable con nits |
| 150 (D1 r1, r2 y cd #67) | 3 | 3,36M | iterar, aprobable con nits, iterar |
| 151 | 1 | 1,10M | aprobable con reservas |
| **Total** | **8** | **8,02M** | |

Fuera de Kanai, UPONE-1899 (cm #42) sumó 3 corridas y 3,74M, las tres rechazadas.

Una corrida completa de kn-dredd cuesta entre 0,8M y 1,3M de tokens y tarda entre 12 y 25 minutos. **Cada hallazgo tardío que obliga a corregir suele pagar una segunda corrida.** En la familia 1770, las re-revisiones (D1 r2 y cm #41 r2) sumaron 1,72M.

## Hallazgos tardíos

- **~45** hallazgos tardíos cambiaron código o comportamiento.
- **Dónde eran detectables:**
  - En el intake: ~22.
  - En el gate de sesión: ~16.
  - En el juez de spec: ~3.
  - Solo después, con información nueva: ~4.
- **Por categoría:**
  - Variantes de entrada: 10.
  - UX y flujos secundarios: 9.
  - Permisos: 7.
  - Integridad de datos: 6.
  - Concurrencia: 6.
  - Contrato entre mods: 4.
  - Seguridad: 4.
  - Ciclo de vida: 3.
  - Conversión de mecanismo: 2.
  - Documentación: 5.
  - Otros: 3.
- **Señal del gate:** de 70 filas de hallazgos en gates, solo el 10% fue funcional. El resto fue cobertura 0% del sandbox (21%), recordatorios de fidelidad (21%) y problemas del registro de evidencia (47%).
- **Preguntas abiertas:** 0 registradas en Kanai en los 6 tickets.

## Qué habrían anticipado las sondas (backtest)

Prototipo de 8 sondas corrido sobre el código base previo a cada ticket (149, 150, 152 y UPONE-1899):

- **Recall:** 14 de 23 hallazgos tardíos anticipados y 2 más a medias (61%, o 70% contando los parciales).
- **Utilidad:** 19 tarjetas, de las cuales ~79% corresponden a un problema real.
- **Costo:** entre 1,7 y 4,4 segundos por caso y 0 tokens.
- **Anticipos clave:**
  - Todo TICKET-151 (plan publicado en solo lectura).
  - El perfil Diseñador sin permiso de guardar.
  - Retirar y volver a agregar el mismo par (unicidad).
  - Borrar lo que otro guardó (reemplazo total).
  - El bulk del core que publica sin pasar por el guard.
  - La deriva del formato del peso entre cm y cd.
  - Número contra texto (origen de 152).
  - El S0 de UPONE-1899 (el nivel de la rúbrica debe pertenecer a la escala de la matriz).
- **Fuera del alcance de una sonda estática:**
  - Invariantes de grupo en operaciones compuestas.
  - Datos vigentes o legados.
  - Carreras (TOCTOU).
  - Contenido del historial.
  - Maqueta.
  - Permiso de lectura de una query cruzada.

## Cómo se va a medir el "después"

Las mismas métricas, por ticket y por cohorte (con sondas contra esta línea base):

1. **Eficacia.** De los hallazgos tardíos de kn-dredd que clasifica kn-tassadar por sonda (evaluaciones en `sondas/evaluacion-*.json`), qué parte cae en una categoría con sonda, y de esa parte:
   - cuántos tenían tarjeta y se respetó (**cubierto**);
   - cuántos tenían tarjeta y la decisión no se implementó (**tarjeta ignorada**);
   - cuántos no tenían tarjeta (**hueco de la sonda**).
2. **Eficiencia.**
   - Tarjetas por ticket.
   - Porcentaje útil: terminó en variante o pregunta, frente a "irrelevante".
   - Tiempo en responderlas.
   - Decisiones reutilizadas de tickets anteriores.
   - Milisegundos de corrida.
3. **Ahorro de tokens** (estimación, con dos lecturas):
   - **Por hallazgo evitado:** un hallazgo cubierto por tarjeta evita, en promedio, la corrección y la re-revisión que costó en esta línea base. Referencia: una re-revisión de kn-dredd cuesta entre 0,8M y 0,9M.
   - **Por cohorte:** tokens por ticket, gates por ticket, rondas de refine, rondas de kn-dredd por PR y adendas post-cierre, contra esta tabla.

   Con pocos tickets el ruido es alto: la lectura por cohorte se reporta con su tamaño de muestra y no como ahorro garantizado.

## Límites de esta línea base

- Los tokens de Kanai son cota inferior (telemetría incompleta y sin el host).
- La clasificación de hallazgos tardíos y el recall del backtest son juicio manual sobre la evidencia citada, no una métrica automática.
- Los pedidos del backtest se resumieron a mano; en Kanai los extraerá el intake.
