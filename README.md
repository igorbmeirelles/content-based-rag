# RAG News

We are live at

```sh
https://rag.igormeirelles.dev/agent
```

send a POST with

```json
{
    "query": "news on AI" 
}
```

## How to Run

The safest way to run this project is using a Docker container. A `docker-compose.yml` file has been provided to run both services proposed in this challenge.

TTo start the services, run the following command:

```sh
docker compose up
```

If you prefer to debug on your own machine then you can run:

For packages:

```sh
npm i
```

For the API that makes it possible to query the RAG agent

```sh
npm run dev
```

You can then test the endpoint with a post call to

```sh
http://127.0.0.1/agent
```

using this body

```json
{
    "query": "news on AI" 
}
```

For running the Kafka consumer.

```sh
npm run consumer-dev
```

my envs. Add the kafka service one

```sh
PINECONE_API_KEY=pcsk_3ZaCMr_12psKchTLGAnDbp3GoxiKSaQCyVniR5bA3xpe8AFKY1FJ2CY5iYXF3msB8Rbr3C
GEMINI_API_KEY=AIzaSyA8PDrZrvwrhHs41E5ZV6xuZKMcQmH0Dyg
LANGFUSE_SECRET_KEY="sk-lf-93378e5c-b1b6-450f-9b73-68996ddef8eb"
LANGFUSE_PUBLIC_KEY="pk-lf-4413815c-6312-4315-b6f8-7b20a13d4957"
LANGFUSE_HOST="https://us.cloud.langfuse.com"a
```

### Question

- When asking "Summarize this article: [insert link]" If the article is not on the rag database I have to answer I can answer about it or should I bring an answer? Since the LLM is learning to respond to a context, maybe makes more sense to respond I can't answer about it.
  The version that handles links is not hard to implement, it is all settled in the idea of preprocess the question. When preprocessing the question I can ask if it is a link analysis or a data query. In case of link analysis I run the function that fetches and read the link. Then I add to my database, and finally I answer the question.
  
  There is a tricky part on this link analysis, because, the link is already in my vector storage? If it is I don't need to question the link. So the link analysis can be a post processing handler, because if the response it is a negative response and it is a link analysis I go to link and read what it is present on the link.

  This approach might be better because I save some tokens on process all the content on the link.

### Structure

The application was built in two separated services that share some common features.

I chose this way because this service is one Api and one queue consumer. Having in mind tha Javascript is a single thread language, I used this approach in order to take the most from my only thread. So when the kafka messages spikes it will not steal resources from the API. The same is applied to api spikes.

### Services explanations

#### Consumer.ts

The consumer.ts file is responsible for seeding the vector database that will be providing data to the RAG.

So the workflow is as follows::

1. A message comes from Kafka (expected payload {url: string, source: string} as it was in the csv, in the beginning of this test I was receiving some messages, but as the time passes I lost the messages and wasn't able to test anymore)
2. An axios get request is made to the url in order to retrieve all HTML that this page provides.
3. With the html content loaded, a virtual JSDOM is created in order retrieve only the body of the HTML content. This is helpful because outside the body is only SEO related content and scripts and styles. So in this way the size of the HTML that the LLM has to treat is reduce by a lot.

- Observation: A point of improvement here, is that the HTML can be more filtered in order to reduce the amount of tokens spent.By removing content that hasn't relevancy to the page content.
  Things such as image, svg, iframe, nav, usually tend to not be relevant to the news core content. So it can be removed in order to save some conversation tokens
  
  Another point of improvement can be made by storing the news url as the id of the content. Before populating the vector database, a query for this URL ID is performed. If already exists it means that this news was already indexed.

  Some articles were not able to be embedded due to the size of the HTML content. The approach of cleaning unnecessary tags solves this problem.

4. So after the html is read and extracted in a structured way. I pass the content in a text splitter which will break my text in smaller chunks in order to be better fetched. Each smaller chunk is then sended to a embedding model and then stored on a vector database.

#### Api server

This service is responsible for user questions handling. Since it will be responsible for the RAG research.

It was made like thie:

1. The user sends a query to the service via (GraphQL or raw endpoint).
2. The service then receives this query and transforms into a embedding
3. The embedding is then passed through the vector database in order to bring the most relevant ones.
4. With the content retrieved, The context is passed through the LLM in order to get a suitable answer for the user question.
5. The LLM answer is then retrieved as structured json for the user response.

- Observation: There is no much to do in this structure by cached query/answer. Since all the news are based on the vector database, and are not accessible by sql queries for example. Store the question with the answer as payload would only bring a delayed response to the user and this response will not be updated by the new created articles.

  On the user input on the other hand, some improvements can be made. Things such as breaking the user query into similar ones, bringing other perspectives to what the user wants, giving more context to the LLM answer.
  Other techniques of querying can also be used, such as: Decomposition, Step back, and RAG Fusion.,

#### Bonus points?

[x] Use structured output.

[x] Use GraphQL with Yoga to implement the API.

[x] Implement techniques to improve quality, cost, or response time. At least describing them in the [README.md](http://README.md) is a requirement. (I describe some)

[x] Integrate Langfuse for enhanced monitoring and debugging.

[] Add response streaming to improve user experience. (A little bit more of time and I can do it)

#### Overtime tasks

- I changed the way embeddings were generated by adding the article's date, which is an interesting factor to consider.

  When I change the embedding I was able to answer things like what happened last month.

  An also good way to approach this is to ask the llm for date filters and then retrieve the question + filters.

  It is also a hard approach to cache since a different date can be passed all the time
  but with a high confidence like 99% might be valid

- I made another round of database population adding new articles I was able to respond to Justin Trudeau

- I create a docker-compose and docker files

- I made deploy on Render
