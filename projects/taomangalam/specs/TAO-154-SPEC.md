---
id: TAO-154-SPEC
project: taomangalam
ticket: TAO-154
status: approved
---

# Spike HU-00-03: baseline de compilación y arranque de Flutter con todos los plugins nativos (iOS Simulator / Android API 24)

## Resumen ejecutivo

Se construye un PR vertical sobre el esqueleto Flutter de HU-00-02 que declara las seis familias de plugins nativos y las dependencias P0/P1, compila iOS Simulator y Android debug con código 0, arranca el APK en AVD API 24 y API 36 y en Simulator con la tarea WorkManager registrada, fija el toolchain (Kotlin/Gradle/AGP/Xcode) y publica en el issue del spike la matriz de plugins, el reporte de licencias, el pubspec.lock y la decisión (baseline aprobado o DEC nueva). NO se hace: Express/Prisma/pg-boss ni migración desde cero (HU-00-04..08), adapters CloudKit/Drive, PDF por streaming, símbolos Sentry, smoke Socket.IO, interfaces propias ni uso productivo de cada plugin, ni escenarios de permisos revocados/nube sin cuota/red cautiva. Funciona si ambos builds terminan en 0, la app arranca sin cierre inesperado en API 24/36 y Simulator dejando el log de WorkManager, y si un plugin exige un mínimo superior queda una DEC registrada. Tamaño estimado: 3 sesiones (T1-T2), spike de 3 puntos.

## Requirements

### REQ-01 `confirmed`
> Fuente: taomangalam/docs/backlog/EP-00_monorepo_y_experiencia_de_desarrollo.md:362

Declarar en el esqueleto de HU-00-02 las seis familias de plugins nativos (DB: drift + sqlite3_flutter_libs; seguridad: flutter_secure_storage; scanner: mobile_scanner; audio: record + just_audio; notificaciones: flutter_local_notifications + timezone; background: workmanager) y las dependencias nativas P0/P1 (connectivity_plus, package_info_plus, device_info_plus, url_launcher, path_provider, permission_handler, image_picker, file_picker, share_plus, google_sign_in, sentry_flutter), versionando el `pubspec.lock` resultante.

### REQ-02 `confirmed`
> Fuente: taomangalam/app/android/app/build.gradle.kts:25

Compilar iOS Simulator (`flutter build ios --simulator`) y Android debug (`flutter build apk --debug`) con todos los plugins declarados, obteniendo código de salida 0 en ambos builds.

### REQ-03 `confirmed`
> Fuente: taomangalam/app/lib/core/config/app_config_loader.dart:11

Instalar y arrancar el APK en AVD API 24 y API 36 y en Simulator con el runtime más bajo disponible: la app arranca sin cierre inesperado y una tarea WorkManager trivial deja su log de ejecución.

### REQ-04 `confirmed`
> Fuente: taomangalam/docs/backlog/EP-00_monorepo_y_experiencia_de_desarrollo.md:344

Detectar cada plugin que exija iOS mayor que 15 o minSdk mayor que 24 y, sin degradarlo ni reemplazarlo por una librería equivalente, registrar una DEC nueva con el mínimo propuesto o una alternativa comparada, o documentar el descarte antes de cerrar el spike.

### REQ-05 `confirmed`
> Fuente: taomangalam/app/android/app/build.gradle.kts:25

Fijar en la configuración del proyecto y anotar en el informe las versiones de Kotlin, Gradle, AGP y Xcode usadas tras el primer build limpio.

### REQ-06 `confirmed`
> Fuente: taomangalam/docs/backlog/EP-00_monorepo_y_experiencia_de_desarrollo.md:284

Publicar en el issue del spike el informe con la matriz plugin/versión/mínimo exigido/resultado, el reporte de licencias, el `pubspec.lock` resultante y la lista de historias afectadas.

### REQ-07 `inferred` `enforcement`
> Fuente: taomangalam/app/lib/core/config/app_config_loader.dart:11

Construir el PR vertical reutilizando el esqueleto Flutter de HU-00-02 (configuración tipada, sabores, analyzer estricto) sin recrear el proyecto ni mantener un pubspec paralelo.
## Tasks

#### S1.T1 — Declarar en el `pubspec.yaml` del esqueleto HU-00-02 las seis familias de plugins nativos y las dependencias nativas P0/P1, correr `flutter pub get` y versionar el `pubspec.lock` resultante sin duplicar plugins ya presentes.
Contrato: rollback: Revertir `pubspec.yaml` y `pubspec.lock` al estado de HU-00-02 y correr `flutter pub get`; no hay estado productivo que restaurar.. Status: done

#### S1.T1.1 — Declarar las seis familias (drift + sqlite3_flutter_libs, flutter_secure_storage, mobile_scanner, record + just_audio, flutter_local_notifications + timezone, workmanager) con sus versiones y correr `flutter pub get`.
Contrato: rollback: Revertir `pubspec.yaml` al estado de HU-00-02 y correr `flutter pub get`.. Status: done

#### S1.T1.2 — Declarar las dependencias nativas P0/P1 (connectivity_plus, package_info_plus, device_info_plus, url_launcher, path_provider, permission_handler, image_picker, file_picker, share_plus, google_sign_in, sentry_flutter), resolver conflictos y versionar `pubspec.lock`.
Contrato: rollback: Revertir `pubspec.yaml` y `pubspec.lock` al estado previo y correr `flutter pub get`.. Status: done

#### S1.T2 — Fijar en la configuración del proyecto (Gradle/AGP/Xcode) las versiones de Kotlin, Gradle, AGP y Xcode resultantes del primer build limpio y anotarlas para el informe.
Contrato: rollback: Revertir los archivos de configuración de build al estado de HU-00-02.. Status: done

#### S1.T3 — Obtener build verde en ambas plataformas con el set completo de plugins, resolviendo fallos de versión/mínimos y detectando plugins que exijan iOS > 15 o minSdk > 24.
Contrato: rollback: Revertir el working tree del spike al estado de HU-00-02; el prototipo se descarta, solo se conserva la evidencia.. Status: done

#### S1.T3.1 — Compilar iOS Simulator con todos los plugins y resolver fallos de plugins iOS hasta exit code 0, registrando mínimos iOS exigidos por plugin.
Contrato: rollback: Revertir los cambios de config/pubspec de iOS al estado previo del spike.. Status: done

#### S1.T3.2 — Compilar Android debug con todos los plugins y resolver fallos de plugins Android hasta exit code 0, registrando minSdk exigido por plugin.
Contrato: rollback: Revertir los cambios de config/pubspec de Android al estado previo del spike.. Status: done

#### S1.T4 — Regresión: verificar que el esqueleto HU-00-02 mantiene analyzer estricto sin errores tras agregar los plugins y que los dos builds son reproducibles en una corrida limpia.
Contrato: rollback: No aplica: tarea de verificación; no muta código.. Status: done

#### S2.T1 — Instalar y arrancar el APK en los tres targets de referencia (AVD API 24, AVD API 36, Simulator con runtime más bajo disponible) y capturar evidencia de arranque sin cierre inesperado.
Contrato: rollback: No aplica: instalación en emuladores/simulador descartables; no hay estado productivo.. Status: done

#### S2.T1.1 — Instalar y arrancar el APK en AVD API 24 (borde del mínimo de DEC-198) y capturar el arranque sin cierre inesperado.
Contrato: rollback: Desinstalar el APK del AVD; no hay estado persistente que restaurar.. Status: done

#### S2.T1.2 — Instalar y arrancar el APK en AVD API 36 y capturar el arranque sin cierre inesperado.
Contrato: rollback: Desinstalar el APK del AVD; no hay estado persistente que restaurar.. Status: done

#### S2.T1.3 — Arrancar la app en el Simulator con el runtime más bajo disponible y capturar el arranque sin cierre inesperado.
Contrato: rollback: Cerrar el Simulator; no hay estado persistente que restaurar.. Status: done

#### S2.T2 — Registrar una tarea WorkManager trivial en el PR, dispararla en el arranque y capturar su log de ejecución en API 24.
Contrato: rollback: Revertir el código del registro de prueba de WorkManager en el working tree del spike.. Status: done

#### S2.T3 — Consolidar por plugin el mínimo exigido (iOS/minSdk) y, si alguno supera iOS 15 o API 24, redactar la DEC nueva con el mínimo propuesto o la alternativa comparada sin degradar ni reemplazar el plugin.
Contrato: rollback: No aplica: solo produce documentación de decisión; descartar el borrador si no corresponde.. Status: done

#### S2.T4 — Regresión: re-ejecutar el smoke de arranque y la tarea WorkManager en AVD API 24 (borde mínimo) tras los ajustes para confirmar que no hay cierre inesperado.
Contrato: rollback: No aplica: tarea de verificación; no muta código.. Status: done

#### S3.T1 — Generar el reporte de licencias de dependencias y consolidar el `pubspec.lock` y las versiones de toolchain como artefactos del spike.
Contrato: rollback: No aplica: artefactos de evidencia; se descartan si el spike se rehace.. Status: done

#### S3.T2 — Armar y publicar en el issue del spike la matriz plugin/versión/mínimo exigido/resultado, el reporte de licencias, el `pubspec.lock`, las versiones de toolchain, la lista de historias afectadas y la decisión (baseline aprobado o DEC nueva).
Contrato: rollback: No aplica: publicación de informe; editar el issue si hay correcciones.. Status: done

#### S3.T3 — Regresión: revisar que el informe cubre los REQs, cita los casos QA-00-03-01..03 y que la decisión (baseline o DEC) queda trazable antes de cerrar el spike.
Contrato: rollback: No aplica: tarea de verificación; no muta código.. Status: done
## Sessions

### Session 1 · T2 · continue

**Tasks:**
- [x] S1.T1
- [x] S1.T1.1
- [x] S1.T1.2
- [x] S1.T2
- [x] S1.T3
- [x] S1.T3.1
- [x] S1.T3.2
- [x] S1.T4

**Gate (auto)**: Sobre la rama del spike, `flutter build ios --simulator` y `flutter build apk --debug` terminan con código 0 con el set completo de plugins, y el `pubspec.lock` y las versiones de Kotlin/Gradle/AGP/Xcode quedan versionados y fijados en la configuración.

### Session 2 · T2 · continue

**Tasks:**
- [x] S2.T1
- [x] S2.T1.1
- [x] S2.T1.2
- [x] S2.T1.3
- [x] S2.T2
- [x] S2.T3
- [x] S2.T4

**Gate (auto)**: El APK arranca sin cierre inesperado en AVD API 24 y API 36 y en el Simulator con el runtime más bajo disponible, la tarea WorkManager deja su log de ejecución, y queda determinada por plugin la decisión de mínimo (baseline aprobado o DEC a redactar).

### Session 3 · T1 · continue

**Tasks:**
- [x] S3.T1
- [x] S3.T2
- [x] S3.T3

**Gate (auto)**: El issue del spike contiene la matriz plugin/versión/mínimo exigido/resultado, el reporte de licencias, el `pubspec.lock`, las versiones de Kotlin/Gradle/AGP/Xcode, la lista de historias afectadas y la decisión explícita (baseline aprobado o DEC enlazada).
