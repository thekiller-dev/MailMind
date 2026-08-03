import { createFileRoute } from "@tanstack/react-router";
import { LandingPage } from "@/components/landing/LandingPage";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "MailMind — Assistant intelligent pour Gmail" },
      {
        name: "description",
        content:
          "MailMind est un assistant intelligent pour Gmail qui résume les e-mails, classe les messages, détecte les risques et extrait les actions à traiter.",
      },
      { property: "og:title", content: "MailMind — Assistant intelligent pour Gmail" },
      {
        property: "og:description",
        content: "Filtrez le bruit. Identifiez les menaces. Extrayez les actions.",
      },
    ],
  }),
  component: LandingPage,
});
