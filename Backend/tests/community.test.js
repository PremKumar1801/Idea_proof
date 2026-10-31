const assert = require("assert");
const request = require("supertest");
const mongoose = require("mongoose");
const app = require("../server");
const User = require("../models/User");
const Idea = require("../models/Idea");
const Interest = require("../models/Interest");
const connectDB = require("../config/db");

async function runCommunitySuite() {
    console.log("=== STARTING COMMUNITY & COLLABORATION BACKEND SUITE ===");

    await connectDB();

    const uniqueId = Date.now();
    const founderUser = {
        name: `Founder_${uniqueId}`,
        email: `founder_${uniqueId}@example.com`,
        password: "securePassword123",
    };
    const collaboratorUser = {
        name: `Collaborator_${uniqueId}`,
        email: `collab_${uniqueId}@example.com`,
        password: "securePassword123",
    };

    let founderToken = null;
    let founderId = null;
    let collabToken = null;
    let collabId = null;
    let createdIdeaId = null;
    let createdInterestId = null;

    try {
        // --- Setup: Register Founder & Collaborator ---
        console.log("Setup: Registering test users...");
        const resFounder = await request(app).post("/api/auth/register").send(founderUser);
        assert.strictEqual(resFounder.status, 201);
        founderToken = resFounder.body.token;
        founderId = resFounder.body.user.id;

        const resCollab = await request(app).post("/api/auth/register").send(collaboratorUser);
        assert.strictEqual(resCollab.status, 201);
        collabToken = resCollab.body.token;
        collabId = resCollab.body.user.id;
        console.log("  -> Setup complete: Test users registered.");

        // --- 1. Reject Unauthenticated Idea Creation ---
        console.log("Test 1: POST /api/ideas - Reject unauthenticated creation");
        const resUnauth = await request(app)
            .post("/api/ideas")
            .send({
                title: "Test Startup Idea",
                description: "Test description for unauthenticated attempt.",
                industry: "B2B SaaS",
                stage: "Idea",
            });
        assert.strictEqual(resUnauth.status, 401);
        assert.strictEqual(resUnauth.body.success, false);
        console.log("  -> PASSED: Unauthenticated request rejected with 401.");

        // --- 2. Reject Invalid Enums / Fields ---
        console.log("Test 2: POST /api/ideas - Reject invalid industry enum");
        const resInvalidEnum = await request(app)
            .post("/api/ideas")
            .set("Authorization", `Bearer ${founderToken}`)
            .send({
                title: "Invalid Industry Idea",
                description: "Valid description",
                industry: "NotAnIndustry",
                stage: "Idea",
            });
        assert.strictEqual(resInvalidEnum.status, 400);
        assert.strictEqual(resInvalidEnum.body.success, false);
        console.log("  -> PASSED: Invalid industry rejected with 400.");

        // --- 3. Successfully Create an Idea with Valid Token ---
        console.log("Test 3: POST /api/ideas - Successful idea creation");
        const validIdeaPayload = {
            title: `AI Invoice Copilot ${uniqueId}`,
            description: "An automated invoicing platform for freelance software engineers.",
            industry: "FinTech",
            stage: "Building MVP",
            founderName: founderUser.name,
            founderSkills: ["Node.js", "Express", "MongoDB"],
            founderInterests: "FinTech, indie hacking, automation",
            teamSize: 1,
            hasTeammates: false,
            lookingFor: ["Frontend Developer", "Growth/Marketing"],
            idealCollaborator: "React or Vue specialist with 1-2 years experience.",
            collaborationStyle: "Equity-Based Co-Founder",
        };

        const resCreate = await request(app)
            .post("/api/ideas")
            .set("Authorization", `Bearer ${founderToken}`)
            .send(validIdeaPayload);

        assert.strictEqual(resCreate.status, 201);
        assert.strictEqual(resCreate.body.success, true);
        assert.ok(resCreate.body.idea.id);
        assert.strictEqual(resCreate.body.idea.title, validIdeaPayload.title);
        assert.strictEqual(resCreate.body.idea.industry, "FinTech");
        assert.strictEqual(resCreate.body.idea.stage, "Building MVP");
        assert.strictEqual(resCreate.body.idea.isActive, true);
        // Verify no sensitive email or password leaks
        assert.strictEqual(resCreate.body.idea.email, undefined);
        assert.strictEqual(resCreate.body.idea.password, undefined);
        createdIdeaId = resCreate.body.idea.id;
        console.log("  -> PASSED: Idea created with status 201, sensitive fields excluded.");

        // --- 4. Public Idea Listing and Pagination ---
        console.log("Test 4: GET /api/ideas - Public browse with pagination");
        const resBrowse = await request(app)
            .get("/api/ideas?page=1&limit=5&sort=newest");
        assert.strictEqual(resBrowse.status, 200);
        assert.strictEqual(resBrowse.body.success, true);
        assert.ok(typeof resBrowse.body.total === "number");
        assert.ok(Array.isArray(resBrowse.body.ideas));
        assert.strictEqual(resBrowse.body.page, 1);
        // Verify public listing does not expose email or password
        resBrowse.body.ideas.forEach((item) => {
            assert.strictEqual(item.email, undefined);
            assert.strictEqual(item.password, undefined);
            if (item.founder) {
                assert.strictEqual(item.founder.email, undefined);
                assert.strictEqual(item.founder.password, undefined);
            }
        });
        console.log("  -> PASSED: Public feed returned with pagination and safe projections.");

        // --- 5. Filtering and Search ---
        console.log("Test 5: GET /api/ideas - Search and filter verification");
        const resFiltered = await request(app)
            .get(`/api/ideas?industry=FinTech&search=${encodeURIComponent(uniqueId)}`);
        assert.strictEqual(resFiltered.status, 200);
        assert.strictEqual(resFiltered.body.success, true);
        const matchFound = resFiltered.body.ideas.some((i) => i.id === createdIdeaId);
        assert.strictEqual(matchFound, true, "Created idea should be matched by industry and search query");
        console.log("  -> PASSED: Search and filter correctly matched newly created idea.");

        // --- 6. Fetch Single Idea by ID and Invalid ID Rejection ---
        console.log("Test 6: GET /api/ideas/:id - Valid and invalid ID fetching");
        const resSingle = await request(app).get(`/api/ideas/${createdIdeaId}`);
        assert.strictEqual(resSingle.status, 200);
        assert.strictEqual(resSingle.body.success, true);
        assert.strictEqual(resSingle.body.idea.id, createdIdeaId);

        const resBadId = await request(app).get("/api/ideas/invalidMongoId123");
        assert.strictEqual(resBadId.status, 400);
        assert.strictEqual(resBadId.body.success, false);

        const nonExistentId = new mongoose.Types.ObjectId();
        const resNotFound = await request(app).get(`/api/ideas/${nonExistentId}`);
        assert.strictEqual(resNotFound.status, 404);
        console.log("  -> PASSED: Single idea retrieved, bad ID returned 400, missing ID returned 404.");

        // --- 7. Get Current User's Ideas (GET /api/ideas/my) ---
        console.log("Test 7: GET /api/ideas/my - Owner ideas route");
        const resMy = await request(app)
            .get("/api/ideas/my")
            .set("Authorization", `Bearer ${founderToken}`);
        assert.strictEqual(resMy.status, 200);
        assert.strictEqual(resMy.body.success, true);
        assert.ok(resMy.body.ideas.some((i) => i.id === createdIdeaId));
        console.log("  -> PASSED: /my correctly routed before /:id and returned user's ideas.");

        // --- 8. Owner-Only Updates and Non-Owner Rejection ---
        console.log("Test 8: PUT /api/ideas/:id - Update authorization check");
        // Collaborator attempts to update founder's idea -> 403
        const resForbiddenUpdate = await request(app)
            .put(`/api/ideas/${createdIdeaId}`)
            .set("Authorization", `Bearer ${collabToken}`)
            .send({ title: "Hacked Title" });
        assert.strictEqual(resForbiddenUpdate.status, 403);

        // Founder updates own idea -> 200
        const updatedTitle = `AI Invoice Copilot v2 ${uniqueId}`;
        const resOwnerUpdate = await request(app)
            .put(`/api/ideas/${createdIdeaId}`)
            .set("Authorization", `Bearer ${founderToken}`)
            .send({ title: updatedTitle, stage: "Live/Early Users" });
        assert.strictEqual(resOwnerUpdate.status, 200);
        assert.strictEqual(resOwnerUpdate.body.idea.title, updatedTitle);
        assert.strictEqual(resOwnerUpdate.body.idea.stage, "Live/Early Users");
        console.log("  -> PASSED: Non-owner update rejected with 403, owner update succeeded with 200.");

        // --- 9. Reject Self-Interest on Own Idea ---
        console.log("Test 9: POST /api/ideas/:id/interest - Reject self-interest");
        const resSelfInterest = await request(app)
            .post(`/api/ideas/${createdIdeaId}/interest`)
            .set("Authorization", `Bearer ${founderToken}`)
            .send({ message: "I want to collaborate on my own project." });
        assert.strictEqual(resSelfInterest.status, 400);
        assert.strictEqual(resSelfInterest.body.success, false);
        console.log("  -> PASSED: Self-interest rejected with 400.");

        // --- 10. Express Interest Successfully by Collaborator ---
        console.log("Test 10: POST /api/ideas/:id/interest - Collaborator expresses interest");
        const resInterest = await request(app)
            .post(`/api/ideas/${createdIdeaId}/interest`)
            .set("Authorization", `Bearer ${collabToken}`)
            .send({ message: "Hi! I am a full-stack engineer and would love to help build this." });
        assert.strictEqual(resInterest.status, 201);
        assert.strictEqual(resInterest.body.success, true);
        assert.ok(resInterest.body.interest.id);
        assert.strictEqual(resInterest.body.interest.status, "pending");
        createdInterestId = resInterest.body.interest.id;
        console.log("  -> PASSED: Interest expressed with status 201.");

        // --- 11. Reject Duplicate Interest Request ---
        console.log("Test 11: POST /api/ideas/:id/interest - Reject duplicate interest");
        const resDupInterest = await request(app)
            .post(`/api/ideas/${createdIdeaId}/interest`)
            .set("Authorization", `Bearer ${collabToken}`)
            .send({ message: "Duplicate attempt." });
        assert.strictEqual(resDupInterest.status, 409);
        assert.strictEqual(resDupInterest.body.success, false);
        console.log("  -> PASSED: Duplicate interest rejected with 409 Conflict.");

        // --- 12. Founder Reviews Received Interests (GET /api/interests/received) ---
        console.log("Test 12: GET /api/interests/received - Founder reviews requests");
        const resReceived = await request(app)
            .get("/api/interests/received")
            .set("Authorization", `Bearer ${founderToken}`);
        assert.strictEqual(resReceived.status, 200);
        assert.strictEqual(resReceived.body.success, true);
        assert.ok(resReceived.body.interests.length >= 1);
        const matchInterest = resReceived.body.interests.find((i) => i.id === createdInterestId);
        assert.ok(matchInterest, "Received list must contain the collaborator's request");
        assert.strictEqual(matchInterest.sender.name, collaboratorUser.name);
        // Verify sender email is NOT exposed
        assert.strictEqual(matchInterest.sender.email, undefined);
        console.log("  -> PASSED: Founder received request list without exposing emails.");

        // --- 13. Owner-Only Accept/Decline of Request ---
        console.log("Test 13: PATCH /api/interests/:id - Status transition authorization");
        // Collaborator (requester) attempts to accept own request -> 403
        const resUnauthorizedPatch = await request(app)
            .patch(`/api/interests/${createdInterestId}`)
            .set("Authorization", `Bearer ${collabToken}`)
            .send({ status: "accepted" });
        assert.strictEqual(resUnauthorizedPatch.status, 403);

        // Founder accepts request -> 200
        const resAccept = await request(app)
            .patch(`/api/interests/${createdInterestId}`)
            .set("Authorization", `Bearer ${founderToken}`)
            .send({ status: "accepted" });
        assert.strictEqual(resAccept.status, 200);
        assert.strictEqual(resAccept.body.interest.status, "accepted");
        console.log("  -> PASSED: Non-owner accept rejected with 403, founder accept succeeded with 200.");

        // --- 14. Owner-Only Soft Deactivation (DELETE /api/ideas/:id) ---
        console.log("Test 14: DELETE /api/ideas/:id - Soft deactivation");
        // Non-owner attempts deactivation -> 403
        const resForbiddenDelete = await request(app)
            .delete(`/api/ideas/${createdIdeaId}`)
            .set("Authorization", `Bearer ${collabToken}`);
        assert.strictEqual(resForbiddenDelete.status, 403);

        // Founder deactivates -> 200
        const resDeactivate = await request(app)
            .delete(`/api/ideas/${createdIdeaId}`)
            .set("Authorization", `Bearer ${founderToken}`);
        assert.strictEqual(resDeactivate.status, 200);

        // Verify deactivated idea is excluded from public browse
        const resBrowseAfter = await request(app).get(`/api/ideas?search=${encodeURIComponent(uniqueId)}`);
        assert.strictEqual(resBrowseAfter.status, 200);
        const stillInPublic = resBrowseAfter.body.ideas.some((i) => i.id === createdIdeaId);
        assert.strictEqual(stillInPublic, false, "Deactivated idea must not appear in public active feed");
        console.log("  -> PASSED: Deactivation succeeded and excluded idea from public feed.");

        console.log("=== ALL 14 COMMUNITY TESTS PASSED SUCCESSFULLY ===");
    } catch (err) {
        console.error("Test Suite Failure:", err);
        throw err;
    } finally {
        // --- Cleanup: Safely remove only the test data created in this run ---
        console.log("Cleanup: Removing test records...");
        if (createdInterestId) {
            await Interest.deleteOne({ _id: createdInterestId }).catch(() => {});
        }
        if (createdIdeaId) {
            await Idea.deleteOne({ _id: createdIdeaId }).catch(() => {});
        }
        if (founderId) {
            await User.deleteOne({ _id: founderId }).catch(() => {});
        }
        if (collabId) {
            await User.deleteOne({ _id: collabId }).catch(() => {});
        }
        await mongoose.disconnect();
        console.log("Cleanup complete. Disconnected from database.");
    }
}

if (require.main === module) {
    runCommunitySuite()
        .then(() => process.exit(0))
        .catch(() => process.exit(1));
}

module.exports = runCommunitySuite;
