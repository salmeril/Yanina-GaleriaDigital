import React, { useEffect, useRef, useState } from "react";
import { validateAvatarFile } from "./avatar-files";

export function Avatar({ name = "Artista", src = "", className = "" }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [src]);
  const initials = name.trim().split(/\s+/).filter(Boolean).slice(0, 2).map(word => Array.from(word)[0]).join("").toUpperCase() || "A";
  return (
    <span className={`profile-avatar ${className}`}>
      {src && !failed ? <img src={src} alt={`Foto de perfil de ${name}`} onError={() => setFailed(true)} /> : <span aria-label={`Perfil de ${name}`}>{initials}</span>}
    </span>
  );
}

export default function AvatarPicker({ profile, disabled }) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState("");
  const [remove, setRemove] = useState(false);
  const [error, setError] = useState("");
  const input = useRef(null);
  useEffect(() => {
    if (!file) { setPreview(""); return; }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);
  function choose(event) {
    const selected = event.target.files?.[0];
    if (!selected) return;
    try {
      validateAvatarFile(selected);
      setFile(selected); setRemove(false); setError("");
    } catch (failure) {
      event.target.value = ""; setFile(null); setError(failure.message);
    }
  }
  return (
    <div className="avatar-editor">
      <Avatar name={profile.name} src={remove ? "" : preview || profile.avatar_url} className="avatar-editor-preview" />
      <div className="avatar-editor-controls">
        <label>Foto de perfil
          <input ref={input} name="avatar" type="file" accept="image/jpeg,image/png,image/webp" onChange={choose} disabled={disabled} />
        </label>
        <p className="auth-private">JPG, PNG o WebP · hasta 2 MB. Se muestra con recorte circular al centro. Una imagen cuadrada funciona mejor.</p>
        {(profile.avatar_path || file || remove) && (
          <label className="checkbox-label">
            <input name="remove_avatar" type="checkbox" checked={remove} disabled={disabled} onChange={event => {
              setRemove(event.target.checked); setFile(null); setError("");
              if (input.current) input.current.value = "";
            }} /> Quitar mi foto al guardar
          </label>
        )}
        {file && <p className="auth-private" role="status">Vista previa. Presioná Guardar perfil para aplicar la foto.</p>}
        {error && <p className="form-error" role="alert">{error}</p>}
      </div>
    </div>
  );
}
