import { describe, it, expect, vi } from "vitest";
import { sendMail } from "../src/server/services/mail";
type MailEnv = Parameters<typeof sendMail>[0];
function environment() {
  const send = vi
    .fn<
      (message: EmailMessage | EmailMessageBuilder) => Promise<EmailSendResult>
    >()
    .mockResolvedValue({ messageId: "test-message" });
  const env: MailEnv = {
    APP_URL: "https://app.example.test",
    MAIL_PROVIDER: "cloudflare",
    MAIL_FROM: "sender@example.test",
    EMAIL: { send },
  };
  return { env, send };
}
describe("Cloudflare Email Sending adapter", () => {
  it("delivers a transactional message using the configured native binding and sender", async () => {
    const { env, send } = environment();
    await sendMail(
      env,
      "recipient@example.test",
      "Acceso de prueba",
      "Mensaje de prueba",
    );
    expect(send).toHaveBeenCalledExactlyOnceWith({
      from: "sender@example.test",
      to: "recipient@example.test",
      subject: "Acceso de prueba",
      text: "Mensaje de prueba",
    });
  });
  it("rejects a missing binding without falling back to another provider", async () => {
    const { env, send } = environment();
    delete env.EMAIL;
    env.RESEND_API_KEY = "test-only-unused-key";
    await expect(
      sendMail(env, "recipient@example.test", "Prueba", "Prueba"),
    ).rejects.toThrow("binding or MAIL_FROM");
    expect(send).not.toHaveBeenCalled();
  });
  it("rejects a missing sender before attempting delivery", async () => {
    const { env, send } = environment();
    delete env.MAIL_FROM;
    await expect(
      sendMail(env, "recipient@example.test", "Prueba", "Prueba"),
    ).rejects.toThrow("binding or MAIL_FROM");
    expect(send).not.toHaveBeenCalled();
  });
  it("propagates native delivery errors to the calling authentication flow", async () => {
    const { env, send } = environment();
    send.mockRejectedValueOnce(new Error("Delivery rejected"));
    await expect(
      sendMail(env, "recipient@example.test", "Prueba", "Prueba"),
    ).rejects.toThrow("Delivery rejected");
  });
});
