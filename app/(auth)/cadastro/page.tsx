import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CadastroForm } from "./cadastro-form";

export const metadata = { title: "Cadastro" };

export default function CadastroPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Criar conta</CardTitle>
        <CardDescription>Leva menos de um minuto.</CardDescription>
      </CardHeader>
      <CardContent>
        <CadastroForm />
      </CardContent>
      <CardFooter className="justify-center text-sm text-muted-foreground">
        Já tem conta?{" "}
        <Link href="/login" className="ml-1 font-medium text-foreground hover:underline">
          Entrar
        </Link>
      </CardFooter>
    </Card>
  );
}
