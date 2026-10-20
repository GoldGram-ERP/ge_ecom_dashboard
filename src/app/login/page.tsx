import { T } from "@/components/t";
import type { Metadata } from "next";
import Image from "next/image";
import { redirect } from "next/navigation";
import { Toast } from "@/components/toast";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { hasAdminSession } from "@/lib/api-server";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in · GoldGram Admin" };

// The brand on the navy gradient, then one card with the form.
export default async function LoginPage() {
  // Already signed in: there is nothing to do here.
  if (await hasAdminSession()) redirect("/");

  return (
    <div className="grid min-h-svh place-items-center bg-linear-to-br from-primary to-navy-deep p-4">
      <main className="grid w-full max-w-sm gap-6">
        <div className="flex items-center justify-center gap-3">
          <Image src="/logo.png" alt="" width={121} height={72} unoptimized priority className="h-9 w-auto" />
          <span className="font-heading text-2xl text-gold-light"><T>GoldGram</T></span>
          <span className="text-[10px] font-medium tracking-[0.2em] text-white/60 uppercase"><T>Admin</T></span>
        </div>
        <Card className="shadow-2xl">
          <CardHeader>
            <h1 className="font-heading text-xl font-medium"><T>Sign in</T></h1>
            <CardDescription><T>For GoldGram administrators. Customers sign in on the shop.</T></CardDescription>
          </CardHeader>
          <CardContent>
            <LoginForm />
          </CardContent>
        </Card>
      </main>
      <Toast />
    </div>
  );
}
