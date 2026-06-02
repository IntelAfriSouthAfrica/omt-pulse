import { Link } from "wouter";
import omtLogo from "@/assets/omt-logo-v2.png";

const CONTACT_EMAIL = "support@intelafri.org";
const EFFECTIVE_DATE = "2 June 2026";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <img src={omtLogo} alt="OMT Pulse" className="h-9 w-9 object-contain" />
            <div>
              <p className="font-semibold leading-tight">OMT Pulse</p>
              <p className="text-xs text-muted-foreground">Privacy Policy</p>
            </div>
          </div>
          <Link href="/login" className="text-sm text-primary hover:underline" data-testid="link-privacy-back-login">
            Back to sign in
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <article className="prose prose-neutral dark:prose-invert max-w-none prose-headings:scroll-mt-20">
          <h1>Privacy Policy</h1>
          <p className="not-prose font-semibold">OMT Pulse</p>
          <p className="text-muted-foreground not-prose text-sm">
            Effective date: {EFFECTIVE_DATE}
          </p>

          <p>
            IntelAfri (Pty) Ltd (“IntelAfri”, “we”, “us”, “our”) operates the OMT Pulse mobile application
            and web platform (“OMT Pulse” or “the App”). This Privacy Policy explains how we collect, use,
            disclose, and protect your information when you use OMT Pulse.
          </p>
          <p>
            We are committed to protecting your privacy and complying with the Protection of Personal
            Information Act (POPIA) of South Africa.
          </p>

          <h2>1. Information We Collect</h2>
          <p>
            <strong>Personal Information you provide:</strong>
          </p>
          <ul>
            <li>Account details (name, email, phone number, role)</li>
            <li>Incident reports, notes, and evidence (photos, videos, audio recordings)</li>
            <li>Location data when you create or join a live incident or use navigation/panic features</li>
          </ul>
          <p>
            <strong>Automatically collected information:</strong>
          </p>
          <ul>
            <li>Precise GPS location (while using live incident, navigation, or panic features)</li>
            <li>Device information (model, OS version, unique device identifiers)</li>
            <li>Usage data and analytics (how you interact with the App)</li>
            <li>Photos, videos, and audio captured as evidence</li>
          </ul>
          <p>
            <strong>Sensitive permissions used:</strong>
          </p>
          <ul>
            <li>Camera and microphone (for evidence capture)</li>
            <li>Location services (foreground and background when required for live incidents)</li>
            <li>Storage and notifications</li>
          </ul>

          <h2>2. How We Use Your Information</h2>
          <p>We use your information to:</p>
          <ul>
            <li>Provide and improve OMT Pulse (incident logging, live response, navigation, panic alerts)</li>
            <li>Enable real-time team coordination and officer safety features</li>
            <li>Generate analytics and heatmaps for security insights</li>
            <li>Maintain an immutable audit trail for compliance and investigations</li>
            <li>Communicate with you (notifications, support)</li>
          </ul>

          <h2>3. How We Share Your Information</h2>
          <p>
            We <strong>do not</strong> sell your personal information.
          </p>
          <p>We may share data only in these cases:</p>
          <ul>
            <li>With your organisation/Command members (as required for incident response)</li>
            <li>With authorised administrators in your organisation</li>
            <li>When legally required (court order, POPIA request, etc.)</li>
            <li>
              With trusted service providers (hosting on Xneelo in South Africa) under strict contracts
            </li>
          </ul>
          <p>All data remains within South Africa where possible.</p>

          <h2>4. Data Storage and Security</h2>
          <ul>
            <li>Your data is hosted on secure servers in South Africa (Xneelo).</li>
            <li>We use encryption in transit and at rest.</li>
            <li>Access is strictly role-based and fully audited.</li>
            <li>Evidence files are stored with tamper-proof metadata.</li>
          </ul>

          <h2>5. Your Rights under POPIA</h2>
          <p>You have the right to:</p>
          <ul>
            <li>Access your personal information</li>
            <li>Correct or update inaccurate information</li>
            <li>Request deletion of your data (subject to legal obligations)</li>
            <li>Object to processing of your data</li>
            <li>Lodge a complaint with the Information Regulator</li>
          </ul>
          <p>
            To exercise these rights, email:{" "}
            <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
          </p>

          <h2>6. Retention of Information</h2>
          <p>
            We keep data only as long as necessary for the purposes described or as required by law. Audit
            trails and evidence are retained for compliance purposes.
          </p>

          <h2>7. Children&apos;s Privacy</h2>
          <p>
            OMT Pulse is not intended for children under 18. We do not knowingly collect data from children.
          </p>

          <h2>8. Changes to this Policy</h2>
          <p>
            We may update this Privacy Policy from time to time. The updated version will be posted here
            with a new effective date.
          </p>

          <h2>9. Contact Us</h2>
          <p>
            <strong>IntelAfri (Pty) Ltd</strong>
            <br />
            Privacy Officer: Anton Kruger
            <br />
            Email: <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
            <br />
            Website: <a href="https://omtpulse.com">https://omtpulse.com</a>
          </p>
        </article>
      </main>

      <footer className="border-t border-border py-6 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} IntelAfri (Pty) Ltd · OMT Pulse
      </footer>
    </div>
  );
}
