(function () {
  "use strict";

  const params = new URLSearchParams(window.location.search);
  const form = document.getElementById("loginForm");
  const error = document.getElementById("loginError");
  const modeToggle = document.getElementById("authModeToggle");
  const submitButton = form.querySelector('button[type="submit"]');
  const intro = document.getElementById("authIntro");
  let registering = params.get("mode") === "register";

  // Palitan ang itsura at required fields depende kung sign in o register ang mode.
  function setMode(isRegistering) {
    registering = isRegistering;
    document.getElementById("registerNameGroup").style.display = registering ? "block" : "none";
    document.getElementById("confirmPasswordGroup").style.display = registering ? "block" : "none";
    document.getElementById("profileName").required = registering;
    document.getElementById("confirmPassword").required = registering;
    document.getElementById("password").autocomplete = registering ? "new-password" : "current-password";
    submitButton.textContent = registering ? "Create profile" : "Sign in";
    modeToggle.textContent = registering ? "Already have an account? Sign in" : "Create a buyer profile";
    intro.textContent = registering
      ? "Create a buyer profile to save your delivery details and demo payment methods."
      : "Sign in to your Buy & Bye account.";
    document.querySelector("h1").textContent = registering ? "Create profile" : "Sign in";
    error.style.display = "none";
  }

  modeToggle.addEventListener("click", () => setMode(!registering));

  // I-validate ang form, tapos mag-login o gumawa ng buyer profile.
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value;

    if (registering) {
      const name = document.getElementById("profileName").value.trim();
      const confirmPassword = document.getElementById("confirmPassword").value;
      if (name.length < 2 || username.length < 3 || password.length < 6) {
        showError("Enter a name, username (at least 3 characters), and password (at least 6 characters).");
        return;
      }
      if (!/^[a-zA-Z0-9._-]+$/.test(username)) {
        showError("Username may contain letters, numbers, dots, underscores, and hyphens only.");
        return;
      }
      if (password !== confirmPassword) {
        showError("The passwords do not match.");
        return;
      }

      try {
        if (!STORE.registerBuyerProfile({ name, username, password })) {
          showError("That username is already in use.");
          return;
        }
      } catch (registrationError) {
        console.error("Unable to create buyer profile.", registrationError);
        showError("Unable to save your profile in this browser. Please try again.");
        return;
      }
      navigateAfterLogin("buyer");
      return;
    }

    let loggedIn = false;
    try {
      loggedIn = STORE.login(username, password);
    } catch (loginError) {
      console.error("Unable to sign in.", loginError);
      showError("Unable to save your sign-in in this browser. Please enable site storage and try again.");
      return;
    }
    if (!loggedIn) {
      showError("Those credentials do not match an account.");
      return;
    }
    navigateAfterLogin(STORE.getSession().role);
  });

  // Ipakita ang error message kapag may invalid na input o pumalya ang login/register.
  function showError(message) {
    error.textContent = message;
    error.style.display = "block";
  }

  // Dalhin ang user sa page na dapat niyang puntahan pagkatapos mag-login.
  function navigateAfterLogin(role) {
    const next = params.get("next");
    const destination = next
      ? new URL(next, window.location.href)
      : new URL(role === "seller" ? "seller.html" : "index.html", window.location.href);

    // Keep return links inside this deployment, including GitHub Pages project sites.
    if (destination.origin !== window.location.origin) {
      window.location.replace(new URL(role === "seller" ? "seller.html" : "index.html", window.location.href).href);
      return;
    }
    window.location.replace(destination.href);
  }

  setMode(registering);
  if (window.lucide) window.lucide.createIcons();
})();
