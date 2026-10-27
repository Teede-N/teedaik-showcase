/* Extrait simplifié de Teedaïk — cookie de session.
   Le jeton est aléatoire, conservé côté serveur (donc révocable à tout moment),
   et transmis dans un cookie httpOnly + secure + sameSite.
   Version publique : le stockage, le nom réel du cookie et la durée de vie ne sont pas publiés. */
import { cookies } from "next/headers";
import { randomBytes } from "node:crypto";

export interface SessionStore {
  save(token: string, userId: string, expires: Date): Promise<void>;
  revoke(token: string): Promise<void>;
}

const COOKIE = process.env.SESSION_COOKIE_NAME!;
const LIFETIME_MS = Number(process.env.SESSION_LIFETIME_MS);

export async function openSession(store: SessionStore, userId: string) {
  const token = randomBytes(32).toString("base64url"); // imprévisible, jamais dérivé de l'identité du membre
  const expires = new Date(Date.now() + LIFETIME_MS);
  await store.save(token, userId, expires);
  (await cookies()).set(COOKIE, token, {
    httpOnly: true, // illisible par JavaScript : limite l'impact d'une faille XSS
    secure: true, // envoyé uniquement en HTTPS
    sameSite: "lax", // protège contre la plupart des attaques CSRF
    path: "/",
    expires,
  });
}

export async function closeSession(store: SessionStore) {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token) await store.revoke(token).catch(() => undefined);
  jar.delete(COOKIE);
}
