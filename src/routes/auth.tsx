import { createFileRoute } from "@tanstack/react-router";
import { AuthPage } from "@/components/auth/AuthPage";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Connexion — MailMind" },
      { name: "description", content: "Créez votre compte ou connectez-vous à MailMind." },
    ],
  }),
  component: AuthPage,
});
