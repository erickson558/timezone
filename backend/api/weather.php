<?php
require_once __DIR__ . '/../bootstrap.php';

$config = app_config();
$locations = $config['weather_locations'];
$selected = null;

function find_location_by_key($locations, $key) {
  for ($i = 0; $i < count($locations); $i++) {
    if ($locations[$i]['key'] === $key) {
      return $locations[$i];
    }
  }
  return null;
}

function is_valid_timezone($timezone) {
  try {
    new DateTimeZone($timezone);
    return true;
  } catch (Exception $e) {
    return false;
  }
}

function guess_city_from_timezone($timezone) {
  $parts = explode('/', $timezone);
  $city = $parts[count($parts) - 1];
  $city = str_replace('_', ' ', $city);
  return trim($city);
}

function geocode_timezone_location($timezone) {
  $city = guess_city_from_timezone($timezone);
  if ($city === '') {
    return null;
  }

  $geoUrl = 'https://geocoding-api.open-meteo.com/v1/search?name=' . rawurlencode($city) . '&count=1&language=en&format=json';
  $geo = fetch_json_from_url($geoUrl);
  if ($geo === null || !isset($geo['results'][0])) {
    return null;
  }

  $first = $geo['results'][0];
  if (!isset($first['latitude']) || !isset($first['longitude'])) {
    return null;
  }

  $country = isset($first['country']) ? $first['country'] : '';
  return array(
    'key' => 'tz-' . strtolower(str_replace('/', '-', $timezone)),
    'label' => $city . ($country !== '' ? ', ' . $country : ''),
    'lat' => $first['latitude'],
    'lon' => $first['longitude'],
    'timezone' => $timezone
  );
}

$timezone = isset($_GET['timezone']) ? trim($_GET['timezone']) : '';
if ($timezone !== '' && is_valid_timezone($timezone)) {
  $selected = geocode_timezone_location($timezone);
}

if ($selected === null) {
  $key = isset($_GET['location']) ? trim($_GET['location']) : 'gt-guatemala-city';
  $selected = find_location_by_key($locations, $key);
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
  'provider' => array(
    'name' => 'Open-Meteo',
    'forecastUrl' => 'https://api.open-meteo.com/',
    'geocodingUrl' => 'https://geocoding-api.open-meteo.com/'
  ),
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
