// Referencia de costos declarados por el artista. No estima demanda ni ventas.
export function estimatePrice({
  materials,
  hours,
  hourlyRate,
  otherCosts,
  copies,
  markup,
}) {
  const values = [materials, hours, hourlyRate, otherCosts, copies, markup];
  if (values.some((value) => !Number.isFinite(value) || value < 0)) {
    throw new Error("Completá los importes y las horas con números válidos.");
  }
  if (
    !Number.isInteger(copies) ||
    copies < 1 ||
    copies > 10000 ||
    markup > 500
  ) {
    throw new Error(
      "Usá entre 1 y 10.000 ejemplares y un recargo de hasta 500 %.",
    );
  }
  const totalCost = materials + hours * hourlyRate + otherCosts;
  if (totalCost <= 0)
    throw new Error(
      "Completá al menos un costo o las horas y el valor de tu trabajo.",
    );
  const unitCost = totalCost / copies;
  const reference = Math.round(unitCost * (1 + markup / 100) * 100) / 100;
  if (
    !Number.isFinite(reference) ||
    reference < 0.01 ||
    reference > 999999999
  ) {
    throw new Error(
      "Revisá los valores. El precio de referencia quedó fuera del rango admitido.",
    );
  }
  return { totalCost, unitCost, reference };
}
