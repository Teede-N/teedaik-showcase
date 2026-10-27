/* Extrait réel de Teedaïk — en-têtes HTTP de sécurité appliqués à toutes les pages.
   HTTPS forcé, pas d'intégration du site dans un cadre étranger (anti-clickjacking), pas de devinette de type
   de fichier, adresse de provenance réduite hors du site, caméra / micro / géolocalisation réservés à Teedaïk
   (appels, lives, partage de position toujours à la demande du membre), pistage publicitaire coupé. */
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(self), microphone=(self), display-capture=(self), geolocation=(self), browsing-topics=(), interest-cohort=()" },
          { key: "Content-Security-Policy", value: "object-src 'none'; base-uri 'self'; frame-ancestors 'self'; upgrade-insecure-requests" },
          { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
        ],
      },
    ];
  },
};

export default nextConfig;
