"use client";

import { T } from "@/components/t";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { type ReactNode, useState } from "react";
import {
  BadgePercent,
  Coins,
  Factory,
  Globe,
  CircleHelp,
  Languages,
  Layers,
  LayoutDashboard,
  LogOut,
  type LucideIcon,
  Mail,
  MapPinned,
  Newspaper,
  Package,
  HandCoins,
  ReceiptText,
  ScrollText,
  Settings,
  Shapes,
  ShieldCheck,
  Undo2,
  Users,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/animate-ui/components/buttons/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/animate-ui/components/radix/dropdown-menu";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/animate-ui/components/radix/sidebar";
import { Badge } from "@/components/ui/badge";
import { api, ApiError, errorMessage } from "@/lib/api";
import { usePermissions } from "@/lib/permissions";
import { cn } from "@/lib/utils";
import { Toast, toast } from "./toast";

// [group EN, group AR, [[route, label EN, label AR, icon, screen]]]. "Local" holds the outbox, the
// local stand-in for email.
const NAV: [string, string, [string, string, string, LucideIcon, string][]][] = [
  ["Overview", "نظرة عامة", [["/", "Dashboard", "لوحة التحكم", LayoutDashboard, "dashboard"]]],
  ["Pricing", "الأسعار", [["/prices", "Gold & silver prices", "أسعار الذهب والفضة", Coins, "prices"]]],
  [
    "Orders",
    "الطلبات",
    [
      ["/orders", "Orders", "الطلبات", ReceiptText, "orders"],
      ["/sell-requests", "Sell requests", "طلبات البيع", HandCoins, "sell_requests"],
    ],
  ],
  ["Customers", "العملاء", [["/customers", "Customer management", "إدارة العملاء", Users, "customers"]]],
  [
    "Product management",
    "المنتجات",
    [
      ["/catalog/categories", "Categories", "الفئات", Shapes, "categories"],
      ["/catalog/types", "Product types", "أنواع المنتجات", Layers, "product_types"],
      ["/catalog/manufacturers", "Manufacturers", "المصنّعون", Factory, "manufacturers"],
      ["/catalog/products", "Products", "المنتجات", Package, "products"],
      ["/cashback", "Cashback policies", "سياسات الاسترداد", Undo2, "cashback"],
      ["/discount-rules", "Discount rules", "قواعد الخصم", BadgePercent, "discount_rules"],
    ],
  ],
  ["User management", "المستخدمون", [["/admins", "Administrators & roles", "المشرفون", ShieldCheck, "admins"]]],
  ["Payments", "المدفوعات", [["/payment-methods", "Payment methods", "طرق الدفع", Wallet, "payment_methods"]]],
  ["Geography", "الجغرافيا", [["/geography", "Zones & branches", "المناطق والفروع", MapPinned, "geography"]]],
  [
    "Settings",
    "الإعدادات",
    [
      ["/settings", "System settings", "إعدادات النظام", Settings, "settings"],
      ["/email-settings", "Email", "البريد الإلكتروني", Mail, "settings"],
      ["/site-texts", "Website texts", "نصوص الموقع", Languages, "site_texts"],
      ["/articles", "Articles", "المقالات", Newspaper, "articles"],
      ["/faq", "FAQ", "الأسئلة الشائعة", CircleHelp, "faq"],
    ],
  ],
  ["System", "النظام", [["/logs", "System logs", "سجلات النظام", ScrollText, "logs"]]],
];

// Screens that are not a sidebar item.
const INNER: [RegExp, string, string][] = [
  [/^\/discount-rules\/new$/, "New discount rule", "قاعدة خصم جديدة"],
  [/^\/discount-rules\/[^/]+$/, "Discount rule", "قاعدة الخصم"],
  [/^\/customers\/[^/]+$/, "Customer", "العميل"],
  [/^\/orders\/[^/]+$/, "Order", "الطلب"],
  [/^\/logs\/[^/]+\/[^/]+$/, "Log entry", "سجل"],
];

function isCurrent(route: string, pathname: string): boolean {
  return route === "/" ? pathname === "/" : pathname === route || pathname.startsWith(`${route}/`);
}

const MARKET = {
  open: ["Market open", "السوق مفتوح", "bg-success"],
  paused: ["Trading paused", "التداول متوقف", "bg-warning"],
  closed: ["Store closed", "المتجر مغلق", "bg-destructive"],
} as const;

function Navigation({ ar, pathname }: { ar: boolean; pathname: string }) {
  const { setOpenMobile } = useSidebar();
  const { can } = usePermissions();
  return (
    <Sidebar
      // "left" is the start side: the component flips itself in a right-to-left page.
      side="left"
      // Depth from a gradient, not a flat fill: lighter navy at the top, the deep navy at the foot.
      className="border-none **:data-[sidebar=sidebar]:bg-linear-to-b **:data-[sidebar=sidebar]:from-[#172C5E] **:data-[sidebar=sidebar]:to-navy-deep"
    >
      <SidebarHeader className="px-4 pt-5 pb-2">
        <Link href="/" className="flex items-center gap-2.5 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring" onClick={() => setOpenMobile(false)}>
          <Image src="/logo.png" alt="" width={121} height={72} unoptimized priority className="h-7 w-auto" />
          <span className="font-heading text-xl text-gold-light"><T>GoldGram</T></span>
          <span className="ms-auto text-[10px] font-medium tracking-[0.2em] text-sidebar-foreground/60 uppercase"><T>Admin</T></span>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <nav aria-label={ar ? "الأقسام" : "Sections"} className="pb-6">
          {NAV.map(([groupEn, groupAr, all]) => {
            // An item shows only with `view` on its screen; a group with no item is hidden.
            const items = all.filter(([, , , , screen]) => can(`${screen}:view`));
            if (items.length === 0) return null;
            return (
            <SidebarGroup key={groupEn} className="py-1">
              <SidebarGroupLabel className="text-[10px] font-medium tracking-[0.18em] text-sidebar-foreground/55 uppercase">
                {ar ? groupAr : groupEn}
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {items.map(([route, en, arabic, Icon]) => {
                    const active = isCurrent(route, pathname);
                    return (
                      <SidebarMenuItem key={route}>
                        <SidebarMenuButton asChild isActive={active} className="h-9">
                          <Link href={route} aria-current={active ? "page" : undefined} onClick={() => setOpenMobile(false)}>
                            <Icon className={active ? "text-gold" : undefined} />
                            <span>{ar ? arabic : en}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
            );
          })}
        </nav>
      </SidebarContent>
    </Sidebar>
  );
}

export function Shell({
  ar,
  name,
  email,
  initials,
  market,
  children,
}: {
  ar: boolean;
  name: string;
  email: string;
  initials: string;
  /** What the shop is doing now; null when it could not be loaded. */
  market: "open" | "paused" | "closed" | null;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);

  const inner = INNER.find(([test]) => test.test(pathname));
  const item = NAV.flatMap((group) => group[2]).find(([route]) => isCurrent(route, pathname));
  const title = inner ? (ar ? inner[2] : inner[1]) : item ? (ar ? item[2] : item[1]) : "";

  function switchLanguage() {
    document.cookie = `gg_lang=${ar ? "en" : "ar"}; path=/; max-age=31536000; samesite=lax`;
    router.refresh();
  }

  async function signOut() {
    setSigningOut(true);
    try {
      await api("/admin/auth/logout", { method: "POST" });
    } catch (error) {
      // A session that is already gone is as signed out as it gets.
      if (!(error instanceof ApiError && error.status === 401)) {
        toast(errorMessage(error));
        setSigningOut(false);
        return;
      }
    }
    router.replace("/login");
    router.refresh();
  }

  return (
    <SidebarProvider>
      <Navigation ar={ar} pathname={pathname} />
      <SidebarInset className="min-w-0 bg-background">
        {/* Translucent, so the page scrolls under it instead of being cut by a hard bar. */}
        <header className="sticky top-0 z-20 flex min-h-16 flex-wrap items-center gap-x-3 gap-y-1 border-b bg-background/80 px-4 py-2.5 backdrop-blur-md supports-[backdrop-filter]:bg-background/70 md:flex-nowrap md:px-8 md:py-0">
          <SidebarTrigger aria-label="Menu" className="size-9 shrink-0" />
          <h1 className="order-last basis-full text-xl md:order-none md:min-w-0 md:flex-1 md:basis-auto md:truncate md:text-2xl">{title}</h1>
          <span className="flex-1 md:hidden" />
          {market ? (
            <Badge variant="outline" className="h-8 shrink-0 gap-2 bg-card px-3 text-xs font-medium">
              <span aria-hidden="true" className={cn("size-2 rounded-full", MARKET[market][2])} />
              <span>{MARKET[market][ar ? 1 : 0]}</span>
            </Badge>
          ) : null}
          <Button variant="outline" size="sm" className="shrink-0 rounded-full" onClick={switchLanguage} aria-label={ar ? "Switch to English" : "التبديل إلى العربية"}>
            <Globe />
            <span><T>{ar ? "EN" : "ع"}</T></span>
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="shrink-0 rounded-full border-gold/60 font-heading text-sm text-gold-deep"
                aria-label={`Account: ${name}`}
              >
                {initials}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-56">
              <DropdownMenuLabel className="grid gap-0.5">
                <span className="font-medium">{name}</span>
                {email && email !== name ? <span className="text-xs font-normal text-muted-foreground">{email}</span> : null}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" disabled={signingOut} onSelect={signOut}>
                <LogOut />
                <T>Sign out</T>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>
        {/* SidebarInset is the page's <main>; a second one would be a duplicate landmark. */}
        <div id="main" className="grid min-w-0 gap-5 p-4 md:p-8">{children}</div>
      </SidebarInset>
      <Toast />
    </SidebarProvider>
  );
}
