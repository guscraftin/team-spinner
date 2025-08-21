# Team Spinner 6GMA

Outil web léger (HTML/CSS/JS pur) pour tirer aléatoirement et équitablement les rôles d'une équipe (Scribe, Meta Feedbacker, Leader Éveilleur, Time Keeper) avec gestion d'exclusions, équilibrage statistique, historique persistent et exportable, et notification Discord (webhook) incluant automatiquement un fichier JSON importable sur un autre appareil.

## Fonctionnalités principales

- Tirage de rôles en 3 modes: Aléatoire, Uniforme parfaite, Équilibrage progressif.
- Animation personnalisable (0.50s à 15.00s par pas de 0.25s).
- Exclusions ciblées + exclusions globales (ALL).
- Historique local (localStorage) avec stats d'équité (répartition par rôle / membre).
- Export / import JSON (interopérabilité entre appareils).
- Envoi automatique sur Discord (embed + fichier JSON importable) après chaque tirage.
- Confettis & micro-animations pour le fun.

## Mise en place rapide

1. Cloner ou télécharger le dépôt.
2. (Optionnel) Créer un fichier `config.local.js` pour ajouter un webhook Discord :

   ```js
   window.APP_CONFIG = { WEBHOOK_URL: 'https://discord.com/api/webhooks/ID/TOKEN' };
   ```

3. Ouvrir simplement `index.html` dans un navigateur moderne (Chrome, Firefox, Edge). Aucun build requis.
4. (Optionnel) Héberger sur un service statique (GitHub Pages, Netlify, Vercel…)

## Utilisation

1. Ajuster (si besoin) les exclusions par rôle ou globales.
2. Choisir le mode de tirage et la durée d'animation.
3. Cliquer sur "Lancer le tirage".
4. Consulter l'historique + statistiques (barres sous les contrôles).
5. Exporter / Importer l'historique pour synchroniser l'équité entre machines.

### Import / Export manuel

- Export : bouton "Exporter JSON" → génère un fichier `team-spinner-history-YYYY-MM-DD.json`.
- Import : bouton "Importer JSON" → sélectionner un fichier précédemment exporté (ou reçu via Discord).

### Webhook Discord

Chaque tirage envoie :

- Un embed récapitulatif (rôles, mode, contraintes).
- Un fichier JSON : tableau brut de l'historique complet (directement ré‑importable).

Sécurité : le webhook est côté client, donc ne pas utiliser un webhook sensible (créez un webhook dédié).

## Personnalisation

- Ajouter / modifier les membres dans `script.js` (const MEMBERS).
- Ajouter / modifier des rôles (const ROLES) avec `key`, `label`, `color`.
- Styliser via `style.css` (thème, animations, boutons).

## Structure minimale

```text
index.html
script.js
style.css
config.local.js (optionnel, ignoré en prod)
```

## Synchronisation multi-appareils

Deux options :

- Importer le fichier JSON exporté manuellement.
- Télécharger le fichier joint dans le message Discord après tirage et l'importer.

## Limites & Notes

- Données locales stockées en `localStorage` (effacées si nettoyage navigateur).
- Pas de backend : toute logique côté client.
- Le webhook ne doit pas exposer des secrets critiques.

## Roadmap (idées)

- Mode "rotation" stricte.
- UI mobile avancée / PWA.
- Filtrage par date dans l'historique.
- Tests unitaires sur les algorithmes d'attribution.

---

Happy fair spinning! 🎲
