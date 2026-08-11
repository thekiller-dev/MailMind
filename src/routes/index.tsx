import { createFileRoute } from "@tanstack/react-router";
import { LandingPage } from "@/components/landing/LandingPage";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "MailMind — Assistant intelligent pour Gmail" },
      {
        name: "description",
        content:
          "MailMind résume, classe et sécurise vos e-mails Gmail. Détection phishing, actions à traiter, alertes — démarrez gratuitement.",
      },
      { property: "og:title", content: "MailMind — Assistant intelligent pour Gmail" },
      {
        property: "og:description",
        content:
          "Filtrez le bruit, détectez les menaces et extrayez les actions. Assistant Gmail avec IA.",
      },
      { property: "og:url", content: "https://www.mailmind.me/" },
      { name: "robots", content: "index,follow" },
    ],
  }),
  component: LandingPage,
});
