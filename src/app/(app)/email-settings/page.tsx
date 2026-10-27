import { T } from "@/components/t";
import { Intro } from "@/components/parts";
import { serverGet } from "@/lib/api-server";
import { type EmailSettings, EmailScreen } from "./email-screen";

export default async function EmailSettingsPage() {
  const settings = await serverGet<EmailSettings>("/admin/email-settings");
  return (
    <>
      <Intro>
        <T>The mail server the store sends its emails through, and how those emails look.</T>
      </Intro>
      <EmailScreen settings={settings} />
    </>
  );
}
