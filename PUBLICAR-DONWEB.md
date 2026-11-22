# Publicación final en DonWeb

La web se compila con React y Vite. DonWeb sirve los archivos finales y Supabase conserva las cuentas, los perfiles, las obras y los archivos de muestra.

La configuración incluida está preparada para publicar en la raíz de un dominio o subdominio, con hosting Linux compatible con Apache y .htaccess. Antes de configurar el despliegue automático, confirmar el plan de DonWeb y el dominio de la galería. Si es un Cloud Server con Nginx o un hosting Windows, se necesitan reglas de servidor diferentes.

## Preparar las cuentas

Seguí `CONECTAR-CUENTAS.md` para crear el proyecto Supabase y ejecutar `supabase/schema.sql`.

En Authentication > URL Configuration, configurá el dominio definitivo como Site URL y agregá su URL HTTPS exacta a Redirect URLs. Conservá localhost para las pruebas locales. Si seguís usando Netlify como adelanto, agregá también esa dirección.

## Compilar

En la carpeta del proyecto creá `.env.local` a partir de `.env.example` y completá las dos variables públicas de Supabase.

```sh
npm ci
npm run build
```

Las variables se incorporan durante la compilación. Para actualizar desde GitHub sin intervención manual, esas mismas variables deben estar disponibles en el entorno de build y se debe configurar la transferencia de `dist` al hosting. La conexión de despliegue queda pendiente de los datos del plan y del repositorio.

## Estructura en el hosting

En Web Hosting con Ferozo, el contenido compilado debe quedar directamente en la carpeta pública del sitio.

| En la computadora | En el servidor |
| --- | --- |
| `dist/index.html` | `public_html/index.html` |
| `dist/assets/` | `public_html/assets/` |
| `dist/marca/` | `public_html/marca/` |
| `dist/audio/` | `public_html/audio/` |
| `dist/favicon.svg` | `public_html/favicon.svg` |
| `dist/.htaccess` | `public_html/.htaccess` |

El archivo `.htaccess` puede estar oculto en el explorador. Si ya existe uno en el destino, revisar y combinar sus reglas antes de reemplazarlo. Usar la carpeta pública correspondiente a la galería y comprobar que no corresponda a otro sitio activo.

Publicá únicamente los archivos compilados de `dist`. Los archivos `.env.local`, el proyecto fuente y `node_modules` quedan fuera de la carpeta pública.

El medio de transferencia y la automatización se definirán con el plan contratado. Para Web Hosting con FTP, usar conexión explícita cifrada TLS en el puerto 21, según las instrucciones del hosting.

## HTTPS y cabeceras

Activá el certificado y la redirección a HTTPS desde DonWeb. La compilación genera `.htaccess` con las cabeceras de seguridad para Apache cuando mod_headers está disponible y el servidor permite estas directivas. El archivo `_headers` es la variante de Netlify para el adelanto.

Después de publicar, abrir el dominio definitivo y comprobar el catálogo, las cuentas, la recuperación de contraseña y las imágenes. Revisar las cabeceras HTTP Content-Security-Policy, X-Frame-Options y X-Content-Type-Options. Que el archivo exista en el servidor no alcanza para confirmar que el hosting lo esté aplicando.

La navegación usa rutas con `#`, por lo que el catálogo y los perfiles no necesitan una regla de reescritura de rutas. La estructura actual asume publicación en la raíz del dominio o subdominio. Si el destino es una subcarpeta, ajustar las rutas de los recursos antes de compilar.

Referencias del proveedor.

- https://soporte.donweb.com/es/articles/15970801-web-hosting-y-wordpress-hosting-gestionar-archivos-por-ftp-y-desde-el-administrador-de-ferozo
- https://soporte.donweb.com/es/articles/15851397-ssl-forzar-la-redireccion-de-http-a-https
