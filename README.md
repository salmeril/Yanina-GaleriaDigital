# Galería colectiva · Adelanto 03

Proyecto React + Vite preparado para VS Code y Netlify. El nombre Galería colectiva es provisional. La plataforma contempla múltiples artistas y compositores, catálogo físico y digital y espacios individuales. Yanina tiene una presentación propia dentro de la plataforma.

## Abrir en VS Code

Con Node.js 24 instalado, abrí esta carpeta y ejecutá en la terminal.

```sh
npm ci
npm run dev
```

Abrí la dirección que muestra la terminal. Para compilar, ejecutá `npm run build`. El resultado queda en `dist`.

## Mostrar en Netlify

El ZIP incluye una carpeta `publicar-netlify` con la compilación lista. Para una publicación manual, arrastrá esa carpeta a la pantalla de deploy manual de Netlify. Para actualizar un sitio existente, usá su área de despliegue manual.

Para despliegue desde GitHub, copiá el contenido de `galeria-yanina` a la raíz de tu repositorio. Incluí `.gitignore`, package-lock.json y netlify.toml. Configurá ese repositorio en Netlify. El archivo netlify.toml declara el comando `npm run build`, la carpeta `dist` y Node.js 24. Si guardás el proyecto dentro de una subcarpeta del repositorio, configurá esa subcarpeta como base en Netlify.

La navegación utiliza rutas con hash y funciona en alojamiento estático.

## Qué se puede probar

- Inicio de galería colectiva y perfiles de tres creadores ficticios.
- Catálogo con filtros para obras físicas, arte digital y música.
- Ficha ampliada con precio, detalles, autor y modalidad de entrega.
- Reproductor de un audio sintético de demostración, generado para este adelanto.
- Selección de una unidad por obra, eliminación y subtotal en ARS.
- Revisión del pedido de ejemplo, con envío físico pendiente de cotizar y entrega digital pendiente de habilitar.
- Panel sin autenticación para crear borradores con portada y mostrarlos en el catálogo de esa pestaña.

Las cargas y la selección viven solo en memoria y se pierden al recargar o cerrar la página. Cada visitante de Netlify prueba su propia sesión. Nada se envía a otros visitantes ni a un servidor. Los borradores no contienen archivos vendidos, solo una portada opcional. No hay pagos, pedidos, reservas, usuarios ni envío de correos reales.

## Material y datos

Los perfiles, precios, obras, licencias y condiciones son ficticios. Reemplazalos en `src/data.js`. Las composiciones visuales están hechas con CSS, no representan obras reales. Para usar fotos, guardalas en `public/obras` y completá image y alt en los datos. Los textos de presentación deben validarse con Yanina. La tipografía se carga desde Google Fonts con alternativas locales.

## Funciones necesarias para vender

1. Autenticación y recuperación de cuentas de artistas, compradores y administración.
2. Base de datos y autorización en servidor para que cada artista edite únicamente sus obras. Definir aprobación editorial con Yanina.
3. Almacenamiento de portadas, audio de muestra y archivos digitales privados. Validación de archivos en servidor.
4. Gestión de obras únicas, ediciones, disponibilidad, borradores y publicación.
5. Precios y pedidos verificados en servidor. El navegador no debe definir el importe a cobrar.
6. Integración del medio de pago elegido y validación de sus notificaciones en servidor. Confirmación idempotente para evitar pedidos duplicados.
7. Reserva y liberación de originales físicos para evitar ventas simultáneas de una misma pieza.
8. Entrega digital autorizada después del pago, con accesos privados y condiciones de uso de cada autor.
9. Cotización por origen, destino, peso y embalaje. Definir retiro, transportista, seguimiento y responsabilidad sobre cada envío.
10. Definir quién cobra, las comisiones de la plataforma, la liquidación a los artistas y la política de cancelaciones y devoluciones.

El adelanto sirve para revisar estos recorridos. Las integraciones comerciales requieren definir el modelo de cobro y crear o conectar los servicios correspondientes.

## Identidad de Yanina

Encabezado y pie incorporan el sello circular naranja que aparece en las piezas anteriores de Yanina. Como no se encontró un archivo aislado del logo, se utiliza una ventana circular CSS sobre la referencia existente `public/marca/referencia-yanina.png`. La referencia se conserva sin modificaciones. Para una versión final más liviana conviene sustituir esta referencia por el archivo original del logo y simplificar el componente Brand.

La paleta digital se adaptó visualmente de las referencias existentes, sin un manual con códigos oficiales. Naranja #f25418, violeta #6b308c, turquesa #008ca7, amarillo #ffcf47 y crema #fff7e8. El favicon es una inicial Y sobre círculo naranja como adaptación para tamaño pequeño.
