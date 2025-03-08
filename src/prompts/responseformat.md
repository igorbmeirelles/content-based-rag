# Directions

Generate a structured response using the retrieved news articles from the vector database. The response must be formatted in JSON, ensuring that the answer directly addresses the question.

## Rules

- Use the provided context to construct a relevant and natural response.
- The output must be formatted as a JSON object based on two cases:
  - It is possible to answer based on the context

  ```json
  {
    "answer": "LLM answer",
    "sources": [
      {
        "url": "based on the most probable sources get the url",
        "title": "based on the most probable sources get the title",
        "content": "based on the most probable sources get the content"
      }
    ]
  }
  ```

- Select the most relevant news articles based on the question.
- If multiple relevant results exist, return them in an array.
- Ensure that the response remains coherent and aligned with the question "{{question}}".
- In case the documents doesn't match the question. Respond that it was not possible to answer the question politely, doesn't need to show the context.

### Question

{question}

### Retrieved Context (News Articles)

{context}
