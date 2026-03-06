<?php
@ini_set('display_errors', '0');
@ini_set('default_charset', 'UTF-8');

function app_config() {
  static $config = null;
  if ($config === null) {
    $config = require __DIR__ . '/../config/app.php';
  }
  return $config;
}

function json_response($data, $statusCode) {
  if (!headers_sent()) {
    http_response_code((int)$statusCode);
    header('Content-Type: application/json; charset=UTF-8');
    header('X-Content-Type-Options: nosniff');
    header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
    header('Pragma: no-cache');
  }
  echo json_encode($data);
  exit;
}

function fetch_json_from_url($url) {
  $ctx = stream_context_create(array(
    'http' => array(
      'method' => 'GET',
      'timeout' => 8,
      'header' => "User-Agent: timezone-app/1.0\r\n"
    )
  ));

  $raw = @file_get_contents($url, false, $ctx);
  if ($raw === false) {
    return null;
  }

  $decoded = json_decode($raw, true);
  if (!is_array($decoded)) {
    return null;
  }

  return $decoded;
}

function get_app_version() {
  $versionFile = __DIR__ . '/../VERSION';
  if (!is_file($versionFile)) {
    return 'V0.0.0';
  }

  $content = @file_get_contents($versionFile);
  if ($content === false) {
    return 'V0.0.0';
  }

  $value = trim($content);
  if ($value === '') {
    return 'V0.0.0';
  }

  return $value;
}

function weather_code_label($code) {
  $map = array(
    0 => 'Clear sky',
    1 => 'Mainly clear',
    2 => 'Partly cloudy',
    3 => 'Overcast',
    45 => 'Fog',
    48 => 'Rime fog',
    51 => 'Light drizzle',
    53 => 'Drizzle',
    55 => 'Dense drizzle',
    56 => 'Freezing drizzle',
    57 => 'Dense freezing drizzle',
    61 => 'Slight rain',
    63 => 'Rain',
    65 => 'Heavy rain',
    66 => 'Freezing rain',
    67 => 'Heavy freezing rain',
    71 => 'Slight snow fall',
    73 => 'Snow fall',
    75 => 'Heavy snow fall',
    77 => 'Snow grains',
    80 => 'Rain showers',
    81 => 'Rain showers',
    82 => 'Violent rain showers',
    85 => 'Snow showers',
    86 => 'Heavy snow showers',
    95 => 'Thunderstorm',
    96 => 'Thunderstorm with hail',
    99 => 'Thunderstorm with hail'
  );

  if (isset($map[$code])) {
    return $map[$code];
  }

  return 'Unknown weather';
}
