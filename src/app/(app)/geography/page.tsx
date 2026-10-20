import { T } from "@/components/t";
import { Intro, LinkTabs } from "@/components/parts";
import { isArabic, serverGet, serverList } from "@/lib/api-server";
import { buildHref, firstParam } from "@/lib/query";
import type { Branch, DeliveryMethod, Settings, Zone } from "@/lib/types";
import { Branches } from "./branches";
import { DeliveryMethods } from "./delivery-methods";
import { Zones } from "./zones";

const TABS: [string, string][] = [
  ["zones", "Shipping zones"],
  ["delivery-methods", "Delivery methods"],
  ["branches", "Branches"],
];

// The file's V.geo (AC-28). `?tab=` is its S.gg, `?f=` the card filter.
export default async function GeographyPage(props: PageProps<"/geography">) {
  const raw = await props.searchParams;
  const wanted = firstParam(raw.tab);
  const tab = TABS.some(([key]) => key === wanted) ? wanted : "zones";
  const f = firstParam(raw.f);
  const filter = f === "active" || f === "inactive" ? f : "all";
  const ar = await isArabic();

  let table;
  if (tab === "zones") {
    const items = await serverList<Zone>("/admin/geo/zones");
    table = <Zones items={items} filter={filter} ar={ar} />;
  } else if (tab === "delivery-methods") {
    const [items, zones, settings] = await Promise.all([
      serverList<DeliveryMethod>("/admin/geo/delivery-methods"),
      serverList<Zone>("/admin/geo/zones"),
      serverGet<Settings>("/admin/settings"),
    ]);
    table = (
      <DeliveryMethods
        items={items}
        zones={zones}
        daysVisible={settings.deliveryDaysVisible}
        filter={filter}
        ar={ar}
      />
    );
  } else {
    const items = await serverList<Branch>("/admin/geo/branches");
    table = <Branches items={items} filter={filter} ar={ar} />;
  }

  return (
    <>
      <Intro>
        <T>Hierarchy: country, state, city. Shipping cost comes from the state&apos;s zone; pickup is
        always free.</T>
      </Intro>
      <LinkTabs
        current={tab}
        items={TABS.map(([key, label]) => ({
          key,
          label,
          href: buildHref("/geography", { tab: key === "zones" ? "" : key }),
        }))}
      />
      {table}
    </>
  );
}
