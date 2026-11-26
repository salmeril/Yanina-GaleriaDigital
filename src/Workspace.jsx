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
import { formatPrice } from "./data";
import AdminDashboard from "./AdminDashboard";
import WorkForm from "./WorkForm";
import { profileFields } from "./work-details";
import { ShareProfile } from "./ProfileLinks";
import AccessForm from "./AccessForm";
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
  const [workFilter, setWorkFilter] = useState("todas");
  const editorRef = useRef(null);
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
        ...profileFields(values),
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

          </div>
          <div className="creator-progress" aria-label="Preparar tu sala">
            <div><strong>Tu perfil</strong><p>{data.profile.bio && data.profile.discipline ? "Presentación cargada" : "Completá tu disciplina y presentación"}</p></div>
            <div><strong>Tu catálogo</strong><p>{data.works.length ? `${data.works.length} obra(s) cargada(s)` : "Cargá tu primera obra"}</p></div>
            <div><strong>Tu sala pública</strong><p>{data.profile.is_public && participationEnabled ? `${data.works.filter(work => work.status === "publicada").length} obra(s) publicada(s)` : "Requiere perfil público y habilitación"}</p></div>
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
              <label>Ubicación pública · opcional<input name="public_location" maxLength="120" placeholder="Ej.: Buenos Aires, Argentina" defaultValue={data.profile.public_location} /><small>Solo lo que quieras mostrar; evitá escribir tu domicilio.</small></label>
              <label>Sitio web · opcional<input name="website" type="url" maxLength="300" placeholder="https://…" defaultValue={data.profile.website} /></label>
              <label>Instagram · opcional<input name="instagram" type="url" maxLength="300" placeholder="https://www.instagram.com/tuusuario/" defaultValue={data.profile.instagram} /></label>
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
                artístico, foto, disciplina, presentación, ubicación pública y enlaces una vez habilitada tu
                participación. Si lo ocultás, tus obras también dejan de
                aparecer en el catálogo público.
              </p>
              <button className="button" disabled={busy}>
                Guardar perfil
              </button>
              {data.profile.is_public &&
                participationEnabled && (
                  <a className="text-link" href={`#/artistas/${user.id}`}>
                    Ver mi sala
                  </a>
                )}
              <ShareProfile id={user.id} enabled={data.profile.is_public && participationEnabled} />
            </form>
            <div className="account-box" ref={editorRef} tabIndex="-1">
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
          <div className="filters" role="group" aria-label="Filtrar tus obras">
            {Object.entries({ todas: "Todas", borrador: "Borradores", revision: "En revisión", cambios: "Con observaciones", publicada: "Publicadas" }).map(([key, label]) => <button key={key} aria-pressed={workFilter === key} onClick={() => setWorkFilter(key)}>{label} ({data.works.filter(work => key === "todas" || work.status === key).length})</button>)}
          </div>
          <div className="workspace-works">
            {data.works.filter(work => workFilter === "todas" || work.status === workFilter).map((work) => (
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
                {data.reviews.filter(review => review.work_id === work.id).length > 0 && <details className="review-history"><summary>Historial de revisión</summary><ul>{data.reviews.filter(review => review.work_id === work.id).map(review => <li key={review.id}><strong>{review.decision === "publicada" ? "Aprobada" : "Cambios solicitados"}</strong> · {new Date(review.created_at).toLocaleDateString("es-AR")}<p>{review.note || "Sin observaciones."}</p></li>)}</ul></details>}
                <div className="account-actions">
                  <button
                    className="small-button"
                    disabled={busy}
                    onClick={() => {
                      setEditing(work);
                      setError("");
                      editorRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
                      editorRef.current?.focus({ preventScroll: true });
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
          {data.works.length > 0 && !data.works.some(work => workFilter === "todas" || work.status === workFilter) && <p className="empty-state">No tenés obras en este estado.</p>}
          {!data.works.length && (
            <p className="empty-state">Todavía no cargaste obras.</p>
          )}
        </>
      )}
    </section>
  );
}

