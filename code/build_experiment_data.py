import json

# Texts definition
# Practice text (~80 words, 2 errors: 1 surface, 1 grammar)
practice_text = {
    "id": "practice",
    "title": "Le phare de l'île aux Mouettes",
    "description": "Texte d'entraînement pour se familiariser avec l'interface et le clic sur les erreurs.",
    "isPractice": True,
    "raw_text": (
        "Situé à la pointe nord d'un promontoire rocheux, le vieux phare guidait autrefois les marins égarés. "
        "Chaque soir, le gardien allumait la grande lampe au sommet de la tour. "
        "Il devait nettoyer les vitres pour pour éviter que le sel marin ne bloque la lumière. "
        "Aujourd'hui, une balise automatique remplace le gardien, mais le bâtiment reste un symbole précieuse pour les pêcheurs de la région."
    ),
    "errors": [
        {
            "token_match": "pour pour",
            "error_word": "pour",
            "target_occurrence": 2,
            "error_type": "surface",
            "error_subtype": "mot_double",
            "correction": "(supprimer le mot en double)",
            "explanation": "Le mot 'pour' est répété deux fois consécutivement."
        },
        {
            "token_match": "symbole précieuse",
            "error_word": "précieuse",
            "error_type": "grammaire",
            "error_subtype": "accord_genre",
            "correction": "précieux",
            "explanation": "Accord de l'adjectif avec le nom masculin 'symbole' : 'un symbole précieux'."
        }
    ],
    "quiz": [
        {
            "id": "q_p1",
            "question": "Où se situe le vieux phare décrit dans le texte ?",
            "options": [
                "À l'entrée d'un grand port commercial",
                "À la pointe nord d'un promontoire rocheux",
                "Au centre d'un village de pêcheurs",
                "Sur une falaise de craie blanche"
            ],
            "correct_index": 1
        },
        {
            "id": "q_p2",
            "question": "Qu'est-ce qui remplace le gardien aujourd'hui ?",
            "options": [
                "Une balise automatique",
                "Une équipe de sauveteurs",
                "Un radar militaire",
                "Une sirène électronique"
            ],
            "correct_index": 0
        }
    ]
}

# Text 1 (~300 words, 6 errors: 3 surface, 3 grammar)
# Surface: "leur leur", "dans dans", "de de"
# Grammar: "a travaillé" (sujet: les techniciens), "des mesures précieux" (mesures fém.), "soulagé" (les scientifiques)
text1 = {
    "id": "text1",
    "title": "L'expédition du pic d'Aurelia",
    "description": "Récit d'exploration scientifique et météorologique dans un environnement alpin extrême.",
    "isPractice": False,
    "raw_text": (
        "À la fin de l'automne, une équipe de six chercheurs a entrepris l'ascension du pic d'Aurelia, "
        "un sommet isolé de la cordillère méridionale culminant à quatre mille mètres. "
        "Leur mission consistait à installer une station météorologique autonome capable d'enregistrer les variations barométriques extrêmes. "
        "Dès le troisième jour de marche, une tempête imprévue a ralenti leur progression sur la crête rocheuse. "
        "Malgré des vents violents qui dépassaient les cent kilomètres à l'heure, le groupe a réussi à atteindre le plateau intermédiaire "
        "pour établir leur leur campement de fortune. Les tentes ont été solidement arrimées aux parois de granit afin de résister aux bourrasques nocturnes. "
        "Durant la nuit, la température est descendue sous la barre des vingt degrés sous zéro, congelant une partie des réserves d'eau potable. "
        "Au lever du jour, le ciel s'est dégagé, révélant un panorama grandiose sur la vallée glaciaire. "
        "L'ingénieur en chef, le professeur Valmont, a alors rassemblé les composantes électroniques sensibles qui avaient été transportées "
        "dans dans des caisses étanches. Malgré le froid mordant, les techniciens a travaillé sans relâche pendant plusieurs heures pour assembler "
        "le mât de mesure et connecter les capteurs thermiques. Cependant, ils ont constaté que l'antenne principale présentait une légère fissure "
        "le long de de son axe métallique. Grâce à une résine spéciale durcissant à basse température, la fissure a pu être colmatée "
        "sans compromettre la transmission des données satellitaires. Vers seize heures, le premier signal radio a été capté avec succès "
        "par la station de surveillance située en plaine. Épuisés mais soulagé par cette victoire technique, les scientifiques ont entamé "
        "leur descente vers le camp de base avant la tombée de la nuit. Cette installation fournira des mesures précieux sur les microclimats "
        "alpins pour les dix prochaines années."
    ),
    "errors": [
        {
            "token_match": "leur leur",
            "error_word": "leur",
            "target_occurrence": 2, # the second 'leur'
            "error_type": "surface",
            "error_subtype": "mot_double",
            "correction": "(supprimer le mot en double)",
            "explanation": "Le mot 'leur' est répété deux fois consécutivement."
        },
        {
            "token_match": "dans dans",
            "error_word": "dans",
            "target_occurrence": 2,
            "error_type": "surface",
            "error_subtype": "mot_double",
            "correction": "(supprimer le mot en double)",
            "explanation": "La préposition 'dans' est répétée deux fois consécutivement."
        },
        {
            "token_match": "a travaillé",
            "error_word": "a",
            "error_type": "grammaire",
            "error_subtype": "accord_sujet_verbe",
            "correction": "ont travaillé",
            "explanation": "Accord sujet-verbe erroné avec 'les techniciens' (pluriel) : 'ont travaillé' et non 'a travaillé'."
        },
        {
            "token_match": "de de",
            "error_word": "de",
            "target_occurrence": 2,
            "error_type": "surface",
            "error_subtype": "mot_double",
            "correction": "(supprimer le mot en double)",
            "explanation": "La préposition 'de' est répétée deux fois consécutivement."
        },
        {
            "token_match": "soulagé",
            "error_word": "soulagé",
            "error_type": "grammaire",
            "error_subtype": "accord_adjectif_nombre",
            "correction": "soulagés",
            "explanation": "L'adjectif 'soulagé' se rapporte à 'les scientifiques' et doit être au pluriel ('soulagés')."
        },
        {
            "token_match": "des mesures précieux",
            "error_word": "précieux",
            "error_type": "grammaire",
            "error_subtype": "accord_adjectif_genre",
            "correction": "précieuses",
            "explanation": "Le nom 'mesures' est féminin pluriel, l'adjectif doit être 'précieuses'."
        }
    ],
    "quiz": [
        {
            "id": "q_t1_1",
            "question": "Quel était le sommet gravi par l'équipe de chercheurs ?",
            "options": [
                "Le pic d'Aurelia",
                "Le mont Valmont",
                "L'aiguille Noire",
                "Le col du Granit"
            ],
            "correct_index": 0
        },
        {
            "id": "q_t1_2",
            "question": "Quel élément matériel présentait une légère fissure ?",
            "options": [
                "Une caisse de transport étanche",
                "L'antenne principale métallique",
                "Un mât de mesure en granit",
                "Le capteur thermique de plaine"
            ],
            "correct_index": 1
        },
        {
            "id": "q_t1_3",
            "question": "Comment la fissure a-t-elle été réparée par l'équipe ?",
            "options": [
                "Par un soudage thermique à flamme vive",
                "En remplaçant l'axe par une pièce de rechange",
                "Avec une résine spéciale durcissant à froid",
                "En appliquant un bandage d'étanchéité adhésif"
            ],
            "correct_index": 2
        }
    ]
}

# Text 2 (~300 words, 6 errors: 3 surface, 3 grammar)
# Surface: "avec avec", "la la", "contre contre"
# Grammar: "les engrenages devait" (sujet pluriel), "les écarts thermique" (écarts pluriel), "le défi était immenses" (défi singulier)
text2 = {
    "id": "text2",
    "title": "L'horloger de la baie d'Ys",
    "description": "Récit historique fictif sur la création artisanale d'un chronomètre de marine au XIXe siècle.",
    "isPractice": False,
    "raw_text": (
        "Au milieu du dix-neuvième siècle, le port maritime d'Ys vivait au rythme des départs de navires marchands "
        "naviguant vers les comptoirs d'Orient. Dans son modeste atelier en bordure des quais, Maître Corentin consacrait ses journées "
        "à la fabrication de chronomètres de marine de haute précision. La navigation hauturière exigeait alors des instruments d'une "
        "régularité absolue pour déterminer la longitude en pleine mer. L'artisan travaillait depuis près de deux ans sur un mécanisme "
        "révolutionnaire doté d'un balancier bimétallique capable de compenser les écarts thermique. Un matin d'avril, un armateur influent "
        "nommé Monsieur Le Bihan lui passa commande d'un appareil destiné à équiper la frégate L'Amphitrite. Le défi était immenses car "
        "le bateau devait appareiller exactement trois semaines plus tard. Travaillant à la lueur des lampes à huile, Corentin ajustait chaque "
        "rouage avec avec une patience infinie. Les engrenages en laiton poli devait s'emboîter sans le moindre frottement parasite. "
        "Pour protéger le balancier des mouvements de roulis, il conçut une suspension à cardan montée sur des ressorts amortisseurs. "
        "Durant les derniers jours précédant le départ, la fatigue commençait à peser lourdement sur le vieil artisan. Malgré l'épuisement, "
        "il a passé la la nuit entière à lubrifier les rubis synthétiques avec une huile fine de cétacé. Lorsque le jeune mousse est venu "
        "chercher le boîtier en bois d'acajou, l'horloger a vérifié une dernière fois la marche des aiguilles. Cependant, le mousse pressé "
        "a laissé glisser le boîtier contre contre la table d'ébénisterie, provoquant un léger claquement sourd. Fort heureusement, le mécanisme "
        "suspendu a amorti le choc sans subir le moindre dérèglement. Deux mois après la traversée, une lettre élogieuse est parvenue à l'atelier, "
        "confirmant la fiabilité remarquable de l'instrument en pleine tempête. Ce succès a définitivement établi la réputation de l'artisan "
        "auprès de tous les capitaines marchands de la province."
    ),
    "errors": [
        {
            "token_match": "écarts thermique",
            "error_word": "thermique",
            "error_type": "grammaire",
            "error_subtype": "accord_adjectif_nombre",
            "correction": "thermiques",
            "explanation": "L'adjectif 'thermique' qualifie le nom pluriel 'écarts' et doit prendre un 's' ('écarts thermiques')."
        },
        {
            "token_match": "était immenses",
            "error_word": "immenses",
            "error_type": "grammaire",
            "error_subtype": "accord_attribut_nombre",
            "correction": "immense",
            "explanation": "L'attribut 'immenses' se rapporte au sujet singulier 'Le défi' et doit être au singulier ('immense')."
        },
        {
            "token_match": "avec avec",
            "error_word": "avec",
            "target_occurrence": 2,
            "error_type": "surface",
            "error_subtype": "mot_double",
            "correction": "(supprimer le mot en double)",
            "explanation": "La préposition 'avec' est répétée deux fois consécutivement."
        },
        {
            "token_match": "laiton poli devait",
            "error_word": "devait",
            "error_type": "grammaire",
            "error_subtype": "accord_sujet_verbe",
            "correction": "devaient",
            "explanation": "Le sujet est 'Les engrenages en laiton poli' (pluriel), le verbe doit être 'devaient'."
        },
        {
            "token_match": "la la nuit",
            "error_word": "la",
            "target_occurrence": 2,
            "error_type": "surface",
            "error_subtype": "mot_double",
            "correction": "(supprimer le mot en double)",
            "explanation": "L'article 'la' est répété deux fois consécutivement."
        },
        {
            "token_match": "contre contre",
            "error_word": "contre",
            "target_occurrence": 2,
            "error_type": "surface",
            "error_subtype": "mot_double",
            "correction": "(supprimer le mot en double)",
            "explanation": "La préposition 'contre' est répétée deux fois consécutivement."
        }
    ],
    "quiz": [
        {
            "id": "q_t2_1",
            "question": "Quel navire devait être équipé du chronomètre fabriqué par Corentin ?",
            "options": [
                "L'Amphitrite",
                "Le Neptune",
                "L'Albatros",
                "La Belle-Poule"
            ],
            "correct_index": 0
        },
        {
            "id": "q_t2_2",
            "question": "Quel incident est survenu lorsque le jeune mousse a pris le boîtier ?",
            "options": [
                "La vitre du cadran s'est brisée",
                "Le boîtier a glissé contre la table d'ébénisterie",
                "La clé de remontage est tombée par terre",
                "Une aiguille en laiton s'est tordue"
            ],
            "correct_index": 1
        },
        {
            "id": "q_t2_3",
            "question": "Quel produit a servi à lubrifier les rubis du mécanisme ?",
            "options": [
                "Une graisse végétale d'olive",
                "Une huile minérale de paraffine",
                "Une huile fine de cétacé",
                "Du suif de bœuf purifié"
            ],
            "correct_index": 2
        }
    ]
}

# Text 3 (~300 words, 6 errors: 3 surface, 3 grammar)
# Surface: "par par", "pour pour", "leurs leurs"
# Grammar: "dépérissait" (sujet: Les cultures traditionnelles), "hermétiquement clos" (douze jarres -> closes), "inattendu" (Cette redécouverte -> inattendue)
text3 = {
    "id": "text3",
    "title": "Les graines oubliées de Val-Serein",
    "description": "Récit de recherche agronomique et archéologique sur la redécouverte de semences résilientes.",
    "isPractice": False,
    "raw_text": (
        "Dans une vallée aride et escarpée du sud du pays, le village de Val-Serein subissait depuis plusieurs étés des vagues "
        "de sécheresse sans précédent. Les cultures traditionnelles de céréales dépérissait sous un soleil implacable, menaçant "
        "l'équilibre économique de la communauté paysanne. C'est dans ce contexte difficile qu'une biologiste originaire du canton, "
        "le docteur Élise Mercier, a entrepris des fouilles dans les ruines d'un ancien prieuré abandonné depuis deux siècles. "
        "Selon les chroniques locales, les moines qui habitaient autrefois ces lieux parvenaient à récolter du blé même durant les pires "
        "canicules. Après trois semaines de recherches sous les voûtes effondrées, l'équipe a mis au jour une chambre souterraine scellée "
        "par par une lourde porte de chêne. À l'intérieur de cette cave obscure reposaient douze jarres en terre cuite hermétiquement "
        "clos par de la cire d'abeille. À l'ouverture de la première jarre, les scientifiques ont découvert des milliers de semences intactes, "
        "parfaitement conservées grâce à l'absence totale d'humidité. Des analyses préliminaires en laboratoire ont révélé qu'il s'agissait "
        "d'une variété ancienne d'épeautre possédant des racines particulièrement profondes. La biologiste a immédiatement lancé des essais "
        "de germination en serre pour pour tester la viabilité des graines centenaires. En moins de sept jours, les premières jeunes pousses "
        "sont sorties de terre avec une vigueur surprenante. Les plants ont démontré une résistance exceptionnelle au manque d'eau, consommant "
        "quarante pour cent moins de liquide que les variétés modernes. Pour accélérer la multiplication de ces céréales rustiques, les agriculteurs "
        "voisins ont mis à disposition leurs leurs parcelles expérimentales. La première récolte a confirmé des rendements remarquables malgré "
        "l'absence quasi totale de précipitations durant la saison estivale. Cette redécouverte agricole inattendu offre désormais un espoir "
        "concret pour restaurer la fertilité des terres asséchées face aux bouleversements climatiques."
    ),
    "errors": [
        {
            "token_match": "céréales dépérissait",
            "error_word": "dépérissait",
            "error_type": "grammaire",
            "error_subtype": "accord_sujet_verbe",
            "correction": "dépérissaient",
            "explanation": "Le sujet 'Les cultures traditionnelles de céréales' est au pluriel, le verbe doit être 'dépérissaient'."
        },
        {
            "token_match": "par par une",
            "error_word": "par",
            "target_occurrence": 2,
            "error_type": "surface",
            "error_subtype": "mot_double",
            "correction": "(supprimer le mot en double)",
            "explanation": "La préposition 'par' est répétée deux fois consécutivement."
        },
        {
            "token_match": "hermétiquement clos",
            "error_word": "clos",
            "error_type": "grammaire",
            "error_subtype": "accord_participe_genre",
            "correction": "closes",
            "explanation": "Le participe qualifie 'douze jarres en terre cuite' (féminin pluriel) et doit s'accorder : 'closes'."
        },
        {
            "token_match": "pour pour tester",
            "error_word": "pour",
            "target_occurrence": 2,
            "error_type": "surface",
            "error_subtype": "mot_double",
            "correction": "(supprimer le mot en double)",
            "explanation": "La préposition 'pour' est répétée deux fois consécutivement."
        },
        {
            "token_match": "leurs leurs parcelles",
            "error_word": "leurs",
            "target_occurrence": 2,
            "error_type": "surface",
            "error_subtype": "mot_double",
            "correction": "(supprimer le mot en double)",
            "explanation": "Le déterminant possessif 'leurs' est répété deux fois consécutivement."
        },
        {
            "token_match": "agricole inattendu",
            "error_word": "inattendu",
            "error_type": "grammaire",
            "error_subtype": "accord_adjectif_genre",
            "correction": "inattendue",
            "explanation": "L'adjectif se rapporte à 'Cette redécouverte' (féminin singulier) et doit s'écrire 'inattendue'."
        }
    ],
    "quiz": [
        {
            "id": "q_t3_1",
            "question": "Où le docteur Élise Mercier a-t-elle découvert la cave scellée contenant les jarres ?",
            "options": [
                "Dans la cave d'une mairie de village",
                "Dans les ruines d'un ancien prieuré abandonné",
                "Au fond d'une ancienne mine de cuivre",
                "Dans les caves voûtées d'un moulin à eau"
            ],
            "correct_index": 1
        },
        {
            "id": "q_t3_2",
            "question": "Combien de jarres en terre cuite reposaient à l'intérieur de la chambre souterraine ?",
            "options": [
                "Six jarres",
                "Huit jarres",
                "Douze jarres",
                "Vingt-quatre jarres"
            ],
            "correct_index": 2
        },
        {
            "id": "q_t3_3",
            "question": "Quelle particularité remarquable a été démontrée par cette variété d'épeautre en serre ?",
            "options": [
                "Elle consomme 40 % moins de liquide que les variétés modernes",
                "Elle pousse deux fois plus vite en plein soleil",
                "Elle n'a besoin d'aucune terre pour germer",
                "Elle produit des épis géants de couleur bleue"
            ],
            "correct_index": 0
        }
    ]
}

def tokenize_and_tag(doc):
    raw = doc["raw_text"]
    import re
    tokens = raw.split()
    word_count = len(tokens)
    
    tagged_tokens = []
    for idx, tok in enumerate(tokens):
        clean = re.sub(r'^[^\wÀ-ÿ]+|[^\wÀ-ÿ]+$', '', tok).lower()
        tagged_tokens.append({
            "index": idx,
            "raw": tok,
            "clean": clean,
            "is_error": False,
            "error_id": None,
            "error_data": None
        })
    
    # Match errors and assign error_id
    for err_idx, err in enumerate(doc["errors"]):
        err_id = f"{doc['id']}_err_{err_idx}"
        target = err.get("error_word", "").lower()
        is_double_word = err.get("error_subtype") == "mot_double"
        
        # If token_match is provided, find where the phrase appears
        if "token_match" in err:
            phrase = err["token_match"].lower().split()
            found = False
            for i in range(len(tagged_tokens) - len(phrase) + 1):
                matches = True
                for j in range(len(phrase)):
                    clean_tok = tagged_tokens[i+j]["clean"]
                    if clean_tok != phrase[j].lower():
                        matches = False
                        break
                if matches:
                    # Determine acceptable indices
                    acceptable_indices = []
                    if is_double_word:
                        # For double words (e.g. "pour pour", "leur leur"), accept both words (i and i+1)
                        acceptable_indices = [i, i + 1]
                    elif err.get("token_match") == "a travaillé" or err.get("acceptable_phrase") == "a travaillé":
                        # For "a travaillé", accept either "a" or "travaillé" (both are part of the error)
                        acceptable_indices = [i, i + 1]
                    elif err.get("target_occurrence") == 2:
                        acceptable_indices = [i + 1]
                    else:
                        pick_idx = i
                        for j in range(len(phrase)):
                            if tagged_tokens[i+j]["clean"] == target:
                                pick_idx = i + j
                                break
                        acceptable_indices = [pick_idx]
                    
                    err_info = {
                        "error_id": err_id,
                        "error_type": err["error_type"],
                        "error_subtype": err["error_subtype"],
                        "correction": err["correction"],
                        "explanation": err["explanation"],
                        "acceptable_indices": acceptable_indices
                    }

                    for a_idx in acceptable_indices:
                        tagged_tokens[a_idx]["is_error"] = True
                        tagged_tokens[a_idx]["error_id"] = err_id
                        tagged_tokens[a_idx]["error_data"] = err_info
                    
                    found = True
                    break
            if not found:
                raise Exception(f"Could not find token_match: {err['token_match']} in {doc['id']}")
        elif "word_index" in err:
            idx = err["word_index"]
            err_info = {
                "error_id": err_id,
                "error_type": err["error_type"],
                "error_subtype": err["error_subtype"],
                "correction": err["correction"],
                "explanation": err["explanation"],
                "acceptable_indices": [idx]
            }
            tagged_tokens[idx]["is_error"] = True
            tagged_tokens[idx]["error_id"] = err_id
            tagged_tokens[idx]["error_data"] = err_info

    # Verify errors summary
    errors_summary = []
    for err_idx, err in enumerate(doc["errors"]):
        err_id = f"{doc['id']}_err_{err_idx}"
        matched_toks = [t for t in tagged_tokens if t.get("error_id") == err_id]
        errors_summary.append({
            "error_id": err_id,
            "token_indices": [t["index"] for t in matched_toks],
            "words": [t["raw"] for t in matched_toks],
            "clean_words": [t["clean"] for t in matched_toks],
            "error_type": err["error_type"],
            "error_subtype": err["error_subtype"],
            "correction": err["correction"],
            "explanation": err["explanation"]
        })

    print(f"{doc['id']} ({doc['title']}): {word_count} words, {len(errors_summary)} planted errors tagged.")
    for es in errors_summary:
        print(f"   -> [{es['error_id']}] tokens {es['token_indices']} '{' / '.join(es['words'])}' ({es['error_type']}/{es['error_subtype']}) : {es['explanation']}")
    
    return {
        "id": doc["id"],
        "title": doc["title"],
        "description": doc["description"],
        "isPractice": doc["isPractice"],
        "wordCount": word_count,
        "rawText": doc["raw_text"],
        "tokens": tagged_tokens,
        "errorCount": len(doc["errors"]),
        "errors": errors_summary,
        "errorsSummary": errors_summary,
        "quiz": doc["quiz"]
    }

import os

data_texts = {
    "texts": [
        tokenize_and_tag(practice_text),
        tokenize_and_tag(text1),
        tokenize_and_tag(text2),
        tokenize_and_tag(text3)
    ]
}

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(SCRIPT_DIR, "data")
os.makedirs(DATA_DIR, exist_ok=True)

TEXTS_JSON_PATH = os.path.join(DATA_DIR, "texts.json")
with open(TEXTS_JSON_PATH, "w", encoding="utf-8") as f:
    json.dump(data_texts, f, ensure_ascii=False, indent=2)

# Also update data.js (which embeds both texts and latin square for zero-config offline execution)
LATIN_JSON_PATH = os.path.join(DATA_DIR, "latin_square.json")
latin_data = {}
if os.path.exists(LATIN_JSON_PATH):
    with open(LATIN_JSON_PATH, "r", encoding="utf-8") as f:
        latin_data = json.load(f)

DATA_JS_PATH = os.path.join(DATA_DIR, "data.js")
embedded_bundle = {
    "texts": data_texts,
    "latin": latin_data
}
with open(DATA_JS_PATH, "w", encoding="utf-8") as f:
    f.write("window.EMBEDDED_EXPERIMENT_DATA = " + json.dumps(embedded_bundle, ensure_ascii=False) + ";\n")

print(f"\n[OK] Fichiers générés avec succès :")
print(f"  -> {TEXTS_JSON_PATH}")
print(f"  -> {DATA_JS_PATH}")
