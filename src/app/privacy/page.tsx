import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Privacy policy | SL Website Publish" };

export default function PrivacyPage() {
  return (
    <main className="legal-page section-wrap">
      <Link className="brand" href="/"><span className="brand-symbol">SL</span><span className="brand-copy"><strong>SL Website Publish</strong><small>by Nithish Studio</small></span></Link>
      <div className="eyebrow">LEGAL</div>
      <h1>Privacy policy</h1>
      <p>SL Website Publish is managed by Nithish Studio. This page explains the information used to operate the directory.</p>
      <h2>Information we process</h2>
      <p>If you create an account, Supabase Auth processes your email address and authentication data. Your profile name, access permissions, and submissions are stored in the platform database. Public listing details and media are visible only after administrator approval and publication.</p>
      <h2>Purpose and retention</h2>
      <p>Information is used to authenticate account holders, enforce submission access, review listings, and operate the directory. Published APK download requests are recorded as download events; no download counts are displayed publicly. Administrator actions are recorded in an audit log. Account and submission records are retained while needed to provide these services, subject to applicable legal requirements and account deletion requests.</p>
      <h2>Third-party services</h2>
      <p>The platform uses Supabase for authentication, database, and storage services. If an administrator adds a YouTube video, YouTube’s privacy-enhanced embed may receive standard connection data when the video is played.</p>
      <h2>Your choices and contact</h2>
      <p>For a privacy question or account request, contact Nithish Nawagamuwa through WhatsApp only at <a href="https://wa.me/94754345412" target="_blank" rel="noopener noreferrer">wa.me/94754345412</a>.</p>
      <p className="legal-updated">Last updated: October 30, 2026</p>
      <Link className="legal-back" href="/">← Back to the directory</Link>
    </main>
  );
}
