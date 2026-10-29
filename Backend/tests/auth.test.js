const assert = require("assert");
const request = require("supertest");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const app = require("../server");
const User = require("../models/User");
const connectDB = require("../config/db");

async function runTests() {
    console.log("=== STARTING AUTHENTICATION SUITE ===");

    await connectDB();

    const uniqueId = Date.now();
    const testUser = {
        name: `Test Founder ${uniqueId}`,
        email: `founder_${uniqueId}@example.com`,
        password: "securePassword123",
    };

    try {
        // 1. Successful Registration
        console.log("Test 1: POST /auth/register - Successful registration");
        const resReg = await request(app)
            .post("/auth/register")
            .send(testUser);

        assert.strictEqual(resReg.status, 201, `Expected status 201, got ${resReg.status}: ${JSON.stringify(resReg.body)}`);
        assert.strictEqual(resReg.body.success, true);
        assert.ok(resReg.body.token, "Token should be present in registration response");
        assert.strictEqual(resReg.body.user.email, testUser.email);
        assert.strictEqual(resReg.body.user.name, testUser.name);
        assert.strictEqual(resReg.body.user.password, undefined, "Password hash must not be returned");
        console.log("  -> PASSED: User registered, token received, password not leaked.");

        // 2. Duplicate Account Rejection
        console.log("Test 2: POST /auth/register - Duplicate email rejection");
        const resDup = await request(app)
            .post("/auth/register")
            .send(testUser);

        assert.strictEqual(resDup.status, 409, `Expected status 409, got ${resDup.status}`);
        assert.strictEqual(resDup.body.success, false);
        console.log("  -> PASSED: Duplicate registration correctly rejected with 409 Conflict.");

        // 3. Successful Login
        console.log("Test 3: POST /auth/login - Successful login");
        const resLogin = await request(app)
            .post("/auth/login")
            .send({ email: testUser.email, password: testUser.password });

        assert.strictEqual(resLogin.status, 200, `Expected status 200, got ${resLogin.status}`);
        assert.strictEqual(resLogin.body.success, true);
        assert.ok(resLogin.body.token, "Token should be present in login response");
        assert.strictEqual(resLogin.body.user.password, undefined, "Password hash must not be returned");
        const validToken = resLogin.body.token;
        console.log("  -> PASSED: Login succeeded, token returned.");

        // 4. Incorrect Password Rejection
        console.log("Test 4: POST /auth/login - Incorrect password rejection");
        const resBadPass = await request(app)
            .post("/auth/login")
            .send({ email: testUser.email, password: "wrongPassword" });

        assert.strictEqual(resBadPass.status, 401, `Expected status 401, got ${resBadPass.status}`);
        assert.strictEqual(resBadPass.body.success, false);
        console.log("  -> PASSED: Bad password rejected with 401 Unauthorized.");

        // 5. Middleware: Missing Token
        console.log("Test 5: Middleware - Missing token rejection");
        const authMiddleware = require("../middleware/auth");
        let nextCalled = false;
        let mockResStatus = 0;
        let mockResBody = null;
        const mockReqMissing = { headers: {} };
        const mockRes = {
            status: (code) => {
                mockResStatus = code;
                return {
                    json: (body) => { mockResBody = body; }
                };
            }
        };

        authMiddleware(mockReqMissing, mockRes, () => { nextCalled = true; });
        assert.strictEqual(nextCalled, false);
        assert.strictEqual(mockResStatus, 401);
        console.log("  -> PASSED: Missing token rejected with 401.");

        // 6. Middleware: Invalid Token
        console.log("Test 6: Middleware - Invalid token rejection");
        const mockReqInvalid = { headers: { authorization: "Bearer invalid.token.payload" } };
        mockResStatus = 0;
        authMiddleware(mockReqInvalid, mockRes, () => { nextCalled = true; });
        assert.strictEqual(nextCalled, false);
        assert.strictEqual(mockResStatus, 401);
        console.log("  -> PASSED: Invalid token rejected with 401.");

        // 7. Middleware: Valid Token
        console.log("Test 7: Middleware - Valid token acceptance");
        nextCalled = false;
        const mockReqValid = { headers: { authorization: `Bearer ${validToken}` } };
        authMiddleware(mockReqValid, mockRes, () => { nextCalled = true; });
        assert.strictEqual(nextCalled, true);
        assert.ok(mockReqValid.userId, "req.userId must be populated");
        console.log("  -> PASSED: Valid token accepted and req.userId set.");

        // Clean up test user
        await User.deleteOne({ email: testUser.email });
        console.log("=== ALL 7 TESTS PASSED SUCCESSFULLY ===");
    } catch (err) {
        console.error("Test failure:", err);
        // Attempt cleanup
        await User.deleteOne({ email: testUser.email }).catch(() => {});
        process.exit(1);
    } finally {
        await mongoose.disconnect();
        process.exit(0);
    }
}

runTests();
