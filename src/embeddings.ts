import { output } from "./../node_modules/zod-to-json-schema/dist-test/cjs/node_modules/zod/lib/types.d";
import { gemini, traceGeneration } from "./startup";

export async function generateEmbeddings(text: string) {
  const embeddingModel = gemini.getGenerativeModel({
    model: "text-embedding-004",
  });
  const result = await embeddingModel.embedContent(text);

  traceGeneration({
    name: "GenerateEbeddings",
    model: "",
    input: text,
    messages: result as any,
  });
  return result.embedding.values;
}
