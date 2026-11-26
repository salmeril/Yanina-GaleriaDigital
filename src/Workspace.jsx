import React, { useEffect, useRef, useState } from "react";
import {
  backend,
  recoveryLink,
  loadWorkspace,
  saveProfile,
  saveWork,
  setWorkStatus,
  friendlyError,
} from "./backend";
import { workTypes, formatPrice } from "./data";
import AdminDashboard from "./AdminDashboard";
import PriceEstimator from "./PriceEstimator";
import AccessForm from "./AccessForm";
import { createId } from "./ids";
import SellerDetails from "./SellerDetails";
import AvatarPicker from "./Avatar";

export function useAccount() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(Boolean(backend));
  const [recovery, setRecovery] = useState(recoveryLink);
  const [error, setError] = useState("");
  const [role, setRole] = useState(null);
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
  useEffect(() => {
    let active = true;
    setRole(null);
    const userId = session?.user.id;
    if (backend && userId) {
      backend
        .rpc("gallery_is_admin")
        .then(({ data, error: failure }) => {
          if (active)
            setRole({
              userId,
              isAdmin: Boolean(data),
              error: failure ? friendlyError(failure) : "",
            });
        })
        .catch((failure) => {
          if (active)
            setRole({ userId, isAdmin: false, error: friendlyError(failure) });
        });
    }
    return () => {
      active = false;
    };
  }, [session?.user.id]);
  return {
    session,
    loading: loading || Boolean(session && role?.userId !== session.user.id),
    isAdmin: Boolean(
      session && role?.userId === session.user.id && role?.isAdmin,
    ),
    recovery,
    error: error || role?.error || "",
    finishRecovery: () => setRecovery(false),
  };
}

export default function Workspace({
  account,
  onCatalogChange,
  adminOnly = false,
  accessMode = "login",
  isAccessRoute = false,
}) {
  const [passwordChange, setPasswordChange] = useState(false);
  useEffect(() => {
    if (account.session && !account.recovery && isAccessRoute)
      location.hash = "/mi-espacio";
  }, [account.session, account.recovery, isAccessRoute]);
  if (account.loading)
    return (
      <section className="section wrap" role="status">
        Comprobando tu sesión…
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
      <section className="section wrap auth-layout">
        <div className="auth-intro">
          <p className="eyebrow">Artistas y compositores</p>
          <h1 className="page-title">Un lugar para<br /><em>lo que creás.</em></h1>
          <p className="lead">Tu perfil, tus obras y nuevas personas para descubrirlas.</p>
          <ul className="auth-benefits">
            <li>Presentá tu recorrido y tu identidad artística.</li>
            <li>Reuní tus obras físicas, digitales y composiciones.</li>
            <li>Prepará tus publicaciones y seguí su revisión.</li>
          </ul>
          <p className="auth-private">Tu cuenta empieza con un perfil privado. La publicación de obras requiere revisión de la galería.</p>
          <a className="text-link" href="#/galeria">Seguir explorando las obras</a>
        </div>
        <AccessForm key={accessMode} mode={accessMode} />
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
  if (adminOnly) {
    if (!account.isAdmin)
      return (
        <section className="section wrap">
          <h1 className="page-title">
            Acceso de <em>administración.</em>
          </h1>
          <p className="lead">Tu cuenta no tiene permisos para este panel.</p>
          <a className="button" href="#/mi-espacio">
            Ir a mi espacio
          </a>
        </section>
      );
    return (
      <AdminDashboard
        user={account.session.user}
        onCatalogChange={onCatalogChange}
      />
    );
  }
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
  const participationEnabled =
    data?.membership.status === "habilitada" &&
    (!data.membership.valid_until ||
      new Date(data.membership.valid_until) > new Date());

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
      }, values.get("avatar"), values.has("remove_avatar"));
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
      const status = ["publicada", "revision"].includes(work.status)
        ? "borrador"
        : "revision";
      await setWorkStatus(work, status);
      setMessage(
        status === "revision"
          ? "La obra se envió a revisión."
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
      <SellerDetails userId={user.id} />
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
          <div className="membership-banner">
            <strong>
              Participación{" "}
              {
                {
                  pendiente: "pendiente de habilitación",
                  habilitada: participationEnabled ? "habilitada" : "vencida",
                  suspendida: "suspendida para publicación",
                }[data.membership.status]
              }
            </strong>
            <p>
              {participationEnabled
                ? "Podés preparar tus trabajos y enviarlos a revisión."
                : "Podés preparar tus borradores. La administración debe habilitar tu participación para enviarlos a revisión."}
            </p>
            <small>
              La modalidad de publicación se definirá con los futuros planes de
              la galería.
            </small>
          </div>
          <div className="creator-grid">
            <form
              className="creator-form account-box"
              onSubmit={updateProfile}
              key={`${user.id}-${data.profile.version}`}
            >
              <h2>Tu perfil</h2>
              <AvatarPicker profile={data.profile} disabled={busy} />
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
                artístico, foto, disciplina y presentación una vez habilitada tu
                participación. Si lo ocultás, tus obras también dejan de
                aparecer en el catálogo público.
              </p>
              <button className="button" disabled={busy}>
                Guardar perfil
              </button>
              {data.profile.is_public &&
                data.membership.status === "habilitada" && (
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
            Enviá tus obras a revisión cuando tu participación esté habilitada,
            tu perfil sea público y tengan portada. La administración aprobará
            su publicación o te dejará una observación. Al editar una obra
            vuelve a borrador.
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
                  {
                    {
                      publicada: "Publicada",
                      revision: "En revisión",
                      cambios: "Cambios solicitados",
                      borrador: "Borrador",
                    }[work.status]
                  }
                </p>
                {data.reviews.find((review) => review.work_id === work.id)
                  ?.note && (
                  <p className="review-note">
                    <strong>Última observación</strong>
                    <br />
                    {
                      data.reviews.find((review) => review.work_id === work.id)
                        .note
                    }
                  </p>
                )}
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
                      (!["publicada", "revision"].includes(work.status) &&
                        (!data.profile.is_public ||
                          !work.cover_path ||
                          !participationEnabled))
                    }
                    onClick={() => toggle(work)}
                  >
                    {["publicada", "revision"].includes(work.status)
                      ? "Volver a borrador"
                      : "Enviar a revisión"}
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
  const [identity] = useState(() => previous || {});
  const [type, setType] = useState(previous?.type || "fisica");
  const [price, setPrice] = useState(previous?.price ?? "");
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
        { ...identity, id: identity.id || createId() },
        {
          title,
          type,
          medium,
          details,
          alt,
          price,
          status: "borrador",
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
    <>
      <PriceEstimator currentPrice={price} onApply={setPrice} />
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
            Precio sugerido por vos · ARS
            <input
              name="price"
              type="number"
              required
              min="0.01"
              step="0.01"
              max="999999999"
              value={price}
              onChange={(event) => setPrice(event.target.value)}
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
          <small>
            La obra ya tiene un audio de muestra. Podés reemplazarlo.
          </small>
        )}
        <p className="delivery-note">
          Cargá únicamente material propio o autorizado. La portada y el audio
          de muestra serán accesibles al publicar. El archivo digital que se
          venderá se incorporará en la etapa de pagos y entrega privada.
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
    </>
  );
}
