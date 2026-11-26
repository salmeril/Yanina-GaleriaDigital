> Esta guía corresponde a una etapa anterior. Para instalar la versión actual, seguí primero **PERFILES-Y-OBRAS-v5.md** y ejecutá el esquema actualizado.

# Usuarios, ficha privada y verificación humana · v0.3.0

Si estás instalando la entrega de fotos v0.4.0, seguí primero **FOTOS-DE-PERFIL.md** y su migración conjunta. Esta guía conserva las instrucciones para activar Turnstile.

## Instalar conservando tu conexión

1. Detené Vite con Ctrl + C.
2. Copiá el contenido de `galeria-yanina` dentro de tu proyecto, donde está `package.json`, reemplazando los archivos del mismo nombre. Conservá `.env.local` y `.git`.
3. Ejecutá `npm ci` para instalar también el componente de verificación humana.
4. En Supabase → SQL Editor, ejecutá **supabase/actualizar-datos-privados.sql** completo. Es la migración para cuentas existentes, repetible sin borrar cuentas ni obras. Para un proyecto nuevo, `supabase/schema.sql` ya incluye todo.
5. Ejecutá `npm run dev`, abrí la URL indicada e ingresá con tu cuenta existente.

## Datos del registro y de la cuenta

El registro pide nombre artístico, fecha de nacimiento, correo y contraseña confirmada. El teléfono de contacto es opcional en ese primer paso. La fecha de nacimiento permite calcular la edad y se conserva como dato privado.

En **Mi espacio → Datos personales y de venta**, la persona completa nombre y apellido, fecha de nacimiento, teléfono, país, provincia, localidad y domicilio. La dirección, provincia y código postal son obligatorios al indicar que ofrecerá obras físicas. Para propuestas digitales o composiciones, el domicilio es opcional en esta etapa.

Estos datos son declarados por la persona. No verifican identidad ni habilitan cobros automáticamente. No se publican en la sala, el directorio ni las vistas del catálogo. La ficha está protegida en la base para que cada participante lea y modifique la suya. El permiso de moderar publicaciones no concede acceso a domicilios ajenos. Cuando se implemente la operación comercial, se definirá el acceso mínimo a datos de cada pedido.

Las cuentas existentes siguen funcionando. Si no se ejecuta la migración, la ficha privada mostrará que no puede cargarse, sin impedir el resto del panel.

## Pantalla en blanco

El formulario de obra generaba un UUID durante el primer render. Algunos navegadores o accesos HTTP de red local no exponen `crypto.randomUUID`. Se mueve esa creación al guardado y se agrega compatibilidad usando `crypto.getRandomValues`. Si tampoco está disponible, el formulario pide usar localhost o HTTPS en vez de romper el panel.

Una barrera de errores mantiene la navegación de la galería y ofrece reintentar o cerrar sesión si falla el render del panel. Esto no confirma la causa exacta de cualquier pantalla en blanco: si persiste el problema original, necesitamos el primer error rojo de F12 → Consola para diagnosticarlo.

## Activar la verificación humana

La interfaz incluye Cloudflare Turnstile y pasa el token a Supabase en registro, ingreso, recuperación y reenvío de confirmación. El token se descarta después de cada intento y también al vencer. El cambio de contraseña desde una sesión de recuperación no requiere un widget adicional.

La validación de seguridad la hace Supabase. Mostrar el widget sin activar CAPTCHA en Supabase no bloquea los intentos que eviten la interfaz.

### Orden de configuración

1. En Cloudflare, creá un widget de Turnstile en modo **Managed**. Autorizá los hostnames en uso: `localhost` para desarrollo y `monumental-frangollo-5a2461.netlify.app` para el adelanto. Agregá el dominio final de DonWeb cuando esté disponible. No llevan protocolo, ruta ni puerto.
2. Copiá su **Site Key pública** y agregá en tu `.env.local`:

```env
VITE_TURNSTILE_SITE_KEY=TU_SITE_KEY_PUBLICA
```

Conservá `VITE_SUPABASE_URL` y `VITE_SUPABASE_PUBLISHABLE_KEY`. Reiniciá Vite. En Netlify también se carga la nueva variable y se vuelve a compilar. Para DonWeb, se compila localmente con las tres variables cargadas.

3. Confirmá que el widget cargue en los formularios actualizados en todos los entornos que vayas a usar.
4. En Supabase, entrá en Settings → Authentication → Bot and Abuse Protection (o su sección equivalente de CAPTCHA), activá la protección, elegí Turnstile y guardá la **Secret Key de Turnstile** allí. La Secret Key nunca se agrega a variables `VITE_`, al código ni al repositorio.
5. Probá registro, ingreso, recuperación y reenvío de confirmación. Con CAPTCHA activado, un formulario anterior que no envíe token será rechazado.
6. Revisá los límites de Auth y del envío de correos en Supabase. El widget complementa esos límites y los permisos de base de datos y archivos. No constituye protección absoluta frente a todo tipo de ataque o saturación.

Sin Site Key, el registro conserva su funcionamiento previo y no muestra un widget. En desarrollo se informa la configuración pendiente. Para habilitar el registro público, completá el circuito con validación en Supabase y SMTP propio.

La compilación autoriza el dominio de Turnstile en las directivas CSP de scripts, frames y conexiones solo cuando la Site Key está configurada. Genera `_headers` para Netlify y `.htaccess` para Apache/DonWeb.

## Verificaciones realizadas

- Compilación sin credenciales y con valores públicos de prueba, incluyendo Turnstile.
- Formularios probados con respuestas simuladas de Auth: confirmación de contraseña, registro, ingreso, confirmación pendiente, recuperación y reenvío.
- Token CAPTCHA obligatorio en los cuatro flujos cuando hay Site Key, token enviado a la llamada correcta y descarte después de uso o vencimiento. Prueba de contrato con widget simulado, sin resolver retos reales.
- Panel de cuenta nueva renderizado con datos de prueba sin `crypto.randomUUID`; creación de UUID compatible y recuperación ante un fallo de render intencional.
- Fechas inválidas y futuras rechazadas; edad comprobada antes y después del cumpleaños.
- Migración repetida en PostgreSQL de prueba, conservación de cuentas existentes, privacidad entre dos participantes y un visitante, y aislamiento de domicilios incluso para administradores de publicaciones.
- Registro ampliado revisado en navegador. El envío de correo, la sesión real, Turnstile real y el problema del navegador del usuario deben verificarse con el proyecto conectado.

## Qué continúa

Primero confirmar que el panel ya abre en tu navegador y activar Turnstile. Después se prueba el circuito de una cuenta artista y una administradora: completar ficha, cargar obra, habilitar participación, enviar a revisión y aprobar. La etapa siguiente contempla planes de publicación, cobros, pedidos, stock, comisiones, envíos y entrega de archivos comprados. Estas operaciones comerciales todavía no están activas.

## Documentación oficial

- https://supabase.com/docs/guides/auth/auth-captcha
- https://supabase.com/docs/guides/auth/rate-limits
- https://developers.cloudflare.com/turnstile/get-started/
- https://developers.cloudflare.com/turnstile/reference/content-security-policy/
