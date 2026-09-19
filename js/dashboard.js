async function initDashboard() {
  const user = await requireAuth();
  if (!user) return;

  document.getElementById("welcome-name").textContent = getDisplayName(user);

 
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  
  const [totalRes, mineRes, recentRes] = await Promise.all([
    db.from("recipes").select("id", { count: "exact", head: true }),
    db.from("recipes").select("id", { count: "exact", head: true }).eq("author_id", user.id),
    db.from("recipes").select("id", { count: "exact", head: true }).gte("created_at", weekAgo),
  ]);

  document.getElementById("stat-total").textContent = totalRes.error ? "–" : totalRes.count;
  document.getElementById("stat-mine").textContent = mineRes.error ? "–" : mineRes.count;
  document.getElementById("stat-recent").textContent = recentRes.error ? "–" : recentRes.count;

 
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
      "Add the first recipe to get things started.",
      '<a class="btn btn-rn" href="create-recipe.html">Add Recipe</a>'
    )
  );
}

initDashboard();
