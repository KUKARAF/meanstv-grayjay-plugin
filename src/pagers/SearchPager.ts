import { getContentSearchPage } from "../api";
import { searchResultFromCatalogItem } from "../utilities/factories";

/** Pages global search, following the Turbo continuation and keeping series/collections. */
export class SearchPager extends ContentPager {
  private readonly query: string;
  private nextUrl: string | null;

  constructor(query: string) {
    super([], false);
    this.query = query;

    const page = getContentSearchPage(query);
    this.results = page.items.map(searchResultFromCatalogItem);
    this.nextUrl = page.nextUrl;
    this.hasMore = this.nextUrl !== null;
  }

  override hasMorePagers(): boolean {
    return this.hasMore;
  }

  override nextPage(): SearchPager {
    if (!this.nextUrl) return this;

    const page = getContentSearchPage(this.query, this.nextUrl);
    this.results = page.items.map(searchResultFromCatalogItem);
    this.nextUrl = page.nextUrl;
    this.hasMore = this.nextUrl !== null;
    return this;
  }
}
