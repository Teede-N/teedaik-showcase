/* Extrait simplifié de Teedaïk — principe du bouclier anti-intrusion.
   Exécuté avant toute page : chaque requête suspecte ajoute des points à son adresse ;
   au-delà d'un seuil, l'adresse est bloquée temporairement, avec une durée qui augmente en cas de récidive.

   Version publique et pédagogique : seules quelques signatures très connues sont montrées.
   Les règles de détection réelles, les scores, les seuils et les durées de blocage restent privés. */

export type Category = "scanner" | "probe" | "traversal" | "injection";
export type Hit = { category: Category; weight: "low" | "high" };

/* Quelques exemples de signatures publiques (listes volontairement incomplètes). */
const RULES: { category: Category; weight: Hit["weight"]; test: (path: string, query: string, ua: string) => boolean }[] = [
  { category: "scanner", weight: "high", test: (_p, _q, ua) => /(sqlmap|nikto)/i.test(ua) },
  { category: "probe", weight: "low", test: (p) => /\/\.(env|git)(\/|$)|\/wp-admin/i.test(p) },
  { category: "traversal", weight: "high", test: (p, q) => /\.\.\//.test(p + q) },
  { category: "injection", weight: "low", test: (_p, q) => /union\s+select|<script/i.test(q) },
];

function safeDecode(s: string) {
  try {
    return decodeURIComponent(s);
  } catch {
    return s; // une URL mal encodée est analysée telle quelle
  }
}

/* Renvoie la première règle déclenchée, ou null. Le cumul des points et le blocage sont gérés ailleurs (privé). */
export function inspect(pathname: string, search: string, userAgent: string): Hit | null {
  const path = safeDecode(pathname);
  const query = safeDecode(search.replace(/\+/g, " "));
  for (const r of RULES) if (r.test(path, query, userAgent || "")) return { category: r.category, weight: r.weight };
  return null;
}
