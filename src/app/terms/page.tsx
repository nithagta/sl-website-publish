import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Terms of service | SL Website Publish" };

export default function TermsPage() {
  return (
    <main className="legal-page section-wrap">
      <Link className="brand" href="/"><span className="brand-symbol">SL</span><span className="brand-copy"><strong>SL Website Publish</strong><small>by Nithish Studio</small></span></Link>
      <div className="eyebrow">LEGAL</div>
      <h1>Terms of service</h1>
      <p>By using SL Website Publish, you agree to these terms. The platform is managed by Nithish Studio and provides a directory of independently submitted websites and Android applications.</p>
      <h2>Accounts and access</h2>
      <p>You must provide accurate account information and verify your email address. Registration does not grant submission privileges. Creator access and per-type submission limits are assigned by the administrator and may be changed or revoked.</p>
      <h2>Submissions and rights</h2>
      <p>You must own or have permission to submit and distribute every website link, application, APK, logo, image, video, and description you provide. Do not upload unlawful, harmful, infringing, or malicious content. Submitted material may be reviewed, rejected, unpublished, or removed by the administrator.</p>
      <h2>Downloads and external links</h2>
      <p>Listings may link to third-party websites or APK downloads. SL Website Publish does not claim that APK files are malware-free unless a security scanner is explicitly configured and has checked them. Users are responsible for evaluating downloads and their device’s installation settings.</p>
      <h2>Contact</h2>
      <p>For questions, contact Nithish Nawagamuwa through WhatsApp only at <a href="https://wa.me/94754345412" target="_blank" rel="noopener noreferrer">wa.me/94754345412</a>.</p>
      <p className="legal-updated">Last updated: October 30, 2026</p>
      <Link className="legal-back" href="/">← Back to the directory</Link>
    </main>
  );
}
