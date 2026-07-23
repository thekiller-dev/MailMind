import { createFileRoute } from "@tanstack/react-router";
import { LegalPage, type LegalSection } from "@/components/LegalPage";

export const Route = createFileRoute("/dpa")({
  head: () => ({
    meta: [
      { title: "DPA — MailMind AI" },
      {
        name: "description",
        content:
          "Base d'accord de traitement des données pour les clients professionnels de MailMind AI.",
      },
    ],
  }),
  component: DPA,
});

const sections: LegalSection[] = [
  {
    title: "Objet de l'accord",
    paragraphs: [
      "Le présent accord de traitement des données (DPA) complète le contrat de service conclu entre [client] et [fournisseur MailMind]. Il encadre le traitement des données personnelles effectué par MailMind pour le compte du client.",
      "Les parties doivent renseigner leurs identités complètes, leurs coordonnées et la date d'entrée en vigueur avant signature.",
    ],
  },
  {
    title: "Instructions et finalités",
    paragraphs: [
      "MailMind traite les données uniquement pour fournir les fonctionnalités commandées : connexion Gmail, synchronisation, classification, résumé, extraction d'entités, détection de signaux de risque, exports et actions demandées par les utilisateurs autorisés.",
      "Le client garantit que ses instructions sont licites et qu'il dispose d'une base légale pour traiter les données importées dans le service.",
    ],
  },
  {
    title: "Catégories de données et personnes",
    bullets: [
      "Données d'identification et coordonnées professionnelles.",
      "Contenu et métadonnées des e-mails, pièces d'identité éventuelles, informations de calendrier ou de transaction présentes dans un message.",
      "Données d'analyse et de configuration générées par le service.",
      "Personnes concernées : employés, clients, prospects, fournisseurs, partenaires et correspondants du client.",
    ],
  },
  {
    title: "Confidentialité et sécurité",
    paragraphs: [
      "MailMind impose une obligation de confidentialité aux personnes autorisées à traiter les données et met en œuvre des mesures techniques et organisationnelles adaptées au risque. Ces mesures comprennent notamment le chiffrement des tokens Gmail côté serveur, l'authentification, les contrôles d'accès et l'isolation des données.",
      "La description détaillée des mesures, des régions d'hébergement, des sauvegardes et des tests de sécurité doit être annexée au contrat si le niveau de risque ou les exigences du client le justifient.",
    ],
  },
  {
    title: "Sous-traitants ultérieurs",
    paragraphs: [
      "Le client autorise les sous-traitants nécessaires à la fourniture du service, sous réserve de la publication d'une liste à jour et d'un mécanisme de notification. MailMind impose à ses sous-traitants des obligations de protection des données cohérentes avec le présent accord.",
      "Liste initiale à compléter avec le nom, la finalité, la localisation et la garantie de transfert de chaque sous-traitant : hébergement, base de données, authentification, intelligence artificielle, e-mail transactionnel et observabilité.",
    ],
  },
  {
    title: "Assistance et droits des personnes",
    paragraphs: [
      "Compte tenu de la nature du service, MailMind assiste le client, dans la mesure du possible, pour répondre aux demandes d'accès, de rectification, d'effacement, de limitation, d'opposition et de portabilité. Le client reste responsable de la réponse aux personnes concernées, sauf accord contraire.",
      "Toute demande doit être transmise à privacy@mailmind.ai avec suffisamment d'informations pour identifier le compte et le périmètre concerné, sans envoyer de secret par e-mail.",
    ],
  },
  {
    title: "Violations de données",
    paragraphs: [
      "MailMind informe le client sans délai indu après avoir pris connaissance d'une violation de données personnelles affectant les données traitées pour son compte. L'information comprend, dans la mesure disponible, la nature de l'incident, les catégories de données concernées, les conséquences probables et les mesures prises.",
      "Le client reste responsable de déterminer s'il doit notifier une autorité de contrôle ou les personnes concernées.",
    ],
  },
  {
    title: "Audits, retour et suppression",
    paragraphs: [
      "MailMind met à disposition les informations raisonnablement nécessaires pour démontrer le respect de ses obligations et peut répondre à des demandes d'audit proportionnées, sous réserve de confidentialité et de sécurité.",
      "À la fin du service, MailMind supprime ou restitue les données personnelles selon l'instruction du client et les délais convenus, sauf conservation imposée par la loi. Les modalités d'export, de suppression des sauvegardes et de preuve de suppression doivent être précisées dans l'annexe de conservation.",
    ],
  },
  {
    title: "Transferts internationaux",
    paragraphs: [
      "Tout transfert de données hors de l'Espace économique européen doit être identifié et encadré par le mécanisme juridique applicable, notamment une décision d'adéquation ou des clauses contractuelles types accompagnées de mesures supplémentaires lorsque nécessaire.",
      "Les régions et flux réellement activés doivent être vérifiés avant signature. Aucun emplacement ou mécanisme ne doit être considéré comme définitif sur la seule base de cette page.",
    ],
  },
];

function DPA() {
  return (
    <LegalPage
      eyebrow="DPA"
      title="Un cadre clair pour les clients professionnels."
      description="Une base d'accord de traitement des données pour documenter les rôles, les instructions, la sécurité et les sous-traitants de MailMind."
      badge="Base contractuelle"
      sections={sections}
      notice="Ce DPA est un modèle produit et ne remplace pas un accord négocié. Complétez les annexes, la liste des sous-traitants, les mesures de sécurité, les durées de conservation et les mécanismes de transfert avant signature."
    />
  );
}
