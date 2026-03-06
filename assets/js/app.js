(function () {
  'use strict';

  var elSync = document.getElementById('sync-status');
  var elVersion = document.getElementById('app-version');
  var elCards = document.getElementById('zone-cards');
  var elThemeToggle = document.getElementById('theme-toggle');
  var elThemeLabel = document.getElementById('theme-label');
  var elZoneInput = document.getElementById('zone-input');
  var elAddZoneBtn = document.getElementById('add-zone-btn');
  var elSuggestions = document.getElementById('timezone-suggestions');

  var state = {
    driftMs: 0,
    gtZone: 'America/Guatemala',
    usaZones: [],
    weatherLocations: [],
    locationByTimezone: {},
    geoCacheByTimezone: {},
    customZones: [],
    timezoneSuggestions: [],
    cardOrder: [],
    cards: [],
    cardRefs: {}
  };

  var CUSTOM_ZONES_KEY = 'timezone-custom-zones-v1';
  var CARD_ORDER_KEY = 'timezone-card-order-v1';
  var draggingOrderKey = null;

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

  function normalizeTheme(theme) {
    return theme === 'dark' ? 'dark' : 'light';
  }

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

  function saveCustomZones() {
    localStorage.setItem(CUSTOM_ZONES_KEY, JSON.stringify(state.customZones));
  }

  function applyTheme(theme) {
    var finalTheme = normalizeTheme(theme);
    document.documentElement.setAttribute('data-theme', finalTheme);
    localStorage.setItem('theme-preference', finalTheme);
    elThemeLabel.textContent = finalTheme === 'dark' ? 'Modo claro' : 'Modo oscuro';
  }

  function initTheme() {
    var stored = localStorage.getItem('theme-preference');
    var preferred = stored || 'light';
    applyTheme(preferred);

    elThemeToggle.addEventListener('click', function () {
      var current = document.documentElement.getAttribute('data-theme');
      applyTheme(current === 'dark' ? 'light' : 'dark');
    });
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

  function weatherIconByCode(code) {
    if (code === 0 || code === 1) {
      return { cls: 'icon-sun', icon: 'fa-sun' };
    }
    if (code === 2 || code === 3) {
      return { cls: 'icon-cloud', icon: 'fa-cloud' };
    }
    if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) {
      return { cls: 'icon-rain', icon: 'fa-cloud-rain' };
    }
    if (code >= 95) {
      return { cls: 'icon-storm', icon: 'fa-bolt' };
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

  function weatherRequestForCard(card) {
    return card;
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
      isCustom: false
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
        isCustom: false
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
        isCustom: true
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

  function buildCardsUI() {
    var html = '';
    for (var i = 0; i < state.cards.length; i++) {
      var card = state.cards[i];
      html += '<article class="zone-card" id="card-' + card.id + '" draggable="true" data-order-key="' + card.orderKey + '">';
      html += '<div class="zone-card-header">';
      html += '<div>';
      html += '<div class="zone-name">' + card.label + '</div>';
      html += '<div class="zone-city">' + card.city + '</div>';
      html += '</div>';
      html += '<div class="zone-header-actions">';
      html += '<span class="zone-badge">' + (card.isBase ? 'Base GT' : (card.isCustom ? 'Extra' : 'USA')) + '</span>';
      html += '<span class="zone-badge zone-abbr" id="abbr-' + card.id + '">--</span>';
      html += '<button class="zone-order-btn" type="button" data-move-up="' + card.orderKey + '" aria-label="Subir card"><i class="fa-solid fa-arrow-up"></i></button>';
      html += '<button class="zone-order-btn" type="button" data-move-down="' + card.orderKey + '" aria-label="Bajar card"><i class="fa-solid fa-arrow-down"></i></button>';
      if (card.isCustom) {
        html += '<button class="zone-remove-btn" type="button" data-remove-zone="' + card.iana + '" aria-label="Eliminar zona">x</button>';
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
    }

    bindRemoveZoneButtons();
    bindOrderButtons();
    bindCardDragAndDrop();
  }

  function bindRemoveZoneButtons() {
    var buttons = elCards.querySelectorAll('[data-remove-zone]');
    for (var i = 0; i < buttons.length; i++) {
      buttons[i].addEventListener('click', function () {
        var zone = this.getAttribute('data-remove-zone');
        removeCustomZone(zone);
      });
    }
  }

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
      cards[i].addEventListener('dragstart', function () {
        draggingOrderKey = this.getAttribute('data-order-key');
        this.classList.add('is-dragging');
      });

      cards[i].addEventListener('dragend', function () {
        draggingOrderKey = null;
        this.classList.remove('is-dragging');
      });

      cards[i].addEventListener('dragover', function (evt) {
        evt.preventDefault();
      });

      cards[i].addEventListener('drop', function (evt) {
        evt.preventDefault();
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
    ref.icon.setAttribute('title', 'Clima no disponible');
    ref.icon.setAttribute('aria-label', 'Clima no disponible');
  }

  function normalizeWeatherValue(value, fallback) {
    if (value === null || value === undefined || value === '') {
      return fallback;
    }
    return value;
  }

  function getCoordsForCard(card) {
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

  function redrawCards() {
    state.cardRefs = {};
    buildCardsData();
    buildCardsUI();
    updateTimesOnly();
    refreshWeatherAllCards();
  }

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

  function refreshWeatherAllCards() {
    var calls = [];

    for (var i = 0; i < state.cards.length; i++) {
      (function (card) {
        if (!card.weatherKey) {
          renderWeatherError(card.id);
          return;
        }

        var p = fetchWeatherClientSide(weatherRequestForCard(card))
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

  function boot() {
    initTheme();
    loadCustomZones();
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
