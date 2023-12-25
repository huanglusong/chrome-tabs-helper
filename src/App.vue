<script setup>
import $ from 'jquery';
import {ref, onMounted, nextTick, watch} from 'vue'
import {containsIgnoreCase} from "./util/StringUtils";
import {handleTabFavicon} from "./util/ChromeUtils";

let tabs = ref([])
let renderTabs = ref([])
let searchText = ref('')
let currentFocusIndex = ref(0)
let currentTab = ref(null)
let bgMessagePort = ref(null)
/**
 * 切换标签
 * @param item 需切换至的标签信息
 */
const switchTab = (item) => {
  if (item) {
    chrome.runtime.sendMessage({"action": "switchTabs", "tabId": item.id}, (resp) => {
    })
  }
}
/**
 * 搜索标签
 */
const searchTab = () => {
  // 基于title过滤
  // todo 算法补充
  renderTabs.value = tabs.value.filter((item) => {
    if (!containsIgnoreCase(item.title, searchText.value) && !item.url.includes(searchText.value)) {
      return false;
    } else {
      return true
    }
  })
  // 只要触发搜索就将currentIndex重置
  currentFocusIndex.value = 0
  currentTab.value = renderTabs.value[0]
}
/**
 * 监听搜索框文本的变化，只要值变化就触发searchTab
 *
 */
watch(searchText, (newValue, oldValue) => {
  searchTab()
})
/**
 * 页面焦点切换
 * 焦点的tab项高亮且支持enter后切换
 */
const toggleFocus = (offset) => {
  let newIndex = offset + currentFocusIndex.value
  if (newIndex >= 0 && newIndex < renderTabs.value.length) {
    currentFocusIndex.value = newIndex
    currentTab.value = renderTabs.value[newIndex]
    scrollToFocus()
  }
}
/**
 * 手动控制滚轮位置
 * 使用nextTick确保在vue渲染完毕后再执行
 */
const scrollToFocus = () => {
  nextTick(() => {
    let element = $('.tab-with-focus')
    if (element.length > 0) {
      // 元素的位置：相对于document的位置，可以理解为到window顶部的距离
      const offset = element.offset().top;
      // 滚动触发的预留高度
      // 参数为true则会包含margin
      const elementHeight = element.outerHeight(true) * 2;
      // 滚动条的位置 相对于window顶部的距离
      // 通过scroll的top位置确定当前可视区的起始位置（绝对位置）
      const visibleAreaStart = $(window).scrollTop()
      // 获取窗口的内高度
      let windowHeight = window.innerHeight
      const visibleAreaEnd = visibleAreaStart + windowHeight
      if (elementHeight > visibleAreaEnd - offset) {
        // 阈值设置为两个tab的高度
        window.scroll({top: offset + elementHeight - windowHeight, left: 0, behavior: 'smooth'});
      } else if (offset - elementHeight / 2 < visibleAreaStart) {
        // 阈值设置为一个tab的高度
        window.scroll({top: offset - elementHeight / 2, left: 0, behavior: 'smooth'});
      }
    }

  })
}
/**
 * 初始化标签数据
 * popup需要呈现的tabs中需排除当前tab的信息
 */
const initTabs = () => {
  // 获取当前标签信息
  chrome.tabs.query({currentWindow: true, active: true}, function (tab) {
    let currentTmpTab = tab[0]
    // 初始化标签数据
    chrome.runtime.sendMessage({"action": "updateTabs"}, (resp) => {
      if (resp && resp.tabs) {
        resp.tabs.forEach((item) => {
          if (item.id !== currentTmpTab.id) {
            // favicon的处理
            item.favIconUrl = handleTabFavicon(item)
            tabs.value.push(item)
          }
        })
        tabs.value = resp.tabs.filter((item) => {
          return item.id !== currentTmpTab.id
        })
        renderTabs.value = tabs.value
        currentTab.value = renderTabs.value[0]
      }
    })
  })
}
/**
 * 初始化事件监听器
 * 主要是keydown事件的监听
 */
const initListeners = () => {
  document.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      event.stopPropagation()
      toggleFocus(1)
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      event.stopPropagation()
      toggleFocus(-1)
    } else if (event.key === 'Tab' && !event.shiftKey) {
      event.preventDefault()
      event.stopPropagation()
      toggleFocus(1)
    } else if (event.key === 'Tab' && event.shiftKey) {
      event.preventDefault()
      event.stopPropagation()
      toggleFocus(-1)
    } else if (event.key === 'Enter') {
      event.preventDefault()
      event.stopPropagation()
      switchTab(currentTab.value)
    }
  })
}
onMounted(() => {
  initTabs()
  initListeners()
})

</script>

<template>
  <div class="container">
    <div class="search-box">
      <input class="search-input" autocomplete="off" tabindex="1" autofocus type="text" v-model="searchText"
             placeholder="请输入关键字">
    </div>
    <div class="tab" v-for="(item,index) in renderTabs" @click="switchTab(item)"
         :class="{'tab-with-focus':index === currentFocusIndex}">
      <div class="imgContainer">
        <img class="favio" :src="item.favIconUrl" alt="">
      </div>
      <div class="tab-text">
        <div class="text tab-title"><span>{{ item.title }}</span></div>
        <div class="text"><span class="">{{ item.url ? item.url : '无url信息' }}</span></div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.container {
  display: flex;
  flex-direction: column;
}

.search-box {
  margin: 5px;
}

/*将宽度设置为100%后
  发现子元素的实际宽度比父亲div的还要大
  原因是子元素具有padding和border，其也是占用宽度的
  所以累加起来超过了父div宽度
  解决方案：使用css属性：box-sizing:border
*/
.search-input {
  padding: 8px 5px 7px 5px;
  box-sizing: border-box;
  width: 100%;
  font-size: 12px;
  font-family: "Lucida Grande", Lucida, Verdana, sans-serif;
  outline: none;
  border: none;
  border-bottom: 1px solid #eeeeee;
}

.tab {
  background-color: #eeeeee;
  padding: 5px;
  margin: 5px;
  cursor: pointer;
  display: flex;
}

.tab:hover {
  background-color: #f07775;
  color: white;
}

.tab-with-focus {
  background-color: #f1a2c2 !important;
  color: white;

}

/*
父亲div使用flex布局，宽度为300px
子div1占用16px
子div2要求占满剩余空间
子div2如果原长度达不到占满的长度，则通过使用flex-grow进行延申
子div2如果长度超长，则通过overflow:hidden进行隐藏
*/
.tab-text {
  overflow: hidden;
  flex-grow: 1;
}

/**
父div设置了width，但是子span的宽度却溢出，原因分析:
span元素是一个内联元素，其默认行为是不会占据整个父级容器的宽度
如果span内容很长，是有可能溢出父级容器的
解决方案：
1 将span转换为内联块元素：display: inline-block;
  超出部分隐藏：overflow: hidden;
  关闭文本换行：white-space: nowrap;
  超出部分使用省略号替代：text-overflow: ellipsis;
2 父div中设置子span，在父div上设置1所列举的属性即可，无需做一个内联转内联块的操作
*/

/**
文字过长，将超出的部分使用省略号替代
标准的css写法
*/
.text {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.tab-title {
  font-weight: bold;
}

.imgContainer {
  display: flex;
  justify-content: center;
  align-items: center;
  margin-right: 8px;
}

.favio {
  height: 16px;
  width: 16px;
  padding: 3px;
  background-color: white;
  border-radius: 5px;
}
</style>
