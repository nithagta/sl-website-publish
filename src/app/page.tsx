import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  Layers3,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import ListingExplorer from "@/app/listing-explorer";
import { getPublicDirectory } from "@/lib/public-data";

export const dynamic = "force-dynamic";

function youtubeEmbed(url: string) {
  try {
    const parsed = new URL(url);
    let id: string | null = null;
    if (parsed.hostname === "youtu.be") id = parsed.pathname.slice(1);
    if (parsed.hostname.endsWith("youtube.com")) {
      id = parsed.searchParams.get("v") ?? parsed.pathname.split("/").pop() ?? null;
    }
    return id && /^[\w-]{11}$/.test(id)
      ? `https://www.youtube-nocookie.com/embed/${id}`
      : null;
  } catch {
    return null;
  }
}

export default async function Home() {
  const directory = await getPublicDirectory();
  const visibleMedia = directory.media.filter((item) =>
    item.youtube_url ? Boolean(youtubeEmbed(item.youtube_url)) : Boolean(item.signed_url),
  );

  return (
    <main>
      <header className="site-header">
        <a className="brand" href="#home" aria-label="SL Website Publish home">
          <span className="brand-symbol">SL</span>
          <span className="brand-copy">
            <strong>SL Website Publish</strong>
            <small>by Nithish Studio</small>
          </span>
        </a>
        <nav className="main-nav" aria-label="Main navigation">
          <a href="#home">Home</a>
          <a href="#websites">Explore</a>
          <a href="#apps">Android Apps</a>
          <a href="#websites">Categories</a>
          <a href="#media">Media</a>
          <a href="#contact">Contact</a>
        </nav>
        <div className="header-actions">
          <a className="nav-login" href="/admin/login">Admin Login</a>
          <a className="nav-login" href="/login">Sign in</a>
          <a className="button button-small button-primary" href="/register">
            Get started <ArrowUpRight size={15} />
          </a>
        </div>
      </header>

      <section className="hero section-wrap" id="home">
        <div className="hero-copy">
          <div className="eyebrow"><span /> INDEPENDENT DIGITAL DIRECTORY</div>
          <h1>
            Discover what
            <br />
            <span>people are building.</span>
          </h1>
          <p>
            A carefully reviewed directory of websites and Android apps,
            created by independent developers.
          </p>
          <div className="hero-actions">
            <a className="button button-primary" href="#websites">
              Explore the directory <ArrowRight size={17} />
            </a>
            <a className="button button-quiet" href="#submit">
              Submit your project
            </a>
          </div>
          <div className="hero-footnote">
            <ShieldCheck size={16} />
            Every public listing is reviewed before publishing.
          </div>
        </div>
        <div className="hero-art" aria-hidden="true">
          <div className="orbit orbit-one" />
          <div className="orbit orbit-two" />
          <div className="hero-glow" />
          <div className="hero-tile tile-main">
            <div className="tile-window">
              <span /><span /><span />
            </div>
            <div className="tile-lines"><i /><i /><i /></div>
            <div className="tile-check"><ShieldCheck size={18} /></div>
          </div>
          <div className="hero-tile tile-float">
            <Layers3 size={22} />
            <span>Curated<br />with care</span>
          </div>
          <div className="hero-tile tile-mini"><Sparkles size={20} /></div>
          <div className="hero-art-caption">Made for builders. Open to everyone.</div>
        </div>
        <a className="scroll-cue" href="#websites"><ArrowDown size={16} /> Scroll to explore</a>
      </section>

      <section className="directory-section section-wrap" id="websites">
        <div className="section-heading">
          <div>
            <div className="eyebrow">THE DIRECTORY</div>
            <h2>Find your next favorite.</h2>
          </div>
          <p>Real projects, submitted by their creators<br />and approved by our team.</p>
        </div>
        {directory.error && <div className="inline-error" role="status">{directory.error}</div>}
        <div id="apps">
          <ListingExplorer
            configured={directory.configured}
            listings={directory.listings}
            unavailable={Boolean(directory.error)}
          />
        </div>
      </section>

      <section className="submit-band section-wrap" id="submit">
        <div className="submit-content">
          <div className="eyebrow">BUILT SOMETHING GOOD?</div>
          <h2>Submit Your Website<br />or Android App</h2>
          <p>
            Create an account and request submission access. Every listing is
            checked for quality before it goes live.
          </p>
          <a className="button button-primary" href="/register">
            Submit Your Website or Android App <ArrowRight size={16} />
          </a>
        </div>
        <div className="submit-aside">
          <span className="step-number">01</span><span>Create your account</span>
          <span className="step-number">02</span><span>Verify your email</span>
          <span className="step-number">03</span><span>Request creator access</span>
          <span className="step-number">04</span><span>Submit for review</span>
        </div>
      </section>

      {directory.mediaError && <p className="section-wrap inline-error" role="status">{directory.mediaError}</p>}
      {visibleMedia.length > 0 && (
        <section className="media-section section-wrap" id="media">
          <div className="section-heading">
            <div>
              <div className="eyebrow">FROM THE STUDIO</div>
              <h2>Media &amp; YouTube Gallery</h2>
            </div>
            <p>Selected and published by Nithish Studio.</p>
          </div>
          <div className="media-grid">
            {visibleMedia.map((item) => {
              const src = item.signed_url ?? null;
              const embed = item.youtube_url ? youtubeEmbed(item.youtube_url) : null;
              if (item.media_type === "youtube" && !embed) return null;
              if (item.media_type !== "youtube" && !src) return null;
              return (
                <article className="media-card" key={item.id}>
                  <div className="media-frame">
                    {item.media_type === "image" && src && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={src} alt={item.title} loading="lazy" />
                    )}
                    {item.media_type === "video" && src && (
                      <video controls preload="metadata" src={src}>
                        Your browser does not support embedded video.
                      </video>
                    )}
                    {item.media_type === "youtube" && embed && (
                      <iframe
                        src={embed}
                        title={item.title}
                        loading="lazy"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        referrerPolicy="strict-origin-when-cross-origin"
                        allowFullScreen
                      />
                    )}
                  </div>
                  <div className="media-copy">
                    <span>{item.media_type === "youtube" ? "YOUTUBE" : item.media_type.toUpperCase()}</span>
                    <h3>{item.title}</h3>
                    {item.description && <p>{item.description}</p>}
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      )}

      <section className="contact-section section-wrap" id="contact">
        <div>
          <div className="eyebrow">SAY HELLO</div>
          <h2>Have a question?<br /><span>Let’s talk.</span></h2>
        </div>
        <div className="contact-detail">
          <p>For creator access and support, reach Nithish Studio directly.</p>
          <a
            className="button button-primary"
            href="https://wa.me/94754345412"
            target="_blank"
            rel="noopener noreferrer"
          >
            Contact on WhatsApp <ArrowUpRight size={16} />
          </a>
          <span>WhatsApp Only · 075 434 5412</span>
        </div>
      </section>

      <footer className="site-footer section-wrap">
        <a className="brand" href="#home">
          <span className="brand-symbol">SL</span>
          <span className="brand-copy"><strong>SL Website Publish</strong><small>by Nithish Studio</small></span>
        </a>
        <p>Created &amp; Managed by Nithish Studio<br />Nithish Nawagamuwa</p>
        <div className="footer-links">
          <a href="/privacy">Privacy</a>
          <a href="/terms">Terms</a>
          <a href="/admin/login">Admin Login</a>
        </div>
        <span className="copyright">© {new Date().getFullYear()} Nithish Studio</span>
      </footer>
    </main>
  );
}
