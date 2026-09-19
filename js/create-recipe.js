
async function initCreateRecipe() {
  const user = await requireAuth();
  if (!user) return;
  await ensureProfile(user); 

  const form = document.getElementById("recipe-form");
  const categorySelect = document.getElementById("recipe-category");

 
  const { data: categories, error: catError } = await db
    .from("categories")
    .select("id, name")
    .order("name");

  if (catError || !categories || categories.length === 0) {
    categorySelect.innerHTML = '<option value="">No categories found</option>';
    showAlert("form-alert", "Categories could not be loaded. Did you run supabase-schema.sql?", "danger");
  } else {
    categorySelect.innerHTML =
      '<option value="">Choose a category</option>' +
      categories.map((c) => `<option value="${escapeHtml(c.id)}">${escapeHtml(c.name)}</option>`).join("");
  }

  setupImagePreview("recipe-image", "image-preview");

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    clearAlert("form-alert");

    
    if (!form.checkValidity()) {
      form.classList.add("was-validated");
      return;
    }

    const button = document.getElementById("publish-btn");
    const file = document.getElementById("recipe-image").files[0];
    setButtonLoading(button, true, file ? "Uploading image..." : "Publishing...");

    let imageUrl = null;

   
    if (file) {
      try {
        imageUrl = await uploadRecipeImage(file, user.id);
      } catch (err) {
        console.error(err);
        setButtonLoading(button, false);
        showAlert("form-alert", "Image upload failed: " + errorMessage(err), "danger");
        return;
      }
    }

    button.innerHTML =
      '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Publishing...';

    const { data, error } = await db
      .from("recipes")
      .insert({
        title: document.getElementById("recipe-title").value.trim(),
        description: document.getElementById("recipe-description").value.trim(),
        category_id: categorySelect.value,
        ingredients: document.getElementById("recipe-ingredients").value.trim(),
        instructions: document.getElementById("recipe-instructions").value.trim(),
        cooking_time: Number(document.getElementById("recipe-time").value),
        image_url: imageUrl,
        author_id: user.id, 
      })
      .select("id")
      .single();

    if (error) {
      console.error(error);
      setButtonLoading(button, false);
      if (imageUrl) await removeImageByUrl(imageUrl); 
      showAlert("form-alert", "Recipe creation failed: " + errorMessage(error), "danger");
      return;
    }

    window.location.href = `recipe-details.html?id=${encodeURIComponent(data.id)}`;
  });
}

initCreateRecipe();
