---
id: RULE-MERGE-COMMIT
project: taomangalam
type: rule
module: git
level: must
tags:
  - git
  - merge
  - merge-commit
  - trazabilidad
  - proceso
---

Toda integracion a `main` se hace con **merge commit** (pull request + `--merge`), **NO squash**, para conservar todos los commits de la rama y no perder trazabilidad.

- El repo en GitHub quedo configurado con **solo merge commit** (squash y rebase deshabilitados).
- Los PR que se mergeen con la politica anterior (squash) colapsan los commits de sesion: sus hashes quedan fuera de `main`.
- Complemento: al borrar una rama, se puede etiquetar `archive/<ref>` apuntando al tip para que los commits sigan referenciados localmente (ejemplo: `archive/GH-4` para HU-00-02).
- Documentos alineados: `CONTRIBUTING.md` y `docs/product/tecnologia/17_estrategia_ci_cd_y_calidad.md`.

Referencia: PR #26 (merge commit) y decisión del dev del 2026-09-27.
