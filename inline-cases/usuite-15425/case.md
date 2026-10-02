# Caso inline: USUITE-15425: logs de autenticación seguros y siempre visibles

> Vista generada por Kanai desde case.yaml, el KB y el plan. No la edites a mano.

**Objetivo:** Que ningún log del módulo de autenticación exponga contraseñas, claves o tokens, conservando la utilidad de los logs para soporte (quién inició sesión, cuándo y con qué resultado), con una solución configurable que funcione en cualquier ambiente aunque no tenga configuración.
**Tags:** repos: user-api, sandbox-api · tickets: USUITE-15425 · labels: suite-legacy
**Etapa:** ejecucion

## Falta

- Nada que bloquee.

## Avisos

- Sin avisos.

## Repos

| Repo | Ruta local | Rama base | Ramas de trabajo | Para qué |
|---|---|---|---|---|
| user-api | configurada | develop (existe) | USUITE-15425-logs-auth-seguros, USUITE-15425-logs-auth-seguros-secure | módulo de autenticación: helper de ofuscación, authLog y conversión de los logs |
| sandbox-api | configurada | develop (existe) | USUITE-15425-logs-auth-seguros, USUITE-15425-logs-auth-seguros-secure | filtro de Sentry (beforeSend) y plantilla de configuración LOG_MASKING |

## Ambientes

- uvmcl-retention QA: QA de uvmcl: validación de F9 (Q1 a Q10) y de la línea secure en F10
- uvmcl-retention producción: único despliegue de este ticket; lo hace quien despliega

## Personas

- Esteban Cortes: asignado del ticket en Jira
- quien despliega: despliega en QA y producción e informa la rama del checkout de cada repo en el bastión

## Enlaces

- [Jira USUITE-15425](https://u-planner.atlassian.net/browse/USUITE-15425)
- [Confluence: Logging (Operaciones › Software Engineering)](https://u-planner.atlassian.net/wiki/spaces/OP/pages/577765435/Logging)

## Notas

- Entrega en dos líneas por repo: normal (develop a master) y secure (feature/secure-develop a feature/secure-master; develop_secure es de 2020 y está muerta). Se desarrolla en develop y se reaplica con cherry-pick -x en la rama -secure, un commit por archivo convertido.
- suite-api corre con Node 10: tests y smoke en la imagen de producción; nada de sintaxis posterior a Node 10.
- user-api se copia desde el EFS del ambiente al arrancar (no viaja en la imagen): la línea de cada cliente se ve en el bastión.
- El despliegue es manual y queda fuera de la guía de ejecución.
- Documentación en Confluence (decisión del dev 2026-10-02, opción A): se actualiza la página existente Operaciones › Software Engineering › Logging (id 577765435), no se crea una nueva. El texto está en el KB del caso (confluence-logging-borrador.md) y se publica recién después de que se aprueben y mergeen los PR de las dos líneas, con OK del dev sobre el texto final.

## KB del caso

| Documento | Tipo | Título | Resumen |
|---|---|---|---|
| ambiente-local.md | referencia | Cómo levantar suite-api en local (Apple Silicon) y validar con login local | Rosetta para Node 10, túneles por puerto (5502 QA uvmcl, 5504 producción), pool en 3, lo que inyecta gulp, base de la suite en Docker y el login local como validación de F5 y F6 |
| borrador-aviso-lead-secretos.md | registro | Borrador: aviso al lead sobre secretos escritos en el código (hallazgos de USUITE-15425) | Borrador sin enviar del aviso al lead: clave de cifrado en user-api services.js:263 y dos CLIENT_SECRET en la plantilla de sandbox-api, con propuesta de rotación; sin valores |
| confluence-logging-borrador.md | registro | Borrador Confluence: nueva versión de la página "Logging" (Operaciones) | Opción A: actualizar OP › Software Engineering › Logging (id 577765435) con la corrección del nivel silly por defecto y la sección de authLog y LOG_MASKING; se publica después de mergear los PR |
| decision-deteccion-en-texto.md | decision | Decisión F2: dónde se aplica la detección de datos dentro de textos | La detección en texto se aplica solo a textos sin estrategia por nombre (A); dentro de un XML cada etiqueta se oculta según la estrategia de su nombre (B) |
| decision-niveles-y-archivos-helper.md | decision | Decisión F1: regla de niveles proporcional con tope, rangos numéricos y helper en dos archivos | Niveles light/medium/strong según el largo con tope (B), maxDepth 1 a 50, maxTextLength 256 a 1 MB, helper en dos archivos, tipo_documento excluido del catálogo id y estilo ajustado a mano según .eslintrc.js |
| decision-suite-secure-login-cookie.md | decision | Decisión F9: la suite existente en la línea secure y el login con cookie | La suite de 2021 manda el token en x-access-token y secure lo lee de una cookie httpOnly: 14 de 15 tests dan 401. Se acepta esa línea base (A) y adaptar la suite queda para un ticket aparte |
| plan-original.md | registro | Plan original importado: USUITE-15425: plan de desarrollo (logs de autenticación seguros y siempre visibles) | - |
| revision-comportamiento-final.md | revision | Revisión F8: comportamiento final frente al análisis y al plan original | Qué cambió respecto del plan (niveles, catálogo, detección en texto, ejemplos de configuración corregidos, datos visibles por defecto, verificación) y los hallazgos de seguridad para el lead |
| smoke-f7.md | registro | Smoke F7: salida real del logger con authLog (USUITE-15425) | Tres escenarios del smoke de F7 (sin config, config mal formada, info con niveles propios) con 0 claves ficticias, el script para repetirlo en F10 y las salidas completas |
| smoke-f9-secure.md | registro | Smoke F9: salida real del logger con authLog en la línea secure (USUITE-15425) | Tres escenarios del smoke en las ramas -secure con 0 claves ficticias; salidas idénticas a las de la línea normal salvo hora y trazas de pila |
| usuite-15425-claves-en-logs-uvmcl.md | analisis | USUITE-15425: contraseñas en los logs de suite-api (uvmcl). Análisis, plan de prueba y esfuerzo | Análisis inicial: por qué la clave de uvmcl sale en los logs y flujo del login |
| usuite-15425-niveles-de-solucion.md | analisis | USUITE-15425: niveles de solución (consolidado con verificación en uvmcl) | Vulnerabilidades, estado verificado de uvmcl y niveles de solución |
| usuite-15425-plan-helper-ofuscacion-y-mapa-logger.md | analisis | USUITE-15425: plan del helper de ofuscación y mapa del sistema de logs de suite-api | Mapa del sistema de logs (loggerLevel, niveles, salidas que no controla); su parte B la reemplaza el plan |

## Plan

10 de 11 fases cerradas, fase actual F10. Vista: /Users/edobacon/.kanai/data/kanai_data/inline-cases/usuite-15425/plan.md
