
const NAV_ACTIVE_MAP = {
  "": "index.html",
  "index.html": "index.html",
  "recipe-details.html": "recipes.html",
  "edit-recipe.html": "my-recipes.html",
};

function highlightActiveLink() {
  const page = window.location.pathname.split("/").pop();
  const target = NAV_ACTIVE_MAP[page] || page;
  document.querySelectorAll("#mainNav .nav-link[data-page]").forEach((link) => {
    link.classList.toggle("active", link.dataset.page === target);
  });
}


function applyNavbarState(user) {
  document.querySelectorAll(".auth-only").forEach((el) => el.classList.toggle("d-none", !user));
  document.querySelectorAll(".guest-only").forEach((el) => el.classList.toggle("d-none", !!user));
  document.body.classList.toggle("is-logged-in", !!user);

  if (user) {
    const name = getDisplayName(user);
    const nameEl = document.getElementById("nav-user-name");
    const avatarEl = document.getElementById("nav-avatar");
    if (nameEl) nameEl.textContent = name;
    if (avatarEl) avatarEl.textContent = name.charAt(0).toUpperCase();
  }
}

async function initNavbar() {
  applyNavbarState(await getCurrentUser());
  highlightActiveLink();

 
  const logoutBtn = document.getElementById("logout-btn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
      logoutBtn.disabled = true;
      await logOut();
      window.location.href = "index.html";
    });
  }

 
  db.auth.onAuthStateChange((event, session) => {
    applyNavbarState(session ? session.user : null);
  });
}

initNavbar();
