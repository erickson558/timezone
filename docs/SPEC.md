# Feature Specs — GT vs USA Timeboard

---

## Spec 1: Countries Feature

> Status: ✅ Implemented — V1.2.0 (API revised in V1.2.1)
> Author: Spec-Driven Development pass

### 1. Overview

Allow users to add any country by name. The app searches via **Open-Meteo Geocoding**
(same API already used for weather — no extra dependency), extracts the country code, timezone,
and coordinates, and renders a card showing flag, country name, capital city timezone, and weather.

### 2. User Stories

| # | Story |
|---|-------|
| US-01 | As a user, I can type a country name in English and click "Agregar país" to add a card |
| US-02 | As a user, I see the country flag emoji, country name, and main city on the card |
| US-03 | As a user, I see the real-time local time and date for that country's timezone |
| US-04 | As a user, I see live weather data (temp, wind, condition) |
| US-05 | As a user, I see the UTC offset difference relative to Guatemala (GT) |
| US-06 | As a user, I can remove a country card with the ✕ button |
| US-07 | As a user, my country cards persist after a page reload (localStorage) |
| US-08 | As a user, I can drag-and-drop or use ▲/▼ to reorder country cards |
| US-09 | As a user, I cannot add the same country twice (duplicate check by `cca2`) |

### 3. Acceptance Criteria

- [x] Input accepts country name in English; inline error shown if not found
- [x] Flag emoji rendered from ISO 3166-1 alpha-2 code via Unicode regional indicators
- [x] Main city derived from IANA timezone (e.g. `America/Guayaquil` → "Guayaquil")
- [x] Badge "País" with green tint distinguishes country cards
- [x] Weather uses stored lat/lon — no re-query on refresh
- [x] ✕ button removes card and updates localStorage
- [x] Participates in drag-and-drop and ▲/▼ reordering
- [x] Feedback shown inline (no blockable `alert()` for async errors)
- [x] Button shows spinner while searching; resets on success or error
- [x] Datalist provides ~70 common country name suggestions

### 4. API Contract

**Open-Meteo Geocoding** (single call — replaces original two-call flow with REST Countries)

```
GET https://geocoding-api.open-meteo.com/v1/search?name={query}&count=1&language=en&format=json
```

**Response fields used**:

| Field | Purpose |
|-------|---------|
| `country_code` | ISO 3166-1 alpha-2 → flag emoji + duplicate detection |
| `country` | Country display name |
| `timezone` | IANA timezone for time display |
| `latitude`, `longitude` | Weather fetch coordinates |
| `name` | Fallback if `country` is absent |

### 5. Data Model

**localStorage key**: `timezone-custom-countries-v1`

```json
[{
  "name": "Ecuador",
  "capital": "Guayaquil",
  "iana": "America/Guayaquil",
  "lat": -2.2,
  "lon": -79.9,
  "flag": "🇪🇨",
  "cca2": "EC",
  "region": ""
}]
```

### 6. Error Handling

| Scenario | Behavior |
|----------|----------|
| Empty input | Inline error (synchronous, no API call) |
| Country not found | Inline error: `'No se encontro "{query}"…'` |
| Invalid timezone returned | Inline error; country not added |
| Duplicate (same `cca2`) | Inline warning; no second card added |
| Network error | Inline error with console.error for debugging |

### 7. Out of Scope (V1.2)

- Spanish name input (API searches English names only)
- Multiple timezones per country (Russia, USA, etc.)
- Country grouping by region

---

## Spec 2: Timezone & Country Flags

> Status: ✅ Implemented — V1.3.0
> Author: Spec-Driven Development pass

### 1. Overview

Display the country flag emoji on **every card** — not just country cards.
GT card shows 🇬🇹, USA zone cards show 🇺🇸, custom zone cards show the flag of the country
their IANA timezone belongs to, and country cards (already had flags) remain unchanged.
Flags are resolved via a static `TIMEZONE_COUNTRY` lookup table for instant rendering, with
the Open-Meteo geocache as fallback for unusual timezones.

### 2. User Stories

| # | Story |
|---|-------|
| US-01 | As a user, I see the Guatemalan flag 🇬🇹 on the GT base card |
| US-02 | As a user, I see the US flag 🇺🇸 on all six USA zone cards |
| US-03 | As a user, when I add a custom IANA zone (e.g. `Europe/Madrid`), I see the Spanish flag 🇪🇸 |
| US-04 | As a user, country cards continue to show their flag as before |
| US-05 | As a user, if a flag cannot be determined for a custom zone, the card renders without a flag (graceful fallback) |

### 3. Acceptance Criteria

- [x] GT card displays `🇬🇹 Guatemala`
- [x] All six USA zone cards display `🇺🇸 {label}` (e.g. `🇺🇸 US Eastern`)
- [x] Common custom zones (e.g. `Europe/Paris`, `Asia/Tokyo`) show the correct flag instantly (from lookup table)
- [x] Unusual custom zones show the correct flag after the first weather fetch populates the geocache
- [x] Flag is stored as a separate `card.flag` field; label contains only the name (no embedded flag)
- [x] Country cards: flag comes from `countryData.flag`, label is `countryData.name` only
- [x] No additional API calls introduced for flags (lookup table is static JS)
- [x] Flags render correctly across all 5 themes

### 4. Technical Spec

#### 4.1 Static Lookup Table

`TIMEZONE_COUNTRY` — plain JS object, ~130 entries covering Americas, Europe, Asia, Africa, Oceania.

```javascript
var TIMEZONE_COUNTRY = {
  'America/Guatemala': 'GT',
  'America/New_York': 'US',
  'Europe/Madrid': 'ES',
  'Asia/Tokyo': 'JP',
  // ... ~130 entries total
};
```

#### 4.2 `flagForTimezone(iana)` function

Resolution order:
1. Check `TIMEZONE_COUNTRY[iana]` → instant (static)
2. Check `state.geoCacheByTimezone[iana].cca2` → populated after first weather geocoding
3. Return `''` (empty string) → card renders without flag

#### 4.3 Geocache enrichment

`getCoordsForCard()` now stores `cca2` from the Open-Meteo geocoding result:

```javascript
state.geoCacheByTimezone[iana] = {
  lat: ..., lon: ..., label: ...,
  cca2: (first.country_code || '').toUpperCase()   // NEW
};
```

#### 4.4 `buildCardsData()` changes

| Card type | `flag` source | `label` |
|-----------|--------------|---------|
| GT | `flagForTimezone('America/Guatemala')` | `'Guatemala'` |
| USA zones | `flagForTimezone(zone.iana)` | `zone.label` (e.g. `'US Eastern'`) |
| Custom zones | `flagForTimezone(tz)` | city from IANA (e.g. `'Madrid'`) |
| Country cards | `country.flag` from stored data | `country.name` (flag removed from label) |

#### 4.5 `buildCardsUI()` rendering

```javascript
html += '<div class="zone-name">' + (card.flag ? card.flag + ' ' : '') + card.label + '</div>';
```

### 5. State Changes

| Item | Change |
|------|--------|
| `TIMEZONE_COUNTRY` | New constant: static IANA → ISO 3166-1 alpha-2 map |
| `flagForTimezone(iana)` | New function: lookup table → geocache → empty string |
| `state.geoCacheByTimezone[iana].cca2` | New field added by `getCoordsForCard()` |
| `buildCardsData()` — all card types | New `flag` field; country cards: label no longer embeds flag |
| `buildCardsUI()` | Flag prefix in `.zone-name` |

### 6. Error Handling / Edge Cases

| Scenario | Behavior |
|----------|----------|
| IANA not in lookup table | `flagForTimezone` checks geocache; returns `''` if absent |
| `String.fromCodePoint` unavailable (old browser) | `countryFlagEmoji` returns raw `cca2` code |
| Country card loaded from localStorage | `flag` field read directly from stored `CountryData` |

### 7. Out of Scope (V1.3)

- Dynamic flag update without a full redraw (currently requires next `redrawCards()` for geocache-sourced flags)
- Flags on the zone suggestions datalist
- Lookup table coverage for all ~600 IANA timezones
