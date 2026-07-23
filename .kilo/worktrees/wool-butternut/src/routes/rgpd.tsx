import { createFileRoute } from "@tanstack/react-router";
import { LegalPage, type LegalSection } from "@/components/LegalPage";

export const Route = createFileRoute("/rgpd")({
  head: () => ({
    meta: [
      { title: "RGPD — MailMind AI" },
      {
        name: "description",
        content:
          "La manière dont MailMind applique les principes du RGPD à ses services de messagerie intelligente.",
      },
    ],
  }),
  component: RGPD,
});

const sections: LegalSection[] = [
  {
    title: "Périmètre et rôles",
    paragraphs: [
      "Cette page présente le cadre de protection des données applicable à MailMind. Pour les données d'une organisation ou de ses collaborateurs, le client agit généralement comme responsable du traitement et MailMind comme sous-traitant, lorsque MailMind traite les e-mails sur ses instructions.",
      "Le rôle exact dépend du service souscrit, de la configuration retenue et de la relation avec les personnes concernées. Les parties doivent le confirmer dans le contrat et le DPA.",
    ],
  },
  {
    title: "Données traitées",
    bullets: [
      "Données de compte : identité, adresse e-mail, identifiant utilisateur et informations nécessaires à la connexion.",
      "Données de connexion Gmail : identifiants de compte Google, scopes autorisés et tokens chiffrés.",
      "Données de messagerie : expéditeur, destinataires, sujet, dates, corps, labels, thread et identifiants Gmail synchronisés.",
      "Données d'analyse : résumé, catégorie, intention, sentiment, entités, score de risque et justification.",
      "Données de configuration : préférences, listes blanche/noire et paramètres de notification.",
      "Données techniques : journaux nécessaires au fonctionnement, à la sécurité et au diagnostic du service.",
    ],
  },
  {
    title: "Finalités et bases légales",
    bullets: [
      "Fournir le service demandé et synchroniser le compte Gmail : exécution du contrat.",
      "Analyser, classer et résumer les e-mails à la demande ou selon les préférences : exécution du contrat.",
      "Prévenir les abus, sécuriser l'infrastructure et diagnostiquer les erreurs : intérêt légitime, sous réserve d'une mise en balance documentée.",
      "Envoyer des communications non essentielles ou présenter de nouvelles offres : consentement lorsque la loi l'exige.",
      "Répondre aux obligations légales et aux demandes des autorités : obligation légale.",
    ],
  },
  {
    title: "Droits des personnes",
    paragraphs: [
      "Les personnes concernées peuvent exercer leurs droits d'accès, de rectification, d'effacement, de limitation, d'opposition et de portabilité dans les conditions prévues par le RGPD. Lorsqu'une organisation est responsable du traitement, la demande doit généralement lui être adressée en premier lieu.",
      "Pour une demande concernant directement un compte MailMind, écrivez à privacy@mailmind.ai. Nous pouvons demander des informations raisonnables pour vérifier l'identité du demandeur.",
    ],
  },
  {
    title: "Conservation et suppression",
    paragraphs: [
      "Les données sont conservées pendant la durée nécessaire à la fourniture du service, à la sécurité et au respect des obligations légales. Les durées précises doivent être configurées par offre et documentées dans le contrat ou la politique de conservation applicable.",
    ],
    bullets: [
      "La déconnexion d'un compte Gmail arrête l'accès futur à ce compte.",
      "La suppression du compte ou des données doit entraîner la suppression des données applicatives dans les délais documentés.",
      "Certaines traces peuvent être conservées plus longtemps lorsqu'une obligation légale ou un litige l'impose.",
    ],
  },
  {
    title: "Sous-traitants et transferts",
    paragraphs: [
      "MailMind peut s'appuyer sur des fournisseurs d'hébergement, d'authentification, de base de données, d'envoi d'e-mails et d'intelligence artificielle. La liste à jour des sous-traitants, leurs finalités, leurs localisations et les garanties de transfert doivent être publiées ou annexées au DPA.",
      "Aucun transfert international ne doit être présenté comme inexistant sans vérification des régions d'hébergement, des sous-traitants et des flux réellement activés dans l'environnement de production.",
    ],
  },
  {
    title: "Violation de données et réclamation",
    paragraphs: [
      "En cas de violation de données personnelles, MailMind documente l'incident, prend des mesures de réduction d'impact et informe le client sans délai indu lorsque le contrat de sous-traitance l'exige. Le responsable du traitement reste chargé de ses obligations de notification à l'autorité et aux personnes concernées lorsqu'elles s'appliquent.",
      "Une réclamation peut être adressée à l'autorité de contrôle compétente, notamment la CNIL en France, sans préjudice des autres recours disponibles.",
    ],
  },
];

function RGPD() {
  return (
    <LegalPage
      eyebrow="RGPD"
      title="Des données sous contrôle."
      description="Les principes de minimisation, de transparence et de contrôle qui encadrent le traitement des données dans MailMind."
      sections={sections}
      notice="Cette page est une base de conformité produit, pas un avis juridique. Faites-la relire et complétez l'identité du responsable de traitement, les durées de conservation, les sous-traitants et les coordonnées de l'autorité compétente."
    />
  );
}
