<?php
require_once __DIR__ . '/../bootstrap.php';

$config = app_config();
$locations = $config['weather_locations'];
$selected = null;

$key = isset($_GET['location']) ? trim($_GET['location']) : 'gt-guatemala-city';
for ($i = 0; $i < count($locations); $i++) {
  if ($locations[$i]['key'] === $key) {
    $selected = $locations[$i];
    break;
  }
}

if ($selected === null) {
  $selected = $locations[0];
}

$lat = $selected['lat'];
$lon = $selected['lon'];
$tz = rawurlencode($selected['timezone']);
$url = 'https://api.open-meteo.com/v1/forecast?latitude=' . $lat . '&longitude=' . $lon . '&current_weather=true&daily=temperature_2m_max,temperature_2m_min&timezone=' . $tz;
$data = fetch_json_from_url($url);

if ($data === null || !isset($data['current_weather'])) {
  json_response(array(
    'ok' => false,
    'error' => 'Weather provider unavailable'
  ), 502);
}

$current = $data['current_weather'];
$daily = isset($data['daily']) ? $data['daily'] : array();
$maxT = null;
$minT = null;

if (isset($daily['temperature_2m_max'][0])) {
  $maxT = $daily['temperature_2m_max'][0];
}
if (isset($daily['temperature_2m_min'][0])) {
  $minT = $daily['temperature_2m_min'][0];
}

$code = isset($current['weathercode']) ? (int)$current['weathercode'] : -1;
json_response(array(
  'ok' => true,
  'location' => $selected,
  'weather' => array(
    'temperatureC' => isset($current['temperature']) ? $current['temperature'] : null,
    'windKmh' => isset($current['windspeed']) ? $current['windspeed'] : null,
    'weatherCode' => $code,
    'weatherLabel' => weather_code_label($code),
    'isDay' => isset($current['is_day']) ? ((int)$current['is_day'] === 1) : true,
    'updatedAt' => isset($current['time']) ? $current['time'] : null,
    'highC' => $maxT,
    'lowC' => $minT
  ),
  'version' => get_app_version()
), 200);
