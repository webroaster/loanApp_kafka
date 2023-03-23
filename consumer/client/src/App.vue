<script setup lang="ts">
import { onMounted, ref } from "vue"
import axios from "./axios-config"

const users = ref()
const messages = ref()
const createMsg = ref("")

// DBのデータ取得
const getAllUsers = async () => {
  const res = await axios.get("/getAll")
  users.value = res.data.loan_review
}
onMounted(getAllUsers)

// トピックのメッセージ取得
const getMessages = async () => {
  const res = await axios.get("/getMessage")
  messages.value = res.data
}

// DBに認可済と保存
const createUsers = async (username: string) => {
  const res = await axios.post("/create", {
    username: username,
  })
  createMsg.value = res.data.message
  getAllUsers()
  getMessages()
}
</script>

<template>
  <h1>ローン審査</h1>

  <h3>認証済ユーザー</h3>
  <table>
    <tr>
      <th>ユーザー名</th>
      <th>状態</th>
    </tr>
    <tr v-if="users" v-for="(user, i) in users" :key="i">
      <td>{{ user.username }}</td>
      <td v-if="!user.pending">認証済</td>
    </tr>
  </table>

  <h3>認証待ユーザー</h3>
  <p v-if="createMsg">{{ createMsg }}</p>
  <table>
    <tr v-if="messages" v-for="(message, i) in messages" :key="i">
      <td>{{ message.username }}</td>
      <td><button @click="createUsers(message.username)">認可</button></td>
    </tr>
  </table>
  <div>
    <button @click="getMessages">申請ユーザー取得</button>
  </div>
</template>

<style scoped>
table {
  width: 100%;
  max-width: 700px;
  background: #eee;
  margin: 20px auto;
}
</style>
