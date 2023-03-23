"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const kafka_node_1 = require("kafka-node");
const axios_1 = __importDefault(require("axios"));
const fastify_1 = __importDefault(require("fastify"));
const cors_1 = __importDefault(require("@fastify/cors"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
class LoanConsumer {
    constructor() {
        this.waitUsers = [];
        this.app = (0, fastify_1.default)({ logger: true });
        this.app.register(cors_1.default, {
            origin: "*",
        });
        this.graphqlClient = axios_1.default.create({
            baseURL: process.env.GRAPHQL_URL,
        });
        this.client = new kafka_node_1.KafkaClient({
            kafkaHost: process.env.KAFKA_HOST,
        });
        this.consumer = new kafka_node_1.Consumer(this.client, [{ topic: process.env.TOPIC_LOAN, partition: 0 }], {
            autoCommit: true,
            fromOffset: true,
        });
        this.app.listen({ port: 3001 }, (err, address) => {
            if (err) {
                this.app.log.error(err);
                process.exit(1);
            }
            else {
                console.log(`Fastifyサーバー起動中：${address}`);
            }
        });
    }
    start() {
        this.setConsumer();
        this.setRoutes();
    }
    setRoutes() {
        // 一覧取得
        this.app.get("/getAll", async (_, reply) => {
            const data = await this.getAllUsers();
            reply.send(data);
        });
        // DBに認証済ユーザーを保存
        this.app.post("/create", async (request, reply) => {
            const body = request.body;
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
    `;
            try {
                const result = await this.graphqlClient.post("", { query: insertQuery });
                if (result.data.errors) {
                    reply.send({ message: "申請済です。" });
                }
                else {
                    reply.send({ message: "DBに登録完了" });
                }
            }
            catch (err) {
                console.error(err);
            }
        });
        // メッセージキューを取得
        this.app.get("/getMessage", async (_, reply) => {
            const dbUsers = await this.getAllUsers();
            // usernameが被っていないユーザーのみ取得
            const topicUsers = [];
            const existingUsernames = {};
            this.waitUsers.map((user) => {
                if (!existingUsernames[user.username]) {
                    existingUsernames[user.username] = true;
                    topicUsers.push(user);
                }
            });
            const replyUsers = topicUsers.filter((topic) => {
                return !dbUsers.loan_review.some((db) => db.username === topic.username);
            });
            reply.send(replyUsers);
        });
    }
    setConsumer() {
        this.consumer.on("message", (message) => {
            console.log("メッセージが読み込まれました");
            const waitUser = JSON.parse(message.value);
            this.waitUsers.push(waitUser);
        });
        this.consumer.on("error", (err) => {
            console.error(err);
        });
    }
    async getAllUsers() {
        const query = `
        {
          ${process.env.TABLE_NAME}(order_by: {id: asc}) {
            id
            username
            pending
          }
        }
      `;
        const { data } = await this.graphqlClient.post("", { query });
        return data.data;
    }
}
const loanConsumer = new LoanConsumer();
loanConsumer.start();
