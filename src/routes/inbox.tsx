import { createFileRoute, useSearch } from "@tanstack/react-router";
import { z } from "zod";
import { InboxPage } from "@/components/inbox/InboxPage";

export const Route = createFileRoute("/inbox")({
  validateSearch: z.object({ q: z.string().optional() }).parse,
  head: () => ({
    meta: [
      { title: "Inbox — MailMind AI" },
      { name: "description", content: "Inbox unifiée avec fiche d'analyse IA en temps réel." },
    ],
  }),
  component: InboxRoute,
});

function InboxRoute() {
  const search = useSearch({ from: "/inbox" });
  return <InboxPage initialQuery={search.q} />;
}
