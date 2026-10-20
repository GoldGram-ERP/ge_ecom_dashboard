"use client";

import { T } from "@/components/t";
import { useRouter } from "next/navigation";
import { type FormEvent, useState } from "react";
import { Button } from "@/components/animate-ui/components/buttons/button";
import { TextField } from "@/components/parts";
import { toast } from "@/components/toast";
import { api, errorMessage } from "@/lib/api";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [failure, setFailure] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    if (email.trim() === "" || password === "") {
      setFailure("Enter your email and your password.");
      return;
    }

    setFailure("");
    setPending(true);
    try {
      await api("/admin/auth/login", { method: "POST", body: { email: email.trim(), password } });
    } catch (error) {
      // INVALID_CREDENTIALS, 429, VALIDATION_FAILED or no answer at all.
      const reason = errorMessage(error, { email: "Email", password: "Password" });
      setFailure(reason);
      toast(reason);
      setPending(false);
      return;
    }
    // The button stays disabled until the dashboard replaces this page.
    router.replace("/");
    router.refresh();
  }

  return (
    // method="post" so a submit before the script loads can never put the password in the URL.
    <form method="post" onSubmit={submit} noValidate className="grid gap-4">
      <TextField
        label="Email"
        name="email"
        type="email"
        autoComplete="username"
        autoCapitalize="none"
        spellCheck={false}
        maxLength={254}
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        aria-invalid={failure ? true : undefined}
        aria-describedby={failure ? "login-error" : undefined}
      />
      <TextField
        label="Password"
        name="password"
        type="password"
        autoComplete="current-password"
        maxLength={128}
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        aria-invalid={failure ? true : undefined}
        aria-describedby={failure ? "login-error" : undefined}
      />
      {/* Always in the page, so a screen reader announces the message when it arrives. */}
      <div role="alert">
        {failure ? (
          <p id="login-error" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {failure}
          </p>
        ) : null}
      </div>
      <Button type="submit" variant="gold" disabled={pending} className="w-full">
        <T>{pending ? "Signing in…" : "Sign in"}</T>
      </Button>
    </form>
  );
}
