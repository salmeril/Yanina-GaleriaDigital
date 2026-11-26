import React, { useEffect, useRef, useState } from "react";
import { saveWork, friendlyError, validateFile } from "./backend";
import { createId } from "./ids";
import { workTypes, formatPrice } from "./data";
import PriceEstimator from "./PriceEstimator";
import { collectWorkFields, availabilityLabels, framingLabels, deliveryLabels } from "./work-details";
import { WorkFacts, WorkMedia } from "./WorkPresentation";

function useFileUrl(file) {
  const [url, setUrl] = useState("");
  useEffect(() => {
    if (!file) { setUrl(""); return; }
    const value = URL.createObjectURL(file); setUrl(value);
    return () => URL.revokeObjectURL(value);
  }, [file]);
  return url;
}
function ExtraImage({ item, index, disabled, onAlt, onRemove }) {
  const localUrl = useFileUrl(item.file);
  return <div className="extra-image-editor">
    {(localUrl || item.url) && <img src={localUrl || item.url} alt={item.alt || `Imagen adicional ${index + 1}`} />}
    <label>Descripción de imagen {index + 1}<input value={item.alt} maxLength="250" required onChange={event => onAlt(event.target.value)} disabled={disabled} /></label>
    <button type="button" className="text-button" onClick={onRemove} disabled={disabled}>Quitar imagen {index + 1}</button>
  </div>;
}
export default function WorkForm({ userId, previous, onSaved, onCancel, onBusy }) {
  const formRef = useRef(null);
  const previewRef = useRef(null);
  const fileSequence = useRef(0);
  const [type, setType] = useState(previous?.type || "fisica");
  const [price, setPrice] = useState(previous?.price ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [cover, setCover] = useState(null);
  const [audio, setAudio] = useState(null);
  const [removeAudio, setRemoveAudio] = useState(false);
  const [gallery, setGallery] = useState(() => (previous?.gallery_images || []).map(item => ({ ...item, key: item.path, url: previous.images?.find(image => image.path === item.path)?.url || "" })));
  const [preview, setPreview] = useState(null);
  const coverUrl = useFileUrl(cover);
  const audioUrl = useFileUrl(audio);
  const extraUrls = useRef([]);
  useEffect(() => () => extraUrls.current.forEach(url => URL.revokeObjectURL(url)), []);
  function closePreview() { setPreview(null); }
  function choose(event, kind) {
    const file = event.target.files?.[0];
    try {
      validateFile(file, kind);
      if (kind === "cover") setCover(file || null);
      else { setAudio(file || null); setRemoveAudio(false); }
      setError(""); closePreview();
    } catch (failure) { event.target.value = ""; if (kind === "cover") setCover(null); else setAudio(null); setError(friendlyError(failure)); }
  }
  function addImages(event) {
    const files = Array.from(event.target.files || []);
    event.target.value = "";
    try {
      if (gallery.length + files.length > 5) throw new Error("Podés agregar hasta cinco imágenes además de la portada.");
      files.forEach(file => validateFile(file, "cover"));
      setGallery(current => [...current, ...files.map(file => ({ file, alt: "", key: `new-${++fileSequence.current}` }))]);
      setError(""); closePreview();
    } catch (failure) { setError(friendlyError(failure)); }
  }
  function values() {
    const fields = collectWorkFields(new FormData(formRef.current), type);
    if ((cover || previous?.cover_path) && !fields.alt) throw new Error("Describí la portada para que sea accesible.");
    if (gallery.some(item => !item.alt.trim())) throw new Error("Describí cada imagen adicional.");
    return fields;
  }
  function showPreview() {
    if (!formRef.current.reportValidity()) return;
    try {
      const fields = values();
      extraUrls.current.forEach(url => URL.revokeObjectURL(url));
      extraUrls.current = [];
      const images = gallery.map(item => {
        const url = item.file ? URL.createObjectURL(item.file) : item.url;
        if (item.file) extraUrls.current.push(url);
        return { url, alt: item.alt };
      });
      setPreview({ ...fields, image: coverUrl || previous?.image, audio: audioUrl || (removeAudio ? "" : previous?.audio), images });
      setError("");
      requestAnimationFrame(() => previewRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
    } catch (failure) { setError(friendlyError(failure)); }
  }
  async function submit(event) {
    event.preventDefault();
    try {
      const fields = values();
      setBusy(true); onBusy(true); setError("");
      await saveWork(userId, { ...previous, id: previous?.id || createId() }, fields, cover, audio, gallery, removeAudio);
      await onSaved();
    } catch (failure) { setError(friendlyError(failure)); }
    finally { setBusy(false); onBusy(false); }
  }
  return <>
    <PriceEstimator currentPrice={price} onApply={value => { setPrice(value); closePreview(); }} />
    <form ref={formRef} className="creator-form" onSubmit={submit} onChange={closePreview}>
      <fieldset className="auth-fields" disabled={busy}>
        <label>Título<input name="title" required maxLength="100" defaultValue={previous?.title} /></label>
        <div className="form-row">
          <label>Formato<select name="type" value={type} onChange={event => setType(event.target.value)}>{workTypes.filter(item => item.id !== "todas").map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
          <label>Precio sugerido por vos · ARS<input name="price" type="number" required min="0.01" step="0.01" max="999999999" value={price} onChange={event => setPrice(event.target.value)} /></label>
        </div>
        <div className="form-row">
          <label>Año de creación · opcional<input name="year" type="number" min="1" max="9999" step="1" defaultValue={previous?.year ?? ""} /></label>
          <label>Disponibilidad<select name="availability" defaultValue={previous?.availability || "disponible"}>{Object.entries(availabilityLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
        </div>
        <label>Técnica o disciplina<input name="medium" required maxLength="100" defaultValue={previous?.medium} /></label>
        <label>Sobre la obra<textarea name="details" rows="4" maxLength="1500" required defaultValue={previous?.details} /></label>
        {type === "fisica" ? <fieldset className="work-specific" key="physical"><legend>Presentación y entrega</legend>
          <label>Medidas, con unidad<input name="dimensions" maxLength="120" placeholder="Ej.: 30 × 40 cm; profundidad 2 cm" defaultValue={previous?.dimensions} /></label>
          <div className="form-row"><label>Marco / presentación<select name="framing" defaultValue={previous?.framing || ""}><option value="">Por definir</option>{Object.entries(framingLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
          <label>Modalidad de entrega<select name="delivery" defaultValue={previous?.delivery || "coordinar"}>{Object.entries(deliveryLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label></div>
          <p className="auth-private">La dirección y el costo del envío se coordinarán en la etapa de compra.</p>
        </fieldset> : <fieldset className="work-specific" key={type}><legend>{type === "musica" ? "Composición y material incluido" : "Archivo y condiciones de uso"}</legend>
          <label>Formato del material<input name="file_format" maxLength="120" placeholder={type === "musica" ? "Ej.: WAV y partitura PDF" : "Ej.: PNG y PDF"} defaultValue={previous?.file_format} /></label>
          {type === "digital" ? <label>Resolución o tamaño<input name="resolution" maxLength="120" placeholder="Ej.: 3000 × 4000 px, 300 ppp" defaultValue={previous?.resolution} /></label> : <label>Duración en segundos · opcional<input name="duration_seconds" type="number" min="1" max="86400" step="1" defaultValue={previous?.duration_seconds ?? ""} /></label>}
          <label>Qué recibirá el comprador<textarea name="deliverables" maxLength="1000" rows="2" placeholder="Describí los archivos y materiales incluidos." defaultValue={previous?.deliverables} /></label>
          <label>Licencia y condiciones de uso<textarea name="license" maxLength="1000" rows="3" placeholder="Indicá los usos permitidos y las restricciones que correspondan." defaultValue={previous?.license} /></label>
        </fieldset>}
        <label>Portada · JPG, PNG o WebP, hasta 5 MB<input name="cover" type="file" accept="image/jpeg,image/png,image/webp" onChange={event => choose(event, "cover")} /></label>
        {(coverUrl || previous?.image) && <img className="upload-preview" src={coverUrl || previous.image} alt="Vista previa de la portada" />}
        {previous?.cover_path && <small>Si no elegís otra portada, se conserva la actual.</small>}
        <label>Descripción visual de la portada<input name="alt" maxLength="250" defaultValue={previous?.alt} required={Boolean(cover || previous?.cover_path)} /></label>
        <fieldset className="work-specific"><legend>Más miradas de tu obra</legend><p className="auth-private">Hasta cinco imágenes adicionales. Se muestran en el orden de esta lista, después de la portada.</p>
          {gallery.map((item, index) => <ExtraImage key={item.key} item={item} index={index} disabled={busy} onAlt={alt => { setGallery(current => current.map(old => old.key === item.key ? { ...old, alt } : old)); closePreview(); }} onRemove={() => { setGallery(current => current.filter(old => old.key !== item.key)); closePreview(); }} />)}
          <label>Agregar imágenes · hasta 5 MB cada una<input type="file" multiple accept="image/jpeg,image/png,image/webp" disabled={gallery.length >= 5} onChange={addImages} /></label>
        </fieldset>
        <label>Audio de muestra opcional · MP3, WAV u OGG, hasta 10 MB<input name="audio" type="file" accept="audio/mpeg,audio/wav,audio/x-wav,audio/ogg" onChange={event => choose(event, "audio")} /></label>
        {previous?.audio_path && !audio && <label className="checkbox-label"><input type="checkbox" checked={removeAudio} onChange={event => setRemoveAudio(event.target.checked)} />Quitar el audio actual al guardar</label>}
        <p className="delivery-note">Cargá material propio o autorizado. Las imágenes y el audio de muestra serán visibles al publicar. Los archivos de entrega privada se incorporarán junto con los pagos.</p>
        <p className="form-error" role="alert">{error}</p>
        <div className="account-actions"><button type="button" className="small-button" onClick={showPreview}>Vista previa</button><button className="button">{busy ? "Guardando…" : "Guardar borrador"}</button>{previous && <button type="button" className="small-button" onClick={onCancel}>Cancelar edición</button>}</div>
      </fieldset>
    </form>
    {preview && <section className="work-local-preview" ref={previewRef} tabIndex="-1" aria-label="Vista previa de la obra"><p className="eyebrow">Vista previa · sin guardar</p><WorkMedia key={JSON.stringify([preview.image, preview.images])} work={preview} /><h3>{preview.title}</h3><p className="preserve-lines">{preview.details}</p><WorkFacts work={preview} /><strong>{formatPrice(preview.price)} ARS</strong><p className="auth-private">Guardá el borrador y después envialo a revisión desde Tus obras.</p></section>}
  </>;
}
