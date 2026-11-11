import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL?.trim();
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim();
const configured = Boolean(
  url && key && !url.includes("TU-PROYECTO") && !key.includes("TU-CLAVE"),
);

// Los enlaces de email usan el fragmento para devolver la sesión.
// Capturamos el modo de recuperación antes de que el SDK limpie la URL.
export const recoveryLink =
  new URLSearchParams(location.hash.slice(1)).get("type") === "recovery";
export const backend = configured
  ? createClient(url, key, {
      auth: {
        flowType: "implicit",
        detectSessionInUrl: true,
        persistSession: true,
        autoRefreshToken: true,
      },
    })
  : null;
export const authRedirect = () => `${location.origin}${location.pathname}`;
const bucket = "gallery-previews";

export async function hydrateWorks(rows) {
  const paths = [
    ...new Set(
      rows.flatMap((row) => [row.cover_path, row.audio_path]).filter(Boolean),
    ),
  ];
  let urls = new Map();
  if (paths.length) {
    const { data, error } = await backend.storage
      .from(bucket)
      .createSignedUrls(paths, 600);
    if (error) throw error;
    if (data.some((item) => item.error))
      throw new Error(
        "No se pudieron abrir algunas portadas. Actualizá el catálogo.",
      );
    urls = new Map(data.map((item) => [item.path, item.signedUrl]));
  }
  return rows.map((row) => ({
    ...row,
    price: Number(row.price),
    artistId: row.artist_id,
    image: urls.get(row.cover_path) || "",
    audio: urls.get(row.audio_path) || "",
    palette: "coral",
  }));
}

export async function loadCatalog() {
  const [profiles, works] = await Promise.all([
    backend
      .from("gallery_profiles")
      .select("id,name,discipline,bio")
      .eq("is_public", true)
      .order("created_at"),
    backend
      .from("gallery_works")
      .select("*")
      .eq("status", "publicada")
      .order("created_at", { ascending: false }),
  ]);
  if (profiles.error) throw profiles.error;
  if (works.error) throw works.error;
  const publicArtists = new Set(profiles.data.map((profile) => profile.id));
  return {
    artists: profiles.data,
    artworks: await hydrateWorks(
      works.data.filter((work) => publicArtists.has(work.artist_id)),
    ),
  };
}

export async function loadWorkspace(userId) {
  const [profile, works] = await Promise.all([
    backend.from("gallery_profiles").select("*").eq("id", userId).single(),
    backend
      .from("gallery_works")
      .select("*")
      .eq("artist_id", userId)
      .order("created_at", { ascending: false }),
  ]);
  if (profile.error) throw profile.error;
  if (works.error) throw works.error;
  return { profile: profile.data, works: await hydrateWorks(works.data) };
}

export async function saveProfile(profile, fields) {
  const { data, error } = await backend
    .from("gallery_profiles")
    .update(fields)
    .eq("id", profile.id)
    .eq("version", profile.version)
    .select()
    .maybeSingle();
  if (error) throw error;
  if (!data)
    throw new Error(
      "El perfil cambió en otra pestaña. Actualizá el panel antes de editarlo.",
    );
  return data;
}

export function validateFile(file, kind) {
  if (!file?.size) return;
  const types =
    kind === "cover"
      ? ["image/jpeg", "image/png", "image/webp"]
      : ["audio/mpeg", "audio/wav", "audio/x-wav", "audio/ogg"];
  if (!types.includes(file.type))
    throw new Error(
      kind === "cover"
        ? "Elegí una portada JPG, PNG o WebP."
        : "Elegí un audio MP3, WAV u OGG.",
    );
  const limit = kind === "cover" ? 5 : 10;
  if (file.size > limit * 1024 * 1024)
    throw new Error(`El archivo supera el límite de ${limit} MB.`);
}

async function uploadFile(userId, file) {
  const extension = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "audio/mpeg": "mp3",
    "audio/wav": "wav",
    "audio/x-wav": "wav",
    "audio/ogg": "ogg",
  }[file.type];
  const path = `${userId}/${crypto.randomUUID()}.${extension}`;
  const { error } = await backend.storage
    .from(bucket)
    .upload(path, file, { upsert: false, contentType: file.type });
  if (error) throw error;
  return path;
}

export async function saveWork(userId, previous, fields, cover, audio) {
  validateFile(cover, "cover");
  validateFile(audio, "audio");
  const uploaded = [];
  try {
    const coverPath = cover?.size
      ? await uploadFile(userId, cover)
      : previous.cover_path;
    if (cover?.size) uploaded.push(coverPath);
    const audioPath = audio?.size
      ? await uploadFile(userId, audio)
      : previous.audio_path;
    if (audio?.size) uploaded.push(audioPath);
    const values = {
      ...fields,
      cover_path: coverPath || null,
      audio_path: audioPath || null,
    };
    let query;
    if (previous.version) {
      query = backend
        .from("gallery_works")
        .update(values)
        .eq("id", previous.id)
        .eq("artist_id", userId)
        .eq("version", previous.version);
    } else {
      query = backend
        .from("gallery_works")
        .insert({ ...values, id: previous.id, artist_id: userId });
    }
    const { data, error } = await query.select().maybeSingle();
    if (error) throw error;
    if (!data)
      throw new Error(
        "La obra cambió en otra pestaña. Actualizá el panel antes de continuar.",
      );
    // El resultado ya está confirmado en la base. La limpieza no invalida el guardado.
    const replaced = [previous.cover_path, previous.audio_path].filter(
      (path) => path && path !== coverPath && path !== audioPath,
    );
    if (replaced.length)
      await backend.storage
        .from(bucket)
        .remove(replaced)
        .catch(() => {});
    return data;
  } catch (error) {
    // RLS impide borrar archivos que quedaron referenciados si se perdió la respuesta.
    if (uploaded.length)
      await backend.storage
        .from(bucket)
        .remove(uploaded)
        .catch(() => {});
    throw error;
  }
}

export async function setWorkStatus(work, status) {
  const { data, error } = await backend
    .from("gallery_works")
    .update({ status })
    .eq("id", work.id)
    .eq("version", work.version)
    .select()
    .maybeSingle();
  if (error) throw error;
  if (!data)
    throw new Error("La obra cambió. Actualizá el panel antes de continuar.");
  return data;
}

export function friendlyError(error) {
  if (error?.code === "23505")
    return "Este registro ya se guardó. Actualizá el panel para verlo.";
  if (error?.code === "42501")
    return "No tenés permiso para esta operación. Para publicar, activá primero tu perfil público.";
  if (error?.message === "Invalid login credentials")
    return "Revisá el correo y la contraseña.";
  if (error?.message === "Email not confirmed")
    return "Confirmá tu correo desde el enlace que recibiste antes de entrar.";
  if (error?.status === 429)
    return "Se hicieron varios intentos. Esperá un momento antes de volver a probar.";
  return (
    error?.message || "No pudimos completar la operación. Volvé a intentar."
  );
}
