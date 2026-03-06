<?php
require_once __DIR__ . '/../bootstrap.php';

$config = app_config();
$gtZone = $config['default_timezone'];

$utcNow = new DateTime('now', new DateTimeZone('UTC'));
$gtNow = new DateTime('now', new DateTimeZone($gtZone));

json_response(array(
  'ok' => true,
  'serverUtcIso' => $utcNow->format('Y-m-d\\TH:i:s\\Z'),
  'serverUnixMs' => ((int)$utcNow->format('U')) * 1000,
  'guatemalaIso' => $gtNow->format(DateTime::ATOM),
  'guatemalaTime' => $gtNow->format('Y-m-d H:i:s')
), 200);
