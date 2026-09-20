
function loginPagePath() {
  return window.location.pathname.includes("/pages/")
    ? "login.html"
    : "pages/login.html";
}

// Dashboard page ka sahi path
function dashboardPagePath() {
  return window.location.pathname.includes("/pages/")
    ? "dashboard.html"
    : "pages/dashboard.html";
}

async function getCurrentUser() {
  const { data, error } = await db.auth.getSession();
  if (error || !data.session) return null;
  return data.session.user;
}


function getDisplayName(user) {
  if (!user) return "";
  const fromSignup = user.user_metadata && user.user_metadata.full_name;
  return fromSignup || (user.email ? user.email.split("@")[0] : "Friend");
}



async function requireAuth() {
  const user = await getCurrentUser();
  if (!user) {
    window.location.replace(loginPagePath());
    return null;
  }
  document.body.classList.add("auth-ready");
  return user;
}

async function redirectIfLoggedIn() {
  const user = await getCurrentUser();
  if (user) window.location.replace(dashboardPagePath());
}


async function ensureProfile(user) {
  try {
    const { data } = await db.from("profiles").select("id").eq("id", user.id).maybeSingle();
    if (!data) {
      await db.from("profiles").insert({
        id: user.id,
        full_name: getDisplayName(user),
        email: user.email,
      });
    }
  } catch (err) {
    console.warn("ensureProfile:", err);
  }
}

async function logOut() {
  await db.auth.signOut();
  window.location.replace(loginPagePath());
}



function clearFieldErrors(form) {
  form.querySelectorAll(".is-invalid").forEach((el) => el.classList.remove("is-invalid"));
}

function setFieldError(input, message) {
  input.classList.add("is-invalid");
  const feedback = input.parentElement.querySelector(".invalid-feedback");
  if (feedback) feedback.textContent = message;
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}



const signupForm = document.getElementById("signup-form");
if (signupForm) {
  redirectIfLoggedIn();

  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    clearFieldErrors(signupForm);
    clearAlert("form-alert");

    const nameInput = document.getElementById("signup-name");
    const emailInput = document.getElementById("signup-email");
    const passwordInput = document.getElementById("signup-password");
    const confirmInput = document.getElementById("signup-confirm");
    const button = document.getElementById("signup-btn");

    const fullName = nameInput.value.trim();
    const email = emailInput.value.trim();
    const password = passwordInput.value;
    const confirm = confirmInput.value;


    let valid = true;
    if (fullName.length < 2) { setFieldError(nameInput, "Please enter your full name."); valid = false; }
    if (!isValidEmail(email)) { setFieldError(emailInput, "Please enter a valid email address."); valid = false; }
    if (password.length < 6) { setFieldError(passwordInput, "Password must be at least 6 characters."); valid = false; }
    if (confirm !== password) { setFieldError(confirmInput, "Passwords do not match."); valid = false; }
    if (!valid) return;


    setButtonLoading(button, true, "Creating account...");
    const { data, error } = await db.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });
    setButtonLoading(button, false);

    if (error) {
      showAlert("form-alert", "Signup failed: " + errorMessage(error), "danger");
      return;
    }

    if (data.user && data.user.identities && data.user.identities.length === 0) {
      showAlert("form-alert", "Signup failed: this email is already registered. Please log in instead.", "danger");
      return;
    }

    if (data.session) {

      await ensureProfile(data.user);
      showAlert("form-alert", "Account created! Taking you to your dashboard...", "success");
      setTimeout(() => window.location.replace(dashboardPagePath()), 1200);
    } else {

      signupForm.reset();
      showAlert(
        "form-alert",
        "Account created! Please check your email and click the confirmation link, then log in.",
        "success"
      );
    }
  });
}



const loginForm = document.getElementById("login-form");
if (loginForm) {
  redirectIfLoggedIn();

  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    clearFieldErrors(loginForm);
    clearAlert("form-alert");

    const emailInput = document.getElementById("login-email");
    const passwordInput = document.getElementById("login-password");
    const button = document.getElementById("login-btn");

    const email = emailInput.value.trim();
    const password = passwordInput.value;

    let valid = true;
    if (!isValidEmail(email)) { setFieldError(emailInput, "Please enter a valid email address."); valid = false; }
    if (!password) { setFieldError(passwordInput, "Please enter your password."); valid = false; }
    if (!valid) return;

    setButtonLoading(button, true, "Logging in...");
    const { data, error } = await db.auth.signInWithPassword({ email, password });
    setButtonLoading(button, false);

    if (error) {
      const friendly = /invalid login/i.test(error.message)
        ? "Incorrect email or password."
        : error.message;
      showAlert("form-alert", "Login failed: " + friendly, "danger");
      return;
    }

    await ensureProfile(data.user);
    window.location.replace(dashboardPagePath());
  });
}