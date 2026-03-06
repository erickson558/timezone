<?php
/**
 * Global app config.
 */
return array(
  'app_name' => 'Timezone GT-USA Weather',
  'default_timezone' => 'America/Guatemala',
  'usa_zones' => array(
    array('label' => 'US Eastern',  'city' => 'New York',    'iana' => 'America/New_York'),
    array('label' => 'US Central',  'city' => 'Chicago',     'iana' => 'America/Chicago'),
    array('label' => 'US Mountain', 'city' => 'Denver',      'iana' => 'America/Denver'),
    array('label' => 'US Pacific',  'city' => 'Los Angeles', 'iana' => 'America/Los_Angeles'),
    array('label' => 'Alaska',      'city' => 'Anchorage',   'iana' => 'America/Anchorage'),
    array('label' => 'Hawaii',      'city' => 'Honolulu',    'iana' => 'Pacific/Honolulu')
  ),
  'weather_locations' => array(
    array('key' => 'gt-guatemala-city', 'label' => 'Guatemala City, GT', 'lat' => 14.6349, 'lon' => -90.5069, 'timezone' => 'America/Guatemala'),
    array('key' => 'us-new-york',       'label' => 'New York, USA',      'lat' => 40.7128, 'lon' => -74.0060, 'timezone' => 'America/New_York'),
    array('key' => 'us-chicago',        'label' => 'Chicago, USA',       'lat' => 41.8781, 'lon' => -87.6298, 'timezone' => 'America/Chicago'),
    array('key' => 'us-denver',         'label' => 'Denver, USA',        'lat' => 39.7392, 'lon' => -104.9903, 'timezone' => 'America/Denver'),
    array('key' => 'us-los-angeles',    'label' => 'Los Angeles, USA',   'lat' => 34.0522, 'lon' => -118.2437, 'timezone' => 'America/Los_Angeles'),
    array('key' => 'us-anchorage',      'label' => 'Anchorage, USA',     'lat' => 61.2181, 'lon' => -149.9003, 'timezone' => 'America/Anchorage'),
    array('key' => 'us-honolulu',       'label' => 'Honolulu, USA',      'lat' => 21.3099, 'lon' => -157.8581, 'timezone' => 'Pacific/Honolulu')
  )
);
