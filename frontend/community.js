/**
 * IdeaProof — Community Discovery Feed & Idea Modal Logic
 */

(function () {
    'use strict';

    const Auth = window.IdeaProofAuth || {};
    const API_BASE = Auth.API_BASE || "";

    // Feed State
    const state = {
        page: 1,
        limit: 9,
        search: "",
        industry: "",
        stage: "",
        lookingFor: "",
        sort: "newest",
        myOnly: false,
        totalPages: 1,
        total: 0,
        isLoading: false,
        ideas: [],
        currentModalIdea: null,
    };

    // DOM Elements
    const grid = document.getElementById("comm-grid");
    const loadingState = document.getElementById("comm-loading");
    const emptyState = document.getElementById("comm-empty");
    const errorState = document.getElementById("comm-error");
    const errorMsg = document.getElementById("comm-error-msg");
    const retryBtn = document.getElementById("comm-retry-btn");
    const resultsCount = document.getElementById("comm-results-count");
    const pagination = document.getElementById("comm-pagination");
    const prevBtn = document.getElementById("comm-prev-page");
    const nextBtn = document.getElementById("comm-next-page");
    const pageIndicator = document.getElementById("comm-page-indicator");

    // Inputs
    const searchInput = document.getElementById("comm-search");
    const searchClear = document.getElementById("comm-search-clear");
    const industrySelect = document.getElementById("filter-industry");
    const stageSelect = document.getElementById("filter-stage");
    const roleSelect = document.getElementById("filter-role");
    const sortSelect = document.getElementById("filter-sort");
    const myIdeasBtn = document.getElementById("btn-filter-my");
    const resetBtn = document.getElementById("btn-reset-filters");
    const clearFiltersBtn = document.getElementById("comm-clear-filters-btn");
    const scrollToBrowseBtn = document.getElementById("scroll-to-browse");

    // Modal Elements
    const modal = document.getElementById("idea-modal");
    const modalClose = document.getElementById("modal-close-btn");
    const modalTitle = document.getElementById("modal-idea-title");
    const modalIndustry = document.getElementById("modal-industry");
    const modalStage = document.getElementById("modal-stage");
    const modalDate = document.getElementById("modal-date");
    const modalFounderAvatar = document.getElementById("modal-founder-avatar");
    const modalFounderName = document.getElementById("modal-founder-name");
    const modalTeamStatus = document.getElementById("modal-team-status");
    const modalFounderInterests = document.getElementById("modal-founder-interests");
    const modalSkillsSection = document.getElementById("modal-skills-section");
    const modalFounderSkills = document.getElementById("modal-founder-skills");
    const modalDescription = document.getElementById("modal-description");
    const modalLookingFor = document.getElementById("modal-looking-for");
    const modalIdealBox = document.getElementById("modal-ideal-box");
    const modalIdealCollaborator = document.getElementById("modal-ideal-collaborator");
    const modalStyleBox = document.getElementById("modal-style-box");
    const modalCollabStyle = document.getElementById("modal-collab-style");
    const modalError = document.getElementById("modal-error");
    const modalSuccess = document.getElementById("modal-success");
    const modalInterestPanel = document.getElementById("modal-interest-panel");
    const modalOwnerActions = document.getElementById("modal-owner-actions");
    const modalGuestBox = document.getElementById("modal-guest-box");
    const modalEditBtn = document.getElementById("modal-edit-btn");
    const modalDeactivateBtn = document.getElementById("modal-deactivate-btn");
    const btnSendInterest = document.getElementById("btn-send-interest");
    const interestTextarea = document.getElementById("interest-message");

    /* ==========================================================================
       UTILITIES & HELPERS
       ========================================================================== */
    function formatRelativeTime(dateString) {
        if (!dateString) return "";
        try {
            const date = new Date(dateString);
            const now = new Date();
            const diffMs = now - date;
            const diffSec = Math.floor(diffMs / 1000);
            const diffMin = Math.floor(diffSec / 60);
            const diffHours = Math.floor(diffMin / 60);
            const diffDays = Math.floor(diffHours / 24);

            if (diffDays > 30) {
                return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
            }
            if (diffDays > 0) return `${diffDays}d ago`;
            if (diffHours > 0) return `${diffHours}h ago`;
            if (diffMin > 0) return `${diffMin}m ago`;
            return "Just now";
        } catch (e) {
            return "";
        }
    }

    function debounce(func, wait) {
        let timeout;
        return function (...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
    }

    /* ==========================================================================
       DATA FETCHING
       ========================================================================== */
    async function fetchIdeas() {
        if (state.isLoading) return;
        state.isLoading = true;

        // UI state transitions
        grid.style.display = "none";
        emptyState.style.display = "none";
        errorState.style.display = "none";
        loadingState.style.display = "flex";
        pagination.style.display = "none";
        resultsCount.textContent = "Loading ideas...";

        try {
            let endpoint;
            const headers = { "Content-Type": "application/json" };

            if (state.myOnly) {
                // Fetch logged-in user's own ideas
                const token = Auth.getToken();
                if (!token) {
                    throw new Error("You must be signed in to view your published ideas.");
                }
                endpoint = API_BASE + "/api/ideas/my";
                headers["Authorization"] = `Bearer ${token}`;
            } else {
                // Public feed with query filters
                const params = new URLSearchParams();
                params.set("page", state.page);
                params.set("limit", state.limit);
                params.set("sort", state.sort);

                if (state.search.trim()) params.set("search", state.search.trim());
                if (state.industry) params.set("industry", state.industry);
                if (state.stage) params.set("stage", state.stage);
                if (state.lookingFor) params.set("lookingFor", state.lookingFor);

                endpoint = API_BASE + "/api/ideas?" + params.toString();
            }

            const response = await fetch(endpoint, { method: "GET", headers });
            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(data.message || "Failed to load ideas.");
            }

            loadingState.style.display = "none";

            if (state.myOnly) {
                state.ideas = data.ideas || [];
                state.total = data.count || state.ideas.length;
                state.totalPages = 1;
            } else {
                state.ideas = data.ideas || [];
                state.total = data.total || 0;
                state.totalPages = data.totalPages || 1;
            }

            renderFeed();

        } catch (err) {
            console.error("Community Feed Error:", err);
            loadingState.style.display = "none";
            errorState.style.display = "flex";
            errorMsg.textContent = err.message || "Cannot connect to the server.";
            resultsCount.textContent = "Error loading ideas";
        } finally {
            state.isLoading = false;
        }
    }

    /* ==========================================================================
       FEED RENDERING (SAFE DOM METHODS)
       ========================================================================== */
    function renderFeed() {
        grid.innerHTML = "";

        if (state.ideas.length === 0) {
            emptyState.style.display = "flex";
            resultsCount.textContent = "0 ideas found";
            return;
        }

        emptyState.style.display = "none";
        grid.style.display = "grid";

        if (state.myOnly) {
            resultsCount.textContent = `Showing ${state.ideas.length} of your published ideas`;
        } else {
            resultsCount.textContent = `Showing ${state.ideas.length} of ${state.total} active ideas`;
        }

        // Render each card safely without unsafe innerHTML interpolation
        state.ideas.forEach((idea) => {
            const card = document.createElement("article");
            card.className = "comm-card";
            card.tabIndex = 0;
            card.setAttribute("role", "listitem");

            // Card Inner Wrapper
            const inner = document.createElement("div");
            inner.className = "comm-card-inner";

            // Header Meta: Industry, Stage, Relative Date
            const topMeta = document.createElement("div");
            topMeta.className = "comm-card-top";

            const badgesWrap = document.createElement("div");
            badgesWrap.className = "comm-badges-wrap";

            const indBadge = document.createElement("span");
            indBadge.className = "comm-badge comm-badge-industry";
            indBadge.textContent = idea.industry || "General";

            const stageBadge = document.createElement("span");
            stageBadge.className = "comm-badge comm-badge-stage";
            stageBadge.textContent = idea.stage || "Idea";

            badgesWrap.appendChild(indBadge);
            badgesWrap.appendChild(stageBadge);

            if (idea.isActive === false) {
                const inactiveBadge = document.createElement("span");
                inactiveBadge.className = "comm-badge comm-badge-inactive";
                inactiveBadge.textContent = "Deactivated";
                badgesWrap.appendChild(inactiveBadge);
            }

            const timeSpan = document.createElement("span");
            timeSpan.className = "comm-card-time";
            timeSpan.textContent = formatRelativeTime(idea.createdAt);

            topMeta.appendChild(badgesWrap);
            topMeta.appendChild(timeSpan);

            // Title
            const titleEl = document.createElement("h3");
            titleEl.className = "comm-card-title";
            titleEl.textContent = idea.title || "Untitled Startup Idea";

            // Description (Truncated)
            const descEl = document.createElement("p");
            descEl.className = "comm-card-desc";
            descEl.textContent = idea.description || "";

            // Founder Line
            const founderLine = document.createElement("div");
            founderLine.className = "comm-card-founder";

            const founderIcon = document.createElement("span");
            founderIcon.className = "comm-founder-icon";
            founderIcon.textContent = "🧑";

            const founderText = document.createElement("span");
            founderText.className = "comm-founder-text";
            const teamInfo = idea.teamSize > 1 ? `Team of ${idea.teamSize}` : "Solo founder";
            founderText.textContent = `By ${idea.founderName || "Founder"} · ${teamInfo}`;

            founderLine.appendChild(founderIcon);
            founderLine.appendChild(founderText);

            // Looking For Roles Section
            const rolesBox = document.createElement("div");
            rolesBox.className = "comm-card-roles-box";

            const rolesLabel = document.createElement("span");
            rolesLabel.className = "comm-roles-label";
            rolesLabel.textContent = "LOOKING FOR:";
            rolesBox.appendChild(rolesLabel);

            const chipsWrap = document.createElement("div");
            chipsWrap.className = "comm-chips";

            if (Array.isArray(idea.lookingFor) && idea.lookingFor.length > 0) {
                idea.lookingFor.slice(0, 3).forEach((role) => {
                    const chip = document.createElement("span");
                    chip.className = "comm-chip comm-chip-role";
                    chip.textContent = role;
                    chipsWrap.appendChild(chip);
                });
                if (idea.lookingFor.length > 3) {
                    const moreChip = document.createElement("span");
                    moreChip.className = "comm-chip comm-chip-more";
                    moreChip.textContent = `+${idea.lookingFor.length - 3}`;
                    chipsWrap.appendChild(moreChip);
                }
            } else {
                const openChip = document.createElement("span");
                openChip.className = "comm-chip comm-chip-open";
                openChip.textContent = "Open to Collaborators";
                chipsWrap.appendChild(openChip);
            }
            rolesBox.appendChild(chipsWrap);

            // Action Button
            const actionBtn = document.createElement("button");
            actionBtn.type = "button";
            actionBtn.className = "btn-connect comm-card-cta";
            actionBtn.textContent = "View Details & Connect →";

            actionBtn.addEventListener("click", (e) => {
                e.stopPropagation();
                openIdeaModal(idea);
            });

            card.addEventListener("click", () => openIdeaModal(idea));
            card.addEventListener("keydown", (e) => {
                if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    openIdeaModal(idea);
                }
            });

            // Assemble
            inner.appendChild(topMeta);
            inner.appendChild(titleEl);
            inner.appendChild(descEl);
            inner.appendChild(founderLine);
            inner.appendChild(rolesBox);
            inner.appendChild(actionBtn);
            card.appendChild(inner);

            grid.appendChild(card);
        });

        // Update Pagination Controls
        if (!state.myOnly && state.totalPages > 1) {
            pagination.style.display = "flex";
            pageIndicator.textContent = `Page ${state.page} of ${state.totalPages}`;
            prevBtn.disabled = state.page <= 1;
            nextBtn.disabled = state.page >= state.totalPages;
        } else {
            pagination.style.display = "none";
        }
    }

    /* ==========================================================================
       MODAL CONTROLLER (VIEW DETAILS, INTEREST, OWNER ACTIONS)
       ========================================================================== */
    function openIdeaModal(idea) {
        state.currentModalIdea = idea;

        // Reset feedbacks
        modalError.style.display = "none";
        modalSuccess.style.display = "none";
        interestTextarea.value = "";

        // Fill Basic Fields safely
        modalTitle.textContent = idea.title || "Startup Idea";
        modalIndustry.textContent = idea.industry || "General";
        modalStage.textContent = idea.stage || "Idea";
        modalDate.textContent = formatRelativeTime(idea.createdAt);

        modalFounderName.textContent = idea.founderName || "Founder";
        modalFounderAvatar.textContent = (idea.founderName || "F").charAt(0).toUpperCase();

        const teamLabel = idea.teamSize > 1
            ? `Team of ${idea.teamSize} builders`
            : "Solo founder looking for team members";
        modalTeamStatus.textContent = teamLabel;

        // Founder Interests
        if (idea.founderInterests && idea.founderInterests.trim()) {
            modalFounderInterests.textContent = `Interests: ${idea.founderInterests}`;
            modalFounderInterests.style.display = "block";
        } else {
            modalFounderInterests.style.display = "none";
        }

        // Founder Skills
        modalFounderSkills.innerHTML = "";
        if (Array.isArray(idea.founderSkills) && idea.founderSkills.length > 0) {
            modalSkillsSection.style.display = "block";
            idea.founderSkills.forEach((skill) => {
                const tag = document.createElement("span");
                tag.className = "comm-chip";
                tag.textContent = skill;
                modalFounderSkills.appendChild(tag);
            });
        } else {
            modalSkillsSection.style.display = "none";
        }

        // Description
        modalDescription.textContent = idea.description || "";

        // Roles Looking For
        modalLookingFor.innerHTML = "";
        if (Array.isArray(idea.lookingFor) && idea.lookingFor.length > 0) {
            idea.lookingFor.forEach((role) => {
                const tag = document.createElement("span");
                tag.className = "comm-chip comm-chip-role";
                tag.textContent = role;
                modalLookingFor.appendChild(tag);
            });
        }

        // Ideal Collaborator
        if (idea.idealCollaborator && idea.idealCollaborator.trim()) {
            modalIdealBox.style.display = "block";
            modalIdealCollaborator.textContent = idea.idealCollaborator;
        } else {
            modalIdealBox.style.display = "none";
        }

        // Collaboration Style
        if (idea.collaborationStyle && idea.collaborationStyle.trim()) {
            modalStyleBox.style.display = "block";
            modalCollabStyle.textContent = idea.collaborationStyle;
        } else {
            modalStyleBox.style.display = "none";
        }

        // Determine Viewer Role (Owner vs Guest vs Authenticated User)
        const currentUser = Auth.getUser();
        const isAuthed = Auth.isAuthenticated();
        const founderId = idea.founder ? (idea.founder.id || idea.founder._id || idea.founder) : null;
        const isOwner = isAuthed && currentUser && founderId && (String(currentUser.id) === String(founderId));

        if (isOwner) {
            // Owner view: Show Edit & Deactivate actions
            modalOwnerActions.style.display = "flex";
            modalInterestPanel.style.display = "none";
            modalGuestBox.style.display = "none";

            modalEditBtn.href = `publish.html?edit=${idea.id || idea._id}`;
            if (idea.isActive === false) {
                modalDeactivateBtn.disabled = true;
                modalDeactivateBtn.textContent = "Deactivated";
                modalDeactivateBtn.style.opacity = "0.5";
            } else {
                modalDeactivateBtn.disabled = false;
                modalDeactivateBtn.textContent = "🗑️ Deactivate Idea";
                modalDeactivateBtn.style.opacity = "1";
                modalDeactivateBtn.onclick = () => handleDeactivateIdea(idea.id || idea._id);
            }
        } else if (isAuthed) {
            // Authenticated non-owner: Can express interest
            modalOwnerActions.style.display = "none";
            modalInterestPanel.style.display = "block";
            modalGuestBox.style.display = "none";

            btnSendInterest.onclick = () => handleSendInterest(idea.id || idea._id);
        } else {
            // Unauthenticated guest
            modalOwnerActions.style.display = "none";
            modalInterestPanel.style.display = "none";
            modalGuestBox.style.display = "block";

            const guestLink = modalGuestBox.querySelector("a");
            if (guestLink) {
                guestLink.href = `auth.html?redirect=community.html?id=${idea.id || idea._id}`;
            }
        }

        // Open Dialog
        modal.style.display = "flex";
        document.body.style.overflow = "hidden";
        modalClose.focus();
    }

    function closeIdeaModal() {
        modal.style.display = "none";
        document.body.style.overflow = "";
        state.currentModalIdea = null;
    }

    // Modal Events
    if (modalClose) modalClose.addEventListener("click", closeIdeaModal);
    if (modal) {
        modal.addEventListener("click", (e) => {
            if (e.target === modal) closeIdeaModal();
        });
    }
    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && modal && modal.style.display === "flex") {
            closeIdeaModal();
        }
    });

    /* ==========================================================================
       ACTIONS: EXPRESS INTEREST & DEACTIVATE
       ========================================================================== */
    async function handleSendInterest(ideaId) {
        const token = Auth.getToken();
        if (!token) {
            window.location.href = `auth.html?redirect=community.html`;
            return;
        }

        const message = interestTextarea.value.trim();
        modalError.style.display = "none";
        modalSuccess.style.display = "none";

        btnSendInterest.disabled = true;
        btnSendInterest.textContent = "Sending Request...";

        try {
            const response = await fetch(`${API_BASE}/api/ideas/${ideaId}/interest`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({ message })
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(data.message || "Failed to express interest.");
            }

            modalSuccess.textContent = "Interest expressed successfully! The founder has been notified in their dashboard.";
            modalSuccess.style.display = "block";
            interestTextarea.value = "";
            btnSendInterest.textContent = "Request Sent ✓";

            setTimeout(() => {
                btnSendInterest.textContent = "Send Another Note";
                btnSendInterest.disabled = false;
            }, 3000);

        } catch (err) {
            console.error("Express Interest Error:", err);
            modalError.textContent = err.message || "Could not send interest request.";
            modalError.style.display = "block";
            btnSendInterest.disabled = false;
            btnSendInterest.textContent = "Send Collaboration Request →";
        }
    }

    async function handleDeactivateIdea(ideaId) {
        const token = Auth.getToken();
        if (!token) return;

        const confirmed = window.confirm(
            "Are you sure you want to deactivate this startup idea?\n\nIt will be hidden from the community feed."
        );
        if (!confirmed) return;

        modalDeactivateBtn.disabled = true;
        modalDeactivateBtn.textContent = "Deactivating...";

        try {
            const response = await fetch(`${API_BASE}/api/ideas/${ideaId}`, {
                method: "DELETE",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                }
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(data.message || "Failed to deactivate idea.");
            }

            alert("Idea successfully deactivated.");
            closeIdeaModal();
            fetchIdeas(); // Refresh feed

        } catch (err) {
            alert(`Error: ${err.message}`);
            modalDeactivateBtn.disabled = false;
            modalDeactivateBtn.textContent = "🗑️ Deactivate Idea";
        }
    }

    /* ==========================================================================
       FILTER & SEARCH LISTENERS
       ========================================================================== */
    const debouncedSearch = debounce(function () {
        state.search = searchInput.value;
        state.page = 1;
        searchClear.style.display = state.search ? "inline-block" : "none";
        fetchIdeas();
    }, 350);

    if (searchInput) searchInput.addEventListener("input", debouncedSearch);

    if (searchClear) {
        searchClear.addEventListener("click", () => {
            searchInput.value = "";
            searchClear.style.display = "none";
            state.search = "";
            state.page = 1;
            fetchIdeas();
        });
    }

    if (industrySelect) {
        industrySelect.addEventListener("change", (e) => {
            state.industry = e.target.value;
            state.page = 1;
            fetchIdeas();
        });
    }

    if (stageSelect) {
        stageSelect.addEventListener("change", (e) => {
            state.stage = e.target.value;
            state.page = 1;
            fetchIdeas();
        });
    }

    if (roleSelect) {
        roleSelect.addEventListener("change", (e) => {
            state.lookingFor = e.target.value;
            state.page = 1;
            fetchIdeas();
        });
    }

    if (sortSelect) {
        sortSelect.addEventListener("change", (e) => {
            state.sort = e.target.value;
            state.page = 1;
            fetchIdeas();
        });
    }

    function resetAllFilters() {
        if (searchInput) searchInput.value = "";
        if (searchClear) searchClear.style.display = "none";
        if (industrySelect) industrySelect.value = "";
        if (stageSelect) stageSelect.value = "";
        if (roleSelect) roleSelect.value = "";
        if (sortSelect) sortSelect.value = "newest";

        state.search = "";
        state.industry = "";
        state.stage = "";
        state.lookingFor = "";
        state.sort = "newest";
        state.myOnly = false;
        state.page = 1;

        if (myIdeasBtn) {
            myIdeasBtn.classList.remove("active");
            myIdeasBtn.setAttribute("aria-pressed", "false");
        }

        fetchIdeas();
    }

    if (resetBtn) resetBtn.addEventListener("click", resetAllFilters);
    if (clearFiltersBtn) clearFiltersBtn.addEventListener("click", resetAllFilters);

    if (myIdeasBtn) {
        // Toggle My Ideas vs Public Community Feed
        myIdeasBtn.addEventListener("click", () => {
            state.myOnly = !state.myOnly;
            myIdeasBtn.classList.toggle("active", state.myOnly);
            myIdeasBtn.setAttribute("aria-pressed", state.myOnly ? "true" : "false");
            state.page = 1;
            fetchIdeas();
        });
    }

    if (prevBtn) {
        prevBtn.addEventListener("click", () => {
            if (state.page > 1) {
                state.page--;
                fetchIdeas();
                window.scrollTo({ top: document.getElementById("browse").offsetTop - 80, behavior: "smooth" });
            }
        });
    }

    if (nextBtn) {
        nextBtn.addEventListener("click", () => {
            if (state.page < state.totalPages) {
                state.page++;
                fetchIdeas();
                window.scrollTo({ top: document.getElementById("browse").offsetTop - 80, behavior: "smooth" });
            }
        });
    }

    if (retryBtn) retryBtn.addEventListener("click", fetchIdeas);

    if (scrollToBrowseBtn) {
        scrollToBrowseBtn.addEventListener("click", (e) => {
            e.preventDefault();
            const target = document.getElementById("browse");
            if (target) target.scrollIntoView({ behavior: "smooth" });
        });
    }

    /* ==========================================================================
       INITIALIZATION
       ========================================================================== */
    document.addEventListener("DOMContentLoaded", function () {
        // Show "My Ideas Only" button if user is authenticated
        if (Auth.isAuthenticated() && myIdeasBtn) {
            myIdeasBtn.style.display = "inline-flex";
        }

        // Check URL parameters for preset filters (e.g. ?filter=my or ?id=123)
        const params = new URLSearchParams(window.location.search);
        if (params.get("filter") === "my" && Auth.isAuthenticated() && myIdeasBtn) {
            state.myOnly = true;
            myIdeasBtn.classList.add("active");
            myIdeasBtn.setAttribute("aria-pressed", "true");
        }

        // If direct idea ID is provided in URL, auto-load that idea into modal once ready
        const directId = params.get("id");

        fetchIdeas().then(() => {
            if (directId) {
                fetch(`${API_BASE}/api/ideas/${directId}`)
                    .then((r) => r.json())
                    .then((d) => {
                        if (d.success && d.idea) openIdeaModal(d.idea);
                    })
                    .catch((err) => console.log("Direct idea load failed:", err));
            }
        });
    });

})();
