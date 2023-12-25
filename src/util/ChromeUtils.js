/**
 * 封装chrome操作的函数工具包
 *
 */

export const handleTabFavicon = (tab) => {
    if (tab.favIconUrl && (/^https?:\/\/.*/.exec(tab.favIconUrl) || /^data:/.exec(tab.favIconUrl))) {
        return tab.favIconUrl
    } else if (/^chrome:\/\/extensions\/.*/.exec(tab.url)) {
        return '/chrome-extensions-icon.png'
    } else {
        return 'blank.png'
    }
}
