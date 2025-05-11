// data-config.js

const categoriesData = [
    { name: 'Rapide', icon: '⚡️', tag: 'rapide' },
    { name: 'Familial', icon: '👨‍👩‍👧‍👦', tag: 'familial' },
    { name: 'Healthy', icon: '🥗', tag: 'healthy' },
    { name: 'Économique', icon: '💰', tag: 'economique' },
    { name: 'Végétarien', icon: '🥦', tag: 'vegetarien' },
    { name: 'Monde', icon: '🌍', tag: 'monde' },
    { name: 'Saisonnier', icon: '🍂', tag: 'saisonnier' },
    { name: 'Spécial', icon: '🎉', tag: 'special' },
    { name: 'Sans Gluten', icon: '🌾', tag: 'sansgluten' },
    { name: 'Sans Lactose', icon: '🥛', tag: 'sanslactose' },
    { name: 'À Emporter', icon: '🥡', tag: 'emporter' },
    { name: 'Léger', icon: '🍃', tag: 'leger' }
];

const rayonsLeclerc = [ 
    'Fruits et Légumes', 'Viandes et Poissons', 'Pains Pâtisseries',
    'Laitier Oeufs Végétal', 'Charcuterie Traiteur', 'Surgelés',
    'Epicerie salée', 'Epicerie sucrée', 'Boissons', 'Autre'
];

function classerIngredientParMotCle(nomIngredient) {
    const ingredientLowerCase = nomIngredient.toLowerCase();
    if (['pomme', 'carotte', 'oignon', 'tomate', 'salade', 'concombre', 'poivron', 'courgette', 'aubergine', 'épinard', 'poireau', 'céleri', 'avocat', 'citron', 'orange', 'banane', 'fraise', 'figue', 'persil', 'coriandre', 'basilic', 'menthe', 'ciboulette', 'échalote', 'ail', 'champignon', 'brocoli', 'chou', 'gingembre', 'herbes de provence', 'thym', 'romarin'].some(term => ingredientLowerCase.includes(term))) return 'Fruits et Légumes';
    if (['poulet', 'dinde', 'boeuf', 'porc', 'veau', 'agneau', 'saumon', 'cabillaud', 'thon', 'crevette', 'poisson', 'viande', 'filet mignon'].some(term => ingredientLowerCase.includes(term))) return 'Viandes et Poissons';
    if (['pain', 'baguette', 'tortilla', 'wrap', 'galette', 'pâte brisée', 'pâte feuilletée', 'pita', 'nouilles de riz', 'nouilles chinoises', 'spaghetti', 'pâtes', 'gnocchi'].some(term => ingredientLowerCase.includes(term))) return 'Pains Pâtisseries'; // Pâtes souvent ici ou épicerie salée
    if (['lait', 'crème fraîche', 'beurre', 'yaourt', 'fromage', 'oeuf', 'œuf', 'tofu', 'ricotta', 'parmesan', 'cheddar', 'mozzarella', 'comté', 'emmental', 'chèvre frais', 'feta', 'béchamel', 'gorgonzola'].some(term => ingredientLowerCase.includes(term))) return 'Laitier Oeufs Végétal';
    if (['jambon', 'lardon', 'saucisse', 'chorizo', 'bacon', 'salami'].some(term => ingredientLowerCase.includes(term))) return 'Charcuterie Traiteur';
    if (['surgelé'].some(term => ingredientLowerCase.includes(term))) return 'Surgelés';
    if (['farine', /*'pâtes',*/ 'riz', 'semoule', 'quinoa', 'lentilles corail', 'pois chiches', 'haricots noirs', 'huile d\'olive', 'huile de sésame', 'huile végétale', 'vinaigre de riz', 'moutarde', 'sauce soja', 'sauce poisson', 'sauce tomate', 'concentré de tomate', 'bouillon de légumes', 'bouillon de boeuf', 'sel', 'poivre', 'épices', 'curcuma', 'cumin', 'coriandre en poudre', 'paprika', 'piment d\'espelette', 'graines de sésame', 'sauce tahini'].some(term => ingredientLowerCase.includes(term))) return 'Epicerie salée';
    if (['sucre brun', 'miel', 'chocolat', 'cacahuètes concassées'].some(term => ingredientLowerCase.includes(term))) return 'Epicerie sucrée';
    if (['lait de coco'].some(term => ingredientLowerCase.includes(term))) return 'Boissons'; // Ou épicerie du monde/salée
    return 'Autre';
}

// Fonction d'aide pour parser les lignes d'ingrédients de votre liste textuelle
// Entrée: "• 2 grandes tortillas de blé"
// Sortie: { quantity: "2", nom: "grandes tortillas de blé" }
function parseIngredientLineForRecipeData(line) {
    const cleanedLine = line.replace(/^•\s*/, '').trim();

    // Gérer "Sel et poivre" comme un cas spécial
    if (cleanedLine.toLowerCase() === "sel et poivre") {
        return { quantity: "Au goût", nom: "Sel et poivre" };
    }
     // Gérer "Sel" et "Poivre" seuls
    if (cleanedLine.toLowerCase() === "sel") {
        return { quantity: "Au goût", nom: "Sel" };
    }
    if (cleanedLine.toLowerCase() === "poivre") {
        return { quantity: "Au goût", nom: "Poivre" };
    }
    if (cleanedLine.toLowerCase().includes("au goût") || cleanedLine.toLowerCase().includes("selon besoin")) {
        return { quantity: cleanedLine, nom: "" }; // Le nom est implicite dans la quantité
    }


    // Regex pour extraire quantité (chiffres, fractions simples, et certaines abréviations) et le reste
    // Modifié pour mieux capturer les unités attachées à la quantité
    const match = cleanedLine.match(/^([\d.,\/]+(?:\s*(?:g|kg|ml|l|cl|c\.s\.|c\.c\.|cs|cc|tranche|boîte|verre|tasse|feuille|petit|grand|gousse|branche))?s?)\s*(?:de\s+|d\')?(.*)/i);

    if (match && match[1] && match[2]) {
        let quantity = match[1].trim();
        let nom = match[2].trim();
        return { quantity, nom };
    } else if (cleanedLine.match(/^[\d.,\/]+/)) { // Si ça commence par un nombre mais sans unité claire capturée
        const firstSpaceIndex = cleanedLine.indexOf(' ');
        if (firstSpaceIndex > 0) {
            return { quantity: cleanedLine.substring(0, firstSpaceIndex).trim(), nom: cleanedLine.substring(firstSpaceIndex + 1).trim() };
        }
    }

    // Si aucun pattern numérique n'est trouvé, on considère "1" comme quantité et la ligne comme nom
    return { quantity: "1", nom: cleanedLine };
}