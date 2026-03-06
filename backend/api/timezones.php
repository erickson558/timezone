<?php
require_once __DIR__ . '/../bootstrap.php';

$config = app_config();

json_response(array(
  'ok' => true,
  'guatemala' => array(
    'label' => 'Guatemala',
    'city' => 'Guatemala City',
    'iana' => $config['default_timezone']
  ),
  'usaZones' => $config['usa_zones'],
  'weatherLocations' => $config['weather_locations'],
  'version' => get_app_version()
), 200);
