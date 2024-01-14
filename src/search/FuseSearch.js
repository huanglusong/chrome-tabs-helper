import {AbstractSearch} from "./AbstractSearch";
import {optionConfig} from "../sotre";
import Fuse from "fuse.js";
import {highlightString, encodeHtmlSource,formatDate} from "../util/StringUtils";
export class FuseSearch extends AbstractSearch {
    searchTabArray(tabArray, queryString) {
        if (queryString === '') {
            return tabArray
        }
        let option = {
            includeScore: true,
            includeMatches: true,
            maxPatternLength: 32,
            minMatchCharLength: 1,
            location: 0,
            distance: 1000,
            keys: ['title']
        }
        if (optionConfig.value.show_urls) {
            option.keys.push('url')
        }
        const fuse = new Fuse(tabArray, option)
        let result = fuse.search(queryString)
        let renderArray = []
        result.forEach((resultItem) => {
            let item = JSON.parse(JSON.stringify(resultItem.item))
            resultItem.matches.forEach((match) => {
                let formatted = item[match.key]
                match.indices.forEach((endPoint, i) => {
                    let offset = i * 2;
                    formatted = highlightString(formatted, endPoint[0] + offset, endPoint[1] + offset)
                    item[match.key] = encodeHtmlSource(formatted)
                    item.url = item.url ? item.url : '无url信息'
                })
            })
            if(item.lastVisitTime){
                item.lastVisitTime = formatDate(item.lastVisitTime)
            }
            renderArray.push(item)
        })
        return renderArray
    }
}
export const fuse = new FuseSearch()

