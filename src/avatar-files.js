export function validateAvatarFile(file) {
  if (!file?.size) throw new Error("Elegí una imagen que no esté vacía.");
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type))
    throw new Error("Elegí una foto JPG, PNG o WebP.");
  if (file.size > 2 * 1024 * 1024)
    throw new Error("La foto supera los 2 MB. Elegí una imagen más liviana.");
}
