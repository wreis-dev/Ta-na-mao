// Seed minimo para desenvolvimento local. Cria uma trilha oficial ENEM
// com uma disciplina/topico e 2 videos placeholder.
//
// IMPORTANTE: nao incluir credenciais, tokens ou chaves reais. Os
// youtubeVideoIds abaixo sao apenas placeholders sintaticos no formato
// de 11 caracteres do YouTube. Substitua por curadoria real em ambiente
// de staging via processo de admin/curadoria, fora do seed.

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main(): Promise<void> {
  // Curadora oficial usada como referencia para auditoria de criacao das trilhas.
  // Nao representa credencial nem identidade externa.
  const curator = await prisma.user.upsert({
    where: { email: "curadoria@tanamao.local" },
    update: {},
    create: {
      email: "curadoria@tanamao.local",
      name: "Curadoria Ta na mao",
      role: "CURATOR",
    },
  });

  const roadmap = await prisma.roadmap.upsert({
    where: { slug: "enem-trilha-oficial" },
    update: {},
    create: {
      slug: "enem-trilha-oficial",
      title: "ENEM - Trilha Oficial",
      description:
        "Trilha curada por disciplinas e topicos para preparacao no ENEM.",
      source: "OFFICIAL",
      visibility: "PUBLIC",
      ownerId: curator.id,
      publishedAt: new Date(),
    },
  });

  // Topico inicial. Adicionar mais materias e topicos em cards futuros.
  const topic = await prisma.roadmapTopic.upsert({
    where: {
      roadmapId_order: { roadmapId: roadmap.id, order: 1 },
    },
    update: { title: "Matematica - Funcoes", subject: "Matematica" },
    create: {
      roadmapId: roadmap.id,
      title: "Matematica - Funcoes",
      subject: "Matematica",
      order: 1,
    },
  });

  // Dois videos placeholder. youtubeVideoId precisa apenas existir como string;
  // metadados reais sao preenchidos pela integracao com YouTube em outro card.
  const placeholders = [
    {
      order: 1,
      youtubeVideoId: "PLACEHOLDR01",
      title: "Funcoes - Introducao (placeholder)",
      channel: "Curadoria Placeholder",
      durationSeconds: 720,
      thumbnailUrl: null,
    },
    {
      order: 2,
      youtubeVideoId: "PLACEHOLDR02",
      title: "Funcoes - Aplicacoes no ENEM (placeholder)",
      channel: "Curadoria Placeholder",
      durationSeconds: 900,
      thumbnailUrl: null,
    },
  ];

  for (const p of placeholders) {
    await prisma.roadmapItem.upsert({
      where: {
        roadmapId_order: { roadmapId: roadmap.id, order: p.order },
      },
      update: {
        youtubeVideoId: p.youtubeVideoId,
        title: p.title,
        channel: p.channel,
        durationSeconds: p.durationSeconds,
        thumbnailUrl: p.thumbnailUrl,
        topicId: topic.id,
        status: "PUBLISHED",
      },
      create: {
        roadmapId: roadmap.id,
        topicId: topic.id,
        order: p.order,
        youtubeVideoId: p.youtubeVideoId,
        title: p.title,
        channel: p.channel,
        durationSeconds: p.durationSeconds,
        thumbnailUrl: p.thumbnailUrl,
        status: "PUBLISHED",
      },
    });
  }

  // eslint-disable-next-line no-console
  console.log(
    `Seed OK -> roadmap=${roadmap.slug}, topic="${topic.title}", items=${placeholders.length}`,
  );
}

main()
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
