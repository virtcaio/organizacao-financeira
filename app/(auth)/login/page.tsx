import { Suspense } from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { LoginForm } from "./login-form";

export const metadata = { title: "Entrar" };

export default function LoginPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Entrar</CardTitle>
        <CardDescription>Acesse sua conta para gerenciar suas finanças.</CardDescription>
      </CardHeader>
      <CardContent>
        <Suspense fallback={<LoginFormSkeleton />}>
          <LoginForm />
        </Suspense>
      </CardContent>
      <CardFooter className="justify-center text-sm text-muted-foreground">
        Não tem conta?{" "}
        <Link href="/cadastro" className="ml-1 font-medium text-foreground hover:underline">
          Cadastre-se
        </Link>
      </CardFooter>
    </Card>
  );
}

function LoginFormSkeleton() {
  return (
    <div className="grid gap-4">
      <div className="h-9 rounded-md bg-muted/50" />
      <div className="h-9 rounded-md bg-muted/50" />
      <div className="h-9 rounded-md bg-muted" />
    </div>
  );
}
