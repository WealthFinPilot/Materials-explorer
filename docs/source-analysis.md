# Étape 1 — Analyse des sources

> Inventaire extrait de `OES-DataBase_R01.xlsm`, des modules `.bas` et du PDF `Choix des matériaux.pdf`.
> Aucune valeur n'est inventée. Toutes les données proviennent des fichiers sources.

---

## 1. Structure du classeur

11 feuilles, organisées en **4 silos de recherche** indépendants (et non un seul comme supposé dans `CLAUDE.md`) :

| Silo | Base de réf. | Feuille interface | Feuille décision (calcul) | Nb alliages | Nb éléments |
|---|---|---|---|---|---|
| **Fe01** (aciers carbone / low alloy) | `Fe01` / table `STD_AC` | `Research` (B4 = "Fe01") | `AC` | 44 | 18 |
| **Fe30** (inox / stainless Fe-Cr-Ni) | `Fe30` / table `STD_SS` | `Research` (B4 = "Fe30") | `Stainless` | 12 | 18 |
| **Al** (aluminiums) | `Al` / table `STD_Al` | `Research_Al` | `Decision_Al` | 3 | 14 |
| **Cu** (cuivreux) | `Cu` / table `STD_Cu` | `Research_Cu` | `Decision_Cu` | 3 | 17 |

Fe01 et Fe30 partagent la même feuille interface `Research`, le choix se fait en `Research!B4`.

### Listes d'éléments par silo (ordre du classeur)

- **Fe01 / Fe30** (18) : C, Si, Mn, P, S, Cr, Mo, Ni, Al, Co, Cu, Nb, Ti, V, W, Pb, Sn, B
- **Al** (14) : Si, Fe, Cu, Mn, Mg, Zn, Ni, Cr, Pb, Sn, Ti, P, V, Al
- **Cu** (17) : Sn, Pb, Zn, P, Mn, Fe, Ni, Si, Mg, Cr, Co, Al, S, Ag, Sb, Bi, Cu

Les silos n'ont **pas le même jeu d'éléments** → une structure de données unique `weights.json` + `alloys.json` n'est pas adaptée. Il faut un fichier par silo.

---

## 2. Vecteurs de pondération `w_i` (extraits, valeurs brutes)

Les poids **diffèrent par silo** (ce ne sont pas les mêmes priorités métier).

**Fe01** — total 1580
| C | Si | Mn | P | S | Cr | Mo | Ni | Al | Co | Cu | Nb | Ti | V | W | Pb | Sn | B |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
|500|50|400|50|50|150|50|100|10|50|100|10|10|10|10|10|10|10|

**Fe30** — total 1530 (Mn baissé à 100, Cr monté à 350, Ni monté à 150)
| C | Si | Mn | P | S | Cr | Mo | Ni | Al | Co | Cu | Nb | Ti | V | W | Pb | Sn | B |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
|500|50|100|50|50|350|50|150|10|50|100|10|10|10|10|10|10|10|

**Al** — total 1540 : Si 500, Fe 50, Cu 400, Mn 50, Mg 50, Zn 150, Ni 50, Cr 100, Pb 10, Sn 50, Ti 100, P 10, V 10, Al 10

**Cu** — total 1570 : Sn 500, Pb 50, Zn 400, P 50, Mn 50, Fe 150, Ni 50, Si 100, Mg 10, Cr 50, Co 100, Al 10, S 10, Ag 10, Sb 10, Bi 10, Cu 10

> La pondération « exemple » du PDF (C=500, Mn=400, Cr=150, Ni=100, Cu=100) correspond exactement au silo **Fe01**.

---

## 3. ⚠️ Divergence majeure : PDF ≠ code VBA

**Le PDF et le code VBA ne décrivent pas le même algorithme.** Le PDF présente une formule idéalisée ; le VBA (qui produit les résultats réels de l'outil) en implémente une autre.

### 3.1 Algorithme du PDF (théorique)
```
p_i   = x_i / Σ x_k                      (normalisation)
d_ij  = | p_i − s_ij |
T_j   = Σ w_i · d_ij                     (distance L1 pondérée)
Match = 1 / (1 + T_j)                     (score, plus haut = meilleur)
```

### 3.2 Algorithme réellement codé en VBA (`research_Fe01`, identique pour les 4 silos)
- **Aucune normalisation `x_i / X`.** Les valeurs brutes d'entrée et les compositions de référence sont utilisées telles quelles.
- Un écart-type par colonne est calculé… mais **il se simplifie et s'annule** dans le ratio (sauf pour détecter une colonne entièrement vide). Il n'a donc aucun effet sur le score.
- Similarité par élément = **ratio min/max** :
```
si x_i fourni :
    W_total += w_i
    pour chaque alliage j :
        s = s_ij  (0 si valeur manquante)
        sim = 1            si x_i == s
        sim = s / x_i      si s <  x_i
        sim = x_i / s      si s >  x_i      → sim = min(x_i,s)/max(x_i,s) ∈ [0,1]
        contribution = sim · w_i
Score_j = Σ contribution / W_total          ∈ [0,1], plus haut = meilleur
```
- Seuls les éléments **saisis** par l'utilisateur entrent dans le calcul (sinon colonne ignorée et poids non compté).
- Tri **décroissant** par `Score_j`. Les 10 premiers sont affichés.

### 3.3 Conséquences
- Le VBA calcule une **moyenne pondérée de similarités-ratio**, pas un `1/(1+distance L1)`.
- Une valeur de composition **manquante** chez un alliage = similarité 0 sur cet élément (pénalité max), pas une contribution neutre.
- Les deux méthodes **ne produisent pas le même classement**. Le point de validation de l'Étape 4 (« le 1er résultat correspond au grade attendu du xlsm ») n'est atteignable qu'avec **l'algorithme VBA**, pas avec celui du PDF.

### 3.4 Décision retenue (validée avec le métier)

Tests empiriques menés sur les bases réelles (auto-reconnaissance, invariance d'échelle ×1000, robustesse au bruit gaussien multiplicatif) :

| Algorithme | Auto-reco Fe01 | Échelle ×1000 | Bruit 15 % Fe01 | Bruit 15 % Fe30 |
|---|---|---|---|---|
| PDF normalisé (L1, réf. normalisée) | 44/44 | 44/44 | 87 % | 65 % |
| **VBA (ratio brut)** | **44/44** | 0/44 | **99 %** | **98 %** |
| Hybride (normalisé + ratio) | 44/44 | 44/44 | 98 % | 94 % |

**Fait métier décisif** : les compositions de référence sont des **concentrations réelles en %** (ex. `%C = 0.082` → 0,082 % de carbone), et le technicien saisit ses valeurs OES **sur la même échelle %**.

→ Comme la saisie et la base sont sur la même échelle, **toute normalisation détruit l'information de niveau absolu** (deux alliages de mêmes proportions mais de teneurs différentes deviendraient indistinguables). On retient donc l'**algorithme VBA brut, sans normalisation**.

**Algorithme figé pour `engine.js`** :
```
Pour chaque élément i saisi (x_i fourni) :
    W_total += w_i
    pour chaque alliage j :
        s = s_ij   (0 si valeur manquante dans la base)
        sim = 1                       si x_i == s
        sim = min(x_i, s) / max(x_i, s)   sinon          ∈ [0,1]
        contribution_ij = sim · w_i
Score_j = Σ_i contribution_ij / W_total      ∈ [0,1], plus haut = meilleur
Tri décroissant par Score_j ; afficher les 10 premiers.
```
Cas limite : `x_i == s == 0` → `sim = 1` (égalité). Élément non saisi → exclu (numérateur et `W_total`). Reproduit fidèlement le classement du xlsm.

---

## 4. Anomalies / points de vigilance données

- **Al et Cu quasi vides** : 3 alliages chacun. Un moteur de recherche sur 3 références a peu d'intérêt métier. Fe01 (44) et Fe30 (12) sont les silos exploitables.
- **Colonne `Grade` souvent vide** : Fe01 26/44, Fe30 2/12, Al 2/3, Cu 1/3. La colonne `STD` (nom de l'échantillon de référence) est toujours remplie ; c'est l'identifiant réel. Le `Grade` est l'info métier à afficher quand elle existe.
- **Nombreuses cellules vides** dans les compositions (élément non mesuré / absent) → à traiter comme `0` côté moteur, conformément au comportement VBA.
- Le score est borné `[0, 1]`. En pratique il est rarement proche de 1 (similarités-ratio sur valeurs brutes très dispersées) → prévoir un avertissement « faible confiance » sous un seuil à définir.

---

## 5. Sortie attendue du moteur (par silo)

Pour chaque alliage : `STD` (nom réf.), `Grade` (si connu), composition complète, `Score ∈ [0,1]`.
Affichage : 10 meilleurs candidats triés par score décroissant.
