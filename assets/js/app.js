(function () {
  'use strict';

  var elGtTime = document.getElementById('gt-time');
  var elGtDate = document.getElementById('gt-date');
  var elSync = document.getElementById('sync-status');
  var elCompare = document.getElementById('compare-list');
  var elVersion = document.getElementById('app-version');
  var elWeatherLocation = document.getElementById('weather-location');
  var elWeatherIcon = document.getElementById('weather-icon');
  var elWeatherTemp = document.getElementById('weather-temp');
  var elWeatherSummary = document.getElementById('weather-summary');
  var elWeatherMeta = document.getElementById('weather-meta');

  var state = {
    driftMs: 0,
    gtZone: 'America/Guatemala',
    usaZones: [],
    weatherLocations: []
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

  function renderClockAndComparison() {
    var now = nowServerDate();
    var gtTime = formatTime(now, state.gtZone);
    var gtDate = formatDate(now, state.gtZone);

    elGtTime.textContent = gtTime;
    elGtDate.textContent = gtDate + ' (' + state.gtZone + ')';

    var gtOffset = zoneOffsetMinutes(now, state.gtZone);
    var html = '';
    for (var i = 0; i < state.usaZones.length; i++) {
      var zone = state.usaZones[i];
      var targetTime = formatTime(now, zone.iana);
      var targetOffset = zoneOffsetMinutes(now, zone.iana);
      var diffText = prettyDiff(gtOffset, targetOffset);
      html += '<div class="compare-item">';
      html += '<div class="compare-main">';
      html += '<span class="zone-name">' + zone.label + ' - ' + zone.city + '</span>';
      html += '<span class="zone-time">' + targetTime + ' (' + zone.iana + ')</span>';
      html += '</div>';
      html += '<span class="zone-offset">' + diffText + '</span>';
      html += '</div>';
    }
    elCompare.innerHTML = html;
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

  function renderWeather(payload) {
    var weather = payload.weather;
    var icon = weatherIconByCode(weather.weatherCode);

    elWeatherIcon.className = 'weather-icon card-fade ' + icon.cls;
    elWeatherIcon.innerHTML = '<i class="fa-solid ' + icon.icon + '"></i>';

    elWeatherTemp.textContent = weather.temperatureC + ' C';
    elWeatherSummary.textContent = weather.weatherLabel;
    elWeatherMeta.innerHTML =
      '<span class="meta-pill">Max: ' + weather.highC + ' C</span>' +
      '<span class="meta-pill">Min: ' + weather.lowC + ' C</span>' +
      '<span class="meta-pill">Viento: ' + weather.windKmh + ' km/h</span>';
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

      var optionsHtml = '';
      for (var i = 0; i < state.weatherLocations.length; i++) {
        var location = state.weatherLocations[i];
        optionsHtml += '<option value="' + location.key + '">' + location.label + '</option>';
      }
      elWeatherLocation.innerHTML = optionsHtml;
    });
  }

  function loadWeather(locationKey) {
    return requestJson('backend/api/weather.php?location=' + encodeURIComponent(locationKey)).then(function (data) {
      renderWeather(data);
      elVersion.textContent = data.version;
    }).catch(function () {
      elWeatherSummary.textContent = 'No se pudo obtener el clima en este momento';
      elWeatherMeta.innerHTML = '';
    });
  }

  function attachEvents() {
    elWeatherLocation.addEventListener('change', function () {
      loadWeather(elWeatherLocation.value);
    });
  }

  function boot() {
    loadConfig().then(function () {
      return syncTime();
    }).then(function () {
      renderClockAndComparison();
      setInterval(renderClockAndComparison, 1000);
      attachEvents();
      loadWeather(elWeatherLocation.value || 'gt-guatemala-city');
    }).catch(function (err) {
      setSyncStatus('Error de inicializacion');
      if (window.console && window.console.error) {
        console.error(err);
      }
    });
  }

  boot();
})();
