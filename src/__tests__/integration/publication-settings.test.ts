import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { NextRequest } from "next/server";
import { PUT } from "@/app/api/settings/publication/route";
import {
  cleanupDatabase,
  createTestAuthor,
  createTestUser,
  prisma,
  Role,
} from "./test-utils";
import { DEFAULT_PUBLICATION_SETTINGS } from "@/lib/publication-settings.shared";

const { mockGetSession } = vi.hoisted(() => ({
  mockGetSession: vi.fn(),
}));

vi.mock("@/auth", () => ({
  auth: { api: { getSession: mockGetSession } },
}));

describe("PUT /api/settings/publication", () => {
  beforeAll(cleanupDatabase);
  afterAll(cleanupDatabase);
  beforeEach(async () => {
    await cleanupDatabase();
    vi.clearAllMocks();
  });

  function request(body: unknown) {
    return new NextRequest("http://localhost/api/settings/publication", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  it("lets an admin save validated publication controls", async () => {
    const { user } = await createTestUser({
      email: "publication-admin@test.com",
      role: Role.ADMIN,
    });
    mockGetSession.mockResolvedValue({ user: { id: user.id } });
    const input = {
      ...DEFAULT_PUBLICATION_SETTINGS,
      appearance: {
        ...DEFAULT_PUBLICATION_SETTINGS.appearance,
        primaryColor: "#123456",
        motionStyle: "subtle",
      },
      footer: { poweredByOpenBlog: false },
    };
    const response = await PUT(request(input));
    const data = await response.json();
    expect(response.status).toBe(200);
    expect(data.appearance.primaryColor).toBe("#123456");
    expect(data.footer.poweredByOpenBlog).toBe(false);
    const stored = await prisma.siteSettings.findUnique({
      where: { key: "publication_experience" },
    });
    expect(stored?.value).toContain("#123456");
  });

  it("forbids an author from changing publication-wide controls", async () => {
    const { user } = await createTestAuthor({
      email: "publication-author@test.com",
    });
    mockGetSession.mockResolvedValue({ user: { id: user.id } });
    const response = await PUT(request(DEFAULT_PUBLICATION_SETTINGS));
    expect(response.status).toBe(403);
  });

  it("rejects palettes that fail readable contrast", async () => {
    const { user } = await createTestUser({
      email: "publication-contrast@test.com",
      role: Role.ADMIN,
    });
    mockGetSession.mockResolvedValue({ user: { id: user.id } });
    const input = {
      ...DEFAULT_PUBLICATION_SETTINGS,
      appearance: {
        ...DEFAULT_PUBLICATION_SETTINGS.appearance,
        backgroundColor: "#ffffff",
        surfaceColor: "#ffffff",
        textColor: "#eeeeee",
      },
    };
    const response = await PUT(request(input));
    expect(response.status).toBe(400);
    expect((await response.json()).error).toContain("contrast");
  });
});
