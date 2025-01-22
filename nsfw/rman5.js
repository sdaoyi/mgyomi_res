const mangayomiSources = [{
    "name": "肉漫屋",
    "lang": "zh",
    "baseUrl": "https://rman5.com",
    "apiUrl": "",
    "iconUrl": "https://rman5.com/imgs/logo_black.png",
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
        const res = await new Client().get(url)
        const doc = new Document(res.body);
        const items = []
        const elements = doc.select('li.hl-list-item')
        for (const element of elements) {
            items.push({
                name: element.select('a')[0].attr('title'),
                imageUrl: element.select('a')[0].attr('data-original'),
                link: element.select('a')[0].attr('href')
            })
        }
        return {items:items,hasNextPage:true}
    }

    getHeaders(url) {
        throw new Error("getHeaders not implemented");
    }
    async getPopular(page) {
        const popUrl = baseUrl + `/bookcatalog/all/ob/hits/st/all/page/${page}`
        const result=await this.getItems(popUrl)
        return {
            list: result.items,
            hasNextPage: result.hasNextPage
        };
    }
    async getLatestUpdates(page) {
        const updateUrl = baseUrl + `/bookcatalog/all/ob/time/st/all/page/${page}`
        const result=await this.getItems(updateUrl)
        return {
            list: result.items,
            hasNextPage: result.hasNextPage
        };

    }
    async search(query, page, filters) {
        const searchUrl = baseUrl + `/cata.php?key=${query}`
        const result=await this.getItems(searchUrl)
        return {
            list:  result.items,
            hasNextPage: false
        }
    }
    async getDetail(url) {
        const detailUrl = baseUrl + url
        const res = await new Client().get(detailUrl, headers)
        const doc = new Document(res.body)
        const name = doc.select('h1.hl-dc-title')[0].text
        const detail_cover = doc.select('div.hl-dc-pic>span')[0].attr('data-original')
        const detail_desc = doc.select('div.hl-data-xs>span')[3].text
        const detail_author = doc.select('div.hl-data-xs>span')[1].select('a')[0].text
        const detail_tags = doc.select('span.hl-ma0>font>a').map(e => e.text)
        const detail_status = Util.checkStatus(doc.select('div.hl-data-xs>span')[0].text)
        const chapter_list = doc.select('a.module-play-list-link')
        const chapters = []
        for (const li of chapter_list) {
            chapters.push({ name: li.attr('title'), url: li.attr('href') })
        }

        return {
            name: name,
            imageUrl: detail_cover,
            description: detail_desc,
            author: detail_author,
            genre: detail_tags,
            status: detail_status,
            episodes: chapters.reverse()
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
