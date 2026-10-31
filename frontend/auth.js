/**
 * IdeaProof — Authentication & Session Manager
 * Handles login, registration, JWT storage, and navbar state across all pages.
 */

(function () {
    'use strict';

    const isLocalDev = location.hostname === "localhost" || location.hostname === "127.0.0.1";
    const API_BASE = isLocalDev ? "http://localhost:3000" : "";
    const TOKEN_KEY = "ideaproof_token";
    const USER_KEY = "ideaproof_user";

    const Auth = {
        API_BASE: API_BASE,

        getToken: function () {
            try {
                return localStorage.getItem(TOKEN_KEY) || null;
            } catch (e) {
                return null;
            }
        },

        getUser: function () {
            try {
                const raw = localStorage.getItem(USER_KEY);
                return raw ? JSON.parse(raw) : null;
            } catch (e) {
                return null;
            }
        },

        isAuthenticated: function () {
            const token = Auth.getToken();
            const user = Auth.getUser();
            return Boolean(token && user && user.id);
        },

        saveSession: function (token, user) {
            try {
                localStorage.setItem(TOKEN_KEY, token);
                // Only store safe, non-sensitive user identity
                const safeUser = {
                    id: user.id || user._id,
                    name: user.name || "Founder",
                    email: user.email || ""
                };
                localStorage.setItem(USER_KEY, JSON.stringify(safeUser));
            } catch (e) {
                console.error("Failed to save auth session to localStorage", e);
            }
        },

        logout: function (redirectUrl) {
            try {
                localStorage.removeItem(TOKEN_KEY);
                localStorage.removeItem(USER_KEY);
            } catch (e) {
                console.error("Error clearing session", e);
            }
            if (redirectUrl) {
                window.location.href = redirectUrl;
            } else {
                window.location.reload();
            }
        },

        getSafeRedirectUrl: function (defaultUrl) {
            defaultUrl = defaultUrl || "community.html";
            try {
                const params = new URLSearchParams(window.location.search);
                const redirect = params.get("redirect");
                // Only permit same-site relative paths (reject arbitrary protocols or domain traversal)
                if (
                    redirect &&
                    !redirect.startsWith("//") &&
                    !redirect.includes("://") &&
                    !redirect.includes("..") &&
                    !redirect.includes("\\") &&
                    /^[a-zA-Z0-9_./-]+\.html(\?.*)?$/.test(redirect)
                ) {
                    return redirect;
                }
            } catch (e) {
                // fallback
            }
            return defaultUrl;
        },

        /**
         * Dynamically updates the navbar auth area across all pages
         */
        initNavAuth: function (targetSelector) {
            const container = document.querySelector(targetSelector || ".nav-auth-slot");
            if (!container) return;

            const isAuthed = Auth.isAuthenticated();
            const user = Auth.getUser();

            container.innerHTML = "";

            if (isAuthed && user) {
                // Dropdown container
                const userWrap = document.createElement("div");
                userWrap.className = "nav-user-menu";

                const userBtn = document.createElement("button");
                userBtn.className = "nav-user-btn";
                userBtn.type = "button";
                userBtn.setAttribute("aria-haspopup", "true");
                userBtn.setAttribute("aria-expanded", "false");

                const avatar = document.createElement("span");
                avatar.className = "nav-user-avatar";
                avatar.textContent = (user.name || "U").charAt(0).toUpperCase();

                const userName = document.createElement("span");
                userName.className = "nav-user-name";
                userName.textContent = user.name.split(" ")[0];

                const caret = document.createElement("span");
                caret.className = "nav-user-caret";
                caret.textContent = "▾";

                userBtn.appendChild(avatar);
                userBtn.appendChild(userName);
                userBtn.appendChild(caret);

                // Dropdown menu
                const dropdown = document.createElement("div");
                dropdown.className = "nav-dropdown";

                const myIdeasLink = document.createElement("a");
                myIdeasLink.href = "community.html?filter=my";
                myIdeasLink.textContent = "📁 My Published Ideas";

                const requestsLink = document.createElement("a");
                requestsLink.href = "interests.html";
                requestsLink.textContent = "🤝 Collaboration Requests";

                const publishLink = document.createElement("a");
                publishLink.href = "publish.html";
                publishLink.textContent = "✏️ Publish New Idea";

                const divider = document.createElement("hr");
                divider.className = "nav-dropdown-divider";

                const logoutBtn = document.createElement("button");
                logoutBtn.type = "button";
                logoutBtn.className = "nav-dropdown-logout";
                logoutBtn.textContent = "🚪 Log Out";
                logoutBtn.addEventListener("click", function () {
                    Auth.logout("index.html");
                });

                dropdown.appendChild(publishLink);
                dropdown.appendChild(myIdeasLink);
                dropdown.appendChild(requestsLink);
                dropdown.appendChild(divider);
                dropdown.appendChild(logoutBtn);

                userBtn.addEventListener("click", function (e) {
                    e.stopPropagation();
                    const isOpen = dropdown.classList.toggle("is-open");
                    userBtn.setAttribute("aria-expanded", isOpen ? "true" : "false");
                });

                document.addEventListener("click", function (e) {
                    if (!userWrap.contains(e.target)) {
                        dropdown.classList.remove("is-open");
                        userBtn.setAttribute("aria-expanded", "false");
                    }
                });

                userWrap.appendChild(userBtn);
                userWrap.appendChild(dropdown);
                container.appendChild(userWrap);
            } else {
                // Log In / Register CTA link
                const loginLink = document.createElement("a");
                loginLink.href = "auth.html";
                loginLink.className = "nav-login-link";
                loginLink.textContent = "Sign In";

                container.appendChild(loginLink);
            }
        }
    };

    window.IdeaProofAuth = Auth;

    // Auto-initialize theme switcher if present
    document.addEventListener("DOMContentLoaded", function () {
        const html = document.documentElement;
        const themeBtns = document.querySelectorAll("[data-theme-target]");
        const storedTheme = localStorage.getItem("ideaproof-theme") || "white";

        function applyTheme(t) {
            html.setAttribute("data-theme", t);
            themeBtns.forEach(function (btn) {
                const active = btn.dataset.themeTarget === t;
                btn.classList.toggle("active", active);
                btn.setAttribute("aria-pressed", active ? "true" : "false");
            });
            localStorage.setItem("ideaproof-theme", t);
        }

        applyTheme(storedTheme);
        themeBtns.forEach(function (btn) {
            btn.addEventListener("click", function () {
                applyTheme(btn.dataset.themeTarget);
            });
        });

        // Auto-run nav auth if slot exists
        Auth.initNavAuth();
    });

    /* ==========================================================================
       AUTH PAGE (auth.html) CONTROLLER LOGIC
       Only activates if the auth form elements exist on the current page.
       ========================================================================== */
    document.addEventListener("DOMContentLoaded", function () {
        const authCard = document.getElementById("auth-card");
        if (!authCard) return;

        let currentMode = "login"; // "login" or "register"

        const tabLogin = document.getElementById("tab-login");
        const tabRegister = document.getElementById("tab-register");
        const form = document.getElementById("auth-form");
        const nameGroup = document.getElementById("group-name");
        const confirmGroup = document.getElementById("group-confirm");
        const submitBtn = document.getElementById("auth-submit-btn");
        const errorAlert = document.getElementById("auth-error");
        const successAlert = document.getElementById("auth-success");

        function setMode(mode) {
            currentMode = mode;
            errorAlert.style.display = "none";
            successAlert.style.display = "none";

            if (mode === "login") {
                tabLogin.classList.add("active");
                tabLogin.setAttribute("aria-selected", "true");
                tabRegister.classList.remove("active");
                tabRegister.setAttribute("aria-selected", "false");

                nameGroup.style.display = "none";
                confirmGroup.style.display = "none";
                submitBtn.textContent = "Sign In to IdeaProof";
            } else {
                tabRegister.classList.add("active");
                tabRegister.setAttribute("aria-selected", "true");
                tabLogin.classList.remove("active");
                tabLogin.setAttribute("aria-selected", "false");

                nameGroup.style.display = "block";
                confirmGroup.style.display = "block";
                submitBtn.textContent = "Create Account";
            }
        }

        if (tabLogin && tabRegister) {
            tabLogin.addEventListener("click", () => setMode("login"));
            tabRegister.addEventListener("click", () => setMode("register"));

            // Check URL query param e.g. auth.html?mode=register
            const urlParams = new URLSearchParams(window.location.search);
            if (urlParams.get("mode") === "register") {
                setMode("register");
            }
        }

        if (form) {
            form.addEventListener("submit", async function (e) {
                e.preventDefault();

                errorAlert.style.display = "none";
                successAlert.style.display = "none";

                const email = document.getElementById("auth-email").value.trim();
                const password = document.getElementById("auth-password").value;

                // Validation
                if (!email || !password) {
                    showError("Please enter both email and password.");
                    return;
                }

                if (currentMode === "register") {
                    const name = document.getElementById("auth-name").value.trim();
                    const confirmPassword = document.getElementById("auth-confirm-password").value;

                    if (!name) {
                        showError("Please enter your name.");
                        return;
                    }
                    if (password.length < 6) {
                        showError("Password must be at least 6 characters.");
                        return;
                    }
                    if (password !== confirmPassword) {
                        showError("Passwords do not match.");
                        return;
                    }

                    await handleAuthSubmit("/api/auth/register", {
                        name: name,
                        email: email,
                        password: password
                    });
                } else {
                    await handleAuthSubmit("/api/auth/login", {
                        email: email,
                        password: password
                    });
                }
            });
        }

        function showError(msg) {
            errorAlert.textContent = msg;
            errorAlert.style.display = "block";
        }

        function showSuccess(msg) {
            successAlert.textContent = msg;
            successAlert.style.display = "block";
        }

        async function handleAuthSubmit(endpoint, payload) {
            submitBtn.disabled = true;
            const originalText = submitBtn.textContent;
            submitBtn.textContent = "Processing...";

            try {
                const response = await fetch(API_BASE + endpoint, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify(payload)
                });

                const data = await response.json();

                if (!response.ok || !data.success) {
                    throw new Error(data.message || "Authentication failed");
                }

                // Save JWT and user session
                Auth.saveSession(data.token, data.user);

                showSuccess("Success! Redirecting...");

                // Navigate to intended destination
                const nextUrl = Auth.getSafeRedirectUrl("community.html");
                setTimeout(function () {
                    window.location.href = nextUrl;
                }, 700);

            } catch (err) {
                showError(err.message || "Network error. Please try again.");
                submitBtn.disabled = false;
                submitBtn.textContent = originalText;
            }
        }
    });

})();
