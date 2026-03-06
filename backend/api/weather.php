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

function wttr_to_weather_code($desc) {
  $text = strtolower(trim((string)$desc));
  if ($text === '') {
    return 3;
  }
  if (strpos($text, 'thunder') !== false || strpos($text, 'storm') !== false) {
    return 95;
  }
  if (strpos($text, 'snow') !== false || strpos($text, 'sleet') !== false || strpos($text, 'ice') !== false) {
    return 71;
  }
  if (strpos($text, 'rain') !== false || strpos($text, 'drizzle') !== false || strpos($text, 'shower') !== false) {
    return 61;
  }
  if (strpos($text, 'fog') !== false || strpos($text, 'mist') !== false || strpos($text, 'haze') !== false) {
    return 45;
  }
  if (strpos($text, 'partly') !== false || strpos($text, 'cloud') !== false || strpos($text, 'overcast') !== false) {
    return 2;
  }
  if (strpos($text, 'clear') !== false || strpos($text, 'sun') !== false) {
    return 0;
  }
  return 3;
}

function weather_from_open_meteo($selected) {
  $lat = $selected['lat'];
  $lon = $selected['lon'];
  $tz = rawurlencode($selected['timezone']);
  $url = 'https://api.open-meteo.com/v1/forecast?latitude=' . $lat . '&longitude=' . $lon . '&current=temperature_2m,weather_code,wind_speed_10m,is_day&daily=temperature_2m_max,temperature_2m_min&timezone=' . $tz;
  $data = fetch_json_from_url($url);

  if ($data === null || !isset($data['current'])) {
    return null;
  }

  $current = $data['current'];
  $daily = isset($data['daily']) ? $data['daily'] : array();

  $maxT = null;
  $minT = null;
  if (isset($daily['temperature_2m_max'][0])) {
    $maxT = $daily['temperature_2m_max'][0];
  }
  if (isset($daily['temperature_2m_min'][0])) {
    $minT = $daily['temperature_2m_min'][0];
  }

  $code = isset($current['weather_code']) ? (int)$current['weather_code'] : -1;
  return array(
    'provider' => array(
      'name' => 'Open-Meteo',
      'forecastUrl' => 'https://api.open-meteo.com/',
      'geocodingUrl' => 'https://geocoding-api.open-meteo.com/'
    ),
    'weather' => array(
      'temperatureC' => isset($current['temperature_2m']) ? $current['temperature_2m'] : null,
      'windKmh' => isset($current['wind_speed_10m']) ? $current['wind_speed_10m'] : null,
      'weatherCode' => $code,
      'weatherLabel' => weather_code_label($code),
      'isDay' => isset($current['is_day']) ? ((int)$current['is_day'] === 1) : true,
      'updatedAt' => isset($current['time']) ? $current['time'] : null,
      'highC' => $maxT,
      'lowC' => $minT
    )
  );
}

function weather_from_wttr($selected) {
  $lat = $selected['lat'];
  $lon = $selected['lon'];
  $coord = rawurlencode($lat . ',' . $lon);

  $urlHttps = 'https://wttr.in/' . $coord . '?format=j1';
  $urlHttp = 'http://wttr.in/' . $coord . '?format=j1';
  $data = fetch_json_from_url($urlHttps);
  if ($data === null) {
    $data = fetch_json_from_url($urlHttp);
  }

  if ($data === null || !isset($data['current_condition'][0])) {
    return null;
  }

  $current = $data['current_condition'][0];
  $daily = isset($data['weather'][0]) ? $data['weather'][0] : array();
  $desc = '';
  if (isset($current['weatherDesc'][0]['value'])) {
    $desc = $current['weatherDesc'][0]['value'];
  }

  $code = wttr_to_weather_code($desc);
  return array(
    'provider' => array(
      'name' => 'wttr.in',
      'forecastUrl' => 'https://wttr.in/'
    ),
    'weather' => array(
      'temperatureC' => isset($current['temp_C']) ? (float)$current['temp_C'] : null,
      'windKmh' => isset($current['windspeedKmph']) ? (float)$current['windspeedKmph'] : null,
      'weatherCode' => $code,
      'weatherLabel' => $desc !== '' ? $desc : weather_code_label($code),
      'isDay' => isset($current['isdaytime']) ? ((string)$current['isdaytime'] === 'yes') : true,
      'updatedAt' => date('c'),
      'highC' => isset($daily['maxtempC']) ? (float)$daily['maxtempC'] : null,
      'lowC' => isset($daily['mintempC']) ? (float)$daily['mintempC'] : null
    )
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

$result = weather_from_open_meteo($selected);
if ($result === null) {
  $result = weather_from_wttr($selected);
}

if ($result === null) {
  json_response(array(
    'ok' => false,
    'error' => 'Weather providers unavailable'
  ), 502);
}

json_response(array(
  'ok' => true,
  'provider' => $result['provider'],
  'location' => $selected,
  'weather' => $result['weather'],
  'version' => get_app_version()
), 200);
