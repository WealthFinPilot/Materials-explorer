# CLAUDE.md — material-selector

> Ce fichier est lu par Claude Code à chaque session. Il est la référence unique de contexte pour ce projet.

---

## Quel est ce projet ?

Transformation d'un outil Excel/VBA de sélection de matériaux métallurgiques en application web statique, publique, déployée sur Netlify.

Contexte métier : un laboratoire d'analyse OES (spectrométrie d'émission optique) reçoit des valeurs brutes d'intensités relatives pour 20+ éléments chimiques. L'outil identifie le grade probable de l'alliage en comparant ces valeurs normalisées à une base de données de compositions de référence, via une distance pondérée.

Ce repo est public et orienté portfolio Data Analyst / développement. Ne pas mentionner cet objectif dans le README ou les commits.

---

## Sources disponibles — à extraire, ne pas inventer

| Fichier | Contenu attendu |
|---|---|
| `OES-Database_R01.xlsm` | Base de données alliages, vecteur de pondération, interface VBA |
| `*.bas` | Logique algorithmique exportée (normalisation, calcul distances, classement) |
| `Choix_des_matériaux.pdf` | Description métier et formules mathématiques de référence |

**Règle absolue** : toute valeur numérique (poids, compositions, seuils) doit être extraite des fichiers sources. Aucune valeur inventée ou estimée.

---

## Algorithme à implémenter (référence : PDF)

```
1. Normalisation       p_i = x_i / sum(x_k)
2. Distance pondérée   T_j = sum(w_i * |p_i - s_i_j|)   pour chaque alliage j
3. Score               Match_j = 1 / (1 + T_j)
4. Classement          tri décroissant par Match_j
```

- `x_i` : valeur brute OES saisie par l'utilisateur
- `s_i_j` : composition de référence de l'alliage j pour l'élément i
- `w_i` : poids métallurgique de l'élément i (ex. C=500, Mn=400, Cr=150…)

---

## Architecture cible du repo

```
material-selector/
├── index.html
├── src/
│   ├── engine.js       # moteur de calcul pur (normalisation, distance, score)
│   ├── main.js         # logique UI (lecture formulaire, appel engine, affichage)
│   └── style.css
├── data/
│   ├── alloys.json     # base de données extraite du xlsm
│   └── weights.json    # vecteur de pondération extrait du xlsm
├── docs/
│   ├── source-analysis.md   # inventaire extrait des sources (étape 1)
│   └── architecture.md      # décisions techniques (étape 2)
├── assets/
│   └── screenshot.png  # capture pour le README
├── .gitignore
├── netlify.toml        # si configuration non-racine nécessaire
├── README.md
└── CLAUDE.md
```

---

## Stack technique

- **HTML/CSS/JS vanilla** — zéro dépendance serveur, compatible Netlify statique sans configuration de build.
- **Données statiques JSON** — chargées au démarrage via `fetch()` ou embarquées directement dans un module JS.
- **Calcul 100% client** — aucun appel API, aucun backend.

Justification : l'outil source est autonome (Excel offline). L'application web doit l'être aussi. Simplicité de déploiement, lisibilité du code pour un recruteur technique.

---

## Design UI

Lire `/mnt/skills/public/frontend-design/SKILL.md` avant de coder l'interface.

Directives spécifiques :
- Ton visuel : industriel/technique, pas générique. L'application s'adresse à des techniciens de laboratoire.
- Formulaire de saisie : un champ par élément chimique, organisé en grille lisible.
- Résultats : affichage des N meilleurs candidats, score visible, grade mis en avant.
- Aucune couleur ou typographie par défaut (Inter, Arial, purple gradient = interdit).

---

## Règles de travail

**Commits** : messages en anglais, format `type: description` (feat, fix, refactor, docs, chore). Un commit par étape logique, pas de commits fourre-tout.

**Données** : ne commiter ni le `.xlsm`, ni les `.bas` dans le repo public sauf décision explicite de Sébastien. Les données extraites en JSON sont publiques.

**Anonymisation** : aucune référence au nom du laboratoire, à l'employeur, ou à des données clients dans le code ou les fichiers.

**Validation** : avant de passer à l'étape suivante, exécuter le point de validation défini dans `plan-execution-material-selector.md`.

**README** : rédigé en anglais. Ton : projet réel résolvant un problème réel. Pas de "portfolio project", pas de "this demonstrates my skills in X". Décrire le problème, la solution, et le lien vers l'app.

---

## Points de vigilance

- La normalisation s'applique sur les valeurs brutes OES (intensités relatives), pas des pourcentages. Vérifier la cohérence avec les valeurs de référence du xlsm.
- Le vecteur de poids est le résultat d'itérations expérimentales décrites dans le PDF. L'extraire tel quel, ne pas le recalculer.
- Certains éléments peuvent avoir des valeurs nulles ou absentes pour certains alliages — gérer ce cas dans `engine.js` (contribution nulle ou neutre).
- Le score `Match_j` est borné [0, 1]. Si tous les scores sont faibles, afficher un avertissement explicite à l'utilisateur.

---

## Ressources

| Ressource | Rôle |
|---|---|
| `plan-execution-material-selector.md` | Plan séquentiel complet avec validations |
| `Choix_des_matériaux.pdf` | Référence métier et formules |
| `OES-Database_R01.xlsm` | Source des données et de la logique |
| `/mnt/skills/public/frontend-design/SKILL.md` | Directives design UI |
