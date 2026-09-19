import { getContentSearchPage } from "../api";
import { videoFromCatalogItem } from "../utilities/factories";

/** Pages the "Media" search tab with videos, following the Turbo continuation. */
export class SearchPager extends ContentPager {
  private readonly query: string;
  private nextUrl: string | null;

  constructor(query: string) {
    super([], false);
    this.query = query;

    const page = getContentSearchPage(query);
    this.results = page.items.filter((item) => item.contentType === "video").map(videoFromCatalogItem);
    this.nextUrl = page.nextUrl;
    this.hasMore = this.nextUrl !== null;
  }

  override hasMorePagers(): boolean {
    return this.hasMore;
  }

  override nextPage(): SearchPager {
    if (!this.nextUrl) return this;

    const page = getContentSearchPage(this.query, this.nextUrl);
    this.results = page.items.filter((item) => item.contentType === "video").map(videoFromCatalogItem);
    this.nextUrl = page.nextUrl;
    this.hasMore = this.nextUrl !== null;
    return this;
  }
}
