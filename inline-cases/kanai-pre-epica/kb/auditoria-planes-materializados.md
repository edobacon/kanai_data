# Auditoría en solo lectura de los planes ya materializados (F0.3)

Fecha: 2026-10-04. Alcance: 34 specs de taomangalam. Método: se extraen las referencias a archivos citadas entre backticks en cada spec y se contrastan contra los archivos versionados del repositorio del proyecto (git ls-files). Es una comprobación mecánica: no juzga superficies semánticas (una vista o un tablero nombrados en prosa) ni valida que el archivo citado sea el correcto, solo que exista.

## Resumen

- Specs auditados: **34**
- Specs con al menos una referencia a archivo: **22**
- Specs con al menos una referencia que NO existe en el repositorio: **10**
- Referencias a archivos revisadas: **186**; inexistentes: **15**

## Casos con referencias inexistentes

| Ticket | Referencias | Inexistentes |
|---|---|---|
| TAO-158 | 16 | `release.yml` |
| TAO-162 | 15 | `app/lib/main.dart`, `.directories.g.dart`, `.g.dart` |
| TAO-163 | 6 | `server/railway.toml`, `railway.toml` |
| TAO-164 | 9 | `qa-bundle.json` |
| TAO-166 | 14 | `.github/workflows/*.yml` |
| TAO-172 | 23 | `test/tool/check_motion_durations_test.dart` |
| TAO-174 | 15 | `tao_icon_button_test.dart` |
| TAO-177 | 18 | `360x800.png`, `1024x768.png` |
| TAO-179 | 9 | `app/lib/l10n/*.arb` |
| TAO-182 | 7 | `shell_golden_test.dart`, `templates_golden_test.dart` |

## Lectura

- Una referencia inexistente en un spec es una tarea que nace imposible o un asset que hay que empaquetar: el pre-flight de superficies y assets del caso post-épica es exactamente lo que la detecta antes de planificar.
- Caso testigo ya conocido: el fondo `v-27-cuenta.png` que TAO-181 pide a pantalla completa y que no está empaquetado; el golden compara contra la superficie de respaldo.
- El informe NO enmienda ningún plan: los tickets son parte de una épica en ejecución y su plan solo lo cambia su responsable.
