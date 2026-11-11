// Reemplazá image por "/obras/nombre-de-la-foto.jpg" y completá el texto
// alternativo al incorporar las obras reales en public/obras.
// Los nombres, títulos y perfiles de esta primera versión son de demostración.
export const artworks = [
  { id: 'sonido-01', title: 'Un sonido, muchos colores', collection: 'musica', artist: 'Sala de ejemplo', medium: 'Acuarela sobre papel', image: '', alt: '', palette: 'coral' },
  { id: 'sonido-02', title: 'Lo que se mueve', collection: 'musica', artist: 'Sala de ejemplo', medium: 'Acuarela sobre papel', image: '', alt: '', palette: 'green' },
  { id: 'sombra-01', title: 'Entre formas', collection: 'sombra', artist: 'Sala de ejemplo', medium: 'Exploración sobre papel', image: '', alt: '', palette: 'purple' },
  { id: 'sonido-03', title: 'Después del agua', collection: 'musica', artist: 'Sala de ejemplo', medium: 'Acuarela sobre papel', image: '', alt: '', palette: 'blue' },
  { id: 'sin-ver-01', title: 'Dejar ir el trazo', collection: 'sin-ver', artist: 'Sala de ejemplo', medium: 'Exploración sobre papel', image: '', alt: '', palette: 'ochre' },
  { id: 'sombra-02', title: 'Un lugar nuevo', collection: 'sombra', artist: 'Sala de ejemplo', medium: 'Exploración sobre papel', image: '', alt: '', palette: 'pink' },
];

export const collections = [
  { id: 'musica', name: 'Pintamos música', description: 'Escuchamos, pintamos los sonidos y después sumamos acuarela para que los colores se mezclaran.', palette: 'coral', number: '01' },
  { id: 'sombra', name: 'La sombra', description: 'Una propuesta del taller para explorar formas e imágenes alrededor de la sombra.', palette: 'purple', number: '02' },
  { id: 'sin-ver', name: 'Pintamos sin ver', description: 'Una invitación a descubrir el trazo desde otra manera de mirar.', palette: 'green', number: '03' },
];
