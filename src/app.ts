import Fastify from "fastify";
import dotenv from "dotenv";
import { readFile } from "node:fs/promises";
import { gemini, indexName, pinecone, traceGeneration } from "./startup";
import { generateEmbeddings } from "./embeddings";
import { createYoga, createSchema } from "graphql-yoga";

dotenv.config();

const fastify = Fastify({ logger: true });

const promptsFolder = "./src/prompts";
const promptsFiles = {
  responseTemplateFromJson: `${promptsFolder}/responseformat.md`,
};

async function generateLLMResponse(query: string) {
  const index = pinecone.Index(indexName);
  const results = await index.query({
    topK: 3,
    vector: await generateEmbeddings(query),
    includeMetadata: true,
  });

  const parsedContextObject = results.matches.reduce((previous, current) => {
    const metadata = current.metadata as unknown as ArticleMetadata;

    if (!previous[metadata.url]) {
      previous[metadata.url] = {
        content: metadata.content,
        url: metadata.url,
        title: metadata.title,
        date: metadata.date,
      };
    }
    return previous;
  }, {} as Record<string, Pick<ArticleMetadata, "content" | "url" | "title" | "date">>);

  const context = Object.values(parsedContextObject)
    .map(
      (content) =>
        `Title: ${content.title}\nContent: ${content.content}\nSource: ${content.url}\nDate: ${content.date}`
    )
    .join("\n");

  const extractionModel = gemini.getGenerativeModel({
    model: "gemini-2.0-flash",
  });

  const promptText = await readFile(
    promptsFiles.responseTemplateFromJson,
    "utf-8"
  );

  const text = promptText
    .replace("{context}", context)
    .replace("{question}", query);

  const result = await extractionModel.generateContent({
    contents: [
      {
        role: "user",
        parts: [
          {
            text: text,
          },
        ],
      },
    ],
    generationConfig: { responseMimeType: "application/json" },
  });

  traceGeneration({
    model: "gemini-2.0-flash",
    messages: result as any,
    name: "function generateLLMResponse",
    input: text,
  });
  return {
    answer: JSON.parse(result.response.text()).answer,
    sources: Object.values(parsedContextObject),
  };
}

fastify.post("/agent", async (request, reply) => {
  const { query } = request.body as { query: string };
  return reply.send(await generateLLMResponse(query));
});

const schema = createSchema({
  typeDefs: `
    type Response {
      answer: String
      sources: [Article]
    }
    type Article {
      title: String
      content: String
      url: String
      date: String
      source: String
    }
    type Query {
      searchArticles(query: String!): Response
    }
  `,
  resolvers: {
    Query: {
      searchArticles: async (_parent, { query }) => generateLLMResponse(query),
    },
  },
});

const yoga = createYoga({ schema });
fastify.route({
  url: "/graphql",
  method: ["GET", "POST"],
  handler: async (req, reply) => {
    return await yoga.handleNodeRequestAndResponse(req, reply);
  },
});

const start = async () => {
  try {
    fastify.listen({ port: 3000, host: "0.0.0.0" }, function (err, address) {
      if (err) {
        fastify.log.error(err);
        process.exit(1);
      }
    });
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};
start();
