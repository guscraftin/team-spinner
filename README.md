# Team Spinner

Je veux une page web simple (HTML + CSS + JavaScript vanilla, pas de framework) qui permet de désigner aléatoirement des personnes pour différents rôles.  
Contexte : c'est pour une équipe en réunion, pour attribuer les rôles suivants :

- Scribe ✍️
- Time Keeper ⏰
- Feedbacker 💬
- Leader Éveilleur 🌟

## Règles

- Les personnes disponibles sont en dur dans le code : ["Rohan", "Augustin", "Mailys", "Nathan", "Alban", "Tom"].
- Une même personne ne peut pas avoir deux rôles.
- Il doit y avoir un bouton pour générer une répartition aléatoire.
- Je veux une option (checkbox ou autre) pour **exclure certains membres d’un rôle précis** avant de lancer le tirage (ex : Mailys ne peut pas être Time Keeper cette fois).
- Le tirage doit respecter ces exclusions.

## Interface attendue

- Design simple mais fun, léger et rapide à charger (pas de lib externe lourde).
- Chaque rôle est affiché dans une petite carte colorée avec le prénom choisi.
- Un bouton "🎲 Lancer le tirage" pour générer la répartition.
- Affichage instantané (moins de 15 secondes de chargement total de la page, donc tout en local).

## Structure des fichiers

- `index.html` : page principale
- `style.css` : style fun et léger
- `script.js` : logique du tirage et exclusions
