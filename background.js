/**
 * 储存标签
 * @type {*[]}
 */
let tabs = []
/**
 * 插件icon的颜色
 * @type {{color: number[]}}
 */
let badgeColor = {color: [255, 192, 203, 255]};

/**
 * 初始化插件的badge
 */
const initBadgeIcon = () => {
    chrome.action.setBadgeBackgroundColor(badgeColor);
    updateBadgeText()
}
/**
 * 更新插件icon上的文本
 */
const updateBadgeText = () => {
    chrome.action.setBadgeText({text: tabs.length + ''});
}
const updateTabOrderToFirst = (tab) => {
    console.log('update2First:', tab)
    let firstTab = undefined
    for (let i = 0; i < tabs.length; i++) {
        if (tab && tabs[i] && tab.tabId === tabs[i].id) {
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
                sendResponse({tabs: tabs})
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
        console.log('onRemoved:', tab)
        if (tab && tabs) {
            for (let i = 0; i < tabs.length; i++) {
                if (tabs[i].id === tab) {
                    tabs.splice(i, 1)
                }
            }
        }
        updateBadgeText()

    })
    chrome.tabs.onUpdated.addListener(() => {
        console.log('onUpdated')
    })
    chrome.tabs.onActivated.addListener((tab) => {
        console.log('onActivated:when tab happen switch,the event is invoked')
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
                tabs.push(tabArr[j])
            }
        }
        updateBadgeText()
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
