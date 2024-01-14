import {getChromeStorage} from "./src/util/ChromeUtils";
import {debounce} from 'lodash'

/**
 * 延迟函数，可使用lodash的防抖函数_.debounce()
 */

class ShortcutKey {
    constructor(properties) {
        this.ctrl = properties.ctrl || false;
        this.shift = properties.shift || false;
        this.alt = properties.alt || false;
        this.meta = properties.meta || false;
        this.key = properties.key || '';
    }

    pattern = () => {
        return (this.alt ? "alt_" : "")
            + (this.meta ? "meta_" : "")
            + (this.ctrl ? "ctrl_" : "")
            + (this.shift ? "shift_" : "")
            + (this.key);
    }
}

let optionConfig = {
    'debug-flag': false,
    'closed_tabs_size': 10,
    'tab_order_update_delay': 1500,
    'include_dev_tools': false,
    'show_pinned_tabs': false,
    'auto_search_bookmarks': true,
    'show_urls': true,
    'restore_last_searched_str': false,
    'jumpTo_latestTab_onClose': false,
    'closed_tabs_list_save': true,
    'last_searched_str': '',
    'search_type': 'fuseT1',
    'search_urls': true,
    'show_tab_count': true,
    'show_tooltips': true,
    'show_favicons': true,
    'order_tabs_in_window_order': false,
    'order_tabs_by_url': false,
    'debounce_delay': 200,
    'custom_css': '',
    'history_filter': ''
}
let delayTimer = null
chrome.storage.local.get(null, (res) => {
    optionConfig = Object.assign(optionConfig, res)
    chrome.storage.local.set(optionConfig, function () {
        console.log('Data saved', optionConfig);
    });
})

/**
 * 监听值的变化并赋值到全局变量中
 */
chrome.storage.onChanged.addListener(function (changes, namespace) {
    console.log('为新值赋值！！！')
    for (let [key, {oldValue, newValue}] of Object.entries(changes)) {
        console.log(key, oldValue, newValue)
        optionConfig[key] = newValue
        if (key === 'show_tab_count') {
            updateBadgeText()
        }

    }
})

/**
 * 储存标签
 * @type {*[]}
 */
let tabs = []
/**
 * 储存关闭的tab
 * @type {*[]}
 */
let closeTabs = []
/**
 * 储存书签
 * @type {*[]}
 */
let bookmarks = []

/**
 * 插件icon的颜色
 * @type {{color: number[]}}
 */
let badgeColor = {color: [255, 192, 203, 255]};
/**
 * debug时候呈现的颜色
 * @type {{color: number[]}}
 */
let debugBadgeColor = {color: [255, 0, 0, 255]};
/**
 * tab顺序更新任务正在执行时呈现的颜色
 * @type {{color: number[]}}
 */
let tabTimerBadgeColor = {color: [255, 106, 0, 255]};
const loadDebug = () => {
    let debugFlag = localStorage['debugFlag']
    return debugFlag === 'true'
}
let debug = false
getChromeStorage('debug-flag').then((resp) => {
    debug = resp
})

/**
 * 判断是否http的url地址
 * @param url
 * @returns {RegExpExecArray}
 */
const isWebUrl = (url) => {
    return /^https?:\/\/.*/.exec(url)
}

const log = function () {
    if (debug) {
        console.log(...arguments)
    }
}

const validTab = (tab) => {
    return tab && tab.title
}

const includeTab = (tab) => {
    let showDevToolFlag = optionConfig.include_dev_tools
    let showPinnedTabs = optionConfig.show_pinned_tabs
    return !(!showDevToolFlag && /chrome-devtools:\/\//.exec(tab.url)) && !(!showPinnedTabs && tab.pinned)
}
/**
 * 将closedTabs的大小调整到配置的大小
 */
const resizeClosedTabs = () => {
    closeTabs.splice(optionConfig.closed_tabs_list_save)
}
/**
 *
 * @param tabArray
 * @param url
 */
const indexOfTabByUrl = (tabArray, url) => {
    for (let i = 0; i < tabArray.length; i++) {
        if (url === tabArray[i].url) {
            return i
        }
    }
    return -1
}
/**
 * 保存关闭的tab
 */
const saveClosedTabs = () => {
    if (optionConfig.closed_tabs_list_save) {
        debounce(() => {
            chrome.storage.local.set({'closed_tabs': JSON.stringify(closeTabs)})
        }, 10000)
    }
}
/**
 * 移除关闭的tab
 * @param url
 */
const removeClosedTab = (url) => {
    let idx = indexOfTabByUrl(closeTabs, url)
    if (idx > 0) {
        closeTabs.splice(idx, 1)
        saveClosedTabs()
    }
}
/**
 * 新增关闭的tab
 * @param tab
 */
const addClosedTab = (tab) => {
    if (isWebUrl(tab.url)) {
        closeTabs.unshift({url: tab.url, title: tab.title, favIconUrl: tab.favIconUrl})
        saveClosedTabs()
    }
    resizeClosedTabs()
}

/**
 * 根据tabId找到对应的位置
 * @param tabId
 * @returns {number}
 */
const indexOfTab = (tabId) => {
    for (let i = 0; i < tabs.length; i++) {
        if (tabId === tabs[i].id) {
            return i
        }
    }
    return -1
}

/**
 * 初始化插件的badge
 */
const initBadgeIcon = () => {
    let debugFlag = optionConfig["debug-flag"]
    chrome.action.setBadgeBackgroundColor(debugFlag ? debugBadgeColor : badgeColor);
    updateBadgeText()
}
/**
 * 更新插件icon上的文本
 */
const updateBadgeText = () => {
    let showTabCntFlag = optionConfig.show_tab_count
    console.log('showtabcntflag:', showTabCntFlag)
    if (showTabCntFlag) {
        let validTabs = tabs.filter((item) => {
            return validTab(item) && includeTab(item)
        })
        chrome.action.setBadgeText({text: validTabs.length + ''});
    } else {
        chrome.action.setBadgeText({text: ''});
    }
}
/**
 * 更新tab数据到第一个位置很多地方都会触发
 * 包括activated 和 focusChage
 * 但事件的tab参数却不同..
 * 只能做兼容处理
 * @param tab
 */
const updateTabOrderToFirst = (tab) => {
    let tabId = (tab && (tab.id || tab.tabId)) || undefined
    if (tabId === tabs[0].id) {
        return
    }
    let firstTab = undefined
    for (let i = 0; i < tabs.length; i++) {
        if (tab && tabs[i] && tabId === tabs[i].id) {
            firstTab = tabs[i]
            tabs.splice(i, 1)
            tabs.unshift(firstTab)
            break
        }
    }
    if (!firstTab) {
        if (tab.url) {
            tabs.unshift(tab)
        } else {
            console.log('发生了error！！！具体的tab是：', tab)
        }
    }

}
/**
 * tab新增是记录
 * @param tab
 */
const recordTab = (tab) => {
    if (includeTab(tab)) {
        log('record tab!!!', tab.id)
        tabs.push(tab)
    }
}
/**
 * 移除tab
 * @param tabIds
 */
const recordTabRemoved = (tabIds) => {
    for (let i = 0; i < tabIds.length; i++) {
        let tabId = tabIds[i]
        let idx = indexOfTab(tabId)
        if (idx > 0) {
            let closedTab = tabs[idx]
            addClosedTab(closedTab)
            tabs.splice(idx, 1)
            updateBadgeText()
        }
    }
}

const switchTab = () => {

}


/**
 * 初始化监听器 挂载chrome的api的一些事件监听
 */
const initListener = () => {
    /**
     * 如果相应消息的内容是异步获取的，需要先返回true让popup界面强制等待返回结果
     * 参考：
     * https://github.com/mozilla/webextension-polyfill/issues/130
     * https://stackoverflow.com/questions/54126343/how-to-fix-unchecked-runtime-lasterror-the-message-port-closed-before-a-respon
     */
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === 'getTabs') {
            sendResponse({"tabs": tabs})
        } else if (request.action === 'setTabs') {
            tabs = request.tabs
            sendResponse()
        } else if (request.action === 'updateTabs') {
            let queryTabList = []
            let queryTabMap = {}
            let finalTabArray = []
            chrome.windows.getAll({populate: true}, function (windows) {
                for (let i = 0; i < windows.length; i++) {
                    let tabArr = windows[i].tabs
                    for (let j = 0; j < tabArr.length; j++) {
                        queryTabList.push(tabArr[j])
                    }
                }
                queryTabList.forEach((tab) => {
                    if (tab && tab.id) {
                        queryTabMap[tab.id] = tab
                    }
                })
                // 更新标签信息且维持原序
                tabs.forEach((tab) => {
                    if (tab.id && queryTabMap[tab.id]) {
                        finalTabArray.push(queryTabMap[tab.id])
                        delete queryTabMap[tab.id]
                    }
                })
                // 针对未保存标签的处理
                for (let extraTab in queryTabMap) {
                    if (queryTabMap.hasOwnProperty(extraTab)) {
                        finalTabArray.push(queryTabMap[extraTab])
                    }
                }
                tabs = finalTabArray
                sendResponse({tabs: tabs, optionConfig: optionConfig})
                updateBadgeText()
            })
            return true
        } else if (request.action === 'switchTabs') {
            chrome.tabs.get(request.tabId, function (tab) {
                if (!tab.windowId) {
                    console.log('error!!!no windowId', tab)
                    sendResponse()
                }
                chrome.windows.update(tab.windowId, {focused: true}, function () {
                    chrome.tabs.update(request.tabId, {active: true}, function (tab) {
                    });
                    sendResponse()
                });
            });
            return true
        } else if (request.action === 'getHistory') {
            debugger
            chrome.history.search({text: "", maxResults: 1000000000, startTime: 0}, (result) => {
                let historyCache = result.filter((v) => {
                    return v.url && v.title
                })
                console.log('bg中获取history：',{historyCache})
                sendResponse({historyCache})
            })
            return true
        }
    })
    chrome.tabs.onCreated.addListener(function (tab) {
        if (tab.active) {
            if (tabs) {
                tabs.unshift(tab)
            }
        } else {
            tabs.push(tab)
        }
        updateBadgeText()
    })
    chrome.tabs.onRemoved.addListener((tab) => {
        if (tab && tabs) {
            recordTabRemoved([tab])
        }
    })
    chrome.tabs.onUpdated.addListener(() => {
        console.log('onUpdated')
    })
    chrome.tabs.onActivated.addListener((tab) => {
        console.log('onActivated:when tab happen switch,the event is invoked')
        debugger
        updateTabOrderToFirst(tab)
        updateBadgeText()

    })
    chrome.tabs.onReplaced.addListener(() => {
        console.log('onReplaced')
    })
    chrome.windows.onFocusChanged.addListener(function (windowId) {
        console.log('windows:onFocusChanged', windowId)
        if (windowId !== chrome.windows.WINDOW_ID_NONE) {
            chrome.tabs.query({windowId: windowId, active: true}, function (tabArray) {
                console.log('onFocusChanged tab', tabArray);
                if (tabArray && tabArray.length > 0) {
                    updateTabOrderToFirst(tabArray[0])
                    updateBadgeText()
                }
            });
        }
    })
}
/**
 * 初始化tab的数据
 */
const initTabs = () => {
    chrome.windows.getAll({populate: true}, function (windows) {
        for (var i = 0; i < windows.length; i++) {
            let tabArr = windows[i].tabs
            for (var j = 0; j < tabArr.length; j++) {
                recordTab(tabArr[j])
            }
        }
        updateBadgeText()
    })
    // 将当前页面放在最前面
    chrome.tabs.query({currentWindow: true, active: true}, function (tabArray) {
        log('initial selected tab', tabArray);
        updateTabOrderToFirst(tabArray[0])
    })
}
/**
 * 初始化
 */
const init = () => {
    initBadgeIcon()
    initTabs()
    initListener()

}
init()
