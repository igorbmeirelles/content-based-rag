import { Kafka, KafkaMessage } from "kafkajs";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { JSDOM } from "jsdom";
import { ulid } from "ulid";
import { gemini, indexName, pinecone, traceGeneration } from "./startup";
import { generateEmbeddings } from "./embeddings";
import dotenv from "dotenv";
import axios from "axios";

dotenv.config();

const kafka = new Kafka({
  clientId: "news-agent",
  brokers: [process.env.KAFKA_BROKER as string],
  sasl: {
    mechanism: "plain",
    username: process.env.KAFKA_USERNAME as string,
    password: process.env.KAFKA_PASSWORD as string,
  },
  ssl: true,
});

const consumer = kafka.consumer({
  groupId: process.env.KAFKA_GROUP_ID_PREFIX + "group",
});

function extractTextFromHTML(html: string) {
  const dom = new JSDOM(html);

  return dom.window.document.body.textContent || "";
}

async function fetchArticleContent(url: string) {
  try {
    const { data } = await axios.get(url);
    const html = data;
    const extractedText = extractTextFromHTML(html);

    const extractionModel = gemini.getGenerativeModel({
      model: "gemini-2.0-flash",
    });

    const input = `Extract the relevant article content and title from the following HTML. Return the result in JSON format with keys 'title' and 'content' (do not return an array, only a object).\n\n${extractedText}`;

    const result = await extractionModel.generateContent({
      contents: [
        {
          role: "user",
          parts: [
            {
              text: input,
            },
          ],
        },
      ],
      generationConfig: { responseMimeType: "application/json" },
    });

    const parsedResult = JSON.parse(result.response.text());

    traceGeneration({
      name: "fetch article content",
      model: "gemini-2.0-flash",
      messages: result,
      input: input,
    });

    return parsedResult;
  } catch (error) {
    console.error("Error fetching article:", error);
    return { title: "Unknown", content: "" };
  }
}

// fetchArticleContent("https://www.bbc.com/news/articles/cy4lj15lyv3o").then(console.log);

async function splitTextIntoChunks(text: string) {
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 500,
    chunkOverlap: 50,
  });
  return await splitter.splitText(text);
}

interface MessagePayload {
  url: string;
  source: string;
}

const processData = async (message: MessagePayload) => {
  const parsedHTML = await fetchArticleContent(message.url);
  const article = {
    ...parsedHTML,
    ...message,
    date: new Date().toISOString(),
  };
  const pineconeIndex = pinecone.Index(indexName);

  const splittedContent = await splitTextIntoChunks(parsedHTML.content);

  const contentId = ulid();

  await Promise.all(
    splittedContent.map(async (content, index) => {
      const embedding = await generateEmbeddings(content);
      await pineconeIndex.upsert([
        {
          id: `${contentId}-chunk-${index}`,
          values: embedding,
          metadata: { ...article, chunk: content },
        },
      ]);
    })
  );
};

const consumeMessage = async ({ message }: { message: KafkaMessage }) => {
  const messageRequest = JSON.parse(
    message.value?.toString() ?? "{}"
  ) as MessagePayload;

  processData(messageRequest);
};

export async function processKafkaMessages() {
  await consumer.connect();
  await consumer.subscribe({
    topic: process.env.KAFKA_TOPIC_NAME as string,
    fromBeginning: true,
  });

  await consumer.run({
    eachMessage: consumeMessage,
  });
}

const fillbase = async (data: MessagePayload[]) => {
  for (const message of data) {
    console.log("Processing:", message.url);
    await processData(message);
    console.log("filled");
    await new Promise((resolve) => setTimeout(resolve, 5000));
  }
};

// fillbase(data);
// processData({
//   source: "BBC",
//   url: "https://www.bbc.com/news/articles/cy4lj15lyv3o",
// });

processKafkaMessages();
