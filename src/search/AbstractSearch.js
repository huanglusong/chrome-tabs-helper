import {startOrEndWith} from "../util/StringUtils";

export class AbstractSearch {

    executeSearch(query,allTabs,allBookmark,searchBookmarkFlag,searchHistoryFlag) {
        const searchHistoryStr = "   ";
        const searchBookmarkStr = "  ";
        const searchTabsBookmarksStr = " ";

        var filteredTabs = [];
        var filteredClosed = [];
        var filteredBookmarks = [];
        if(query.trim().length === 0){
            filteredTabs = allTabs
        }else if (searchHistoryFlag || startOrEndWith(query,searchHistoryStr)){

        }else if (searchBookmarkFlag || startOrEndWith(query,searchBookmarkFlag)){

        }
    }
    searchTabArray(tabArray,queryString){
        throw new Error('Abstract method searchTabArray must be implemented.')
    }
}
