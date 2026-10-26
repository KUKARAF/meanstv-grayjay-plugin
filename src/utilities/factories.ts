// Factories are the only layer that constructs Grayjay Platform* objects.

import { DOMAIN, PLATFORM, USER_AGENT, urlAuthor, urlProgram } from "../constants";
import { stripHtml } from "./dom";
import type {
  AuthorChannel,
  CatalogItem,
  CommentRecord,
  Content,
  UserPlaylistDetails,
} from "../types";

function pid(id: string | number): PlatformID {
  return new PlatformID(PLATFORM, String(id), plugin.config.id);
}

function thumbnails(url: string): Thumbnails {
  return url ? new Thumbnails([new Thumbnail(url, 0)]) : new Thumbnails([]);
}

function platformAuthor(id: string | number, name: string, url: string, thumbnail?: string): PlatformAuthorLink {
  return new PlatformAuthorLink(pid(id), name, url, thumbnail);
}

export function authorFromCatalog(item: CatalogItem): PlatformAuthorLink {
  if (!item.authorTitle) return platformAuthor("means-tv", PLATFORM, DOMAIN.MAIN);
  return platformAuthor(
    item.authorPermalink || item.id,
    item.authorTitle,
    item.authorPermalink ? urlAuthor(item.authorPermalink) : DOMAIN.MAIN,
    item.authorThumbnailUrl || undefined,
  );
}

export function authorFromContent(content: Content): PlatformAuthorLink {
  const author = content.author;
  if (!author) return platformAuthor("means-tv", PLATFORM, DOMAIN.MAIN);
  return platformAuthor(
    author.permalink || author.id,
    author.title || PLATFORM,
    author.permalink ? urlAuthor(author.permalink) : DOMAIN.MAIN,
    author.avatarUrl || undefined,
  );
}

export function videoFromCatalogItem(item: CatalogItem): PlatformVideo {
  return new PlatformVideo({
    id: pid(item.id),
    name: item.title,
    thumbnails: thumbnails(item.thumbnailUrl),
    author: authorFromCatalog(item),
    datetime: 0,
    duration: item.durationSeconds,
    url: item.url,
    shareUrl: item.url,
    isLive: false,
  });
}

function channelFromCollection(item: CatalogItem): PlatformChannel {
  const slug = item.authorPermalink || item.slug;
  return new PlatformChannel({
    id: pid(item.id),
    name: item.title,
    thumbnail: item.thumbnailUrl,
    description: item.shortDescription,
    url: urlAuthor(slug),
  });
}

function channelFromCardAuthor(item: CatalogItem): PlatformChannel {
  return new PlatformChannel({
    id: pid(item.authorPermalink),
    name: item.authorTitle,
    thumbnail: item.authorThumbnailUrl || "",
    url: urlAuthor(item.authorPermalink),
  });
}

/**
 * Derives the creator channels shown on Grayjay's "Creators" search tab from a
 * page of search cards: `collection` cards are the series/shows themselves, and
 * every other card contributes its author. Deduplicated by author/collection slug.
 */
export function channelsFromSearchItems(items: readonly CatalogItem[]): PlatformChannel[] {
  const seen = new Set<string>();
  const channels: PlatformChannel[] = [];
  for (const item of items) {
    if (item.contentType === "collection") {
      const slug = item.authorPermalink || item.slug;
      if (!slug || seen.has(slug)) continue;
      seen.add(slug);
      channels.push(channelFromCollection(item));
    } else if (item.authorPermalink && item.authorTitle && !seen.has(item.authorPermalink)) {
      seen.add(item.authorPermalink);
      channels.push(channelFromCardAuthor(item));
    }
  }
  return channels;
}

export function videoFromContent(content: Content): PlatformVideo {
  const url = urlProgram(content.permalink);
  return new PlatformVideo({
    id: pid(content.id),
    name: content.title,
    thumbnails: thumbnails(content.mainPoster),
    author: authorFromContent(content),
    datetime: 0,
    duration: content.durationSeconds,
    url,
    shareUrl: url,
    isLive: false,
  });
}

export function channelFromAuthor(author: AuthorChannel): PlatformChannel {
  return new PlatformChannel({
    id: pid(author.slug),
    name: author.name,
    thumbnail: author.thumbnailUrl,
    description: author.description,
    url: urlAuthor(author.slug),
  });
}

export function commentFromRecord(record: CommentRecord, permalink: string): PlatformComment<Record<string, string>> {
  return new PlatformComment({
    contextUrl: urlProgram(permalink),
    author: platformAuthor(
      record.authorId || `comment-author-${record.id}`,
      record.authorName,
      record.authorProfileUrl || DOMAIN.MAIN,
      record.authorAvatarUrl || undefined,
    ),
    message: record.message,
    rating: new RatingLikes(record.likeCount),
    date: record.dateSeconds,
    replyCount: record.replyCount,
    context: {
      contentId: record.contentId,
      commentId: record.id,
      threadId: record.threadId,
    },
  });
}

export function playlistDetailsFromRecord(
  playlist: UserPlaylistDetails,
  contents: VideoPager,
): PlatformPlaylistDetails {
  return new PlatformPlaylistDetails({
    id: pid(playlist.summary.id),
    name: playlist.summary.title,
    thumbnails: thumbnails(playlist.summary.thumbnailUrl),
    ...(playlist.summary.thumbnailUrl ? { thumbnail: playlist.summary.thumbnailUrl } : {}),
    author: platformAuthor("means-tv", PLATFORM, DOMAIN.MAIN),
    datetime: 0,
    url: playlist.summary.url,
    videoCount: playlist.summary.itemCount,
    contents,
  });
}

export function videoDetailsFromContent(
  content: Content,
  hlsUrl: string,
  recommendations?: () => ContentPager,
  subtitles: ISubtitleSource[] = [],
): PlatformVideoDetails {
  const url = urlProgram(content.permalink);
  return new PlatformVideoDetails({
    id: pid(content.id),
    name: content.title,
    thumbnails: thumbnails(content.mainPoster),
    author: authorFromContent(content),
    datetime: 0,
    duration: content.durationSeconds,
    url,
    shareUrl: url,
    isLive: false,
    description: content.description ? stripHtml(content.description) : content.shortDescription,
    video: new VideoSourceDescriptor([
      new HLSSource({
        name: "HLS",
        duration: content.durationSeconds,
        url: hlsUrl,
        requestModifier: { headers: { "User-Agent": USER_AGENT, Origin: DOMAIN.MAIN, Referer: `${DOMAIN.MAIN}/` } },
      }),
    ]),
    rating: new RatingLikes(0),
    ...(subtitles.length ? { subtitles } : {}),
    ...(recommendations ? { getContentRecommendations: recommendations } : {}),
  });
}
