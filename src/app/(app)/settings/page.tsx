import { T } from "@/components/t";
import { Intro } from "@/components/parts";
import { serverGet } from "@/lib/api-server";
import type { Settings } from "@/lib/types";
import { SettingsList } from "./settings-list";

// The file's V.settings (AC-28).
export default async function SettingsPage() {
  const settings = await serverGet<Settings>("/admin/settings");
  return (
    <>
      <Intro>
        <T>Store switches take effect immediately, for every customer.</T>
      </Intro>
      <SettingsList settings={settings} />
    </>
  );
}
