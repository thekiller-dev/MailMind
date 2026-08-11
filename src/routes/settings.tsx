import { createFileRoute, useSearch } from "@tanstack/react-router";
import { z } from "zod";
import { SettingsPage } from "@/components/settings/SettingsPage";

export const Route = createFileRoute("/settings")({
  validateSearch: z
    .object({
      gmail: z.string().optional(),
      billing: z.enum(["success", "cancel"]).optional(),
    })
    .parse,
  head: () => ({
    meta: [
      { title: "Paramètres — MailMind AI" },
      { name: "description", content: "Gérez vos comptes, préférences IA, listes et exports." },
    ],
  }),
  component: SettingsRoute,
});

function SettingsRoute() {
  const search = useSearch({ from: "/settings" });
  return <SettingsPage gmailStatus={search.gmail} />;
}
