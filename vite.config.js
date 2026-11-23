import { defineConfig, loadEnv } from "vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "VITE_");
  const url = env.VITE_SUPABASE_URL?.trim();
  const key = env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim();
  const captchaOrigin = env.VITE_TURNSTILE_SITE_KEY?.trim() ? "https://challenges.cloudflare.com" : "";
  let supabaseOrigin = "";

  if (url || key) {
    if (
      !url ||
      !key ||
      url.includes("TU-PROYECTO") ||
      key.includes("TU-CLAVE")
    ) {
      throw new Error(
        "Completá VITE_SUPABASE_URL y VITE_SUPABASE_PUBLISHABLE_KEY con los datos de tu proyecto.",
      );
    }
    let parsed;
    try {
      parsed = new URL(url);
    } catch {
      throw new Error("La URL de Supabase no es válida.");
    }
    if (
      parsed.protocol !== "https:" ||
      parsed.username ||
      parsed.password ||
      parsed.pathname !== "/" ||
      parsed.search ||
      parsed.hash
    ) {
      throw new Error(
        "Usá la URL HTTPS raíz de tu proyecto Supabase, sin credenciales ni rutas adicionales.",
      );
    }
    supabaseOrigin = parsed.origin;

    // Solo la clave publicable puede formar parte del código del navegador.
    let publicKey = key.startsWith("sb_publishable_");
    if (key.startsWith("eyJ")) {
      try {
        const claims = JSON.parse(
          Buffer.from(key.split(".")[1], "base64url").toString("utf8"),
        );
        publicKey = claims.role === "anon";
      } catch {
        publicKey = false;
      }
    }
    if (!publicKey) {
      throw new Error(
        "La clave debe ser Publishable o anon. Nunca uses Secret ni service_role en una variable VITE_.",
      );
    }
  }

  const websocketOrigin = supabaseOrigin.replace("https:", "wss:");
  const csp = [
    "default-src 'self'",
    `script-src 'self' ${captchaOrigin}`,
    `frame-src ${captchaOrigin || "'none'"}`,
    "style-src 'self' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    `img-src 'self' data: blob: ${supabaseOrigin}`,
    `media-src 'self' blob: ${supabaseOrigin}`,
    `connect-src 'self' ${supabaseOrigin} ${websocketOrigin} ${captchaOrigin}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "upgrade-insecure-requests",
  ]
    .map((directive) => directive.trim())
    .join("; ");

  return {
    plugins: [
      {
        name: "gallery-security-headers",
        generateBundle() {
          const securityHeaders = {
            "Content-Security-Policy": csp,
            "X-Content-Type-Options": "nosniff",
            "X-Frame-Options": "DENY",
            "Referrer-Policy": "strict-origin-when-cross-origin",
            "Permissions-Policy":
              "camera=(), microphone=(), geolocation=(), payment=()",
            "Strict-Transport-Security": "max-age=31536000",
            "Cross-Origin-Opener-Policy": "same-origin",
          };
          const entries = Object.entries(securityHeaders);
          this.emitFile({
            type: "asset",
            fileName: "_headers",
            source: [
              "/*",
              ...entries.map(([name, value]) => `  ${name}: ${value}`),
              "",
            ].join("\n"),
          });
          // Variante para hosting Apache de DonWeb. Las rutas de la app usan hash.
          this.emitFile({
            type: "asset",
            fileName: ".htaccess",
            source: [
              "# Galería colectiva. Generado durante npm run build.",
              "# Comprobar mod_headers y la autorización de .htaccess en el hosting.",
              "<IfModule mod_headers.c>",
              ...entries.map(
                ([name, value]) => `  Header always set ${name} "${value}"`,
              ),
              "</IfModule>",
              "",
            ].join("\n"),
          });
        },
      },
    ],
  };
});
