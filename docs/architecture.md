# Étape 2 — Décisions d'architecture

## Stack

- **HTML / CSS / JavaScript vanilla**, zéro dépendance, zéro build.
- **Calcul 100 % client**, aucun backend, aucun appel réseau.
- **Données statiques JSON** chargées via `fetch()` au démarrage.
- Déploiement **Netlify statique** : publication directe de la racine, pas d'étape de build.

Justification : l'outil source est autonome (Excel offline) ; l'application doit l'être aussi. Code lisible par un recruteur technique, déploiement trivial.

> La skill `frontend-design` (`/mnt/skills/public/...`) n'est pas disponible sur la machine. Les directives UI de `CLAUDE.md` font foi : ton industriel/technique, grille de saisie un champ par élément, pas de typo/couleur générique (pas d'Inter/Arial/purple gradient).

## Arborescence

```
material-selector/
├── index.html
├── src/
│   ├── engine.js     # moteur de calcul pur (testable, sans DOM)
│   ├── main.js       # UI : lecture formulaire, appel moteur, rendu résultats
│   └── style.css
├── data/
│   ├── fe01.json     # silo aciers carbone (44 alliages)
│   └── fe30.json     # silo inox (12 alliages)
├── test/
│   └── engine.test.mjs  # validation Node du moteur vs comportement xlsm
├── docs/
│   ├── source-analysis.md
│   └── architecture.md
├── netlify.toml
├── README.md
└── CLAUDE.md
```

> Écart assumé vs `CLAUDE.md` : **un fichier de données par silo** (`fe01.json`, `fe30.json`) au lieu d'un `alloys.json` + `weights.json` uniques. Raison : les silos sont indépendants et n'ont pas le même vecteur de poids (cf. `source-analysis.md`). Chaque fichier embarque sa liste d'éléments, ses poids et ses alliages → autonome et chargé à la demande.

## Format des données (par silo)

```json
{
  "silo": "fe01",
  "label": "Carbon & Low-Alloy Steel",
  "family": "Fe",
  "elements": ["C","Si","Mn","P","S","Cr","Mo","Ni","Al","Co","Cu","Nb","Ti","V","W","Pb","Sn","B"],
  "weights": { "C": 500, "Si": 50, "Mn": 400, "...": "..." },
  "alloys": [
    {
      "std": "BCS/SS-CRM N409/1",
      "grade": null,
      "composition": { "C": 0.082, "Si": 1.46, "...": "...", "B": null }
    }
  ]
}
```

- `std` : nom de l'échantillon de référence (identifiant, toujours présent).
- `grade` : grade métallurgique si connu, sinon `null`.
- `composition` : valeur en % par élément ; `null` = non mesuré → traité comme `0` par le moteur (similarité nulle sur cet élément, conforme au VBA).

## Moteur (`engine.js`)

Fonction pure `rank(input, silo)` :
- `input` : `{ elem: valeur }` pour les éléments saisis (les autres ignorés).
- Pour chaque alliage : `sim_i = (x==s) ? 1 : min(x,s)/max(x,s)` ; `score = Σ(w_i·sim_i)/Σw_i` sur les éléments saisis.
- Retourne la liste triée par score décroissant.
- Pas de normalisation (saisie et base sur la même échelle %, cf. décision `source-analysis.md §3.4`).
- Avertissement « faible confiance » si le meilleur score est sous un seuil (à caler).

## Validation

`test/engine.test.mjs` (Node, sans dépendance) : test d'identité — chaque alliage, injecté comme entrée, doit ressortir 1er. Attendu 44/44 (Fe01) et 12/12 (Fe30), conforme au comportement du xlsm.
