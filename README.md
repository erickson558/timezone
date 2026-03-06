# Timezone GT-USA Weather

Aplicacion web PHP para comparar en tiempo real la hora de Guatemala (GT) contra zonas horarias de USA y mostrar clima en vivo con iconos animados estilo iPhone en cada card.

Version actual: revisar archivo `VERSION`.

## Caracteristicas

- Cards por zona (GT + USA) con hora, fecha, diferencia vs GT y clima.
- Abreviatura de zona en cada card (ej. EST, PST, CST, MST, AKST/HST segun temporada).
- Agregar y eliminar zonas horarias personalizadas (IANA) estilo iPhone, guardadas en `localStorage`.
- Reordenar cards con drag-and-drop y botones subir/bajar (persistente).
- Comparacion horaria en vivo de GT vs zonas principales de USA sin parpadeo visual.
- Ajuste automatico por DST usando `Intl` del navegador.
- Clima en vivo por cada card desde Open-Meteo con iconografia animada.
- Color dinamico por card segun estado del clima (soleado, lluvia, nublado, etc.).
- Mejor contraste de textos y pildoras del clima para alta legibilidad.
- Modo claro y modo oscuro persistente en navegador.
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
- Conexion saliente HTTPS para consultar APIs gratuitas.
- Navegador moderno con soporte `Intl`.
- CDN externos:
- Google Fonts (DM Sans, Outfit).
- Font Awesome.
- APIs gratuitas consumidas:
- Open-Meteo Forecast (clima, grados y condiciones) consumido desde frontend.
- Open-Meteo Geocoding (lat/lon para zonas agregadas) consumido desde frontend.
- WorldTimeAPI (lista de zonas IANA para sugerencias, con fallback local).

## Como ejecutar

1. Publica la carpeta en tu servidor PHP (EasyPHP, Apache, Nginx+PHP).
2. Abre `index.php` en el navegador.
3. Verifica que el servidor tenga salida a Internet para el clima.

## Endpoints backend

- `backend/api/time.php`: hora UTC del servidor y referencia GT.
- `backend/api/timezones.php`: zona base GT, zonas USA y ubicaciones de clima.
- `backend/api/weather.php?location=gt-guatemala-city`: clima por ubicacion conocida.
- `backend/api/weather.php?timezone=Europe/Madrid`: clima por zona agregada dinamicamente.
- `backend/api/version.php`: version de la app.

Nota: el frontend consulta Open-Meteo directamente para mayor compatibilidad cuando el servidor PHP no tiene salida a Internet.

## Versionamiento

Se usa Semantic Versioning con formato `VMAJOR.MINOR.PATCH` y el cambio de version se hace antes de cada commit.

Buenas practicas aplicadas:

- `MAJOR`: cambios incompatibles.
- `MINOR`: funcionalidad nueva compatible.
- `PATCH`: correcciones compatibles.

El archivo `VERSION` es la fuente de verdad para la version mostrada en la app.

## Release automatizado

El workflow `release.yml` corre en cada push a `main`:

1. Lee `VERSION` como fuente de verdad.
2. Crea tag `Vx.x.x` si no existe.
3. Publica GitHub Release para esa version.

## Favicon .ico

La interfaz referencia `app.ico` en raiz:

`<link rel="icon" type="image/x-icon" href="app.ico">`

Si no existe, agregalo en la raiz del proyecto para branding visual y release consistente.

## Licencia

Este proyecto esta licenciado bajo Apache License 2.0. Ver `LICENSE`.
