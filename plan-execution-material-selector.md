# Plan d'exécution jalonné — `material-selector`

---

## Étape 1 — Analyse des sources

**Objectif** : Comprendre la logique métier et les données avant toute décision technique.

**Actions Claude Code** :
1. Lire le PDF `Choix_des_matériaux.pdf` en intégralité.
2. Ouvrir et parcourir le fichier `OES-Database_R01.xlsm` :
   - Identifier toutes les feuilles présentes.
   - Localiser la base de données de référence (alliages, compositions par élément).
   - Localiser le vecteur de pondération `w_i` (par élément chimique).
   - Identifier les plages utilisées par les macros VBA pour la saisie et les calculs.
3. Lire les fichiers `.bas` exportés :
   - Reconstituer la séquence algorithmique : normalisation → distances → scores → classement.
   - Relever les constantes, seuils, et paramètres embarqués.
4. Dresser un inventaire structuré : liste des alliages, liste des éléments chimiques, valeurs des poids, structure de la saisie utilisateur.

**Point de validation avant de continuer** :
- L'inventaire est complet : nb d'alliages, nb d'éléments, vecteur `w` documenté, algorithme retracé pas à pas.
- Aucune ambiguïté sur les données d'entrée/sortie du moteur de calcul.

**Livrable intermédiaire** : `docs/source-analysis.md` — inventaire structuré des données et de la logique extraite.

---

## Étape 2 — Décisions d'architecture

**Objectif** : Fixer la stack technique et l'arborescence du repo avant d'écrire la première ligne de code.

**Actions Claude Code** :
1. Lire `/mnt/skills/public/frontend-design/SKILL.md`.
2. Choisir la stack : HTML/CSS/JS vanilla (aucune dépendance serveur, compatible Netlify statique).
3. Définir l'arborescence cible du repo (voir CLAUDE.md).
4. Définir la structure du fichier de données JSON exporté depuis le xlsm.
5. Documenter les choix dans `docs/architecture.md`.

**Point de validation avant de continuer** :
- Arborescence validée et conforme à ce qui est décrit dans `CLAUDE.md`.
- Format JSON des données de référence défini et documenté.
- Aucune dépendance externe non justifiée.

**Livrable intermédiaire** : `docs/architecture.md`.

---

## Étape 3 — Extraction et structuration des données

**Objectif** : Produire les fichiers de données statiques exploitables par l'application.

**Actions Claude Code** :
1. Extraire la base de données de référence du xlsm → `data/alloys.json`.
   - Structure : `[{ "id": "...", "grade": "...", "family": "...", "composition": { "C": ..., "Si": ..., ... } }]`
2. Extraire le vecteur de pondération → `data/weights.json`.
   - Structure : `{ "C": 500, "Mn": 400, "Cr": 150, ... }`
3. Valider la cohérence : chaque alliage couvre tous les éléments présents dans `weights.json`.
4. Consigner toute anomalie ou valeur manquante dans `docs/source-analysis.md`.

**Point de validation avant de continuer** :
- `alloys.json` et `weights.json` parsés sans erreur.
- Tous les éléments du vecteur `w` sont présents dans chaque entrée de `alloys.json`.
- Nombre d'alliages cohérent avec le xlsm source.

**Livrable intermédiaire** : `data/alloys.json`, `data/weights.json`.

---

## Étape 4 — Développement de l'application

**Objectif** : Produire une interface web fonctionnelle implémentant fidèlement l'algorithme du xlsm.

**Actions Claude Code** :
1. Implémenter le moteur de calcul en JavaScript (`src/engine.js`) :
   - Normalisation : `p_i = x_i / sum(x)`
   - Distance pondérée : `T_j = sum(w_i * |p_i - s_i_j|)`
   - Score : `Match_j = 1 / (1 + T_j)`
   - Classement décroissant par `Match_j`
2. Implémenter l'interface utilisateur (`index.html` + `src/main.js` + `src/style.css`) :
   - Formulaire de saisie des valeurs brutes OES (un champ par élément chimique).
   - Bouton de lancement de l'analyse.
   - Affichage des N meilleurs candidats avec score et grade.
   - Aucun backend — tout calcul côté client.
3. Appliquer les directives de la skill `frontend-design` : choix esthétique cohérent, typographie distincte, pas de design générique.
4. Valider le calcul sur un cas de test issu du xlsm (résultat attendu connu).

**Point de validation avant de continuer** :
- Cas de test : le grade retourné en 1re position correspond au grade attendu du xlsm pour les mêmes valeurs brutes.
- Interface lisible et utilisable sans documentation.
- Aucune dépendance CDN non vérifiée.

**Livrable intermédiaire** : application complète dans `src/`, testable en local via `open index.html`.

---

## Étape 5 — Initialisation du repo GitHub

**Objectif** : Publier le repo public avec structure propre et commits intelligibles.

**Actions Claude Code** :
1. Initialiser le repo local si ce n'est pas déjà fait.
2. Vérifier que `.gitignore` exclut les fichiers sources sensibles (xlsm, bas si non souhaités publics).
3. Créer un premier commit structuré : `feat: initial project structure and data extraction`.
4. Pousser sur GitHub (repo public, nom `material-selector`).
5. Vérifier la visibilité publique du repo.

**Point de validation avant de continuer** :
- Repo accessible publiquement sur GitHub.
- Arborescence conforme à `CLAUDE.md`.
- Aucune donnée sensible commitée (identifiants, données client réelles).

**Livrable intermédiaire** : repo GitHub public opérationnel.

---

## Étape 6 — Déploiement Netlify

**Objectif** : Mettre l'application en ligne à une URL stable et partageable.

**Actions Claude Code** :
1. Vérifier que `index.html` est à la racine (ou configurer le répertoire de publication dans `netlify.toml` si nécessaire).
2. Connecter le repo GitHub au projet Netlify (via l'interface Netlify ou CLI).
3. Déclencher un premier déploiement.
4. Vérifier que l'application fonctionne sur l'URL Netlify générée (formulaire, calcul, affichage résultats).
5. Configurer un nom de domaine personnalisé Netlify si disponible (`material-selector.netlify.app`).

**Point de validation avant de continuer** :
- URL publique Netlify opérationnelle.
- Calcul fonctionnel en production (pas seulement en local).
- URL notée pour intégration dans le README.

**Livrable intermédiaire** : URL de déploiement stable.

---

## Étape 7 — Finalisation du README

**Objectif** : Produire un README orienté recruteur, sans révéler l'intention de portfolio.

**Actions Claude Code** :
1. Rédiger `README.md` en anglais selon les règles définies dans `CLAUDE.md` :
   - Présenter le problème métier réel.
   - Décrire la solution technique (algorithme, stack).
   - Inclure un lien vers l'application Netlify.
   - Inclure une capture d'écran ou GIF de l'interface.
   - Mentionner les compétences techniques démontrées (sans en faire une liste de mots-clés).
2. Vérifier : pas de mention de "portfolio", pas de ton marketing, pas de formulation générique type "this project demonstrates my skills".
3. Commiter : `docs: add README`.
4. Vérifier le rendu sur GitHub.

**Point de validation final** :
- README lisible et crédible comme un projet réel, pas comme un exercice scolaire.
- Lien Netlify fonctionnel depuis le README.
- Repo prêt à être partagé dans une candidature ou sur LinkedIn.

**Livrable final** : repo GitHub public complet + application Netlify déployée.
