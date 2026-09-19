
let myRecipes = [];   
let pendingDeleteId = null;

async function loadMyRecipes(user) {
  const grid = document.getElementById("my-grid");
  grid.innerHTML = loadingHTML("Loading your recipes...");

  const { data, error } = await db
    .from("recipes")
    .select(RECIPE_SELECT)
    .eq("author_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error(error);
    grid.innerHTML = emptyStateHTML("⚠️", "Could not load your recipes", errorMessage(error));
    return;
  }

  myRecipes = data;
  renderRecipeGrid(
    grid,
    data,
    "mine",
    emptyStateHTML(
      "👩‍🍳",
      "You haven't created any recipes yet.",
      "Share your first dish with the RecipeNest community.",
      '<a class="btn btn-rn btn-lg" href="create-recipe.html">Create Your First Recipe</a>'
    )
  );
}

async function initMyRecipes() {
  const user = await requireAuth();
  if (!user) return;

  if (getQueryParam("deleted") === "1") {
    showAlert("page-alert", "Recipe deleted successfully.", "success");
  }

  const modal = new bootstrap.Modal(document.getElementById("deleteModal"));
  const confirmBtn = document.getElementById("confirm-delete-btn");


  document.getElementById("my-grid").addEventListener("click", (event) => {
    const button = event.target.closest(".js-delete-btn");
    if (!button) return;
    pendingDeleteId = button.dataset.id;
    const recipe = myRecipes.find((r) => r.id === pendingDeleteId);
    document.getElementById("delete-recipe-name").textContent = recipe ? recipe.title : "";
    modal.show();
  });

  confirmBtn.addEventListener("click", async () => {
    const recipe = myRecipes.find((r) => r.id === pendingDeleteId);
    if (!recipe) return;

    setButtonLoading(confirmBtn, true, "Deleting...");
    try {
      await deleteRecipeById(recipe.id, recipe.image_url);
      modal.hide();
      showAlert("page-alert", "Recipe deleted successfully.", "success");
      await loadMyRecipes(user);
    } catch (err) {
      console.error(err);
      modal.hide();
      showAlert("page-alert", "Recipe deletion failed: " + errorMessage(err), "danger");
    }
    setButtonLoading(confirmBtn, false);
  });

  loadMyRecipes(user);
}

initMyRecipes();
