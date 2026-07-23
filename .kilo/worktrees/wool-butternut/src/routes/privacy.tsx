import { createFileRoute } from "@tanstack/react-router";
import { LegalPage, type LegalSection } from "@/components/LegalPage";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy — MailMind AI" },
      { name: "description", content: "Politique de confidentialité de MailMind AI." },
    ],
  }),
  component: Privacy,
});

const sections: LegalSection[] = [
  {
    title: "Qui sommes-nous ?",
    paragraphs: [
      "MailMind est un service d'assistance intelligente à la messagerie. Le responsable du traitement et ses coordonnées doivent être renseignés avant publication : [nom légal de l'entité], [forme sociale], [adresse], [pays] et [numéro d'immatriculation].",
      "Pour toute question relative à la confidentialité, contactez privacy@mailmind.ai.",
    ],
  },
  {
    title: "Les informations que nous collectons",
    bullets: [
      "Informations de compte et d'authentification.",
      "Informations du compte Gmail connecté et autorisations OAuth accordées.",
      "Messages et métadonnées nécessaires à la synchronisation et aux fonctionnalités activées.",
      "Résultats produits par l'analyse : résumés, catégories, risques, entités et préférences.",
      "Informations techniques, journaux d'erreurs et données de sécurité nécessaires au fonctionnement du service.",
    ],
  },
  {
    title: "Comment nous utilisons vos données",
    paragraphs: [
      "Nous utilisons ces données pour fournir MailMind, synchroniser votre compte Gmail, analyser les messages selon vos réglages, exécuter les actions que vous demandez, sécuriser le service et répondre à vos demandes.",
      "Nous ne vendons pas le contenu de vos e-mails. Nous ne devons pas présenter un fournisseur d'IA comme n'accédant jamais aux données sans vérifier le modèle, le contrat et la configuration effectivement utilisés.",
    ],
  },
  {
    title: "Connexion Google et contrôle du compte",
    paragraphs: [
      "La connexion Gmail passe par OAuth 2.0. MailMind ne connaît pas votre mot de passe Google. Vous pouvez consulter ou révoquer l'accès accordé à MailMind depuis les paramètres de votre compte Google, puis déconnecter le compte dans l'application.",
    ],
  },
  {
    title: "Partage et fournisseurs",
    paragraphs: [
      "Nous partageons les données uniquement avec les fournisseurs nécessaires au fonctionnement du service, avec les personnes autorisées au sein de notre organisation, ou lorsque la loi l'impose. Les fournisseurs doivent être documentés dans la liste des sous-traitants et encadrés par des engagements appropriés.",
    ],
  },
  {
    title: "Vos choix et vos droits",
    paragraphs: [
      "Vous pouvez gérer vos comptes connectés, vos préférences de traitement, vos listes d'expéditeurs et vos exports depuis MailMind. Vous pouvez également demander l'accès, la rectification, la suppression ou la limitation du traitement à privacy@mailmind.ai.",
    ],
  },
  {
    title: "Conservation et sécurité",
    paragraphs: [
      "Nous conservons les données aussi longtemps que nécessaire aux finalités décrites dans cette politique, puis les supprimons ou les anonymisons selon les règles applicables. Les tokens Gmail sont chiffrés côté serveur et l'accès aux données est limité par des contrôles applicatifs et des politiques de base de données.",
    ],
  },
  {
    title: "Modifications et contact",
    paragraphs: [
      "Nous pouvons mettre à jour cette politique pour refléter une évolution du service, de la loi ou de nos fournisseurs. La date de mise à jour affichée en haut de cette page indique la version en vigueur.",
      "Contact : privacy@mailmind.ai. Identité du délégué à la protection des données, si applicable : [coordonnées à compléter].",
    ],
  },
];

function Privacy() {
  return (
    <LegalPage
      eyebrow="Privacy"
      title="Votre messagerie reste votre donnée."
      description="Notre politique de confidentialité explique quelles données MailMind utilise, pourquoi et quels contrôles vous gardez."
      sections={sections}
      notice="Les éléments entre crochets doivent être remplacés par les informations exactes de l'entité qui exploite MailMind. Cette politique doit être validée juridiquement avant mise en production."
    />
  );
}
