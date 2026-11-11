# Galería colectiva · Cuentas y obras permanentes

React + Vite para trabajar en VS Code y publicar desde GitHub en Netlify.

Esta versión integra Supabase para registro por correo, acceso, recuperación de contraseña, perfiles y obras persistentes. Cada artista administra su propia sala. El catálogo público muestra los trabajos publicados por perfiles visibles.

## Empezar

Usá Node.js 24 y ejecutá en esta carpeta.

```sh
npm ci
npm run dev
```

Para compilar, ejecutá `npm run build`. La salida se genera en `dist`.

Leé **CONECTAR-CUENTAS.md** para configurar Supabase y Netlify. El esquema y los permisos están en `supabase/schema.sql`. Las variables de ejemplo están en `.env.example`.

Sin las dos variables de conexión la web muestra el catálogo ficticio y el acceso informa que se está preparando. Con ambas variables, carga perfiles y obras desde Supabase. La cuenta nueva empieza con un perfil privado y un catálogo vacío.

## Archivos de trabajo

- `src/main.jsx` contiene la galería pública y la selección de demostración.
- `src/Workspace.jsx` contiene las cuentas y el panel de artistas.
- `src/backend.js` integra autenticación, datos y archivos.
- `src/data.js` contiene las obras ficticias para el modo de muestra y las etiquetas de formato.
- `src/styles.css` contiene el diseño y la paleta adaptada de las piezas de Yanina.
- `netlify.toml` contiene el comando de compilación y la salida para Netlify.

## Identidad y alcance

El nombre Galería colectiva es provisional. El sello circular se muestra desde una referencia anterior de Yanina en `public/marca/referencia-yanina.png`. Queda pendiente reemplazarlo por el archivo original del logo. Los colores se adaptaron visualmente de esas referencias.

Los registros nuevos se publican por decisión del propio artista. La revisión por Yanina y un rol administrativo quedan para otra etapa. El carrito, los pagos, los envíos y la entrega de archivos vendidos todavía están en desarrollo.

El archivo CONECTAR-CUENTAS.md detalla las verificaciones realizadas y las pruebas pendientes contra el servicio real.
