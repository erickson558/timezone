# Timezone GT-USA Weather

Aplicacion web PHP para comparar en tiempo real la hora de Guatemala (GT) contra zonas horarias de USA y mostrar clima en vivo con iconos animados estilo iPhone.

Version actual: revisar archivo `VERSION`.

## Caracteristicas

- Comparacion horaria en vivo de GT vs zonas principales de USA.
- Ajuste automatico por DST usando `Intl` del navegador.
- Clima en vivo desde Open-Meteo con iconografia animada.
- Arquitectura separada:
- Frontend en `index.php` + `assets/css` + `assets/js`.
- Backend en `backend/api` y configuracion en `config/app.php`.
- Version semantica con prefijo `Vx.x.x` en archivo `VERSION`.

## Estructura

`index.php`

`assets/css/styles.css`

`assets/js/app.js`

`config/app.php`

`backend/bootstrap.php`

`backend/api/time.php`

`backend/api/timezones.php`

`backend/api/weather.php`

`backend/api/version.php`

`VERSION`

`.github/workflows/release.yml`

## Dependencias

- PHP 5.4+ (recomendado PHP 8.x).
- Conexion saliente HTTPS para consultar Open-Meteo.
- Navegador moderno con soporte `Intl`.
- CDN externos:
- Google Fonts (DM Sans, Outfit).
- Font Awesome.

## Como ejecutar

1. Publica la carpeta en tu servidor PHP (EasyPHP, Apache, Nginx+PHP).
2. Abre `index.php` en el navegador.
3. Verifica que el servidor tenga salida a Internet para el clima.

## Endpoints backend

- `backend/api/time.php`: hora UTC del servidor y referencia GT.
- `backend/api/timezones.php`: zona base GT, zonas USA y ubicaciones de clima.
- `backend/api/weather.php?location=gt-guatemala-city`: clima por ubicacion.
- `backend/api/version.php`: version de la app.

## Versionamiento

Se usa Semantic Versioning con formato `VMAJOR.MINOR.PATCH`.

Buenas practicas aplicadas:

- `MAJOR`: cambios incompatibles.
- `MINOR`: funcionalidad nueva compatible.
- `PATCH`: correcciones compatibles.

El archivo `VERSION` es la fuente de verdad para la version mostrada en la app.

## Release automatizado

El workflow `release.yml` corre en cada push a `main`:

1. Incrementa `PATCH` en `VERSION`.
2. Hace commit automatico del nuevo `VERSION`.
3. Crea tag `Vx.x.x`.
4. Publica GitHub Release.

## Favicon .ico

La interfaz referencia `app.ico` en raiz:

`<link rel="icon" type="image/x-icon" href="app.ico">`

Si no existe, agregalo en la raiz del proyecto para branding visual y release consistente.

## Licencia

Este proyecto esta licenciado bajo Apache License 2.0. Ver `LICENSE`.
