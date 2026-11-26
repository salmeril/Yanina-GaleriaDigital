# Perfiles y catálogo de artistas · v0.5.0

Esta actualización conserva las funciones anteriores de cuentas, fotos, ficha privada, revisión y administración. Los planes de publicación quedan pendientes para el final.

## Instalar sobre tu proyecto

1. Descomprimí el ZIP y copiá **el contenido de `galeria-yanina`** dentro de la carpeta de tu proyecto en VS Code. No crees otra carpeta `galeria-yanina` adentro de tu repositorio.
2. Conservá tu `.env.local` y tu carpeta `.git`. El ZIP no contiene credenciales.
3. En Supabase → SQL Editor, abrí una consulta nueva, pegá **todo `supabase/schema.sql`** de esta versión y ejecutalo. Es el esquema completo, incluye las actualizaciones anteriores y puede repetirse sin borrar perfiles, obras, habilitaciones ni archivos. No uses scripts viejos después de este.
4. En la terminal, en la carpeta donde está `package.json`, ejecutá:

```powershell
npm ci
npm run dev
```

5. Abrí la dirección que te muestre Vite y entrá a **Mi espacio** con tu cuenta existente.

Si ya tenés exactamente v4 en la base, podés usar `supabase/actualizar-obras-perfiles-v5.sql` en lugar del esquema completo. Si no sabés qué versión ejecutaste antes, usá `supabase/schema.sql`.

## Qué probar

### Perfil y sala pública

- En Tu perfil, guardá nombre, disciplina, presentación y foto.
- Podés agregar una ubicación pública general, sitio web e Instagram. Usá enlaces completos `https://…`. La ubicación pública es independiente del domicilio privado.
- Activá Mostrar mi perfil. Un administrador debe tener habilitada tu participación para que aparezca en el directorio.
- Usá Ver mi sala y Compartir perfil. El enlace reúne las obras publicadas de ese artista.
- Ocultar el perfil o suspender la participación también oculta sus obras del catálogo público. Las URL de archivos ya firmadas pueden seguir funcionando hasta su vencimiento de diez minutos.

### Obras

- Física: año, medidas con unidad, presentación con/sin marco y retiro/envío.
- Digital: formato, resolución, material incluido y condiciones de uso.
- Música: formato, duración en segundos, material incluido, licencia y muestra de audio.
- Todas: título, descripción, técnica, precio sugerido, disponibilidad y portada.
- Hasta cinco fotos adicionales, con una descripción visual para cada una. JPG, PNG o WebP hasta 5 MB por imagen. Podés quitar imágenes, reemplazar la portada o quitar/reemplazar el audio.
- Vista previa muestra la ficha sin guardar ni publicar. Cada cambio del formulario descarta esa vista para evitar mostrar datos anteriores.
- Guardar borrador conserva la obra; después se envía a revisión desde Tus obras.
- Los datos nuevos son opcionales para conservar obras anteriores y poder preparar borradores. Completalos antes de enviar a revisión. El administrador revisa la ficha y puede pedir que se amplíe.

### Revisión

- Filtrá Tus obras por borrador, revisión, observaciones o publicadas.
- Consultá la última observación y el historial de decisiones.
- En Administración, las imágenes y la ficha son las mismas que verá el público.
- Cambiar datos, disponibilidad o imágenes de una obra publicada la devuelve a borrador. La aprobación solo puede realizarla una cuenta de administración.
- Reservada, vendida o solo exposición permanece visible si está publicada, pero no permite agregarse a la selección de prueba. Esto no reemplaza un control de stock transaccional.

## Actualizar Netlify

1. Ejecutá `npm run build` y comprobá que termine correctamente.
2. Guardá los cambios con Git, creá un commit y subilo a `main` desde VS Code.
3. Netlify construye con `npm run build` y publica `dist`. Esperá a que el despliegue del nuevo commit figure como publicado.
4. Las variables `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` y, si lo configuraste, `VITE_TURNSTILE_SITE_KEY`, deben estar también en las variables de compilación de Netlify. `.env.local` no se sube a GitHub.

Los archivos siguen siendo compatibles con la compilación para DonWeb. Consultá PUBLICAR-DONWEB.md al pasar al hosting definitivo.

## Verificación y límites

Se verificaron la compilación, el recorrido público en navegador, el formulario por tipo de obra, la vista previa, la galería de imágenes y el guardado con control de versión mediante pruebas con respuestas simuladas. Las pruebas SQL verificaron la migración desde v4, la repetición del esquema y los permisos entre autor, otra cuenta, visitante y administrador.

La conexión, envío de emails, CAPTCHA y cargas reales deben comprobarse contra tu propio proyecto Supabase: esta actualización no incluye claves ni modifica tu servicio remoto automáticamente.

Todavía no hay cobros reales, pedidos persistentes, reserva automática de stock, cálculo de envíos ni entrega privada del archivo vendido. Cargá solo portadas, fotos y audios de muestra en esta etapa; no subas el archivo final que se entregará tras la compra.
