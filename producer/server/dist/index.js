"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fastify_1 = __importDefault(require("fastify"));
const cors_1 = __importDefault(require("@fastify/cors"));
const kafka_node_1 = __importDefault(require("kafka-node"));
const dotenv_1 = __importDefault(require("dotenv"));
const axios_1 = __importDefault(require("axios"));
dotenv_1.default.config();
class LoanProducer {
    constructor() {
        this.app = (0, fastify_1.default)({ logger: true });
        this.client = new kafka_node_1.default.KafkaClient({
            kafkaHost: `${process.env.KAFKA_HOST}`,
        });
        this.producer = new kafka_node_1.default.Producer(this.client, {
            partitionerType: 1,
        });
        this.graphqlClient = axios_1.default.create({
            baseURL: `${process.env.GRAPHQL_URL}`,
        });
    }
    async start() {
        this.registerPlugins();
        this.setRoutes();
        this.setProducer();
        this.app.listen({ port: 3000 }, (err, address) => {
            if (err) {
                this.app.log.error(err);
                process.exit(1);
            }
            else {
                console.log(`Fastifyサーバー起動中：${address}`);
            }
        });
    }
    registerPlugins() {
        this.app.register(cors_1.default, {
            origin: "*",
        });
    }
    setRoutes() {
        this.app.post("/send", async (request, reply) => {
            // 認可済かどうかチェック
            const user = request.body;
            const getAllQuery = `
        {
          ${process.env.TABLE_NAME}(order_by: {id: asc}) {
            id
            username
            pending
          }
        }
      `;
            const { data } = await this.graphqlClient.post("", { query: getAllQuery });
            const isSameUser = data.data.loan_review.some((existingUser) => existingUser.username === user.username);
            if (!isSameUser) {
                const payload = [
                    {
                        topic: `${process.env.TOPIC_LOAN}`,
                        messages: JSON.stringify(request.body),
                    },
                ];
                this.producer.send(payload, async (err, data) => {
                    if (err)
                        console.log(err);
                    else {
                        console.log("データをKafkaに格納");
                    }
                });
                return reply.send({ message: "申請されました。" });
            }
            else {
                return reply.status(201).send({ message: "既に認可されています。" });
            }
        });
    }
    setProducer() {
        this.producer.on("ready", () => {
            console.log("プロデューサー起動");
        });
        this.producer.on("error", (err) => console.log(err));
    }
}
const loanProducer = new LoanProducer();
loanProducer.start();
