/**
 * 忽略大小写判断字符串的包含关系
 * @param str1 待判断包含关系的字符串
 * @param str2 需包含的字符
 * @returns {boolean}
 */
export const containsIgnoreCase = (str1, str2) => {
    return str1.toLowerCase().includes(str2.toLowerCase())
}
