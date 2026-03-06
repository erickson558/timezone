<?php
require_once __DIR__ . '/../bootstrap.php';

json_response(array(
  'ok' => true,
  'version' => get_app_version()
), 200);
