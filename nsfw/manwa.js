const mangayomiSources = [{
    "name": "漫蛙",
    "lang": "zh",
    "baseUrl": "https://manwa.fun",
    "apiUrl": "",
    "iconUrl": "https://manwa.fun/favicon.ico",
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
        return str.replace(/(\r\n|\n)/g, ' ').replace(/\s+/g, ' ').trim()
    }
}

class DefaultExtension extends MProvider {
    async getItems(url) {
        const res = await new Client().get(url, headers)
        const doc = new Document(res.body);
        const items = []
        const elements = doc.select('ul.manga-list-2>li')
        for (const element of elements) {
            const name = element.select('a')[0].attr('title')
            const link =  element.select('a')[0].attr('href')
            const imageUrl =  element.select('img')[0].attr('src')
            items.push({
                name: name,
                imageUrl: imageUrl,
                link: baseUrl + link
            })
        }

        return { items: items, hasNextPage: true }
    }

    getHeaders(url) {
        throw new Error("getHeaders not implemented");
    }
    async getPopular(page) {
        const popUrl = baseUrl + `/booklist?tag=&end=&gender=-1&has_full=-1&area=&sort=-1&level=-1&page=${page}`
        const result = await this.getItems(popUrl)

        return {
            list: result.items,
            hasNextPage: result.hasNextPage
        }
    }
    async getLatestUpdates(page) {
        const updateUrl = baseUrl + `/booklist?tag=&end=&gender=-1&has_full=-1&area=&sort=2&level=-1&page=${page}`
        const result = await this.getItems(updateUrl)

        return {
            list: result.items,
            hasNextPage: result.hasNextPage
        };

    }

    async search(query, page, filters) {
        const searchUrl = baseUrl + `/search?keyword=${query}&page=${page}`
        const result = await this.searchGetItems(searchUrl)
        return {
            list: result.items,
            hasNextPage: result.hasNextPage
        };
    }
    async searchGetItems(url){
        const res=await new Client().get(url,headers)
        const doc=new Document(res.body)
        const elements=doc.select("ul.book-list>li>div.book-list-cover> a")
        const items=[]
        for (const element of elements){
            const name=element.attr('title')
            const link=element.attr('href')
            const imageUrl=element.select("img")[0].attr('data-original')
            items.push({
                name: name,
                imageUrl: imageUrl,
                link: baseUrl + link
            })
        }

     return { items: items, hasNextPage: true }
    }
    async getDetail(url) {
        //   https://mhtt7.com/manhuayuedu/1717.html
        const res = await new Client().get(url, headers)
        const doc = new Document(res.body)

        const name = doc.select('h1.detail-main-info-title')[0].text
        const detail_cover = doc.select('div.detail-main-cover>img')[0].attr('data-original')
        const detail_desc = doc.select('p.detail-desc')[0].text
        const detail_tags=doc.select('div.detail-main-info-class>a>span').map(v=>v.text)
        const detail_author = doc.select('span.detail-main-info-value')[0].text
        const detail_status = doc.select('span.detail-main-info-value')[1].text

        const elements = doc.select('ul#detail-list-select>li>a')
        const chapters = []
        for (const element of elements) {
            chapters.push({ name: Util.pureString(element.text), url: baseUrl + element.attr('href') })
        }

        return {
            name: name,
            imageUrl: detail_cover,
            description: detail_desc,
            author: Util.pureString(detail_author),
            genre: detail_tags,
            status: Util.checkStatus(detail_status),
            episodes: chapters.reverse()
        }
    }

    // For anime episode video list
    async getPageList(url) {

        const res = await new Client().get(url, headers)
        const doc = new Document(res.body)
        const picUrls = doc.select('div.img-content>img').map(e => e.attr('data-r-src'))
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
