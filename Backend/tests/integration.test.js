const assert = require("assert");
const request = require("supertest");
const app = require("../server");
const connectDB = require("../config/db");
const User = require("../models/User");
const Idea = require("../models/Idea");
const Interest = require("../models/Interest");

async function runEndToEndIntegrationSuite() {
    console.log("==========================================================");
    console.log("=== STARTING FULL END-TO-END SCENARIOS INTEGRATION TEST ===");
    console.log("==========================================================");

    await connectDB();

    const timestamp = Date.now();
    const user1Data = {
        name: `Founder_Alpha_${timestamp}`,
        email: `founder_alpha_${timestamp}@example.com`,
        password: "PassWord123!",
    };
    const user2Data = {
        name: `Collaborator_Beta_${timestamp}`,
        email: `collab_beta_${timestamp}@example.com`,
        password: "PassWord123!",
    };
    const user3Data = {
        name: `Applicant_Gamma_${timestamp}`,
        email: `applicant_gamma_${timestamp}@example.com`,
        password: "PassWord123!",
    };

    let user1Token = null;
    let user1Id = null;
    let user2Token = null;
    let user2Id = null;
    let user3Token = null;
    let user3Id = null;

    let publishedIdeaId = null;
    let user2InterestId = null;
    let user3InterestId = null;

    try {
        // ======================================================================
        // SCENARIO A: New user registration, publishing, and community discovery
        // ======================================================================
        console.log("\n--- SCENARIO A: Founder Registration & Publishing ---");

        // 1. Unauthenticated publish rejection
        console.log("A.1: Verify unauthenticated publish returns 401");
        const resUnauth = await request(app)
            .post("/api/ideas")
            .send({
                title: "Ghost Idea",
                description: "This should fail because no JWT was provided.",
                industry: "AI/ML",
                stage: "Idea",
            });
        assert.strictEqual(resUnauth.status, 401, "Expected 401 for unauthenticated creation");
        console.log("  -> PASSED: Unauthenticated user correctly blocked.");

        // 2. Register User 1 (Founder Alpha)
        console.log("A.2: Register User 1 (Founder Alpha)");
        const resReg1 = await request(app)
            .post("/api/auth/register")
            .send(user1Data);
        assert.strictEqual(resReg1.status, 201, "Expected 201 Created for User 1");
        assert.ok(resReg1.body.token, "Expected JWT token");
        assert.strictEqual(resReg1.body.user.name, user1Data.name);
        user1Token = resReg1.body.token;
        user1Id = resReg1.body.user.id;
        console.log("  -> PASSED: Founder Alpha registered with ID:", user1Id);

        // 3. Publish Startup Idea
        console.log("A.3: Publish Startup Idea 'AI Language Learning Copilot'");
        const ideaPayload = {
            title: "AI Language Learning Copilot",
            description: "A contextual conversational AI tutor tailored to university students studying abroad.",
            industry: "EdTech",
            stage: "Building MVP",
            founderName: "Alpha Founder",
            founderSkills: ["NLP", "Python", "React Native"],
            founderInterests: "Education & Linguistics",
            teamSize: 1,
            hasTeammates: false,
            lookingFor: ["Frontend Developer", "AI/ML Engineer"],
            idealCollaborator: "Someone passionate about conversational interfaces and linguistics.",
            collaborationStyle: "Equity-Based Co-Founder",
        };

        const resPublish = await request(app)
            .post("/api/ideas")
            .set("Authorization", `Bearer ${user1Token}`)
            .send(ideaPayload);

        assert.strictEqual(resPublish.status, 201, "Expected 201 Created for idea");
        assert.ok(resPublish.body.idea, "Expected idea object");
        assert.strictEqual(resPublish.body.idea.title, ideaPayload.title);
        assert.strictEqual(resPublish.body.idea.industry, "EdTech");
        publishedIdeaId = resPublish.body.idea.id;
        console.log("  -> PASSED: Startup idea published with ID:", publishedIdeaId);

        // 4. Verify idea appears in public Community feed
        console.log("A.4: Verify published idea appears in Community feed");
        const resFeed = await request(app)
            .get("/api/ideas")
            .query({ search: "Language Learning Copilot" });
        assert.strictEqual(resFeed.status, 200);
        assert.ok(resFeed.body.ideas.length >= 1, "Idea should appear in search results");
        const matchedIdea = resFeed.body.ideas.find((i) => i.id === publishedIdeaId);
        assert.ok(matchedIdea, "Published idea must be present in feed");
        assert.strictEqual(matchedIdea.founderName, "Alpha Founder");
        console.log("  -> PASSED: Published idea discovered in Community feed.");

        // ======================================================================
        // SCENARIO B: Second user discovery & expressing interest
        // ======================================================================
        console.log("\n--- SCENARIO B: Second User Expresses Interest ---");

        // 1. Register User 2 (Collaborator Beta)
        console.log("B.1: Register User 2 (Collaborator Beta)");
        const resReg2 = await request(app)
            .post("/api/auth/register")
            .send(user2Data);
        assert.strictEqual(resReg2.status, 201);
        user2Token = resReg2.body.token;
        user2Id = resReg2.body.user.id;
        console.log("  -> PASSED: Collaborator Beta registered with ID:", user2Id);

        // 2. User 2 views idea details
        console.log("B.2: User 2 retrieves idea details by ID");
        const resDetail = await request(app)
            .get(`/api/ideas/${publishedIdeaId}`);
        assert.strictEqual(resDetail.status, 200);
        assert.strictEqual(resDetail.body.idea.title, "AI Language Learning Copilot");
        assert.ok(!resDetail.body.idea.founder.email, "Founder email must NOT be exposed");
        console.log("  -> PASSED: Idea details loaded without exposing private contact info.");

        // 3. User 1 cannot express interest in own idea
        console.log("B.3: Verify founder cannot express interest in own idea");
        const resSelfInterest = await request(app)
            .post(`/api/ideas/${publishedIdeaId}/interest`)
            .set("Authorization", `Bearer ${user1Token}`)
            .send({ message: "I want to collaborate with myself" });
        assert.strictEqual(resSelfInterest.status, 400);
        assert.ok(resSelfInterest.body.message.includes("own idea"));
        console.log("  -> PASSED: Self-interest correctly rejected.");

        // 4. User 2 expresses interest
        console.log("B.4: User 2 submits collaboration note");
        const resInterest = await request(app)
            .post(`/api/ideas/${publishedIdeaId}/interest`)
            .set("Authorization", `Bearer ${user2Token}`)
            .send({ message: "Hi! I build fullstack React apps and would love to join your MVP." });
        assert.strictEqual(resInterest.status, 201);
        assert.ok(resInterest.body.interest);
        assert.strictEqual(resInterest.body.interest.status, "pending");
        user2InterestId = resInterest.body.interest.id;
        console.log("  -> PASSED: Interest submitted with status 'pending', ID:", user2InterestId);

        // 5. User 2 duplicate request rejection
        console.log("B.5: Verify duplicate interest from same user is rejected");
        const resDup = await request(app)
            .post(`/api/ideas/${publishedIdeaId}/interest`)
            .set("Authorization", `Bearer ${user2Token}`)
            .send({ message: "Sending again..." });
        assert.strictEqual(resDup.status, 409, "Expected 409 Conflict for duplicate");
        console.log("  -> PASSED: Duplicate request rejected with 409 Conflict.");

        // ======================================================================
        // SCENARIO C: Founder review & status management
        // ======================================================================
        console.log("\n--- SCENARIO C: Founder Reviews & Manages Requests ---");

        // 1. User 3 (Applicant Gamma) also registers and expresses interest
        const resReg3 = await request(app)
            .post("/api/auth/register")
            .send(user3Data);
        assert.strictEqual(resReg3.status, 201);
        user3Token = resReg3.body.token;
        user3Id = resReg3.body.user.id;

        const resInterest3 = await request(app)
            .post(`/api/ideas/${publishedIdeaId}/interest`)
            .set("Authorization", `Bearer ${user3Token}`)
            .send({ message: "I do sales and marketing." });
        assert.strictEqual(resInterest3.status, 201);
        user3InterestId = resInterest3.body.interest.id;

        // 2. Founder checks received requests
        console.log("C.1: Founder retrieves received collaboration requests");
        const resReceived = await request(app)
            .get("/api/interests/received")
            .set("Authorization", `Bearer ${user1Token}`);
        assert.strictEqual(resReceived.status, 200);
        assert.strictEqual(resReceived.body.success, true);
        assert.ok(resReceived.body.interests.length >= 2, "Expected at least 2 requests");
        const reqBeta = resReceived.body.interests.find((i) => i.id === user2InterestId);
        assert.ok(reqBeta, "User 2 request should be in founder's received list");
        assert.strictEqual(reqBeta.sender.name, user2Data.name);
        assert.ok(!reqBeta.sender.email, "Collaborator email must NOT be exposed");
        console.log("  -> PASSED: Founder received requests list verified.");

        // 3. Unauthorized user cannot accept request
        console.log("C.2: Non-founder attempt to accept request is blocked");
        const resUnauthorizedPatch = await request(app)
            .patch(`/api/interests/${user2InterestId}`)
            .set("Authorization", `Bearer ${user2Token}`)
            .send({ status: "accepted" });
        assert.strictEqual(resUnauthorizedPatch.status, 403);
        console.log("  -> PASSED: Non-founder blocked from updating request status.");

        // 4. Founder accepts User 2 request
        console.log("C.3: Founder accepts User 2 collaboration request");
        const resAccept = await request(app)
            .patch(`/api/interests/${user2InterestId}`)
            .set("Authorization", `Bearer ${user1Token}`)
            .send({ status: "accepted" });
        assert.strictEqual(resAccept.status, 200);
        assert.strictEqual(resAccept.body.interest.status, "accepted");
        console.log("  -> PASSED: User 2 request marked as 'accepted'.");

        // 5. Founder declines User 3 request
        console.log("C.4: Founder declines User 3 collaboration request");
        const resDecline = await request(app)
            .patch(`/api/interests/${user3InterestId}`)
            .set("Authorization", `Bearer ${user1Token}`)
            .send({ status: "declined" });
        assert.strictEqual(resDecline.status, 200);
        assert.strictEqual(resDecline.body.interest.status, "declined");
        console.log("  -> PASSED: User 3 request marked as 'declined'.");

        // ======================================================================
        // SCENARIO D: Idea management (Edit, Deactivate, Permissions)
        // ======================================================================
        console.log("\n--- SCENARIO D: Idea Management & Deactivation ---");

        // 1. Non-founder cannot edit idea
        console.log("D.1: Non-founder attempt to edit idea is rejected");
        const resBadEdit = await request(app)
            .put(`/api/ideas/${publishedIdeaId}`)
            .set("Authorization", `Bearer ${user2Token}`)
            .send({ title: "Hacked Idea Title" });
        assert.strictEqual(resBadEdit.status, 403);
        console.log("  -> PASSED: Unauthorized edit correctly rejected with 403.");

        // 2. Founder edits idea
        console.log("D.2: Founder updates idea title and stage");
        const resEdit = await request(app)
            .put(`/api/ideas/${publishedIdeaId}`)
            .set("Authorization", `Bearer ${user1Token}`)
            .send({
                title: "AI Language Learning Copilot (Updated)",
                stage: "Live/Early Users",
            });
        assert.strictEqual(resEdit.status, 200);
        assert.strictEqual(resEdit.body.idea.title, "AI Language Learning Copilot (Updated)");
        assert.strictEqual(resEdit.body.idea.stage, "Live/Early Users");
        console.log("  -> PASSED: Founder edit succeeded.");

        // 3. Verify changes appear in Community feed
        console.log("D.3: Verify updated title appears in Community feed");
        const resUpdatedFeed = await request(app)
            .get("/api/ideas")
            .query({ search: "Updated" });
        assert.strictEqual(resUpdatedFeed.status, 200);
        const foundUpdated = resUpdatedFeed.body.ideas.find((i) => i.id === publishedIdeaId);
        assert.ok(foundUpdated, "Updated idea should be found");
        assert.strictEqual(foundUpdated.stage, "Live/Early Users");
        console.log("  -> PASSED: Community feed shows updated idea content.");

        // 4. Non-founder cannot deactivate idea
        console.log("D.4: Non-founder attempt to deactivate idea is rejected");
        const resBadDeact = await request(app)
            .delete(`/api/ideas/${publishedIdeaId}`)
            .set("Authorization", `Bearer ${user2Token}`);
        assert.strictEqual(resBadDeact.status, 403);
        console.log("  -> PASSED: Unauthorized deactivation rejected with 403.");

        // 5. Founder deactivates idea
        console.log("D.5: Founder deactivates idea");
        const resDeact = await request(app)
            .delete(`/api/ideas/${publishedIdeaId}`)
            .set("Authorization", `Bearer ${user1Token}`);
        assert.strictEqual(resDeact.status, 200);
        console.log("  -> PASSED: Idea deactivated.");

        // 6. Verify idea is excluded from public discovery
        console.log("D.6: Verify deactivated idea disappears from public feed");
        const resFeedAfter = await request(app)
            .get("/api/ideas")
            .query({ search: "Language Learning Copilot" });
        assert.strictEqual(resFeedAfter.status, 200);
        const stillInFeed = resFeedAfter.body.ideas.find((i) => i.id === publishedIdeaId);
        assert.strictEqual(stillInFeed, undefined, "Deactivated idea MUST NOT appear in public feed");
        console.log("  -> PASSED: Deactivated idea completely hidden from public feed.");

        // 7. Public GET /api/ideas/:id returns 404 for deactivated idea
        console.log("D.7: Public direct fetch of deactivated idea returns 404");
        const resPublicFetch = await request(app)
            .get(`/api/ideas/${publishedIdeaId}`);
        assert.strictEqual(resPublicFetch.status, 404);
        console.log("  -> PASSED: Public direct lookup returns 404.");

        // 8. Owner with token can still retrieve deactivated idea
        console.log("D.8: Founder with valid token can retrieve own deactivated idea");
        const resOwnerFetch = await request(app)
            .get(`/api/ideas/${publishedIdeaId}`)
            .set("Authorization", `Bearer ${user1Token}`);
        assert.strictEqual(resOwnerFetch.status, 200);
        assert.strictEqual(resOwnerFetch.body.idea.isActive, false);
        console.log("  -> PASSED: Founder can inspect deactivated idea for editing/reactivation.");

        // ======================================================================
        // SCENARIO E: Existing AI idea evaluator preservation
        // ======================================================================
        console.log("\n--- SCENARIO E: Existing Groq AI Idea Evaluator ---");
        console.log("E.1: Call POST /api/analyze with complete startup evaluation payload");

        const analyzePayload = {
            fullIdea: "An on-demand subscription for university student laundry and eco-friendly garment care with smart lockers.",
            problem: "Dorm laundromats are chronically broken, overcrowded, and waste student time.",
            audience: "Campus residents and Greek life members.",
            solution: "Smart locker drop-off with 24h pickup and sustainable washing.",
            revenue: "Monthly recurring tier: $29/month for 4 loads.",
            timeCommitment: "15",
            skillLevel: "Intermediate",
        };

        const resAnalyze = await request(app)
            .post("/api/analyze")
            .send(analyzePayload);

        assert.strictEqual(resAnalyze.status, 200, "Analyzer must return 200 OK");
        assert.strictEqual(resAnalyze.body.success, true, "Analyzer must succeed");
        assert.ok(resAnalyze.body.result, "Analyzer must return Groq result payload");

        // Parse Groq JSON result
        const evalJson = JSON.parse(resAnalyze.body.result);
        assert.ok(typeof evalJson.score === "number", "Evaluation score must be a number");
        assert.ok(evalJson.profitPotential, "Evaluation must have profitPotential");
        assert.ok(evalJson.risks, "Evaluation must have risks");
        assert.ok(evalJson.verdict, "Evaluation must have verdict");
        console.log(`  -> PASSED: Groq Evaluator returned Score: ${evalJson.score}/100, Verdict: "${evalJson.verdict.slice(0, 60)}..."`);

        console.log("\n==========================================================");
        console.log("=== ALL 5 SCENARIOS (A, B, C, D, E) PASSED SUCCESSFULLY ===");
        console.log("==========================================================");

    } finally {
        // Safe isolated cleanup of test data
        console.log("\nCleaning up integration test records...");
        if (user2InterestId) await Interest.deleteMany({ _id: { $in: [user2InterestId, user3InterestId].filter(Boolean) } });
        if (publishedIdeaId) await Idea.deleteMany({ _id: publishedIdeaId });
        const testUserIds = [user1Id, user2Id, user3Id].filter(Boolean);
        if (testUserIds.length > 0) {
            await User.deleteMany({ _id: { $in: testUserIds } });
        }
        console.log("Cleanup complete.");
        process.exit(0);
    }
}

runEndToEndIntegrationSuite().catch((err) => {
    console.error("FATAL ERROR IN INTEGRATION SUITE:", err);
    process.exit(1);
});
