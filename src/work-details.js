export const availabilityLabels = { disponible: "Disponible", reservada: "Reservada", vendida: "Vendida", exposicion: "Solo exposición" };
export const framingLabels = { sin_marco: "Sin marco", con_marco: "Con marco", no_aplica: "No corresponde" };
export const deliveryLabels = { coordinar: "A coordinar", retiro: "Retiro", envio: "Envío", ambos: "Retiro o envío" };
export const canSelectWork = work => !work.availability || work.availability === "disponible";
export function publicUrl(value, instagram = false) {
  if (!value?.trim()) return "";
  try {
    const url = new URL(value.trim());
    if (url.protocol !== "https:" || url.username || url.password || (instagram && !["instagram.com", "www.instagram.com"].includes(url.hostname))) return "";
    return url.href;
  } catch { return ""; }
}
export function profileFields(values) {
  const website = String(values.get("website") || "").trim();
  const instagram = String(values.get("instagram") || "").trim();
  if (website && !publicUrl(website)) throw new Error("Usá un enlace web completo que empiece con https://.");
  if (instagram && !publicUrl(instagram, true)) throw new Error("Usá el enlace completo a tu perfil de Instagram: https://www.instagram.com/tuusuario/.");
  return { public_location: String(values.get("public_location") || "").trim(), website: publicUrl(website), instagram: publicUrl(instagram, true) };
}
export function workFacts(work) {
  const facts = [["Año", work.year], ["Disponibilidad", availabilityLabels[work.availability]]];
  if (work.type === "fisica") facts.push(["Medidas", work.dimensions], ["Presentación", framingLabels[work.framing]], ["Entrega", deliveryLabels[work.delivery]]);
  else {
    facts.push(["Formato", work.file_format]);
    if (work.type === "digital") facts.push(["Resolución / tamaño", work.resolution]);
    if (work.duration_seconds) facts.push(["Duración", `${Math.floor(work.duration_seconds / 60)}:${String(work.duration_seconds % 60).padStart(2, "0")}`]);
    facts.push(["Material incluido", work.deliverables], ["Condiciones de uso", work.license]);
  }
  return facts.filter(([, value]) => value !== "" && value != null);
}
export function collectWorkFields(values, type) {
  const text = key => String(values.get(key) || "").trim();
  const number = key => text(key) ? Number(text(key)) : null;
  const fields = {
    title: text("title"), type, medium: text("medium"), details: text("details"), alt: text("alt"), price: Number(text("price")),
    year: number("year"), availability: text("availability") || "disponible",
    dimensions: type === "fisica" ? text("dimensions") : "",
    framing: type === "fisica" ? text("framing") : "", delivery: type === "fisica" ? text("delivery") : "coordinar",
    file_format: type !== "fisica" ? text("file_format") : "", resolution: type === "digital" ? text("resolution") : "",
    license: type !== "fisica" ? text("license") : "", deliverables: type !== "fisica" ? text("deliverables") : "",
    duration_seconds: type === "musica" ? number("duration_seconds") : null, status: "borrador",
  };
  if (!fields.title || !fields.medium || !fields.details || !Number.isFinite(fields.price) || fields.price <= 0 || fields.price > 999999999)
    throw new Error("Completá título, técnica, descripción y un precio válido.");
  if (fields.year != null && (!Number.isInteger(fields.year) || fields.year < 1 || fields.year > 9999)) throw new Error("Revisá el año de la obra.");
  if (fields.duration_seconds != null && (!Number.isInteger(fields.duration_seconds) || fields.duration_seconds < 1 || fields.duration_seconds > 86400)) throw new Error("La duración debe estar entre 1 y 86400 segundos.");
  return fields;
}
