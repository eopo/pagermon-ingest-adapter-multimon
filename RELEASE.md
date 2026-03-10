# Release Workflow

Dieses Repository nutzt **Release Please** für automatische Versionierung und Changelog-Generierung.

## Wie es funktioniert

### 1. Contributors: Normaler Entwicklungsprozess

Contributors müssen **nichts Besonderes** tun:

```bash
# Normaler Git-Workflow
git commit -m "Add support for RTL-SDR v4"
git push
# → PR öffnen → Fertig
```

**Keine** extra Changeset-Files, keine spezielle Formatierung nötig.

### 2. Release-Please Bot: Automatische Sammlung

Nach jedem Merge auf `main`:

1. Release-Please analysiert **alle Commits seit dem letzten Release**
2. Erstellt/Updates einen **Release-PR** automatisch
3. Der PR heißt: `chore(main): release X.Y.Z`
4. Sammelt **kontinuierlich alle Changes** (keine Zeitbegrenzung!)

**Beispiel Release-PR Inhalt:**

```markdown
## 1.3.0 (2026-03-10)

### Features

- Add RTL-SDR v4 support ([a1b2c3d](commit-link))
- Support multiple devices in parallel ([e4f5g6h](commit-link))

### Bug Fixes

- Fix USB device detection on ARM ([i7j8k9l](commit-link))

---

This PR updates version to 1.3.0 and updates CHANGELOG.md
```

### 3. Maintainer: Release freigeben

**Wann immer du bereit bist** (Tage/Wochen/Monate später):

1. Review den Release-PR auf GitHub
2. Merge ihn → **Das war's!**

### 4. Automatische Veröffentlichung

Beim Merge des Release-PRs:

1. ✅ `package.json` version wird aktualisiert
2. ✅ `CHANGELOG.md` wird generiert/updated
3. ✅ Git Tag `v1.3.0` wird erstellt
4. ✅ GitHub Release wird erstellt
5. ✅ **Docker Build** startet automatisch (durch Release-Event)
   - Pusht zu `shutterfire/ingest-multimon:1.3.0` und `latest`
   - Pusht zu `ghcr.io/eopo/ingest-multimon:1.3.0` und `latest`

> **Wichtig:** Docker Images werden **nur bei Releases** veröffentlicht, nicht bei jedem Push zu main.

## Commit Message Guidelines (Optional)

Release-Please funktioniert **auch ohne** spezielle Commits, aber für bessere CHANGELOG-Struktur:

### Empfohlenes Format

```bash
# Features (→ Minor Version bump)
git commit -m "feat: Add RTL-SDR v4 support"
git commit -m "feat(usb): Add device hotplug detection"

# Bugfixes (→ Patch Version bump)
git commit -m "fix: Resolve USB detection on ARM"
git commit -m "fix(multimon): Handle empty messages"

# Breaking Changes (→ Major Version bump)
git commit -m "feat!: Change config structure for devices"
# oder
git commit -m "feat: New device config

BREAKING CHANGE: INGEST_ADAPTER__DEVICE changed to INGEST_ADAPTER__DEVICES"

# Keine Version bump
git commit -m "chore: Update dependencies"
git commit -m "docs: Update README"
git commit -m "test: Add unit tests"
```

### Commit-Typen

| Typ                                     | Beschreibung     | Version Bump          |
| --------------------------------------- | ---------------- | --------------------- |
| `feat:`                                 | Neue Features    | Minor (1.1.0 → 1.2.0) |
| `fix:`                                  | Bugfixes         | Patch (1.1.0 → 1.1.1) |
| `feat!:` oder `BREAKING CHANGE:`        | Breaking Changes | Major (1.1.0 → 2.0.0) |
| `chore:`, `docs:`, `test:`, `refactor:` | Maintenance      | Kein Release          |

### Ohne spezielle Commits

Wenn Commits **nicht** diesem Format folgen:

- Release-Please erkennt sie trotzdem
- Sie erscheinen im CHANGELOG unter "Other Changes"
- Version bump basiert auf Heuristiken

**Für Maintainer:** Spezielle Commits sind hilfreich aber nicht erforderlich.  
**Für Contributors:** Einfach normal committen ist vollkommen ok.

## Releases manuell forcieren

Falls du einen Release machen willst, obwohl keine relevanten Commits da sind:

1. Manuell GitHub Release erstellen mit Tag `v1.3.0`
2. Docker Workflow wird trotzdem ausgelöst

## Prerelease / Canary Builds

Für Beta/Alpha Versionen:

```bash
# In separatem Branch, z.B. "beta"
# Release-Please kann konfiguriert werden für "prerelease: true" in Config
```

Derzeit **nicht konfiguriert**, kann bei Bedarf ergänzt werden.

## Troubleshooting

### "Release-PR wird nicht erstellt"

- Stelle sicher, dass Commits auf `main` gepusht wurden
- Prüfe, ob bereits ein offener Release-PR existiert
- GitHub Actions Logs checken: `.github/workflows/release-please.yml`

### "Version bump ist falsch"

- Release-Please nutzt Semver basierend auf Commit-Messages
- Bei Unsicherheit: Release-PR manuell anpassen vor Merge
- `package.json` im PR kann manuell editiert werden

### "Docker Publish fehlt"

- Secrets checken: `DOCKER_USERNAME`, `DOCKER_PASSWORD`
- GitHub Actions Logs für docker.yml prüfen

## Zusammenfassung

✅ Contributors: Normaler Git-Workflow, keine extra Schritte  
✅ Maintainer: Merge Release-PR wann immer bereit  
✅ Automatisch: CHANGELOG, Versioning, Tagging, Docker Images  
✅ Flexibel: Features sammeln ohne Zeitdruck  
✅ Transparent: Release-PR bietet vollständige Übersicht vor Veröffentlichung
