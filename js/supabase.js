
const SUPABASE_URL = "https://qkvfnbsgbweqgoxjcrgl.supabase.co";        
const SUPABASE_ANON_KEY = "sb_publishable_PgUuoq8JLhO7UJ2in2QQ0g_TLPVxbNQ"

const IMAGE_BUCKET = "recipe-images"; 
const MAX_IMAGE_SIZE_MB = 5;

const CONFIG_MISSING =
  SUPABASE_URL.startsWith("YOUR_") || SUPABASE_ANON_KEY.startsWith("YOUR_");


const db = window.supabase.createClient(
  CONFIG_MISSING ? "https://placeholder.supabase.co" : SUPABASE_URL,
  CONFIG_MISSING ? "placeholder-key" : SUPABASE_ANON_KEY
);

document.addEventListener("DOMContentLoaded", () => {
  if (!CONFIG_MISSING) return;
  const banner = document.createElement("div");
  banner.className = "config-banner";
  banner.innerHTML =
    "<strong>Supabase is not connected yet.</strong> Open <code>js/supabase.js</code> and paste your Project URL and anon public key.";
  document.body.prepend(banner);
});

const PLACEHOLDER_IMG =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 300'>" +
      "<rect width='400' height='300' fill='#FBE4EA'/>" +
      "<circle cx='200' cy='150' r='80' fill='#FFF9F3'/>" +
      "<circle cx='200' cy='150' r='54' fill='#FFD9C2'/>" +
      "<text x='200' y='168' font-size='48' text-anchor='middle'>🍽️</text></svg>"
  );

const RECIPE_SELECT =
  "id, title, description, ingredients, instructions, cooking_time, image_url, " +
  "author_id, category_id, created_at, updated_at, categories(name), profiles!author_id(full_name)";

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (ch) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[ch]));
}

function formatDate(isoString) {
  if (!isoString) return "";
  return new Date(isoString).toLocaleDateString("en-GB", {
    day: "numeric", month: "short", year: "numeric",
  });
}

function splitLines(text) {
  return String(text || "").split("\n").map((line) => line.trim()).filter(Boolean);
}

function getQueryParam(name) {
  return new URLSearchParams(window.location.search).get(name);
}

function errorMessage(err) {
  return err && err.message ? err.message : "Something went wrong. Please try again.";
}

function showAlert(containerId, message, type = "danger") {
  const box = document.getElementById(containerId);
  if (!box) return;
  box.innerHTML =
    `<div class="alert alert-${type} alert-dismissible fade show rn-alert" role="alert">` +
    `${escapeHtml(message)}` +
    `<button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button></div>`;
  box.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function clearAlert(containerId) {
  const box = document.getElementById(containerId);
  if (box) box.innerHTML = "";
}

function setButtonLoading(button, isLoading, text = "Please wait...") {
  if (!button) return;
  if (isLoading) {
    button.dataset.originalHtml = button.innerHTML;
    button.disabled = true;
    button.innerHTML =
      `<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>${escapeHtml(text)}`;
  } else {
    button.disabled = false;
    if (button.dataset.originalHtml) button.innerHTML = button.dataset.originalHtml;
  }
}

function loadingHTML(text = "Loading...") {
  return (
    `<div class="col-12 text-center py-5">` +
    `<div class="spinner-border text-rn" role="status" aria-hidden="true"></div>` +
    `<p class="mt-3 mb-0 text-soft">${escapeHtml(text)}</p></div>`
  );
}

function emptyStateHTML(emoji, title, text, buttonHtml = "") {
  return (
    `<div class="col-12"><div class="empty-state">` +
    `<span class="empty-emoji" aria-hidden="true">${emoji}</span>` +
    `<h3>${escapeHtml(title)}</h3>` +
    `<p class="text-soft mb-3">${escapeHtml(text)}</p>${buttonHtml}</div></div>`
  );
}

function recipeCardHTML(recipe, mode = "public") {
  const id = escapeHtml(recipe.id);
  const title = escapeHtml(recipe.title);
  const category = escapeHtml(recipe.categories ? recipe.categories.name : "Uncategorised");
  const author = escapeHtml(
    recipe.profiles && recipe.profiles.full_name ? recipe.profiles.full_name : "RecipeNest cook"
  );
  const image = recipe.image_url ? escapeHtml(recipe.image_url) : PLACEHOLDER_IMG;
  const link = `recipe-details.html?id=${encodeURIComponent(recipe.id)}`;

  const description =
    mode === "public" ? `<p class="recipe-card-desc">${escapeHtml(recipe.description)}</p>` : "";
  const authorRow =
    mode === "public" ? `<li><i class="bi bi-person"></i>${author}</li>` : "";

  const actions =
    mode === "mine"
      ? `<div class="recipe-card-actions">
           <a class="btn btn-rn btn-sm" href="${link}"><i class="bi bi-eye me-1"></i>View</a>
           <a class="btn btn-rn-sage btn-sm" href="edit-recipe.html?id=${encodeURIComponent(recipe.id)}"><i class="bi bi-pencil me-1"></i>Edit</a>
           <button type="button" class="btn btn-rn-danger btn-sm js-delete-btn" data-id="${id}"><i class="bi bi-trash me-1"></i>Delete</button>
         </div>`
      : `<a class="btn btn-rn w-100" href="${link}">View Recipe</a>`;

  return `
    <div class="col">
      <article class="recipe-card">
        <a class="recipe-card-img-wrap" href="${link}" tabindex="-1" aria-hidden="true">
          <img src="${image}" alt="" loading="lazy" onerror="this.onerror=null;this.src=PLACEHOLDER_IMG">
          <span class="category-badge">${category}</span>
        </a>
        <div class="recipe-card-body">
          <h3 class="recipe-card-title">${title}</h3>
          ${description}
          <ul class="recipe-meta">
            <li><i class="bi bi-clock"></i>${escapeHtml(recipe.cooking_time)} min</li>
            ${authorRow}
            <li><i class="bi bi-calendar3"></i>${formatDate(recipe.created_at)}</li>
          </ul>
          ${actions}
        </div>
      </article>
    </div>`;
}

function renderRecipeGrid(container, recipes, mode, emptyHtml) {
  if (!recipes || recipes.length === 0) {
    container.innerHTML = emptyHtml;
    return;
  }
  container.innerHTML = recipes.map((r) => recipeCardHTML(r, mode)).join("");
}

function validateImageFile(file) {
  const allowed = ["image/jpeg", "image/png", "image/webp"];
  if (!allowed.includes(file.type)) return "Please choose a JPG, PNG or WebP image.";
  if (file.size > MAX_IMAGE_SIZE_MB * 1024 * 1024) {
    return `Image is too large. Maximum size is ${MAX_IMAGE_SIZE_MB} MB.`;
  }
  return null;
}


async function uploadRecipeImage(file, userId) {
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
  const uniqueName = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  const { error } = await db.storage
    .from(IMAGE_BUCKET)
    .upload(uniqueName, file, { cacheControl: "3600", upsert: false, contentType: file.type });
  if (error) throw error;

  const { data } = db.storage.from(IMAGE_BUCKET).getPublicUrl(uniqueName);
  return data.publicUrl;
}


function imagePathFromUrl(url) {
  if (!url) return null;
  const marker = `/${IMAGE_BUCKET}/`;
  const index = url.indexOf(marker);
  if (index === -1) return null; 
  return decodeURIComponent(url.slice(index + marker.length).split("?")[0]);
}

async function removeImageByUrl(url) {
  const path = imagePathFromUrl(url);
  if (!path) return;
  try {
    await db.storage.from(IMAGE_BUCKET).remove([path]);
  } catch (err) {
    console.warn("Could not remove old image:", err);
  }
}

function setupImagePreview(inputId, previewId) {
  const input = document.getElementById(inputId);
  const preview = document.getElementById(previewId);
  input.addEventListener("change", () => {
    const file = input.files[0];
    if (!file) return;
    const problem = validateImageFile(file);
    if (problem) {
      input.value = "";
      showAlert("form-alert", problem, "danger");
      return;
    }
    clearAlert("form-alert");
    preview.src = URL.createObjectURL(file);
    preview.classList.remove("d-none");
  });
}

async function deleteRecipeById(recipeId, imageUrl) {
  const { data, error } = await db.from("recipes").delete().eq("id", recipeId).select("id");
  if (error) throw error;
  if (!data || data.length === 0) throw new Error("You can only delete your own recipes.");
  await removeImageByUrl(imageUrl);
}
