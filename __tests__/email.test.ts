import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const send = vi.hoisted(() => vi.fn());
vi.mock("resend", () => ({
  Resend: class Resend {
    emails = { send };
  },
}));

import {
  sendEmail,
  sendInvitationEmail,
  sendNotificationEmail,
  sendPasswordResetEmail,
} from "@/lib/email";

describe("transactional email adapter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("RESEND_API_KEY", "");
    vi.stubEnv("EMAIL_FROM", "");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("provides a safe development preview without credentials", async () => {
    const info = vi.spyOn(console, "info").mockImplementation(() => undefined);
    await expect(
      sendEmail("parent@example.test", "Subject", "<p>Hello</p>"),
    ).resolves.toBe("development-preview");
    expect(info).toHaveBeenCalledWith(
      expect.stringContaining("Subject -> parent@example.test"),
    );
    expect(send).not.toHaveBeenCalled();
  });

  it("fails closed when production email is not configured", async () => {
    vi.stubEnv("NODE_ENV", "production");
    await expect(
      sendEmail("parent@example.test", "Subject", "<p>Hello</p>"),
    ).rejects.toThrow("RESEND_API_KEY is required");
  });

  it("uses the configured sender and returns the provider identifier", async () => {
    vi.stubEnv("RESEND_API_KEY", "resend-key");
    vi.stubEnv("EMAIL_FROM", "Smart Kids <contact@example.test>");
    send.mockResolvedValue({ data: { id: "email-a" }, error: null });
    await expect(
      sendPasswordResetEmail(
        "parent@example.test",
        "https://example.test/reset?token=abc",
      ),
    ).resolves.toBe("email-a");
    expect(send).toHaveBeenCalledWith(
      expect.objectContaining({
        from: "Smart Kids <contact@example.test>",
        to: "parent@example.test",
        subject: "Réinitialisation du mot de passe",
        html: expect.stringContaining("https://example.test/reset?token=abc"),
      }),
    );
  });

  it("escapes dynamic content in invitation and notification HTML", async () => {
    vi.stubEnv("RESEND_API_KEY", "resend-key");
    send.mockResolvedValue({ data: { id: "email-a" }, error: null });
    await sendInvitationEmail(
      "parent@example.test",
      "<Sara>",
      "https://example.test/?a=1&b=2\"",
      "Kids & Co",
    );
    expect(send.mock.calls[0][0].html).toContain("&lt;Sara&gt;");
    expect(send.mock.calls[0][0].html).toContain("Kids &amp; Co");
    expect(send.mock.calls[0][0].html).toContain("a=1&amp;b=2&quot;");

    await sendNotificationEmail({
      to: "parent@example.test",
      recipientName: "Sara <Admin>",
      organizationName: "Kids & Co",
      title: "<Important>",
      message: "A & B",
    });
    expect(send.mock.calls[1][0].html).toContain("Sara &lt;Admin&gt;");
    expect(send.mock.calls[1][0].html).toContain("&lt;Important&gt;");
    expect(send.mock.calls[1][0].html).toContain("A &amp; B");
  });

  it("surfaces provider failures and nullable provider results", async () => {
    vi.stubEnv("RESEND_API_KEY", "resend-key");
    send.mockResolvedValueOnce({ data: null, error: { message: "rejected" } });
    await expect(
      sendEmail("parent@example.test", "Subject", "<p>Hello</p>"),
    ).rejects.toThrow("Email delivery failed: rejected");
    send.mockResolvedValueOnce({ data: null, error: null });
    await expect(
      sendEmail("parent@example.test", "Subject", "<p>Hello</p>"),
    ).resolves.toBeNull();
  });
});
