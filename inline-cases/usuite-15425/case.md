# Caso inline: USUITE-15425: logs de autenticación seguros y siempre visibles

> Vista generada por Kanai desde case.yaml, el KB y el plan. No la edites a mano.

**Objetivo:** Que ningún log del módulo de autenticación exponga contraseñas, claves o tokens, conservando la utilidad de los logs para soporte (quién inició sesión, cuándo y con qué resultado), con una solución configurable que funcione en cualquier ambiente aunque no tenga configuración.
**Tags:** repos: user-api, sandbox-api · tickets: USUITE-15425 · labels: suite-legacy
**Etapa:** ejecucion

## Falta

- Nada que bloquee.

## Avisos

- la rama de trabajo USUITE-15425-logs-auth-seguros-secure todavía no existe en user-api (se crea al empezar el trabajo)
- la rama de trabajo USUITE-15425-logs-auth-seguros-secure todavía no existe en sandbox-api (se crea al empezar el trabajo)

## Repos

| Repo | Ruta local | Rama base | Ramas de trabajo | Para qué |
|---|---|---|---|---|
| user-api | configurada | develop (existe) | USUITE-15425-logs-auth-seguros, USUITE-15425-logs-auth-seguros-secure (por crear) | módulo de autenticación: helper de ofuscación, authLog y conversión de los logs |
| sandbox-api | configurada | develop (existe) | USUITE-15425-logs-auth-seguros, USUITE-15425-logs-auth-seguros-secure (por crear) | filtro de Sentry (beforeSend) y plantilla de configuración LOG_MASKING |

## Ambientes

- uvmcl-retention QA: QA de uvmcl: validación de F9 (Q1 a Q10) y de la línea secure en F10
- uvmcl-retention producción: único despliegue de este ticket; lo hace quien despliega

## Personas

- Esteban Cortes: asignado del ticket en Jira
- quien despliega: despliega en QA y producción e informa la rama del checkout de cada repo en el bastión

## Enlaces

- [Jira USUITE-15425](https://u-planner.atlassian.net/browse/USUITE-15425)

## Notas

- Entrega en dos líneas por repo: normal (develop a master) y secure (feature/secure-develop a feature/secure-master; develop_secure es de 2020 y está muerta). Se desarrolla en develop y se reaplica con cherry-pick -x en la rama -secure, un commit por archivo convertido.
- suite-api corre con Node 10: tests y smoke en la imagen de producción; nada de sintaxis posterior a Node 10.
- user-api se copia desde el EFS del ambiente al arrancar (no viaja en la imagen): la línea de cada cliente se ve en el bastión.
- El despliegue es manual y queda fuera de la guía de ejecución.

## KB del caso

| Documento | Tipo | Título | Resumen |
|---|---|---|---|
| ambiente-local.md | referencia | Cómo levantar suite-api en local (Apple Silicon) y validar con login local | Rosetta para Node 10, túneles por puerto (5502 QA uvmcl, 5504 producción), pool en 3, lo que inyecta gulp, base de la suite en Docker y el login local como validación de F5 y F6 |
| decision-deteccion-en-texto.md | decision | Decisión F2: dónde se aplica la detección de datos dentro de textos | La detección en texto se aplica solo a textos sin estrategia por nombre (A); dentro de un XML cada etiqueta se oculta según la estrategia de su nombre (B) |
| decision-niveles-y-archivos-helper.md | decision | Decisión F1: regla de niveles proporcional con tope, rangos numéricos y helper en dos archivos | Niveles light/medium/strong según el largo con tope (B), maxDepth 1 a 50, maxTextLength 256 a 1 MB, helper en dos archivos, tipo_documento excluido del catálogo id y estilo ajustado a mano según .eslintrc.js |
| plan-original.md | registro | Plan original importado: USUITE-15425: plan de desarrollo (logs de autenticación seguros y siempre visibles) | - |
| usuite-15425-claves-en-logs-uvmcl.md | analisis | USUITE-15425: contraseñas en los logs de suite-api (uvmcl). Análisis, plan de prueba y esfuerzo | Análisis inicial: por qué la clave de uvmcl sale en los logs y flujo del login |
| usuite-15425-niveles-de-solucion.md | analisis | USUITE-15425: niveles de solución (consolidado con verificación en uvmcl) | Vulnerabilidades, estado verificado de uvmcl y niveles de solución |
| usuite-15425-plan-helper-ofuscacion-y-mapa-logger.md | analisis | USUITE-15425: plan del helper de ofuscación y mapa del sistema de logs de suite-api | Mapa del sistema de logs (loggerLevel, niveles, salidas que no controla); su parte B la reemplaza el plan |

## Plan

4 de 11 fases cerradas, fase actual F4. Vista: /Users/edobacon/.kanai/data/kanai_data/inline-cases/usuite-15425/plan.md
