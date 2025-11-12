# HaexHub SDK - TODO

## Verbesserungen

### Vite Plugin: Automatisches Manifest-Injection
**Status**: Geplant
**Priorität**: Niedrig

Aktuell müssen React/Vue/Svelte-Extensions das Manifest manuell importieren:
```typescript
import manifest from './haextension/manifest.json'
const { client } = useHaexHub({ manifest });
```

**Verbesserung**:
Der Vite-Plugin könnte das Manifest automatisch zur Build-Zeit lesen (mit `readManifest()`) und als globale Variable injizieren, ähnlich wie der Nuxt-Adapter es macht.

**Vorteile**:
- Konsistentes Verhalten über alle Framework-Adapter
- Automatischer Version-Fallback auf package.json
- Weniger Boilerplate-Code für Entwickler

**Beispiel nach Verbesserung**:
```typescript
// Kein Import nötig - automatisch injiziert
const { client } = useHaexHub(); // Manifest wird automatisch vom Vite-Plugin bereitgestellt
```
