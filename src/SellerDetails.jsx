import React, { useEffect, useState } from "react";
import { loadAccountDetails, saveAccountDetails, friendlyError } from "./backend";
import { ageOn, todayInput, validateBirthDate } from "./account-details";

export default function SellerDetails({ userId }) {
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [physical, setPhysical] = useState(false);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let active = true;
    setLoading(true);
    loadAccountDetails(userId).then(data => {
      if (!active) return;
      setDetails(data || { user_id: userId });
      setBirthDate(data?.birth_date || "");
      setPhysical(Boolean(data?.physical_works));
      setError("");
    }).catch(() => {
      if (active) setError("Todavía no pudimos cargar tu ficha privada. Podés seguir usando el resto del panel.");
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [userId, revision]);

  async function save(event) {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    setBusy(true); setError(""); setMessage("");
    try {
      validateBirthDate(birthDate);
      const fields = Object.fromEntries(["full_name", "phone", "country", "region", "city", "postal_code", "address_line1", "address_line2"].map(key => [key, String(values.get(key) || "").trim()]));
      if (!fields.full_name || !fields.phone || !fields.country || !fields.city) throw new Error("Completá nombre, teléfono, país y localidad.");
      if (physical && (!fields.region || !fields.address_line1 || !fields.postal_code)) throw new Error("Para obras físicas, completá provincia, dirección y código postal.");
      const updated = await saveAccountDetails(userId, details, { ...fields, birth_date: birthDate, physical_works: physical });
      setDetails(updated);
      setMessage("Tus datos privados quedaron guardados.");
    } catch (failure) { setError(friendlyError(failure)); }
    finally { setBusy(false); }
  }
  const age = ageOn(birthDate);
  return (
    <details className="seller-details account-box">
      <summary><span>Datos personales y de venta</span><small>Privados · completá tu ficha</small></summary>
      <p className="auth-private">Tu nombre completo, fecha de nacimiento, teléfono y dirección no se muestran en tu sala pública. Son datos declarados por vos; guardarlos no habilita todavía cobros ni verifica tu identidad.</p>
      {loading ? <p role="status">Cargando tu ficha…</p> : !details ? (
        <div><p role="alert">{error}</p><button className="small-button" onClick={() => setRevision(value => value + 1)}>Reintentar</button></div>
      ) : (
        <form className="creator-form" onSubmit={save} key={details.version || "new"}>
          <fieldset className="auth-fields" disabled={busy}>
            <legend className="sr-only">Tu ficha privada</legend>
            <div className="form-row">
              <label>Nombre y apellido<input name="full_name" autoComplete="name" maxLength="150" defaultValue={details.full_name} required /></label>
              <label>Fecha de nacimiento<input name="birth_date" type="date" autoComplete="bday" min="1900-01-01" max={todayInput()} value={birthDate} onChange={event => setBirthDate(event.target.value)} required />{age !== null && <small>Edad actual: {age} años</small>}</label>
            </div>
            <div className="form-row">
              <label>Teléfono de contacto<input name="phone" type="tel" autoComplete="tel" maxLength="30" defaultValue={details.phone} required /></label>
              <label>País<input name="country" autoComplete="country-name" maxLength="80" defaultValue={details.country || "Argentina"} required /></label>
            </div>
            <div className="form-row">
              <label>Provincia o región<input name="region" autoComplete="address-level1" maxLength="100" defaultValue={details.region} required={physical} /></label>
              <label>Localidad<input name="city" autoComplete="address-level2" maxLength="100" defaultValue={details.city} required /></label>
            </div>
            <label className="checkbox-label"><input type="checkbox" checked={physical} onChange={event => setPhysical(event.target.checked)} /> Quiero ofrecer obras físicas</label>
            <label>Dirección de origen<input name="address_line1" autoComplete="address-line1" maxLength="180" defaultValue={details.address_line1} required={physical} /><small>{physical ? "Necesaria para preparar la coordinación de envíos." : "Opcional si solo ofrecés obras digitales o composiciones."}</small></label>
            <div className="form-row">
              <label>Piso, departamento o referencia<input name="address_line2" autoComplete="address-line2" maxLength="180" defaultValue={details.address_line2} /></label>
              <label>Código postal<input name="postal_code" autoComplete="postal-code" maxLength="20" defaultValue={details.postal_code} required={physical} /></label>
            </div>
          </fieldset>
          {error && <p className="form-error" role="alert">{error}</p>}
          <p role="status">{message}</p>
          <button className="button" disabled={busy}>{busy ? "Guardando…" : "Guardar datos privados"}</button>
        </form>
      )}
    </details>
  );
}
