import { SITE } from "../config/firebase-config.js";

function upsertMeta(attr, key, content) {
  let el = document.head.querySelector(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

/**
 * Update document title, description, Open Graph/Twitter tags, canonical URL and JSON-LD.
 * Social crawlers that don't run JS will still see the static defaults in index.html.
 */
export function setMeta({ title = "", description = SITE.description, image = SITE.image, path = "", type = "website", jsonLd = null } = {}) {
  const fullTitle = title ? `${title} — ${SITE.name}` : `${SITE.name} — ${SITE.tagline}`;
  const url = SITE.url + "/" + (path ? `#${path}` : "");
  const img = image && /^https?:/.test(image) ? image : SITE.url + "/" + SITE.image;

  document.title = fullTitle;
  upsertMeta("name", "description", description);
  upsertMeta("property", "og:title", fullTitle);
  upsertMeta("property", "og:description", description);
  upsertMeta("property", "og:url", url);
  upsertMeta("property", "og:type", type);
  upsertMeta("property", "og:image", img);
  upsertMeta("name", "twitter:card", "summary_large_image");

  let canonical = document.head.querySelector('link[rel="canonical"]');
  canonical?.setAttribute("href", url);

  document.getElementById("jsonld")?.remove();
  if (jsonLd) {
    const s = document.createElement("script");
    s.type = "application/ld+json";
    s.id = "jsonld";
    s.textContent = JSON.stringify(jsonLd);
    document.head.appendChild(s);
  }
}

export const articleJsonLd = (post, url) => ({
  "@context": "https://schema.org",
  "@type": "BlogPosting",
  headline: post.title,
  description: post.excerpt,
  datePublished: post.publishedAt?.toDate?.().toISOString(),
  dateModified: post.updatedAt?.toDate?.().toISOString(),
  author: { "@type": "Person", name: SITE.author },
  keywords: (post.tags || []).join(", "),
  mainEntityOfPage: url,
});
