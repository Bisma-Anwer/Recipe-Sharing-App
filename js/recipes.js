const grid = document.getElementById("recipes-grid");
const searchInput = document.getElementById("search-input");
const searchForm = document.getElementById("search-form");
const resultsCount = document.getElementById("results-count");
const pills = document.querySelectorAll(".filter-pill");

let activeCategory = "All"; 
let categoryIds = {};         

async function loadCategoryIds() {
  const { data, error } = await db.from("categories").select("id, name");
  if (error) {
    console.error(error);
    return;
  }
  data.forEach((c) => { categoryIds[c.name.toLowerCase()] = c.id; });
}

function setActivePill(name) {
  activeCategory = name;
  pills.forEach((pill) => {
    const isActive = pill.dataset.category.toLowerCase() === name.toLowerCase();
    pill.classList.toggle("active", isActive);
    pill.setAttribute("aria-pressed", isActive ? "true" : "false");
  });
}

async function loadRecipes() {
  grid.innerHTML = loadingHTML("Loading recipes...");
  resultsCount.textContent = "";

  let query = db.from("recipes").select(RECIPE_SELECT);

 
  if (activeCategory !== "All") {
    const id = categoryIds[activeCategory.toLowerCase()];
    if (id) query = query.eq("category_id", id);
  }


  const term = searchInput.value.trim().replace(/[%_,()]/g, " ").trim();
  if (term) query = query.ilike("title", `%${term}%`);

  const { data, error } = await query.order("created_at", { ascending: false });

  if (error) {
    console.error(error);
    grid.innerHTML = emptyStateHTML("⚠️", "Could not load recipes", errorMessage(error));
    return;
  }

  resultsCount.textContent =
    data.length === 1 ? "1 recipe found" : `${data.length} recipes found`;

  renderRecipeGrid(
    grid,
    data,
    "public",
    emptyStateHTML(
      "🔍",
      "No recipes found.",
      "Try a different search word or pick another category.",
      '<button type="button" class="btn btn-rn" id="reset-filters-btn">Clear search and filters</button>'
    )
  );
}



searchForm.addEventListener("submit", (event) => {
  event.preventDefault();
  loadRecipes();
});

let searchTimer;
searchInput.addEventListener("input", () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(loadRecipes, 350); 
});

pills.forEach((pill) => {
  pill.addEventListener("click", () => {
    setActivePill(pill.dataset.category);
    loadRecipes();
  });
});


grid.addEventListener("click", (event) => {
  if (event.target.closest("#reset-filters-btn")) {
    searchInput.value = "";
    setActivePill("All");
    loadRecipes();
  }
});

(async function init() {
  await loadCategoryIds();

 
  const fromUrl = getQueryParam("category");
  if (fromUrl) {
    const match = Array.from(pills).find(
      (p) => p.dataset.category.toLowerCase() === fromUrl.toLowerCase()
    );
    if (match) setActivePill(match.dataset.category);
  }

  const q = getQueryParam("q");
  if (q) searchInput.value = q;

  loadRecipes();
})();
