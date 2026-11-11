# Galería digital de Yanina Baldesari

Primera versión navegable en React y Vite para trabajar en VS Code.

## Abrir el proyecto

Usá una versión LTS vigente de Node.js compatible con la versión de Vite del package-lock.json. Abrí esta carpeta en VS Code y ejecutá en su terminal.

```sh
npm ci
npm run dev
```

Abrí la dirección que muestra la terminal. Para generar los archivos de publicación, ejecutá `npm run build`. Para revisarlos localmente, ejecutá `npm run preview`.

## Recorridos incluidos

- Inicio con portada y acceso a las muestras.
- Galería con filtros y obras ampliables en un diálogo accesible.
- Tres muestras de ejemplo basadas en propuestas del taller.
- Sala de participante de demostración.
- Página informativa para el futuro acceso personal.

## Material de ejemplo

Las composiciones abstractas son ilustraciones CSS de maqueta. Los títulos y la sala son de demostración. Los textos de muestras deben validarse con Yanina.

Para incorporar fotos reales, copialas en `public/obras` y editá `src/data.js`. En cada registro completá `image` (por ejemplo `/obras/acuarela-01.jpg`), `alt` (descripción visual), `title`, `artist` y `medium`. Se recomienda publicar imágenes de las obras y objetos del taller.

La portada usa el primer registro. Las tarjetas de muestras usan la primera obra de cada propuesta. Los cambios en los datos se reflejan en esos lugares.

La tipografía se carga desde Google Fonts y tiene alternativas locales. El resto del adelanto no requiere servicios externos.

## Cuentas de participantes

El adelanto todavía no incluye autenticación, subida de archivos ni almacenamiento de datos. La página de acceso comunica ese estado. Antes de abrir cuentas hay que integrar autenticación, recuperación de acceso, almacenamiento de imágenes y permisos comprobados en servidor. Cada participante debe poder modificar únicamente su propia sala. El flujo de aprobación de obras por Yanina queda pendiente de confirmar e implementar.

## Llevarlo a tu repositorio

Si clonaste el repositorio vacío, copiá el contenido de esta carpeta dentro de él, incluyendo `.gitignore`. No copies `node_modules` ni `dist`. Podés confirmar los archivos y subirlos desde el panel de Control de código fuente de VS Code.

El proyecto incluye package-lock.json para instalar las mismas dependencias con `npm ci`.
