// Brand SVG icons for email providers — inline so they inherit currentColor when needed.

export function MailMindIcon({ className = "size-8" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 32 32" aria-label="MailMind" role="img">
      <defs>
        <linearGradient
          id="mailmind-brand"
          x1="5"
          y1="4"
          x2="28"
          y2="29"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#2563eb" />
          <stop offset="1" stopColor="#0f766e" />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="9" fill="url(#mailmind-brand)" />
      <path
        d="M7.5 12.5 16 19l8.5-6.5v9A2.5 2.5 0 0 1 22 24H10a2.5 2.5 0 0 1-2.5-2.5v-9Z"
        fill="white"
      />
      <path
        d="m7.5 12.5 8.5 6.2 8.5-6.2"
        fill="none"
        stroke="#dbeafe"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="16" cy="16" r="2" fill="#14b8a6" />
    </svg>
  );
}

export function GoogleIcon({ className = "size-5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-label="Google" role="img">
      <path
        fill="#4285F4"
        d="M21.35 12.27c0-.72-.06-1.42-.18-2.09H12v3.96h5.24a4.48 4.48 0 0 1-1.94 2.94v2.45h3.15c1.85-1.7 2.9-4.2 2.9-7.26Z"
      />
      <path
        fill="#34A853"
        d="M12 21.6c2.64 0 4.86-.87 6.48-2.37l-3.15-2.45c-.87.58-1.98.92-3.33.92-2.56 0-4.73-1.73-5.51-4.05H3.24v2.53A9.79 9.79 0 0 0 12 21.6Z"
      />
      <path
        fill="#FBBC05"
        d="M6.49 13.65A5.9 5.9 0 0 1 6.18 12c0-.57.1-1.13.31-1.65V7.82H3.24A9.8 9.8 0 0 0 2.2 12c0 1.58.38 3.07 1.04 4.18l3.25-2.53Z"
      />
      <path
        fill="#EA4335"
        d="M12 6.3c1.44 0 2.73.5 3.75 1.48l2.8-2.8C16.86 3.4 14.64 2.4 12 2.4a9.79 9.79 0 0 0-8.76 5.42l3.25 2.53C7.27 8.03 9.44 6.3 12 6.3Z"
      />
    </svg>
  );
}

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
