import React, { useState } from "react";
import { estimatePrice } from "./pricing";
import { formatPrice } from "./data";

export default function PriceEstimator({ currentPrice, onApply }) {
  const [values, setValues] = useState({
    materials: "",
    hours: "",
    hourlyRate: "",
    otherCosts: "",
    copies: "1",
    markup: "",
  });
  let result;
  let error = "";
  try {
    result = estimatePrice(
      Object.fromEntries(
        Object.entries(values).map(([key, value]) => [key, Number(value)]),
      ),
    );
  } catch (failure) {
    error = failure.message;
  }
  const fields = [
    ["materials", "Materiales y producción · ARS", "0.01"],
    ["hours", "Horas dedicadas", "0.25"],
    ["hourlyRate", "Valor de tu hora · ARS", "0.01"],
    ["otherCosts", "Otros costos · ARS", "0.01"],
    ["copies", "Ejemplares o ventas previstos", "1"],
    ["markup", "Recargo sobre costos · %", "1"],
  ];
  return (
    <details className="price-estimator">
      <summary>Orientarme para definir el precio</summary>
      <p>
        Calculá una referencia a partir de tus costos y dedicación. Para una
        pieza única, usá un ejemplar. Para ediciones o archivos digitales, podés
        distribuir los costos entre una cantidad de ventas previstas.
      </p>
      <div className="form-row">
        {fields.map(([key, label, step]) => (
          <label key={key}>
            {label}
            <input
              type="number"
              min={key === "copies" ? "1" : "0"}
              max={
                key === "copies"
                  ? "10000"
                  : key === "markup"
                    ? "500"
                    : undefined
              }
              step={step}
              value={values[key]}
              onChange={(event) =>
                setValues((current) => ({
                  ...current,
                  [key]: event.target.value,
                }))
              }
            />
          </label>
        ))}
      </div>
      {result ? (
        <div className="price-reference" aria-live="polite">
          <p>
            Costo total declarado{" "}
            <strong>{formatPrice(result.totalCost)} ARS</strong>
          </p>
          <p>
            Referencia por ejemplar{" "}
            <strong>{formatPrice(result.reference)} ARS</strong>
          </p>
          {Number(currentPrice) > 0 && (
            <p>
              Tu precio sugerido actual{" "}
              <strong>{formatPrice(Number(currentPrice))} ARS</strong>
            </p>
          )}
          <button
            type="button"
            className="small-button"
            onClick={() => onApply(result.reference)}
          >
            Usar esta referencia como precio sugerido
          </button>
        </div>
      ) : (
        <p className="delivery-note" aria-live="polite">
          {error}
        </p>
      )}
      <p className="delivery-note">
        La estimación usa los datos que completes y no incorpora comparables de
        mercado. Las ventas previstas son una hipótesis de cálculo. Podés
        ajustar el precio sugerido antes de enviar la obra a revisión.
      </p>
      <small>
        Al guardar la obra se conserva el precio elegido. Los datos de esta
        calculadora se usan durante la edición.
      </small>
    </details>
  );
}
