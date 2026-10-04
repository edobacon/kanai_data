# Plan inline: Dredd up1 1.1: plan de evolución autónoma

> Vista generada por Kanai desde plan.yaml y log.ndjson. No la edites a mano: se regenera en cada registro.

**Intención:** Una única entrega final 1.1 para Claude Code en macOS, Linux y Windows, con todas las mejoras acordadas y documentación operativa propia. Preservar íntegra la documentación v1 y generar comparación v1/1.1. Planificación actual no inicia implementación, publicación ni cambios de hooks globales.
**Tags:** projects: up1 · repos: up1 · branches: feat/dredd-update · labels: dredd, tooling, autonomo, metricas, investigacion
**Estado:** 0 de 8 fases cerradas. Juez final: pendiente.

## Registro de avance

| Fase | Meta | Estado | Fecha real | Commits | Criterios | Pendiente |
|---|---|---|---|---|---|---|
| F0 Cerrar contexto y contrato 1.1 | Resolver decisiones y fijar aceptación antes de cambios de implementación. | Pendiente | - → - | - | 0/3 | F0.1; F0.2; F0.3 |
| F1 Base portable y operación segura | Helper, sesiones, guard y ejecución aislada coherentes en los tres sistemas. | Pendiente | - → - | - | 0/3 | F1.1; F1.2; F1.3; F1.4 |
| F2 Rigor del protocolo y auditoría de configuración | Contrato autónomo por fases, hallazgos estructurados y veredicto reproducible. | Pendiente | - → - | - | 0/3 | F2.1; F2.2; F2.3; F2.4 |
| F3 Concurrencia, jurado y verificación independiente | Adaptar esfuerzo al riesgo sin perder evidencia ni control del parent. | Pendiente | - → - | - | 0/3 | F3.1; F3.2; F3.3; F3.4 |
| F4 Seguimiento local, pre-envío y revisión del delta | Persistir puntos y cobertura para verificar cierres sin olvidar código no leído. | Pendiente | - → - | - | 0/3 | F4.1; F4.2; F4.3; F4.4 |
| F5 Métricas locales y exportación Markdown | Registrar ejecuciones reales y generar reportes compartibles sin servicios externos. | Pendiente | - → - | - | 0/3 | F5.1; F5.2; F5.3; F5.4 |
| F6 Documentación 1.1 y comparación histórica | Documentar la implementación real de 1.1 y mantener la referencia v1 íntegra. | Pendiente | - → - | - | 0/3 | F6.1; F6.2; F6.3; F6.4 |
| F7 Validación integral de tres sistemas y juez final | Aceptar una única entrega 1.1 con pruebas reales, documentación y auditoría independiente. | Pendiente | - → - | - | 0/4 | F7.1; F7.2; F7.3; F7.4 |

## Riesgos

- Bash/fcntl y runners POSIX no prueban portabilidad Windows.
- Ledger concurrente y guard deben aislar sesiones sin abrir bypass de seguridad.
- Tokens/costo incompletos no se inventan; outcomes no equivalen automáticamente a precisión.
- Decisiones de jurado, Jira local, rúbrica y retención siguen pendientes hasta F0.
- Checkout con cambios ajenos; aislar ejecución sin descartar ni mezclar su trabajo.
- Validación real Linux/Windows requiere ambientes y responsables; un test macOS no los sustituye.

## Fuera de alcance

- Dependencias/referencias a plataformas de gestión o búsqueda excluidas en el producto up1.
- Cambios de funcionalidad o repos de módulos de up1.
- Codex como cliente objetivo; dashboards o servicios de métricas remotos.
- Push, PR, merge, despliegue, comentarios externos o instalación global automática.
- Modificar o reemplazar los documentos históricos v1.
- Ejecutar ahora la implementación o dar por corridas pruebas futuras.

## Fases

### F0. Cerrar contexto y contrato 1.1

**Meta:** Resolver decisiones y fijar aceptación antes de cambios de implementación.
**Responsable sugerido:** Responsable del caso; validación de comandos por el dev
**Esfuerzo:** Estimación inicial de esfuerzo activo: 1–2 días; recalibrar tras F0; no es fecha de entrega.
**Cómo deshacerla:** No aplica: fase de análisis/validación sin cambios de código ni publicación.

**Registro F0** (estado: Pendiente)
- **Fecha real:** inicio - · fin -
- **Antes de empezar:**
  - [ ] F0.P1: El usuario autoriza el plan; documentos base y repos verificados, sin iniciar implementación.
- **Commits:**
  - Sin commits registrados.
- **Qué se hizo:**
  - **F0.1** pendiente: Resolver políticas pendientes
  - **F0.2** pendiente: Definir soporte y arquitectura portable
  - **F0.3** pendiente: Congelar baseline y matriz de aceptación
- **Criterios cumplidos:**
  - **F0.C1** pendiente (manual): Decisiones pendientes resueltas con motivo y responsable; autorización de implementación registrada.
  - **F0.C2** pendiente (evidence): Contrato de interfaces, entornos, rúbrica y matriz de pruebas disponibles en el KB.
  - **F0.C3** pendiente (evidence): Hashes/docs v1 congelados y estrategia para preservar cambios ajenos verificable.
- **No cumplido:**
  - Sin registros.
- **Desvíos del plan:**
  - Sin registros.
- **Hallazgos:**
  - Sin registros.
- **Bloqueos:**
  - Sin registros.
- **Cierre y siguiente paso:** Sin cerrar.

### F1. Base portable y operación segura

**Meta:** Helper, sesiones, guard y ejecución aislada coherentes en los tres sistemas.
**Responsable sugerido:** Responsable del caso; validación de comandos por el dev
**Esfuerzo:** Estimación inicial de esfuerzo activo: 3–5 días; recalibrar tras F0; no es fecha de entrega.
**Cómo deshacerla:** Revertir sólo los commits nuevos de esta fase con git revert en la rama del caso; conservar cambios ajenos, documentación v1 y registros locales. Si cambia formato local, respaldar datos y ofrecer retorno de esquema sin borrar historial.
**Cambia código:** sí (no cierra sin commits registrados)

**Registro F1** (estado: Pendiente)
- **Fecha real:** inicio - · fin -
- **Antes de empezar:**
  - [ ] F1.P1: F0 cerrada con criterios y commits aplicables registrados; autorización de implementación vigente.
- **Commits:**
  - Sin commits registrados.
- **Qué se hizo:**
  - **F1.1** pendiente: Adaptar helper y prefetch
  - **F1.2** pendiente: Aislar estado y progreso
  - **F1.3** pendiente: Resolver guard y verificaciones
  - **F1.4** pendiente: Añadir fixtures de operación
- **Criterios cumplidos:**
  - **F1.C1** pendiente (command): Suite portable registra paginación/HTTP, aislamiento y preservación del checkout.
  - **F1.C2** pendiente (evidence): Matriz OS identifica mecanismos usados, límites y resolución de Python/git.
  - **F1.C3** pendiente (evidence): Guard y runners dejan de contradecirse sin ampliar permisos de red/escritura indiscriminadamente.
- **No cumplido:**
  - Sin registros.
- **Desvíos del plan:**
  - Sin registros.
- **Hallazgos:**
  - Sin registros.
- **Bloqueos:**
  - Sin registros.
- **Cierre y siguiente paso:** Sin cerrar.

### F2. Rigor del protocolo y auditoría de configuración

**Meta:** Contrato autónomo por fases, hallazgos estructurados y veredicto reproducible.
**Responsable sugerido:** Responsable del caso; validación de comandos por el dev
**Esfuerzo:** Estimación inicial de esfuerzo activo: 3–5 días; recalibrar tras F0; no es fecha de entrega.
**Cómo deshacerla:** Revertir sólo los commits nuevos de esta fase con git revert en la rama del caso; conservar cambios ajenos, documentación v1 y registros locales. Si cambia formato local, respaldar datos y ofrecer retorno de esquema sin borrar historial.
**Cambia código:** sí (no cierra sin commits registrados)

**Registro F2** (estado: Pendiente)
- **Fecha real:** inicio - · fin -
- **Antes de empezar:**
  - [ ] F2.P1: F1 cerrada con criterios y commits aplicables registrados; autorización de implementación vigente.
- **Commits:**
  - Sin commits registrados.
- **Qué se hizo:**
  - **F2.1** pendiente: Fragmentar protocolo y formalizar resultados
  - **F2.2** pendiente: Implementar triage y rúbrica
  - **F2.3** pendiente: Auditar configuraciones y layouts
  - **F2.4** pendiente: Validar rigor con casos tabulados
- **Criterios cumplidos:**
  - **F2.C1** pendiente (command): Suite de triage/rúbrica/configuración pasa con escenarios de evidencia y ausencia.
  - **F2.C2** pendiente (evidence): Mapa de fases demuestra preservación de capacidades v1 y autonomía del nuevo protocolo.
  - **F2.C3** pendiente (evidence): Veredicto calculado coincide con fixtures; cada hallazgo incluye mecanismo, ref y fundamento.
- **No cumplido:**
  - Sin registros.
- **Desvíos del plan:**
  - Sin registros.
- **Hallazgos:**
  - Sin registros.
- **Bloqueos:**
  - Sin registros.
- **Cierre y siguiente paso:** Sin cerrar.

### F3. Concurrencia, jurado y verificación independiente

**Meta:** Adaptar esfuerzo al riesgo sin perder evidencia ni control del parent.
**Responsable sugerido:** Responsable del caso; validación de comandos por el dev
**Esfuerzo:** Estimación inicial de esfuerzo activo: 2–4 días; recalibrar tras F0; no es fecha de entrega.
**Cómo deshacerla:** Revertir sólo los commits nuevos de esta fase con git revert en la rama del caso; conservar cambios ajenos, documentación v1 y registros locales. Si cambia formato local, respaldar datos y ofrecer retorno de esquema sin borrar historial.
**Cambia código:** sí (no cierra sin commits registrados)

**Registro F3** (estado: Pendiente)
- **Fecha real:** inicio - · fin -
- **Antes de empezar:**
  - [ ] F3.P1: F2 cerrada con criterios y commits aplicables registrados; autorización de implementación vigente.
- **Commits:**
  - Sin commits registrados.
- **Qué se hizo:**
  - **F3.1** pendiente: Orquestar roles por ejes independientes
  - **F3.2** pendiente: Implementar jurado según F0 y síntesis
  - **F3.3** pendiente: Implementar verificador condicional
  - **F3.4** pendiente: Conservar acciones externas en parent
- **Criterios cumplidos:**
  - **F3.C1** pendiente (command): Suite cubre modelos/roles disponibles, desacuerdo, worker fallido y reverify.
  - **F3.C2** pendiente (evidence): Una revisión amplia comparte prefetch y deduplica sin atribuir cobertura inexistente.
  - **F3.C3** pendiente (evidence): Sin consentimiento no hay publicación ni creación externa; hallazgos refutados recalibran resultado.
- **No cumplido:**
  - Sin registros.
- **Desvíos del plan:**
  - Sin registros.
- **Hallazgos:**
  - Sin registros.
- **Bloqueos:**
  - Sin registros.
- **Cierre y siguiente paso:** Sin cerrar.

### F4. Seguimiento local, pre-envío y revisión del delta

**Meta:** Persistir puntos y cobertura para verificar cierres sin olvidar código no leído.
**Responsable sugerido:** Responsable del caso; validación de comandos por el dev
**Esfuerzo:** Estimación inicial de esfuerzo activo: 3–5 días; recalibrar tras F0; no es fecha de entrega.
**Cómo deshacerla:** Revertir sólo los commits nuevos de esta fase con git revert en la rama del caso; conservar cambios ajenos, documentación v1 y registros locales. Si cambia formato local, respaldar datos y ofrecer retorno de esquema sin borrar historial.
**Cambia código:** sí (no cierra sin commits registrados)

**Registro F4** (estado: Pendiente)
- **Fecha real:** inicio - · fin -
- **Antes de empezar:**
  - [ ] F4.P1: F3 cerrada con criterios y commits aplicables registrados; autorización de implementación vigente.
- **Commits:**
  - Sin commits registrados.
- **Qué se hizo:**
  - **F4.1** pendiente: Diseñar expediente local versionado
  - **F4.2** pendiente: Implementar cálculo git de scope y cobertura
  - **F4.3** pendiente: Integrar rondas y decisiones
  - **F4.4** pendiente: Probar invalidación y conservación de historia
- **Criterios cumplidos:**
  - **F4.C1** pendiente (command): Suite cubre delta, rebase/force-push, blob cambiado, no leídos y cierre verificable.
  - **F4.C2** pendiente (evidence): Expediente y métricas futuras distinguen corrección, decisión y pendiente.
  - **F4.C3** pendiente (evidence): Revisión parcial o archivo ojeado nunca aparecen como cobertura completa.
- **No cumplido:**
  - Sin registros.
- **Desvíos del plan:**
  - Sin registros.
- **Hallazgos:**
  - Sin registros.
- **Bloqueos:**
  - Sin registros.
- **Cierre y siguiente paso:** Sin cerrar.

### F5. Métricas locales y exportación Markdown

**Meta:** Registrar ejecuciones reales y generar reportes compartibles sin servicios externos.
**Responsable sugerido:** Responsable del caso; validación de comandos por el dev
**Esfuerzo:** Estimación inicial de esfuerzo activo: 2–3 días; recalibrar tras F0; no es fecha de entrega.
**Cómo deshacerla:** Revertir sólo los commits nuevos de esta fase con git revert en la rama del caso; conservar cambios ajenos, documentación v1 y registros locales. Si cambia formato local, respaldar datos y ofrecer retorno de esquema sin borrar historial.
**Cambia código:** sí (no cierra sin commits registrados)

**Registro F5** (estado: Pendiente)
- **Fecha real:** inicio - · fin -
- **Antes de empezar:**
  - [ ] F5.P1: F4 cerrada con criterios y commits aplicables registrados; autorización de implementación vigente.
- **Commits:**
  - Sin commits registrados.
- **Qué se hizo:**
  - **F5.1** pendiente: Implementar esquema y captura
  - **F5.2** pendiente: Implementar comando report
  - **F5.3** pendiente: Implementar agregados y outcomes honestos
  - **F5.4** pendiente: Probar y generar muestra anonimizada
- **Criterios cumplidos:**
  - **F5.C1** pendiente (command): Suite de captura/exportación valida nulls, parciales, filtros y anonimización.
  - **F5.C2** pendiente (evidence): El comando genera un .md legible con sección de datos incompletos y muestra reproducible.
  - **F5.C3** pendiente (evidence): Registros/reportes declaran versión 1.1 y no exponen secretos, rutas personales ni código sensible.
- **No cumplido:**
  - Sin registros.
- **Desvíos del plan:**
  - Sin registros.
- **Hallazgos:**
  - Sin registros.
- **Bloqueos:**
  - Sin registros.
- **Cierre y siguiente paso:** Sin cerrar.

### F6. Documentación 1.1 y comparación histórica

**Meta:** Documentar la implementación real de 1.1 y mantener la referencia v1 íntegra.
**Responsable sugerido:** Responsable del caso; validación de comandos por el dev
**Esfuerzo:** Estimación inicial de esfuerzo activo: 1–2 días; recalibrar tras F0; no es fecha de entrega.
**Cómo deshacerla:** No aplica: fase de análisis/validación sin cambios de código ni publicación.

**Registro F6** (estado: Pendiente)
- **Fecha real:** inicio - · fin -
- **Antes de empezar:**
  - [ ] F6.P1: F5 cerrada con criterios y commits aplicables registrados; autorización de implementación vigente.
- **Commits:**
  - Sin commits registrados.
- **Qué se hizo:**
  - **F6.1** pendiente: Crear referencia y guía operativa 1.1
  - **F6.2** pendiente: Crear comparación v1 a 1.1 e índice
  - **F6.3** pendiente: Documentar métricas y trazabilidad
  - **F6.4** pendiente: Verificar preservación y ejemplos
- **Criterios cumplidos:**
  - **F6.C1** pendiente (evidence): Documentos 1.1, comparación e índice presentes con enlaces y ejemplos validados.
  - **F6.C2** pendiente (evidence): Ambos documentos v1 coinciden byte a byte con la línea base 348ea29.
  - **F6.C3** pendiente (evidence): Documentación 1.1 describe sólo comportamientos implementados; diferencias por OS y límites explícitos.
- **No cumplido:**
  - Sin registros.
- **Desvíos del plan:**
  - Sin registros.
- **Hallazgos:**
  - Sin registros.
- **Bloqueos:**
  - Sin registros.
- **Cierre y siguiente paso:** Sin cerrar.

### F7. Validación integral de tres sistemas y juez final

**Meta:** Aceptar una única entrega 1.1 con pruebas reales, documentación y auditoría independiente.
**Responsable sugerido:** Responsable del caso; validación de comandos por el dev
**Esfuerzo:** Estimación inicial de esfuerzo activo: 1–2 días más disponibilidad de ambientes; recalibrar tras F0; no es fecha de entrega.
**Cómo deshacerla:** No aplica: fase de análisis/validación sin cambios de código ni publicación.

**Registro F7** (estado: Pendiente)
- **Fecha real:** inicio - · fin -
- **Antes de empezar:**
  - [ ] F7.P1: F6 cerrada con criterios y commits aplicables registrados; autorización de implementación vigente.
- **Commits:**
  - Sin commits registrados.
- **Qué se hizo:**
  - **F7.1** pendiente: Ejecutar matriz en macOS, Linux y Windows
  - **F7.2** pendiente: Verificar extremo a extremo y regresión
  - **F7.3** pendiente: Preparar paquete único y revisión independiente
  - **F7.4** pendiente: Registrar resultado y correcciones necesarias
- **Criterios cumplidos:**
  - **F7.C1** pendiente (command): Suite se ejecuta en los tres sistemas, con evidencia por OS y sin fallos ocultos.
  - **F7.C2** pendiente (manual): Smoke del cliente en los tres sistemas y revisión del reporte Markdown confirmados por el dev.
  - **F7.C3** pendiente (evidence): Juez final evalúa alcance completo, conservación v1 y evidencias de compatibilidad; resultado registrado.
  - **F7.C4** pendiente (manual): Única entrega 1.1 aceptada con commits, docs y rollback, sin publicar por esta fase.
- **No cumplido:**
  - Sin registros.
- **Desvíos del plan:**
  - Sin registros.
- **Hallazgos:**
  - Sin registros.
- **Bloqueos:**
  - Sin registros.
- **Cierre y siguiente paso:** Sin cerrar.
