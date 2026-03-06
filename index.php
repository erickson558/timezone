<?php
@ini_set('display_errors', '0');
@ini_set('default_charset', 'UTF-8');
?>
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="description" content="Reloj en vivo GT vs zonas de USA con comparacion horaria y clima animado estilo iPhone.">
  <title>GT vs USA Time and Weather</title>
  <link rel="icon" type="image/x-icon" href="app.ico">

  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&family=Outfit:wght@500;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css">
  <link rel="stylesheet" href="assets/css/styles.css">
</head>
<body>
  <div class="app-shell">
    <header class="topbar">
      <h1 class="brand">GT vs USA Timeboard</h1>
      <span class="version-pill">Version <span id="app-version">V0.0.0</span></span>
    </header>

    <main class="grid">
      <section class="glass card-fade">
        <h2 class="section-title">Hora actual en Guatemala</h2>
        <p id="gt-time" class="gt-time">--:--:--</p>
        <p id="gt-date" class="subtle">Cargando fecha...</p>
        <p class="subtle">Estado de sincronizacion: <strong id="sync-status">Iniciando...</strong></p>

        <h3 class="section-title" style="margin-top:16px;">Comparacion GT vs zonas USA</h3>
        <div id="compare-list" class="compare-list"></div>
      </section>

      <section class="glass card-fade">
        <h2 class="section-title">Clima en vivo</h2>
        <div class="weather-wrap">
          <div class="weather-top">
            <select id="weather-location" class="weather-select" aria-label="Seleccion de ciudad para clima"></select>
          </div>

          <div class="weather-core">
            <div id="weather-icon" class="weather-icon icon-cloud"><i class="fa-solid fa-cloud"></i></div>
            <div>
              <div id="weather-temp" class="temp">-- C</div>
              <p id="weather-summary" class="subtle">Cargando clima...</p>
            </div>
          </div>

          <div id="weather-meta" class="weather-meta"></div>
        </div>
      </section>
    </main>
  </div>

  <script src="assets/js/app.js"></script>
</body>
</html>
