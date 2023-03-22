import fastify, { FastifyInstance } from "fastify"
import cors from "@fastify/cors"
import kafka, { KafkaClient, Producer } from "kafka-node"
import dotenv from "dotenv"
import axios, { AxiosInstance } from "axios"

dotenv.config()

interface User {
  id: number
  username: string
  pending: boolean
}

class LoanProducer {
  private readonly app: FastifyInstance
  private readonly client: KafkaClient
  private readonly producer: Producer
  private readonly graphqlClient: AxiosInstance

  constructor() {
    this.app = fastify({ logger: true })
    this.client = new kafka.KafkaClient({
      kafkaHost: `${process.env.KAFKA_HOST}`,
    })
    this.producer = new kafka.Producer(this.client, {
      partitionerType: 1,
    })
    this.graphqlClient = axios.create({
      baseURL: `${process.env.GRAPHQL_URL}`,
    })
  }

  public async start() {
    this.registerPlugins()
    this.setRoutes()
    this.setProducer()
    this.app.listen({ port: 3000 }, (err, address) => {
      if (err) {
        this.app.log.error(err)
        process.exit(1)
      } else {
        console.log(`Fastifyサーバー起動中：${address}`)
      }
    })
  }

  private registerPlugins() {
    this.app.register(cors, {
      origin: "*",
    })
  }

  private setRoutes() {
    this.app.post("/send", async (request, reply) => {
      // 認可済かどうかチェック
      const user = request.body as User
      const getAllQuery = `
        {
          ${process.env.TABLE_NAME}(order_by: {id: asc}) {
            id
            username
            pending
          }
        }
      `
      const { data } = await this.graphqlClient.post("", { query: getAllQuery })

      const isSameUser = data.data.loan_review.some(
        (existingUser: User) => existingUser.username === user.username
      )

      if (!isSameUser) {
        const payload = [
          {
            topic: `${process.env.TOPIC_LOAN}`,
            messages: JSON.stringify(request.body),
          },
        ]
        this.producer.send(payload, async (err, data) => {
          if (err) console.log(err)
          else {
            console.log("データをKafkaに格納")
          }
        })
        return reply.send({ message: "申請されました。" })
      } else {
        return reply.status(201).send({ message: "既に認可されています。" })
      }
    })
  }

  private setProducer() {
    this.producer.on("ready", () => {
      console.log("プロデューサー起動")
    })

    this.producer.on("error", (err) => console.log(err))
  }
}

const loanProducer = new LoanProducer()
loanProducer.start()
