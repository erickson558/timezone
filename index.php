<?php
/**
 * timezones_gt_us_ca.php
 * PHP 5.4.31 compatible
 *
 * Novedades:
 * - Agregar zonas horarias dinámicas "tipo iPhone": se consulta WorldTimeAPI (lista IANA)
 *   desde el cliente y se pueden añadir nuevas tarjetas. Persisten en localStorage.
 * - Botón “Agregar Zona” con modal y autocompletado (simple) por nombre IANA.
 * - El resto se mantiene: relojes en vivo, conversor, modo claro/oscuro, Bootstrap 5, jQuery.
 */

// ------- Mini-endpoint JSON: hora del servidor en UTC -------
if (isset($_GET['action']) && $_GET['action'] === 'time') {
  header('Content-Type: application/json; charset=UTF-8');
  header('X-Content-Type-Options: nosniff');
  header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
  header('Pragma: no-cache');

  $dtUtc = new DateTime('now', new DateTimeZone('UTC'));
  $payload = array(
    'serverUtcIso' => $dtUtc->format('Y-m-d\TH:i:s\Z'),
    'serverUnixMs' => (int)$dtUtc->format('U') * 1000
  );
  echo json_encode($payload);
  exit;
}

@ini_set('display_errors', '0');
@ini_set('default_charset', 'UTF-8');
?>
<!DOCTYPE html>
<html lang="es" data-bs-theme="dark">
<head>
  <meta charset="UTF-8">
  <title>Hora en Guatemala, EE.UU. y Canadá + Reloj Mundial</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">

  <!-- Bootstrap / jQuery / Animate / Icons -->
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
  <script src="https://code.jquery.com/jquery-3.7.1.min.js"></script>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/animate.css/4.1.1/animate.min.css"/>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css"/>

  <style>
    :root{
      --card-grad-1: #1e293b;
      --card-grad-2: #0f172a;
      --accent: #4e73df;
      --success: #1cc88a;
      --warning: #f6c23e;
      --danger:  #e74a3b;
    }
    [data-bs-theme="light"]{
      --card-grad-1: #ffffff;
      --card-grad-2: #f8fafc;
    }
    body {
      background:
        radial-gradient(1200px 600px at 10% -10%, rgba(78,115,223,.15), transparent 60%),
        radial-gradient(800px 400px at 90% 10%, rgba(28,200,138,.12), transparent 60%),
        radial-gradient(700px 500px at 30% 120%, rgba(246,194,62,.12), transparent 60%),
        var(--bs-body-bg);
      min-height: 100vh;
    }
    .brand-title{
      letter-spacing:.2px;
      text-shadow: 0 6px 18px rgba(78,115,223,.35);
    }
    .card-time {
      background: linear-gradient(160deg, var(--card-grad-1), var(--card-grad-2));
      border: 1px solid rgba(255,255,255,.06);
      box-shadow: 0 10px 30px rgba(0,0,0,.25);
      border-radius: 18px;
      overflow: hidden;
      position: relative;
      transition: transform .25s ease, box-shadow .25s ease;
    }
    .card-time:hover{
      transform: translateY(-4px);
      box-shadow: 0 18px 44px rgba(0,0,0,.35);
    }
    .card-time::before{
      content:"";
      position:absolute; inset:0;
      padding:1px; border-radius:18px;
      background: linear-gradient(90deg, rgba(78,115,223,.35), rgba(28,200,138,.35), rgba(246,194,62,.35), rgba(231,74,59,.35), rgba(78,115,223,.35));
      -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
              mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
      -webkit-mask-composite: xor; mask-composite: exclude;
      animation: shimmer 4.5s linear infinite;
      pointer-events:none;
    }
    @keyframes shimmer{
      0%{ background-position: 0% 50%; }
      100%{ background-position: 400% 50%; }
    }
    .clock {
      font-variant-numeric: tabular-nums;
      font-weight: 700;
      font-size: clamp(1.2rem, 2.2vw, 1.8rem);
    }
    .tz-label { font-weight: 600; letter-spacing:.3px; }
    .glow { animation: glow 2.4s ease-in-out infinite; }
    @keyframes glow{ 0%,100%{ text-shadow: 0 0 0 rgba(78,115,223,.0);} 50%{ text-shadow: 0 0 16px rgba(78,115,223,.5);} }
    .chip {
      display:inline-flex; align-items:center; gap:.4rem;
      padding:.25rem .6rem; border-radius:999px;
      background: rgba(78,115,223,.12);
      border:1px solid rgba(78,115,223,.25);
      font-size:.85rem;
    }
    .btn-mode { border-radius: 999px; }
    .soft-shadow { box-shadow: 0 12px 24px rgba(0,0,0,.15); }
    .table-converter td, .table-converter th { vertical-align: middle; }
    .floating-toast { position: fixed; right: 16px; bottom: 16px; z-index: 1080; }
    .badge-tz { font-weight: 500; }
    .btn-remove {
      position:absolute; top:8px; right:8px; z-index: 2;
    }
    .search-hint { font-size:.9rem; }
    .badge-fixed { background: rgba(255,255,255,.08); }
  </style>
</head>
<body class="pb-5">
  <nav class="navbar navbar-expand-lg bg-body-tertiary sticky-top border-bottom">
    <div class="container">
      <a class="navbar-brand brand-title fw-bold" href="#">
        <i class="fa-solid fa-clock-rotate-left me-2 text-primary"></i>Hora GT / US / CA · Reloj mundial
      </a>
      <div class="ms-auto d-flex gap-2">
        <button id="btnAddZone" class="btn btn-primary btn-sm">
          <i class="fa-solid fa-plus"></i> Agregar Zona
        </button>
        <button id="btnToggleTheme" class="btn btn-outline-primary btn-sm btn-mode" type="button" title="Claro / Oscuro">
          <i class="fa-solid fa-circle-half-stroke"></i>
        </button>
        <div class="chip" title="Sincronizado con hora del servidor">
          <i class="fa-solid fa-wifi"></i> <span id="syncStatus">Sincronizando…</span>
        </div>
      </div>
    </div>
  </nav>

  <header class="container py-4">
    <div class="row align-items-center g-4">
      <div class="col-12 col-lg-6">
        <h1 class="display-6 mb-2 animate__animated animate__fadeInDown">Relojes en vivo</h1>
        <p class="text-secondary mb-0">
          Base: <span class="fw-semibold">Guatemala (America/Guatemala)</span> y conversión a zonas IANA.
          Agrega cualquier ciudad/país desde Internet (WorldTimeAPI).
        </p>
        <span class="badge text-bg-info mt-2 badge-fixed">Zonas fijas precargadas (US/CA)</span>
      </div>
      <div class="col-12 col-lg-6">
        <div class="card card-time soft-shadow animate__animated animate__fadeInUp">
          <div class="card-body">
            <div class="d-flex justify-content-between align-items-center mb-2">
              <div class="tz-label">Guatemala</div>
              <span class="badge text-bg-primary badge-tz">America/Guatemala</span>
            </div>
            <div id="clock-gt" class="clock glow">--:--:--</div>
            <small class="text-secondary" id="date-gt">--</small>
          </div>
        </div>
      </div>
    </div>
  </header>

  <main class="container">
    <!-- Tarjetas zonas fijas (US / CA) -->
    <section class="mb-2">
      <div class="d-flex align-items-center justify-content-between mb-1">
        <h2 class="h5 m-0 text-secondary">Zonas precargadas (EE. UU. y Canadá)</h2>
      </div>
      <div class="row g-3" id="cardsRowFixed"><!-- JS --></div>
    </section>

    <!-- Tarjetas zonas personalizadas -->
    <section class="mt-4">
      <div class="d-flex align-items-center justify-content-between mb-1">
        <h2 class="h5 m-0 text-secondary">Mis zonas añadidas</h2>
        <span class="text-secondary small">Se guardan en este navegador</span>
      </div>
      <div class="row g-3" id="cardsRowCustom"><!-- JS --></div>
    </section>

    <!-- Conversor -->
    <section class="mt-4">
      <div class="card soft-shadow">
        <div class="card-body">
          <div class="d-flex flex-column flex-lg-row align-items-lg-end gap-3">
            <div class="flex-grow-1">
              <label class="form-label fw-semibold">Convertir desde Guatemala</label>
              <input type="datetime-local" id="dtInput" class="form-control" />
              <small class="text-secondary">Selecciona una fecha/hora en Guatemala y verás las equivalencias en cada zona.</small>
            </div>
            <div class="d-flex gap-2">
              <button class="btn btn-primary" id="btnConvert"><i class="fa-solid fa-arrows-rotate me-2"></i>Convertir</button>
              <button class="btn btn-outline-secondary" id="btnNowGT"><i class="fa-solid fa-clock me-2"></i>Usar ahora</button>
              <button class="btn btn-outline-success" id="btnCopy"><i class="fa-solid fa-copy me-2"></i>Copiar tabla</button>
            </div>
          </div>

          <div class="table-responsive mt-3">
            <table class="table table-hover align-middle table-converter" id="tblConverter">
              <thead>
                <tr>
                  <th>Zona</th>
                  <th>Ejemplo (Ciudad)</th>
                  <th>IANA</th>
                  <th>Fecha</th>
                  <th>Hora</th>
                  <th>UTC Offset</th>
                  <th>DST</th>
                </tr>
              </thead>
              <tbody id="converterBody"><!-- JS --></tbody>
            </table>
          </div>
          <small class="text-secondary">* Offsets y DST se calculan con el motor de tu navegador para cada zona.</small>
        </div>
      </div>
    </section>
  </main>

  <!-- Toast -->
  <div class="floating-toast">
    <div class="toast align-items-center text-bg-success border-0" id="toastOk" role="alert" aria-live="assertive" aria-atomic="true">
      <div class="d-flex">
        <div class="toast-body"><i class="fa-solid fa-circle-check me-2"></i><span id="toastMsg">Listo</span></div>
        <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
      </div>
    </div>
  </div>

  <!-- Modal Agregar Zona -->
  <div class="modal fade" id="modalAddZone" tabindex="-1" aria-hidden="true">
    <div class="modal-dialog modal-lg modal-dialog-scrollable">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title"><i class="fa-solid fa-earth-americas me-2 text-primary"></i>Agregar zona horaria (IANA)</h5>
          <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Cerrar"></button>
        </div>
        <div class="modal-body">
          <p class="text-secondary search-hint">
            Escribe para filtrar (ej.: <code>Europe/Madrid</code>, <code>America/Mexico_City</code>, <code>Asia/Tokyo</code>). La lista se obtiene de Internet (WorldTimeAPI).
          </p>
          <div class="input-group mb-3">
            <span class="input-group-text"><i class="fa-solid fa-magnifying-glass"></i></span>
            <input type="text" id="inpSearchTz" class="form-control" placeholder="Buscar zona IANA..." autocomplete="off">
            <button class="btn btn-outline-secondary" id="btnReloadTz"><i class="fa-solid fa-rotate"></i></button>
          </div>
          <div class="border rounded p-2" style="max-height:50vh; overflow:auto;">
            <ul class="list-group list-group-flush" id="listTimezones"><!-- JS --></ul>
          </div>
        </div>
        <div class="modal-footer">
          <span class="text-secondary me-auto small" id="tzCount">0 zonas</span>
          <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cerrar</button>
        </div>
      </div>
    </div>
  </div>

  <footer class="container text-center mt-5">
    <p class="text-secondary small mb-0">Hecho con ❤️ · Reloj mundial con zonas IANA · Sincronizado con el servidor · Compatible con PHP 5.4.31</p>
  </footer>

  <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>

  <script>
  (function(){
    // ===== Configuración base =====
    var gtZone = "America/Guatemala";
    var serverEpochMs = null;
    var driftMs = 0;

    // Zonas precargadas (EE.UU. / Canadá)
    var FIXED_ZONES = [
      { group:"USA", label:"US Pacific",    city:"Los Ángeles", iana:"America/Los_Angeles" },
      { group:"USA", label:"US Mountain",   city:"Denver",      iana:"America/Denver" },
      { group:"USA", label:"US Central",    city:"Chicago",     iana:"America/Chicago" },
      { group:"USA", label:"US Eastern",    city:"Nueva York",  iana:"America/New_York" },
      { group:"USA", label:"Alaska",        city:"Anchorage",   iana:"America/Anchorage" },
      { group:"USA", label:"Hawaii",        city:"Honolulu",    iana:"Pacific/Honolulu" },
      { group:"Canada", label:"Canada Pacific",  city:"Vancouver",  iana:"America/Vancouver" },
      { group:"Canada", label:"Canada Mountain", city:"Edmonton",   iana:"America/Edmonton" },
      { group:"Canada", label:"Canada Central",  city:"Winnipeg",   iana:"America/Winnipeg" },
      { group:"Canada", label:"Canada Eastern",  city:"Toronto",    iana:"America/Toronto" },
      { group:"Canada", label:"Canada Atlantic", city:"Halifax",    iana:"America/Halifax" },
      { group:"Canada", label:"Newfoundland",    city:"St. John’s", iana:"America/St_Johns" },
      { group:"Canada", label:"Saskatchewan (no DST)", city:"Regina", iana:"America/Regina" }
    ];

    // ===== Estado zonas personalizadas =====
    var LS_KEY = 'customZonesV1';
    function loadCustomZones(){
      try {
        var raw = localStorage.getItem(LS_KEY);
        if (!raw) return [];
        var arr = JSON.parse(raw);
        if (Object.prototype.toString.call(arr) !== '[object Array]') return [];
        // Sanitizar strings
        var out = [];
        for (var i=0;i<arr.length;i++){
          var s = arr[i];
          if (typeof s === 'string' && s.indexOf('/') > 0) out.push(s);
        }
        return out;
      } catch(e){ return []; }
    }
    function saveCustomZones(list){
      try { localStorage.setItem(LS_KEY, JSON.stringify(list || [])); } catch(e){}
    }

    // ===== Utilidades de fecha/tiempo =====
    function getNowFromServer(){
      var nowClient = Date.now();
      var nowServer = nowClient + driftMs;
      return new Date(nowServer);
    }
    function fmtDateTime(d, tz){
      var optsDate = { weekday:'short', year:'numeric', month:'short', day:'2-digit', timeZone: tz };
      var optsTime = { hour:'2-digit', minute:'2-digit', second:'2-digit', hour12:false, timeZone: tz };
      return {
        date: d.toLocaleDateString(undefined, optsDate),
        time: d.toLocaleTimeString(undefined, optsTime)
      };
    }
    function utcOffsetString(d, tz){
      var parts = new Intl.DateTimeFormat('en-US', {
        timeZone: tz, timeZoneName: 'shortOffset', hour:'2-digit', minute:'2-digit'
      }).formatToParts(d);
      for (var i=0;i<parts.length;i++){
        if (parts[i].type === 'timeZoneName') return parts[i].value;
      }
      return '';
    }
    function getOffsetMinutes(d, tz){
      var str = d.toLocaleString('en-US', { timeZone: tz });
      var local = new Date(str);
      return ( (d - local) / 60000 );
    }
    function isDST(d, tz){
      var jan = new Date(Date.UTC(d.getUTCFullYear(),0,1));
      var jul = new Date(Date.UTC(d.getUTCFullYear(),6,1));
      var std = getOffsetMinutes(jan, tz);
      var cur = getOffsetMinutes(d, tz);
      var julOff = getOffsetMinutes(jul, tz);
      return cur < Math.max(std, julOff);
    }
    function prettyNameFromIANA(iana){
      // Ej: "Europe/Madrid" -> "Madrid (Europe)"
      var parts = iana.split('/');
      var city = parts[parts.length-1].replace(/_/g, ' ');
      var region = parts[0];
      return { city: city, region: region };
    }

    // ===== Relojes (render) =====
    function renderFixedCards(){
      var row = $('#cardsRowFixed').empty();
      FIXED_ZONES.forEach(function(z, idx){
        var card = $('<div class="col-12 col-sm-6 col-lg-4"></div>').append(
          $('<div class="card card-time h-100 animate__animated animate__fadeInUp" style="animation-delay:'+ (0.02*idx) +'s"></div>').append(
            $('<div class="card-body position-relative"></div>').append(
              $('<div class="d-flex justify-content-between align-items-center mb-2"></div>').append(
                $('<div class="tz-label"></div>').text(z.label),
                $('<span class="badge text-bg-secondary badge-tz"></span>').text(z.iana)
              ),
              $('<div class="clock"></div>').attr('id','fclock-'+idx).text('--:--:--'),
              $('<small class="text-secondary d-block"></small>').attr('id','fdate-'+idx).text('--'),
              $('<small class="text-secondary"></small>').text('Ejemplo: '+z.city+' · '+z.group)
            )
          )
        );
        row.append(card);
      });
    }
    function renderCustomCards(list){
      var row = $('#cardsRowCustom').empty();
      if (!list || !list.length){
        row.append('<div class="col-12"><div class="alert alert-secondary mb-0">Aún no has agregado zonas. Pulsa <b>Agregar Zona</b> para comenzar.</div></div>');
        return;
      }
      list.forEach(function(iana, idx){
        var meta = prettyNameFromIANA(iana);
        var idBase = 'c'+idx+'_'+iana.replace(/[^\w]/g,'_');
        var card = $('<div class="col-12 col-sm-6 col-lg-4"></div>').append(
          $('<div class="card card-time h-100 animate__animated animate__fadeInUp"></div>').append(
            $('<button type="button" class="btn btn-sm btn-danger btn-remove" title="Eliminar zona"><i class="fa-solid fa-xmark"></i></button>')
              .data('iana', iana)
              .on('click', function(){
                var tz = $(this).data('iana');
                var arr = loadCustomZones().filter(function(x){ return x !== tz; });
                saveCustomZones(arr);
                renderCustomCards(arr);
                showToast('Zona eliminada: '+tz);
              }),
            $('<div class="card-body position-relative"></div>').append(
              $('<div class="d-flex justify-content-between align-items-center mb-2"></div>').append(
                $('<div class="tz-label"></div>').text(meta.city),
                $('<span class="badge text-bg-info badge-tz"></span>').text(iana)
              ),
              $('<div class="clock"></div>').attr('id', idBase+'-clock').text('--:--:--'),
              $('<small class="text-secondary d-block"></small>').attr('id', idBase+'-date').text('--'),
              $('<small class="text-secondary"></small>').text('Región: '+meta.region)
            )
          )
        );
        row.append(card);
      });
    }
    function tickAllClocks(){
      var now = getNowFromServer();
      // Guatemala (cabecera)
      var gt = fmtDateTime(now, gtZone);
      $('#clock-gt').text(gt.time);
      $('#date-gt').text(gt.date + ' · UTC ' + utcOffsetString(now, gtZone));

      // Fijas
      FIXED_ZONES.forEach(function(z, idx){
        var t = fmtDateTime(now, z.iana);
        $('#fclock-'+idx).text(t.time);
        $('#fdate-'+idx).text(t.date + ' · UTC ' + utcOffsetString(now, z.iana));
      });

      // Personalizadas
      var custom = loadCustomZones();
      custom.forEach(function(iana, idx){
        var idBase = 'c'+idx+'_'+iana.replace(/[^\w]/g,'_');
        var t = fmtDateTime(now, iana);
        $('#'+idBase+'-clock').text(t.time);
        $('#'+idBase+'-date').text(t.date + ' · UTC ' + utcOffsetString(now, iana));
      });
    }

    // ===== Conversor =====
    function populateConverter(baseDate){
      var tbody = $('#converterBody').empty();
      function addRow(label, city, iana){
        var t = fmtDateTime(baseDate, iana);
        var off = utcOffsetString(baseDate, iana);
        var dst = isDST(baseDate, iana) ? 'Sí' : 'No';
        var tr = $('<tr/>').append(
          $('<td/>').text(label),
          $('<td/>').text(city),
          $('<td/>').text(iana),
          $('<td/>').text(t.date),
          $('<td/>').text(t.time),
          $('<td/>').text(off),
          $('<td/>').text(dst)
        );
        tbody.append(tr);
      }
      // Fijas (usa su label/city)
      FIXED_ZONES.forEach(function(z){ addRow(z.label, z.city, z.iana); });
      // Custom (label dinámico desde IANA)
      var custom = loadCustomZones();
      custom.forEach(function(iana){
        var meta = prettyNameFromIANA(iana);
        addRow(meta.region, meta.city, iana);
      });
    }
    function copyTable(){
      var rows = [];
      rows.push(['Zona','Ciudad','IANA','Fecha','Hora','UTC Offset','DST'].join('\t'));
      $('#converterBody tr').each(function(){
        var cols = [];
        $(this).find('td').each(function(){ cols.push($(this).text()); });
        rows.push(cols.join('\t'));
      });
      var text = rows.join('\n');
      if (navigator.clipboard && navigator.clipboard.writeText){
        navigator.clipboard.writeText(text).then(function(){ showToast('Tabla copiada'); })
          .catch(function(){ fallbackCopy(text); });
      } else { fallbackCopy(text); }
    }
    function fallbackCopy(text){
      var ta = document.createElement('textarea');
      ta.value = text; document.body.appendChild(ta);
      ta.select(); document.execCommand('copy'); document.body.removeChild(ta);
      showToast('Tabla copiada (método alternativo)');
    }

    // ===== Sincronización con servidor =====
    function syncServerTime(){
      $('#syncStatus').text('Sincronizando…');
      return $.ajax({
        url: '?action=time',
        method: 'GET',
        cache: false,
        dataType: 'json',
        timeout: 8000
      }).then(function(resp){
        var clientAtResp = Date.now();
        driftMs = (resp.serverUnixMs - clientAtResp);
        serverEpochMs = resp.serverUnixMs;
        $('#syncStatus').html('<span class="text-success">Sincronizado</span>');
      }).fail(function(){
        $('#syncStatus').html('<span class="text-warning">Sin sync (offline)</span>');
        driftMs = 0;
      });
    }

    // ===== Tema =====
    function initThemeToggle(){
      var root = document.documentElement;
      var stored = localStorage.getItem('theme-bs');
      if (stored === 'light' || stored === 'dark'){ root.setAttribute('data-bs-theme', stored); }
      $('#btnToggleTheme').on('click', function(){
        var cur = root.getAttribute('data-bs-theme') || 'dark';
        var next = (cur === 'dark') ? 'light' : 'dark';
        root.setAttribute('data-bs-theme', next);
        localStorage.setItem('theme-bs', next);
      });
    }

    // ===== Carga de lista de zonas (WorldTimeAPI) =====
    var allTimezones = []; // lista IANA completa
    function fetchTimezonesFromInternet(){
      // WorldTimeAPI devuelve JSON array con strings IANA
      // https://worldtimeapi.org/api/timezone
      $('#listTimezones').html('<li class="list-group-item">Cargando lista de zonas…</li>');
      return $.ajax({
        url: 'https://worldtimeapi.org/api/timezone',
        method: 'GET',
        dataType: 'json',
        timeout: 12000
      }).then(function(arr){
        if (Object.prototype.toString.call(arr) !== '[object Array]'){ arr = []; }
        allTimezones = arr;
        renderTimezoneList(arr);
        $('#tzCount').text(arr.length+' zonas');
      }).fail(function(){
        $('#listTimezones').html('<li class="list-group-item text-danger">No se pudo obtener la lista. Reintenta.</li>');
        $('#tzCount').text('0 zonas');
      });
    }
    function renderTimezoneList(arr){
      var ul = $('#listTimezones').empty();
      if (!arr.length){
        ul.append('<li class="list-group-item">Sin datos</li>');
        return;
      }
      var custom = loadCustomZones();
      arr.forEach(function(iana, idx){
        var meta = prettyNameFromIANA(iana);
        var added = custom.indexOf(iana) >= 0;
        var li = $('<li class="list-group-item d-flex align-items-center justify-content-between"></li>');
        var left = $('<div></div>').append(
          $('<div class="fw-semibold"></div>').text(meta.city+' ('+meta.region+')'),
          $('<div class="text-secondary small"></div>').text(iana)
        );
        var btn = $('<button class="btn btn-sm '+(added?'btn-success':'btn-outline-primary')+'"></button>')
          .html(added? '<i class="fa-solid fa-check"></i> Añadido' : '<i class="fa-solid fa-plus"></i> Añadir')
          .prop('disabled', added)
          .on('click', function(){
            var list = loadCustomZones();
            if (list.indexOf(iana) < 0){
              list.push(iana); saveCustomZones(list);
              renderCustomCards(list);
              $(this).removeClass('btn-outline-primary').addClass('btn-success').prop('disabled', true).html('<i class="fa-solid fa-check"></i> Añadido');
              showToast('Zona añadida: '+iana);
            }
          });
        li.append(left, btn);
        ul.append(li);
      });
    }
    function filterTimezoneList(query){
      query = (query || '').toLowerCase().trim();
      if (!query){ renderTimezoneList(allTimezones); return; }
      var filtered = [];
      for (var i=0;i<allTimezones.length;i++){
        var tz = allTimezones[i];
        if (tz.toLowerCase().indexOf(query) >= 0) filtered.push(tz);
      }
      renderTimezoneList(filtered);
      $('#tzCount').text(filtered.length+' zonas');
    }

    // ===== UI general =====
    function showToast(msg){
      $('#toastMsg').text(msg);
      var toastEl = document.getElementById('toastOk');
      var toast = bootstrap.Toast.getOrCreateInstance(toastEl, { delay: 2500 });
      toast.show();
    }
    function setNowGTInput(){
      var now = getNowFromServer();
      var y = now.getFullYear();
      var m = ('0'+(now.getMonth()+1)).slice(-2);
      var d = ('0'+now.getDate()).slice(-2);
      var hh = ('0'+now.getHours()).slice(-2);
      var mm = ('0'+now.getMinutes()).slice(-2);
      $('#dtInput').val(y+'-'+m+'-'+d+'T'+hh+':'+mm);
    }

    // ===== Eventos =====
    $('#btnAddZone').on('click', function(){
      var modal = new bootstrap.Modal(document.getElementById('modalAddZone'));
      $('#inpSearchTz').val('');
      fetchTimezonesFromInternet().always(function(){ modal.show(); });
    });
    $('#btnReloadTz').on('click', function(){ fetchTimezonesFromInternet(); });
    $('#inpSearchTz').on('input', function(){ filterTimezoneList($(this).val()); });

    $('#btnNowGT').on('click', function(){ setNowGTInput(); });
    $('#btnConvert').on('click', function(){
      var v = $('#dtInput').val();
      if(!v){ showToast('Selecciona una fecha/hora primero'); return; }
      var d = new Date(v);
      populateConverter(d);
      $('html,body').animate({ scrollTop: $('.table-responsive').offset().top - 90 }, 500);
    });
    $('#btnCopy').on('click', function(){ copyTable(); });

    // ===== Inicialización =====
    initThemeToggle();
    renderFixedCards();
    renderCustomCards(loadCustomZones());

    syncServerTime().always(function(){
      tickAllClocks();
      setInterval(tickAllClocks, 1000);
    });

    setNowGTInput();
    populateConverter(getNowFromServer());
  })();
  </script>
</body>
</html>
