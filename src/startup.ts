import { GoogleGenerativeAI } from "@google/generative-ai";
import { Pinecone } from "@pinecone-database/pinecone";
import { Langfuse } from "langfuse";
import dotenv from "dotenv";
dotenv.config();

export const gemini = new GoogleGenerativeAI(
  process.env.GEMINI_API_KEY as string
);

export const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY as string,
});

export const indexName = "news-index";

const langfuse = new Langfuse({
  secretKey: process.env.LANGFUSE_SECRET_KEY,
  publicKey: process.env.LANGFUSE_PUBLIC_KEY,
  baseUrl: process.env.LANGFUSE_HOST,
});

const trace = langfuse.trace({
  name: "RAG",
});

export const traceGeneration = (data: {
  name: string;
  model: string;
  input: string;
  messages: any;
}) => {
  trace.generation({
    name: data.name,
    model: data.model,
    input: data.input,
    output: data.messages,
  });
};
