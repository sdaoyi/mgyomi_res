const mangayomiSources = [{
    "name": "韩漫推荐",
    "lang": "zh",
    "baseUrl": "https://www.hanmant.com",
    "apiUrl": "",
    "iconUrl": "https://www.hanmant.com/favicon.ico",
    "typeSource": "single",
    "isManga": true,
    "isNsfw": true,
    "version": "0.0.1",
    "dateFormat": "",
    "dateFormatLocale": "",
    "pkgPath": "",
    "userAgent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1 Edg/127.0.0.0"
}];

const headers = { 'referer': mangayomiSources[0]['baseUrl'], 'user-agent': mangayomiSources[0]['userAgent'] };

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
    static pureString(str){
        return str.replace(/(\r\n|\n)/g, ' ').replace(/\s+/g,' ')
    }
}

class DefaultExtension extends MProvider {
    async getItems(url) {
        const res = await new Client().get(url, headers)
        const doc = new Document(res.body);
        const items = []
        const elements = doc.select('ul.u_list>li')
        for (const element of elements) {
            const name = element.select('div.neirong>a')[0].text
            const link = element.select('div.neirong>a')[0].attr('href')
            const imageUrl = element.select('div.pic>a')[0].select('img')[0].attr('src')
            items.push({
                name: name,
                imageUrl: imageUrl,
                link: mangayomiSources[0]['baseUrl'] + link
            })
        }

        return { items: items, hasNextPage: false }
    }

    getHeaders(url) {
        throw new Error("getHeaders not implemented");
    }
    async getPopular(page) {
        const baseUrl = mangayomiSources[0]['baseUrl']
        const popUrl = baseUrl + "/index.php/custom/hot"
        const result = await this.getItems(popUrl)

        return {
            list: result.items,
            hasNextPage: result.hasNextPage
        }
    }
    async getLatestUpdates(page) {
        const baseUrl = mangayomiSources[0]['baseUrl']
        const updateUrl = baseUrl + "/index.php/custom/update"
        const result = await this.getItems(updateUrl)

        return {
            list: result.items,
            hasNextPage: result.hasNextPage
        };

    }

    async search(query, page, filters) {
        const baseUrl = mangayomiSources[0]['baseUrl']
        const searchUrl = baseUrl + `/index.php/search/${query}/${page}`
        const result = await this.getItems(searchUrl)

        return {
            list: result.items,
            hasNextPage: true
        };
    }
    async getDetail(url) {
        //   https://www.hanmant.com/index.php/comic/zhegongsiguiwole
        const res = await new Client().get(url, headers)
        const doc = new Document(res.body)

        const name = doc.select('div.title')[0].text.trim()
        const detail_cover = doc.select('div.info>div.img>img')[0].attr('src')
        const detail_desc = doc.select('div.text')[0].text
        const detail_author = doc.select('div.info>p.tage')[1].text

        const item_list = doc.select('div.listbox>ul.list>li>a')
        const chapters = []
        for (const li of item_list) {
            chapters.push({ name: li.text, url: mangayomiSources[0]['baseUrl'] + li.attr('href') })
        }

        return {
            name: name,
            imageUrl: detail_cover,
            description: detail_desc,
            author: detail_author,
            status: 5,
            episodes: chapters.reverse()
        }
    }

    // For anime episode video list
    async getPageList(url) {

        const res = await new Client().get(url, headers)
        const doc = new Document(res.body)
        const picUrls = doc.select('div.chapterbox>li>img').map(e => e.attr('src'))
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
