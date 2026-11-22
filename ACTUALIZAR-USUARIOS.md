# Usuarios · versión 0.2.1

Esta entrega hace visible el acceso desde el menú y separa las pantallas de usuarios. Mantiene la paleta, la bruma y las herramientas de artistas y administración.

## Instalar en tu proyecto actual

1. Detené Vite con Ctrl + C.
2. Copiá el contenido de la carpeta `galeria-yanina` del ZIP dentro de la carpeta de tu repositorio donde ya está `package.json`. Reemplazá los archivos del mismo nombre. No crees una segunda carpeta anidada `galeria-yanina`.
3. Conservá tu archivo `.env.local` y la carpeta `.git`. Esta entrega no incluye credenciales.
4. Abrí una terminal en esa carpeta y ejecutá `npm ci` y después `npm run dev`.
5. Abrí la URL que indique Vite. En el menú deben aparecer **Ingresar** y **Crear cuenta**.

## Pantallas incluidas

| Acceso | Ruta después del dominio o puerto |
| --- | --- |
| Ingresar | `/#/ingresar` |
| Crear cuenta | `/#/registro` |
| Recuperar contraseña | `/#/recuperar` |
| Reenviar confirmación | `/#/reenviar-confirmacion` |
| Perfil y obras | `/#/mi-espacio` |
| Administración | `/#/admin` |

La cuenta administradora usa el mismo formulario de ingreso. La página no permite elegirse administrador al registrarse. El permiso se asigna en Supabase con `supabase/asignar-admin.sql`, después de crear la cuenta, siguiendo `ADMIN-Y-PLANES.md`.

## Conectar el servicio real

Si ya ejecutaste `supabase/schema.sql` correctamente, esta actualización de formularios no necesita ejecutar SQL nuevo. Conserva las tablas y las reglas de permisos.

En `.env.local`, al lado de `package.json`, completá los nombres exactos:

```env
VITE_SUPABASE_URL=https://TU-PROYECTO.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=TU-CLAVE-PUBLICABLE
```

Reemplazá los ejemplos por la Project URL y la Publishable key de tu proyecto. No uses Secret ni service_role. Reiniciá Vite después de cualquier cambio de variables.

Sin conexión configurada, las pantallas se pueden recorrer pero los campos permiten escribir y solo el botón de envío queda deshabilitado con el texto Conexión pendiente. Un aviso explica el estado. No simulan registro ni acceso. En desarrollo, el aviso también permite desplegar ayuda para configurar las variables.

Para probar por primera vez con el correo predeterminado de Supabase, usá el email del equipo del proyecto. Para recibir confirmaciones y recuperaciones en cuentas de artistas externos, primero configurá SMTP propio. Mantené la confirmación de correo activada.

## Mostrarlo en Netlify

El `.env.local` de tu máquina no se sube a GitHub. En Netlify agregá las mismas dos variables para la compilación de producción y volvé a desplegar desde GitHub. Comando `npm run build`, salida `dist`. Sin esas variables en Netlify, se verán los formularios con el aviso de acceso pendiente.

Para DonWeb, compilá con las variables cargadas y publicá el contenido de `dist` siguiendo `PUBLICAR-DONWEB.md`. DonWeb no necesita ejecutar npm en cada visita.

## Prueba con cuentas reales

Creá una cuenta, confirmá el correo e ingresá. Verificá el perfil, cierre de sesión, reingreso y recuperación de contraseña. Asigná administración con el SQL indicado. Probá otra cuenta como artista para comprobar sus obras y la revisión antes de abrir la galería al público.

La comprobación final de correos, sesión real y permisos en tu proyecto requiere tus variables y la configuración de Supabase. Esta entrega no contiene esas credenciales.

## Verificado en esta entrega

Compilación con y sin variables públicas de prueba, rechazo de claves privadas y navegación de las cuatro pantallas en el navegador. Se probaron con respuestas simuladas los formularios sin conexión, rechazo de contraseñas distintas, registro sin privilegios de administración, confirmación pendiente, ingreso, recuperación sin revelar si existe la cuenta y reenvío. La revisión de dependencias de producción no encontró vulnerabilidades conocidas en esta comprobación.

Las respuestas simuladas no verifican el envío de correo, la autenticación o los permisos en tu Supabase real. Esas pruebas siguen pendientes de conexión.
