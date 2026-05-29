# Spec: Countries Feature

> Status: ✅ Implemented — V1.2.0
> Author: Spec-Driven Development pass

---

## 1. Overview

Allow users to add any country by name. The app searches the country via REST Countries API,
resolves the capital city's coordinates and IANA timezone via Open-Meteo Geocoding, and renders a
card identical in structure to timezone cards — showing current time, UTC offset vs GT, flag emoji,
and live weather.

---

## 2. User Stories

| # | Story |
|---|-------|
| US-01 | As a user, I can type a country name (English or Spanish) and click "Agregar país" to add a card for that country |
| US-02 | As a user, I see the country flag emoji, country name, and capital city on the card |
| US-03 | As a user, I see the real-time local time and date for the capital city's timezone |
| US-04 | As a user, I see live weather data (temp, wind, condition) for the capital city |
| US-05 | As a user, I see the UTC offset difference relative to Guatemala (GT) |
| US-06 | As a user, I can remove a country card with the ✕ button |
| US-07 | As a user, my country cards persist after a page reload (localStorage) |
| US-08 | As a user, I can drag-and-drop or use ▲/▼ buttons to reorder country cards |
| US-09 | As a user, I cannot add the same country twice |

---

## 3. Acceptance Criteria

- [ ] Input field accepts any string; error shown if no country match is found
- [ ] Flag emoji rendered from ISO 3166-1 alpha-2 code (cca2) using regional indicator symbols
- [ ] Capital city name displayed as card subtitle
- [ ] Card badge shows "País" (distinct green tint from "Extra"/"USA" badges)
- [ ] Current time updates every 1 second like other cards
- [ ] Weather fetched from Open-Meteo using stored lat/lon (no geocoding re-query on weather refresh)
- [ ] Remove (✕) button appears on country cards; clicking it removes the card and updates localStorage
- [ ] Card participates in drag-and-drop and ▲/▼ reordering
- [ ] Adding a duplicate country (same cca2) shows an alert and does not add a second card
- [ ] Persisted country data includes: name, capital, iana, lat, lon, flag, cca2, region
- [ ] Datalist in UI provides ~40 common country name suggestions

---

## 4. API Contracts

### 4.1 REST Countries (client-side, no auth)

**Request**
```
GET https://restcountries.com/v3.1/name/{query}?fields=name,capital,flags,cca2,region
```

**Response shape used**
```json
[{
  "name": { "common": "France" },
  "capital": ["Paris"],
  "cca2": "FR",
  "region": "Europe"
}]
```

### 4.2 Open-Meteo Geocoding (existing, client-side)

**Request**
```
GET https://geocoding-api.open-meteo.com/v1/search?name={capital}&count=1&language=en&format=json
```

**Response fields used**: `latitude`, `longitude`, `timezone`

---

## 5. Data Model

**localStorage key**: `timezone-custom-countries-v1`

**Schema** (array of CountryData objects):
```json
[{
  "name": "France",
  "capital": "Paris",
  "iana": "Europe/Paris",
  "lat": 48.8534,
  "lon": 2.3488,
  "flag": "🇫🇷",
  "cca2": "FR",
  "region": "Europe"
}]
```

---

## 6. State Changes (app.js)

| Item | Change |
|------|--------|
| `state.customCountries` | New array: `CountryData[]` |
| `CUSTOM_COUNTRIES_KEY` | New constant: `'timezone-custom-countries-v1'` |
| `buildCardsData()` | Extended: loops `state.customCountries`, builds cards with `isCountry: true` |
| `buildCardsUI()` | Extended: 'País' badge + `data-remove-country` attribute on ✕ button |
| `getCoordsForCard()` | Extended: returns stored lat/lon for `isCountry` cards without geocoding |
| `boot()` | Extended: loads countries, binds country input events |

---

## 7. New Functions

| Function | Purpose |
|----------|---------|
| `countryFlagEmoji(cca2)` | Converts 2-letter ISO code to flag emoji via Unicode regional indicators |
| `loadCustomCountries()` | Reads + validates from localStorage |
| `saveCustomCountries()` | Serializes to localStorage |
| `addCustomCountry(input)` | Full flow: REST Countries → Geocoding → validate → push → redraw |
| `removeCustomCountry(cca2)` | Filters out by cca2, saves, redraws |
| `bindRemoveCountryButtons()` | Binds click on `[data-remove-country]` elements |

---

## 8. UI Layout

```
[ Zona IANA (ej: Europe/Madrid) ] [+ Agregar zona]  |  [ País (ej: Francia, Japan) ] [🏳 Agregar país]
```

On mobile (`max-width: 740px`): stacks to two full-width rows.

---

## 9. Error Handling

| Scenario | Behavior |
|----------|----------|
| Empty input | Alert: 'Escribe el nombre de un país…' |
| Country not found | Alert: 'País no encontrado: {query}' |
| No geocoding result for capital | Alert with capital name |
| Invalid IANA timezone returned | Alert; country not added |
| Duplicate country | Alert: '{name} ya está en tus cards.' |

---

## 10. Future Enhancements (out of scope V1.2)

- Country search suggestions loaded dynamically from REST Countries on focus
- Multiple timezone support for countries with multiple timezones (e.g., Russia, USA)
- Country card grouping by region
- Population and language metadata display
