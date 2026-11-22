# Usuarios, administración, revisión y futuros planes

## Activar esta actualización

1. En Supabase SQL Editor, ejecutá otra vez el contenido completo de `supabase/schema.sql`. Agrega las tablas y reglas nuevas conservando los perfiles y las obras existentes.
2. Creá desde la web las cuentas que administrarán la galería y confirmá sus correos.
3. Abrí `supabase/asignar-admin.sql`. Reemplazá `EMAIL_DEL_ADMIN` por el correo exacto de una de esas cuentas y ejecutalo en SQL Editor. Repetí para la otra persona si Yanina y Lucas tendrán administración.
4. Volvé a cargar la web e ingresá con esa cuenta. Aparece el enlace Administración y la ruta `#/admin`.
5. Actualizá el código en GitHub y compilá con las variables públicas de Supabase. DonWeb con Ferozo sigue siendo el destino final, según `PUBLICAR-DONWEB.md`.

Los correos se usan únicamente para encontrar la cuenta desde SQL Editor. El administrador se registra como UUID en `gallery_admins`. Una persona no puede convertirse en administradora cambiando los datos de registro o editando su perfil.

Para retirar un permiso de administración, la persona propietaria del proyecto puede quitar su UUID de `gallery_admins` desde Supabase. No se ofrece una acción de promoción a administrador desde el panel público.

## Recorrido de participación

- La cuenta nueva puede iniciar sesión, completar su perfil y guardar borradores.
- Empieza con participación pendiente de habilitación.
- La administración ve su perfil y puede habilitar o suspender la publicación.
- Una participación habilitada y un perfil marcado como público permiten enviar obras a revisión.
- La suspensión oculta sus obras y perfil del catálogo público. La cuenta puede seguir entrando a sus propios borradores. La suspensión bloquea nuevas subidas de archivos y nuevos envíos a revisión.

Las cuentas que existían antes de esta actualización también empiezan pendientes de habilitación. Las obras anteriores conservan sus datos y estados, pero la visibilidad pública depende de habilitar la participación de su artista. Esto permite revisar quién participa al abrir la galería.

## Recorrido de las obras

| Estado | Qué sucede |
| --- | --- |
| Borrador | El artista prepara o modifica la obra. |
| En revisión | El artista envió el trabajo para que la administración lo revise. |
| Cambios solicitados | La administración devolvió la obra con una observación obligatoria. |
| Publicada | La administración aprobó el trabajo. Aparece si el artista tiene participación vigente y perfil público. |

Guardar cambios de título, descripción, técnica, formato, precio, portada o audio devuelve la obra a borrador. Debe enviarse otra vez a revisión. El artista también puede retirar una obra o cancelar una revisión volviendo a borrador.

La aprobación utiliza exactamente el precio sugerido por el artista. Si Yanina necesita ajustar ese valor, devuelve la obra con una observación para que el artista lo modifique y lo vuelva a enviar.

Las decisiones quedan registradas en `gallery_reviews`. Las observaciones están disponibles para la administración y el autor, y no forman parte de la ficha pública. Las decisiones comprueban la versión de la obra para evitar aprobar una edición que cambió en otra pestaña.

## Orientador de precio

El panel del artista incluye un orientador con estos datos.

- Materiales y producción.
- Horas dedicadas y valor de la hora.
- Otros costos.
- Ejemplares o ventas previstos.
- Recargo porcentual sobre costos.

La referencia se calcula así.

```text
Costo total = materiales + horas × valor de la hora + otros costos
Referencia por ejemplar = costo total ÷ ejemplares × (1 + recargo ÷ 100)
```

Para una obra única se usa un ejemplar. Para una edición o un archivo digital, la cantidad de ventas prevista es una hipótesis del artista. La herramienta no cuenta con resultados reales de ventas ni comparables de mercado.

El artista puede aplicar el cálculo al campo de precio sugerido y ajustarlo antes de guardar. Se conserva el precio elegido en la obra. Los componentes de la calculadora son temporales durante la edición y no se guardan como tasación.

Para evolucionar hacia una estimación de mercado tendremos que definir referencias verificables, trayectoria, técnica, medidas, ediciones y criterios de comparación. No se asignaron calificaciones automáticas a artistas ni valores de mercado sin esos datos.

## Planes de publicación

La base incluye `gallery_memberships`, con participación, una etiqueta interna `plan_code` y un vencimiento opcional `valid_until`. La etiqueta inicial es `por_definir`. No habilita una cuenta por sí sola.

La vigencia y la habilitación se comprueban en la base de datos. Si el vencimiento existe y ya pasó, la participación deja de habilitar envíos y visibilidad pública. La interfaz de esta entrega controla la habilitación o suspensión. Los planes y sus vencimientos se conectarán con la etapa de cobros.

Antes de implementarlos hay que acordar nombres, precios, límites de obras, duración, beneficios, renovación y el tratamiento de publicaciones al vencer. Esos valores todavía no fueron definidos y no hay cobros automáticos ni cuotas de publicación activas.

## Prueba completa

1. Creá dos artistas y un administrador.
2. Verificá que un artista no pueda entrar a `#/admin` ni cambiar su participación.
3. Desde administración, habilitá a uno de los artistas.
4. Ese artista activa su perfil público, carga una obra y prueba el orientador de precio.
5. Guardá como borrador, enviá a revisión y devolvela con una observación desde administración.
6. El artista ve la observación, corrige y vuelve a enviar.
7. Aprobá la obra y comprobá su ficha desde una ventana privada.
8. Editá la obra como artista y verificá que vuelva a borrador y salga del catálogo.
9. Repetí la aprobación y suspendé la participación. El catálogo debe ocultarla.
10. Comprobá que el segundo artista no pueda leer los borradores ni las observaciones del primero.

Se probaron las reglas SQL en PostgreSQL de prueba, la actualización desde los datos anteriores, el bloqueo del autoascenso, las observaciones privadas, la publicación, la suspensión y los conflictos de versión. Se probaron también el cálculo de precios y las entradas inválidas. La prueba final con correos y archivos del servicio real se realiza después de conectar tu proyecto Supabase.
