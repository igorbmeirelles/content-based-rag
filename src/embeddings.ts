import { gemini, traceGeneration } from "./startup";

export async function generateEmbeddings(text: string) {
  const embeddingModel = gemini.getGenerativeModel({
    model: "text-embedding-004",
  });
  const result = await embeddingModel.embedContent(text);

  traceGeneration({
    name: "GenerateEbeddings",
    model: "text-embedding-004",
    input: text,
    messages: result as any,
  });
  return result.embedding.values;
}
