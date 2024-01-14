<template>
  <div class="container">
    <h1 class="header-title">Quick Tabs Options</h1>
    <fieldset>
      <legend>Quick Tabs list window options</legend>
      <table>
        <tr>
          <td colspan="2"><b>Display options:</b></td>
        </tr>
        <tr>
          <td colspan="2" class="checkboxRow">
            <label>
              <input type='checkbox' v-model="qkConfig.show_tab_count"/>
              Show badge tab count
            </label>
          </td>
        </tr>
        <tr>
          <td colspan="2" class="checkboxRow">
            <label>
              <input type='checkbox' v-model="qkConfig.show_urls"/>
              Show badge tab url
            </label>
          </td>
        </tr>
      </table>
    </fieldset>
    <button class="option-btn" @click="applyChange"> apply changes</button>
  </div>
</template>

<script setup>
import {ref, onMounted, toRaw, reactive} from 'vue'

let qkConfig = reactive({
  "show_tab_count": false,
  "show_urls":false
})
onMounted(() => {
  chrome.storage.local.get(null, (res) => {
    qkConfig.show_tab_count = res.show_tab_count
    qkConfig.show_urls = res.show_urls
  })
})

const applyChange = () => {
  console.log('开始改变！！')
  chrome.storage.local.get(null, (res) => {
    let rawConfig = toRaw(qkConfig)
    let saveConfig = Object.assign(res, rawConfig)
    chrome.storage.local.set(saveConfig, function () {
      console.log('Data saved', saveConfig);
    });
  })
}

</script>

<style scoped>
.container {
  display: flex;
  justify-content: start;
  flex-direction: column;
  margin: 50px;
}

.header-title {
  line-height: 32px;
  vertical-align: bottom;
  margin-left: 40px;
}

.option-btn {
  margin: 10px 50px;
  padding: 5px 0;
  background-color: lightblue;
  color: white;
  border-radius: 5px;
  border: none;
  cursor: pointer;
}

.option-btn:hover {
  background-color: skyblue;

}
</style>
