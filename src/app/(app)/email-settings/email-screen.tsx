"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/animate-ui/components/buttons/button";
import { Note, SelectField, TextField } from "@/components/parts";
import { Switch } from "@/components/switch";
import { T, useT } from "@/components/t";
import { toast } from "@/components/toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api, errorMessage } from "@/lib/api";
import { usePermissions } from "@/lib/permissions";
import { useSend } from "@/lib/use-send";

export interface EmailSettings {
  enabled: boolean;
  host: string;
  port: number;
  secure: boolean;
  username: string;
  fromName: string;
  fromEmail: string;
  hasPassword: boolean;
}

const LABELS = { host: "Host", port: "Port", username: "Username", fromName: "From name", fromEmail: "From email" };

// Known SMTP providers: picking one fills the host, port and TLS. "Custom" leaves the host free.
const CUSTOM = "custom";
const PROVIDERS: { id: string; label: string; host: string; port: number; secure: boolean }[] = [
  { id: "microsoft", label: "Microsoft 365 / Outlook", host: "smtp.office365.com", port: 587, secure: false },
  { id: "gmail", label: "Gmail / Google Workspace", host: "smtp.gmail.com", port: 587, secure: false },
  { id: "yahoo", label: "Yahoo", host: "smtp.mail.yahoo.com", port: 465, secure: true },
  { id: "zoho", label: "Zoho Mail", host: "smtp.zoho.com", port: 465, secure: true },
  { id: "sendgrid", label: "SendGrid", host: "smtp.sendgrid.net", port: 587, secure: false },
  { id: "mailgun", label: "Mailgun", host: "smtp.mailgun.org", port: 587, secure: false },
  { id: "brevo", label: "Brevo (Sendinblue)", host: "smtp-relay.brevo.com", port: 587, secure: false },
];

export function EmailScreen({ settings }: { settings: EmailSettings }) {
  const t = useT();
  const { can } = usePermissions();
  const editable = can("settings:edit");
  const { busy, send } = useSend();
  const [form, setForm] = useState(settings);
  const [password, setPassword] = useState("");
  const set = <K extends keyof EmailSettings>(key: K, value: EmailSettings[K]) => setForm((f) => ({ ...f, [key]: value }));

  // The provider shown follows the host: a known host selects its provider, anything else is "Custom".
  const provider = PROVIDERS.find((p) => p.host === form.host)?.id ?? CUSTOM;
  function chooseProvider(id: string) {
    const picked = PROVIDERS.find((p) => p.id === id);
    // A known provider fills host, port and TLS; "Custom" leaves them for manual entry.
    if (picked) setForm((f) => ({ ...f, host: picked.host, port: picked.port, secure: picked.secure }));
  }

  async function save() {
    // Send only the fields the backend accepts — the GET also returns view-only fields
    // (hasPassword, updatedAt) that its validator rejects. A blank password is left out so the
    // backend keeps the stored one.
    const ok = await send(
      "PUT",
      "/admin/email-settings",
      {
        enabled: form.enabled,
        host: form.host,
        port: form.port,
        secure: form.secure,
        username: form.username,
        fromName: form.fromName,
        fromEmail: form.fromEmail,
        ...(password ? { password } : {}),
      },
      { done: "Email settings saved", labels: LABELS },
    );
    if (ok) setPassword("");
  }

  const [to, setTo] = useState("");
  const [testing, setTesting] = useState(false);
  async function sendTest() {
    setTesting(true);
    try {
      await api("/admin/email-settings/test", { method: "POST", body: { to } });
      toast("Test email sent");
    } catch (error) {
      toast(errorMessage(error, LABELS));
    }
    setTesting(false);
  }

  const [locale, setLocale] = useState<"en" | "ar">("en");
  const [html, setHtml] = useState<string | null>(null);
  useEffect(() => {
    let current = true;
    setHtml(null);
    api<{ html: string }>(`/admin/email-settings/preview?locale=${locale}`)
      .then((r) => current && setHtml(r.html))
      .catch((error) => current && toast(errorMessage(error)));
    return () => {
      current = false;
    };
  }, [locale]);

  return (
    <div className="grid max-w-3xl gap-5">
      <Card>
        <CardHeader>
          <CardTitle className="font-heading text-lg"><T>SMTP server</T></CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <span className="font-medium"><T>Send emails</T></span>
              <Note><T>While off, the store sends no email.</T></Note>
            </div>
            <Switch on={form.enabled} label="Send emails" locked={!editable} onToggle={() => set("enabled", !form.enabled)} />
          </div>
          <SelectField
            label={t("Provider")}
            value={provider}
            disabled={!editable}
            onChange={(e) => chooseProvider(e.target.value)}
          >
            <option value={CUSTOM}>{t("Custom (enter host below)")}</option>
            {PROVIDERS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
              </option>
            ))}
          </SelectField>
          <div className="grid gap-4 sm:grid-cols-2">
            <TextField label={t("Host")} value={form.host} disabled={!editable} onChange={(e) => set("host", e.target.value)} />
            <TextField label={t("Port")} type="number" min={1} max={65535} value={form.port} disabled={!editable} onChange={(e) => set("port", Number(e.target.value))} />
            <TextField label={t("Username")} value={form.username} disabled={!editable} autoComplete="off" onChange={(e) => set("username", e.target.value)} />
            <TextField
              label={t("Password")}
              type="password"
              value={password}
              disabled={!editable}
              autoComplete="new-password"
              placeholder={form.hasPassword ? t("Leave blank to keep the current password") : ""}
              onChange={(e) => setPassword(e.target.value)}
            />
            <TextField label={t("From name")} value={form.fromName} disabled={!editable} onChange={(e) => set("fromName", e.target.value)} />
            <TextField label={t("From email")} type="email" value={form.fromEmail} disabled={!editable} onChange={(e) => set("fromEmail", e.target.value)} />
          </div>
          <div className="flex items-center justify-between gap-4">
            <div>
              <span className="font-medium"><T>Use TLS</T></span>
              <Note><T>On for port 465. Off uses STARTTLS (usually port 587).</T></Note>
            </div>
            <Switch on={form.secure} label="Use TLS" locked={!editable} onToggle={() => set("secure", !form.secure)} />
          </div>
          {editable ? (
            <div>
              <Button onClick={save} disabled={busy}><T>Save</T></Button>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {editable ? (
        <Card>
          <CardHeader>
            <CardTitle className="font-heading text-lg"><T>Send a test email</T></CardTitle>
          </CardHeader>
          <CardContent className="flex items-end gap-3">
            <TextField className="flex-1" label={t("Send to")} type="email" value={to} onChange={(e) => setTo(e.target.value)} />
            <Button onClick={sendTest} disabled={testing || to.trim() === ""}><T>Send test</T></Button>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle className="font-heading text-lg"><T>Email template preview</T></CardTitle>
          <div className="flex gap-2">
            {(["en", "ar"] as const).map((l) => (
              <Button key={l} size="sm" variant={locale === l ? "default" : "outline"} onClick={() => setLocale(l)}>
                {l === "en" ? "EN" : "AR"}
              </Button>
            ))}
          </div>
        </CardHeader>
        <CardContent>
          {/* Sandboxed with no permissions: the preview is markup only. */}
          <iframe title={t("Email template preview")} sandbox="" srcDoc={html ?? ""} className="h-[600px] w-full rounded-md border bg-white" />
        </CardContent>
      </Card>
    </div>
  );
}
