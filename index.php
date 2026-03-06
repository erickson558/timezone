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
      <div>
        <h1 class="brand">GT vs USA Timeboard</h1>
        <p class="header-subtitle">Hora, diferencia horaria y clima en cada zona</p>
      </div>
      <div class="topbar-actions">
        <button id="theme-toggle" class="theme-btn" type="button" aria-label="Cambiar tema claro u oscuro">
          <i class="fa-solid fa-circle-half-stroke"></i>
          <span id="theme-label">Modo oscuro</span>
        </button>
        <span class="version-pill">Version <span id="app-version">V0.0.0</span></span>
      </div>
    </header>

    <p class="sync-row">Estado de sincronizacion: <strong id="sync-status">Iniciando...</strong></p>

    <main>
      <section>
        <h2 class="section-title">Cards de zonas horarias y clima</h2>
        <div id="zone-cards" class="cards-grid"></div>
      </section>
    </main>
  </div>

  <script src="assets/js/app.js"></script>
</body>
</html>
