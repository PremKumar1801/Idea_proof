/**
 * IdeaProof — Publish & Edit Startup Idea Controller
 */

(function () {
    'use strict';

    const Auth = window.IdeaProofAuth || {};
    const API_BASE = Auth.API_BASE || "";

    // DOM Elements
    const authGuard = document.getElementById("pub-auth-guard");
    const formWrap = document.getElementById("pub-form-wrap");
    const form = document.getElementById("publish-form");
    const submitBtn = document.getElementById("pub-submit-btn");
    const pageTitle = document.getElementById("pub-page-title");
    const errorAlert = document.getElementById("pub-error");
    const successBanner = document.getElementById("pub-success");
    const successTitle = document.getElementById("pub-success-title");
    const successMsg = document.getElementById("pub-success-msg");
    const viewLiveBtn = document.getElementById("pub-view-live-btn");
    const publishAnotherBtn = document.getElementById("pub-another-btn");

    // Inputs
    const titleInput = document.getElementById("pub-title-input");
    const descInput = document.getElementById("pub-desc-input");
    const industrySelect = document.getElementById("pub-industry");
    const stageSelect = document.getElementById("pub-stage");
    const nameInput = document.getElementById("pub-name-input");
    const skillsInput = document.getElementById("pub-skills-input");
    const interestsInput = document.getElementById("pub-interests-input");
    const teamSizeInput = document.getElementById("pub-team-size");
    const hasTeammatesCheckbox = document.getElementById("pub-has-teammates");
    const teammatesLabel = document.getElementById("pub-teammates-label");
    const idealInput = document.getElementById("pub-ideal-input");
    const collabStyleSelect = document.getElementById("pub-collab-style");

    // Edit Mode State
    let isEditMode = false;
    let editIdeaId = null;

    /* ==========================================================================
       CHARACTER COUNTERS HELPER
       ========================================================================== */
    function setupCharCounter(inputId, counterId, max) {
        const input = document.getElementById(inputId);
        const counter = document.getElementById(counterId);
        if (!input || !counter) return;

        function update() {
            const len = input.value ? input.value.length : 0;
            counter.textContent = `${len} / ${max}`;
            if (len >= max * 0.9) {
                counter.classList.add("az-warn");
            } else {
                counter.classList.remove("az-warn");
            }
        }

        input.addEventListener("input", update);
        update();
    }

    /* ==========================================================================
       FORM INITIALIZATION & POPULATION
       ========================================================================== */
    async function initPublish() {
        // 1. Auth Guard Check
        if (!Auth.isAuthenticated()) {
            if (authGuard) authGuard.style.display = "block";
            if (formWrap) formWrap.style.display = "none";
            return;
        }

        if (authGuard) authGuard.style.display = "none";
        if (formWrap) formWrap.style.display = "block";

        const user = Auth.getUser();
        if (user && user.name && nameInput && !nameInput.value) {
            nameInput.value = user.name;
        }

        // Setup character counters
        setupCharCounter("pub-title-input", "count-title", 100);
        setupCharCounter("pub-desc-input", "count-desc", 2000);
        setupCharCounter("pub-name-input", "count-name", 60);
        setupCharCounter("pub-interests-input", "count-interests", 150);
        setupCharCounter("pub-ideal-input", "count-ideal", 400);

        // Teammates toggle helper
        if (hasTeammatesCheckbox && teammatesLabel) {
            hasTeammatesCheckbox.addEventListener("change", function () {
                teammatesLabel.textContent = this.checked ? "Have Teammates" : "Working Solo";
            });
        }

        if (teamSizeInput && hasTeammatesCheckbox) {
            teamSizeInput.addEventListener("input", function () {
                const val = parseInt(this.value, 10);
                if (val > 1) {
                    hasTeammatesCheckbox.checked = true;
                    if (teammatesLabel) teammatesLabel.textContent = "Have Teammates";
                }
            });
        }

        // 2. Check for Edit Mode (?edit=<id>)
        const params = new URLSearchParams(window.location.search);
        const editParam = params.get("edit");

        if (editParam) {
            isEditMode = true;
            editIdeaId = editParam;
            await loadIdeaForEditing(editParam);
        }
    }

    async function loadIdeaForEditing(ideaId) {
        try {
            submitBtn.disabled = true;
            pageTitle.innerHTML = "Edit Your <em>Startup Idea</em>";
            submitBtn.innerHTML = "Save Changes <span class='btn-arrow' aria-hidden='true'>→</span>";

            const token = Auth.getToken();
            const headers = { "Content-Type": "application/json" };
            if (token) headers["Authorization"] = `Bearer ${token}`;

            const response = await fetch(`${API_BASE}/api/ideas/${ideaId}`, { headers });
            const data = await response.json();

            if (!response.ok || !data.success || !data.idea) {
                throw new Error(data.message || "Could not load idea for editing.");
            }

            const idea = data.idea;
            const currentUser = Auth.getUser();

            // Authorization check
            const founderId = idea.founder ? (idea.founder.id || idea.founder._id || idea.founder) : null;
            if (currentUser && founderId && String(currentUser.id) !== String(founderId)) {
                throw new Error("Unauthorized: You can only edit ideas published by your account.");
            }

            // Populate Form Fields
            if (titleInput) titleInput.value = idea.title || "";
            if (descInput) descInput.value = idea.description || "";
            if (industrySelect) industrySelect.value = idea.industry || "";
            if (stageSelect) stageSelect.value = idea.stage || "";
            if (nameInput) nameInput.value = idea.founderName || "";
            if (skillsInput && Array.isArray(idea.founderSkills)) {
                skillsInput.value = idea.founderSkills.join(", ");
            }
            if (interestsInput) interestsInput.value = idea.founderInterests || "";
            if (teamSizeInput) teamSizeInput.value = idea.teamSize || 1;
            if (hasTeammatesCheckbox) {
                hasTeammatesCheckbox.checked = Boolean(idea.hasTeammates);
                if (teammatesLabel) teammatesLabel.textContent = idea.hasTeammates ? "Have Teammates" : "Working Solo";
            }
            if (idealInput) idealInput.value = idea.idealCollaborator || "";
            if (collabStyleSelect) collabStyleSelect.value = idea.collaborationStyle || "Flexible/Open to Discussion";

            // Populate Role Checkboxes
            if (Array.isArray(idea.lookingFor)) {
                document.querySelectorAll("input[name='roles']").forEach((cb) => {
                    cb.checked = idea.lookingFor.includes(cb.value);
                });
            }

            // Trigger counters update
            ["pub-title-input", "pub-desc-input", "pub-name-input", "pub-interests-input", "pub-ideal-input"].forEach((id) => {
                const el = document.getElementById(id);
                if (el) el.dispatchEvent(new Event("input"));
            });

            submitBtn.disabled = false;

        } catch (err) {
            console.error("Load Edit Idea Error:", err);
            showError(err.message || "Failed to load idea.");
            submitBtn.disabled = true;
            if (form) {
                Array.from(form.elements).forEach((el) => {
                    el.disabled = true;
                });
            }
        }
    }

    /* ==========================================================================
       SUBMIT HANDLER
       ========================================================================== */
    if (form) {
        form.addEventListener("submit", async function (e) {
            e.preventDefault();
            errorAlert.style.display = "none";

            const token = Auth.getToken();
            if (!token) {
                showError("Your session has expired. Please sign in again.");
                return;
            }

            // Collect Form Values
            const title = titleInput.value.trim();
            const description = descInput.value.trim();
            const industry = industrySelect.value;
            const stage = stageSelect.value;
            const founderName = nameInput.value.trim();
            const founderInterests = interestsInput ? interestsInput.value.trim() : "";
            const idealCollaborator = idealInput ? idealInput.value.trim() : "";
            const collaborationStyle = collabStyleSelect ? collabStyleSelect.value : "Flexible/Open to Discussion";
            const teamSize = parseInt(teamSizeInput.value, 10) || 1;
            const hasTeammates = hasTeammatesCheckbox ? hasTeammatesCheckbox.checked : (teamSize > 1);

            // Parse skills
            const rawSkills = skillsInput ? skillsInput.value : "";
            const founderSkills = rawSkills
                .split(",")
                .map((s) => s.trim())
                .filter((s) => s.length > 0 && s.length <= 50);

            // Parse lookingFor roles
            const checkedRoles = Array.from(document.querySelectorAll("input[name='roles']:checked"))
                .map((cb) => cb.value);

            // Client Validation
            if (!title) {
                showError("Please enter an idea title.");
                titleInput.focus();
                return;
            }
            if (!industry) {
                showError("Please select an industry vertical.");
                industrySelect.focus();
                return;
            }
            if (!stage) {
                showError("Please select the current stage of your idea.");
                stageSelect.focus();
                return;
            }
            if (!description || description.length < 20) {
                showError("Please provide a description of at least 20 characters.");
                descInput.focus();
                return;
            }
            if (!founderName) {
                showError("Please provide your public display name.");
                nameInput.focus();
                return;
            }

            const payload = {
                title,
                description,
                industry,
                stage,
                founderName,
                founderSkills,
                founderInterests,
                teamSize,
                hasTeammates,
                lookingFor: checkedRoles,
                idealCollaborator,
                collaborationStyle
            };

            // Submit Payload
            submitBtn.disabled = true;
            const originalBtnText = submitBtn.innerHTML;
            submitBtn.textContent = isEditMode ? "Saving Changes..." : "Publishing Idea...";

            try {
                const endpoint = isEditMode
                    ? `${API_BASE}/api/ideas/${editIdeaId}`
                    : `${API_BASE}/api/ideas`;

                const method = isEditMode ? "PUT" : "POST";

                const response = await fetch(endpoint, {
                    method,
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${token}`
                    },
                    body: JSON.stringify(payload)
                });

                const data = await response.json();

                if (!response.ok || !data.success) {
                    throw new Error(data.message || "Failed to save startup idea.");
                }

                // Show Success Banner
                form.style.display = "none";
                successBanner.style.display = "flex";

                if (isEditMode) {
                    successTitle.textContent = "Idea Updated Successfully!";
                    successMsg.textContent = "Your changes have been saved and are live in the community.";
                    viewLiveBtn.href = `community.html?id=${editIdeaId}`;
                } else {
                    successTitle.textContent = "Idea Published Successfully!";
                    successMsg.textContent = "Your concept is now live for builders and potential co-founders to discover.";
                    const newId = data.idea ? data.idea.id : "";
                    viewLiveBtn.href = newId ? `community.html?id=${newId}` : "community.html";
                }

                window.scrollTo({ top: 0, behavior: "smooth" });

            } catch (err) {
                console.error("Publish Error:", err);
                showError(err.message || "Network error. Please try again.");
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalBtnText;
            }
        });
    }

    if (publishAnotherBtn) {
        publishAnotherBtn.addEventListener("click", function () {
            form.reset();
            form.style.display = "block";
            successBanner.style.display = "none";
            isEditMode = false;
            editIdeaId = null;
            pageTitle.innerHTML = "Publish Your <em>Startup Idea</em>";
            submitBtn.disabled = false;
            submitBtn.innerHTML = "Publish Idea to Community <span class='btn-arrow' aria-hidden='true'>→</span>";

            const user = Auth.getUser();
            if (user && user.name && nameInput) nameInput.value = user.name;

            // Reset counters
            ["pub-title-input", "pub-desc-input", "pub-name-input", "pub-interests-input", "pub-ideal-input"].forEach((id) => {
                const el = document.getElementById(id);
                if (el) el.dispatchEvent(new Event("input"));
            });

            window.scrollTo({ top: 0, behavior: "smooth" });
        });
    }

    function showError(msg) {
        if (!errorAlert) return;
        errorAlert.textContent = msg;
        errorAlert.style.display = "block";
        errorAlert.scrollIntoView({ behavior: "smooth", block: "center" });
    }

    document.addEventListener("DOMContentLoaded", initPublish);

})();
