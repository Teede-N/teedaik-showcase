/* Extrait simplifié de Teedaïk — limitation de débit partagée entre instances serverless.
   Principe : un compteur atomique en SQL (INSERT … ON CONFLICT … RETURNING), sans Redis ni service externe.
   Version publique : les noms de tables et les limites réelles ne sont pas publiés.
   Les valeurs ci-dessous sont des exemples. */

type Sql = (strings: TemplateStringsArray, ...values: unknown[]) => Promise<{ n: number }[]>;

/* true = autorisé ; false = trop d'actions dans la fenêtre de temps. */
export async function allowAction(sql: Sql, key: string, limit: number, windowSec: number): Promise<boolean> {
  const win = Math.floor(Date.now() / 1000 / windowSec);
  const [row] = await sql`
    INSERT INTO counters (k, win, n) VALUES (${key}, ${win}, 1)
    ON CONFLICT (k, win) DO UPDATE SET n = counters.n + 1
    RETURNING n`;
  return (row?.n ?? 0) <= limit;
}

/* Exemple de réglage par action : [nombre maximal, fenêtre en secondes] — valeurs fictives. */
export const EXAMPLE_LIMITS = {
  comment: [10, 60],
  message: [30, 60],
  upload: [20, 600],
} as const;

/* Usage dans une route : juste après la vérification de la session.
   if (!(await allowAction(sql, `comment:${userId}`, ...EXAMPLE_LIMITS.comment))) → réponse HTTP 429 + Retry-After */
