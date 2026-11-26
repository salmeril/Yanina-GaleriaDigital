import React, { useState } from "react";
import { workFacts } from "./work-details";

export function WorkFacts({ work }) {
  return <dl className="work-facts">{workFacts(work).map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>;
}

export function WorkMedia({ work, fallback = null }) {
  const [active, setActive] = useState(0);
  const images = [{ url: work.image, alt: work.alt }, ...(work.images || [])].filter(item => item.url);
  const image = images[Math.min(active, images.length - 1)];
  return <div className="work-media">
    {image ? <img className="art-image work-main-image" src={image.url} alt={image.alt || work.title} /> : fallback || <p className="empty-state">Agregá una portada para presentar tu obra.</p>}
    {images.length > 1 && <div className="work-thumbnails" role="group" aria-label="Imágenes de la obra">{images.map((item, index) => <button type="button" key={`${item.url}-${index}`} aria-pressed={active === index} aria-label={`Ver imagen ${index + 1}: ${item.alt}`} onClick={() => setActive(index)}><img src={item.url} alt="" /></button>)}</div>}
    {work.audio && <div className="audio-preview"><audio controls preload="none" src={work.audio} aria-label={`Audio de muestra de ${work.title}`} /><p>Audio de muestra.</p></div>}
  </div>;
}
