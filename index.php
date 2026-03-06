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
  <div class="ambient-bg" aria-hidden="true">
    <span class="blob blob-a"></span>
    <span class="blob blob-b"></span>
    <span class="blob blob-c"></span>
  </div>

  <div class="app-shell">
    <header class="topbar">
      <div>
        <h1 class="brand">GT vs USA Timeboard</h1>
        <p class="header-subtitle">Hora, diferencia horaria y clima en cada zona</p>
      </div>
      <div class="topbar-actions">
        <label class="theme-select-wrap" for="theme-selector">
          <i class="fa-solid fa-palette"></i>
          <select id="theme-selector" class="theme-select" aria-label="Seleccionar tema visual">
            <option value="win98">Windows 98</option>
            <option value="winxp">Windows XP</option>
            <option value="vista">Windows Vista</option>
            <option value="win7">Windows 7</option>
          </select>
        </label>
        <button id="theme-toggle" class="theme-btn" type="button" aria-label="Cambiar tema claro u oscuro">
          <i class="fa-solid fa-circle-half-stroke"></i>
          <span id="theme-label">Cambiar tema</span>
        </button>
        <span class="version-pill">Version <span id="app-version">V0.0.0</span></span>
      </div>
    </header>

    <p class="sync-row">Estado de sincronizacion: <strong id="sync-status">Iniciando...</strong></p>

    <main>
      <section>
        <div class="controls-bar">
          <h2 class="section-title">Cards de zonas horarias y clima</h2>
          <div class="zone-controls">
            <input id="zone-input" class="zone-input" list="timezone-suggestions" placeholder="Agregar zona IANA (ej: Europe/Madrid)">
            <datalist id="timezone-suggestions"></datalist>
            <button id="add-zone-btn" class="zone-btn" type="button"><i class="fa-solid fa-plus"></i> Agregar zona</button>
          </div>
        </div>
        <div id="zone-cards" class="cards-grid"></div>
        <p class="api-note">Clima y grados: Open-Meteo (gratis). Lista de zonas: WorldTimeAPI (gratis, con respaldo local).</p>
      </section>
    </main>
  </div>

  <script src="assets/js/app.js"></script>
</body>
</html>
