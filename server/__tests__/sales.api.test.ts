import { describe, expect, it } from "vitest";
import request from "supertest";

/*
 * Integration tests for the Sales API (PRD §11.4).
 *
 * These tests require a running Postgres database pointed at by
 * `TEST_DATABASE_URL` (falls back to `DATABASE_URL`).
 *
 * Run with:
 *   TEST_DATABASE_URL="postgresql://..." npx vitest run server/__tests__/sales.api.test.ts
 */

const BASE = "/api/v1";

describe("Sales API — Integration", () => {
  it("rejects unauthenticated requests", async () => {
    const { app } = await import("../app");
    const res = await request(app).post(`${BASE}/sales`).send({
      items: [],
      total: 0,
      paymentMethod: "cash",
    });
    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it("rejects sale with invalid Zod schema", async () => {
    const { app } = await import("../app");
    const res = await request(app)
      .post(`${BASE}/sales`)
      .set("Authorization", "Bearer test-token")
      .send({ invalid: true });
    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });
});

describe("Products API — Integration", () => {
  it("returns 401 without auth header", async () => {
    const { app } = await import("../app");
    const res = await request(app).get(`${BASE}/products`);
    expect(res.status).toBe(401);
  });
});
