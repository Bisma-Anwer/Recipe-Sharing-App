const recipeId = getQueryParam("id");
let currentUser = null;
let currentRecipe = null;

const byId = (id) => document.getElementById(id);



async function loadRecipe() {
  currentUser = await getCurrentUser();

  if (!recipeId) return showNotFound();

  const { data: recipe, error } = await db
    .from("recipes")
    .select(RECIPE_SELECT)
    .eq("id", recipeId)
    .maybeSingle();

  if (error) console.error(error);
  if (error || !recipe) return showNotFound();

  currentRecipe = recipe;
  fillRecipe(recipe);
  byId("recipe-loading").classList.add("d-none");
  byId("recipe-content").classList.remove("d-none");

  setupOwnerButtons(recipe);
  setupCommunity();
}

function showNotFound() {
  byId("recipe-loading").classList.add("d-none");
  byId("recipe-error").classList.remove("d-none");
}

function fillRecipe(recipe) {
  document.title = `${recipe.title} | RecipeNest`;

  const image = byId("rd-image");
  image.src = recipe.image_url || PLACEHOLDER_IMG;
  image.alt = recipe.title;
  image.onerror = () => { image.onerror = null; image.src = PLACEHOLDER_IMG; };

  byId("rd-category").textContent = recipe.categories ? recipe.categories.name : "Uncategorised";
  byId("rd-title").textContent = recipe.title;
  byId("rd-time").textContent = `${recipe.cooking_time} min`;
  byId("rd-author").textContent =
    recipe.profiles && recipe.profiles.full_name ? recipe.profiles.full_name : "RecipeNest cook";
  byId("rd-date").textContent = formatDate(recipe.created_at);
  byId("rd-description").textContent = recipe.description;

  byId("rd-ingredients").innerHTML = splitLines(recipe.ingredients)
    .map((line) => `<li><span>${escapeHtml(line)}</span></li>`)
    .join("");

  
  byId("rd-instructions").innerHTML = splitLines(recipe.instructions)
    .map((line) => `<li><span>${escapeHtml(line.replace(/^\d+[.)]\s*/, ""))}</span></li>`)
    .join("");
}



function setupOwnerButtons(recipe) {
  const isOwner = currentUser && currentUser.id === recipe.author_id;
  if (!isOwner) return; 

  byId("owner-actions").classList.remove("d-none");
  byId("edit-link").href = `edit-recipe.html?id=${encodeURIComponent(recipe.id)}`;
  byId("delete-recipe-name").textContent = recipe.title;

  const modal = new bootstrap.Modal(byId("deleteModal"));
  byId("delete-btn").addEventListener("click", () => modal.show());

  byId("confirm-delete-btn").addEventListener("click", async () => {
    const button = byId("confirm-delete-btn");
    setButtonLoading(button, true, "Deleting...");
    try {
      await deleteRecipeById(recipe.id, recipe.image_url);
      window.location.href = "my-recipes.html?deleted=1";
    } catch (err) {
      console.error(err);
      setButtonLoading(button, false);
      modal.hide();
      showAlert("page-alert", "Recipe deletion failed: " + errorMessage(err), "danger");
    }
  });
}


function setupCommunity() {
  loadRatings();
  loadComments();
  setupFavorite();
  setupCommentForm();

  if (!currentUser) {
    byId("login-hint").classList.remove("d-none");
    byId("comment-form").classList.add("d-none");
  }
}


async function loadRatings() {
  const { data, error } = await db
    .from("recipe_ratings")
    .select("rating, user_id")
    .eq("recipe_id", recipeId);

  if (error) {
    console.error(error);
    byId("rating-summary").textContent = "Ratings are unavailable right now.";
    return;
  }

  const count = data.length;
  const average = count ? data.reduce((sum, r) => sum + r.rating, 0) / count : 0;
  const mine = currentUser ? data.find((r) => r.user_id === currentUser.id) : null;

  byId("rating-summary").textContent = count
    ? `${average.toFixed(1)} out of 5 from ${count} ${count === 1 ? "rating" : "ratings"}`
    : "No ratings yet";

  renderStars(mine ? mine.rating : 0);
}

function renderStars(myRating) {
  byId("rating-stars").innerHTML = [1, 2, 3, 4, 5]
    .map(
      (n) =>
        `<button type="button" class="star-btn" data-value="${n}" aria-label="Rate ${n} out of 5" ${currentUser ? "" : "disabled"}>` +
        `<i class="bi ${n <= myRating ? "bi-star-fill" : "bi-star"}"></i></button>`
    )
    .join("");
  byId("rating-hint").textContent = currentUser
    ? myRating ? `You rated this ${myRating} out of 5. Tap a star to change it.` : "Tap a star to rate this recipe."
    : "Log in to rate this recipe.";
}

byId("rating-stars").addEventListener("click", async (event) => {
  const button = event.target.closest(".star-btn");
  if (!button || !currentUser) return;

  const { error } = await db.from("recipe_ratings").upsert(
    { recipe_id: recipeId, user_id: currentUser.id, rating: Number(button.dataset.value) },
    { onConflict: "recipe_id,user_id" }
  );
  if (error) {
    console.error(error);
    showAlert("community-alert", "Could not save your rating: " + errorMessage(error), "danger");
    return;
  }
  clearAlert("community-alert");
  loadRatings();
});


function paintFavorite(isFavorite) {
  const button = byId("favorite-btn");
  button.dataset.favorite = isFavorite ? "1" : "0";
  button.innerHTML = isFavorite
    ? '<i class="bi bi-heart-fill me-1"></i>Saved'
    : '<i class="bi bi-heart me-1"></i>Save recipe';
}

async function setupFavorite() {
  paintFavorite(false);

  if (currentUser) {
    const { data } = await db
      .from("recipe_favorites")
      .select("id")
      .eq("recipe_id", recipeId)
      .eq("user_id", currentUser.id)
      .maybeSingle();
    paintFavorite(!!data);
  }

  byId("favorite-btn").addEventListener("click", async () => {
    if (!currentUser) {
      window.location.href = "login.html";
      return;
    }
    const isFavorite = byId("favorite-btn").dataset.favorite === "1";
    const query = isFavorite
      ? db.from("recipe_favorites").delete().eq("recipe_id", recipeId).eq("user_id", currentUser.id)
      : db.from("recipe_favorites").insert({ recipe_id: recipeId, user_id: currentUser.id });

    const { error } = await query;
    if (error) {
      console.error(error);
      showAlert("community-alert", "Could not update your saved recipes: " + errorMessage(error), "danger");
      return;
    }
    clearAlert("community-alert");
    paintFavorite(!isFavorite);
  });
}

async function loadComments() {
  const list = byId("comments-list");
  const { data, error } = await db
    .from("recipe_comments")
    .select("id, comment, created_at, user_id, profiles!user_id(full_name)")
    .eq("recipe_id", recipeId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error(error);
    list.innerHTML = '<p class="text-soft mb-0">Comments are unavailable right now.</p>';
    return;
  }

  byId("comment-count").textContent = data.length;

  if (data.length === 0) {
    list.innerHTML = '<p class="text-soft mb-0">No comments yet. Be the first to share your thoughts!</p>';
    return;
  }

  list.innerHTML = data
    .map((c) => {
      const name = c.profiles && c.profiles.full_name ? c.profiles.full_name : "RecipeNest cook";
      const deleteBtn =
        currentUser && currentUser.id === c.user_id
          ? `<button type="button" class="btn btn-rn-danger btn-sm js-delete-comment" data-id="${escapeHtml(c.id)}">Delete</button>`
          : "";
      return `
        <div class="comment-item">
          <div class="d-flex justify-content-between align-items-start gap-2">
            <div>
              <span class="comment-author">${escapeHtml(name)}</span>
              <span class="comment-date ms-2">${formatDate(c.created_at)}</span>
            </div>
            ${deleteBtn}
          </div>
          <p class="comment-text">${escapeHtml(c.comment)}</p>
        </div>`;
    })
    .join("");
}

function setupCommentForm() {
  byId("comment-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const textarea = byId("comment-text");
    const text = textarea.value.trim();
    if (!text) {
      showAlert("community-alert", "Please write a comment first.", "danger");
      return;
    }
    const button = byId("comment-btn");
    setButtonLoading(button, true, "Posting...");
    const { error } = await db
      .from("recipe_comments")
      .insert({ recipe_id: recipeId, user_id: currentUser.id, comment: text });
    setButtonLoading(button, false);

    if (error) {
      console.error(error);
      showAlert("community-alert", "Could not post your comment: " + errorMessage(error), "danger");
      return;
    }
    clearAlert("community-alert");
    textarea.value = "";
    loadComments();
  });

  byId("comments-list").addEventListener("click", async (event) => {
    const button = event.target.closest(".js-delete-comment");
    if (!button) return;
    button.disabled = true;
    const { error } = await db.from("recipe_comments").delete().eq("id", button.dataset.id);
    if (error) {
      console.error(error);
      button.disabled = false;
      showAlert("community-alert", "Could not delete the comment: " + errorMessage(error), "danger");
      return;
    }
    loadComments();
  });
}

loadRecipe();
