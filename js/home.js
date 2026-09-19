
async function loadRecentRecipes() {
  const grid = document.getElementById("recent-grid");
  grid.innerHTML = loadingHTML("Loading recipes...");

  
  const { data, error } = await db
    .from("recipes")
    .select(RECIPE_SELECT)
    .order("created_at", { ascending: false })
    .limit(6);

  if (error) {
    console.error(error);
    grid.innerHTML = emptyStateHTML("⚠️", "Could not load recipes", errorMessage(error));
    return;
  }

  renderRecipeGrid(
    grid,
    data,
    "public",
    emptyStateHTML(
      "🍽️",
      "No recipes found.",
      "Be the first to share a dish with the community.",
      '<a class="btn btn-rn" href="create-recipe.html">Share Your Recipe</a>'
    )
  );
}

loadRecentRecipes();
