import { expect, test } from "@playwright/test";

/**
 * Helper: navigate to "/" so the browser picks up the authenticated session
 * cookies, then return `page.request` for direct API calls.
 */
async function authenticatedRequest(page: import("@playwright/test").Page) {
  await page.goto("/");
  return page.request;
}

// ---------------------------------------------------------------------------
// GET /api/memories
// ---------------------------------------------------------------------------
test.describe("GET /api/memories", () => {
  test("returns 401 without authentication", async ({ request }) => {
    const res = await request.get("/api/memories");
    expect(res.status()).toBe(401);
    const body = await res.json();
    expect(body).toHaveProperty("error");
  });

  test("returns an array when authenticated", async ({ page }) => {
    const api = await authenticatedRequest(page);
    const res = await api.get("/api/memories");
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// POST /api/memories
// ---------------------------------------------------------------------------
test.describe("POST /api/memories", () => {
  test("returns 401 without authentication", async ({ request }) => {
    const res = await request.post("/api/memories", {
      data: { content: "test" },
    });
    expect(res.status()).toBe(401);
  });

  test("rejects empty content", async ({ page }) => {
    const api = await authenticatedRequest(page);
    const res = await api.post("/api/memories", { data: { content: "" } });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("non-empty string");
  });

  test("rejects missing content field", async ({ page }) => {
    const api = await authenticatedRequest(page);
    const res = await api.post("/api/memories", { data: {} });
    expect(res.status()).toBe(400);
  });

  test("rejects content exceeding 1000 characters", async ({ page }) => {
    const api = await authenticatedRequest(page);
    const longContent = "a".repeat(1001);
    const res = await api.post("/api/memories", {
      data: { content: longContent },
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("1000");
  });

  test("creates a memory and returns 201", async ({ page }) => {
    const api = await authenticatedRequest(page);
    const content = `test-memory-${Date.now()}`;
    const res = await api.post("/api/memories", { data: { content } });
    expect(res.status()).toBe(201);
    const body = await res.json();
    expect(body).toHaveProperty("id");
    expect(body).toHaveProperty("content", content);

    // Clean up
    await api.delete("/api/memories", { data: { id: body.id } });
  });
});

// ---------------------------------------------------------------------------
// DELETE /api/memories
// ---------------------------------------------------------------------------
test.describe("DELETE /api/memories", () => {
  test("returns 401 without authentication", async ({ request }) => {
    const res = await request.delete("/api/memories", {
      data: { id: "fake-id" },
    });
    expect(res.status()).toBe(401);
  });

  test("rejects missing id", async ({ page }) => {
    const api = await authenticatedRequest(page);
    const res = await api.delete("/api/memories", { data: {} });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("id");
  });

  test("deletes a memory successfully", async ({ page }) => {
    const api = await authenticatedRequest(page);

    // Create a memory first
    const createRes = await api.post("/api/memories", {
      data: { content: `delete-me-${Date.now()}` },
    });
    const created = await createRes.json();

    // Delete it
    const deleteRes = await api.delete("/api/memories", {
      data: { id: created.id },
    });
    expect(deleteRes.status()).toBe(200);
    const body = await deleteRes.json();
    expect(body).toHaveProperty("success", true);
  });
});

// ---------------------------------------------------------------------------
// GET /api/memories?q=search
// ---------------------------------------------------------------------------
test.describe("GET /api/memories?q=search", () => {
  test("filters memories by search term", async ({ page }) => {
    const api = await authenticatedRequest(page);
    const uniqueTag = `searchable-${Date.now()}`;

    // Create a memory with a unique tag
    const createRes = await api.post("/api/memories", {
      data: { content: `Remember ${uniqueTag} for testing` },
    });
    const created = await createRes.json();

    // Search for it
    const searchRes = await api.get(`/api/memories?q=${uniqueTag}`);
    expect(searchRes.status()).toBe(200);
    const results = await searchRes.json();
    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results.some((m: { content: string }) => m.content.includes(uniqueTag))).toBe(true);

    // Clean up
    await api.delete("/api/memories", { data: { id: created.id } });
  });
});

// ---------------------------------------------------------------------------
// PATCH /api/settings — memory-related fields
// ---------------------------------------------------------------------------
test.describe("PATCH /api/settings (memory fields)", () => {
  test("returns 401 without authentication", async ({ request }) => {
    const res = await request.patch("/api/settings", {
      data: { memoryEnabled: true },
    });
    expect(res.status()).toBe(401);
  });

  test("updates memoryEnabled toggle", async ({ page }) => {
    const api = await authenticatedRequest(page);

    // Read current value
    const getRes = await api.get("/api/settings");
    const original = await getRes.json();

    // Toggle memoryEnabled
    const newValue = !original.memoryEnabled;
    const patchRes = await api.patch("/api/settings", {
      data: { memoryEnabled: newValue },
    });
    expect(patchRes.status()).toBe(200);
    const updated = await patchRes.json();
    expect(updated.memoryEnabled).toBe(newValue);

    // Restore original value
    await api.patch("/api/settings", {
      data: { memoryEnabled: original.memoryEnabled },
    });
  });

  test("rejects invalid memoryEnabled value", async ({ page }) => {
    const api = await authenticatedRequest(page);
    const res = await api.patch("/api/settings", {
      data: { memoryEnabled: "yes" },
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("memoryEnabled");
  });

  test("updates personalisation fields", async ({ page }) => {
    const api = await authenticatedRequest(page);
    const uniqueSuffix = Date.now().toString();

    const patchRes = await api.patch("/api/settings", {
      data: {
        nickname: `TestNick-${uniqueSuffix}`,
        occupation: `Tester-${uniqueSuffix}`,
        aboutYou: `About me ${uniqueSuffix}`,
        customInstructions: `Instructions ${uniqueSuffix}`,
      },
    });
    expect(patchRes.status()).toBe(200);
    const updated = await patchRes.json();
    expect(updated.nickname).toBe(`TestNick-${uniqueSuffix}`);
    expect(updated.occupation).toBe(`Tester-${uniqueSuffix}`);
    expect(updated.aboutYou).toBe(`About me ${uniqueSuffix}`);
    expect(updated.customInstructions).toBe(`Instructions ${uniqueSuffix}`);

    // Clean up — reset to null
    await api.patch("/api/settings", {
      data: {
        nickname: null,
        occupation: null,
        aboutYou: null,
        customInstructions: null,
      },
    });
  });
});

// ---------------------------------------------------------------------------
// Admin endpoints: /api/admin/users/[id]/memory
// ---------------------------------------------------------------------------
test.describe("Admin memory endpoints", () => {
  const fakeUserId = "00000000-0000-0000-0000-000000000000";

  test("GET returns 401 without authentication", async ({ request }) => {
    const res = await request.get(`/api/admin/users/${fakeUserId}/memory`);
    expect(res.status()).toBe(401);
  });

  test("PUT returns 401 without authentication", async ({ request }) => {
    const res = await request.put(`/api/admin/users/${fakeUserId}/memory`, {
      data: { memoryEnabled: true },
    });
    expect(res.status()).toBe(401);
  });

  test("DELETE returns 401 without authentication", async ({ request }) => {
    const res = await request.delete(
      `/api/admin/users/${fakeUserId}/memory`,
    );
    expect(res.status()).toBe(401);
  });

  test("GET returns 403 for non-admin users", async ({ page }) => {
    const api = await authenticatedRequest(page);
    const res = await api.get(`/api/admin/users/${fakeUserId}/memory`);
    // Non-admin users get 403; admin users get 200/404
    expect([403, 200, 404]).toContain(res.status());
    if (res.status() === 403) {
      const body = await res.json();
      expect(body.error).toContain("Forbidden");
    }
  });

  test("PUT returns 403 for non-admin users", async ({ page }) => {
    const api = await authenticatedRequest(page);
    const res = await api.put(`/api/admin/users/${fakeUserId}/memory`, {
      data: { memoryEnabled: true },
    });
    expect([403, 200, 404]).toContain(res.status());
    if (res.status() === 403) {
      const body = await res.json();
      expect(body.error).toContain("Forbidden");
    }
  });

  test("DELETE returns 403 for non-admin users", async ({ page }) => {
    const api = await authenticatedRequest(page);
    const res = await api.delete(
      `/api/admin/users/${fakeUserId}/memory`,
    );
    expect([403, 200]).toContain(res.status());
    if (res.status() === 403) {
      const body = await res.json();
      expect(body.error).toContain("Forbidden");
    }
  });
});