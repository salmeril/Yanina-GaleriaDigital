# Galería colectiva · Usuarios v0.3.0

React + Vite para trabajar en VS Code. La publicación final está prevista en DonWeb, con Netlify como adelanto de revisión.

Esta versión integra Supabase para registro por correo, acceso, recuperación de contraseña, perfiles y obras persistentes. Cada artista administra su propia sala. El catálogo público muestra los trabajos publicados por perfiles visibles.

Leé **ACTUALIZAR-USUARIOS.md** para instalar esta actualización conservando tu `.env.local`.

Esta actualización agrega fecha de nacimiento y teléfono al registro, ficha privada para datos personales y domicilio, integración de Turnstile y recuperación ante errores del panel. Requiere ejecutar `supabase/actualizar-datos-privados.sql` si ya tenés una base anterior.

## Empezar

Usá Node.js 24 y ejecutá en esta carpeta.

```sh
npm ci
npm run dev
```

Para compilar, ejecutá `npm run build`. La salida se genera en `dist`.

Leé **PUBLICAR-DONWEB.md** para la publicación final y **CONECTAR-CUENTAS.md** para activar Supabase. El esquema y los permisos están en `supabase/schema.sql`. Las variables de ejemplo están en `.env.example`.

El menú muestra Ingresar y Crear cuenta. Sin las dos variables de conexión la web muestra el catálogo ficticio y los formularios de acceso visibles, con un aviso y el botón de envío deshabilitado. Los campos permiten escribir. No se crean cuentas de muestra ni se guardan contraseñas localmente. Con ambas variables, carga perfiles y obras desde Supabase. La cuenta nueva empieza con un perfil privado y un catálogo vacío.

## Archivos de trabajo

- `src/main.jsx` contiene la galería pública y la selección de demostración.
- `src/AccessForm.jsx` contiene ingreso, registro, recuperación y reenvío de confirmación.
- `src/accounts.css` contiene los estilos de acceso.
- `src/SellerDetails.jsx` contiene la ficha privada de participación y venta.
- `src/PanelBoundary.jsx` contiene la recuperación ante errores de render del panel.
- `src/Workspace.jsx` contiene la sesión y los paneles de artistas y administración.
- `src/AdminDashboard.jsx` contiene habilitación de participantes y revisión de obras.
- `src/PriceEstimator.jsx` y `src/pricing.js` contienen el orientador de precio por costos.
- `src/backend.js` integra autenticación, datos y archivos.
- `src/data.js` contiene las obras ficticias para el modo de muestra y las etiquetas de formato.
- `src/styles.css` contiene los estilos base y del panel.
- `src/design.css` aplica la dirección visual inspirada en la referencia de video, con portada, bloques de color, tarjetas y animaciones al recorrer la página.
- `netlify.toml` contiene el comando de compilación y la salida para Netlify.

## Identidad y alcance

El nombre Galería colectiva es provisional. El sello circular se muestra desde una referencia anterior de Yanina en `public/marca/referencia-yanina.png`. Queda pendiente reemplazarlo por el archivo original del logo. Los colores se adaptaron visualmente de esas referencias.

Los registros nuevos empiezan con participación pendiente. Un administrador habilita al artista, revisa sus obras y aprueba su publicación o solicita cambios. Leé **ADMIN-Y-PLANES.md** para asignar el primer administrador y probar el circuito. El carrito, los pagos, los envíos y la entrega de archivos vendidos todavía están en desarrollo.

El archivo CONECTAR-CUENTAS.md detalla las verificaciones realizadas y las pruebas pendientes contra el servicio real.

La compilación genera `.htaccess` para Apache/DonWeb y `_headers` para el adelanto en Netlify. Las cabeceras deben verificarse en el servidor final.

## Paleta y bruma de color

La interfaz toma la nueva referencia cromática aportada por Lucas, con índigo #14015a, celeste #89bcf1, magenta #b1016d, violeta #5b316c y dorado #fab522. La bruma se define en `src/atmosphere.css`, importado después de los estilos anteriores. Las capas decorativas tienen movimiento automático lento y respetan la preferencia de movimiento reducido del dispositivo.
