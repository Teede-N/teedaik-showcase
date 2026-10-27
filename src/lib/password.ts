/* Extrait simplifié de Teedaïk — hachage des mots de passe.
   Argon2id (recommandé par l'OWASP) + migration transparente des anciens hachages bcrypt.
   Version publique : l'accès à la base est abstrait (aucun nom de table ni de colonne). */
import { hash, verify } from "@node-rs/argon2";
import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";

/* Argon2id aux paramètres recommandés par l'OWASP — valeurs par défaut de la bibliothèque. */
export function hashPassword(password: string): Promise<string> {
  return hash(password);
}

/* Hachage d'un secret aléatoire, généré au démarrage puis jeté :
   sert à égaliser le temps de réponse quand le compte n'existe pas. */
const dummyHash = hash(randomBytes(32).toString("hex"));

export interface PasswordCheck {
  ok: boolean;
  rehash: boolean;
}

export async function checkPassword(password: string, stored: string | null | undefined): Promise<PasswordCheck> {
  if (!stored) {
    await verify(await dummyHash, password).catch(() => false);
    return { ok: false, rehash: false };
  }
  if (stored.startsWith("$argon2")) {
    const ok = await verify(stored, password).catch(() => false);
    return { ok, rehash: false };
  }
  const ok = await bcrypt.compare(password, stored);
  return { ok, rehash: ok };
}

/* Vérifie le mot de passe et, si un ancien hachage bcrypt est encore utilisé, le remplace par Argon2id.
   `saveHash` est fourni par la couche d'accès aux données (privée). */
export async function verifyAndUpgrade(
  password: string,
  stored: string,
  saveHash: (newHash: string) => Promise<void>,
): Promise<boolean> {
  const { ok, rehash } = await checkPassword(password, stored);
  if (ok && rehash) await saveHash(await hashPassword(password));
  return ok;
}
