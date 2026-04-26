// Tipos de dominio para trilhas, videos e progresso.
// Espelham o schema do Prisma mas sao desacoplados para que o service
// possa ser testado contra implementacoes em memoria.

export type UserRole = "STUDENT" | "CURATOR" | "ADMIN";

export type RoadmapSource = "OFFICIAL" | "USER";
export type RoadmapVisibility = "PUBLIC" | "UNLISTED" | "PRIVATE";
export type RoadmapItemStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
}

export interface Roadmap {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  source: RoadmapSource;
  visibility: RoadmapVisibility;
  ownerId: string | null;
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface RoadmapTopic {
  id: string;
  roadmapId: string;
  title: string;
  subject: string | null;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface RoadmapItem {
  id: string;
  roadmapId: string;
  topicId: string | null;
  youtubeVideoId: string;
  title: string;
  channel: string | null;
  thumbnailUrl: string | null;
  durationSeconds: number | null;
  order: number;
  status: RoadmapItemStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserVideoProgress {
  id: string;
  userId: string;
  roadmapItemId: string;
  completedAt: Date | null;
  activityDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

// Snapshot agregado por trilha. Pode ser materializado ou recalculado.
export interface RoadmapProgressSummary {
  roadmapId: string;
  userId: string;
  totalItems: number;
  completedItems: number;
  percentComplete: number;
  startedAt: Date | null;
  lastActivityAt: Date | null;
  completedAt: Date | null;
}

// View composta para a tela de detalhe da trilha (P1/P2).
export interface RoadmapDetail {
  roadmap: Roadmap;
  topics: Array<RoadmapTopic & { items: RoadmapItemWithProgress[] }>;
  // Itens sem topico vinculado, mantendo a ordenacao da trilha.
  unassignedItems: RoadmapItemWithProgress[];
  progress: RoadmapProgressSummary | null;
}

export interface RoadmapItemWithProgress extends RoadmapItem {
  progress: UserVideoProgress | null;
}
