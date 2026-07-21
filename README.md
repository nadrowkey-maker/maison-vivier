# MAISON VIVIER — site de démonstration

> **Site de démonstration — agence & projets fictifs.**
> MAISON VIVIER, Alma Vivier, les cinq projets et les titres de presse sont inventés.
> Les images et vidéos proviennent de [Pexels](https://www.pexels.com) et de [Pixabay](https://pixabay.com) (licences gratuites, usage commercial autorisé, sans attribution requise).

Site vitrine d'une agence fictive de design d'intérieur semi-luxe / luxe fondée à Paris.
Le principe directeur : **le scroll est une promenade chromatique** — on traverse le site
comme on traverse les pièces d'une maison, chaque scène ayant sa couleur dominante
(crème, prune, safran, terracotta, émeraude).

## Les scènes

1. **Préchargement** — compteur sur le chargement de la séquence du hero, révélation du nom lettre à lettre, rideau.
2. **Hero** — travelling dans un couloir d'hôtel particulier, **piloté par le scroll avec inertie** (séquence de 150 images JPEG dessinées dans un canvas — jamais d'arrêt sec). Fragments de phrases calés sur la progression.
3. **La bienvenue** — la transition signature : au cœur du travelling qui continue de tourner, la lumière baisse doucement et un grand titre s'allume au centre — « Bienvenue · **La Maison vous ouvre *ses portes.*** » (l'italique dorée est balayée d'une brillance lente) ; puis le couloir se dissout en fondu enchaîné vers la promenade suivante.
4. **Le manifeste** — trois phrases une à une, posées sur une **promenade scrubée à travers trois pièces réellement distinctes** (montage de trois vidéos : salon céladon, bibliothèque ancienne turquoise, séjour au couchant), chaque phrase à un endroit différent de l'écran ; la dernière grossit jusqu'à ce qu'on passe entre ses lettres et révèle la pièce suivante (même section sticky, pour une couture invisible).
5. **Les matières** — trois mots plein écran (**le pigment**, **la lumière**, **le velours**), chacun sur sa propre séquence vidéo **scrubée au scroll** (encre colorée, voilage ensoleillé, soie émeraude). Le texte est en `mix-blend-mode: difference` : sa couleur est l'**inverse exact du fond** — au fil du scroll, la vidéo avance et la couleur du mot se recompose image par image.
6. **La fondatrice** — portrait éditorial d'Alma sur fond safran, parallaxe lente, nom en display géant.
7. **Les projets** — cinq grands titres ; au survol, image flottante qui suit le curseur (retard élastique, parallaxe interne à contre-sens) ; au clic, fiche plein écran (fermeture : bouton ou Échap, scroll bloqué).
8. **La galerie des matières** — section épinglée à défilement horizontal, dix matières légendées.
9. **Le studio + presse** — rue de Turenne, revues fictives.
10. **Le rideau** — tout le site se lève et découvre le footer émeraude qui attendait dessous.

## Stack

- **HTML / CSS / JS vanilla** — aucun framework, aucun build.
- **GSAP 3.13 + ScrollTrigger + CustomEase + SplitText** (en local dans `lib/`) — toute la narration au scroll, révélations de texte par lignes masquées.
- **Lenis 1.1.18** (en local) — smooth scroll.
- **Fraunces + Inter** via Google Fonts (CDN).
- Les « vidéos » scrubées sont des **séquences d'images JPEG** (hero et promenade en 150 frames, matières en 90–110 frames, extraites avec ffmpeg) dessinées dans un `<canvas>` en cover manuel, `devicePixelRatio` plafonné à 1,5, redraw uniquement quand l'index change. Le scroll fixe une cible, la frame affichée la rattrape (`current += (target - current) × 0.075`).
- **Les matières en inversion temps réel** : chaque mot (le pigment / la lumière / le velours) est en `mix-blend-mode: difference` (blanc) au-dessus de SA séquence scrubée, dans un conteneur `isolation: isolate` — sa couleur devient l'inverse exact du fond, image par image, au fil du scroll.
- Micro-effets inspirés du catalogue [21st.dev](https://21st.dev) réécrits en vanilla : brillance or balayée (`background-clip: text`), lignes de texte qui montent sous masque (SplitText), images éditoriales révélées en rideau (`clip-path`).
- Sections épinglées en `position: sticky`, timelines scrubées en fractions de progression.
- Curseur personnalisé (lerp 0,22, `mix-blend-mode: difference`, état « Voir »), désactivé au tactile.
- `prefers-reduced-motion` respecté : inertie coupée, curseur et aperçu flottant désactivés.
- Footer révélé en rideau : `position: fixed; bottom: 0` + espaceur transparent de 100 vh en fin de flux.

## Lancer le site

Ouvrir `index.html` dans un navigateur (double-clic), ou mieux, servir le dossier :

```bash
npx serve .
# ou
python -m http.server 8000
```

Seules les polices Google Fonts nécessitent une connexion ; tout le reste est local.

## Crédits médias (Pexels)

- Séquence hero : vidéo Pexels n° 12350193 · Manifeste (trois pièces) : vidéos n° 6356433, 13813030, 7578546
- Matières (séquences scrubées) : pigment → **Pixabay** vidéo n° 21536 · lumière → Pexels n° 35161057 · velours → Pexels n° 7677154
- Portrait d'Alma : photo n° 34751826 · Studio : n° 37178238
- Projets : n° 30666576 (Perche), 15126371 (Casa Rosa), 19799232 (Suite 41), 18631360 (Appartement C.), 11048312 (Maison Opale)
- Matières : n° 35974685, 32444178, 13169786, 14935628, 17892432, 36305726, 27584192, 19856114, 7232401, 6580566

## Arborescence

```
index.html
css/style.css
js/main.js
lib/                gsap, ScrollTrigger, CustomEase, SplitText, lenis (locaux)
assets/seq-hero/    150 frames du travelling d'ouverture
assets/seq-walk/    150 frames de la promenade du manifeste (trois pièces)
assets/seq-pigment/ 110 frames de l'encre colorée (le pigment)
assets/seq-lumiere/ 90 frames du voilage ensoleillé (la lumière)
assets/seq-velours/ 90 frames de la soie émeraude (le velours)
assets/img/         photos (projets, portrait, matières)
captures/           screenshots des scènes clés
```
