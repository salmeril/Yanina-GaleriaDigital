import React, { useEffect, useRef, useState } from "react";
import {
  loadAdmin,
  reviewWork,
  updateMembership,
  friendlyError,
} from "./backend";
import { formatPrice } from "./data";

export default function AdminDashboard({ user, onCatalogChange }) {
  const [data, setData] = useState(null);
  const [tab, setTab] = useState("revision");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const request = useRef(0);
  async function refresh() {
    const revision = ++request.current;
    try {
      const next = await loadAdmin();
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
  }, []);
  async function act(operation, success) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await operation();
      setMessage(success);
      await refresh();
      onCatalogChange();
    } catch (failure) {
      setError(friendlyError(failure));
    } finally {
      setBusy(false);
    }
  }
  const pending =
    data?.works.filter((work) => work.status === "revision") || [];
  const enabled = (membership) =>
    membership?.status === "habilitada" &&
    (!membership.valid_until || new Date(membership.valid_until) > new Date());
  return (
    <section className="section wrap">
      <p className="eyebrow">Administración de la galería</p>
      <h1 className="page-title">
        Personas, obras
        <br />y <em>encuentros.</em>
      </h1>
      <div className="dashboard-top">
        <p>{user.email}</p>
        <a className="small-button" href="#/mi-espacio">
          Mi perfil y sesión
        </a>
        <button className="text-button" disabled={busy} onClick={refresh}>
          Actualizar panel
        </button>
      </div>
      <p className="form-error" role="alert">
        {error}
      </p>
      <p role="status">{message}</p>
      {!data ? (
        <p className="empty-state">
          {error
            ? "Podés reintentar con Actualizar panel."
            : "Cargando la administración…"}
        </p>
      ) : (
        <>
          <div className="admin-stats">
            <div>
              <strong>{data.profiles.length}</strong>
              <span>Participantes</span>
            </div>
            <div>
              <strong>{pending.length}</strong>
              <span>Obras por revisar</span>
            </div>
            <div>
              <strong>
                {
                  data.works.filter((work) => work.status === "publicada")
                    .length
                }
              </strong>
              <span>Obras aprobadas</span>
            </div>
          </div>
          <div
            className="filters"
            role="group"
            aria-label="Secciones de administración"
          >
            {[
              ["revision", "Obras por revisar"],
              ["artistas", "Participantes"],
              ["publicadas", "Obras aprobadas"],
            ].map(([id, label]) => (
              <button
                key={id}
                aria-pressed={tab === id}
                onClick={() => setTab(id)}
              >
                {label}
              </button>
            ))}
          </div>
          {tab === "artistas" ? (
            <>
              <p className="delivery-note">
                La habilitación permite enviar obras a revisión. La suspensión
                oculta el perfil y las obras al público. El acceso a los
                borradores propios se conserva para que el artista pueda
                revisarlos.
              </p>
              <div className="admin-members">
                {data.profiles.map((profile) => {
                  const membership = data.memberships.find(
                    (item) => item.artist_id === profile.id,
                  );
                  return (
                    membership && (
                      <MembershipCard
                        key={`${profile.id}-${membership.version}`}
                        profile={profile}
                        membership={membership}
                        busy={busy}
                        onSave={(status) =>
                          act(
                            () => updateMembership(membership, status),
                            "Participación actualizada.",
                          )
                        }
                      />
                    )
                  );
                })}
              </div>
            </>
          ) : (
            <>
              <p className="delivery-note">
                Revisá la portada, la descripción y el precio sugerido por el
                artista. La aprobación publica la obra con ese precio. Para
                pedir otro precio o ajustar datos, devolvela con una
                observación.
              </p>
              <div className="admin-reviews">
                {(tab === "revision"
                  ? pending
                  : data.works.filter((work) => work.status === "publicada")
                ).map((work) => (
                  <ReviewCard
                    key={`${work.id}-${work.version}`}
                    work={work}
                    artist={data.profiles.find(
                      (profile) => profile.id === work.artist_id,
                    )}
                    canApprove={
                      enabled(
                        data.memberships.find(
                          (item) => item.artist_id === work.artist_id,
                        ),
                      ) &&
                      data.profiles.find(
                        (profile) => profile.id === work.artist_id,
                      )?.is_public
                    }
                    lastReview={data.reviews.find(
                      (review) => review.work_id === work.id,
                    )}
                    busy={busy}
                    onDecision={(decision, note) =>
                      act(
                        () => reviewWork(work, decision, note),
                        decision === "publicada"
                          ? "La obra quedó aprobada y publicada."
                          : "Se enviaron las observaciones al espacio del artista.",
                      )
                    }
                  />
                ))}
              </div>
              {!(
                tab === "revision"
                  ? pending
                  : data.works.filter((work) => work.status === "publicada")
              ).length && (
                <p className="empty-state">No hay obras en esta sección.</p>
              )}
            </>
          )}
          <aside className="membership-banner">
            <strong>Próxima etapa · Planes de publicación</strong>
            <p>
              La galería tendrá modalidades para artistas que quieran publicar
              sus obras. Los precios, beneficios, límites y cobros se definirán
              antes de activarlas.
            </p>
          </aside>
        </>
      )}
    </section>
  );
}

function MembershipCard({ profile, membership, busy, onSave }) {
  const [status, setStatus] = useState(membership.status);
  return (
    <form
      className="account-box creator-form"
      onSubmit={(event) => {
        event.preventDefault();
        onSave(status);
      }}
    >
      <h2>{profile.name}</h2>
      <p>{profile.discipline || "Disciplina pendiente de completar"}</p>
      <small className="user-id">Cuenta {profile.id}</small>
      <p className="delivery-note">
        Perfil{" "}
        {profile.is_public
          ? "marcado como público por el artista"
          : "privado por decisión del artista"}
        .
      </p>
      <label>
        Participación
        <select
          value={status}
          onChange={(event) => setStatus(event.target.value)}
        >
          <option value="pendiente">Pendiente de habilitación</option>
          <option value="habilitada">Habilitada</option>
          <option value="suspendida">Suspendida para publicación</option>
        </select>
      </label>
      <button
        className="button"
        disabled={busy || status === membership.status}
      >
        Guardar participación
      </button>
    </form>
  );
}

function ReviewCard({
  work,
  artist,
  canApprove,
  lastReview,
  busy,
  onDecision,
}) {
  const [error, setError] = useState("");
  function submit(event) {
    event.preventDefault();
    const decision = event.nativeEvent.submitter?.value;
    const note = String(
      new FormData(event.currentTarget).get("note") || "",
    ).trim();
    if (!decision) {
      setError("Elegí Aprobar o Solicitar cambios.");
      return;
    }
    if (decision === "cambios" && !note) {
      setError("Escribí qué necesitás que cambie el artista.");
      return;
    }
    setError("");
    onDecision(decision, note);
  }
  return (
    <article className="admin-review account-box">
      <div className="review-preview">
        {work.image ? (
          <img className="art-image" src={work.image} alt={work.alt} />
        ) : (
          <p className="delivery-note">
            La portada no se pudo abrir. Actualizá el panel antes de decidir.
          </p>
        )}
        {work.audio && (
          <audio
            controls
            preload="none"
            src={work.audio}
            aria-label={`Audio de muestra de ${work.title}`}
          />
        )}
      </div>
      <div>
        <p className="eyebrow">
          {work.status === "revision"
            ? "Pendiente de revisión"
            : "Obra aprobada"}
        </p>
        <h2>{work.title}</h2>
        <p className="artist-credit">
          {artist?.name || "Artista"} · {work.medium}
        </p>
        <p className="review-description">{work.details}</p>
        <p>
          <strong>
            Precio sugerido por el artista {formatPrice(work.price)} ARS
          </strong>
        </p>
        {lastReview?.note && (
          <p className="review-note">
            <strong>Última observación</strong>
            <br />
            {lastReview.note}
          </p>
        )}
        <form className="creator-form" onSubmit={submit}>
          <label>
            Observación para el artista
            <textarea
              name="note"
              maxLength="1500"
              rows="3"
              placeholder="Indicá cambios de presentación, datos o precio cuando haga falta."
            />
          </label>
          <p className="form-error" role="alert">
            {error}
          </p>
          <div className="account-actions">
            {work.status === "revision" && (
              <button
                name="decision"
                value="publicada"
                className="button"
                disabled={busy || !canApprove || !work.image}
              >
                Aprobar y publicar
              </button>
            )}
            <button
              name="decision"
              value="cambios"
              className="small-button"
              disabled={busy}
            >
              {work.status === "publicada"
                ? "Retirar y solicitar cambios"
                : "Solicitar cambios"}
            </button>
          </div>
          {work.status === "revision" && !canApprove && (
            <p className="delivery-note">
              Para aprobar, la participación debe estar habilitada y el perfil
              marcado como público.
            </p>
          )}
        </form>
      </div>
    </article>
  );
}
