const request = require("supertest");
const mongoose = require("mongoose");
const app = require("../src/server");
const User = require("../src/models/User");

// Use a separate test DB
beforeAll(async () => {
    // Mongoose connection is already opened by server.js (via connectDB) on require.
    // Waiting for the ready-state avoids a duplicate connection.
    if (mongoose.connection.readyState === 0) {
        await mongoose.connect(process.env.MONGO_URI);
    }
});

afterAll(async () => {
    await User.deleteMany({});
    // Only close if we are the ones who opened the connection
    if (mongoose.connection.readyState !== 0) {
        await mongoose.connection.close();
    }
});

afterEach(async () => {
    await User.deleteMany({});
});

const testUser = {
    name: "Test User",
    email: "test@example.com",
    password: "Password1",
};

describe("POST /api/auth/register", () => {
    it("registers a new user and returns tokens", async () => {
        const res = await request(app).post("/api/auth/register").send(testUser);
        expect(res.status).toBe(201);
        expect(res.body.success).toBe(true);
        expect(res.body.data).toHaveProperty("accessToken");
        expect(res.body.data).toHaveProperty("refreshToken");
        expect(res.body.data.user.email).toBe(testUser.email);
        expect(res.body.data.user).not.toHaveProperty("password");
    });

    it("rejects duplicate email", async () => {
        await request(app).post("/api/auth/register").send(testUser);
        const res = await request(app).post("/api/auth/register").send(testUser);
        expect(res.status).toBe(400);
        expect(res.body.code).toBe("EMAIL_TAKEN");
    });

    it("rejects weak password", async () => {
        const res = await request(app)
            .post("/api/auth/register")
            .send({ ...testUser, password: "weak" });
        expect(res.status).toBe(400);
    });

    it("rejects invalid email", async () => {
        const res = await request(app)
            .post("/api/auth/register")
            .send({ ...testUser, email: "not-an-email" });
        expect(res.status).toBe(400);
    });
});

describe("POST /api/auth/login", () => {
    beforeEach(async () => {
        await request(app).post("/api/auth/register").send(testUser);
    });

    it("logs in with correct credentials", async () => {
        const res = await request(app)
            .post("/api/auth/login")
            .send({ email: testUser.email, password: testUser.password });
        expect(res.status).toBe(200);
        expect(res.body.data).toHaveProperty("accessToken");
    });

    it("rejects wrong password", async () => {
        const res = await request(app)
            .post("/api/auth/login")
            .send({ email: testUser.email, password: "WrongPass1" });
        expect(res.status).toBe(401);
        expect(res.body.code).toBe("INVALID_CREDENTIALS");
    });
});

describe("GET /api/auth/me", () => {
    it("returns current user with valid token", async () => {
        const reg = await request(app).post("/api/auth/register").send(testUser);
        const token = reg.body.data.accessToken;
        const res = await request(app)
            .get("/api/auth/me")
            .set("Authorization", `Bearer ${token}`);
        expect(res.status).toBe(200);
        expect(res.body.data.user.email).toBe(testUser.email);
    });

    it("rejects request with no token", async () => {
        const res = await request(app).get("/api/auth/me");
        expect(res.status).toBe(401);
    });
});

describe("POST /api/auth/refresh", () => {
    it("issues new tokens with valid refresh token", async () => {
        const reg = await request(app).post("/api/auth/register").send(testUser);
        const { refreshToken } = reg.body.data;
        const res = await request(app)
            .post("/api/auth/refresh")
            .send({ refreshToken });
        expect(res.status).toBe(200);
        expect(res.body.data).toHaveProperty("accessToken");
        expect(res.body.data).toHaveProperty("refreshToken");
    });

    it("rejects invalid refresh token", async () => {
        const res = await request(app)
            .post("/api/auth/refresh")
            .send({ refreshToken: "bad.token.here" });
        expect(res.status).toBe(401);
    });
});

describe("POST /api/auth/logout", () => {
    it("logs out successfully", async () => {
        const reg = await request(app).post("/api/auth/register").send(testUser);
        const token = reg.body.data.accessToken;
        const res = await request(app)
            .post("/api/auth/logout")
            .set("Authorization", `Bearer ${token}`);
        expect(res.status).toBe(200);
    });
});