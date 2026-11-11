# Activar cuentas y obras permanentes

Esta versión usa Supabase para las cuentas, la base de datos y las portadas o audios de muestra. La web sigue compilándose con React y Vite en Netlify desde GitHub.

## 1. Preparar el proyecto de Supabase

Entrá a https://supabase.com/dashboard y creá un proyecto para la galería. Guardá la contraseña de la base de datos en tu gestor de contraseñas. Esta contraseña no se agrega a la web.

En SQL Editor, abrí una consulta nueva. Copiá el contenido completo de `supabase/schema.sql` y ejecutalo. El script crea perfiles, obras, el almacenamiento privado y las reglas de permisos. Se puede volver a ejecutar conservando los datos.

Este script está pensado para un proyecto propio de la galería. Las tablas se llaman `gallery_profiles` y `gallery_works`. El bucket se llama `gallery-previews`.

## 2. Configurar los correos y los enlaces de acceso

En Authentication, activá el proveedor Email y mantené la confirmación de correo habilitada.

En URL Configuration, usá como Site URL la dirección de producción.

```text
https://monumental-frangollo-5a2461.netlify.app/
```

Agregá estas URL permitidas en Redirect URLs.

```text
https://monumental-frangollo-5a2461.netlify.app/
http://localhost:5173/
```

Si Vite muestra otro puerto local, agregá también esa URL exacta. Los correos vuelven a la raíz de la web y el cliente procesa la sesión. Usá las plantillas estándar con el enlace de confirmación de Supabase. No cambies el enlace por una ruta con `#/mi-espacio` porque la respuesta de autenticación utiliza ese fragmento.

Configurá un proveedor SMTP propio en Authentication para enviar confirmaciones y recuperaciones a los artistas. El remitente tiene que estar autorizado por ese proveedor. El envío de prueba incluido por Supabase tiene restricciones y envía solamente a direcciones del equipo del proyecto. Para la primera prueba podés usar el mismo correo de tu cuenta del proyecto. Para habilitar registros de otras personas, completá primero el SMTP.

Documentación oficial de correos y redirecciones.

- https://supabase.com/docs/guides/auth/auth-smtp
- https://supabase.com/docs/guides/auth/redirect-urls

## 3. Copiar la URL y la clave pública

Buscá la Project URL en el diálogo Connect o en la configuración del proyecto. En Settings > API Keys copiá la clave Publishable. Si usás las claves anteriores, la clave `anon` también sirve para este cliente.

Las variables tienen estos nombres exactos.

| Variable | Valor |
| --- | --- |
| `VITE_SUPABASE_URL` | La Project URL, similar a `https://xxxx.supabase.co` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | La clave Publishable, que suele empezar con `sb_publishable_`, o la antigua `anon` |

Usá únicamente la clave pública. Las claves Secret y `service_role` dan permisos de servidor y no corresponden a esta web.

Documentación de claves.

https://supabase.com/docs/guides/getting-started/api-keys

## 4. Probar desde VS Code

Copiá `.env.example` como `.env.local` en la misma carpeta de `package.json`. Reemplazá los dos valores de ejemplo por los de tu proyecto. `.env.local` está excluido de Git.

En la terminal de esa carpeta, ejecutá.

```sh
npm ci
npm run dev
```

Si ya estaba corriendo Vite cuando agregaste las variables, detenelo y volvé a ejecutar `npm run dev`.

## 5. Configurar Netlify y actualizar desde GitHub

En la configuración del proyecto de Netlify, entrá a Environment variables. Agregá las mismas dos variables con alcance de compilación y para el contexto Production.

Mantené esta configuración de compilación.

| Campo | Valor |
| --- | --- |
| Branch | `main` |
| Base directory | Vacío si `package.json` está en la raíz |
| Build command | `npm run build` |
| Publish directory | `dist` |
| Node.js | `24` |

Esta entrega incluye `netlify.toml` con el comando, la carpeta y la versión de Node.

Copiá los archivos del proyecto actualizado dentro de tu repositorio, respetando su estructura. Incluí los cambios en `package.json`, `package-lock.json`, `src`, `supabase`, `.env.example`, `.gitignore` y `netlify.toml`. Hacé commit y push. Netlify instala las dependencias y vuelve a compilar.

Las variables `VITE_` se incorporan durante la compilación. Agregarlas después de un despliegue requiere otro build. La web publicada anterior no se conecta por sí sola.

## 6. Probar el recorrido completo

1. Entrá a Mi espacio y creá una cuenta con tu correo.
2. Confirmá el correo y entrá al panel.
3. Guardá el nombre artístico, la disciplina y la presentación. Activá el perfil público cuando quieras aparecer en el directorio.
4. Cargá una obra con portada y descripción visual. Para música podés agregar un audio de muestra.
5. Guardá la obra. Empieza en borrador.
6. Publicala y abrí su sala desde una ventana privada del navegador.
7. Recargá la página para verificar que el trabajo quedó guardado.
8. Volvé a borrador y comprobá que la obra deje de aparecer en el catálogo público.
9. Cerrá sesión. Usá Olvidé mi contraseña y completá el cambio desde el correo.
10. Con otra cuenta, comprobá que el panel muestre únicamente sus propios trabajos.

Las URL temporales de portadas y audios duran hasta diez minutos. Una URL ya emitida puede seguir abriéndose hasta vencer, aunque hayas ocultado la obra. La galería renueva las URL al recuperar el foco o cada ocho minutos.

## Funciones de esta entrega

- Registro, ingreso, confirmación por correo, recuperación y cambio de contraseña.
- Cierre de sesión en el dispositivo actual.
- Perfil privado por defecto y directorio público opcional.
- Creación y edición persistente de obras físicas, arte digital y composiciones.
- Portadas JPG, PNG o WebP de hasta 5 MB desde el panel.
- Audio de muestra MP3, WAV u OGG de hasta 10 MB.
- Publicación y vuelta a borrador. Cada artista publica sus propias obras.
- Permisos comprobados por la base de datos y el almacenamiento.
- Detección de ediciones concurrentes por versión.

El bucket privado impone un máximo de 10 MB por archivo y tipos MIME permitidos. Los archivos digitales vendidos se incorporarán con la etapa de pagos. Este bucket se usa para portadas y muestras.

## Qué falta conectar

El carrito sigue siendo una selección de demostración. Pagos, pedidos, reservas de originales, comisiones, envíos y entrega del archivo comprado requieren otra integración. Tampoco se incorporó un rol de administración ni aprobación por Yanina. En esta versión cada artista decide cuándo publicar su propio trabajo.

Antes de habilitar ventas y el registro al público, completaremos los datos reales de la galería y sus condiciones de participación.

## Verificación realizada

Se compilaron el modo de muestra y el modo conectado con variables de prueba. Se ejecutó el esquema dos veces en un PostgreSQL de prueba y se comprobaron restricciones de lectura y escritura para dos autores y un visitante. Se probaron la privacidad de los borradores, el acceso a sus archivos, la publicación, el ocultamiento y los conflictos de versión.

El registro por correo, la recuperación y las transferencias reales de archivos necesitan una prueba final con tu proyecto Supabase, su remitente SMTP y las variables cargadas en Netlify.

## Seguridad aplicada en esta actualización

La compilación genera `dist/_headers`. Netlify aplica esas cabeceras a los archivos estáticos al desplegar. La política CSP limita scripts a la propia web y las conexiones al proyecto Supabase configurado. También permite las tipografías de Google que usa el diseño. Las portadas y muestras se cargan desde el mismo proyecto Supabase.

Se incorporan protección contra la carga de la web dentro de páginas ajenas, prevención de detección incorrecta de tipos de archivo, política de referencias, conexión HTTPS y restricciones de acceso a cámara, micrófono, ubicación y API de pagos del navegador. Al integrar un proveedor de pagos o un servicio externo será necesario revisar las cabeceras para autorizar sus dominios específicos.

`vite.config.js` valida que se configure una URL HTTPS y una clave Publishable o anon. Una clave Secret o service_role impide compilar. Si se expuso una clave privada en un repositorio o despliegue anterior, revocala en Supabase y reemplazala. La validación nueva no revoca claves ya publicadas.

La revisión de dependencias con `npm audit --omit=dev` no encontró vulnerabilidades conocidas al preparar esta actualización. Este resultado cubre los avisos de dependencias del registro en ese momento. Las reglas de base de datos se probaron por separado con dos autores y un visitante.

### Configuración que falta comprobar en las cuentas del proyecto

- Activar autenticación en dos pasos en GitHub, Netlify y Supabase para quienes administren el proyecto.
- Mantener la confirmación de email y revisar los límites de intentos de Supabase Auth.
- Si se decide activar CAPTCHA, conectar primero su widget en los formularios. La interfaz actual todavía no envía tokens CAPTCHA.
- Definir y probar un respaldo de la base de datos y de los archivos. La disponibilidad de copias y recuperación depende del servicio contratado.
- Publicar esta versión y comprobar en las respuestas HTTP de Netlify que aparezcan Content-Security-Policy y X-Frame-Options. El entorno local de Vite no aplica el archivo _headers.
- Repetir las pruebas de dos cuentas con el proyecto Supabase real antes de abrir el registro al público.

Referencias oficiales.

- https://docs.netlify.com/manage/routing/headers/
- https://docs.netlify.com/manage/security/content-security-policy/
- https://supabase.com/docs/guides/auth/rate-limits
- https://supabase.com/docs/guides/auth/auth-captcha
