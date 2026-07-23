import { createFileRoute } from "@tanstack/react-router";
import { LegalPage, type LegalSection } from "@/components/LegalPage";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms — MailMind AI" },
      {
        name: "description",
        content: "Conditions générales d'utilisation du service MailMind AI.",
      },
    ],
  }),
  component: Terms,
});

const sections: LegalSection[] = [
  {
    title: "Objet et acceptation",
    paragraphs: [
      "Les présentes conditions encadrent l'accès et l'utilisation de MailMind, service d'assistance à la messagerie qui permet de connecter un compte Gmail, de synchroniser des messages, de les analyser et d'exécuter certaines actions à la demande de l'utilisateur.",
      "En créant un compte ou en utilisant le service, vous acceptez ces conditions. Si vous utilisez MailMind pour une organisation, vous confirmez disposer de l'autorité nécessaire pour l'engager.",
    ],
  },
  {
    title: "Compte et accès Gmail",
    bullets: [
      "Vous fournissez des informations exactes et maintenez vos identifiants de compte confidentiels.",
      "Vous êtes responsable des autorisations accordées à MailMind et de leur révocation lorsque nécessaire.",
      "Vous ne devez pas connecter un compte ou traiter des données sans l'autorisation requise.",
      "Nous pouvons suspendre un compte en cas d'abus, de risque de sécurité ou de violation des présentes conditions.",
    ],
  },
  {
    title: "Fonctionnalités et limites de l'IA",
    paragraphs: [
      "MailMind fournit des résumés, classifications, extractions et scores destinés à vous aider. Ces résultats peuvent être incomplets, inexacts ou mal interpréter un message. Ils ne constituent pas un avis juridique, financier, médical, de sécurité ou professionnel.",
      "Vous devez vérifier les résultats avant de prendre une décision importante, d'envoyer une réponse ou d'exécuter une action dans Gmail.",
    ],
  },
  {
    title: "Actions exécutées dans Gmail",
    paragraphs: [
      "Lorsque vous demandez à MailMind d'archiver, de signaler ou d'envoyer une réponse, l'action est transmise à Gmail avec les autorisations accordées. Vous êtes responsable du contenu de vos réponses et de la vérification du destinataire avant envoi.",
    ],
  },
  {
    title: "Usage acceptable",
    bullets: [
      "Ne pas utiliser le service pour contourner une mesure de sécurité, sonder une infrastructure ou accéder à des données tierces.",
      "Ne pas envoyer de contenu illégal, malveillant, frauduleux ou portant atteinte aux droits d'autrui.",
      "Ne pas utiliser l'automatisation pour envoyer des campagnes non sollicitées ou du spam.",
      "Ne pas tenter de perturber le service, d'extraire ses secrets ou de contourner ses limites techniques.",
    ],
  },
  {
    title: "Disponibilité, tarifs et résiliation",
    paragraphs: [
      "Nous cherchons à maintenir le service disponible, sans garantir une disponibilité ininterrompue. Les fonctionnalités peuvent évoluer, être limitées par Gmail ou dépendre de fournisseurs tiers.",
      "Les tarifs, limites, taxes, modalités de renouvellement et de remboursement applicables doivent être indiqués sur la page de commande ou dans le contrat souscrit. Vous pouvez cesser d'utiliser le service et demander la suppression de votre compte selon la procédure prévue.",
    ],
  },
  {
    title: "Propriété intellectuelle",
    paragraphs: [
      "MailMind, son logiciel, sa marque, son interface et ses contenus restent la propriété de [nom légal de l'entité] ou de ses concédants. Vous conservez vos droits sur vos données et nous accordez uniquement les droits nécessaires à la fourniture du service.",
    ],
  },
  {
    title: "Responsabilité et droit applicable",
    paragraphs: [
      "Dans la limite permise par la loi, MailMind n'est pas responsable des dommages résultant d'une mauvaise interprétation d'une analyse IA, d'une action Gmail validée par l'utilisateur, d'une interruption d'un fournisseur tiers ou d'une utilisation non conforme du service.",
      "Le droit applicable, la juridiction compétente et les coordonnées de l'entité contractante doivent être complétés avant publication : [à compléter]. Les limitations de responsabilité ne s'appliquent pas lorsque la loi les interdit.",
    ],
  },
];

function Terms() {
  return (
    <LegalPage
      eyebrow="Terms"
      title="Les règles d'un service responsable."
      description="Les conditions qui définissent l'utilisation de MailMind, vos responsabilités et les limites d'une assistance fondée sur l'IA."
      sections={sections}
      notice="Ce document est un modèle de conditions générales. Complétez l'entité contractante, les tarifs, la loi applicable et les règles de résiliation, puis faites-le valider par un professionnel du droit."
    />
  );
}
