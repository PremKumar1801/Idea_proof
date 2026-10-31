/**
 * IdeaProof — Collaboration Requests Controller
 */

(function () {
    'use strict';

    const Auth = window.IdeaProofAuth || {};
    const API_BASE = Auth.API_BASE || "";

    // DOM Elements
    const authGuard = document.getElementById("req-auth-guard");
    const contentWrap = document.getElementById("req-content-wrap");
    const grid = document.getElementById("req-grid");
    const loadingState = document.getElementById("req-loading");
    const emptyState = document.getElementById("req-empty");
    const errorState = document.getElementById("req-error");
    const errorMsg = document.getElementById("req-error-msg");
    const retryBtn = document.getElementById("req-retry-btn");
    const countLabel = document.getElementById("req-count-label");

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

    async function loadRequests() {
        if (!Auth.isAuthenticated()) {
            if (authGuard) authGuard.style.display = "block";
            if (contentWrap) contentWrap.style.display = "none";
            return;
        }

        if (authGuard) authGuard.style.display = "none";
        if (contentWrap) contentWrap.style.display = "block";

        grid.style.display = "none";
        emptyState.style.display = "none";
        errorState.style.display = "none";
        loadingState.style.display = "flex";
        countLabel.textContent = "Loading requests...";

        const token = Auth.getToken();

        try {
            const response = await fetch(`${API_BASE}/api/interests/received`, {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                }
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(data.message || "Failed to load requests.");
            }

            loadingState.style.display = "none";
            const requests = data.interests || [];

            if (requests.length === 0) {
                emptyState.style.display = "flex";
                countLabel.textContent = "0 requests received";
                return;
            }

            countLabel.textContent = `Received ${requests.length} collaboration request${requests.length === 1 ? "" : "s"}`;
            renderRequests(requests);

        } catch (err) {
            console.error("Load Requests Error:", err);
            loadingState.style.display = "none";
            errorState.style.display = "flex";
            errorMsg.textContent = err.message || "Cannot connect to server.";
            countLabel.textContent = "Error loading requests";
        }
    }

    function renderRequests(requests) {
        grid.innerHTML = "";
        grid.style.display = "grid";

        requests.forEach((req) => {
            const card = document.createElement("article");
            card.className = "req-card";
            card.setAttribute("role", "listitem");

            // Header Meta: Idea Title & Relative Date
            const topMeta = document.createElement("div");
            topMeta.className = "req-card-top";

            const ideaTitleLink = document.createElement("a");
            ideaTitleLink.className = "req-idea-link";
            const ideaTitle = req.idea ? req.idea.title : "Startup Idea";
            ideaTitleLink.textContent = `💡 ${ideaTitle}`;
            if (req.idea && req.idea.id) {
                ideaTitleLink.href = `community.html?id=${req.idea.id}`;
            }

            const timeSpan = document.createElement("span");
            timeSpan.className = "comm-card-time";
            timeSpan.textContent = formatRelativeTime(req.createdAt);

            topMeta.appendChild(ideaTitleLink);
            topMeta.appendChild(timeSpan);

            // Sender Information Box
            const senderBox = document.createElement("div");
            senderBox.className = "req-sender-box";

            const senderAvatar = document.createElement("div");
            senderAvatar.className = "comm-modal-avatar req-avatar";
            const senderName = req.sender ? req.sender.name : "Builder";
            senderAvatar.textContent = senderName.charAt(0).toUpperCase();

            const senderInfo = document.createElement("div");
            senderInfo.className = "req-sender-info";

            const nameEl = document.createElement("div");
            nameEl.className = "req-sender-name";
            nameEl.textContent = senderName;

            const subEl = document.createElement("div");
            subEl.className = "req-sender-sub";
            subEl.textContent = "Interested Collaborator";

            senderInfo.appendChild(nameEl);
            senderInfo.appendChild(subEl);
            senderBox.appendChild(senderAvatar);
            senderBox.appendChild(senderInfo);

            // Status Badge
            const statusBadge = document.createElement("span");
            statusBadge.className = `req-status-badge req-status-${req.status || "pending"}`;
            if (req.status === "accepted") {
                statusBadge.textContent = "Accepted ✓";
            } else if (req.status === "declined") {
                statusBadge.textContent = "Declined ✕";
            } else {
                statusBadge.textContent = "Pending Review";
            }
            senderBox.appendChild(statusBadge);

            // Message Bubble
            const msgBox = document.createElement("div");
            msgBox.className = "req-msg-box";

            const msgText = document.createElement("p");
            msgText.className = "req-msg-text";
            msgText.textContent = req.message ? `"${req.message}"` : "(No custom note included)";
            msgBox.appendChild(msgText);

            // Action Buttons (Only shown for pending requests)
            const actionsBox = document.createElement("div");
            actionsBox.className = "req-actions-box";

            if (req.status === "pending") {
                const acceptBtn = document.createElement("button");
                acceptBtn.type = "button";
                acceptBtn.className = "btn-primary req-btn-accept";
                acceptBtn.textContent = "Accept Collaboration ✓";
                acceptBtn.addEventListener("click", () => handleStatusChange(req.id, "accepted", card, statusBadge, actionsBox));

                const declineBtn = document.createElement("button");
                declineBtn.type = "button";
                declineBtn.className = "btn-ghost req-btn-decline";
                declineBtn.textContent = "Decline";
                declineBtn.addEventListener("click", () => handleStatusChange(req.id, "declined", card, statusBadge, actionsBox));

                actionsBox.appendChild(acceptBtn);
                actionsBox.appendChild(declineBtn);
            } else {
                const resolvedNote = document.createElement("span");
                resolvedNote.className = "req-resolved-note";
                resolvedNote.textContent = req.status === "accepted"
                    ? "You accepted this request. Feel free to coordinate next steps."
                    : "This request was declined.";
                actionsBox.appendChild(resolvedNote);
            }

            // Assemble Card
            card.appendChild(topMeta);
            card.appendChild(senderBox);
            card.appendChild(msgBox);
            card.appendChild(actionsBox);
            grid.appendChild(card);
        });
    }

    async function handleStatusChange(interestId, newStatus, cardEl, badgeEl, actionsBoxEl) {
        const token = Auth.getToken();
        if (!token) return;

        actionsBoxEl.innerHTML = `<span class="comm-state-text">Updating status...</span>`;

        try {
            const response = await fetch(`${API_BASE}/api/interests/${interestId}`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({ status: newStatus })
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(data.message || "Failed to update status.");
            }

            // Update badge in-place
            badgeEl.className = `req-status-badge req-status-${newStatus}`;
            badgeEl.textContent = newStatus === "accepted" ? "Accepted ✓" : "Declined ✕";

            actionsBoxEl.innerHTML = "";
            const resolvedNote = document.createElement("span");
            resolvedNote.className = "req-resolved-note";
            resolvedNote.textContent = newStatus === "accepted"
                ? "You accepted this request."
                : "This request was declined.";
            actionsBoxEl.appendChild(resolvedNote);

        } catch (err) {
            console.error("Status Update Error:", err);
            alert(`Error: ${err.message}`);
            loadRequests(); // Re-fetch on error
        }
    }

    if (retryBtn) retryBtn.addEventListener("click", loadRequests);

    document.addEventListener("DOMContentLoaded", loadRequests);

})();
