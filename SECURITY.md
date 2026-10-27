# Sécurité de Teedaïk

Ce document explique **comment la sécurité est pensée** dans Teedaïk et **pourquoi** chaque choix a été fait.

> 🔒 **Confidentialité.** Ce dépôt est une vitrine. Les extraits de code sont **simplifiés** : les seuils, les règles de détection, les noms de tables, la configuration et la logique d'administration réels **ne sont pas publiés**. Publier ces détails aiderait un attaquant à les contourner.
>
> Pour signaler une faille : **contact.teedaik@gmail.com**. Merci de ne pas la publier avant correction.

---

## 1. Mots de passe — [`src/lib/password.ts`](src/lib/password.ts)

| Mesure | Pourquoi |
|---|---|
| **Argon2id**, aux paramètres recommandés par l'OWASP | Algorithme recommandé aujourd'hui : coûteux en mémoire, donc résistant aux attaques par GPU. |
| **Migration transparente bcrypt → Argon2id** | Les anciens hachages sont remplacés à la connexion suivante, sans action du membre. |
| **Temps de réponse égalisé** quand le compte n'existe pas | On ne peut pas deviner quels emails sont inscrits en mesurant le temps de réponse. |
| Mots de passe **jamais** stockés ni journalisés en clair | Moindre exposition. |

## 2. Sessions — [`src/lib/session.ts`](src/lib/session.ts)

- Jeton de session **aléatoire**, conservé côté serveur : il est **révocable** à tout moment.
- Cookie **`httpOnly`** (illisible par JavaScript), **`secure`** (HTTPS uniquement) et **`sameSite`** (protection CSRF).
- Le membre voit ses sessions actives et peut **déconnecter ses autres appareils**.
- Un compte suspendu perd l'accès immédiatement.
- Les connexions sont inscrites dans un **journal de sécurité** visible par le membre.

## 3. Double authentification (2FA) — [`src/lib/totp.ts`](src/lib/totp.ts)

- **TOTP (RFC 6238)**, compatible Google Authenticator, Authy et Microsoft Authenticator.
- Implémentation **sans dépendance externe** (`node:crypto`) : moins de risques côté chaîne d'approvisionnement.
- Comparaison à **temps constant** (`timingSafeEqual`).
- Quand la 2FA est active, le mot de passe seul ne suffit pas, et le défi est lui aussi limité en nombre d'essais.

## 4. Anti force brute — [`src/app/api/auth/login/route.ts`](src/app/api/auth/login/route.ts)

- Les échecs de connexion sont limités **par compte et par adresse**, sur une fenêtre de temps glissante.
- Les inscriptions sont limitées par adresse.
- Le message d'erreur est **toujours identique**, que l'email existe ou non.
- Les contrôles sont faits **du moins coûteux au plus coûteux** : une adresse bloquée n'atteint jamais la vérification du mot de passe.

## 5. Limitation de débit sur toutes les actions — [`src/lib/rate-limit.ts`](src/lib/rate-limit.ts)

- Un **compteur atomique en SQL** fonctionne entre **toutes les instances serverless**, sans service supplémentaire.
- Chaque action d'écriture a sa propre limite : large pour un humain, bloquante pour un script.
- Réponse **HTTP 429** standard, avec l'en-tête `Retry-After`.

## 6. Bouclier anti-intrusion — [`src/lib/shield-inspect.ts`](src/lib/shield-inspect.ts)

Le bouclier agit **avant** que la requête n'atteigne une page. Il repère notamment :

- les **outils d'attaque automatisés** ;
- la **recherche de fichiers sensibles** et de pages d'administration ;
- le **path traversal** ;
- les tentatives d'**injection** (SQL, XSS, commandes) ;
- la **force brute** et le **credential stuffing**.

Chaque détection ajoute des points à l'adresse ; au-delà d'un seuil, elle est **bloquée temporairement**, et la durée augmente en cas de récidive. Les journaux sont purgés automatiquement.

## 7. Protection anti-fraude sur les actions sensibles

- Les actions à risque (inscription, paiements, demandes d'entreprises) bénéficient d'une **vérification supplémentaire de l'adresse** (VPN, proxy, Tor).
- La navigation normale n'est **pas** concernée : on ne pénalise pas les visiteurs honnêtes.
- Les adresses IP ne sont **jamais conservées en clair** pour cette vérification.

## 8. En-têtes HTTP de sécurité — [`next.config.ts`](next.config.ts)

| En-tête | Rôle |
|---|---|
| `Strict-Transport-Security` | Force le HTTPS |
| `Content-Security-Policy` | Restreint les sources autorisées et interdit l'intégration dans un site tiers |
| `X-Frame-Options: SAMEORIGIN` | Anti-clickjacking |
| `X-Content-Type-Options: nosniff` | Empêche l'interprétation d'un fichier dans un autre type |
| `Referrer-Policy` | Limite les informations transmises aux autres sites |
| `Permissions-Policy` | Caméra, micro et géolocalisation réservés au site, pistage publicitaire désactivé |

## 9. Base de données et secrets

- **Requêtes paramétrées** partout : les valeurs ne sont jamais concaténées dans le SQL (protection contre l'injection).
- **Secrets uniquement dans les variables d'environnement de l'hébergeur**, jamais dans le code ni dans Git.
- **Validation des entrées côté serveur** sur chaque route.

## 10. Vie privée et RGPD

- **Journal des consentements**, avec la version de la politique acceptée.
- **Export des données** (droits d'accès et de portabilité, art. 15 et 20), sans aucun secret.
- **Effacement complet du compte** (art. 17), fichiers compris.
- **Protection des mineurs** : âge minimum et accord parental selon l'âge.
- **Purge automatique** selon les durées de conservation.

## 11. Modération et contrôle humain

- Les **chaînes** et **entreprises** qui veulent publier sont **validées manuellement**.
- Chaque membre peut **bloquer** un autre membre et choisir qui peut lui écrire.

---

## 🔭 Démarche

La sécurité est un travail continu : revue régulière du code, mise à jour des dépendances et amélioration des protections au fil de la croissance de la plateforme.
