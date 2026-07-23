import { createFileRoute } from "@tanstack/react-router";
import { LegalPage, type LegalSection } from "@/components/LegalPage";

export const Route = createFileRoute("/security")({
  head: () => ({
    meta: [
      { title: "Security — MailMind AI" },
      {
        name: "description",
        content:
          "Les mesures de sécurité de MailMind AI : OAuth, chiffrement, isolation et contrôle des accès.",
      },
    ],
  }),
  component: Security,
});

const sections: LegalSection[] = [
  {
    title: "Notre approche",
    paragraphs: [
      "MailMind est conçu selon un principe simple : donner à l'utilisateur une lecture intelligente de ses e-mails sans élargir inutilement le périmètre d'accès. L'application sépare l'authentification, les données de messagerie, le traitement IA et les actions exécutées dans Gmail.",
      "La sécurité dépend aussi de la configuration de votre environnement, de vos fournisseurs et de vos équipes. Les informations de cette page décrivent l'architecture actuelle du produit et ne constituent pas une certification de sécurité.",
    ],
  },
  {
    title: "Authentification et autorisations",
    paragraphs: [
      "La connexion Gmail utilise OAuth 2.0. MailMind ne reçoit pas votre mot de passe Google. Vous autorisez une application déclarée dans Google, et pouvez révoquer cette autorisation depuis votre compte Google.",
    ],
    bullets: [
      "Les utilisateurs sont authentifiés via Supabase Auth.",
      "Les états OAuth sont signés, limités dans le temps et liés à l'origine de la requête.",
      "Les autorisations Gmail sont utilisées pour synchroniser, archiver, signaler et envoyer une réponse lorsque vous le demandez.",
      "La reconnexion ou la révocation d'un compte peut interrompre la synchronisation.",
    ],
  },
  {
    title: "Protection des secrets",
    paragraphs: [
      "Les tokens Gmail sont chiffrés côté serveur avant leur enregistrement dans la base de données. MailMind utilise AES-256-GCM avec une clé d'environnement dédiée. Cette clé ne doit jamais être exposée au navigateur, au dépôt Git ou aux journaux.",
    ],
    bullets: [
      "Les secrets serveur sont lus uniquement dans les fonctions serveur.",
      "Les clés publiques et les clés de service Supabase ont des usages distincts.",
      "Les tokens d'accès expirés sont renouvelés avec le refresh token chiffré.",
      "Une rotation de la clé de chiffrement doit être planifiée avec une procédure de migration contrôlée.",
    ],
  },
  {
    title: "Isolation des données",
    paragraphs: [
      "Les données applicatives sont associées à un utilisateur. Les politiques Row Level Security de Supabase limitent l'accès aux lignes appartenant à l'utilisateur authentifié. Les opérations serveur vérifient également la propriété du compte avant d'agir sur un message.",
    ],
    bullets: [
      "Un utilisateur ne peut pas lire les e-mails, comptes ou préférences d'un autre utilisateur via l'application.",
      "Les actions Gmail vérifient l'utilisateur, le compte connecté et le message ciblé.",
      "Les secrets de service ne sont jamais envoyés au client.",
    ],
  },
  {
    title: "Analyse IA et journalisation",
    paragraphs: [
      "L'analyse IA reçoit les informations nécessaires à la classification du message. Le contenu transmis est limité côté serveur. Le résultat est validé avec un schéma structuré avant d'être enregistré, afin de limiter les sorties incohérentes du modèle.",
      "Aucune promesse de détection parfaite ne peut être faite : un score de risque est un signal d'aide à la décision et ne remplace pas une vérification humaine.",
    ],
  },
  {
    title: "Incidents et signalement",
    paragraphs: [
      "Toute vulnérabilité ou suspicion d'incident peut être signalée à security@mailmind.ai. Merci de ne pas inclure de contenu d'e-mail ou de secret dans un premier message. Nous vous indiquerons un canal sécurisé si des éléments supplémentaires sont nécessaires.",
    ],
    bullets: [
      "Objet recommandé : Security report — [résumé court].",
      "Inclure l'impact observé, les étapes de reproduction et une preuve minimale non sensible.",
      "Ne pas tester une vulnérabilité sur des comptes ou données qui ne vous appartiennent pas.",
    ],
  },
];

function Security() {
  return (
    <LegalPage
      eyebrow="Security"
      title="La sécurité comme point de départ."
      description="Les contrôles et principes qui encadrent la connexion Gmail, le traitement des e-mails et les actions exécutées depuis MailMind."
      sections={sections}
      notice="Cette page décrit l'implémentation actuelle de MailMind. Elle doit être complétée par vos informations légales, vos procédures internes et, le cas échéant, les résultats d'audits ou certifications réellement obtenus."
    />
  );
}
