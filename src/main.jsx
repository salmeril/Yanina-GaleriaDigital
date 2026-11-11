import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  artworks as initialArtworks,
  artists,
  workTypes,
  formatPrice,
} from "./data";
import "./styles.css";

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
  const [route, setRoute] = useState(() => location.hash.slice(1) || "/");
  const [filter, setFilter] = useState("todas");
  const [artworks, setArtworks] = useState(initialArtworks);
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
      setRoute(location.hash.slice(1) || "/");
      setSelected(null);
    };
    window.addEventListener("hashchange", navigate);
    return () => window.removeEventListener("hashchange", navigate);
  }, []);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
    if (!firstRoute.current) mainRef.current?.focus({ preventScroll: true });
    firstRoute.current = false;
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
                  ↗
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
              {artists.find((person) => person.id === work.artistId)?.name} ↗
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
              <ArtworkImage
                artwork={
                  published.find((work) => work.artistId === person.id) ||
                  initialArtworks[0]
                }
              />
              <span className="collection-tag">Perfil de ejemplo</span>
              <span className="collection-arrow" aria-hidden="true">
                ↗
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
        ADELANTO DE LA PLATAFORMA · ARTISTAS, OBRAS Y PRECIOS DE EJEMPLO
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
            Mi espacio ↗
          </a>
        </nav>
      </header>
      <div className="status-notice wrap" role="status">
        {notice}
      </div>
      <main id="contenido" ref={mainRef} tabIndex="-1">
        {route === "/" && (
          <>
            <section className="hero wrap">
              <div className="hero-copy reveal">
                <p className="eyebrow">
                  <span className="dot" /> Arte visual · Música · Encuentros
                </p>
                <h1>
                  Muchas miradas.
                  <br />
                  Un lugar para
                  <br />
                  <em>encontrarlas.</em>
                </h1>
                <p className="lead">
                  Descubrí artistas y compositores, recorré sus obras y encontrá
                  una creación para llevar a tu mundo.
                </p>
                <a className="button" href="#/galeria">
                  Explorá las obras ↗
                </a>
                <p className="hero-footnote">
                  Originales físicos, arte digital y composiciones.
                </p>
              </div>
              <div className="hero-art reveal">
                <div className="hero-sticker">
                  Cada obra.
                  <br />
                  Un universo.
                </div>
                <div className="hero-paper">
                  <ArtworkImage artwork={initialArtworks[0]} />
                  <div className="paper-caption">
                    <span>Galería colectiva</span>
                    <span>Adelanto visual / 03</span>
                  </div>
                </div>
                <div className="mini-paper">
                  <ArtworkImage artwork={initialArtworks[2]} />
                </div>
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
            <section className="section wrap">
              <div className="section-top reveal">
                <div>
                  <p className="eyebrow">Descubrir una obra</p>
                  <h2>
                    Algo te encuentra.
                    <br />
                    <em>Algo se queda.</em>
                  </h2>
                </div>
                <a className="text-link" href="#/galeria">
                  Ver el catálogo ↗
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
                    Tu propio espacio.
                  </h2>
                  <p>
                    La plataforma está pensada para que artistas y compositores
                    presenten su trabajo, administren su catálogo y lo acerquen
                    a nuevas personas.
                  </p>
                  <a className="button light" href="#/mi-espacio">
                    Conocé el panel de prueba ↗
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
                  Todas las salas ↗
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
              Conocé a Yanina ↗
            </a>
          </section>
        )}
        {route === "/mi-espacio" && (
          <CreatorPanel
            artworks={artworks}
            onCreate={(work) => setArtworks((current) => [...current, work])}
            onPublish={(id) =>
              setArtworks((current) =>
                current.map((work) =>
                  work.id === id ? { ...work, status: "publicada" } : work,
                ),
              )
            }
          />
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
                    Revisar pedido de ejemplo ↗
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
                  Explorá el catálogo ↗
                </a>
              </div>
            )}
          </section>
        )}
        {!knownRoute && (
          <section className="section wrap">
            <h1 className="page-title">Busquemos otro recorrido.</h1>
            <a className="button" href="#/">
              Volver al inicio ↗
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
          <a href="#/yanina">Conocé a Yanina ↗</a>
          <span>Nombre provisional · Versión de demostración</span>
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
                  ↗
                </a>
                <p>{selected.details}</p>
                <p>{formatPrice(selected.price)} ARS · Precio de ejemplo</p>
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
                  aria-label="Muestra sonora sintética de demostración"
                />
                <p>Audio sintético de ejemplo para probar el reproductor.</p>
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

function CreatorPanel({ artworks, onCreate, onPublish }) {
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [type, setType] = useState("fisica");
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  async function submit(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    setError("");
    setMessage("");
    const price = Number(values.get("price"));
    if (!Number.isFinite(price) || price <= 0) {
      setError("Ingresá un precio mayor a cero.");
      return;
    }
    const file = values.get("image");
    if (file.size > 2 * 1024 * 1024) {
      setError("Para esta prueba elegí una imagen de hasta 2 MB.");
      return;
    }
    if (
      file.size &&
      !["image/jpeg", "image/png", "image/webp"].includes(file.type)
    ) {
      setError("Elegí una imagen JPG, PNG o WebP.");
      return;
    }
    if (file.size && !String(values.get("alt")).trim()) {
      setError(
        "Describí la imagen para las personas que usan lectores de pantalla.",
      );
      return;
    }
    setBusy(true);
    try {
      let image = "";
      if (file.size)
        image = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = () =>
            reject(new Error("No pudimos leer la imagen. Probá con otra."));
          reader.readAsDataURL(file);
        });
      if (!mounted.current) return;
      onCreate({
        id: crypto.randomUUID(),
        title: String(values.get("title")).trim(),
        artistId: values.get("artistId"),
        type: values.get("type"),
        medium: String(values.get("medium")).trim(),
        details: String(values.get("details")).trim(),
        price,
        image,
        alt: String(values.get("alt")).trim(),
        palette: "coral",
        status: "borrador",
        demoUpload: true,
      });
      form.reset();
      setType("fisica");
      setMessage(
        "Borrador creado. Abajo podés mostrarlo en el catálogo de prueba.",
      );
    } catch (failure) {
      if (mounted.current) setError(failure.message);
    } finally {
      if (mounted.current) setBusy(false);
    }
  }

  return (
    <section className="section wrap">
      <p className="eyebrow">Mi espacio · Panel de demostración</p>
      <h1 className="page-title">
        Dale lugar
        <br />a tu <em>obra.</em>
      </h1>
      <p className="lead">
        Probá cómo se cargará una obra física, una creación digital o una
        composición.
      </p>
      <p className="demo-note">
        Prueba sin inicio de sesión. Los cambios viven en esta pestaña y se
        pierden al recargar. En la plataforma real cada persona tendrá su cuenta
        y permisos sobre su propio catálogo.
      </p>
      <div className="creator-grid">
        <form className="creator-form" onSubmit={submit}>
          <label>
            Perfil de ejemplo
            <select name="artistId">
              {artists.map((person) => (
                <option key={person.id} value={person.id}>
                  {person.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Título de la obra
            <input name="title" required maxLength="100" />
          </label>
          <div className="form-row">
            <label>
              Formato
              <select
                name="type"
                value={type}
                onChange={(event) => setType(event.target.value)}
              >
                {workTypes
                  .filter((item) => item.id !== "todas")
                  .map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
              </select>
            </label>
            <label>
              Precio de prueba · ARS
              <input
                name="price"
                type="number"
                required
                min="1"
                step="1"
                max="999999999"
              />
            </label>
          </div>
          <label>
            Técnica o disciplina
            <input
              name="medium"
              required
              maxLength="100"
              placeholder="Ej. Acuarela, ilustración o composición"
            />
          </label>
          <label>
            {type === "fisica"
              ? "Medidas, materiales y presentación"
              : "Formato de entrega y licencia de uso"}
            <textarea
              name="details"
              required
              maxLength="700"
              rows="3"
              placeholder={
                type === "fisica"
                  ? "Ej. 30 × 40 cm, papel, sin marco"
                  : "Ej. WAV + PDF, uso personal"
              }
            />
          </label>
          <label>
            Imagen de portada · JPG, PNG o WebP, hasta 2 MB
            <input
              name="image"
              type="file"
              accept="image/jpeg,image/png,image/webp"
            />
          </label>
          <label>
            Descripción visual de la imagen
            <input name="alt" maxLength="250" />
          </label>
          {type !== "fisica" && (
            <p className="demo-note">
              En esta prueba se carga la portada. La subida privada del archivo
              vendido y del audio de muestra queda pendiente.
            </p>
          )}
          <p className="form-error" role="alert">
            {error}
          </p>
          <p role="status">{message}</p>
          <button className="button" type="submit" disabled={busy}>
            {busy ? "Leyendo imagen…" : "Guardar borrador de prueba ↗"}
          </button>
        </form>
        <aside className="panel-list">
          <h2>Tus obras de prueba</h2>
          <p className="delivery-note">
            Los borradores se pueden mostrar en el catálogo de esta pestaña.
          </p>
          {artworks.filter((work) => work.demoUpload).length === 0 && (
            <p className="empty-state">Tu primera obra va a aparecer acá.</p>
          )}
          {artworks
            .filter((work) => work.demoUpload)
            .map((work) => (
              <article className="draft-card" key={work.id}>
                <ArtworkImage artwork={work} />
                <h3>{work.title}</h3>
                <p>{formatPrice(work.price)} ARS</p>
                <p>
                  {work.status === "borrador"
                    ? "Borrador de prueba"
                    : "Visible en el catálogo de prueba"}
                </p>
                {work.status === "borrador" ? (
                  <button
                    className="small-button"
                    onClick={() => onPublish(work.id)}
                  >
                    Mostrar en el catálogo de prueba
                  </button>
                ) : (
                  <a className="text-link" href="#/galeria">
                    Ver en galería ↗
                  </a>
                )}
              </article>
            ))}
        </aside>
      </div>
    </section>
  );
}

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
