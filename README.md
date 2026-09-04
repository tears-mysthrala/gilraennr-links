# GilraenNR link hub

Página estática de enlaces para GilraenNR. No usa framework, gestor de paquetes, proceso de compilación, base de datos ni scripts de seguimiento. Cloudflare Pages sirve los archivos tal cual.

## Estructura

```text
.
├── index.html                 # Estructura semántica y metadatos
├── 404.html                   # Error personalizado para Pages
├── _headers                   # CSP y cabeceras de seguridad de Cloudflare
├── .github/workflows/
│   ├── deploy-pages.yml       # Publicación temporal en GitHub Pages
│   └── update-live-status.yml # Comprobación periódica del canal principal de Twitch
├── robots.txt
├── site.webmanifest
├── assets/
│   ├── css/style.css          # Diseño responsive y estados accesibles
│   ├── js/app.js              # Carga, validación y renderizado del JSON
│   └── images/                # Avatar, favicon, Open Graph y fondos responsive
├── content/
│   ├── links.json             # Contenido editable principal
│   ├── fallback.json          # Copia local estable
│   ├── status.json            # Estado inicial; la rama status contiene el vigente
│   └── schema.json            # JSON Schema del formato admitido
└── DESIGN.md
```

## Editar enlaces y contenido

La fuente editorial es [`content/links.json`](content/links.json). Cada enlace admite:

- `id`: identificador único en minúsculas.
- `title`, `url` y `category`: campos necesarios para renderizarlo.
- `description`: texto opcional.
- `icon`: `twitch`, `youtube`, `kick`, `x`, `instagram`, `patreon`, `gamepad`, `store`, `mail` o `link`.
- `enabled`: usa `false` para ocultarlo sin borrarlo.
- `order` o `priority`: número menor = aparece antes.
- `featured`: candidato a CTA principal.
- `label`: distintivo corto, por ejemplo `Nuevo`, `Partner` o `Canal principal`.
- `action`: texto opcional del CTA cuando el enlace es el destacado.

`featuredLinkId` tiene preferencia sobre `featured`. Si no existe, se usa el primer enlace con `featured: true`. Si no hay ninguno, el panel principal no se renderiza.

`liveStatus` configura el indicador de directo. `probeUrl` admite únicamente el endpoint de uptime de Twitch de DecAPI con los parámetros exactos del ejemplo; `url` debe apuntar al snapshot alternativo en `raw.githubusercontent.com`. `pollSeconds` se limita en el navegador a un valor entre 30 y 300 segundos. El valor recomendado es 120 segundos. Usa `enabled: false` para desactivarlo sin cambiar el HTML.

Las secciones se definen en `sections`. Su `id` debe coincidir con el `category` de los enlaces. Una sección vacía o desactivada no se muestra. Los campos desconocidos se ignoran para permitir ampliar el JSON sin romper versiones anteriores del frontend.

Antes de guardar:

1. Mantén JSON válido: comillas dobles y sin comas finales.
2. Usa URLs `https://` para destinos públicos. El contacto admite además un `mailto:` simple, sin asunto ni parámetros.
3. Revisa que cada `id` sea único.
4. Conserva la declaración de afiliación si hay enlaces comerciales.

`content/schema.json` permite validar el archivo desde un editor compatible con JSON Schema. La propiedad `$schema` de `links.json` ya lo referencia.

## Cómo se carga el JSON remoto

En cada visita, `assets/js/app.js` intenta descargar:

```text
https://raw.githubusercontent.com/tears-mysthrala/gilraennr-links/main/content/links.json
```

La petición tiene un límite de 3,5 segundos, un máximo de 256 KB y pide evitar caché del navegador. El renderizador inspecciona como máximo 150 definiciones de sección y 500 entradas de enlace; tras descartar datos inválidos, desactivados o duplicados, muestra como máximo 30 secciones y 100 enlaces. El repositorio debe ser público: GitHub Raw no expone archivos de un repositorio privado a visitantes anónimos.

El orden de recuperación es:

1. JSON remoto de GitHub Raw.
2. `content/fallback.json`, incluido en el último despliegue de Cloudflare Pages.
3. Un estado de recuperación integrado con un botón para reintentar, sin destinos codificados en JavaScript.

Así, un error de red, un HTTP no satisfactorio, un JSON mal formado o la ausencia de campos opcionales no deja la página vacía. Añade `?debug=1` a la URL para ver de forma discreta qué fuente se ha utilizado. En producción normal no se muestra ningún aviso, salvo que fallen ambas fuentes y sea necesario ofrecer la acción de reintento.

El JSON remoto se trata como entrada no confiable: el renderizador usa `textContent`, no inserta HTML remoto, limita longitudes, solo admite iconos conocidos y rechaza destinos que no sean HTTPS o un correo `mailto:` válido sin parámetros. Los avatares solo pueden estar en `assets/` o en `raw.githubusercontent.com`, en línea con la CSP. Los enlaces web externos se abren con `noopener noreferrer`; el correo abre el cliente de correo del visitante.

### Cambiar la URL de GitHub Raw

Edita la constante `REMOTE_CONTENT_URL` al principio de [`assets/js/app.js`](assets/js/app.js). Sustituye usuario, repositorio o rama por los definitivos.

También actualiza estas referencias si cambia el repositorio o el dominio:

- `og:image` y `twitter:image` en `index.html`.
- `$id` en `content/schema.json`.

Los metadatos SEO y Open Graph de `index.html` son una excepción deliberada al contenido remoto. Los robots de buscadores y redes sociales no suelen ejecutar el JavaScript que carga GitHub Raw, por lo que el nombre de marca, el resumen estable y la imagen social deben existir en el HTML desplegado. Los destinos, etiquetas, descripciones operativas, avatar y orden de las tarjetas siguen viviendo exclusivamente en JSON. Cambiar esos metadatos de despliegue sí requiere publicar de nuevo.

Después de la primera publicación, conserva `fallback.json` como una copia conocida y estable. No hace falta sincronizarla en cada ajuste editorial; conviene actualizarla cuando se despliegue una nueva versión del sitio.

## Indicador de directo

El navegador consulta primero el endpoint `probeUrl` de DecAPI, que devuelve el uptime de Twitch o el texto `offline`. La URL, el tamaño y el formato de esa respuesta se validan antes de usarla; el texto nunca se inserta en el DOM. DecAPI cachea esta consulta durante cinco minutos, por lo que el indicador puede tardar ese intervalo en reflejar un cambio real. La petición se hace sin credenciales ni cabecera Referer y no carga scripts externos.

Como respaldo, el workflow `update-live-status.yml` está programado diez veces por hora, en minutos desplazados de los intervalos más congestionados de GitHub Actions, y también admite ejecución manual. Lee la URL habilitada de Twitch desde `content/links.json`, la comprueba con una versión fijada de `yt-dlp` y publica `content/status.json` en la rama `status`. Twitch es la única fuente de verdad del indicador: el estado de YouTube o Kick no puede encenderlo.

El trabajo de comprobación solo tiene permiso de lectura. Un segundo trabajo, aislado del proceso que consulta Twitch, recibe el resultado y tiene el permiso de escritura necesario para actualizar la rama `status`. No hace falta una clave de Twitch y ninguna credencial llega al navegador.

Para evitar que la caché de `raw.githubusercontent.com` retrase un cambio de estado, el navegador consulta primero el SHA actual de la rama `status` mediante la API pública de GitHub y descarga después el JSON asociado a ese commit inmutable. Si la API falla o limita las peticiones, vuelve automáticamente a la URL de GitHub Raw configurada.

La página consulta el estado cada 120 segundos. Dentro de la tarjeta principal de Twitch muestra un distintivo rojo con pulso `En directo` o uno neutro `Offline` únicamente cuando:

- Twitch ha confirmado expresamente el estado correspondiente;
- el snapshot tiene una fecha `expiresAt` válida;
- esa fecha no ha vencido ni supera dos horas desde el reloj del visitante.

Una lectura directa caduca localmente a los siete minutos. En el respaldo de GitHub, los snapshots en directo caducan a los 45 minutos y los offline, a los 30; ambos se renuevan cuando quedan menos de 10 minutos. Los fallos de red o del extractor producen un estado desconocido: no cambian el último estado confirmado y el indicador termina desapareciendo al caducar. Los commits de estado viven en una rama separada, así que no ensucian `main` ni reconstruyen el sitio publicado desde esa rama. En Cloudflare Pages, conserva además la exclusión `content/*` documentada más abajo.

GitHub puede retrasar los workflows programados. El indicador es deliberadamente informativo y no una garantía en tiempo real. Para lanzar una comprobación inmediata usa **Actions → Update live status → Run workflow**.

## GitHub Pages temporal

Mientras llega el dominio definitivo, `.github/workflows/deploy-pages.yml` publica el repositorio como un artefacto estático. La fuente de Pages debe estar configurada como **GitHub Actions**, no como el despliegue heredado desde una rama.

El workflow usa las versiones vigentes de las acciones oficiales de Pages, fijadas por SHA para evitar que una etiqueta mutable cambie el código ejecutado sin revisión. Se activa con cambios de `main` y también admite ejecución manual. Los commits que solo modifican `content/**` no lo ejecutan: el navegador obtiene `links.json` desde GitHub Raw y el indicador de directo usa la rama `status`.

El sitio queda disponible en `https://tears-mysthrala.github.io/gilraennr-links/`.

La URL canónica y `og:url` apuntan temporalmente a GitHub Pages. Sustitúyelas por el dominio definitivo cuando se conecte Cloudflare Pages.

## Probar en local

No abras `index.html` mediante `file://`: los navegadores suelen bloquear `fetch()` en ese contexto. Sirve la carpeta con cualquier servidor HTTP estático. Por ejemplo, si tienes Python:

```powershell
py -m http.server 8080 --directory .
```

Después abre `http://localhost:8080/?debug=1`.

## Desplegar en Cloudflare Pages

1. Crea un repositorio público en GitHub y sube el contenido de esta carpeta a la raíz de la rama `main`.
2. Cambia `REMOTE_CONTENT_URL` y las URLs Open Graph antes del primer despliegue.
3. En Cloudflare, abre **Workers & Pages → Create application → Pages → Import an existing Git repository**.
4. Selecciona el repositorio y usa:
   - Production branch: `main`
   - Framework preset: `None`
   - Build command: `exit 0`
   - Build output directory: `.`
5. Guarda y despliega. `index.html`, `_headers` y el resto de archivos se publican sin transformación.

Cloudflare documenta este flujo en [Static HTML](https://developers.cloudflare.com/pages/framework-guides/deploy-anything/) y [Git integration](https://developers.cloudflare.com/pages/get-started/git-integration/).

### Evitar builds por cambios editoriales

Después del primer despliegue ve a **Settings → Build → Build watch paths** y configura:

```text
Include paths: *
Exclude paths: content/*
```

Cloudflare evalúa primero las exclusiones y `*` también cubre subdirectorios. Un commit que solo cambie `content/**` no provocará un build; el navegador leerá el nuevo `links.json` desde GitHub Raw. Si el mismo push modifica cualquier archivo no excluido, sí se desplegará una nueva versión. Los pushes vacíos y los pushes con 3000 o más archivos o 20 o más commits omiten esta lógica y pueden iniciar un build, según la [documentación de Build watch paths](https://developers.cloudflare.com/pages/configuration/build-watch-paths/).

Importante: excluir `content/*` implica que `fallback.json` no se actualizará en Pages con esos commits. Es deliberado. Para renovar el fallback, inclúyelo en un commit que también cambie un archivo desplegable o lanza un nuevo despliegue.

## Dominio personalizado

1. Abre el proyecto en **Workers & Pages → Custom domains → Set up a domain**.
2. Introduce el dominio o subdominio.
3. Si la zona DNS ya está en Cloudflare, el registro se crea durante el proceso.
4. Para un dominio raíz, la zona debe usar los nameservers de Cloudflare. Para un subdominio gestionado fuera de Cloudflare, crea un CNAME hacia `<proyecto>.pages.dev` después de asociar primero el dominio en Pages.

No crees únicamente el CNAME sin asociar el dominio en el proyecto: Cloudflare advierte de que esa configuración puede responder con un error 522. Consulta [Custom domains](https://developers.cloudflare.com/pages/configuration/custom-domains/) para el procedimiento vigente.

Tras conectar el dominio, actualiza las URLs Open Graph de `index.html` con la URL canónica definitiva.

## Mantenimiento

- No añadas HTML procedente del JSON ni cambies `textContent` por `innerHTML`.
- Mantén la CSP de `_headers` alineada con cualquier nuevo host de imágenes o contenido.
- Optimiza imágenes antes de subirlas; el avatar actual es WebP de 256 × 256.
- Prueba teclado, zoom al 200 %, modo de movimiento reducido y al menos un móvil estrecho después de cambios visuales.
- No añadas analítica, banners de cookies o dependencias externas salvo necesidad real y revisión de privacidad.
