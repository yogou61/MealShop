// update-recipes.js
import fetch from 'node-fetch';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config(); 

// --- CONFIGURATION ---
const RECIPES_PER_CATEGORY_OR_AREA = 50; // Garder à 1 pour le débogage
const API_CALL_DELAY_MEALDB = 200; 
const API_CALL_DELAY_TRANSLATION = 600; 
const TRANSLATE_CONTENT = true; 
const TARGET_LANGUAGE = 'fr';
const DEEPL_API_KEY = process.env.DEEPL_API_KEY;
const TRANSLATIONS_CACHE_FILE = './translations_cache.json';

console.log("--- DÉBUT DÉBOGAGE CLÉ API ---");
console.log("Clé API DeepL (tronquée):", DEEPL_API_KEY ? DEEPL_API_KEY.substring(0,5) + "..." : "NON DÉFINIE");
if (!DEEPL_API_KEY && TRANSLATE_CONTENT) {
    console.warn("AVERTISSEMENT: Clé API DeepL non chargée ET TRANSLATE_CONTENT est true. La traduction sera désactivée.");
} else if (DEEPL_API_KEY && TRANSLATE_CONTENT) {
    console.log("INFO: Clé API DeepL chargée, traduction activée.");
} else {
    console.log("INFO: Traduction désactivée via TRANSLATE_CONTENT ou clé manquante.");
}
console.log("--- FIN DÉBOGAGE CLÉ API ---");


// --- MAPPINGS ---
const ingredientToRayonMapping = { /* ...votre mapping... */ 
    'farine': 'Farines & Céréales', 'blé': 'Farines & Céréales', 'avoine': 'Farines & Céréales', 'riz': 'Farines & Céréales', 'pâtes': 'Farines & Céréales', 'semoule': 'Farines & Céréales', 'céréales': 'Farines & Céréales', 'pain': 'Farines & Céréales', 'biscotte': 'Farines & Céréales', 'nouilles': 'Farines & Céréales', 'chapelure': 'Farines & Céréales',
    'lait': 'Produits Laitiers & Œufs', 'crème fraîche': 'Produits Laitiers & Œufs', 'creme fraiche': 'Produits Laitiers & Œufs', 'crème': 'Produits Laitiers & Œufs', 'yaourt': 'Produits Laitiers & Œufs', 'fromage': 'Produits Laitiers & Œufs', 'beurre': 'Produits Laitiers & Œufs', 'œuf': 'Produits Laitiers & Œufs', 'oeuf': 'Produits Laitiers & Œufs', 'œufs': 'Produits Laitiers & Œufs', 'parmesan': 'Produits Laitiers & Œufs', 'cheddar': 'Produits Laitiers & Œufs',
    'huile': 'Corps Gras', 'vinaigre': 'Corps Gras', 'margarine': 'Corps Gras', 'graisse': 'Corps Gras', 'saindoux': 'Corps Gras',
    'sel': 'Épices & Herbes', 'poivre': 'Épices & Herbes', 'épice': 'Épices & Herbes', 'herbe': 'Épices & Herbes', 'basilic': 'Épices & Herbes', 'persil': 'Épices & Herbes', 'curry': 'Épices & Herbes', 'paprika': 'Épices & Herbes', 'origan': 'Épices & Herbes', 'thym': 'Épices & Herbes', 'moutarde': 'Épices & Herbes', 'coriandre': 'Épices & Herbes', 'cumin': 'Épices & Herbes', 'gingembre': 'Épices & Herbes', 'muscade': 'Épices & Herbes',
    'tomate': 'Fruits & Légumes', 'carotte': 'Fruits & Légumes', 'oignon': 'Fruits & Légumes', 'ail': 'Fruits & Légumes', 'échalote': 'Fruits & Légumes', 'pomme de terre': 'Fruits & Légumes', 'courgette': 'Fruits & Légumes', 'poivron': 'Fruits & Légumes', 'salade': 'Fruits & Légumes', 'fruit': 'Fruits & Légumes', 'légume': 'Fruits & Légumes', 'pomme': 'Fruits & Légumes', 'banane': 'Fruits & Légumes', 'citron': 'Fruits & Légumes', 'orange': 'Fruits & Légumes', 'champignon': 'Fruits & Légumes', 'poireau': 'Fruits & Légumes', 'aubergine': 'Fruits & Légumes', 'concombre': 'Fruits & Légumes', 'petit pois': 'Fruits & Légumes', 'brocoli': 'Fruits & Légumes', 'chou': 'Fruits & Légumes', 'épinard': 'Fruits & Légumes',
    'poulet': 'Viandes & Poissons', 'dinde': 'Viandes & Poissons', 'bœuf': 'Viandes & Poissons', 'boeuf': 'Viandes & Poissons', 'porc': 'Viandes & Poissons', 'poisson': 'Viandes & Poissons', 'saumon': 'Viandes & Poissons', 'thon': 'Viandes & Poissons', 'crevette': 'Viandes & Poissons', 'viande': 'Viandes & Poissons', 'jambon': 'Viandes & Poissons', 'lard': 'Viandes & Poissons', 'agneau': 'Viandes & Poissons', 'canard': 'Viandes & Poissons', 'saucisse': 'Viandes & Poissons',
    'conserve': 'Conserves & Plats Préparés', 'bocal': 'Conserves & Plats Préparés', 'plat préparé': 'Conserves & Plats Préparés', 'maïs': 'Conserves & Plats Préparés',
    'sucre': 'Sucres & Confiseries', 'chocolat': 'Sucres & Confiseries', 'miel': 'Sucres & Confiseries', 'confiture': 'Sucres & Confiseries', 'bonbon': 'Sucres & Confiseries', 'sirop': 'Sucres & Confiseries', 'cassonade': 'Sucres & Confiseries',
    'eau': 'Liquides', 'jus': 'Liquides', 'soda': 'Liquides', 'vin': 'Liquides', 'bière': 'Liquides', 'bouillon': 'Liquides',
    'flour': 'Farines & Céréales', 'wheat': 'Farines & Céréales', 'oats': 'Farines & Céréales', 'rice': 'Farines & Céréales', 'pasta': 'Farines & Céréales', 'bread': 'Farines & Céréales', 'noodles': 'Farines & Céréales', 'breadcrumbs': 'Farines & Céréales', 'plain flour': 'Farines & Céréales',
    'milk': 'Produits Laitiers & Œufs', 'cream': 'Produits Laitiers & Œufs', 'sour cream': 'Produits Laitiers & Œufs', 'cheese': 'Produits Laitiers & Œufs', 'butter': 'Produits Laitiers & Œufs', 'egg': 'Produits Laitiers & Œufs', 'eggs': 'Produits Laitiers & Œufs', 'yogurt': 'Produits Laitiers & Œufs', 'parmesan': 'Produits Laitiers & Œufs', 'cheddar': 'Produits Laitiers & Œufs', 'mozzarella': 'Produits Laitiers & Œufs', 'egg yolks': 'Produits Laitiers & Œufs',
    'oil': 'Corps Gras', 'olive oil': 'Corps Gras', 'vegetable oil': 'Corps Gras', 'sunflower oil': 'Corps Gras', 'vinegar': 'Corps Gras', 'lard': 'Corps Gras', 'rapeseed oil': 'Corps Gras',
    'salt': 'Épices & Herbes', 'pepper': 'Épices & Herbes', 'black pepper': 'Épices & Herbes', 'spice': 'Épices & Herbes', 'herbs': 'Épices & Herbes', 'garlic powder': 'Épices & Herbes', 'onion powder': 'Épices & Herbes', 'basil': 'Épices & Herbes', 'parsley': 'Épices & Herbes', 'oregano': 'Épices & Herbes', 'thyme': 'Épices & Herbes', 'coriander': 'Épices & Herbes', 'cumin': 'Épices & Herbes', 'ginger': 'Épices & Herbes', 'nutmeg': 'Épices & Herbes', 'chili powder': 'Épices & Herbes', 'paprika': 'Épices & Herbes', 'mustard': 'Épices & Herbes',
    'tomato': 'Fruits & Légumes', 'tomatoes': 'Fruits & Légumes', 'potato': 'Fruits & Légumes', 'potatoes': 'Fruits & Légumes', 'onion': 'Fruits & Légumes', 'onions': 'Fruits & Légumes', 'garlic': 'Fruits & Légumes', 'carrot': 'Fruits & Légumes', 'carrots': 'Fruits & Légumes', 'lemon': 'Fruits & Légumes', 'apple': 'Fruits & Légumes', 'broccoli': 'Fruits & Légumes', 'spinach': 'Fruits & Légumes', 'bell pepper': 'Fruits & Légumes', 'mushrooms': 'Fruits & Légumes', 'leek': 'Fruits & Légumes', 'eggplant': 'Fruits & Légumes', 'cucumber': 'Fruits & Légumes', 'peas': 'Fruits & Légumes', 'cabbage': 'Fruits & Légumes', 'celery': 'Fruits & Légumes', 'lettuce': 'Fruits & Légumes', 'zucchini': 'Fruits & Légumes',
    'chicken': 'Viandes & Poissons', 'beef': 'Viandes & Poissons', 'pork': 'Viandes & Poissons', 'fish': 'Viandes & Poissons', 'salmon': 'Viandes & Poissons', 'tuna': 'Viandes & Poissons', 'shrimp': 'Viandes & Poissons', 'bacon': 'Viandes & Poissons', 'lamb': 'Viandes & Poissons', 'duck': 'Viandes & Poissons', 'sausage': 'Viandes & Poissons', 'minced beef': 'Viandes & Poissons', 'ground beef': 'Viandes & Poissons', 'beef stock': 'Viandes & Poissons',
    'canned': 'Conserves & Plats Préparés', 'beans': 'Conserves & Plats Préparés', 'corn': 'Conserves & Plats Préparés', 'coconut milk': 'Conserves & Plats Préparés', 'green beans': 'Conserves & Plats Préparés',
    'sugar': 'Sucres & Confiseries', 'chocolate': 'Sucres & Confiseries', 'honey': 'Sucres & Confiseries', 'brown sugar': 'Sucres & Confiseries', 'maple syrup': 'Sucres & Confiseries',
    'water': 'Liquides', 'wine': 'Liquides', 'stock': 'Liquides', 'broth': 'Liquides', 'juice': 'Liquides', 'soy sauce': 'Liquides', 'red wine': 'Liquides',
    'puff pastry': 'Autres',
};
const ingredientNameTranslationMapping = { /* ...votre longue liste... */ 
    "beef": "bœuf", "pork": "porc", "lamb": "agneau", "veal": "veau", "chicken": "poulet",
    "duck": "canard", "turkey": "dinde", "chicken breast": "blanc de poulet", "chicken breasts": "blancs de poulet",
    "chicken thigh": "cuisse de poulet", "chicken thighs": "cuisses de poulet",
    "ground beef": "bœuf haché", "minced beef": "bœuf haché", "bacon": "lard", 
    "ham": "jambon", "sausage": "saucisse", "salami": "salami", "goat": "chèvre",
    "fish": "poisson", "salmon": "saumon", "cod": "cabillaud", "tuna": "thon", "haddock": "églefin",
    "smoked haddock": "églefin fumé", "trout": "truite", "mackerel": "maquereau", "sardine": "sardine", "sardines": "sardines",
    "prawn": "crevette", "prawns": "crevettes", "king prawns": "grosses crevettes", "shrimp": "crevette",
    "potato": "pomme de terre", "potatoes": "pommes de terre", "small potatoes": "petites pommes de terre",
    "floury potatoes": "pommes de terre farineuses", "carrot": "carotte", "carrots": "carottes",
    "onion": "oignon", "onions": "oignons", "red onion": "oignon rouge", "red onions": "oignons rouges",
    "spring onion": "oignon nouveau", "spring onions": "oignons nouveaux", "scallions": "cébettes",
    "garlic": "ail", "garlic clove": "gousse d'ail", "garlic cloves": "gousses d'ail", "minced garlic": "ail haché",
    "shallot": "échalote", "shallots": "échalotes", "challots": "échalotes", 
    "leek": "poireau", "leeks": "poireaux", "celery": "céleri",
    "tomato": "tomate", "tomatoes": "tomates", "cherry tomatoes": "tomates cerises", "vine tomatoes": "tomates en grappe",
    "plum tomatoes": "tomates olivettes", "diced tomatoes": "tomates en dés", "chopped tomatoes": "tomates concassées",
    "sun-dried tomatoes": "tomates séchées", "bell pepper": "poivron", "red pepper": "poivron rouge",
    "green pepper": "poivron vert", "yellow pepper": "poivron jaune",
    "chili pepper": "piment", "chilli": "piment", "red chilli": "piment rouge", "green chilli": "piment vert",
    "cucumber": "concombre", "zucchini": "courgette", "courgettes": "courgettes",
    "eggplant": "aubergine", "eggplants": "aubergines", "baby aubergine": "mini aubergine",
    "pumpkin": "citrouille", "squash": "courge", "butternut squash": "courge butternut",
    "mushroom": "champignon", "mushrooms": "champignons", "button mushroom": "champignon de Paris",
    "shiitake mushroom": "shiitake", "shiitake mushrooms": "shiitakes", "wild mushrooms": "champignons des bois",
    "chestnut mushroom": "champignon de Paris brun", "lettuce": "laitue", "iceberg lettuce": "laitue iceberg",
    "little gem lettuce": "sucrine", "spinach": "épinards", "cabbage": "chou",
    "brussels sprouts": "choux de Bruxelles", "broccoli": "brocoli", "cauliflower": "chou-fleur",
    "asparagus": "asperge", "artichoke": "artichaut", "beetroot": "betterave", "radish": "radis",
    "turnip": "navet", "parsnip": "panais", "sweet potato": "patate douce",
    "corn": "maïs", "sweetcorn": "maïs doux", "pea": "petit pois", "peas": "petits pois",
    "sugar snap peas": "pois gourmand", "green bean": "haricot vert", "green beans": "haricots verts",
    "broad bean": "fève", "broad beans": "fèves", "bean": "haricot", "beans": "haricots",
    "kidney beans": "haricots rouges", "cannellini beans": "haricots cannellini", "butter beans": "haricots de Lima",
    "black beans": "haricots noirs", "borlotti beans": "haricots borlotti", "refried beans": "purée de haricots",
    "lentil": "lentille", "lentils": "lentilles", "brown lentils": "lentilles brunes", "green red lentils": "lentilles corail/vertes",
    "toor dal": "lentilles corail (cassées)", "chickpea": "pois chiche", "chickpeas": "pois chiches",
    "avocado": "avocat", "ginger": "gingembre", "fennel": "fenouil", "fennel bulb": "bulbe de fenouil",
    "kale": "chou kale", "arugula": "roquette", "rocket": "roquette", "endive": "endive",
    "Swiss chard": "blette", "water chestnut": "châtaigne d'eau", "bean sprouts": "germes de haricot mungo",
    "jerusalem artichokes": "topinambours", "celeriac": "céleri-rave", "swede": "rutabaga",
    "fruit": "fruit", "apple": "pomme", "apples": "pommes", "braeburn apples": "pommes Braeburn",
    "bramley apples": "pommes Bramley", "pear": "poire", "orange": "orange", "lemon": "citron",
    "lemons": "citrons", "lime": "citron vert", "grapefruit": "pamplemousse", "banana": "banane",
    "grape": "raisin", "strawberry": "fraise", "strawberries": "fraises", "raspberry": "framboise",
    "raspberries": "framboises", "blackberry": "mûre", "blackberries": "mûres",
    "blueberry": "myrtille", "blueberries": "myrtilles", "cranberry": "canneberge",
    "cherry": "cerise", "glace cherry": "cerise confite", "peach": "pêche", "peaches": "pêches",
    "nectarine": "nectarine", "apricot": "abricot", "apricots": "abricots", "dried apricots": "abricots secs",
    "plum": "prune", "fig": "figue", "date": "datte", "pomegranate": "grenade", "coconut": "noix de coco",
    "passion fruit": "fruit de la passion", "rhubarb": "rhubarbe", "dried fruit": "fruits secs",
    "flour": "farine", "plain flour": "farine T55", "all-purpose flour": "farine T55",
    "self-raising flour": "farine à levure incorporée", "cake flour": "farine à gâteau",
    "bread flour": "farine de gruau", "wholemeal flour": "farine complète", "wholewheat flour": "farine de blé complet",
    "buckwheat": "sarrasin", "buckwheat flour": "farine de sarrasin", "cornstarch": "fécule de maïs",
    "corn flour": "farine de maïs", "rice flour": "farine de riz", "oat flour": "farine d'avoine",
    "almond flour": "poudre d'amande", "semolina": "semoule", "rice": "riz", "white rice": "riz blanc",
    "brown rice": "riz complet", "basmati rice": "riz basmati", "sushi rice": "riz à sushi",
    "paella rice": "riz rond (pour paella)", "noodles": "nouilles", "udon noodles": "nouilles udon",
    "rice stick noodles": "vermicelles de riz", "rice vermicelli": "vermicelles de riz",
    "lasagne sheets": "feuilles de lasagne", "couscous": "couscous", "quinoa": "quinoa",
    "oats": "flocons d'avoine", "rolled oats": "flocons d'avoine", "breadcrumbs": "chapelure",
    "milk": "lait", "cream": "crème", "sour cream": "crème aigre", "cheese": "fromage",
    "butter": "beurre", "egg": "œuf", "eggs": "œufs", "yogurt": "yaourt", "parmesan": "parmesan",
    "cheddar": "cheddar", "mozzarella": "mozzarella", "egg yolks": "jaunes d'œuf",
    "coconut cream": "crème de coco", "condensed milk": "lait concentré sucré",
    "double cream": "crème double", "creme fraiche": "crème fraîche", "greek yogurt": "yaourt grec",
    "parmesan cheese": "parmesan râpé", "feta": "feta", "ricotta": "ricotta",
    "cream cheese": "fromage frais à tartiner", "salted butter": "beurre demi-sel", "unsalted butter": "beurre doux",
    "egg white": "blanc d'œuf", "flax eggs": "œufs de lin", "soya milk": "lait de soja", "vegan butter": "margarine végétale",
    "oil": "huile", "olive oil": "huile d'olive", "vegetable oil": "huile végétale",
    "sunflower oil": "huile de tournesol", "rapeseed oil": "huile de colza", "vinegar": "vinaigre",
    "sesame seed oil": "huile de sésame",
    "salt": "sel", "pepper": "poivre", "black pepper": "poivre noir", "spice": "épice",
    "herbs": "herbes", "garlic powder": "ail en poudre", "onion powder": "oignon en poudre",
    "basil": "basilic", "parsley": "persil", "oregano": "origan", "thyme": "thym",
    "coriander": "coriandre", "cumin": "cumin", "nutmeg": "noix de muscade",
    "chili powder": "poudre de chili", "mustard": "moutarde", "sea salt": "sel de mer",
    "cinnamon stick": "bâton de cannelle", "bay leaf": "feuille de laurier", "bay leaves": "feuilles de laurier",
    "allspice": "quatre-épices", "star anise": "anis étoilé", "cardamom": "cardamome",
    "ground cumin": "cumin moulu", "ground coriander": "coriandre moulue", "turmeric": "curcuma",
    "saffron": "safran", "cayenne pepper": "piment de Cayenne", "red chilli flakes": "flocons de piment rouge",
    "curry powder": "curry", "garam masala": "garam masala", "biryani masala": "masala pour biryani",
    "madras paste": "pâte de Madras", "massaman curry paste": "pâte de curry Massaman", "thai green curry paste": "pâte de curry vert thaï",
    "thai red curry paste": "pâte de curry rouge thaï",
    "dried oregano": "origan séché", "fresh thyme": "thym frais", "rosemary": "romarin", "sage": "sauge", "mint": "menthe",
    "tarragon": "estragon", "chopped parsley": "persil haché",
    "chives": "ciboulette", "dill": "aneth",
    "fennel seed": "graine de fenouil", "fennel seeds": "graines de fenouil", "mustard powder": "moutarde en poudre",
    "english mustard": "moutarde anglaise forte", "dijon mustard": "moutarde de Dijon",
    "sesame seed": "graine de sésame", "sesame seeds": "graines de sésame", "vanilla extract": "extrait de vanille",
    "ginger cordial": "sirop de gingembre", "ginger paste": "pâte de gingembre", "ginger garlic paste": "pâte ail-gingembre",
    "harissa spice": "épices harissa", "ras el hanout": "ras el hanout", "fenugreek": "fenugrec",
    "white wine vinegar": "vinaigre de vin blanc", "red wine vinegar": "vinaigre de vin rouge",
    "balsamic vinegar": "vinaigre balsamique", "apple cider vinegar": "vinaigre de cidre",
    "ketchup": "ketchup", "tomato ketchup": "ketchup", "mayonnaise": "mayonnaise",
    "soy sauce": "sauce soja", "fish sauce": "sauce nuoc mam", "thai fish sauce": "sauce poisson thaï",
    "Worcestershire sauce": "sauce Worcestershire", "hot sauce": "sauce piquante", "Tabasco": "Tabasco", "Tabasco sauce": "sauce Tabasco",
    "Sriracha": "sriracha", "harissa": "harissa (pâte)", "oyster sauce": "sauce d'huître",
    "duck sauce": "sauce aigre-douce (canard)", "pickle juice": "saumure de cornichons", "mirin": "mirin",
    "sake": "saké", "cooking wine": "vin de cuisine", "passata": "coulis de tomates",
    "tomato puree": "concentré de tomate", "tomato paste": "double concentré de tomate",
    "sugar": "sucre", "caster sugar": "sucre semoule", "icing sugar": "sucre glace",
    "brown sugar": "sucre roux", "dark brown soft sugar": "vergeoise brune", "light brown soft sugar": "vergeoise blonde",
    "demerara sugar": "sucre demerara", "muscovado sugar": "sucre muscovado", "honey": "miel",
    "maple syrup": "sirop d'érable", "golden syrup": "sirop de mélasse léger",
    "molasses": "mélasse", "black treacle": "mélasse noire", "corn syrup": "sirop de maïs",
    "glucose syrup": "sirop de glucose", "agave syrup": "sirop d'agave", "chocolate": "chocolat",
    "dark chocolate": "chocolat noir", "milk chocolate": "chocolat au lait", "white chocolate": "chocolat blanc",
    "cocoa powder": "cacao en poudre", "cacao": "cacao (brut)", "chocolate chips": "pépites de chocolat",
    "dark chocolate chips": "pépites de chocolat noir", "white chocolate chips": "pépites de chocolat blanc",
    "jam": "confiture", "raspberry jam": "confiture de framboise", "apricot jam": "confiture d'abricot",
    "marmalade": "marmelade", "jelly": "gelée", "red wine jelly": "gelée de vin rouge",
    "nut": "noix (générique)", "almond": "amande", "almonds": "amandes", "ground almonds": "poudre d'amandes", "flaked almonds": "amandes effilées",
    "walnut": "noix", "walnuts": "noix", "hazelnut": "noisette", "hazelnuts": "noisettes", "pecan": "noix de pécan", "pecan nuts": "noix de pécan",
    "cashew": "noix de cajou", "cashew nuts": "noix de cajou", "cashews": "noix de cajou", "pistachio": "pistache",
    "peanut": "cacahuète", "peanuts": "cacahuètes", "pine nut": "pignon de pin", "pine nuts": "pignons de pin",
    "macadamia": "noix de macadamia", "chestnut": "châtaigne", "chestnuts": "châtaignes", "seed": "graine", "seeds": "graines",
    "pumpkin seed": "graine de courge", "sunflower seed": "graine de tournesol", "flaxseed": "graine de lin",
    "chia seed": "graine de chia", "hemp seed": "graine de chanvre", "poppy seed": "graine de pavot",
    "baking powder": "levure chimique", "bicarbonate of soda": "bicarbonate de soude", "yeast": "levure",
    "active dry yeast": "levure sèche active", "instant yeast": "levure instantanée", "fresh yeast": "levure fraîche",
    "gelatin": "gélatine", "gelatine leafs": "feuilles de gélatine", "powdered gelatin": "gélatine en poudre",
    "agar-agar": "agar-agar", "almond extract": "extrait d'amande amère", "lemon extract": "extrait de citron", "lemon zest": "zeste de citron",
    "orange zest": "zeste d'orange", "orange blossom water": "eau de fleur d'oranger", "rose water": "eau de rose",
    "marzipan": "massepain", "almond paste": "pâte d'amande", "fondant": "fondant (pâtisserie)",
    "food coloring": "colorant alimentaire", "pink food colouring": "colorant alimentaire rose", "glucose": "glucose",
    "glycerin": "glycérine", "meringue powder": "poudre à meringue", "meringue nests": "nids de meringue",
    "pastry cream": "crème pâtissière", "puff pastry": "pâte feuilletée", "shortcrust pastry": "pâte brisée",
    "sweet pastry": "pâte sucrée", "filo pastry": "pâte filo", "custard": "crème anglaise (ou flan)", "custard powder": "poudre à crème anglaise",
    "digestive biscuits": "biscuits type Petit Beurre", "peanut cookies": "cookies au beurre de cacahuète",
    "mars bar": "barre Mars", "rice krispies": "Rice Krispies",
    "plain chocolate": "chocolat noir pâtissier", "water": "eau", "cold water": "eau froide", "boiling water": "eau bouillante", "ice": "glace",
    "stock": "bouillon", "chicken stock": "bouillon de volaille", "beef stock": "fond de bœuf",
    "vegetable stock": "bouillon de légumes", "fish stock": "fumet de poisson", "chicken stock cube": "cube de bouillon de volaille",
    "beef stock concentrate": "fond de bœuf concentré", "vegetable stock cube": "cube de bouillon de légumes",
    "alcohol": "alcool", "wine": "vin", "red wine": "vin rouge", "white wine": "vin blanc", "dry white wine": "vin blanc sec",
    "beer": "bière", "stout": "stout (bière brune)", "cider": "cidre", "brandy": "brandy", "cognac": "cognac",
    "rum": "rhum", "dark rum": "rhum ambré", "whisky": "whisky", "sherry": "xérès", "port": "porto",
    "liqueur": "liqueur", "grand marnier": "Grand Marnier", "coffee": "café", "tea": "thé",
    "bread": "pain", "toast": "pain grillé", "roll": "petit pain", "baguette": "baguette", "buns": "pains burger",
    "sesame seed burger buns": "pains burger sésame", "english muffins": "muffins anglais",
    "crouton": "croûton", "cracker": "cracker", "vinaigrette": "vinaigrette", "dressing": "sauce salade",
    "marinade": "marinade", "rub": "mélange d'épices à frotter", "glaze": "glaçage (salé ou sucré)",
    "garnish": "garniture", "seasoning": "assaisonnement", "fajita seasoning": "épices fajitas",
    "italian seasoning": "mélange italien",
    "starch": "amidon/fécule", "potato starch": "fécule de pomme de terre", "tapioca starch": "fécule de tapioca",
    "tomato paste": "concentré de tomate", "tomato puree": "purée de tomates",
    "cream of tartar": "crème de tartre", "bouquet garni": "bouquet garni", "herbs de Provence": "herbes de Provence",
    "five-spice powder": "poudre cinq-épices", "tofu": "tofu", "tempeh": "tempeh", "seitan": "seitan",
    "nutritional yeast": "levure maltée", "miso": "miso", "wasabi": "wasabi", "seaweed": "algue",
    "nori": "nori", "wakame": "wakame", "kombu": "kombu", "dulse": "dulse",
    "enchilada sauce": "sauce enchilada", "corn tortillas": "tortillas de maïs", "hard taco shells": "coques tacos",
    "flour tortilla": "tortilla de blé", "shredded mexican cheese": "fromage mexicain râpé",
    "monterey jack cheese": "Monterey Jack", "colby jack cheese": "Colby Jack", "grape tomatoes": "tomates cerises",
    "jalapeno": "piment jalapeño", "green salsa": "salsa verde",
    "pita bread": "pain pita", "shortening": "graisse végétale", "mincemeat": "fruits confits épicés (mincemeat)",
    "suet": "graisse de rognon", "peanut brittle": "nougatine cacahuète", "doner meat": "viande kebab",
    "gouda cheese": "gouda", "kielbasa": "saucisse kielbasa", "sauerkraut": "choucroute",
    "caraway seed": "graines de carvi", "wood ear mushrooms": "champignons noirs (oreilles de Judas)",
    "pork belly": "poitrine de porc", "ackee": "aki (fruit)", "salt cod": "morue salée",
    "mulukhiyah": "mloukhiya (corète potagère)",
    "peanut butter": "beurre de cacahuète",
    "tamarind paste": "pâte de tamarin",
    "lime leaves": "feuilles de combava", "kaffir lime leaves": "feuilles de combava",
    "mixed grain": "mélange de céréales/graines",
    "celeriac": "céleri-rave",
    "swede": "rutabaga",
    "fromage frais": "fromage frais",
    "gruyere": "gruyère", "gruyère cheese": "gruyère",
    "chorizo": "chorizo",
    "sultanas": "raisins de Smyrne (sultanes)", "currants": "raisins de Corinthe",
    "goose fat": "graisse d'oie",
    "lamb kidney": "rognon d'agneau", "lamb shoulder": "épaule d'agneau", "lamb leg": "gigot d'agneau",
    "lamb mince": "agneau haché",
    "khus khus": "khus khus (graines de pavot blanc)", 
    "red chilli powder": "poudre de piment rouge",
    "biryani masala": "mélange d'épices biryani", 
    "full fat yogurt": "yaourt entier",
    "madras paste": "pâte de curry Madras",
    "italian fennel sausages": "saucisses italiennes au fenouil", 
    "smoky paprika": "paprika fumé",
    "pitted black olives": "olives noires dénoyautées",
    "rigatoni": "rigatoni",
    "paccheri pasta": "paccheri", 
    "goat meat": "viande de chèvre", 
    "garlic sauce": "sauce à l'ail",
    "raw king prawns": "grosses crevettes crues", 
    "baby plum tomatoes": "petites tomates prunes", 
    "fresh basil": "basilic frais",
    "farfalle": "farfalle", 
    "green olives": "olives vertes", 
    "ackee": "aki", 
    "ras el hanout": "ras el hanout", 
    "harissa spice": "harissa en poudre", 
    "toor dal": "lentilles jaunes", 
    "mustard seeds": "graines de moutarde", 
    "roasted vegetables": "légumes rôtis", 
    "udon noodles": "nouilles udon", 
    "beef shin": "jarret de bœuf", 
    "chestnut mushroom": "champignon brun", 
    "celeriac": "céleri-rave", 
    "canola oil": "huile de colza", 
    "beef fillet": "filet de bœuf",
    "heavy cream": "crème liquide entière", 
    "dijon mustard": "moutarde de Dijon", 
    "tabasco sauce": "sauce Tabasco", 
    "egg white": "blanc d'œuf", 
    "cooking wine": "vin de cuisine", 
    "hotsauce": "sauce piquante", 
    "turkey mince": "dinde hachée", 
    "barbeque sauce": "sauce barbecue", 
    "linguine pasta": "linguine", 
    "sugar snap peas": "pois gourmands", 
    "clotted cream": "crème caillée", 
    "fettuccine": "fettuccine", 
    "monterey jack cheese": "Monterey Jack", 
    "colby jack cheese": "Colby Jack", 
    "dried oregano": "origan séché", 
    "pilchards": "pilchards", 
    "pecorino": "pecorino", 
    "duck legs": "cuisses de canard", 
    "paccheri pasta": "paccheri", 
    "goat meat": "viande de chèvre", 
    "garlic sauce": "sauce à l'ail", 
    "gouda cheese": "gouda", 
    "saffron": "safran", 
    "lamb shoulder": "épaule d'agneau", 
    "italian fennel sausages": "saucisses italiennes au fenouil", 
    "smoky paprika": "paprika fumé", 
    "pitted black olives": "olives noires dénoyautées", 
    "rigatoni": "rigatoni", 
    "lamb leg": "gigot d'agneau", 
    "pita bread": "pain pita", 
    "madras paste": "pâte de curry Madras", 
    "red chilli powder": "poudre de piment rouge", 
    "biryani masala": "mélange d'épices biryani", 
    "full fat yogurt": "yaourt entier", 
    "lamb kidney": "rognon d'agneau", 
    "kielbasa": "kielbasa", 
    "sauerkraut": "choucroute", 
    "caraway seed": "carvi", 
    "wood ear mushrooms": "champignons noirs", 
    "pork belly": "poitrine de porc", 
    "mulukhiyah": "mloukhiya", 
    "tamarind paste": "pâte de tamarin", 
    "lime leaves": "feuilles de combava", 
    "kaffir lime leaves": "feuilles de combava", 
    "rice noodles": "nouilles de riz", 
    "raw king prawns": "grosses crevettes crues", 
    "baby plum tomatoes": "petites tomates prunes", 
    "fresh basil": "basilic frais", 
    "farfalle": "farfalle", 
    "green olives": "olives vertes", 
    "salt cod": "morue salée", 
    "ackee": "aki", 
    "vegetable stock cube": "cube de bouillon de légumes", 
    "broad beans": "fèves", 
    "ras el hanout": "ras el hanout", 
    "harissa spice": "harissa en poudre", 
    "coriander leaf": "feuille de coriandre", 
    "red chilli": "piment rouge", 
    "tamarind ball": "boule de tamarin",
    "pickled cucumber": "concombre au vinaigre"
};

const categoryMappings = { 
    "Beef": { tag: "familial", fr: "Bœuf", budget: "moyen", temps: "moyen" },
    "Breakfast": { tag: "économique", fr: "Petit déjeuner", budget: "faible", temps: "rapide" },
    "Chicken": { tag: "familial", fr: "Poulet", budget: "moyen", temps: "moyen" },
    "Dessert": { tag: "familial", fr: "Dessert", budget: "variable", temps: "variable" },
    "Goat": { tag: "familial", fr: "Chèvre", budget: "élevé", temps: "long" },
    "Lamb": { tag: "familial", fr: "Agneau", budget: "élevé", temps: "long" },
    "Miscellaneous": { tag: "familial", fr: "Divers", budget: "variable", temps: "variable" },
    "Pasta": { tag: "économique", fr: "Pâtes", budget: "faible", temps: "rapide" },
    "Pork": { tag: "familial", fr: "Porc", budget: "moyen", temps: "moyen" },
    "Seafood": { tag: "familial", fr: "Fruits de mer", budget: "élevé", temps: "moyen" },
    "Side": { tag: "économique", fr: "Accompagnement", budget: "faible", temps: "rapide" },
    "Starter": { tag: "économique", fr: "Entrée", budget: "moyen", temps: "variable" },
    "Vegan": { tag: "économique", fr: "Végan", budget: "moyen", temps: "variable" },
    "Vegetarian": { tag: "économique", fr: "Végétarien", budget: "moyen", temps: "variable" },
};
const areaMappings = { 
    "American": { tag: "international", fr: "Américaine", popularité: "élevée" },
    "British": { tag: "international", fr: "Britannique", popularité: "moyenne" },
    "Canadian": { tag: "international", fr: "Canadienne", popularité: "moyenne" },
    "Chinese": { tag: "international", fr: "Chinoise", popularité: "élevée" },
    "Croatian": { tag: "international", fr: "Croate", popularité: "faible" },
    "Dutch": { tag: "international", fr: "Néerlandaise", popularité: "faible" },
    "Egyptian": { tag: "international", fr: "Égyptienne", popularité: "faible" },
    "Filipino": { tag: "international", fr: "Philippine", popularité: "moyenne" },
    "French": { tag: "international", fr: "Française", popularité: "élevée" },
    "Greek": { tag: "international", fr: "Grecque", popularité: "moyenne" },
    "Indian": { tag: "international", fr: "Indienne", popularité: "élevée" },
    "Irish": { tag: "international", fr: "Irlandaise", popularité: "moyenne" },
    "Italian": { tag: "international", fr: "Italienne", popularité: "élevée" },
    "Jamaican": { tag: "international", fr: "Jamaïcaine", popularité: "faible" },
    "Japanese": { tag: "international", fr: "Japonaise", popularité: "élevée" },
    "Kenyan": { tag: "international", fr: "Kényane", popularité: "faible" },
    "Malaysian": { tag: "international", fr: "Malaisienne", popularité: "moyenne" },
    "Mexican": { tag: "international", fr: "Mexicaine", popularité: "élevée" },
    "Moroccan": { tag: "international", fr: "Marocaine", popularité: "moyenne" },
    "Polish": { tag: "international", fr: "Polonaise", popularité: "faible" },
    "Portuguese": { tag: "international", fr: "Portugaise", popularité: "moyenne" },
    "Russian": { tag: "international", fr: "Russe", popularité: "moyenne" },
    "Spanish": { tag: "international", fr: "Espagnole", popularité: "élevée" },
    "Thai": { tag: "international", fr: "Thaïlandaise", popularité: "élevée" },
    "Tunisian": { tag: "international", fr: "Tunisienne", popularité: "faible" },
    "Turkish": { tag: "international", fr: "Turque", popularité: "moyenne" },
    "Vietnamese": { tag: "international", fr: "Vietnamienne", popularité: "moyenne" },
    "Unknown": { tag: "international", fr: "Origine inconnue", popularité: "faible"}
};

let translationsCache = {};

// --- FONCTIONS UTILITAIRES ---
const parseIngredient = (rawIngredientName, rawQuantity) => {
    const nameInEnglish = (typeof rawIngredientName === 'string' ? rawIngredientName.trim() : "Ingrédient inconnu");
    const quantity = (typeof rawQuantity === 'string' ? rawQuantity.trim() : "selon goût");
    
    const normalizedNameForRayon = nameInEnglish.toLowerCase();
    let rayon = "Autres";

    for (const keyword in ingredientToRayonMapping) {
        if (normalizedNameForRayon.includes(keyword.toLowerCase())) {
            rayon = ingredientToRayonMapping[keyword];
            break;
        }
    }

    let translatedName = ingredientNameTranslationMapping[nameInEnglish.toLowerCase()] || nameInEnglish;
    const finalName = translatedName.charAt(0).toUpperCase() + translatedName.slice(1);

    if (nameInEnglish.toLowerCase() !== finalName.toLowerCase() && nameInEnglish !== "Ingrédient inconnu" && finalName !== nameInEnglish) {
        // console.log(`    INGRÉDIENT TRADUIT: "${nameInEnglish}" -> "${finalName}" (Rayon: ${rayon})`);
    }

    return { nom: finalName, quantity: quantity, rayon: rayon };
};

const scaleQuantity = (originalQuantity, factor) => { 
    if (originalQuantity === null || originalQuantity === undefined || typeof originalQuantity !== 'string' || originalQuantity.trim() === "") {
        return "selon goût";
    }
    let quantityStr = originalQuantity.trim().toLowerCase(); 

    quantityStr = quantityStr.replace(/½/g, '1/2')
                             .replace(/¼/g, '1/4')
                             .replace(/¾/g, '3/4')
                             .replace(/⅓/g, '1/3')
                             .replace(/⅔/g, '2/3');
    quantityStr = quantityStr.replace(/(\d+)\s*\/\s*(\d+)/g, '$1/$2');

    let value = 0;
    const mixedFractionMatch = quantityStr.match(/^(\d+)\s+(\d+)\/(\d+)/); 
    if (mixedFractionMatch) {
        value = parseInt(mixedFractionMatch[1]) + (parseInt(mixedFractionMatch[2]) / parseInt(mixedFractionMatch[3]));
        quantityStr = quantityStr.replace(/^(\d+)\s+(\d+)\/(\d+)\s*/, '').trim(); 
    } else {
        const simpleFractionMatch = quantityStr.match(/^(\d+)\/(\d+)/);
        if (simpleFractionMatch) {
            value = parseInt(simpleFractionMatch[1]) / parseInt(simpleFractionMatch[2]);
            quantityStr = quantityStr.replace(/^(\d+)\/(\d+)\s*/, '').trim(); 
        } else {
            const numberMatch = quantityStr.match(/^(\d+\.?\d*)/);
            if (numberMatch) {
                value = parseFloat(numberMatch[1]);
                quantityStr = quantityStr.replace(/^(\d+\.?\d*)\s*/, '').trim(); 
            } else {
                if (factor !== 1) {
                    // console.warn(`  Impossible de mettre à l'échelle la quantité non standard: "${originalQuantity}" (normalisée: "${quantityStr}") par le facteur ${factor}.`);
                }
                return originalQuantity; 
            }
        }
    }
    
    const unit = quantityStr; 

    if (isNaN(value)) { 
         if (factor !== 1) {
            // console.warn(`  Échec du parsing numérique pour: "${originalQuantity}" (normalisée: "${quantityStr}") lors de la mise à l'échelle.`);
         }
        return originalQuantity;
    }
    const scaledValue = value * factor;
    const displayNum = Number.isInteger(scaledValue) ? scaledValue : parseFloat(scaledValue.toFixed(2));
    
    return unit ? `${displayNum} ${unit}`.trim() : `${displayNum}`;
};

async function translateText(text, targetLang = 'fr') {
    if (!TRANSLATE_CONTENT || !text || text.trim() === "" || targetLang.toLowerCase() === 'en') {
        return text;
    }

    const cacheKey = `en->${targetLang}:${text}`;
    if (translationsCache[cacheKey]) {
        return translationsCache[cacheKey];
    }

    if (!DEEPL_API_KEY) {
        // console.warn("AVERTISSEMENT: Clé API DeepL non configurée. Traduction ignorée."); // Moins verbeux
        return text; 
    }

    const DEEPL_API_URL = "https://api-free.deepl.com/v2/translate";
    const params = new URLSearchParams();
    params.append('auth_key', DEEPL_API_KEY);
    params.append('text', text);
    params.append('target_lang', targetLang.toUpperCase());
    params.append('source_lang', 'EN');

    try {
        console.log(`    APPEL API TRADUCTION pour "${text.substring(0,30)}..." en "${targetLang.toUpperCase()}"...`);
        await new Promise(resolve => setTimeout(resolve, API_CALL_DELAY_TRANSLATION));
        const response = await fetch(DEEPL_API_URL, {
            method: 'POST',
            body: params,
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });
        const responseData = await response.json();
        if (!response.ok) {
            console.error(`    ERREUR API TRADUCTION (${response.status}) pour "${text.substring(0,30)}...":`, responseData.message || response.statusText);
            return text;
        }
        if (responseData.translations && responseData.translations.length > 0) {
            const translated = responseData.translations[0].text;
            console.log(`    Traduit via API: "${text.substring(0,30)}..." -> "${translated.substring(0,30)}..."`);
            translationsCache[cacheKey] = translated;
            return translated;
        } else {
            console.warn(`    Aucune traduction API pour: "${text.substring(0,30)}..."`, responseData);
            return text;
        }
    } catch (error) {
        console.error(`    Erreur appel API traduction pour "${text.substring(0,30)}...":`, error.message);
        return text;
    }
}

// --- GESTION DU CACHE DE TRADUCTIONS ---
function loadTranslationsCache() {
    try {
        if (fs.existsSync(TRANSLATIONS_CACHE_FILE)) {
            const data = fs.readFileSync(TRANSLATIONS_CACHE_FILE, 'utf8');
            translationsCache = JSON.parse(data);
            console.log(`INFO: Cache de traductions chargé (${Object.keys(translationsCache).length} entrées).`);
        } else {
            console.log(`INFO: Aucun cache de traductions. Un nouveau sera créé.`);
        }
    } catch (error) {
        console.error("ERREUR chargement cache traductions:", error.message);
        translationsCache = {};
    }
}

function saveTranslationsCache() {
    try {
        fs.writeFileSync(TRANSLATIONS_CACHE_FILE, JSON.stringify(translationsCache, null, 2), 'utf8');
        console.log(`INFO: Cache de traductions sauvegardé.`);
    } catch (error) {
        console.error("ERREUR sauvegarde cache traductions:", error.message);
    }
}


// --- FONCTION PRINCIPALE ---
async function fetchAndProcessRecipes() {
    loadTranslationsCache();

    const MEALDB_API_KEY = "1";
    const BASE_URL = `https://www.themealdb.com/api/json/v1/${MEALDB_API_KEY}`;
    let allFormattedRecipes = [];
    const processedRecipeIds = new Set();

    let apiCategories = [];
    try {
        console.log("Récupération des catégories TheMealDB...");
        const catListResponse = await fetch(`${BASE_URL}/categories.php`);
        if (catListResponse.ok) {
            const catListData = await catListResponse.json();
            if (catListData && catListData.categories) {
                apiCategories = catListData.categories.map(c => c.strCategory);
                console.log(`  ${apiCategories.length} catégories TheMealDB trouvées.`);
            } else {
                apiCategories = Object.keys(categoryMappings);
                console.warn("  Aucune catégorie dynamique trouvée, utilisation des catégories mappées.");
            }
        } else {
            apiCategories = Object.keys(categoryMappings);
            console.warn(`  Erreur API catégories (${catListResponse.status}), utilisation des catégories mappées.`);
        }
    } catch (e) {
        apiCategories = Object.keys(categoryMappings);
        console.warn(`  Erreur réseau catégories: ${e.message}, utilisation des catégories mappées.`);
    }

    console.log(`\nTraitement de ${apiCategories.length} catégories.`);

    for (const apiCategory of apiCategories) {
        console.log(`\nRécupération CATÉGORIE: ${apiCategory}...`);
        try {
            const listResponse = await fetch(`${BASE_URL}/filter.php?c=${encodeURIComponent(apiCategory)}`);
            if (!listResponse.ok) { console.error(`  Échec liste ${apiCategory}: ${listResponse.status}`); continue; }
            const listData = await listResponse.json();
            if (!listData.meals) { console.log(`  Aucune recette pour: ${apiCategory}`); continue; }

            const mealsToDetail = listData.meals.slice(0, RECIPES_PER_CATEGORY_OR_AREA);
            console.log(`  Trouvé ${listData.meals.length} dans '${apiCategory}', traitement de ${mealsToDetail.length}.`);

            for (const mealSummary of mealsToDetail) {
                if (processedRecipeIds.has(mealSummary.idMeal)) {
                    continue;
                }

                console.log(`  Détails pour: ${mealSummary.strMeal} (ID: ${mealSummary.idMeal})`);
                await new Promise(resolve => setTimeout(resolve, API_CALL_DELAY_MEALDB));
                
                const detailResponse = await fetch(`${BASE_URL}/lookup.php?i=${mealSummary.idMeal}`);
                if (!detailResponse.ok) { console.error(`    Échec détails ID ${mealSummary.idMeal}: ${detailResponse.status}`); continue; }
                const detailData = await detailResponse.json();
                const meal = detailData.meals ? detailData.meals[0] : null;

                if (meal) {
                    const originalTitle = meal.strMeal;
                    const translatedTitle = await translateText(originalTitle, TARGET_LANGUAGE);
                    
                    const ingredientsRaw = [];
                    for (let i = 1; i <= 20; i++) {
                        const ingName = meal[`strIngredient${i}`];
                        const ingMeasure = meal[`strMeasure${i}`];
                        if (typeof ingName === 'string' && ingName.trim() !== "") {
                            ingredientsRaw.push({ name: ingName, quantity: (typeof ingMeasure === 'string' ? ingMeasure : "") });
                        } else if (ingName) { }
                        else { break; }
                    }
                    
                    const ingredientsFor2 = ingredientsRaw.map(ing => {
                        const parsed = parseIngredient(ing.name, ing.quantity);
                        return { nom: parsed.nom, quantity: scaleQuantity(parsed.quantity, 1), rayon: parsed.rayon };
                    });
                    const ingredientsFor3 = ingredientsRaw.map(ing => {
                        const parsed = parseIngredient(ing.name, ing.quantity);
                        return { nom: parsed.nom, quantity: scaleQuantity(parsed.quantity, 1.5), rayon: parsed.rayon };
                    });

                    const originalSteps = meal.strInstructions ? meal.strInstructions.split(/\r\n|\n|\r/).map(s => s.trim()).filter(s => s && !/^(STEP\s*\d*)/i.test(s) && !/^\d+\.$/.test(s) && s.length > 5) : [];
                    let translatedSteps = originalSteps;
                    if (TRANSLATE_CONTENT && DEEPL_API_KEY && originalSteps.length > 0) {
                        // console.log(`    Traduction étapes pour "${originalTitle}" (${originalSteps.length})...`);
                        translatedSteps = [];
                        for (const step of originalSteps) {
                            if (step.trim() === "") continue;
                            translatedSteps.push(await translateText(step, TARGET_LANGUAGE));
                        }
                        // console.log(`    Traduction étapes terminée pour "${originalTitle}".`);
                    }
                    
                    const mealDbActualCategory = meal.strCategory || "Miscellaneous";
                    let categoryInfo = categoryMappings[mealDbActualCategory];
                    if (!categoryInfo) {
                        // console.warn(`    Catégorie API "${mealDbActualCategory}" non trouvée. Fallback à "Miscellaneous".`);
                        categoryInfo = categoryMappings["Miscellaneous"];
                         if (!categoryInfo) { // Si Miscellaneous n'est pas défini, c'est un problème majeur
                            console.error("ERREUR CRITIQUE: categoryMappings['Miscellaneous'] est indéfini !");
                            categoryInfo = { fr: "Divers", tag: "familial", temps: "variable", budget: "variable" }; // Ultime fallback
                        }
                    }
                    
                    let tags = [];
                    if (categoryInfo && categoryInfo.fr) { 
                        tags.push(categoryInfo.fr);
                    } else {
                        tags.push(mealDbActualCategory); // Nom brut de l'API si pas de traduction fr
                        console.warn(`    Pas de .fr pour categoryInfo de "${mealDbActualCategory}". categoryInfo:`, categoryInfo);
                    }
                    
                    const mealArea = meal.strArea || "Unknown";
                    let areaInfoForTag = areaMappings[mealArea];
                     if (!areaInfoForTag) {
                        // console.warn(`    Région API "${mealArea}" non trouvée. Fallback à "Unknown".`);
                        areaInfoForTag = areaMappings["Unknown"];
                        if (!areaInfoForTag) {
                             console.error("ERREUR CRITIQUE: areaMappings['Unknown'] est indéfini !");
                             areaInfoForTag = { fr: "Origine Inconnue", tag: "international", popularité: "faible" };
                        }
                    }

                    if (areaInfoForTag && areaInfoForTag.fr) {
                        tags.push(areaInfoForTag.fr);
                    } else if (mealArea && mealArea !== "Unknown") {
                        tags.push(mealArea); 
                        console.warn(`    Pas de .fr pour areaInfoForTag de "${mealArea}". areaInfoForTag:`, areaInfoForTag);
                    }

                    if (meal.strTags) {
                        meal.strTags.split(',').forEach(tag => {
                            const t = tag.trim();
                            if (t && t.toLowerCase() !== mealDbActualCategory.toLowerCase() && t.toLowerCase() !== mealArea.toLowerCase() && !tags.map(tg => tg.toLowerCase()).includes(t.toLowerCase())) { tags.push(t); }
                        });
                    }
                    tags = [...new Set(tags.filter(Boolean).map(tag => tag.charAt(0).toUpperCase() + tag.slice(1)))];
                    
                    let description = translatedSteps.length > 0 ? (translatedSteps[0].length > 150 ? translatedSteps[0].substring(0, 147) + "..." : translatedSteps[0]) : "Description non disponible.";
                    if (translatedSteps.length === 0 && meal.strInstructions) { 
                        const tempDesc = await translateText(meal.strInstructions, TARGET_LANGUAGE);
                        description = tempDesc.substring(0,150) + (tempDesc.length > 150 ? "..." : "");
                    }
                    
                    const timeEstimate = categoryInfo && categoryInfo.temps ? categoryInfo.temps : "variable";
                    const budgetEstimate = categoryInfo && categoryInfo.budget ? categoryInfo.budget : "variable";
                    const priceSymbol = budgetEstimate === "faible" ? "€" : (budgetEstimate === "moyen" ? "€€" : "€€€");
                    const finalCategoryTag = categoryInfo && categoryInfo.tag ? categoryInfo.tag : (categoryMappings["Miscellaneous"]?.tag || "familial");

                    const formattedRecipe = {
                        id: meal.idMeal, title: translatedTitle, image: meal.strMealThumb,
                        time: timeEstimate.charAt(0).toUpperCase() + timeEstimate.slice(1),
                        difficulty: "Moyen", price: priceSymbol, categoryTag: finalCategoryTag,
                        tags: tags, description: description,
                        ingredients: { for2: ingredientsFor2, for3: ingredientsFor3 },
                        steps: translatedSteps 
                    };
                    allFormattedRecipes.push(formattedRecipe);
                    processedRecipeIds.add(meal.idMeal);
                    console.log(`    OK: ${formattedRecipe.title} (Orig: ${originalTitle})`);
                }
            }
        } catch (error) {
            console.error(`  Erreur traitement catégorie ${apiCategory}:`, error);
        }
    }

    saveTranslationsCache(); 

    if (allFormattedRecipes.length > 0) {
        const frenchCategoriesForFilter = [...new Set(Object.values(categoryMappings).map(c => c.fr))].sort();
        const output = `
// data-recettes.js - Généré par update-recipes.js (Source: TheMealDB)
// Date: ${new Date().toISOString()}
const recipes = ${JSON.stringify(allFormattedRecipes, null, 2)};
const mainRecipeFilterTags = [
    { display: "Économique", tagValue: "économique" },
    { display: "Familial", tagValue: "familial" }
];
const detailedRecipeCategoriesFR = ${JSON.stringify(frenchCategoriesForFilter, null, 2)};
`;
        fs.writeFileSync('data-recettes.js', output.trim(), 'utf8');
        console.log(`\n✅ ${allFormattedRecipes.length} recettes générées dans data-recettes.js.`);
    } else {
        console.log("\n❌ Aucune recette formatée/sauvegardée.");
    }
}

fetchAndProcessRecipes().catch(error => {
    console.error("❌ Erreur fatale script principal:", error);
    saveTranslationsCache();
});