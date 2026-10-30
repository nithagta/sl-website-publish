"use client";

import { useMemo, useState } from "react";
import {
  ArrowDownToLine,
  ArrowUpRight,
  Globe2,
  Search,
  Smartphone,
} from "lucide-react";

import type { PublicListing } from "@/lib/public-data";

type Filter = "All" | "Websites" | "Android Apps";

function isWebsite(item: PublicListing): item is Extract<PublicListing, { kind: "website" }> {
  return item.kind === "website";
}

export default function ListingExplorer({
  listings,
  configured,
  unavailable = false,
}: {
  listings: PublicListing[];
  configured: boolean;
  unavailable?: boolean;
}) {
  const [filter, setFilter] = useState<Filter>("All");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All categories");
  const categories = useMemo(
    () => Array.from(new Set(listings.map((item) => item.category))).sort(),
    [listings],
  );

  const visibleListings = useMemo(() => {
    const search = query.trim().toLocaleLowerCase();
    return listings.filter((item) => {
      if (filter === "Websites" && item.kind !== "website") return false;
      if (filter === "Android Apps" && item.kind !== "app") return false;
      if (category !== "All categories" && item.category !== category) return false;
      if (!search) return true;
      return [
        item.listing.name,
        item.listing.description,
        item.listing.developer_name,
        item.category,
      ]
        .join(" ")
        .toLocaleLowerCase()
        .includes(search);
    });
  }, [category, filter, listings, query]);

  return (
    <div className="directory">
      <div className="directory-toolbar">
        <label className="search-field">
          <Search size={19} aria-hidden="true" />
          <span className="sr-only">Search websites and Android apps</span>
          <input
            type="search"
            placeholder="Search by name, category, or keyword"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        <div className="filter-tabs" aria-label="Listing type">
          {(["All", "Websites", "Android Apps"] as const).map((item) => (
            <button
              aria-pressed={filter === item}
              className={filter === item ? "filter-tab active" : "filter-tab"}
              key={item}
              onClick={() => setFilter(item)}
              type="button"
            >
              {item}
            </button>
          ))}
        </div>
        {categories.length > 0 && (
          <label className="sr-only" htmlFor="category-filter">Filter by category</label>
        )}
        {categories.length > 0 && (
          <select
            aria-label="Filter by category"
            className="category-select"
            id="category-filter"
            value={category}
            onChange={(event) => setCategory(event.target.value)}
          >
            <option>All categories</option>
            {categories.map((name) => <option key={name}>{name}</option>)}
          </select>
        )}
      </div>

      {!configured ? (
        <div className="empty-panel config-panel">
          <span className="status-dot" />
          <h3>Directory setup required</h3>
          <p>
            Connect a Supabase project and apply the database migration to load
            approved listings. No sample content is shown.
          </p>
        </div>
      ) : unavailable ? (
        <div className="empty-panel" role="status">
          <span className="status-dot" />
          <h3>Directory data is temporarily unavailable</h3>
          <p>Listings could not be loaded from the database. Please try again later.</p>
        </div>
      ) : visibleListings.length === 0 ? (
        <div className="empty-panel">
          <span className="empty-icon">
            <Search size={23} />
          </span>
          <h3>{query ? "No matching listings" : "No Websites or Apps Yet"}</h3>
          <p>
            {query
              ? "Try another name, category, or keyword."
              : "Be the first to submit your website or Android app."}
          </p>
        </div>
      ) : (
        <div className="listing-grid">
          {visibleListings.map((item) => {
            const website = isWebsite(item);
            const title = item.listing.name;
            const href = website
              ? item.listing.destination_url
              : `/api/apps/${item.listing.id}/download`;

            return (
              <article className="listing-card" key={`${item.kind}-${item.listing.id}`}>
                <div className="listing-card-top">
                  <div className="listing-mark" aria-hidden="true">
                    {website ? <Globe2 size={22} /> : <Smartphone size={22} />}
                  </div>
                  <span className="listing-type">
                    {website ? "Website" : "Android app"}
                  </span>
                  <span className="card-category">{item.category}</span>
                </div>
                <h3>{title}</h3>
                <p className="listing-description">{item.listing.description}</p>
                {!website && (
                  <p className="download-warning">
                    Android may ask you to allow installation from your browser or file manager.
                  </p>
                )}
                <div className="listing-card-footer">
                  <span>By {item.listing.developer_name}</span>
                  <div className="card-actions">
                    {!website && item.listing.google_play_url && (
                      <a className="card-action" href={item.listing.google_play_url} target="_blank" rel="noopener noreferrer">
                        Google Play <ArrowUpRight size={15} aria-hidden="true" />
                      </a>
                    )}
                    <a
                      className="card-action"
                      href={href}
                      rel={website ? "noopener noreferrer" : undefined}
                      target={website ? "_blank" : undefined}
                    >
                      {website ? "Visit Website" : "Download APK"}
                      {website ? (
                        <ArrowUpRight size={16} aria-hidden="true" />
                      ) : (
                        <ArrowDownToLine size={16} aria-hidden="true" />
                      )}
                    </a>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
      {configured && listings.length > 0 && (
        <p className="result-count">
          Showing {visibleListings.length} of {listings.length} approved listings
        </p>
      )}
    </div>
  );
}
