import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { artworks, collections } from './data';
import './styles.css';

function ArtworkImage({ artwork, className = '' }) {
  if (artwork.image) {
    return <img className={`art-image ${className}`} src={artwork.image} alt={artwork.alt} loading="lazy" />;
  }
  return (
    <div className={`art-image abstract ${artwork.palette} ${className}`} role="img" aria-label="Composición abstracta de demostración">
      <span className="paint paint-one" /><span className="paint paint-two" />
      <span className="paint paint-three" /><span className="drawn-line" />
      <small className="sample-label">Imagen de ejemplo</small>
    </div>
  );
}

function App() {
  const [route, setRoute] = useState(() => window.location.hash.slice(1) || '/');
  const [filter, setFilter] = useState('todas');
  const [selected, setSelected] = useState(null);
  const dialogRef = useRef(null);
  const mainRef = useRef(null);
  const firstRoute = useRef(true);

  useEffect(() => {
    const onHashChange = () => {
      setRoute(window.location.hash.slice(1) || '/');
      setSelected(null);
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
    if (!firstRoute.current) mainRef.current?.focus({ preventScroll: true });
    firstRoute.current = false;
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.remove('pending');
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      }
    }, { threshold: 0.08 });
    document.querySelectorAll('.reveal:not(.visible)').forEach(element => {
      element.classList.add('pending');
      observer.observe(element);
    });
    return () => observer.disconnect();
  }, [route, filter]);

  useEffect(() => {
    if (selected) dialogRef.current?.showModal();
    else dialogRef.current?.close();
  }, [selected]);

  const collection = collections.find(item => route === `/muestras/${item.id}`);
  const isRoom = route === '/sala/ejemplo';
  const isAccess = route === '/acceso';
  const isHome = route === '/';

  function gallery(items) {
    return <div className="art-grid">{items.map((artwork, index) => (
      <button key={artwork.id} className="art-card reveal" onClick={() => setSelected(artwork)} aria-haspopup="dialog">
        <div className="art-frame"><ArtworkImage artwork={artwork} /><span className="expand" aria-hidden="true">↗</span></div>
        <div className="art-meta"><span>{String(index + 1).padStart(2, '0')} / {artwork.medium}</span><span aria-hidden="true">＋</span></div>
        <h3>{artwork.title}</h3>
      </button>
    ))}</div>;
  }

  return <>
    <a className="skip" href="#contenido" onClick={event => { event.preventDefault(); mainRef.current?.focus(); }}>Ir al contenido</a>
    <div className="edition">UN ESPACIO PARA CREAR, COMPARTIR Y ENCONTRARNOS</div>
    <header className="header wrap">
      <a className="brand" href="#/" aria-label="Yanina Baldesari, inicio">yanina<span>baldesari<span className="brand-dot">✳</span></span></a>
      <nav aria-label="Principal">
        <a href="#/galeria" aria-current={route === '/galeria' ? 'page' : undefined}>La galería</a>
        <a href="#/muestras" aria-current={route === '/muestras' ? 'page' : undefined}>Muestras</a>
        <a className="access-link" href="#/acceso">Mi espacio <span aria-hidden="true">↗</span></a>
      </nav>
    </header>

    <main id="contenido" ref={mainRef} tabIndex="-1">
      {isHome && <>
        <section className="hero wrap">
          <div className="hero-copy reveal">
            <p className="eyebrow"><span className="dot" /> Galería digital · Arteterapia</p>
            <h1>Lo que sentimos<br />también tiene<br /><em>forma.</em><span className="flower" aria-hidden="true">✳</span></h1>
            <p className="lead">Obras, exploraciones y pequeños descubrimientos que nacen en el taller de Yanina Baldesari.</p>
            <a className="button" href="#/galeria">Entrá a la galería <span aria-hidden="true">↗</span></a>
            <p className="hero-footnote">Cada proceso tiene su propia manera de aparecer.</p>
          </div>
          <div className="hero-art reveal">
            <div className="hero-sticker">Un taller.<br />Muchas miradas.</div>
            <div className="hero-paper"><ArtworkImage artwork={artworks[0]} /><div className="paper-caption"><span>Estudio de color</span><span>Adelanto visual / 01</span></div></div>
            <div className="mini-paper"><ArtworkImage artwork={artworks[1]} /></div>
            <span className="scribble" aria-hidden="true">↶</span>
          </div>
        </section>
        <div className="ticker" aria-hidden="true"><div>{Array.from({ length: 4 }, (_, index) => <span key={index}>CREAR <i>✳</i> EXPLORAR <i>✳</i> COMPARTIR <i>✳</i> SENTIR <i>✳</i> </span>)}</div></div>
        <section className="section wrap">
          <div className="section-top reveal"><div><p className="eyebrow">Los recorridos del taller</p><h2>Una propuesta.<br /><em>Muchas posibilidades.</em></h2></div><a className="text-link" href="#/muestras">Ver las muestras ↗</a></div>
          <CollectionCards />
        </section>
        <section className="community">
          <div className="wrap community-inner reveal"><span className="community-symbol" aria-hidden="true">✳</span><div><p className="eyebrow">Las personas detrás de las obras</p><h2>Una sala propia.<br />Una galería compartida.</h2><p>Cada participante tiene un lugar para reunir sus trabajos y contar algo de su recorrido.</p><a className="button light" href="#/sala/ejemplo">Conocé una sala de ejemplo ↗</a></div></div>
        </section>
      </>}

      {route === '/muestras' && <section className="section wrap"><p className="eyebrow">Recorridos</p><h1 className="page-title">Las <em>muestras.</em></h1><p className="lead">Distintas propuestas, materiales y formas de explorar.</p><p className="demo-note">Adelanto con imágenes y textos de ejemplo para definir junto a Yanina.</p><CollectionCards /></section>}

      {(route === '/galeria' || collection) && <section className="section wrap">
        <a className="back" href={collection ? '#/muestras' : '#/'}>← {collection ? 'Todas las muestras' : 'Volver al inicio'}</a>
        <p className="eyebrow">{collection ? `Muestra ${collection.number}` : 'Miradas que se encuentran'}</p>
        <h1 className="page-title">{collection ? collection.name : <>La <em>galería.</em></>}</h1>
        <p className="lead">{collection ? collection.description : 'Un recorrido por las exploraciones del taller. Abrí una imagen para verla de cerca.'}</p>
        <p className="demo-note">Obras, títulos y autoría de demostración. Pendientes de reemplazar por el material real.</p>
        {!collection && <div className="filters" role="group" aria-label="Filtrar por muestra">{[{ id: 'todas', name: 'Todas las obras' }, ...collections].map(item => <button key={item.id} aria-pressed={filter === item.id} onClick={() => setFilter(item.id)}>{item.name}</button>)}</div>}
        {gallery(artworks.filter(item => collection ? item.collection === collection.id : filter === 'todas' || item.collection === filter))}
      </section>}

      {isRoom && <section className="section wrap">
        <a className="back" href="#/galeria">← Volver a la galería</a>
        <div className="profile"><div className="avatar" aria-hidden="true">✳</div><div><p className="eyebrow">Espacio de participante · Demostración</p><h1 className="page-title">Mi <em>pequeña sala.</em></h1><p className="lead">Acá va la presentación de la participante, con sus palabras y las obras que elija compartir.</p></div></div>
        <div className="room-heading"><h2>Mi recorrido</h2><span>6 obras de ejemplo</span></div>
        {gallery(artworks)}
      </section>}

      {isAccess && <section className="section wrap access-page"><p className="eyebrow">Espacio personal</p><h1 className="page-title">Tu lugar<br />para <em>compartir.</em></h1><p className="lead">Estamos preparando el acceso para que cada participante pueda organizar sus obras y personalizar su sala.</p><div className="access-info"><span className="dot" /> Las cuentas todavía están en preparación.</div><a className="button" href="#/sala/ejemplo">Explorá la sala de ejemplo ↗</a><a className="text-link" href="https://www.instagram.com/yaninabaldesari/" target="_blank" rel="noreferrer">Consultá con Yanina ↗</a></section>}

      {!isHome && !isRoom && !isAccess && !collection && !['/galeria', '/muestras'].includes(route) && <section className="section wrap"><h1 className="page-title">Busquemos otro recorrido.</h1><a className="button" href="#/">Volver al inicio ↗</a></section>}
    </main>

    <footer className="footer wrap"><div><a className="brand" href="#/">yanina<span>baldesari ✳</span></a><p>Un espacio para darle lugar a lo que aparece.</p></div><div><a href="https://www.instagram.com/yaninabaldesari/" target="_blank" rel="noreferrer">Instagram ↗</a><span>Galería digital · Adelanto</span></div></footer>

    <dialog ref={dialogRef} className="art-dialog" aria-labelledby="dialog-title" onClose={() => setSelected(null)}>
      {selected && <><form method="dialog"><button className="close-dialog" autoFocus>Cerrar ×</button></form><ArtworkImage artwork={selected} /><div className="dialog-caption"><div><p className="eyebrow">{selected.medium}</p><h2 id="dialog-title">{selected.title}</h2><p>{selected.image ? selected.artist : 'Composición de demostración'}</p></div><a className="text-link" href="#/sala/ejemplo" onClick={() => { dialogRef.current.close(); }}>Visitar la sala ↗</a></div></>}
    </dialog>
  </>;
}

function CollectionCards() {
  return <div className="collection-grid">{collections.map(collection => (
    <a className="collection-card reveal" href={`#/muestras/${collection.id}`} key={collection.id}>
      <div className="collection-art"><ArtworkImage artwork={artworks.find(item => item.collection === collection.id)} /><span className="collection-tag">Muestra {collection.number}</span><span className="collection-arrow" aria-hidden="true">↗</span></div>
      <h3>{collection.name}</h3><p>{collection.description}</p>
    </a>
  ))}</div>;
}

createRoot(document.getElementById('root')).render(<React.StrictMode><App /></React.StrictMode>);
