/* Extrait simplifié de Teedaïk — logique de la route de connexion.
   L'important est l'ORDRE des contrôles, du moins coûteux au plus coûteux :
   entrée valide → adresse non bloquée → anti force brute → mot de passe → 2FA → session.
   Version publique : les modules internes, la base de données et les seuils sont abstraits. */
import { NextResponse } from "next/server";
import { security, accounts, twoFactor, sessions } from "@/lib/private"; // couche privée, non publiée

const deny = (status: number) =>
  NextResponse.json({ error: status === 401 ? "invalid_credentials" : "refused" }, { status });

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body?.password === "string" ? body.password : "";
  if (!email || !password) return NextResponse.json({ error: "invalid_input" }, { status: 400 });

  /* 1. Adresse déjà bloquée par le bouclier : aucun essai de mot de passe n'est tenté. */
  if (await security.isBlocked(req)) return deny(403);

  /* 2. Anti force brute : trop d'échecs récents (par compte et par adresse) → refus temporaire. */
  if (await security.tooManyFailures(req, email)) return deny(429);

  /* 3. Vérification du mot de passe. Si le compte n'existe pas, on vérifie quand même un hachage factice :
        le temps de réponse est identique et le message aussi, on ne révèle donc pas quels emails sont inscrits. */
  const account = await accounts.findByEmail(email);
  const ok = await accounts.checkPassword(account, password);
  await security.recordAttempt(req, email, ok);
  if (!account || !ok) return deny(401);
  if (account.suspended) return deny(403);

  /* 4. Double authentification : le mot de passe seul ne suffit pas. */
  if (account.twoFactorEnabled) {
    const challenge = await twoFactor.createChallenge(account.id);
    return NextResponse.json({ ok: true, twoFactorRequired: true, challenge });
  }

  /* 5. Session : jeton aléatoire côté serveur, cookie httpOnly / secure / sameSite. */
  await sessions.open(account.id);
  return NextResponse.json({ ok: true });
}
