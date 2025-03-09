# RAG News

## How to Run

The safest way to run this project is by using a Docker container. A `docker-compose.yml` file has been provided to run both of the services proposed in this challenge.

To start the services, simply run:

```sh
docker compose up
```

If you prefer to debug in your on machine then you can run:

For packages:

```sh
npm i
```

For the api that makes possible query the RAG agent

```sh
npm run dev
```

For running the Kafka consumer.

```sh
npm run consumer-dev
```

### Structure

The application was build in two separated services that share some common features.

I chose this way because this service is one Api and one queue consumer. Having in mind tha Javascript is a single thread language, I used this approach in order to take the most from my only thread. So when the kafka messages spikes it will not stole resources form the api. The same is applied to api spikes.

### Services explanations

#### Consumer.ts

The consumer.ts is the responsible for seed the vector database that will be providing data to the RAG.

So the flux is this:

1. A message comes from Kafka (expected payload {url: string, source: string} as it was in the csv, in the beginning of this test I was receiving some messages, but as the time passes I lost the messages and wasn't able to test anymore)
2. An axios get request is made to the url in order to retrieve all HTML that this page provides.
3. With the html content loaded, a virtual JSDOM is created in order retrieve only the body of the HTML content. This is helpful because outside the body is only SEO related content and scripts and styles. So in this way the size of the HTML that the LLM has to treat is reduce by a lot.

- Observation: A point of improvement here, is that the HTML can be more digested in order to remove content that will not be relevant to the reading of the page content.
  Things such as image, svg, iframe, nav, usually tend to not be relevant to the news core content. So it can be removed in order to save some conversation tokens
  
  Another point of improvement can be made by storing the news url as the id of the content. And before the population of the vector database with content a query for this url id is made. If already exists it means that this news was already indexed.

4. So after the html is read and 
