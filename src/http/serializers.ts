// Serializadores das respostas HTTP. Mantemos um contrato estavel
// independente das mudancas internas do dominio.

import type {
  Roadmap,
  RoadmapDetail,
  RoadmapItemWithProgress,
  RoadmapProgressSummary,
  RoadmapTopic,
  UserVideoProgress,
} from "../domain/types.js";

export interface RoadmapSummaryDto {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  source: Roadmap["source"];
  visibility: Roadmap["visibility"];
  publishedAt: string | null;
}

export interface RoadmapItemDto {
  id: string;
  topicId: string | null;
  order: number;
  status: RoadmapItemWithProgress["status"];
  youtubeVideoId: string;
  title: string;
  channel: string | null;
  thumbnailUrl: string | null;
  durationSeconds: number | null;
  progress: VideoProgressDto | null;
}

export interface VideoProgressDto {
  completedAt: string | null;
  activityDate: string | null;
}

export interface RoadmapTopicDto {
  id: string;
  title: string;
  subject: string | null;
  order: number;
  items: RoadmapItemDto[];
}

export interface RoadmapProgressDto {
  totalItems: number;
  completedItems: number;
  percentComplete: number;
  startedAt: string | null;
  lastActivityAt: string | null;
  completedAt: string | null;
}

export interface RoadmapDetailDto {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  source: Roadmap["source"];
  visibility: Roadmap["visibility"];
  publishedAt: string | null;
  topics: RoadmapTopicDto[];
  unassignedItems: RoadmapItemDto[];
  progress: RoadmapProgressDto | null;
}

export function serializeRoadmapSummary(r: Roadmap): RoadmapSummaryDto {
  return {
    id: r.id,
    slug: r.slug,
    title: r.title,
    description: r.description,
    source: r.source,
    visibility: r.visibility,
    publishedAt: r.publishedAt ? r.publishedAt.toISOString() : null,
  };
}

export function serializeRoadmapDetail(d: RoadmapDetail): RoadmapDetailDto {
  return {
    ...serializeRoadmapSummary(d.roadmap),
    topics: d.topics.map((t) => serializeTopic(t, t.items)),
    unassignedItems: d.unassignedItems.map(serializeItem),
    progress: d.progress ? serializeProgressSummary(d.progress) : null,
  };
}

function serializeTopic(
  t: RoadmapTopic,
  items: RoadmapItemWithProgress[],
): RoadmapTopicDto {
  return {
    id: t.id,
    title: t.title,
    subject: t.subject,
    order: t.order,
    items: items.map(serializeItem),
  };
}

function serializeItem(i: RoadmapItemWithProgress): RoadmapItemDto {
  return {
    id: i.id,
    topicId: i.topicId,
    order: i.order,
    status: i.status,
    youtubeVideoId: i.youtubeVideoId,
    title: i.title,
    channel: i.channel,
    thumbnailUrl: i.thumbnailUrl,
    durationSeconds: i.durationSeconds,
    progress: i.progress ? serializeVideoProgress(i.progress) : null,
  };
}

function serializeVideoProgress(p: UserVideoProgress): VideoProgressDto {
  return {
    completedAt: p.completedAt ? p.completedAt.toISOString() : null,
    activityDate: p.activityDate ? p.activityDate.toISOString() : null,
  };
}

function serializeProgressSummary(
  p: RoadmapProgressSummary,
): RoadmapProgressDto {
  return {
    totalItems: p.totalItems,
    completedItems: p.completedItems,
    percentComplete: p.percentComplete,
    startedAt: p.startedAt ? p.startedAt.toISOString() : null,
    lastActivityAt: p.lastActivityAt ? p.lastActivityAt.toISOString() : null,
    completedAt: p.completedAt ? p.completedAt.toISOString() : null,
  };
}
