/**
 * 忽略大小写判断字符串的包含关系
 * @param str1 待判断包含关系的字符串
 * @param str2 需包含的字符
 * @returns {boolean}
 */
export const containsIgnoreCase = (str1, str2) => {
    return str1.toLowerCase().includes(str2.toLowerCase())
}
export const startOrEndWith = (str, checkStr) => {
    return str.startsWith(checkStr) || str.endsWith(checkStr)
}
export const highlightString = (str, start, end) => {
    return str.substring(0, start) + '\v' + str.substring(start, end + 1) + '\b' + str.substring(end + 1)
}
export const encodeHtmlSource = (str) => {
    let encodeHTMLRules = {

            "\v": '<b>',
            "\b": '</b>'
        },
        matchHTML = /&(?!#?\w+;)|<|>|"|'|\/|[\v]|[\b]/g;
    return str ? str.replace(matchHTML, function (m) {
        return encodeHTMLRules[m] || m;
    }) : str;
}
export const formatDate = (timestamp) => {
    // 创建 Date 对象
    const date = new Date(timestamp);

// 获取各个部分的信息
    const year = date.getFullYear();
    const month = date.getMonth() + 1; // 月份是从 0 开始的，需要加 1
    const day = date.getDate();
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const seconds = date.getSeconds();
    const formattedDate = `${year}-${padZero(month)}-${padZero(day)} ${padZero(hours)}:${padZero(minutes)}:${padZero(seconds)}`;

    function padZero(number) {
        return number < 10 ? `0${number}` : number;
    }
    return formattedDate
}
