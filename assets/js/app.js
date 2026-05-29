(function () {
  'use strict';

  var elSync = document.getElementById('sync-status');
  var elVersion = document.getElementById('app-version');
  var elCards = document.getElementById('zone-cards');
  var elThemeToggle = document.getElementById('theme-toggle');
  var elThemeLabel = document.getElementById('theme-label');
  var elThemeSelector = document.getElementById('theme-selector');
  var elZoneInput = document.getElementById('zone-input');
  var elAddZoneBtn = document.getElementById('add-zone-btn');
  var elSuggestions = document.getElementById('timezone-suggestions');
  var elCountryInput = document.getElementById('country-input');
  var elAddCountryBtn = document.getElementById('add-country-btn');
  var elCountryFeedback = document.getElementById('country-feedback');

  var state = {
    driftMs: 0,
    gtZone: 'America/Guatemala',
    usaZones: [],
    weatherLocations: [],
    locationByTimezone: {},
    geoCacheByTimezone: {},
    customZones: [],
    customCountries: [],
    timezoneSuggestions: [],
    cardOrder: [],
    cards: [],
    cardRefs: {}
  };

  var CUSTOM_ZONES_KEY = 'timezone-custom-zones-v1';
  var CUSTOM_COUNTRIES_KEY = 'timezone-custom-countries-v1';
  var CARD_ORDER_KEY = 'timezone-card-order-v1';
  var THEME_KEY = 'theme-preference-v2';
  var draggingOrderKey = null;

  var THEMES = [
    { id: 'aurora-flow', name: 'Aurora Flow' },
    { id: 'neon-grid', name: 'Neon Grid' },
    { id: 'sunset-drive', name: 'Sunset Drive' },
    { id: 'ice-mineral', name: 'Ice Mineral' },
    { id: 'graphite-pop', name: 'Graphite Pop' }
  ];

  // ─── Time helpers ─────────────────────────────────────────────────────────

  function nowServerDate() {
    return new Date(Date.now() + state.driftMs);
  }

  function formatTime(date, zone) {
    return date.toLocaleTimeString('es-GT', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
      timeZone: zone
    });
  }

  function formatDate(date, zone) {
    return date.toLocaleDateString('es-GT', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: '2-digit',
      timeZone: zone
    });
  }

  function formatZoneAbbr(date, zone) {
    var parts = new Intl.DateTimeFormat('en-US', {
      timeZone: zone,
      timeZoneName: 'short'
    }).formatToParts(date);

    for (var i = 0; i < parts.length; i++) {
      if (parts[i].type === 'timeZoneName') {
        return parts[i].value;
      }
    }
    return 'UTC';
  }

  // ─── Theme helpers ─────────────────────────────────────────────────────────

  function normalizeTheme(theme) {
    if (theme === 'dark' || theme === 'midnight' || theme === 'vista') {
      return 'graphite-pop';
    }
    if (theme === 'light' || theme === 'ocean' || theme === 'winxp') {
      return 'ice-mineral';
    }
    if (theme === 'sunset' || theme === 'win98') {
      return 'sunset-drive';
    }
    if (theme === 'forest' || theme === 'win7') {
      return 'aurora-flow';
    }
    if (theme === 'cyber' || theme === 'neon' || theme === 'electric') {
      return 'neon-grid';
    }

    for (var i = 0; i < THEMES.length; i++) {
      if (THEMES[i].id === theme) {
        return theme;
      }
    }
    return 'aurora-flow';
  }

  function getThemeName(themeId) {
    for (var i = 0; i < THEMES.length; i++) {
      if (THEMES[i].id === themeId) {
        return THEMES[i].name;
      }
    }
    return 'Aurora Flow';
  }

  function getNextTheme(themeId) {
    for (var i = 0; i < THEMES.length; i++) {
      if (THEMES[i].id === themeId) {
        return THEMES[(i + 1) % THEMES.length].id;
      }
    }
    return THEMES[0].id;
  }

  function applyTheme(theme) {
    var finalTheme = normalizeTheme(theme);
    document.documentElement.setAttribute('data-theme', finalTheme);
    localStorage.setItem(THEME_KEY, finalTheme);
    elThemeLabel.textContent = 'Tema: ' + getThemeName(finalTheme);
    if (elThemeSelector) {
      elThemeSelector.value = finalTheme;
    }
  }

  function initTheme() {
    var stored = localStorage.getItem(THEME_KEY) || localStorage.getItem('theme-preference');
    var preferred = stored || 'aurora-flow';
    applyTheme(preferred);

    if (elThemeSelector) {
      elThemeSelector.addEventListener('change', function () {
        applyTheme(this.value);
      });
    }

    elThemeToggle.addEventListener('click', function () {
      var current = document.documentElement.getAttribute('data-theme');
      applyTheme(getNextTheme(current));
    });
  }

  // ─── Timezone / zone helpers ───────────────────────────────────────────────

  function isValidTimezone(tz) {
    try {
      Intl.DateTimeFormat('en-US', { timeZone: tz }).format(new Date());
      return true;
    } catch (e) {
      return false;
    }
  }

  function normalizeTimezoneInput(value) {
    return String(value || '').trim();
  }

  function zoneOffsetMinutes(date, zone) {
    var zoneDateString = date.toLocaleString('en-US', { timeZone: zone });
    var zoneDate = new Date(zoneDateString);
    return (zoneDate.getTime() - date.getTime()) / 60000;
  }

  function prettyDiff(gtOffsetMin, targetOffsetMin) {
    var diffHours = Math.round((targetOffsetMin - gtOffsetMin) / 60);
    if (diffHours === 0) {
      return 'Misma hora que GT';
    }
    if (diffHours > 0) {
      return 'GT +' + diffHours + 'h';
    }
    return 'GT ' + diffHours + 'h';
  }

  function prettyZoneName(tz) {
    var parts = tz.split('/');
    var city = parts[parts.length - 1].replace(/_/g, ' ');
    var region = parts[0] || 'Custom';
    return {
      city: city,
      region: region
    };
  }

  // ─── Country helpers ───────────────────────────────────────────────────────

  function countryFlagEmoji(cca2) {
    if (!cca2 || cca2.length !== 2) return '🌍';
    if (typeof String.fromCodePoint !== 'function') return cca2.toUpperCase();
    try {
      var chars = cca2.toUpperCase().split('');
      return String.fromCodePoint(chars[0].charCodeAt(0) + 127397) +
             String.fromCodePoint(chars[1].charCodeAt(0) + 127397);
    } catch (e) {
      return cca2.toUpperCase();
    }
  }

  // ─── Weather helpers ───────────────────────────────────────────────────────

  function weatherIconByCode(code) {
    if (code === 0 || code === 1) {
      return { cls: 'icon-sun', icon: 'fa-sun' };
    }
    if (code === 2) {
      return { cls: 'icon-cloud', icon: 'fa-cloud-sun' };
    }
    if (code === 3) {
      return { cls: 'icon-cloud', icon: 'fa-cloud' };
    }
    if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) {
      return { cls: 'icon-rain', icon: 'fa-cloud-showers-heavy' };
    }
    if (code >= 95) {
      return { cls: 'icon-storm', icon: 'fa-cloud-bolt' };
    }
    if (code >= 71 && code <= 86) {
      return { cls: 'icon-snow', icon: 'fa-snowflake' };
    }
    if (code === 45 || code === 48) {
      return { cls: 'icon-fog', icon: 'fa-smog' };
    }
    return { cls: 'icon-cloud', icon: 'fa-cloud' };
  }

  function weatherLabelByCode(code) {
    if (code === 0 || code === 1) {
      return 'Despejado';
    }
    if (code === 2 || code === 3) {
      return 'Nublado';
    }
    if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) {
      return 'Lluvia';
    }
    if (code >= 95) {
      return 'Tormenta';
    }
    if (code >= 71 && code <= 86) {
      return 'Nieve';
    }
    if (code === 45 || code === 48) {
      return 'Neblina';
    }
    return 'Variable';
  }

  function weatherToneClassByCode(code) {
    if (code === 0 || code === 1) {
      return 'weather-tone-clear';
    }
    if (code === 2 || code === 3) {
      return 'weather-tone-cloud';
    }
    if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) {
      return 'weather-tone-rain';
    }
    if (code >= 95) {
      return 'weather-tone-storm';
    }
    if (code >= 71 && code <= 86) {
      return 'weather-tone-snow';
    }
    if (code === 45 || code === 48) {
      return 'weather-tone-fog';
    }
    return 'weather-tone-cloud';
  }

  // ─── localStorage ──────────────────────────────────────────────────────────

  function loadCustomZones() {
    var raw = localStorage.getItem(CUSTOM_ZONES_KEY);
    if (!raw) {
      state.customZones = [];
      return;
    }

    try {
      var list = JSON.parse(raw);
      var out = [];
      if (Object.prototype.toString.call(list) === '[object Array]') {
        for (var i = 0; i < list.length; i++) {
          var tz = normalizeTimezoneInput(list[i]);
          if (tz !== '' && isValidTimezone(tz) && out.indexOf(tz) < 0) {
            out.push(tz);
          }
        }
      }
      state.customZones = out;
    } catch (e) {
      state.customZones = [];
    }
  }

  function saveCustomZones() {
    localStorage.setItem(CUSTOM_ZONES_KEY, JSON.stringify(state.customZones));
  }

  function loadCustomCountries() {
    var raw = localStorage.getItem(CUSTOM_COUNTRIES_KEY);
    if (!raw) {
      state.customCountries = [];
      return;
    }
    try {
      var list = JSON.parse(raw);
      if (Object.prototype.toString.call(list) === '[object Array]') {
        state.customCountries = list.filter(function (c) {
          return c && c.name && c.capital && c.iana && c.cca2 &&
                 typeof c.lat === 'number' && typeof c.lon === 'number' &&
                 isValidTimezone(c.iana);
        });
      } else {
        state.customCountries = [];
      }
    } catch (e) {
      state.customCountries = [];
    }
  }

  function saveCustomCountries() {
    localStorage.setItem(CUSTOM_COUNTRIES_KEY, JSON.stringify(state.customCountries));
  }

  function loadCardOrder() {
    var raw = localStorage.getItem(CARD_ORDER_KEY);
    if (!raw) {
      state.cardOrder = [];
      return;
    }

    try {
      var arr = JSON.parse(raw);
      if (Object.prototype.toString.call(arr) === '[object Array]') {
        state.cardOrder = arr;
      } else {
        state.cardOrder = [];
      }
    } catch (e) {
      state.cardOrder = [];
    }
  }

  function saveCardOrder(orderKeys) {
    localStorage.setItem(CARD_ORDER_KEY, JSON.stringify(orderKeys));
    state.cardOrder = orderKeys;
  }

  // ─── Cards data ────────────────────────────────────────────────────────────

  function buildCardsData() {
    var cards = [];

    cards.push({
      id: 'gt',
      label: 'Guatemala',
      city: 'Guatemala City',
      iana: state.gtZone,
      orderKey: '__GT__',
      isBase: true,
      weatherKey: null,
      isCustom: false,
      isCountry: false
    });

    for (var i = 0; i < state.usaZones.length; i++) {
      var zone = state.usaZones[i];
      cards.push({
        id: 'usa-' + i,
        label: zone.label,
        city: zone.city,
        iana: zone.iana,
        orderKey: zone.iana,
        isBase: false,
        weatherKey: null,
        isCustom: false,
        isCountry: false
      });
    }

    for (var z = 0; z < state.customZones.length; z++) {
      var customTz = state.customZones[z];
      var meta = prettyZoneName(customTz);
      cards.push({
        id: 'custom-' + z,
        label: meta.city,
        city: meta.region,
        iana: customTz,
        orderKey: customTz,
        isBase: false,
        weatherKey: null,
        isCustom: true,
        isCountry: false
      });
    }

    for (var p = 0; p < state.customCountries.length; p++) {
      var country = state.customCountries[p];
      cards.push({
        id: 'country-' + p,
        label: country.flag + ' ' + country.name,
        city: country.capital,
        iana: country.iana,
        orderKey: 'country-' + country.cca2,
        isBase: false,
        weatherKey: null,
        isCustom: false,
        isCountry: true,
        countryData: country
      });
    }

    for (var c = 0; c < cards.length; c++) {
      for (var w = 0; w < state.weatherLocations.length; w++) {
        if (cards[c].iana === state.weatherLocations[w].timezone) {
          cards[c].weatherKey = state.weatherLocations[w].key;
          break;
        }
      }
    }

    if (state.cardOrder.length) {
      var byKey = {};
      for (var k = 0; k < cards.length; k++) {
        byKey[cards[k].orderKey] = cards[k];
      }

      var reordered = [];
      for (var o = 0; o < state.cardOrder.length; o++) {
        var key = state.cardOrder[o];
        if (byKey[key]) {
          reordered.push(byKey[key]);
          delete byKey[key];
        }
      }
      for (var r = 0; r < cards.length; r++) {
        if (byKey[cards[r].orderKey]) {
          reordered.push(cards[r]);
        }
      }
      cards = reordered;
    }

    state.cards = cards;
  }

  // ─── Cards UI ──────────────────────────────────────────────────────────────

  function cardBadgeLabel(card) {
    if (card.isBase) return 'Base GT';
    if (card.isCountry) return 'País';
    if (card.isCustom) return 'Extra';
    return 'USA';
  }

  function buildCardsUI() {
    var html = '';
    for (var i = 0; i < state.cards.length; i++) {
      var card = state.cards[i];
      var badgeExtra = card.isCountry ? ' zone-badge-country' : '';

      html += '<article class="zone-card" id="card-' + card.id + '" draggable="true" data-order-key="' + card.orderKey + '">';
      html += '<div class="zone-card-header">';
      html += '<div>';
      html += '<div class="zone-name">' + card.label + '</div>';
      html += '<div class="zone-city">' + card.city + '</div>';
      html += '</div>';
      html += '<div class="zone-header-actions">';
      html += '<span class="zone-badge' + badgeExtra + '">' + cardBadgeLabel(card) + '</span>';
      html += '<span class="zone-badge zone-abbr" id="abbr-' + card.id + '">--</span>';
      html += '<button class="zone-order-btn" type="button" data-move-up="' + card.orderKey + '" aria-label="Subir card"><i class="fa-solid fa-arrow-up"></i></button>';
      html += '<button class="zone-order-btn" type="button" data-move-down="' + card.orderKey + '" aria-label="Bajar card"><i class="fa-solid fa-arrow-down"></i></button>';
      if (card.isCustom) {
        html += '<button class="zone-remove-btn" type="button" data-remove-zone="' + card.iana + '" aria-label="Eliminar zona">x</button>';
      }
      if (card.isCountry) {
        html += '<button class="zone-remove-btn" type="button" data-remove-country="' + card.countryData.cca2 + '" aria-label="Eliminar país">x</button>';
      }
      html += '</div>';
      html += '</div>';

      html += '<div class="zone-time" id="time-' + card.id + '">--:--:--</div>';
      html += '<div class="zone-date" id="date-' + card.id + '">Cargando fecha...</div>';
      html += '<div class="zone-iana" id="iana-' + card.id + '">' + card.iana + '</div>';
      html += '<div class="zone-offset" id="offset-' + card.id + '">Calculando...</div>';

      html += '<div class="weather-row">';
      html += '<div class="weather-icon icon-cloud" id="icon-' + card.id + '"><i class="fa-solid fa-cloud"></i></div>';
      html += '<div>';
      html += '<div class="weather-main">';
      html += '<span class="card-temp" id="temp-' + card.id + '">-- C</span>';
      html += '<span class="card-weather-label" id="summary-' + card.id + '">Cargando clima...</span>';
      html += '</div>';
      html += '<div class="weather-meta" id="meta-' + card.id + '"></div>';
      html += '</div>';
      html += '</div>';
      html += '</article>';
    }
    elCards.innerHTML = html;

    for (var j = 0; j < state.cards.length; j++) {
      var id = state.cards[j].id;
      state.cardRefs[id] = {
        time: document.getElementById('time-' + id),
        date: document.getElementById('date-' + id),
        abbr: document.getElementById('abbr-' + id),
        iana: document.getElementById('iana-' + id),
        offset: document.getElementById('offset-' + id),
        icon: document.getElementById('icon-' + id),
        temp: document.getElementById('temp-' + id),
        summary: document.getElementById('summary-' + id),
        meta: document.getElementById('meta-' + id)
      };

      var cardEl = document.getElementById('card-' + id);
      if (cardEl) {
        cardEl.style.animationDelay = ((j % 8) * 60) + 'ms';
      }
    }

    bindRemoveZoneButtons();
    bindRemoveCountryButtons();
    bindOrderButtons();
    bindCardDragAndDrop();
  }

  // ─── Remove buttons ────────────────────────────────────────────────────────

  function bindRemoveZoneButtons() {
    var buttons = elCards.querySelectorAll('[data-remove-zone]');
    for (var i = 0; i < buttons.length; i++) {
      buttons[i].addEventListener('click', function () {
        removeCustomZone(this.getAttribute('data-remove-zone'));
      });
    }
  }

  function bindRemoveCountryButtons() {
    var buttons = elCards.querySelectorAll('[data-remove-country]');
    for (var i = 0; i < buttons.length; i++) {
      buttons[i].addEventListener('click', function () {
        removeCustomCountry(this.getAttribute('data-remove-country'));
      });
    }
  }

  // ─── Order / drag-and-drop ─────────────────────────────────────────────────

  function getCurrentOrderKeysFromState() {
    var keys = [];
    for (var i = 0; i < state.cards.length; i++) {
      keys.push(state.cards[i].orderKey);
    }
    return keys;
  }

  function moveCardByDelta(orderKey, delta) {
    var keys = getCurrentOrderKeysFromState();
    var idx = keys.indexOf(orderKey);
    if (idx < 0) {
      return;
    }
    var target = idx + delta;
    if (target < 0 || target >= keys.length) {
      return;
    }

    var temp = keys[idx];
    keys[idx] = keys[target];
    keys[target] = temp;
    saveCardOrder(keys);
    redrawCards();
  }

  function bindOrderButtons() {
    var ups = elCards.querySelectorAll('[data-move-up]');
    var downs = elCards.querySelectorAll('[data-move-down]');

    for (var i = 0; i < ups.length; i++) {
      ups[i].addEventListener('click', function () {
        moveCardByDelta(this.getAttribute('data-move-up'), -1);
      });
    }
    for (var j = 0; j < downs.length; j++) {
      downs[j].addEventListener('click', function () {
        moveCardByDelta(this.getAttribute('data-move-down'), 1);
      });
    }
  }

  function bindCardDragAndDrop() {
    var cards = elCards.querySelectorAll('.zone-card');

    function clearDropTargets() {
      var activeTargets = elCards.querySelectorAll('.zone-card.is-drop-target');
      for (var t = 0; t < activeTargets.length; t++) {
        activeTargets[t].classList.remove('is-drop-target');
      }
    }

    function applyDomOrderToStorage() {
      var ordered = [];
      var domCards = elCards.querySelectorAll('.zone-card');
      for (var i = 0; i < domCards.length; i++) {
        ordered.push(domCards[i].getAttribute('data-order-key'));
      }
      saveCardOrder(ordered);
      redrawCards();
    }

    for (var i = 0; i < cards.length; i++) {
      cards[i].addEventListener('dragstart', function (evt) {
        draggingOrderKey = this.getAttribute('data-order-key');
        this.classList.add('is-dragging');
        if (evt.dataTransfer) {
          evt.dataTransfer.effectAllowed = 'move';
          evt.dataTransfer.setData('text/plain', draggingOrderKey);
        }
      });

      cards[i].addEventListener('dragend', function () {
        draggingOrderKey = null;
        this.classList.remove('is-dragging');
        clearDropTargets();
      });

      cards[i].addEventListener('dragover', function (evt) {
        evt.preventDefault();
        this.classList.add('is-drop-target');
        if (evt.dataTransfer) {
          evt.dataTransfer.dropEffect = 'move';
        }
      });

      cards[i].addEventListener('dragleave', function () {
        this.classList.remove('is-drop-target');
      });

      cards[i].addEventListener('drop', function (evt) {
        evt.preventDefault();
        clearDropTargets();
        var targetKey = this.getAttribute('data-order-key');
        if (!draggingOrderKey || draggingOrderKey === targetKey) {
          return;
        }

        var sourceEl = elCards.querySelector('[data-order-key="' + draggingOrderKey + '"]');
        var targetEl = this;
        if (!sourceEl || !targetEl) {
          return;
        }

        var rect = targetEl.getBoundingClientRect();
        var insertAfter = evt.clientY > (rect.top + rect.height / 2);
        if (insertAfter) {
          targetEl.after(sourceEl);
        } else {
          targetEl.before(sourceEl);
        }

        applyDomOrderToStorage();
      });
    }
  }

  // ─── Time updates ──────────────────────────────────────────────────────────

  function updateTimesOnly() {
    var now = nowServerDate();
    var gtOffset = zoneOffsetMinutes(now, state.gtZone);

    for (var i = 0; i < state.cards.length; i++) {
      var card = state.cards[i];
      var ref = state.cardRefs[card.id];
      var currentOffset = zoneOffsetMinutes(now, card.iana);
      var abbr = formatZoneAbbr(now, card.iana);

      ref.time.textContent = formatTime(now, card.iana);
      ref.date.textContent = formatDate(now, card.iana);
      ref.iana.textContent = card.iana;
      ref.abbr.textContent = abbr;
      ref.offset.textContent = card.isBase ? 'Misma hora GT (referencia)' : prettyDiff(gtOffset, currentOffset);
    }
  }

  // ─── Weather rendering ─────────────────────────────────────────────────────

  function renderWeatherOnCard(cardId, payload) {
    var ref = state.cardRefs[cardId];
    if (!ref) {
      return;
    }

    var weather = payload.weather;
    var icon = weatherIconByCode(weather.weatherCode);
    var toneClass = weatherToneClassByCode(weather.weatherCode);
    var cardEl = document.getElementById('card-' + cardId);

    ref.icon.className = 'weather-icon card-fade ' + icon.cls;
    ref.icon.innerHTML = '<i class="fa-solid ' + icon.icon + '"></i>';
    ref.icon.setAttribute('title', 'Clima: ' + weather.weatherLabel);
    ref.icon.setAttribute('aria-label', 'Clima: ' + weather.weatherLabel);

    if (cardEl) {
      cardEl.classList.remove('weather-tone-clear', 'weather-tone-cloud', 'weather-tone-rain', 'weather-tone-storm', 'weather-tone-snow', 'weather-tone-fog');
      cardEl.classList.add(toneClass);
    }

    ref.temp.textContent = weather.temperatureC + ' C';
    ref.summary.textContent = weather.weatherLabel;
    ref.meta.innerHTML =
      '<span class="meta-pill">Max ' + weather.highC + ' C</span>' +
      '<span class="meta-pill">Min ' + weather.lowC + ' C</span>' +
      '<span class="meta-pill">Viento ' + weather.windKmh + ' km/h</span>' +
      '<span class="meta-pill">Actualizado ' + (weather.updatedAt || '--') + '</span>';
  }

  function renderWeatherError(cardId) {
    var ref = state.cardRefs[cardId];
    if (!ref) {
      return;
    }
    var cardEl = document.getElementById('card-' + cardId);
    if (cardEl) {
      cardEl.classList.remove('weather-tone-clear', 'weather-tone-cloud', 'weather-tone-rain', 'weather-tone-storm', 'weather-tone-snow', 'weather-tone-fog');
      cardEl.classList.add('weather-tone-cloud');
    }
    ref.temp.textContent = '-- C';
    ref.summary.textContent = 'Sin datos de clima';
    ref.meta.innerHTML = '<span class="meta-pill">No disponible</span>';
    ref.icon.className = 'weather-icon card-fade icon-fog';
    ref.icon.innerHTML = '<i class="fa-solid fa-circle-question"></i>';
    ref.icon.setAttribute('title', 'Clima no disponible');
    ref.icon.setAttribute('aria-label', 'Clima no disponible');
  }

  function normalizeWeatherValue(value, fallback) {
    if (value === null || value === undefined || value === '') {
      return fallback;
    }
    return value;
  }

  // ─── Weather fetch ─────────────────────────────────────────────────────────

  function getCoordsForCard(card) {
    // Country cards carry pre-resolved coordinates from the add flow
    if (card.isCountry && card.countryData) {
      return Promise.resolve({
        lat: card.countryData.lat,
        lon: card.countryData.lon,
        label: card.countryData.capital
      });
    }

    if (state.locationByTimezone[card.iana]) {
      return Promise.resolve(state.locationByTimezone[card.iana]);
    }
    if (state.geoCacheByTimezone[card.iana]) {
      return Promise.resolve(state.geoCacheByTimezone[card.iana]);
    }

    var meta = prettyZoneName(card.iana);
    var query = encodeURIComponent(meta.city);
    var geoUrl = 'https://geocoding-api.open-meteo.com/v1/search?name=' + query + '&count=1&language=en&format=json';
    return requestJson(geoUrl).then(function (geo) {
      if (!geo.results || !geo.results.length) {
        throw new Error('No geocoding results');
      }
      var first = geo.results[0];
      var coords = {
        lat: first.latitude,
        lon: first.longitude,
        label: first.name
      };
      state.geoCacheByTimezone[card.iana] = coords;
      return coords;
    });
  }

  function fetchWeatherClientSide(card) {
    return getCoordsForCard(card).then(function (coords) {
      var url = 'https://api.open-meteo.com/v1/forecast?latitude=' + encodeURIComponent(coords.lat) +
        '&longitude=' + encodeURIComponent(coords.lon) +
        '&current=temperature_2m,weather_code,wind_speed_10m,is_day&daily=temperature_2m_max,temperature_2m_min&timezone=' +
        encodeURIComponent(card.iana);

      return requestJson(url).then(function (data) {
        if (!data.current) {
          throw new Error('Missing current weather data');
        }

        var current = data.current;
        var daily = data.daily || {};
        var code = normalizeWeatherValue(current.weather_code, 3);

        return {
          weather: {
            temperatureC: normalizeWeatherValue(current.temperature_2m, '--'),
            windKmh: normalizeWeatherValue(current.wind_speed_10m, '--'),
            weatherCode: code,
            weatherLabel: weatherLabelByCode(code),
            isDay: normalizeWeatherValue(current.is_day, 1) === 1,
            updatedAt: normalizeWeatherValue(current.time, '--'),
            highC: (daily.temperature_2m_max && daily.temperature_2m_max.length) ? daily.temperature_2m_max[0] : '--',
            lowC: (daily.temperature_2m_min && daily.temperature_2m_min.length) ? daily.temperature_2m_min[0] : '--'
          }
        };
      });
    });
  }

  // ─── Network ───────────────────────────────────────────────────────────────

  function setSyncStatus(text) {
    elSync.textContent = text;
  }

  function requestJson(url) {
    return fetch(url, { cache: 'no-store' }).then(function (res) {
      if (!res.ok) {
        throw new Error('HTTP ' + res.status);
      }
      return res.json();
    });
  }

  function syncTime() {
    setSyncStatus('Sincronizando...');
    return requestJson('backend/api/time.php').then(function (data) {
      state.driftMs = data.serverUnixMs - Date.now();
      setSyncStatus('Sincronizado');
    }).catch(function () {
      state.driftMs = 0;
      setSyncStatus('Sin conexion al servidor');
    });
  }

  function loadConfig() {
    return requestJson('backend/api/timezones.php').then(function (data) {
      state.gtZone = data.guatemala.iana;
      state.usaZones = data.usaZones;
      state.weatherLocations = data.weatherLocations;
      elVersion.textContent = data.version;

      state.locationByTimezone = {};
      for (var i = 0; i < state.weatherLocations.length; i++) {
        var loc = state.weatherLocations[i];
        state.locationByTimezone[loc.timezone] = {
          lat: loc.lat,
          lon: loc.lon,
          label: loc.label
        };
      }

      buildCardsData();
      buildCardsUI();
      updateTimesOnly();
    });
  }

  // ─── Add / remove zones ────────────────────────────────────────────────────

  function addCustomZone(zone) {
    var tz = normalizeTimezoneInput(zone);
    if (tz === '') {
      alert('Escribe una zona IANA valida, por ejemplo Europe/Madrid');
      return;
    }
    if (!isValidTimezone(tz)) {
      alert('Zona invalida. Usa formato IANA, por ejemplo America/Phoenix');
      return;
    }

    var existsInFixed = false;
    if (tz === state.gtZone) {
      existsInFixed = true;
    }
    for (var i = 0; i < state.usaZones.length; i++) {
      if (state.usaZones[i].iana === tz) {
        existsInFixed = true;
        break;
      }
    }
    if (existsInFixed || state.customZones.indexOf(tz) >= 0) {
      alert('Esa zona ya existe en tus cards.');
      return;
    }

    state.customZones.push(tz);
    saveCustomZones();
    elZoneInput.value = '';
    redrawCards();
  }

  function removeCustomZone(zone) {
    var next = [];
    for (var i = 0; i < state.customZones.length; i++) {
      if (state.customZones[i] !== zone) {
        next.push(state.customZones[i]);
      }
    }
    state.customZones = next;
    saveCustomZones();
    redrawCards();
  }

  // ─── Add / remove countries ────────────────────────────────────────────────

  var _countryFeedbackTimer = null;

  function showCountryFeedback(msg, isError) {
    if (!elCountryFeedback) return;
    elCountryFeedback.textContent = msg;
    elCountryFeedback.className = 'country-feedback ' + (isError ? 'country-feedback-error' : 'country-feedback-ok');
    if (_countryFeedbackTimer) clearTimeout(_countryFeedbackTimer);
    _countryFeedbackTimer = setTimeout(function () {
      elCountryFeedback.textContent = '';
      elCountryFeedback.className = 'country-feedback';
    }, 4000);
  }

  function setCountryBtnLoading(loading) {
    if (!elAddCountryBtn) return;
    if (loading) {
      elAddCountryBtn.disabled = true;
      elAddCountryBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Buscando...';
    } else {
      elAddCountryBtn.disabled = false;
      elAddCountryBtn.innerHTML = '<i class="fa-solid fa-flag"></i> Agregar país';
    }
  }

  function timezoneCity(iana) {
    var parts = iana.split('/');
    return parts[parts.length - 1].replace(/_/g, ' ');
  }

  function addCustomCountry(input) {
    var query = String(input || '').trim();
    if (!query) {
      showCountryFeedback('Escribe el nombre de un pais, ej: Ecuador, France, Japan', true);
      return;
    }

    // Quick duplicate check before hitting any API
    for (var d = 0; d < state.customCountries.length; d++) {
      if (state.customCountries[d].name.toLowerCase() === query.toLowerCase()) {
        showCountryFeedback(state.customCountries[d].name + ' ya esta en tus cards.', true);
        return;
      }
    }

    setCountryBtnLoading(true);
    setSyncStatus('Buscando pais...');

    // Use Open-Meteo geocoding — same API already used for weather (fast, reliable, no extra dependency)
    var geoUrl = 'https://geocoding-api.open-meteo.com/v1/search?name=' +
                 encodeURIComponent(query) + '&count=1&language=en&format=json';

    requestJson(geoUrl).then(function (geo) {
      if (!geo.results || !geo.results.length) {
        throw new Error('No se encontro "' + query + '". Prueba en ingles, ej: Ecuador, France, Japan');
      }

      var loc = geo.results[0];

      var cca2 = (loc.country_code || 'XX').toUpperCase();
      var countryName = loc.country || loc.name || query;
      // Use timezone city as the location label (e.g. "America/Guayaquil" → "Guayaquil")
      var iana = loc.timezone || '';
      var cityLabel = iana ? timezoneCity(iana) : (loc.name || query);
      var flag = countryFlagEmoji(cca2);

      if (!iana || !isValidTimezone(iana)) {
        throw new Error('Zona horaria no disponible para "' + countryName + '"');
      }

      // Reject duplicate by cca2
      for (var j = 0; j < state.customCountries.length; j++) {
        if (state.customCountries[j].cca2 === cca2) {
          setCountryBtnLoading(false);
          setSyncStatus('Sincronizado');
          showCountryFeedback(countryName + ' ya esta en tus cards.', true);
          return;
        }
      }

      var countryData = {
        name: countryName,
        capital: cityLabel,
        iana: iana,
        lat: loc.latitude,
        lon: loc.longitude,
        flag: flag,
        cca2: cca2,
        region: loc.admin1 || ''
      };

      state.customCountries.push(countryData);
      saveCustomCountries();
      elCountryInput.value = '';
      setCountryBtnLoading(false);
      setSyncStatus('Sincronizado');
      showCountryFeedback(flag + ' ' + countryName + ' agregado!', false);
      redrawCards();
    }).catch(function (err) {
      setCountryBtnLoading(false);
      setSyncStatus('Sincronizado');
      var msg = err && err.message ? err.message : 'Error de red. Verifica tu conexion a internet.';
      showCountryFeedback(msg, true);
      if (window.console) console.error('[addCustomCountry]', err);
    });
  }

  function removeCustomCountry(cca2) {
    var next = [];
    for (var i = 0; i < state.customCountries.length; i++) {
      if (state.customCountries[i].cca2 !== cca2) {
        next.push(state.customCountries[i]);
      }
    }
    state.customCountries = next;
    saveCustomCountries();
    redrawCards();
  }

  // ─── Redraw ────────────────────────────────────────────────────────────────

  function redrawCards() {
    state.cardRefs = {};
    buildCardsData();
    buildCardsUI();
    updateTimesOnly();
    refreshWeatherAllCards();
  }

  // ─── Timezone suggestions ──────────────────────────────────────────────────

  function fallbackTimezoneSuggestions() {
    if (typeof Intl.supportedValuesOf === 'function') {
      try {
        return Intl.supportedValuesOf('timeZone');
      } catch (e) {
        return [];
      }
    }
    return [];
  }

  function renderTimezoneSuggestions(items) {
    var limited = [];
    for (var i = 0; i < items.length && i < 400; i++) {
      limited.push(items[i]);
    }

    var html = '';
    for (var j = 0; j < limited.length; j++) {
      html += '<option value="' + limited[j] + '"></option>';
    }
    elSuggestions.innerHTML = html;
  }

  function loadTimezoneSuggestions() {
    return requestJson('https://worldtimeapi.org/api/timezone').then(function (zones) {
      if (Object.prototype.toString.call(zones) !== '[object Array]') {
        zones = fallbackTimezoneSuggestions();
      }
      state.timezoneSuggestions = zones;
      renderTimezoneSuggestions(zones);
    }).catch(function () {
      var fallback = fallbackTimezoneSuggestions();
      state.timezoneSuggestions = fallback;
      renderTimezoneSuggestions(fallback);
    });
  }

  // ─── Weather refresh all cards ─────────────────────────────────────────────

  function refreshWeatherAllCards() {
    var calls = [];

    for (var i = 0; i < state.cards.length; i++) {
      (function (card) {
        var p = fetchWeatherClientSide(card)
          .then(function (data) {
            renderWeatherOnCard(card.id, data);
          })
          .catch(function () {
            renderWeatherError(card.id);
          });
        calls.push(p);
      })(state.cards[i]);
    }

    return Promise.all(calls);
  }

  // ─── Boot ──────────────────────────────────────────────────────────────────

  function boot() {
    initTheme();
    loadCustomZones();
    loadCustomCountries();
    loadCardOrder();

    elAddZoneBtn.addEventListener('click', function () {
      addCustomZone(elZoneInput.value);
    });

    elZoneInput.addEventListener('keydown', function (evt) {
      if (evt.key === 'Enter') {
        evt.preventDefault();
        addCustomZone(elZoneInput.value);
      }
    });

    if (elAddCountryBtn) {
      elAddCountryBtn.addEventListener('click', function () {
        addCustomCountry(elCountryInput.value);
      });
    }

    if (elCountryInput) {
      elCountryInput.addEventListener('keydown', function (evt) {
        if (evt.key === 'Enter') {
          evt.preventDefault();
          addCustomCountry(elCountryInput.value);
        }
      });
    }

    loadConfig().then(function () {
      return loadTimezoneSuggestions();
    }).then(function () {
      return syncTime();
    }).then(function () {
      updateTimesOnly();
      setInterval(updateTimesOnly, 1000);
      refreshWeatherAllCards();
      setInterval(refreshWeatherAllCards, 600000);
    }).catch(function (err) {
      setSyncStatus('Error de inicializacion');
      if (window.console && window.console.error) {
        console.error(err);
      }
    });
  }

  boot();
})();
