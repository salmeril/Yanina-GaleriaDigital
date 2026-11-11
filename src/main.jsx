import React, { useCallback, useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  artworks as initialArtworks,
  artists as initialArtists,
  workTypes,
  formatPrice,
} from "./data";
import "./styles.css";
import "./design.css";
import { backend, loadCatalog, friendlyError } from "./backend";
import Workspace, { useAccount } from "./Workspace";

function ArtworkImage({ artwork, className = "" }) {
  if (artwork.image)
    return (
      <img
        className={`art-image ${className}`}
        src={artwork.image}
        alt={artwork.alt}
        loading="lazy"
      />
    );
  return (
    <div
      className={`art-image abstract ${artwork.palette} ${className}`}
      role="img"
      aria-label="Composición abstracta de demostración"
    >
      <span className="paint paint-one" />
      <span className="paint paint-two" />
      <span className="paint paint-three" />
      <span className="drawn-line" />
      <small className="sample-label">Imagen de ejemplo</small>
    </div>
  );
}

function Brand() {
  return (
    <a
      className="brand brand-yanina"
      href="#/"
      aria-label="Galería colectiva de Yanina Baldesari, inicio"
    >
      <span className="yanina-seal" aria-hidden="true">
        <img
          src="/marca/referencia-yanina.png"
          alt=""
          width="1080"
          height="1920"
        />
      </span>
      <span className="brand-caption">
        Galería colectiva<small>Arte visual · Música · Creación</small>
      </span>
    </a>
  );
}

function App() {
  const [route, setRoute] = useState(() =>
    location.hash.startsWith("#/") ? location.hash.slice(1) : "/",
  );
  const [filter, setFilter] = useState("todas");
  const [artworks, setArtworks] = useState(backend ? [] : initialArtworks);
  const [artists, setArtists] = useState(backend ? [] : initialArtists);
  const [catalogError, setCatalogError] = useState("");
  const [catalogLoading, setCatalogLoading] = useState(Boolean(backend));
  const catalogRequest = useRef(0);
  const account = useAccount();
  const refreshCatalog = useCallback(async () => {
    if (!backend) return;
    const revision = ++catalogRequest.current;
    setCatalogLoading(true);
    try {
      const data = await loadCatalog();
      if (revision !== catalogRequest.current) return;
      setArtists(data.artists);
      setArtworks(data.artworks);
      setCatalogError("");
    } catch (error) {
      if (revision !== catalogRequest.current) return;
      setArtists([]);
      setArtworks([]);
      setCatalogError(friendlyError(error));
    } finally {
      if (revision === catalogRequest.current) setCatalogLoading(false);
    }
  }, []);
  useEffect(() => {
    refreshCatalog();
    const timer = setInterval(refreshCatalog, 8 * 60 * 1000);
    window.addEventListener("focus", refreshCatalog);
    return () => {
      catalogRequest.current += 1;
      clearInterval(timer);
      window.removeEventListener("focus", refreshCatalog);
    };
  }, [refreshCatalog, account.session?.user.id]);
  const [cart, setCart] = useState([]);
  const [selected, setSelected] = useState(null);
  const [notice, setNotice] = useState("");
  const [reviewed, setReviewed] = useState(false);
  const dialogRef = useRef(null);
  const mainRef = useRef(null);
  const firstRoute = useRef(true);
  const artist = artists.find((item) => route === `/artistas/${item.id}`);
  const knownRoute =
    [
      "/",
      "/galeria",
      "/artistas",
      "/yanina",
      "/mi-espacio",
      "/pedido",
    ].includes(route) || artist;
  const published = artworks.filter((work) => work.status !== "borrador");
  const cartWorks = cart
    .map((id) => artworks.find((work) => work.id === id))
    .filter(Boolean);
  const subtotal = cartWorks.reduce((sum, work) => sum + work.price, 0);
  const hasPhysical = cartWorks.some((work) => work.type === "fisica");

  useEffect(() => {
    const navigate = () => {
      setRoute(location.hash.startsWith("#/") ? location.hash.slice(1) : "/");
      setSelected(null);
    };
    window.addEventListener("hashchange", navigate);
    return () => window.removeEventListener("hashchange", navigate);
  }, []);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
    if (!firstRoute.current) mainRef.current?.focus({ preventScroll: true });
    firstRoute.current = false;
  }, [route]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries)
          if (entry.isIntersecting) {
            entry.target.classList.remove("pending");
            entry.target.classList.add("visible");
            observer.unobserve(entry.target);
          }
      },
      { threshold: 0.08 },
    );
    document.querySelectorAll(".reveal:not(.visible)").forEach((element) => {
      element.classList.add("pending");
      observer.observe(element);
    });
    return () => observer.disconnect();
  }, [route, filter, artworks]);

  useEffect(() => {
    if (selected) dialogRef.current?.showModal();
    else dialogRef.current?.close();
  }, [selected]);

  function addToCart(work) {
    setCart((current) =>
      current.includes(work.id) ? current : [...current, work.id],
    );
    setReviewed(false);
    setNotice(`“${work.title}” está en tu selección de prueba.`);
  }

  function gallery(items) {
    return (
      <div className="art-grid">
        {items.map((work) => (
          <article className="art-card reveal" key={work.id}>
            <button
              className="work-preview"
              onClick={() => setSelected(work)}
              aria-label={`Ver ${work.title}`}
              aria-haspopup="dialog"
            >
              <div className="art-frame">
                <ArtworkImage artwork={work} />
                <span className="expand" aria-hidden="true">
                  <span className="arrow-icon" />
                </span>
              </div>
            </button>
            <div className="art-meta">
              <span>
                {workTypes.find((type) => type.id === work.type)?.name}
              </span>
              <span>{work.medium}</span>
            </div>
            <h3>
              <button
                className="title-button"
                onClick={() => setSelected(work)}
              >
                {work.title}
              </button>
            </h3>
            <a className="artist-credit" href={`#/artistas/${work.artistId}`}>
              {artists.find((person) => person.id === work.artistId)?.name}
            </a>
            <div className="price-row">
              <strong>
                {formatPrice(work.price)} <small>ARS</small>
              </strong>
              <button onClick={() => addToCart(work)} className="small-button">
                {cart.includes(work.id) ? "En tu selección ✓" : "Seleccionar +"}
              </button>
            </div>
          </article>
        ))}
      </div>
    );
  }

  function artistCards() {
    return (
      <div className="collection-grid">
        {artists.map((person) => (
          <a
            className="collection-card reveal"
            key={person.id}
            href={`#/artistas/${person.id}`}
          >
            <div className="collection-art">
              {published.some((work) => work.artistId === person.id) ? (
                <ArtworkImage
                  artwork={published.find(
                    (work) => work.artistId === person.id,
                  )}
                />
              ) : (
                <div className="artist-cover-placeholder" aria-hidden="true">
                  {person.name.slice(0, 1).toUpperCase()}
                </div>
              )}
              <span className="collection-tag">
                {backend ? "Conocé su sala" : "Perfil de ejemplo"}
              </span>
              <span className="collection-arrow" aria-hidden="true">
                <span className="arrow-icon" />
              </span>
            </div>
            <h3>{person.name}</h3>
            <p>{person.discipline}</p>
          </a>
        ))}
      </div>
    );
  }

  return (
    <>
      <a
        className="skip"
        href="#contenido"
        onClick={(event) => {
          event.preventDefault();
          mainRef.current?.focus();
        }}
      >
        Ir al contenido
      </a>
      <div className="edition">
        {backend
          ? "GALERÍA COLECTIVA · ARTE VISUAL · MÚSICA · ENCUENTROS"
          : "ADELANTO DE LA PLATAFORMA · ARTISTAS, OBRAS Y PRECIOS DE EJEMPLO"}
      </div>
      <header className="header wrap">
        <Brand />
        <nav aria-label="Principal">
          <a href="#/galeria">Obras</a>
          <a href="#/artistas">Artistas</a>
          <a href="#/yanina">Yanina</a>
          <a
            href="#/pedido"
            aria-label={`Selección de prueba, ${cart.length} obras`}
          >
            Selección ({cart.length})
          </a>
          <a className="access-link" href="#/mi-espacio">
            Mi espacio <span className="arrow-icon" aria-hidden="true" />
          </a>
        </nav>
      </header>
      <div className="status-notice wrap" role="status">
        {notice}
      </div>
      <main id="contenido" ref={mainRef} tabIndex="-1">
        {catalogLoading && (
          <p className="wrap delivery-note" role="status">
            Actualizando la galería…
          </p>
        )}
        {catalogError && (
          <div className="wrap">
            <p className="form-error" role="alert">
              No se pudo cargar la galería. {catalogError}
            </p>
            <button className="text-button" onClick={refreshCatalog}>
              Volver a intentar
            </button>
          </div>
        )}
        {backend &&
          !catalogLoading &&
          !catalogError &&
          !published.length &&
          route === "/galeria" && (
            <p className="wrap delivery-note">
              La primera selección de obras se está preparando.
            </p>
          )}
        {route === "/" && (
          <>
            <section className="hero wrap">
              <div className="hero-copy reveal">
                <p className="eyebrow">
                  <span className="dot" /> Una galería. Muchas formas de crear.
                </p>
                <h1>
                  <span>El arte</span>
                  <span>nos</span>
                  <em>encuentra.</em>
                </h1>
                <p className="lead">
                  Descubrí artistas y compositores. Encontrá una obra que te
                  mueva, en la forma que más conecte con vos.
                </p>
                <div className="hero-actions">
                  <a className="button" href="#/galeria">
                    Explorá las obras{" "}
                    <span className="arrow-icon" aria-hidden="true" />
                  </a>
                  <a className="hero-secondary" href="#/artistas">
                    Conocé a sus artistas
                  </a>
                </div>
              </div>
              <div className="hero-art reveal">
                <div className="hero-sticker">
                  Visual.
                  <br />
                  Sonoro.
                  <br />
                  <em>Colectivo.</em>
                </div>
                <div className="hero-paper">
                  <ArtworkImage artwork={published[0] || initialArtworks[0]} />
                  <div className="paper-caption">
                    <span>Una obra, una mirada.</span>
                    <span aria-hidden="true" className="arrow-icon" />
                  </div>
                </div>
                <div className="mini-paper">
                  <ArtworkImage
                    artwork={
                      published.find((work) => work.type === "digital") ||
                      initialArtworks[2]
                    }
                  />
                </div>
                <div className="sound-card" aria-hidden="true">
                  <span>
                    La música
                    <br />
                    también es arte.
                  </span>
                  <div className="sound-bars">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((bar) => (
                      <i key={bar} />
                    ))}
                  </div>
                </div>
              </div>
              <div className="hero-bottom">
                <span>ARTE VISUAL</span>
                <span>MÚSICA Y COMPOSICIÓN</span>
                <span>UN ESPACIO COMPARTIDO</span>
                <a href="#/galeria" aria-label="Explorar el catálogo">
                  <span className="arrow-icon" aria-hidden="true" />
                </a>
              </div>
            </section>
            <div className="ticker" aria-hidden="true">
              <div>
                {[0, 1, 2, 3].map((index) => (
                  <span key={index}>
                    ARTE <i>✳</i> MÚSICA <i>✳</i> OBRAS <i>✳</i> ENCUENTROS{" "}
                    <i>✳</i>{" "}
                  </span>
                ))}
              </div>
            </div>
            <section className="section wrap formats-section">
              <div className="section-top reveal">
                <div>
                  <p className="eyebrow">Encontrá tu próximo recorrido</p>
                  <h2>
                    El arte toma
                    <br />
                    <em>muchas formas.</em>
                  </h2>
                </div>
                <p className="section-description">
                  Elegí por dónde empezar. Cada formato abre una manera distinta
                  de encontrarte con una obra.
                </p>
              </div>
              <div className="format-grid">
                {[
                  {
                    id: "fisica",
                    number: "01",
                    name: "Obras físicas",
                    text: "Originales y piezas para habitar tus espacios.",
                    palette: "format-orange",
                    label: "Ver obras físicas",
                  },
                  {
                    id: "digital",
                    number: "02",
                    name: "Arte digital",
                    text: "Creaciones que viajan con vos en nuevos formatos.",
                    palette: "format-purple",
                    label: "Ver arte digital",
                  },
                  {
                    id: "musica",
                    number: "03",
                    name: "Música y partituras",
                    text: "Composiciones para escuchar y descubrir.",
                    palette: "format-blue",
                    label: "Ver música y partituras",
                  },
                ].map((format) => (
                  <a
                    className={`format-card ${format.palette} reveal`}
                    key={format.id}
                    href="#/galeria"
                    onClick={() => setFilter(format.id)}
                    aria-label={format.label}
                  >
                    <div className="format-top">
                      <span>{format.number}</span>
                      <span className="arrow-icon" aria-hidden="true" />
                    </div>
                    <h3>{format.name}</h3>
                    <p>{format.text}</p>
                  </a>
                ))}
              </div>
            </section>
            <section className="section wrap featured-section">
              <div className="section-top reveal">
                <div>
                  <p className="eyebrow">Descubrir una obra</p>
                  <h2>
                    Explorá.
                    <br />
                    <em>Dejate encontrar.</em>
                  </h2>
                </div>
                <a className="text-link" href="#/galeria">
                  Ver el catálogo
                </a>
              </div>
              {gallery(published.slice(0, 3))}
            </section>
            <section className="community">
              <div className="wrap community-inner reveal">
                <span className="community-symbol" aria-hidden="true">
                  ✳
                </span>
                <div>
                  <p className="eyebrow">Una comunidad de creadores</p>
                  <h2>
                    Tu obra.
                    <br />
                    Más encuentros.
                  </h2>
                  <p>
                    La plataforma está pensada para que artistas y compositores
                    presenten su trabajo, administren su catálogo y lo acerquen
                    a nuevas personas.
                  </p>
                  <a className="button light" href="#/mi-espacio">
                    Entrá a tu espacio
                  </a>
                </div>
              </div>
            </section>
            <section className="section wrap">
              <div className="section-top">
                <div>
                  <p className="eyebrow">Detrás de cada creación</p>
                  <h2>
                    Conocé a sus <em>artistas.</em>
                  </h2>
                </div>
                <a className="text-link" href="#/artistas">
                  Todas las salas
                </a>
              </div>
              {artistCards()}
            </section>
          </>
        )}
        {route === "/galeria" && (
          <section className="section wrap">
            <p className="eyebrow">Arte para descubrir</p>
            <h1 className="page-title">
              Las <em>obras.</em>
            </h1>
            <p className="lead">
              Originales para recibir en tu casa. Creaciones digitales y música
              para llevar con vos.
            </p>
            <div
              className="filters"
              role="group"
              aria-label="Filtrar obras por formato"
            >
              {workTypes.map((type) => (
                <button
                  key={type.id}
                  aria-pressed={filter === type.id}
                  onClick={() => setFilter(type.id)}
                >
                  {type.name}
                </button>
              ))}
            </div>
            {gallery(
              published.filter(
                (work) => filter === "todas" || work.type === filter,
              ),
            )}
          </section>
        )}
        {route === "/artistas" && (
          <section className="section wrap">
            <p className="eyebrow">La comunidad</p>
            <h1 className="page-title">
              Artistas y <em>compositores.</em>
            </h1>
            <p className="lead">
              Cada sala reúne una mirada, un recorrido y sus creaciones.
            </p>
            {artistCards()}
          </section>
        )}
        {artist && (
          <section className="section wrap">
            <a className="back" href="#/artistas">
              ← Todas las salas
            </a>
            <div className="profile">
              <div className="avatar" aria-hidden="true">
                ✳
              </div>
              <div>
                <p className="eyebrow">{artist.discipline}</p>
                <h1 className="page-title">{artist.name}</h1>
                <p className="lead">{artist.bio}</p>
              </div>
            </div>
            <div className="room-heading">
              <h2>Sus obras</h2>
              <span>Catálogo de ejemplo</span>
            </div>
            {gallery(published.filter((work) => work.artistId === artist.id))}
          </section>
        )}
        {route === "/yanina" && (
          <section className="section wrap about-page">
            <p className="eyebrow">El origen del encuentro</p>
            <h1 className="page-title">
              Yanina <em>Baldesari.</em>
            </h1>
            <p className="lead">
              Arteterapeuta. Sus talleres conectan la expresión artística, los
              materiales y la exploración personal.
            </p>
            <p className="lead">
              Esta galería abre un espacio compartido para que artistas y
              compositores puedan mostrar sus trabajos y acercarlos a nuevas
              personas.
            </p>
            <p className="demo-note">
              Presentación provisional para validar con Yanina. El nombre
              definitivo de la galería está por definir.
            </p>
            <a
              className="button"
              href="https://www.instagram.com/yaninabaldesari/"
              target="_blank"
              rel="noreferrer"
            >
              Conocé a Yanina
            </a>
          </section>
        )}
        {route === "/mi-espacio" && (
          <Workspace account={account} onCatalogChange={refreshCatalog} />
        )}
        {route === "/pedido" && (
          <section className="section wrap">
            <p className="eyebrow">Recorrido de compra · Demostración</p>
            <h1 className="page-title">
              Tu <em>selección.</em>
            </h1>
            <p className="demo-note">
              Podés probar la selección y revisar los formatos de entrega. Los
              pagos y la compra real están pendientes de integrar.
            </p>
            {cartWorks.length ? (
              <div className="checkout-grid">
                <div>
                  {cartWorks.map((work) => (
                    <article className="order-item" key={work.id}>
                      <ArtworkImage artwork={work} />
                      <div>
                        <h3>{work.title}</h3>
                        <p>
                          {
                            artists.find(
                              (person) => person.id === work.artistId,
                            )?.name
                          }
                        </p>
                        <p>{formatPrice(work.price)} ARS</p>
                        <small>
                          {work.type === "fisica"
                            ? "Obra física · Requiere envío o retiro"
                            : "Entrega digital · Acceso privado después del pago"}
                        </small>
                        <button
                          className="text-button"
                          onClick={() => {
                            setCart((current) =>
                              current.filter((id) => id !== work.id),
                            );
                            setReviewed(false);
                          }}
                        >
                          Quitar
                        </button>
                      </div>
                    </article>
                  ))}
                </div>
                <aside className="order-summary">
                  <h2>Resumen</h2>
                  <p className="summary-line">
                    <span>Subtotal de obras</span>
                    <strong>{formatPrice(subtotal)} ARS</strong>
                  </p>
                  {hasPhysical && (
                    <p className="delivery-note">
                      Envío físico pendiente de cotización según destino,
                      embalaje y características de cada obra.
                    </p>
                  )}
                  {cartWorks.some((work) => work.type !== "fisica") && (
                    <p className="delivery-note">
                      Los archivos digitales necesitarán entrega protegida y una
                      licencia de uso definida por cada autor.
                    </p>
                  )}
                  <p className="delivery-note">
                    Precios de demostración. Las condiciones de venta y los
                    costos adicionales se definirán antes de cobrar.
                  </p>
                  <button className="button" onClick={() => setReviewed(true)}>
                    Revisar pedido de ejemplo
                  </button>
                  {reviewed && (
                    <p role="status" className="demo-note">
                      Revisaste una selección de {cart.length} obra(s). El
                      siguiente paso será conectar el pago y confirmar la
                      entrega. Este adelanto no genera pedidos ni reservas.
                    </p>
                  )}
                </aside>
              </div>
            ) : (
              <div className="empty-state">
                <p>Todavía no seleccionaste obras.</p>
                <a className="button" href="#/galeria">
                  Explorá el catálogo
                </a>
              </div>
            )}
          </section>
        )}
        {!knownRoute && (
          <section className="section wrap">
            <h1 className="page-title">Busquemos otro recorrido.</h1>
            <a className="button" href="#/">
              Volver al inicio
            </a>
          </section>
        )}
      </main>
      <footer className="footer wrap">
        <div>
          <Brand />
          <p>Un espacio para artistas, compositores y sus obras.</p>
        </div>
        <div>
          <a href="#/yanina">Conocé a Yanina </a>
          <span>Nombre provisional · Galería en desarrollo</span>
        </div>
      </footer>
      <dialog
        ref={dialogRef}
        className="art-dialog"
        aria-labelledby="dialog-title"
        onClose={() => setSelected(null)}
      >
        {selected && (
          <>
            <form method="dialog">
              <button className="close-dialog" autoFocus>
                Cerrar ×
              </button>
            </form>
            <ArtworkImage artwork={selected} />
            <div className="dialog-caption">
              <div>
                <p className="eyebrow">{selected.medium}</p>
                <h2 id="dialog-title">{selected.title}</h2>
                <a
                  className="artist-credit"
                  href={`#/artistas/${selected.artistId}`}
                >
                  {
                    artists.find((person) => person.id === selected.artistId)
                      ?.name
                  }{" "}
                </a>
                <p>{selected.details}</p>
                <p>
                  {formatPrice(selected.price)} ARS{" "}
                  {selected.artist_id ? "" : "· Precio de ejemplo"}
                </p>
              </div>
              <button
                className="small-button"
                onClick={() => addToCart(selected)}
              >
                {cart.includes(selected.id)
                  ? "En tu selección ✓"
                  : "Seleccionar +"}
              </button>
            </div>
            {selected.audio && (
              <div className="audio-preview">
                <audio
                  controls
                  preload="none"
                  src={selected.audio}
                  aria-label={
                    selected.artist_id
                      ? `Audio de muestra de ${selected.title}`
                      : "Muestra sonora sintética de demostración"
                  }
                />
                <p>
                  {selected.artist_id
                    ? "Audio de muestra del autor."
                    : "Audio sintético de ejemplo para probar el reproductor."}
                </p>
              </div>
            )}
            <p className="demo-note">
              {selected.type === "fisica"
                ? "Entrega física. El costo y la cobertura del envío se confirmarán antes de pagar."
                : "Entrega digital. El formato y la licencia deberán estar definidos antes de la compra."}
            </p>
          </>
        )}
      </dialog>
    </>
  );
}

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
