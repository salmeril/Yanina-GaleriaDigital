import React, { useEffect, useRef, useState } from "react";
import {
  backend,
  recoveryLink,
  authRedirect,
  loadWorkspace,
  saveProfile,
  saveWork,
  setWorkStatus,
  friendlyError,
} from "./backend";
import { workTypes, formatPrice } from "./data";

export function useAccount() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(Boolean(backend));
  const [recovery, setRecovery] = useState(recoveryLink);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!backend) return;
    let active = true;
    let revision = 0;
    const {
      data: { subscription },
    } = backend.auth.onAuthStateChange((event, next) => {
      if (!active) return;
      revision += 1;
      setSession(next);
      setError("");
      setLoading(false);
      if (event === "PASSWORD_RECOVERY") {
        setRecovery(true);
        location.hash = "/mi-espacio";
      }
      if (event === "SIGNED_OUT") setRecovery(false);
      if (next && !location.hash.startsWith("#/"))
        location.hash = "/mi-espacio";
    });
    backend.auth
      .getSession()
      .then(({ data, error: failure }) => {
        if (!active || revision) return;
        if (failure) setError(friendlyError(failure));
        setSession(data.session);
        setLoading(false);
      })
      .catch((failure) => {
        if (active) {
          setError(friendlyError(failure));
          setLoading(false);
        }
      });
    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);
  return {
    session,
    loading,
    recovery,
    error,
    finishRecovery: () => setRecovery(false),
  };
}

function AccessForm({ mode, onMode, onPasswordSaved }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  async function submit(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    const email = String(values.get("email") || "").trim();
    const password = String(values.get("password") || "");
    setBusy(true);
    setError("");
    setMessage("");
    try {
      let result;
      if (mode === "signup") {
        const name = String(values.get("name")).trim();
        if (!name) throw new Error("Completá tu nombre artístico.");
        result = await backend.auth.signUp({
          email,
          password,
          options: { data: { name }, emailRedirectTo: authRedirect() },
        });
        if (result.error) throw result.error;
        if (!result.data.session)
          setMessage(
            "Si el registro se puede completar, recibirás un correo para confirmar tu cuenta. Revisá también el spam.",
          );
      } else if (mode === "reset") {
        result = await backend.auth.resetPasswordForEmail(email, {
          redirectTo: authRedirect(),
        });
        if (result.error) throw result.error;
        setMessage(
          "Si hay una cuenta asociada, recibirás un enlace para cambiar tu contraseña.",
        );
      } else if (mode === "password") {
        if (password !== values.get("confirmation"))
          throw new Error("Las contraseñas no coinciden.");
        result = await backend.auth.updateUser({ password });
        if (result.error) throw result.error;
        onPasswordSaved();
      } else {
        result = await backend.auth.signInWithPassword({ email, password });
        if (result.error) throw result.error;
      }
      form.reset();
    } catch (failure) {
      setError(friendlyError(failure));
    } finally {
      setBusy(false);
    }
  }
  const titles = {
    login: "Entrá a tu espacio.",
    signup: "Creá tu cuenta.",
    reset: "Recuperá tu acceso.",
    password: "Elegí una nueva contraseña.",
  };
  return (
    <div className="account-box">
      <h2>{titles[mode]}</h2>
      <form className="creator-form" onSubmit={submit}>
        {mode === "signup" && (
          <label>
            Nombre artístico
            <input name="name" autoComplete="name" required maxLength="100" />
          </label>
        )}
        {mode !== "password" && (
          <label>
            Correo electrónico
            <input
              name="email"
              type="email"
              autoComplete="email"
              required
              maxLength="254"
            />
          </label>
        )}
        {mode !== "reset" && (
          <label>
            Contraseña
            <input
              name="password"
              type="password"
              autoComplete={
                mode === "login" ? "current-password" : "new-password"
              }
              required
              minLength={mode === "login" ? 1 : 10}
              maxLength="128"
            />
            <small>{mode !== "login" && "Usá al menos 10 caracteres."}</small>
          </label>
        )}
        {mode === "password" && (
          <label>
            Repetí la contraseña
            <input
              name="confirmation"
              type="password"
              autoComplete="new-password"
              required
              minLength="10"
              maxLength="128"
            />
          </label>
        )}
        {mode === "signup" && (
          <p className="delivery-note">
            Tu perfil empieza privado. Podrás elegir qué obras publicar. Usá un
            correo que puedas confirmar.
          </p>
        )}
        <p className="form-error" role="alert">
          {error}
        </p>
        <p role="status">{message}</p>
        <button className="button" disabled={busy}>
          {busy
            ? "Procesando…"
            : {
                login: "Ingresar",
                signup: "Crear cuenta",
                reset: "Enviar enlace",
                password: "Guardar contraseña",
              }[mode]}
        </button>
      </form>
      {mode !== "password" && (
        <div className="account-actions">
          <button
            className="text-button"
            onClick={() => onMode(mode === "signup" ? "login" : "signup")}
          >
            {mode === "signup" ? "Ya tengo una cuenta" : "Crear una cuenta"}
          </button>
          <button
            className="text-button"
            onClick={() => onMode(mode === "reset" ? "login" : "reset")}
          >
            {mode === "reset" ? "Volver a ingresar" : "Olvidé mi contraseña"}
          </button>
        </div>
      )}
    </div>
  );
}

export default function Workspace({ account, onCatalogChange }) {
  const [mode, setMode] = useState("login");
  const [passwordChange, setPasswordChange] = useState(false);
  if (account.loading)
    return (
      <section className="section wrap" role="status">
        Comprobando tu sesión…
      </section>
    );
  if (!backend)
    return (
      <section className="section wrap">
        <p className="eyebrow">Mi espacio</p>
        <h1 className="page-title">
          Tu próxima <em>sala.</em>
        </h1>
        <p className="lead">
          El acceso de artistas se está preparando. Pronto podrás crear tu
          perfil y guardar tus obras.
        </p>
        <a className="button" href="#/galeria">
          Recorré la galería
        </a>
      </section>
    );
  if (account.error)
    return (
      <section className="section wrap">
        <p className="form-error" role="alert">
          {account.error}
        </p>
        <button className="button" onClick={() => location.reload()}>
          Volver a intentar
        </button>
      </section>
    );
  if (!account.session)
    return (
      <section className="section wrap">
        <p className="eyebrow">Artistas y compositores</p>
        <h1 className="page-title">
          Tu propio <em>espacio.</em>
        </h1>
        <p className="lead">
          Guardá tu perfil, reuní tus creaciones y elegí cuáles compartir en la
          galería.
        </p>
        <AccessForm key={mode} mode={mode} onMode={setMode} />
      </section>
    );
  if (account.recovery || passwordChange)
    return (
      <section className="section wrap">
        <AccessForm
          mode="password"
          onPasswordSaved={() => {
            account.finishRecovery();
            setPasswordChange(false);
          }}
        />
      </section>
    );
  return (
    <ArtistDashboard
      key={account.session.user.id}
      user={account.session.user}
      onCatalogChange={onCatalogChange}
      onPasswordChange={() => setPasswordChange(true)}
    />
  );
}

function ArtistDashboard({ user, onCatalogChange, onPasswordChange }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(null);
  const [newKey, setNewKey] = useState(0);
  const request = useRef(0);

  async function refresh() {
    const revision = ++request.current;
    try {
      const next = await loadWorkspace(user.id);
      if (request.current === revision) {
        setData(next);
        setError("");
      }
    } catch (failure) {
      if (request.current === revision) setError(friendlyError(failure));
    }
  }
  useEffect(() => {
    refresh();
    return () => {
      request.current += 1;
    };
  }, [user.id]);

  async function updateProfile(event) {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    const name = String(values.get("name")).trim();
    if (!name) {
      setError("Completá tu nombre artístico.");
      return;
    }
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const profile = await saveProfile(data.profile, {
        name,
        discipline: String(values.get("discipline")).trim(),
        bio: String(values.get("bio")).trim(),
        is_public: values.has("is_public"),
      });
      setData((current) => ({ ...current, profile }));
      setMessage("Tu perfil quedó guardado.");
      onCatalogChange();
    } catch (failure) {
      setError(friendlyError(failure));
    } finally {
      setBusy(false);
    }
  }

  async function toggle(work) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const status = work.status === "publicada" ? "borrador" : "publicada";
      await setWorkStatus(work, status);
      setMessage(
        status === "publicada"
          ? "La obra se publicó en tu sala."
          : "La obra volvió a borrador.",
      );
      await refresh();
      onCatalogChange();
    } catch (failure) {
      setError(friendlyError(failure));
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    setBusy(true);
    setError("");
    try {
      const { error: failure } = await backend.auth.signOut({ scope: "local" });
      if (failure) throw failure;
    } catch (failure) {
      setError(friendlyError(failure));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="section wrap">
      <p className="eyebrow">Mi espacio</p>
      <h1 className="page-title">
        Tu sala, <em>tu recorrido.</em>
      </h1>
      <div className="dashboard-top">
        <p>{user.email}</p>
        <button
          className="text-button"
          onClick={onPasswordChange}
          disabled={busy}
        >
          Cambiar contraseña
        </button>
        <button className="small-button" onClick={logout} disabled={busy}>
          Cerrar sesión
        </button>
      </div>
      <p className="form-error" role="alert">
        {error}
      </p>
      <p role="status">{message}</p>
      <button className="text-button" onClick={refresh} disabled={busy}>
        Actualizar datos del panel
      </button>
      {!data ? (
        <p className="empty-state">
          {error
            ? "No se pudieron cargar tus datos. Podés reintentar con el botón de arriba."
            : "Cargando tu espacio…"}
        </p>
      ) : (
        <>
          <div className="creator-grid">
            <form
              className="creator-form account-box"
              onSubmit={updateProfile}
              key={`${user.id}-${data.profile.version}`}
            >
              <h2>Tu perfil</h2>
              <label>
                Nombre artístico
                <input
                  name="name"
                  required
                  maxLength="100"
                  defaultValue={data.profile.name}
                />
              </label>
              <label>
                Disciplina
                <input
                  name="discipline"
                  maxLength="120"
                  defaultValue={data.profile.discipline}
                />
              </label>
              <label>
                Presentación
                <textarea
                  name="bio"
                  rows="5"
                  maxLength="1500"
                  defaultValue={data.profile.bio}
                />
              </label>
              <label className="checkbox-label">
                <input
                  name="is_public"
                  type="checkbox"
                  defaultChecked={data.profile.is_public}
                />{" "}
                Mostrar mi perfil en el directorio público
              </label>
              <p className="delivery-note">
                Tu correo es privado. Al activar el perfil se muestran tu nombre
                artístico, disciplina y presentación. Si lo ocultás, tus obras
                también dejan de aparecer en el catálogo público.
              </p>
              <button className="button" disabled={busy}>
                Guardar perfil
              </button>
              {data.profile.is_public && (
                <a className="text-link" href={`#/artistas/${user.id}`}>
                  Ver mi sala
                </a>
              )}
            </form>
            <div className="account-box">
              <h2>{editing ? "Editar obra" : "Cargar una obra"}</h2>
              <WorkForm
                key={editing?.id || `new-${newKey}`}
                userId={user.id}
                previous={editing}
                onBusy={setBusy}
                onSaved={async () => {
                  setEditing(null);
                  setNewKey((current) => current + 1);
                  setMessage("La obra quedó guardada.");
                  await refresh();
                  onCatalogChange();
                }}
                onCancel={() => setEditing(null)}
              />
            </div>
          </div>
          <div className="room-heading">
            <h2>Tus obras</h2>
            <span>{data.works.length} trabajo(s)</span>
          </div>
          <p className="delivery-note">
            Publicá cuando tu perfil esté visible y la obra tenga portada. Podés
            volver a borrador cuando lo necesites. Las ventas y entregas todavía
            están en preparación.
          </p>
          <div className="workspace-works">
            {data.works.map((work) => (
              <article className="draft-card" key={work.id}>
                {work.image && (
                  <img className="art-image" src={work.image} alt={work.alt} />
                )}
                <h3>{work.title}</h3>
                <p>
                  {formatPrice(work.price)} ARS ·{" "}
                  {work.status === "publicada" ? "Publicada" : "Borrador"}
                </p>
                <div className="account-actions">
                  <button
                    className="small-button"
                    disabled={busy}
                    onClick={() => {
                      setEditing(work);
                      setError("");
                    }}
                  >
                    Editar
                  </button>
                  <button
                    className="small-button"
                    disabled={
                      busy ||
                      (work.status !== "publicada" &&
                        (!data.profile.is_public || !work.cover_path))
                    }
                    onClick={() => toggle(work)}
                  >
                    {work.status === "publicada"
                      ? "Volver a borrador"
                      : "Publicar en mi sala"}
                  </button>
                </div>
              </article>
            ))}
          </div>
          {!data.works.length && (
            <p className="empty-state">Todavía no cargaste obras.</p>
          )}
        </>
      )}
    </section>
  );
}

function WorkForm({ userId, previous, onSaved, onCancel, onBusy }) {
  const [identity] = useState(() => previous || { id: crypto.randomUUID() });
  const [type, setType] = useState(previous?.type || "fisica");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(event) {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    const title = String(values.get("title")).trim();
    const medium = String(values.get("medium")).trim();
    const details = String(values.get("details")).trim();
    const alt = String(values.get("alt")).trim();
    const price = Number(values.get("price"));
    if (
      !title ||
      !medium ||
      !details ||
      !Number.isFinite(price) ||
      price <= 0 ||
      price > 999999999
    ) {
      setError("Completá título, técnica, descripción y un precio válido.");
      return;
    }
    const cover = values.get("cover");
    if ((cover.size || identity.cover_path) && !alt) {
      setError("Describí la portada para que sea accesible.");
      return;
    }
    setBusy(true);
    onBusy(true);
    setError("");
    try {
      await saveWork(
        userId,
        identity,
        {
          title,
          type,
          medium,
          details,
          alt,
          price,
          status: identity.status || "borrador",
        },
        cover,
        values.get("audio"),
      );
      await onSaved();
    } catch (failure) {
      setError(friendlyError(failure));
    } finally {
      setBusy(false);
      onBusy(false);
    }
  }
  return (
    <form className="creator-form" onSubmit={submit}>
      <label>
        Título
        <input
          name="title"
          required
          maxLength="100"
          defaultValue={previous?.title}
        />
      </label>
      <div className="form-row">
        <label>
          Formato
          <select
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
          Precio en ARS
          <input
            name="price"
            type="number"
            required
            min="0.01"
            step="0.01"
            max="999999999"
            defaultValue={previous?.price}
          />
        </label>
      </div>
      <label>
        Técnica o disciplina
        <input
          name="medium"
          required
          maxLength="100"
          defaultValue={previous?.medium}
        />
      </label>
      <label>
        {type === "fisica"
          ? "Descripción, medidas, materiales y presentación"
          : "Descripción, formato y condiciones de uso"}
        <textarea
          name="details"
          rows="4"
          maxLength="1500"
          required
          defaultValue={previous?.details}
        />
      </label>
      <label>
        Portada · JPG, PNG o WebP, hasta 5 MB
        <input
          name="cover"
          type="file"
          accept="image/jpeg,image/png,image/webp"
        />
      </label>
      {previous?.cover_path && (
        <small>Si no elegís otra portada, se conserva la actual.</small>
      )}
      <label>
        Descripción visual de la portada
        <input name="alt" maxLength="250" defaultValue={previous?.alt} />
      </label>
      <label>
        Audio de muestra opcional · MP3, WAV u OGG, hasta 10 MB
        <input
          name="audio"
          type="file"
          accept="audio/mpeg,audio/wav,audio/x-wav,audio/ogg"
        />
      </label>
      {previous?.audio_path && (
        <small>La obra ya tiene un audio de muestra. Podés reemplazarlo.</small>
      )}
      <p className="delivery-note">
        Cargá únicamente material propio o autorizado. La portada y el audio de
        muestra serán accesibles al publicar. El archivo digital que se venderá
        se incorporará en la etapa de pagos y entrega privada.
      </p>
      <p className="form-error" role="alert">
        {error}
      </p>
      <div className="account-actions">
        <button className="button" disabled={busy}>
          {busy ? "Guardando…" : "Guardar obra"}
        </button>
        {previous && (
          <button
            type="button"
            className="small-button"
            onClick={onCancel}
            disabled={busy}
          >
            Cancelar edición
          </button>
        )}
      </div>
    </form>
  );
}
