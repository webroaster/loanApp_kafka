import { Consumer, KafkaClient, Message } from "kafka-node"
import axios, { AxiosInstance } from "axios"
import fastify, { FastifyInstance } from "fastify"
import cors from "@fastify/cors"
import dotenv from "dotenv"

dotenv.config()

interface User {
  id: number
  username: string
  pending: boolean
}

class LoanConsumer {
  private readonly app: FastifyInstance
  private readonly graphqlClient: AxiosInstance
  private readonly consumer: Consumer
  private readonly client: KafkaClient
  private waitUsers: User[] = []

  constructor() {
    this.app = fastify({ logger: true })
    this.app.register(cors, {
      origin: "*",
    })
    this.graphqlClient = axios.create({
      baseURL: process.env.GRAPHQL_URL,
    })
    this.client = new KafkaClient({
      kafkaHost: process.env.KAFKA_HOST as string,
    })
    this.consumer = new Consumer(
      this.client,
      [{ topic: process.env.TOPIC_LOAN as string, partition: 0 }],
      {
        autoCommit: true,
        fromOffset: true,
      }
    )

    this.app.listen({ port: 3001 }, (err, address) => {
      if (err) {
        this.app.log.error(err)
        process.exit(1)
      } else {
        console.log(`Fastifyサーバー起動中：${address}`)
      }
    })
  }

  public start() {
    this.setConsumer()
    this.setRoutes()
  }

  private setRoutes() {
    // 一覧取得
    this.app.get("/getAll", async (_, reply) => {
      const data = await this.getAllUsers()
      reply.send(data)
    })

    // DBに認証済ユーザーを保存
    this.app.post("/create", async (request, reply) => {
      const body = request.body as User

      const insertQuery = `
      mutation {
        insert_${process.env.TABLE_NAME}(objects: [{
          username: "${body.username}",
          pending: false
        }]) {
          returning {
            id
            username
            pending
          }
          affected_rows
        }
      }
    `
      try {
        const result = await this.graphqlClient.post("", { query: insertQuery })
        if (result.data.errors) {
          reply.send({ message: "申請済です。" })
        } else {
          reply.send({ message: "DBに登録完了" })
        }
      } catch (err) {
        console.error(err)
      }
    })

    // メッセージキューを取得
    this.app.get("/getMessage", async (_, reply) => {
      const dbUsers = await this.getAllUsers()
      // usernameが被っていないユーザーのみ取得
      const topicUsers: User[] = []
      const existingUsernames: any = {}
      this.waitUsers.map((user: User) => {
        if (!existingUsernames[user.username]) {
          existingUsernames[user.username] = true
          topicUsers.push(user)
        }
      })

      const replyUsers = topicUsers.filter((topic: User) => {
        return !dbUsers.loan_review.some(
          (db: User) => db.username === topic.username
        )
      })
      reply.send(replyUsers)
    })
  }

  private setConsumer() {
    this.consumer.on("message", (message: Message) => {
      console.log("メッセージが読み込まれました")
      const waitUser = JSON.parse(message.value as any)
      this.waitUsers.push(waitUser)
    })
    this.consumer.on("error", (err) => {
      console.error(err)
    })
  }

  private async getAllUsers() {
    const query = `
        {
          ${process.env.TABLE_NAME}(order_by: {id: asc}) {
            id
            username
            pending
          }
        }
      `
    const { data } = await this.graphqlClient.post("", { query })
    return data.data
  }
}

const loanConsumer = new LoanConsumer()
loanConsumer.start()
