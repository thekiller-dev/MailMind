// Brand SVG icons for email providers — inline so they inherit currentColor when needed.

export function GmailIcon({ className = "size-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-label="Gmail">
      <path
        fill="#4285F4"
        d="M2 6.5A2.5 2.5 0 0 1 4.5 4H6l6 4.5L18 4h1.5A2.5 2.5 0 0 1 22 6.5V8l-10 7L2 8V6.5z"
      />
      <path
        fill="#34A853"
        d="M2 8l10 7L22 8v9.5A2.5 2.5 0 0 1 19.5 20H18V11l-6 4.5L6 11v9H4.5A2.5 2.5 0 0 1 2 17.5V8z"
      />
      <path fill="#FBBC04" d="M6 11v9H4.5A2.5 2.5 0 0 1 2 17.5V8l4 3z" />
      <path fill="#EA4335" d="M18 11l4-3v9.5a2.5 2.5 0 0 1-2.5 2.5H18v-9z" />
      <path
        fill="#C5221F"
        d="M2 6.5C2 5.12 3.12 4 4.5 4H6l6 4.5L18 4h1.5C20.88 4 22 5.12 22 6.5V8l-10 7L2 8V6.5z"
        opacity=".0"
      />
    </svg>
  );
}

export function OutlookIcon({ className = "size-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-label="Outlook">
      <rect x="2" y="5" width="14" height="14" rx="2" fill="#0078D4" />
      <ellipse cx="9" cy="12" rx="3.4" ry="3.8" fill="#fff" />
      <ellipse cx="9" cy="12" rx="1.6" ry="2" fill="#0078D4" />
      <path fill="#28A8EA" d="M16 8l6-2v12l-6-2V8z" />
    </svg>
  );
}

export function YahooIcon({ className = "size-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-label="Yahoo">
      <rect width="24" height="24" rx="4" fill="#6001D2" />
      <path fill="#fff" d="M5 7h3.2l2.3 4.2L13 7h3.1l-4.4 7.6V18H9.5v-3.4L5 7z" />
      <circle cx="17.5" cy="15.5" r="1.4" fill="#fff" />
    </svg>
  );
}

export function ImapIcon({ className = "size-5" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      aria-label="IMAP"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
    >
      <rect x="3" y="5" width="18" height="14" rx="2.5" />
      <path d="M3 8l9 6 9-6" />
    </svg>
  );
}

export function ProviderIcon({ provider, className }: { provider: string; className?: string }) {
  const p = provider.toLowerCase();
  if (p.includes("gmail") || p.includes("google")) return <GmailIcon className={className} />;
  if (p.includes("outlook") || p.includes("microsoft"))
    return <OutlookIcon className={className} />;
  if (p.includes("yahoo")) return <YahooIcon className={className} />;
  return <ImapIcon className={className} />;
}
