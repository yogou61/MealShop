// script.js
document.addEventListener('DOMContentLoaded', () => {
    console.log("LOG: DOMContentLoaded - Script complet démarré.");

    // --- Éléments du DOM ---
    const recipesGrid = document.getElementById('recipes-grid');
    const recipeDetailsScreen = document.getElementById('recipe-details-screen');
    const shoppingListScreen = document.getElementById('list-screen');
    const favoritesScreen = document.getElementById('favorites-screen');
    const categoriesContainer = document.getElementById('categories-container'); // ESSENTIEL pour les boutons de catégorie
    const numberOfPeopleSelect = document.getElementById('number-of-people-select');
    const navButtons = document.querySelectorAll('.nav-btn');
    const bannerViewListBtn = document.getElementById('banner-view-list-btn');
    const shoppingListBanner = document.getElementById('shopping-list-banner');
    const bannerRecipeCount = document.getElementById('banner-recipe-count');
    const favoriteRecipesGrid = document.getElementById('favorite-recipes-grid');
    const searchInput = document.getElementById('search-input');
    const homeScreen = document.getElementById('home-screen');

    // Vérification des éléments critiques
    if (!recipesGrid) console.error("ERREUR CRITIQUE: #recipes-grid non trouvé!");
    if (!homeScreen) console.error("ERREUR CRITIQUE: #home-screen non trouvé!");
    if (!categoriesContainer) console.error("ERREUR CRITIQUE: #categories-container non trouvé! Les boutons de catégorie ne s'afficheront pas.");


    // --- État de l'application ---
    let currentScreenBaseId = 'home';
    let selectedRecipe = null;
    let peopleCount = 2;
    let shoppingList = {};
    let favorites = [];
    let checkedShoppingListItems = {};

    // Charger les données
    if (typeof recipes === 'undefined' || !Array.isArray(recipes)) {
        console.error("ERREUR CRITIQUE: 'recipes' non défini. Vérifiez data-recettes.js.");
        if(recipesGrid) recipesGrid.innerHTML = "<p>Erreur chargement données.</p>";
        return; 
    }
    const allRecipes = recipes;
    console.log(`LOG: ${allRecipes.length} recettes trouvées.`);
    
    // Utilisation de detailedRecipeCategoriesFR pour les boutons de catégorie, comme défini dans la version précédente
    const categoriesToDisplayForButtons = typeof detailedRecipeCategoriesFR !== 'undefined' && Array.isArray(detailedRecipeCategoriesFR)
        ? detailedRecipeCategoriesFR
        : [];
    console.log("LOG: Catégories pour boutons (detailedRecipeCategoriesFR):", categoriesToDisplayForButtons);


    // --- Initialisation ---
    function initializeApp() {
        console.log("LOG: initializeApp() - DÉBUT");
        loadFavoritesFromStorage();
        loadShoppingListFromStorage();
        loadCheckedItemsFromStorage();

        if (numberOfPeopleSelect) {
            peopleCount = parseInt(numberOfPeopleSelect.value) || 2;
            numberOfPeopleSelect.addEventListener('change', handlePeopleCountChange);
        }

        loadCategoriesButtons(); // Cette fonction doit maintenant utiliser categoriesToDisplayForButtons
        
        if (allRecipes && allRecipes.length > 0) {
            loadRecipes(allRecipes);
        } else {
            if (recipesGrid) recipesGrid.innerHTML = "<p>Aucune recette disponible.</p>";
        }
        
        updateAllBadges();
        setupGlobalEventListeners();
        
        if (homeScreen && homeScreen.style.display !== 'block') {
             switchScreen('home-screen');
        } else if (homeScreen) {
            updateActiveNavButton('home');
        }
        console.log("LOG: initializeApp() - FIN");
    }

    function loadFavoritesFromStorage() { /* ... (inchangé) ... */ 
        const storedFavorites = localStorage.getItem('favorites');
        if (storedFavorites) { try { favorites = JSON.parse(storedFavorites); } catch (e) { console.error("Erreur parsing favoris:", e); favorites = []; } }
    }
    function saveFavoritesToStorage() { /* ... (inchangé) ... */ 
        localStorage.setItem('favorites', JSON.stringify(favorites));
    }
    function loadShoppingListFromStorage() { /* ... (inchangé) ... */ 
        const storedShoppingList = localStorage.getItem('shoppingList');
        if (storedShoppingList) { try { shoppingList = JSON.parse(storedShoppingList) || {}; } catch (e) { console.error("Erreur parsing liste courses:", e); shoppingList = {}; } }
    }
    function saveShoppingListToStorage() { /* ... (inchangé) ... */ 
        localStorage.setItem('shoppingList', JSON.stringify(shoppingList));
        updateAllBadges();
    }
    function loadCheckedItemsFromStorage() { /* ... (inchangé) ... */ 
        const storedCheckedItems = localStorage.getItem('checkedShoppingListItems');
        if (storedCheckedItems) {
            try { checkedShoppingListItems = JSON.parse(storedCheckedItems) || {}; } 
            catch (e) { console.error("Erreur parsing checkedItems:", e); checkedShoppingListItems = {};}
        }
    }
    function saveCheckedItemsToStorage() { /* ... (inchangé) ... */ 
        localStorage.setItem('checkedShoppingListItems', JSON.stringify(checkedShoppingListItems));
    }
    
    // --- Affichage des Recettes ---
    function loadCategoriesButtons() {
        if (!categoriesContainer) { 
            console.warn("LOG: categoriesContainer non trouvé.");
            return;
        }
        categoriesContainer.innerHTML = ''; 
        console.log("LOG: Chargement des boutons de catégorie...");

        const allBtn = createCategoryButton('Toutes', () => { 
            loadRecipes(allRecipes); 
            setActiveCategoryButton(allBtn); 
        });
        categoriesContainer.appendChild(allBtn);
        setActiveCategoryButton(allBtn); 

        // S'assurer que categoriesToDisplayForButtons est bien utilisé ici
        if (categoriesToDisplayForButtons.length > 0) {
            console.log("LOG: Création de boutons pour detailedRecipeCategoriesFR:", categoriesToDisplayForButtons);
            categoriesToDisplayForButtons.forEach(categoryNameFR => {
                const btn = createCategoryButton(categoryNameFR, () => { 
                    filterByOriginalCategoryName(categoryNameFR); 
                    setActiveCategoryButton(btn); 
                });
                categoriesContainer.appendChild(btn);
            });
        } else {
            console.warn("LOG: detailedRecipeCategoriesFR est vide. Tentative d'affichage des filtres principaux.");
            // Fallback si detailedRecipeCategoriesFR n'est pas défini (ne devrait pas arriver si data-recettes.js est correct)
            const fallbackCategories = typeof mainRecipeFilterTags !== 'undefined' ? mainRecipeFilterTags : [{ display: "Économique", tagValue: "économique" }, { display: "Familial", tagValue: "familial" }];
            fallbackCategories.forEach(cat => {
                 const btn = createCategoryButton(cat.display, () => { 
                    filterByCategoryTag(cat.tagValue); 
                    setActiveCategoryButton(btn); 
                });
                categoriesContainer.appendChild(btn);
            });
        }
    }
    
    function createCategoryButton(text, onClickAction) { /* ... (inchangé) ... */ 
        const btn = document.createElement('button');
        btn.className = 'category-item'; 
        btn.textContent = text;
        btn.onclick = onClickAction;
        return btn;
    }
    function setActiveCategoryButton(activeBtn) { /* ... (inchangé) ... */ 
        document.querySelectorAll('#categories-container button').forEach(b => b.classList.remove('active-category'));
        if (activeBtn) activeBtn.classList.add('active-category');
    }
    function loadRecipes(recipesToDisplay) { /* ... (inchangé) ... */ 
        if (!recipesGrid) { console.error("ERREUR CRITIQUE dans loadRecipes: recipesGrid est null."); return; }
        recipesGrid.innerHTML = '';
        if (!recipesToDisplay || recipesToDisplay.length === 0) {
            recipesGrid.innerHTML = '<p class="text-center col-span-full">Aucune recette à afficher.</p>'; return;
        }
        recipesToDisplay.forEach(recipe => {
            if (recipe && recipe.id) { const card = createRecipeCard(recipe); recipesGrid.appendChild(card); } 
            else { console.warn("Recette invalide ou sans ID non affichée:", recipe); }
        });
    }
    function createRecipeCard(recipe) { /* ... (inchangé) ... */ 
        const card = document.createElement('div');
        card.className = 'recipe-card';
        const isFavorite = favorites.some(fav => fav.id === recipe.id);
        const title = recipe.title || "Recette Sans Titre";
        const imageUrl = recipe.image || 'img_placeholder.png'; 

        card.innerHTML = `
            <img src="${imageUrl}" alt="${title}" class="w-full h-32 object-cover">
            <div class="recipe-card-content">
                <h3 class="recipe-card-title">${title}</h3>
                <p class="recipe-card-info">${recipe.time || "N/A"} • ${recipe.difficulty || "N/A"}</p>
                <div class="recipe-card-footer">
                    <span class="recipe-card-price">${recipe.price || "€"}</span>
                    <span class="icon star-icon text-yellow-500">${isFavorite ? '⭐' : '☆'}</span>
                </div>
            </div>`;
        card.addEventListener('click', function(event) {
            if (event.target.classList.contains('star-icon') || (event.target.parentElement && event.target.parentElement.classList.contains('star-icon'))) return; 
            showRecipeDetails(recipe);
        });
        const starIcon = card.querySelector('.star-icon');
        if (starIcon) {
            starIcon.addEventListener('click', (event) => {
                event.stopPropagation(); 
                toggleFavorite(recipe);
                starIcon.textContent = favorites.some(fav => fav.id === recipe.id) ? '⭐' : '☆';
            });
        }
        return card;
    }
    function showRecipeDetails(recipe) { /* ... (inchangé) ... */ 
        if (!recipe || !recipe.id) { console.error("ERREUR: showRecipeDetails - recette invalide."); return; }
        selectedRecipe = recipe;
        if (!recipeDetailsScreen) { console.error("ERREUR: recipe-details-screen non trouvé."); return; }

        const isFavorite = favorites.some(fav => fav.id === recipe.id);
        const ingredientsForCurrentCount = recipe.ingredients && recipe.ingredients[`for${peopleCount}`] ? recipe.ingredients[`for${peopleCount}`] : [];
        const stepsList = Array.isArray(recipe.steps) ? recipe.steps : [];
        
        let recipeDetailHTML = `
            <button id="detail-back-btn" class="header-back-btn mb-4 flex items-center">
                <span class="icon mr-1">⬅️</span> Retour
            </button>
            <img src="${recipe.image || 'img_placeholder.png'}" alt="${recipe.title || 'Recette'}" class="w-full h-48 object-cover rounded-lg mb-4">
            <h2 class="text-xl font-bold mb-2">${recipe.title || "Titre Indisponible"}</h2>
            <p class="text-sm text-gray-600 mb-4">${recipe.description || "Aucune description."}</p>
            <div class="flex-justify-between-items-center mb-3">
                 <h3 class="section-title">Ingrédients</h3>
                 <span class="text-sm text-gray-600">Pour ${peopleCount} personne${peopleCount > 1 ? 's' : ''}</span>
            </div>
            <div class="ingredients-box"><ul>`;
        if (ingredientsForCurrentCount.length > 0) {
            ingredientsForCurrentCount.forEach(ing => {
                recipeDetailHTML += `<li><strong>${ing.nom || "?"}</strong>: ${ing.quantity || "-"} (${ing.rayon || "Autre"})</li>`;
            });
        } else { recipeDetailHTML += `<li>Ingrédients non disponibles.</li>`; }
        recipeDetailHTML += `</ul></div>
            <h3 class="section-title mt-4">Étapes</h3>
            <ol class="steps-list">`;
        if (stepsList.length > 0) {
            stepsList.forEach((step, i) => {
                recipeDetailHTML += `<li class="flex items-start"><span class="step-number">${i+1}</span><p>${step || "-"}</p></li>`;
            });
        } else { recipeDetailHTML += `<li>Aucune étape.</li>`; }
        recipeDetailHTML += `</ol>
            <div class="flex justify-around mt-6 mb-4">
                <button id="detail-toggle-favorite-btn" class="btn btn-primary">
                    ${isFavorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
                </button>
                <button id="detail-add-to-list-btn" class="btn btn-secondary">
                    Ajouter à la liste
                </button>
            </div>`;
        recipeDetailsScreen.innerHTML = recipeDetailHTML;
        document.getElementById('detail-toggle-favorite-btn')?.addEventListener('click', () => {
            toggleFavorite(recipe);
            const favBtn = document.getElementById('detail-toggle-favorite-btn');
            if(favBtn) favBtn.textContent = favorites.some(f => f.id === recipe.id) ? 'Retirer des favoris' : 'Ajouter aux favoris';
        });
        document.getElementById('detail-add-to-list-btn')?.addEventListener('click', () => {
            addToShoppingList(recipe);
            alert(`'${recipe.title}' ajouté à la liste de courses !`);
        });
        document.getElementById('detail-back-btn')?.addEventListener('click', () => switchScreen('home-screen'));
        switchScreen('recipe-details-screen'); 
    }

    // --- Navigation ---
    function switchScreen(fullScreenId) { /* ... (inchangé) ... */ 
        currentScreenBaseId = fullScreenId.replace('-screen', '');
        document.querySelectorAll('.screen').forEach(s => s.style.display = 'none');
        const targetScreen = document.getElementById(fullScreenId);
        if (targetScreen) { targetScreen.style.display = 'block'; } 
        else { if (homeScreen) homeScreen.style.display = 'block'; currentScreenBaseId = 'home'; }
        updateActiveNavButton(currentScreenBaseId);
    }
    function updateActiveNavButton(baseScreenId) { /* ... (inchangé) ... */ 
        navButtons.forEach(btn => {
            btn.classList.remove('active-nav', 'text-orange-500');
            btn.classList.add('text-gray-500');
            if (btn.getAttribute('data-tab') === baseScreenId) {
                btn.classList.add('active-nav', 'text-orange-500');
                btn.classList.remove('text-gray-500');
            }
        });
        if (baseScreenId === 'recipe-details') { 
            const homeNavBtn = document.querySelector('[data-tab="home"]');
            if (homeNavBtn) {
                homeNavBtn.classList.add('active-nav', 'text-orange-500');
                homeNavBtn.classList.remove('text-gray-500');
            }
        }
    }

    // --- Filtres ---
    function filterByCategoryTag(tagValue) { 
        const filtered = allRecipes.filter(r => r.categoryTag === tagValue);
        loadRecipes(filtered);
    }
    function filterByOriginalCategoryName(categoryNameFR) {
        const filtered = allRecipes.filter(recipe => Array.isArray(recipe.tags) && recipe.tags.length > 0 && recipe.tags.includes(categoryNameFR)); // Modifié pour vérifier si le tag est DANS la liste recipe.tags
        loadRecipes(filtered);
    }
    function handleSearch(event) { /* ... (inchangé) ... */ 
        const term = event.target.value.toLowerCase().trim();
        if (term === "") { loadRecipes(allRecipes); }
        else {
            const filtered = allRecipes.filter(r => 
                (r.title && r.title.toLowerCase().includes(term)) ||
                (r.description && r.description.toLowerCase().includes(term)) ||
                (Array.isArray(r.tags) && r.tags.some(tag => tag && tag.toLowerCase().includes(term)))
            );
            loadRecipes(filtered);
        }
    }

    // --- Gestion des Favoris ---
    function toggleFavorite(recipe) { /* ... (inchangé) ... */ 
        if (!recipe || !recipe.id) return;
        const index = favorites.findIndex(f => f.id === recipe.id);
        if (index === -1) { favorites.push(recipe); } else { favorites.splice(index, 1); }
        saveFavoritesToStorage();
        updateAllBadges();
        if (currentScreenBaseId === 'recipe-details' && selectedRecipe && selectedRecipe.id === recipe.id) {
            const favButton = document.getElementById('detail-toggle-favorite-btn');
            if (favButton) favButton.textContent = favorites.some(f => f.id === recipe.id) ? 'Retirer des favoris' : 'Ajouter aux favoris';
        }
        if (currentScreenBaseId === 'favorites') { displayFavorites(); }
    }
    function displayFavorites() { /* ... (inchangé) ... */ 
        if (!favoriteRecipesGrid) return;
        favoriteRecipesGrid.innerHTML = '';
        if (favorites.length === 0) { favoriteRecipesGrid.innerHTML = '<p>Aucun favori.</p>'; return; }
        favorites.forEach(recipe => { if (recipe && recipe.id) favoriteRecipesGrid.appendChild(createRecipeCard(recipe)); });
    }
    
    // --- Badges ---
    function updateAllBadges() { /* ... (inchangé) ... */ 
        updateFavoriteNavBadge();
        updateShoppingListBadgesAndBanner();
    }
    function updateFavoriteNavBadge() { /* ... (inchangé) ... */ 
        const favBadge = document.getElementById('nav-favorites-badge'); 
        if (favBadge) {
            const count = favorites.length;
            favBadge.style.display = count > 0 ? 'inline-block' : 'none';
            if (count > 0) favBadge.textContent = count;
        }
    }

    // --- Liste de Courses (inchangée par rapport à la version avec coches et impression) ---
    function addToShoppingList(recipe) { /* ... (inchangé) ... */ 
        if (!recipe || !recipe.ingredients || !recipe.ingredients[`for${peopleCount}`]) return;
        const ingredientsToAdd = recipe.ingredients[`for${peopleCount}`];
        let itemsAddedCount = 0;
        ingredientsToAdd.forEach(ing => {
            if (!ing.nom || !ing.rayon) return;
            if (!shoppingList[ing.rayon]) shoppingList[ing.rayon] = {};
            shoppingList[ing.rayon][ing.nom] = { quantity: ing.quantity || "1" };
            itemsAddedCount++;
        });
        if (itemsAddedCount > 0) {
            saveShoppingListToStorage();
            alert(`${itemsAddedCount} type(s) d'ingrédient(s) ajouté(s) !`);
        } else { alert("Aucun nouvel ingrédient à ajouter."); }
    }
    function displayShoppingList() { /* ... (inchangé, avec la logique de création HTML complexe) ... */ 
        if (!shoppingListScreen) { console.error("ERREUR: shoppingListScreen non trouvé."); return; }
        currentScreenBaseId = 'list';
        shoppingListScreen.innerHTML = ''; 
        const backButton = document.createElement('button');
        backButton.id = 'list-screen-back-btn';
        backButton.className = 'header-back-btn mb-4 text-orange-500 flex items-center';
        backButton.innerHTML = `<span class="icon mr-1">⬅️</span> Retour`;
        backButton.onclick = () => switchScreen('home-screen');
        shoppingListScreen.appendChild(backButton);
        const titleH2 = document.createElement('h2');
        titleH2.className = 'text-xl font-bold mb-4';
        titleH2.textContent = 'Ma Liste de Courses';
        shoppingListScreen.appendChild(titleH2);

        if (Object.keys(shoppingList).length === 0) {
            const emptyMsg = document.createElement('p');
            emptyMsg.textContent = 'Votre liste de courses est vide.';
            shoppingListScreen.appendChild(emptyMsg);
        } else {
            const listContainer = document.createElement('div');
            listContainer.className = 'mb-6';
            const sortedRayons = Object.keys(shoppingList).sort();
            sortedRayons.forEach(rayonName => {
                const ingredientsInRayon = shoppingList[rayonName];
                if (ingredientsInRayon && Object.keys(ingredientsInRayon).length > 0) {
                    const rayonTitle = document.createElement('h3');
                    rayonTitle.className = 'font-bold text-lg mt-4 mb-2 border-b pb-1 rayon-title';
                    rayonTitle.textContent = rayonName;
                    listContainer.appendChild(rayonTitle);
                    const ul = document.createElement('ul');
                    ul.className = 'space-y-1 list-style-none pl-0';
                    Object.entries(ingredientsInRayon).forEach(([ingName, ingDetails]) => {
                        const itemIdentifier = `${rayonName}|${ingName}|${ingDetails.quantity}`;
                        const isChecked = checkedShoppingListItems[itemIdentifier] || false;
                        const li = document.createElement('li');
                        li.className = 'ingredient-item flex items-center justify-between p-2 rounded hover:bg-gray-100';
                        if (isChecked) li.classList.add('checked');
                        const checkbox = document.createElement('input');
                        checkbox.type = 'checkbox';
                        checkbox.className = 'shopping-list-checkbox mr-3 form-checkbox h-5 w-5 text-orange-600';
                        checkbox.dataset.identifier = itemIdentifier;
                        checkbox.checked = isChecked;
                        checkbox.onchange = handleShoppingListItemCheck;
                        const textSpan = document.createElement('span');
                        textSpan.className = 'ingredient-text flex-grow';
                        textSpan.textContent = `${ingName} - ${ingDetails.quantity}`;
                        const printCheckboxSpan = document.createElement('span');
                        printCheckboxSpan.className = 'print-checkbox-display mr-2';
                        li.appendChild(printCheckboxSpan); 
                        li.appendChild(textSpan); 
                        li.appendChild(checkbox);  
                        ul.appendChild(li);
                    });
                    listContainer.appendChild(ul);
                }
            });
            shoppingListScreen.appendChild(listContainer);
        }
        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'mt-8 pt-4 border-t space-y-3 actions-group';
        const printBtn = document.createElement('button');
        printBtn.id = 'print-list-btn';
        printBtn.className = 'btn btn-primary w-full flex items-center justify-center';
        printBtn.innerHTML = `<span class="icon mr-2">📄</span> Imprimer / PDF`;
        printBtn.onclick = () => {
            shoppingListScreen.querySelectorAll('.ingredient-item').forEach(item => {
                const realCheckbox = item.querySelector('.shopping-list-checkbox');
                const printCheckbox = item.querySelector('.print-checkbox-display');
                if (realCheckbox.checked) {
                    printCheckbox.classList.add('checked');
                    item.classList.add('item-to-remove-on-print'); 
                } else {
                    printCheckbox.classList.remove('checked');
                    item.classList.remove('item-to-remove-on-print');
                }
            });
            window.print();
        };
        actionsDiv.appendChild(printBtn);
        const clearBtn = document.createElement('button');
        clearBtn.id = 'clear-list-btn';
        clearBtn.className = 'btn btn-danger w-full mt-3';
        clearBtn.textContent = 'Vider la liste';
        clearBtn.onclick = () => {
            if (confirm('Vider la liste ?')) {
                shoppingList = {}; checkedShoppingListItems = {};
                saveShoppingListToStorage(); saveCheckedItemsToStorage();
                displayShoppingList(); 
            }
        };
        actionsDiv.appendChild(clearBtn);
        shoppingListScreen.appendChild(actionsDiv);
    }
    function handleShoppingListItemCheck(event) { /* ... (inchangé) ... */ 
        const checkbox = event.target;
        const identifier = checkbox.dataset.identifier;
        const listItem = checkbox.closest('.ingredient-item');
        if (checkbox.checked) {
            checkedShoppingListItems[identifier] = true;
            if (listItem) listItem.classList.add('checked');
        } else {
            delete checkedShoppingListItems[identifier];
            if (listItem) listItem.classList.remove('checked');
        }
        saveCheckedItemsToStorage();
    }
    function updateShoppingListBadgesAndBanner() { /* ... (inchangé) ... */ 
        const totalItems = Object.values(shoppingList).reduce((acc, cat) => acc + Object.keys(cat).length, 0);
        const navListBadge = document.getElementById('nav-list-badge');
        if (shoppingListBanner) {
            if (totalItems > 0) {
                shoppingListBanner.style.display = 'flex';
                if (bannerRecipeCount) bannerRecipeCount.textContent = `${totalItems} ingrédient${totalItems > 1 ? 's' : ''}`;
            } else {
                shoppingListBanner.style.display = 'none';
            }
        }
        if (navListBadge) {
            navListBadge.style.display = totalItems > 0 ? 'inline-block' : 'none';
            if (totalItems > 0) navListBadge.textContent = totalItems;
        }
    }
    
    // --- Gestionnaires d'Événements ---
    function handlePeopleCountChange() { /* ... (inchangé) ... */ 
        peopleCount = parseInt(this.value) || 2;
        if (currentScreenBaseId === 'recipe-details' && selectedRecipe) {
            showRecipeDetails(selectedRecipe);
        }
    }

    function setupGlobalEventListeners() {
        navButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const tabBaseId = btn.getAttribute('data-tab');
                if (!tabBaseId) return;
                const fullScreenId = `${tabBaseId}-screen`;
                if (tabBaseId === 'list') displayShoppingList();
                else if (tabBaseId === 'favorites') displayFavorites();
                switchScreen(fullScreenId);
            });
        });
        bannerViewListBtn?.addEventListener('click', () => { displayShoppingList(); switchScreen('list-screen'); });
        searchInput?.addEventListener('input', handleSearch);
        document.getElementById('back-to-home-fav')?.addEventListener('click', () => switchScreen('home-screen'));
    }

    // --- Lancement ---
    initializeApp();
});