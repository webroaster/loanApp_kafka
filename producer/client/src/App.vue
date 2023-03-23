<script setup lang="ts">
import { ref } from "vue"
import axios from "./axios-config"

const username = ref("")
const response = ref("")

const loanSend = async () => {
  if (username.value === "") {
    alert("名前を入力してください。")
  }
  const requestBody = {
    username: username.value,
  }
  const res = await axios.post("/send", requestBody)
  response.value = res.data.message

  console.log(res.data.message)
}
</script>

<template>
  <h1>ローン申請</h1>
  <div v-if="response">
    <p class="response-message">{{ response }}</p>
  </div>
  <form @submit.prevent="loanSend" v-else>
    <label for="username">ユーザー名</label>
    <input
      type="text"
      id="username"
      v-model="username"
      placeholder="username"
    />
    <button>申請する</button>
  </form>
</template>

<style scoped>
form {
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 700px;
  margin: 30px auto;
}
label {
  text-align: left;
  font-weight: bold;
  font-size: 16px;
}
input {
  padding: 0.8em;
  border-radius: 5px;
  font-size: 16px;
  border: none;
  margin-bottom: 1em;
  background: #eee;
}
button {
  width: 100%;
  margin: 0;
}
.response-message {
  font-size: 16px;
  font-weight: bold;
}
</style>
