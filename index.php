
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
            <option value="aurora-flow">Aurora Flow</option>
            <option value="neon-grid">Neon Grid</option>
            <option value="sunset-drive">Sunset Drive</option>
            <option value="ice-mineral">Ice Mineral</option>
            <option value="graphite-pop">Graphite Pop</option>
          </select>
        </label>
        <button id="theme-toggle" class="theme-btn" type="button" aria-label="Cambiar tema visual">
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
            <input id="zone-input" class="zone-input" list="timezone-suggestions" placeholder="Zona IANA (ej: Europe/Madrid)">
            <datalist id="timezone-suggestions"></datalist>
            <button id="add-zone-btn" class="zone-btn" type="button"><i class="fa-solid fa-plus"></i> Agregar zona</button>
            <span class="controls-sep" aria-hidden="true"></span>
            <input id="country-input" class="zone-input" list="country-suggestions" placeholder="País (ej: Francia, Japan, Alemania)">
            <datalist id="country-suggestions">
              <option value="Afghanistan"><option value="Albania"><option value="Algeria">
              <option value="Argentina"><option value="Australia"><option value="Austria">
              <option value="Belgium"><option value="Bolivia"><option value="Brazil">
              <option value="Canada"><option value="Chile"><option value="China">
              <option value="Colombia"><option value="Croatia"><option value="Cuba">
              <option value="Czech Republic"><option value="Denmark"><option value="Ecuador">
              <option value="Egypt"><option value="Ethiopia"><option value="Finland">
              <option value="France"><option value="Germany"><option value="Greece">
              <option value="Guatemala"><option value="Honduras"><option value="Hungary">
              <option value="India"><option value="Indonesia"><option value="Iran">
              <option value="Iraq"><option value="Ireland"><option value="Israel">
              <option value="Italy"><option value="Japan"><option value="Jordan">
              <option value="Kenya"><option value="Malaysia"><option value="Mexico">
              <option value="Morocco"><option value="Netherlands"><option value="New Zealand">
              <option value="Nicaragua"><option value="Nigeria"><option value="Norway">
              <option value="Pakistan"><option value="Panama"><option value="Paraguay">
              <option value="Peru"><option value="Philippines"><option value="Poland">
              <option value="Portugal"><option value="Romania"><option value="Russia">
              <option value="Saudi Arabia"><option value="Singapore"><option value="South Africa">
              <option value="South Korea"><option value="Spain"><option value="Sweden">
              <option value="Switzerland"><option value="Thailand"><option value="Turkey">
              <option value="Ukraine"><option value="United Kingdom"><option value="United States">
              <option value="Uruguay"><option value="Venezuela"><option value="Vietnam">
            </datalist>
            <button id="add-country-btn" class="zone-btn zone-btn-country" type="button"><i class="fa-solid fa-flag"></i> Agregar país</button>
          </div>
          <div id="country-feedback" class="country-feedback" role="status" aria-live="polite"></div>
        </div>
        <div id="zone-cards" class="cards-grid"></div>
        <p class="api-note">Clima, zonas y paises: Open-Meteo (gratis). Lista de zonas: WorldTimeAPI (gratis, con respaldo local).</p>
      </section>
    </main>
  </div>

  <script src="assets/js/app.js?v=<?php echo filemtime(__DIR__ . '/assets/js/app.js'); ?>"></script>
</body>
</html>
