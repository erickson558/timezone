(function () {
  'use strict';

  var elSync = document.getElementById('sync-status');
  var elVersion = document.getElementById('app-version');
  var elCards = document.getElementById('zone-cards');
  var elThemeToggle = document.getElementById('theme-toggle');
  var elThemeLabel = document.getElementById('theme-label');

  var state = {
    driftMs: 0,
    gtZone: 'America/Guatemala',
    usaZones: [],
    weatherLocations: [],
    cards: [],
    cardRefs: {}
  };

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

  function normalizeTheme(theme) {
    return theme === 'dark' ? 'dark' : 'light';
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

  function buildCardsData() {
    var cards = [];
    cards.push({
      id: 'gt',
      label: 'Guatemala',
      city: 'Guatemala City',
      iana: state.gtZone,
      isBase: true,
      weatherKey: null
    });

    for (var i = 0; i < state.usaZones.length; i++) {
      var zone = state.usaZones[i];
      cards.push({
        id: 'usa-' + i,
        label: zone.label,
        city: zone.city,
        iana: zone.iana,
        isBase: false,
        weatherKey: null
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

    state.cards = cards;
  }

  function buildCardsUI() {
    var html = '';
    for (var i = 0; i < state.cards.length; i++) {
      var card = state.cards[i];
      html += '<article class="zone-card" id="card-' + card.id + '">';
      html += '<div class="zone-card-header">';
      html += '<div>';
      html += '<div class="zone-name">' + card.label + '</div>';
      html += '<div class="zone-city">' + card.city + '</div>';
      html += '</div>';
      html += '<span class="zone-badge">' + (card.isBase ? 'Base GT' : 'USA') + '</span>';
      html += '</div>';

      html += '<div class="zone-time" id="time-' + card.id + '">--:--:--</div>';
      html += '<div class="zone-date" id="date-' + card.id + '">Cargando fecha...</div>';
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
        offset: document.getElementById('offset-' + id),
        icon: document.getElementById('icon-' + id),
        temp: document.getElementById('temp-' + id),
        summary: document.getElementById('summary-' + id),
        meta: document.getElementById('meta-' + id)
      };
    }
  }

  function updateTimesOnly() {
    var now = nowServerDate();
    var gtOffset = zoneOffsetMinutes(now, state.gtZone);

    for (var i = 0; i < state.cards.length; i++) {
      var card = state.cards[i];
      var ref = state.cardRefs[card.id];
      var currentOffset = zoneOffsetMinutes(now, card.iana);

      ref.time.textContent = formatTime(now, card.iana);
      ref.date.textContent = formatDate(now, card.iana) + ' (' + card.iana + ')';
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

    ref.icon.className = 'weather-icon card-fade ' + icon.cls;
    ref.icon.innerHTML = '<i class="fa-solid ' + icon.icon + '"></i>';

    ref.temp.textContent = weather.temperatureC + ' C';
    ref.summary.textContent = weather.weatherLabel;
    ref.meta.innerHTML =
      '<span class="meta-pill">Max ' + weather.highC + ' C</span>' +
      '<span class="meta-pill">Min ' + weather.lowC + ' C</span>' +
      '<span class="meta-pill">Viento ' + weather.windKmh + ' km/h</span>';
  }

  function renderWeatherError(cardId) {
    var ref = state.cardRefs[cardId];
    if (!ref) {
      return;
    }
    ref.temp.textContent = '-- C';
    ref.summary.textContent = 'Sin datos de clima';
    ref.meta.innerHTML = '<span class="meta-pill">No disponible</span>';
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

      buildCardsData();
      buildCardsUI();
      updateTimesOnly();
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

        var p = requestJson('backend/api/weather.php?location=' + encodeURIComponent(card.weatherKey))
          .then(function (data) {
            renderWeatherOnCard(card.id, data);
            elVersion.textContent = data.version;
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

    loadConfig().then(function () {
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
