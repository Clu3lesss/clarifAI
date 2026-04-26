const request = require("supertest");
const mongoose = require("mongoose");
const path = require("path");
const fs = require("fs");
const os = require("os");

// ── Mock the ML service so tests don't need the Python server ─────────────────
jest.mock("../src/services/mlService", () => ({
    runDetection: jest.fn().mockResolvedValue({
        score: 72.4,
        label: "FAKE",
        confidence: 72.4,
        risk_level: "Likely Fake",
        face_detected: true,
        heatmap_b64: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
        processing_time_ms: 310,
    }),
    checkHealth: jest.fn().mockResolvedValue(true),
}));

const app = require("../src/server");
const User = require("../src/models/User");
const Detection = require("../src/models/Detection");

let accessToken;
let userId;

// Create a tiny valid JPEG in the OS temp dir for upload tests (cross-platform)
const DUMMY_IMAGE = path.join(os.tmpdir(), "test_face.jpg");

beforeAll(async () => {
    // mongoose connection is already opened by server.js (via connectDB) on require;
    // wait for it to be ready rather than opening a second connection.

    // Create and log in a test user
    const reg = await request(app).post("/api/auth/register").send({
        name: "Det Tester",
        email: "det@example.com",
        password: "Password1",
    });
    accessToken = reg.body.data.accessToken;
    userId = reg.body.data.user._id;

    // Write a minimal valid JPEG (1×1 white pixel)
    const jpegBytes = Buffer.from(
        "/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8U" +
        "HRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgN" +
        "DRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIy" +
        "MjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAFgABAQEAAAAAAAAAAAAAAAAABgUE/8QAIhAA" +
        "AgIBBAMAAAAAAAAAAAAAAQIDBAURITFBUf/EABQBAQAAAAAAAAAAAAAAAAAAAAD/xAAUEQEA" +
        "AAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCwc51tOlwMW3GGcSO0cr5SefXoAB//2Q==",
        "base64"
    );
    fs.writeFileSync(DUMMY_IMAGE, jpegBytes);
});

afterAll(async () => {
    await User.deleteMany({});
    await Detection.deleteMany({});
    await mongoose.connection.close();
    if (fs.existsSync(DUMMY_IMAGE)) fs.unlinkSync(DUMMY_IMAGE);
});

// ─────────────────────────────────────────────────────────────────────────────
describe("POST /api/detection/predict", () => {
    it("rejects unauthenticated request", async () => {
        const res = await request(app)
            .post("/api/detection/predict");
        expect(res.status).toBe(401);
    });

    it("rejects request with no file", async () => {
        const res = await request(app)
            .post("/api/detection/predict")
            .set("Authorization", `Bearer ${accessToken}`);
        expect(res.status).toBe(400);
        expect(res.body.code).toBe("NO_FILE");
    });

    it("rejects unsupported file type", async () => {
        const gifPath = path.join(os.tmpdir(), "test.gif");
        fs.writeFileSync(gifPath, Buffer.from("GIF89a", "ascii"));
        const res = await request(app)
            .post("/api/detection/predict")
            .set("Authorization", `Bearer ${accessToken}`)
            .attach("file", gifPath, { contentType: "image/gif" });
        expect([400, 415]).toContain(res.status);
        fs.unlinkSync(gifPath);
    });

    it("returns full ML result for valid image", async () => {
        const res = await request(app)
            .post("/api/detection/predict")
            .set("Authorization", `Bearer ${accessToken}`)
            .attach("file", DUMMY_IMAGE, { contentType: "image/jpeg" });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);

        const d = res.body.data;
        expect(d).toHaveProperty("detectionId");
        expect(d.label).toBe("FAKE");
        expect(d.score).toBe(72.4);
        expect(d.riskLevel).toBe("Likely Fake");
        expect(d.faceDetected).toBe(true);
        expect(d.heatmapB64).toBeTruthy();
        expect(d.confidence).toBe(72.4);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("GET /api/detection/result/:id", () => {
    let detectionId;

    beforeAll(async () => {
        const res = await request(app)
            .post("/api/detection/predict")
            .set("Authorization", `Bearer ${accessToken}`)
            .attach("file", DUMMY_IMAGE, { contentType: "image/jpeg" });
        detectionId = res.body.data?.detectionId;
    });

    it("rejects unauthenticated request", async () => {
        const res = await request(app).get(`/api/detection/result/${detectionId}`);
        expect(res.status).toBe(401);
    });

    it("returns full result for own detection", async () => {
        const res = await request(app)
            .get(`/api/detection/result/${detectionId}`)
            .set("Authorization", `Bearer ${accessToken}`);
        expect(res.status).toBe(200);
        const d = res.body.data;
        expect(d.id).toBe(detectionId);
        expect(d).toHaveProperty("heatmapB64");
        expect(d).toHaveProperty("score");
        expect(d).toHaveProperty("riskLevel");
        expect(d).toHaveProperty("faceDetected");
        expect(d.status).toBe("completed");
    });

    it("returns 404 for unknown id", async () => {
        const fakeId = new mongoose.Types.ObjectId();
        const res = await request(app)
            .get(`/api/detection/result/${fakeId}`)
            .set("Authorization", `Bearer ${accessToken}`);
        expect(res.status).toBe(404);
    });

    it("blocks another user from viewing detection", async () => {
        // Register a second user
        const reg2 = await request(app).post("/api/auth/register").send({
            name: "Other User",
            email: "other@example.com",
            password: "Password1",
        });
        const otherToken = reg2.body.data.accessToken;
        const res = await request(app)
            .get(`/api/detection/result/${detectionId}`)
            .set("Authorization", `Bearer ${otherToken}`);
        expect(res.status).toBe(404);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
describe("GET /api/detection/history", () => {
    it("returns paginated history for current user", async () => {
        const res = await request(app)
            .get("/api/detection/history?page=1&limit=5")
            .set("Authorization", `Bearer ${accessToken}`);
        expect(res.status).toBe(200);
        expect(res.body.data).toHaveProperty("detections");
        expect(res.body.data).toHaveProperty("pagination");
        expect(Array.isArray(res.body.data.detections)).toBe(true);
        // heatmap should be stripped from list
        res.body.data.detections.forEach((d) => {
            expect(d).not.toHaveProperty("heatmapB64");
        });
    });
});