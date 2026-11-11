// Datos ficticios para presentar la plataforma. Precios en pesos argentinos.
// Las imágenes, títulos, biografías, condiciones y licencias deben reemplazarse
// por material aprobado antes de habilitar ventas.
export const artists = [
  {
    id: "artista-visual",
    name: "Artista visual · Ejemplo",
    discipline: "Pintura y acuarela",
    bio: "Este perfil muestra cómo cada artista podrá presentar su recorrido, reunir sus obras y ofrecerlas en la galería.",
    palette: "coral",
  },
  {
    id: "artista-digital",
    name: "Artista digital · Ejemplo",
    discipline: "Ilustración digital",
    bio: "Un espacio para compartir ilustraciones, explorar series y ofrecer archivos digitales con sus condiciones de uso.",
    palette: "purple",
  },
  {
    id: "compositor",
    name: "Compositor/a · Ejemplo",
    discipline: "Música y composición",
    bio: "Una sala para presentar composiciones, compartir una muestra de audio y ofrecer partituras o archivos de audio.",
    palette: "blue",
  },
];

export const artworks = [
  {
    id: "obra-01",
    title: "Un sonido, muchos colores",
    artistId: "artista-visual",
    type: "fisica",
    medium: "Acuarela sobre papel",
    details: "30 × 40 cm · Pieza original · Sin marco",
    price: 85000,
    image: "",
    alt: "",
    palette: "coral",
  },
  {
    id: "obra-02",
    title: "Lo que se mueve",
    artistId: "artista-visual",
    type: "fisica",
    medium: "Técnica mixta",
    details: "40 × 50 cm · Pieza original · Sin marco",
    price: 120000,
    image: "",
    alt: "",
    palette: "green",
  },
  {
    id: "obra-03",
    title: "Entre formas",
    artistId: "artista-digital",
    type: "digital",
    medium: "Ilustración digital",
    details: "PNG · 3000 × 4000 px · Licencia de uso personal de ejemplo",
    price: 18000,
    image: "",
    alt: "",
    palette: "purple",
  },
  {
    id: "obra-04",
    title: "Pausa en azul",
    artistId: "compositor",
    type: "musica",
    medium: "Composición instrumental",
    details:
      "Entrega propuesta WAV + partitura PDF · Licencia personal de ejemplo",
    price: 25000,
    image: "",
    alt: "",
    palette: "blue",
    audio: "/audio/muestra-demo.wav",
  },
  {
    id: "obra-05",
    title: "Dejar ir el trazo",
    artistId: "artista-digital",
    type: "digital",
    medium: "Dibujo digital",
    details: "PDF para impresión · A4 · Licencia de uso personal de ejemplo",
    price: 15000,
    image: "",
    alt: "",
    palette: "ochre",
  },
  {
    id: "obra-06",
    title: "Un lugar nuevo",
    artistId: "artista-visual",
    type: "fisica",
    medium: "Acrílico sobre papel",
    details: "25 × 35 cm · Pieza original · Sin marco",
    price: 65000,
    image: "",
    alt: "",
    palette: "pink",
  },
];

export const workTypes = [
  { id: "todas", name: "Todas las obras" },
  { id: "fisica", name: "Obras físicas" },
  { id: "digital", name: "Arte digital" },
  { id: "musica", name: "Música y partituras" },
];

export function formatPrice(value) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 2,
  }).format(value);
}
