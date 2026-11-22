import React, { useState } from "react";
import { backend, authRedirect, friendlyError } from "./backend";

export const accessRoutes = {
  "/ingresar": "login",
  "/registro": "signup",
  "/recuperar": "reset",
  "/reenviar-confirmacion": "resend",
};

const copy = {
  login: ["Qué bueno verte de nuevo.", "Ingresá para continuar con tu espacio.", "Ingresar"],
  signup: ["Creá tu cuenta.", "Empezá a preparar tu sala en la galería.", "Crear cuenta"],
  reset: ["Recuperá tu acceso.", "Te enviaremos un enlace para elegir una nueva contraseña.", "Enviar enlace"],
  resend: ["Confirmá tu correo.", "Pedí un nuevo enlace de confirmación para tu cuenta.", "Reenviar confirmación"],
  password: ["Elegí una nueva contraseña.", "Usá una contraseña propia para esta cuenta.", "Guardar contraseña"],
};

export default function AccessForm({ mode = "login", onPasswordSaved }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [visible, setVisible] = useState(false);
  const [needsConfirmation, setNeedsConfirmation] = useState(false);
  const [title, description, action] = copy[mode];
  const hasPassword = ["login", "signup", "password"].includes(mode);
  const newPassword = ["signup", "password"].includes(mode);
  const unavailable = !backend;

  async function submit(event) {
    event.preventDefault();
    if (busy || unavailable) return;
    const form = event.currentTarget;
    const values = new FormData(form);
    const email = String(values.get("email") || "").trim();
    const password = String(values.get("password") || "");
    setBusy(true);
    setError("");
    setMessage("");
    setNeedsConfirmation(false);
    try {
      let result;
      if (newPassword && password !== values.get("confirmation"))
        throw new Error("Las contraseñas no coinciden.");
      if (mode === "signup") {
        const name = String(values.get("name") || "").trim();
        if (!name) throw new Error("Completá tu nombre artístico.");
        result = await backend.auth.signUp({
          email,
          password,
          options: { data: { name }, emailRedirectTo: authRedirect() },
        });
        if (result.error) throw result.error;
        if (result.data.session) location.hash = "/mi-espacio";
        else setMessage("Si el registro se puede completar, recibirás un correo para confirmar tu cuenta. Revisá también spam.");
      } else if (mode === "reset") {
        result = await backend.auth.resetPasswordForEmail(email, { redirectTo: authRedirect() });
        if (result.error) throw result.error;
        setMessage("Si hay una cuenta asociada, recibirás un enlace para cambiar tu contraseña. Revisá también spam.");
      } else if (mode === "resend") {
        result = await backend.auth.resend({ type: "signup", email, options: { emailRedirectTo: authRedirect() } });
        if (result.error) throw result.error;
        setMessage("Si la cuenta necesita confirmación, recibirás un nuevo enlace por correo.");
      } else if (mode === "password") {
        result = await backend.auth.updateUser({ password });
        if (result.error) throw result.error;
        onPasswordSaved?.();
        location.hash = "/mi-espacio";
      } else {
        result = await backend.auth.signInWithPassword({ email, password });
        if (result.error) throw result.error;
        location.hash = "/mi-espacio";
      }
      form.reset();
      setVisible(false);
    } catch (failure) {
      setError(friendlyError(failure));
      setNeedsConfirmation(failure?.code === "email_not_confirmed" || failure?.message === "Email not confirmed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="account-box access-card">
      {mode !== "password" && (
        <nav className="auth-tabs" aria-label="Acceso a tu cuenta">
          <a href="#/ingresar" aria-current={mode === "login" ? "page" : undefined}>Ingresar</a>
          <a href="#/registro" aria-current={mode === "signup" ? "page" : undefined}>Crear cuenta</a>
        </nav>
      )}
      <h2 id="access-title">{title}</h2>
      <p className="auth-description">{description}</p>
      {unavailable && (
        <div className="auth-unavailable" role="status" id="access-unavailable">
          <strong>Estamos habilitando el acceso.</strong>
          <p>El registro y el ingreso estarán disponibles cuando termine la conexión. Mientras tanto, podés recorrer las obras.</p>
          {import.meta.env.DEV && (
            <details className="auth-dev-help">
              <summary>Configurar conexión en desarrollo</summary>
              <p>Completá VITE_SUPABASE_URL y VITE_SUPABASE_PUBLISHABLE_KEY en .env.local, junto a package.json, y reiniciá Vite. Usá la clave Publishable. Para Netlify, cargá esas variables en la configuración del sitio y volvé a compilar.</p>
            </details>
          )}
        </div>
      )}
      <form className="creator-form" aria-labelledby="access-title" aria-busy={busy} aria-describedby={unavailable ? "access-unavailable" : undefined} onSubmit={submit}>
        <fieldset className="auth-fields" disabled={busy || unavailable}>
          <legend className="sr-only">Datos de acceso</legend>
          {mode === "signup" && (
            <label>Nombre artístico<input name="name" autoComplete="nickname" required maxLength="100" placeholder="Cómo querés presentarte" /></label>
          )}
          {mode !== "password" && (
            <label>Correo electrónico<input name="email" type="email" autoComplete="email" autoCapitalize="none" spellCheck={false} required maxLength="254" placeholder="tu@email.com" /></label>
          )}
          {hasPassword && (
            <div className="auth-password">
              <label htmlFor="account-password">Contraseña</label>
              <span className="password-control">
                <input id="account-password" name="password" type={visible ? "text" : "password"} autoComplete={newPassword ? "new-password" : "current-password"} required minLength={newPassword ? 10 : 1} maxLength="128" aria-describedby={newPassword ? "password-help" : undefined} />
                <button type="button" aria-pressed={visible} aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"} onClick={() => setVisible(!visible)}>{visible ? "Ocultar" : "Mostrar"}</button>
              </span>
              {newPassword && <small id="password-help">Usá al menos 10 caracteres.</small>}
            </div>
          )}
          {newPassword && (
            <label>Repetí la contraseña<input name="confirmation" type={visible ? "text" : "password"} autoComplete="new-password" required minLength="10" maxLength="128" /></label>
          )}
        </fieldset>
        {mode === "signup" && <p className="auth-private">Crear una cuenta te permite preparar tu perfil. La administración habilita tu participación y revisa las obras antes de publicarlas.</p>}
        {error && <p className="form-error" role="alert">{error}</p>}
        {needsConfirmation && <a className="text-link" href="#/reenviar-confirmacion">Pedir un nuevo correo de confirmación</a>}
        <p className="auth-message" role="status">{message}</p>
        <button className="button auth-submit" disabled={busy || unavailable}>{busy ? "Procesando…" : action}</button>
      </form>
      {mode !== "password" && (
        <div className="account-actions auth-links">
          {mode === "login" ? <a href="#/recuperar">Olvidé mi contraseña</a> : <a href="#/ingresar">Volver a ingresar</a>}
          {mode !== "resend" && <a href="#/reenviar-confirmacion">No recibí la confirmación</a>}
        </div>
      )}
    </div>
  );
}
