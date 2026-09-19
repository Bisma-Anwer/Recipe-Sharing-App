
async function initEditRecipe() {
  const user = await requireAuth();
  if (!user) return;

  const recipeId = getQueryParam("id");
  const form = document.getElementById("recipe-form");
  const categorySelect = document.getElementById("recipe-category");
  const preview = document.getElementById("image-preview");

  if (!recipeId) return showNotFound();

 
  const [catRes, recipeRes] = await Promise.all([
    db.from("categories").select("id, name").order("name"),
    db.from("recipes").select("*").eq("id", recipeId).maybeSingle(),
  ]);

  if (recipeRes.error) console.error(recipeRes.error);
  if (recipeRes.error || !recipeRes.data) return showNotFound();

  const recipe = recipeRes.data;

  
  if (recipe.author_id !== user.id) {
    document.getElementById("edit-loading").classList.add("d-none");
    showAlert("page-alert", "You can only edit your own recipes. Redirecting...", "danger");
    setTimeout(() => (window.location.replace("my-recipes.html")), 2000);
    return;
  }


  categorySelect.innerHTML =
    '<option value="">Choose a category</option>' +
    (catRes.data || []).map((c) => `<option value="${escapeHtml(c.id)}">${escapeHtml(c.name)}</option>`).join("");
  categorySelect.value = recipe.category_id;

  document.getElementById("recipe-title").value = recipe.title;
  document.getElementById("recipe-description").value = recipe.description;
  document.getElementById("recipe-ingredients").value = recipe.ingredients;
  document.getElementById("recipe-instructions").value = recipe.instructions;
  document.getElementById("recipe-time").value = recipe.cooking_time;

  if (recipe.image_url) {
    preview.src = recipe.image_url;
    preview.classList.remove("d-none");
    preview.onerror = () => { preview.onerror = null; preview.src = PLACEHOLDER_IMG; };
  }

  document.getElementById("cancel-link").href = `recipe-details.html?id=${encodeURIComponent(recipe.id)}`;
  document.getElementById("edit-loading").classList.add("d-none");
  form.classList.remove("d-none");

  setupImagePreview("recipe-image", "image-preview");

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    clearAlert("form-alert");

    if (!form.checkValidity()) {
      form.classList.add("was-validated");
      return;
    }

    const button = document.getElementById("update-btn");
    const file = document.getElementById("recipe-image").files[0];
    setButtonLoading(button, true, file ? "Uploading image..." : "Saving...");

    let newImageUrl = null;
    if (file) {
      try {
        newImageUrl = await uploadRecipeImage(file, user.id);
      } catch (err) {
        console.error(err);
        setButtonLoading(button, false);
        showAlert("form-alert", "Image upload failed: " + errorMessage(err), "danger");
        return;
      }
    }

    const changes = {
      title: document.getElementById("recipe-title").value.trim(),
      description: document.getElementById("recipe-description").value.trim(),
      category_id: categorySelect.value,
      ingredients: document.getElementById("recipe-ingredients").value.trim(),
      instructions: document.getElementById("recipe-instructions").value.trim(),
      cooking_time: Number(document.getElementById("recipe-time").value),
    };
    if (newImageUrl) changes.image_url = newImageUrl;

    const { data, error } = await db
      .from("recipes")
      .update(changes)
      .eq("id", recipe.id)
      .select("id");

    if (error || !data || data.length === 0) {
      console.error(error);
      setButtonLoading(button, false);
      if (newImageUrl) await removeImageByUrl(newImageUrl);
      showAlert(
        "form-alert",
        "Recipe update failed: " + (error ? errorMessage(error) : "you can only edit your own recipes."),
        "danger"
      );
      return;
    }

    if (newImageUrl) await removeImageByUrl(recipe.image_url); // delete the replaced picture
    window.location.href = `recipe-details.html?id=${encodeURIComponent(recipe.id)}`;
  });
}

function showNotFound() {
  document.getElementById("edit-loading").classList.add("d-none");
  document.getElementById("edit-not-found").classList.remove("d-none");
}

initEditRecipe();
