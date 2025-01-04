const mangayomiSources = [{
    "name": "鸟鸟韩漫",
    "lang": "zh",
    "baseUrl": "https://nnhanman7.com",
    "apiUrl": "",
    "iconUrl": "https://nnhanman7.com/images/logo.png",
    "typeSource": "single",
    "isManga": true,
    "isNsfw": true,
    "version": "0.0.1",
    "dateFormat": "",
    "dateFormatLocale": "",
    "pkgPath": "",
    "userAgent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1 Edg/127.0.0.0"
}];

const baseUrl = mangayomiSources[0]['baseUrl']
const headers = { 'referer': baseUrl, 'user-agent': mangayomiSources[0]['userAgent'] };

class Util {
    static decodeZH(str) {
        const byteArray = new Uint8Array(
            Array.from(str).map(char => char.charCodeAt(0))
        );
        const correctText = Util.utf8Decode(byteArray);
        return correctText
    }
    static utf8Decode(bytes) {
        let string = '';
        let i = 0;

        while (i < bytes.length) {
            let byte1 = bytes[i++];
            if (byte1 < 0x80) {
                string += String.fromCharCode(byte1);
            } else if (byte1 < 0xE0) {
                let byte2 = bytes[i++];
                string += String.fromCharCode(((byte1 & 0x1F) << 6) | (byte2 & 0x3F));
            } else if (byte1 < 0xF0) {
                let byte2 = bytes[i++];
                let byte3 = bytes[i++];
                string += String.fromCharCode(((byte1 & 0x0F) << 12) | ((byte2 & 0x3F) << 6) | (byte3 & 0x3F));
            } else {
                let byte2 = bytes[i++];
                let byte3 = bytes[i++];
                let byte4 = bytes[i++];
                let codePoint = (((byte1 & 0x07) << 18) | ((byte2 & 0x3F) << 12) | ((byte3 & 0x3F) << 6) | (byte4 & 0x3F)) - 0x10000;
                string += String.fromCharCode(0xD800 + (codePoint >> 10), 0xDC00 + (codePoint & 0x3FF));
            }
        }

        return string;
    }
    static checkStatus(str) {
        switch (true) {
            case /(.*连载.*|.*連載.*|.*ongoing.*)/i.test(str):
                return 0
            case /(.*完结.*|.*完結.*|.*complete.*)/i.test(str):
                return 1
            case /(.*请假.*|.*請假.*|.*hiatus.*)/i.test(str):
                return 2
            case /(.*取消.*|.*取消.*|.*canceled.*)/i.test(str):
                return 3
            case /(.*出版.*|.*出版.*|.*publishingFinished.*)/i.test(str):
                return 4
            default:
                return 5
        }
    }
    static pureString(str) {
        return str.replace(/(\r\n|\n)/g, ' ').replace(/\s+/g, ' ')
    }
}

class DefaultExtension extends MProvider {
    async getItems(url) {
        const res = await new Client().get(url)
        const doc = new Document(res.body);
        const items = []
        const elements = doc.select('ul.col_3_1>li')
        for (const element of elements) {
            items.push({
                name: element.select('a')[0].attr('title'),
                imageUrl: element.select('img')[0].attr('src'),
                link: element.select('a')[0].attr('href')
            })
        }
        return { items:items,hasNextPage:true}
    }

    getHeaders(url) {
        throw new Error("getHeaders not implemented");
    }
    async getPopular(page) {
        const popUrl = baseUrl + `/comics/all/ob/hits/st/all/page/${page}`
        const result=await this.getItems(popUrl)
        return {
            list: result.items,
            hasNextPage: result.hasNextPage
        };
    }
    async getLatestUpdates(page) {
        const updateUrl = baseUrl + `/comics/all/ob/time/st/all/page/${page}`
        const result=await this.getItems(updateUrl)
        return {
            list: result.items,
            hasNextPage: result.hasNextPage
        };

    }
    async searchParseItem(url) {
        const res = await new Client().get(url)
        const doc = new Document(res.body)
        const search_list = doc.select('div.imgBox li>a.ImgA')
        if (search_list.length == 0) {
            return []
        }
        const items = []
        for (const li of search_list) {
            items.push({
                name: li.attr('title'),
                imageUrl: li.select('img')[0].attr('src'),
                link: li.attr('href')
            })
        }
        return items
    }
    async search(query, page, filters) {
        const searchUrl = baseUrl + `/search/${query}/page/${page}`
        return {
            list: await this.searchParseItem(searchUrl),
            hasNextPage: true
        };

    }
    async getDetail(url) {
        const detailUrl = baseUrl + url
        const res = await new Client().get(detailUrl)
        const doc = new Document(res.body)
        const name = doc.select('div#Cover img')[0].attr('title')
        const detail_cover = doc.select('div#Cover img')[0].attr('src')
        const detail_desc = doc.select('p.txtDesc')[0].text
        const detail_author = doc.select('p.txtItme')[0].text
        const detail_status = doc.select('p.txtItme')[2].text

        const chapter_list = doc.select('div#list li>a')
        const chapters = []
        for (const ll of chapter_list) {
            chapters.push({ name: ll.text, url: ll.attr('href') })
        }

        return {
            name: name,
            imageUrl: detail_cover,
            description: detail_desc,
            author: detail_author,
            status: Util.checkStatus(detail_status),
            episodes: chapters
        };

    }
    // For anime episode video list
    async getPageList(url) {
        const pageListUrl = baseUrl + url
        const res = await new Client().get(pageListUrl)
        const doc = new Document(res.body)
        const picList = doc.select('img.lazy')
        const picUrls = []
        for (const p of picList) {
            picUrls.push(p.attr('data-original'))
        }
        return picUrls
    }
    // For manga chapter pages
    async getVideoList(url) {
        throw new Error("getVideoList not implemented");
    }
    getFilterList() {
        throw new Error("getFilterList not implemented");
    }
    getSourcePreferences() {
        throw new Error("getSourcePreferences not implemented");
    }
}
