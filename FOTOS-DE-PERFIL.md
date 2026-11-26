# Fotos de perfil · v0.4.0

## Actualizar tu proyecto

1. Detené Vite con Ctrl + C.
2. Copiá el contenido de `galeria-yanina` sobre tu proyecto, donde está `package.json`, reemplazando archivos del mismo nombre. Conservá tu `.env.local` y `.git`.
3. Ejecutá `npm ci`.
4. En Supabase → SQL Editor, pegá y ejecutá el contenido completo de **supabase/actualizar-perfiles-v4.sql**. Este archivo incluye tanto la ficha privada de v3 como las fotos, por lo que sirve aunque no hubieras aplicado la migración anterior. Se puede repetir sin borrar cuentas ni obras.
5. Ejecutá `npm run dev` e ingresá con tu cuenta existente.

Para un proyecto nuevo, `supabase/schema.sql` contiene el esquema completo.

## Cargar o cambiar la foto

Entrá a **Mi espacio → Tu perfil → Foto de perfil**. Elegí un archivo JPG, PNG o WebP de hasta 2 MB. Se muestra una vista previa circular con recorte centrado. Presioná **Guardar perfil** para aplicar la foto junto con el resto de los datos del perfil.

La foto aparece en el editor privado, en la cabecera de la sala pública y al lado del nombre en las tarjetas del directorio y la portada. El resto del diseño, la paleta y la bruma se conservan.

Una imagen cuadrada funciona mejor. Esta entrega no incluye un editor manual de recorte; se centra la imagen al mostrarla y se conserva el archivo original.

Para quitarla, marcá **Quitar mi foto al guardar** y presioná **Guardar perfil**. Si no hay foto o no puede cargarse, se muestran las iniciales del nombre artístico.

## Visibilidad y archivos

La foto se guarda en el bucket privado `gallery-avatars`. El límite de 2 MB y los tipos JPG, PNG y WebP también están configurados en el bucket. Cada cuenta sube dentro de su propia carpeta y el perfil solo puede referenciar una foto propia que exista.

La foto se ve públicamente cuando el perfil es público y la participación está habilitada. Ocultar el perfil o suspender la participación impide emitir nuevas URL públicas para esa foto. Una URL temporal ya emitida puede seguir funcionando hasta vencer, como máximo diez minutos después de su emisión. La galería renueva sus URL al recuperar el foco y cada ocho minutos.

Al cambiar o quitar la foto, se intenta eliminar el archivo anterior. Los permisos impiden borrar un archivo todavía referenciado por un perfil. Si falla la limpieza por una interrupción de red, el guardado confirmado se conserva; el archivo antiguo puede quedar sin referencia para una limpieza posterior.

Si la foto falla, el catálogo y el perfil siguen mostrando las iniciales. Las cuentas existentes siguen siendo válidas y no es necesario registrarse otra vez.

## Qué se verificó

- Compilación de producción y render del panel con una cuenta de prueba.
- Subida nueva, reemplazo, eliminación y conflicto de edición, usando un cliente de almacenamiento simulado.
- Rechazo de archivo vacío, SVG y tamaño superior a 2 MB en el cliente.
- Reglas de PostgreSQL con dos participantes y un visitante: carpeta propia, foto existente y propia, privacidad al ocultar o suspender, protección contra borrado en uso y limpieza al quitar la referencia.
- Migración desde el esquema anterior y repetición del esquema completo conservando perfiles y datos privados.

La transferencia real de una foto y la emisión de URL en tu proyecto Supabase se prueban después de ejecutar el SQL y abrir la web con tus variables.

## Siguiente prueba

Con tu cuenta, cargá la foto y guardá el perfil. Confirmá que siga apareciendo al actualizar. Después habilitaremos la participación desde administración y revisaremos cómo se muestra la sala pública. Turnstile continúa con su configuración de v3; sus claves se activan siguiendo `ACTUALIZAR-USUARIOS.md`.
