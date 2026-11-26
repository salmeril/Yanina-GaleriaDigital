import React, { useState } from "react";
import { publicUrl } from "./work-details";
export function ProfileLinks({ profile }) {
  const website = publicUrl(profile.website);
  const instagram = publicUrl(profile.instagram, true);
  return <>{profile.public_location && <p className="profile-location">{profile.public_location}</p>}{(website || instagram) && <div className="profile-links">{website && <a className="small-button" href={website} target="_blank" rel="noopener noreferrer">Sitio del artista</a>}{instagram && <a className="small-button" href={instagram} target="_blank" rel="noopener noreferrer">Instagram</a>}</div>}</>;
}
export function ShareProfile({ id, enabled = true }) {
  const [message, setMessage] = useState("");
  const [manual, setManual] = useState(false);
  const url = `${location.origin}${location.pathname}#/artistas/${encodeURIComponent(id)}`;
  async function copy() {
    try { await navigator.clipboard.writeText(url); setMessage("Enlace copiado."); setManual(false); }
    catch { setManual(true); setMessage("Copiá este enlace para compartir tu sala."); }
  }
  return <div className="profile-share"><button type="button" className="small-button" disabled={!enabled} onClick={copy}>Compartir perfil</button><span role="status">{message}</span>{manual && <label className="share-manual">Enlace de tu perfil<input readOnly value={url} onFocus={event => event.target.select()} /></label>}</div>;
}
