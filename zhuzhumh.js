const mangayomiSources = [{
    "name": "猪猪漫画",
    "lang": "zh",
    "baseUrl": "https://www.zhuzhumh.com",
    "apiUrl": "",
    "iconUrl": "https://asset.zhuzhumh.com/asset/default/img/logo.png",
    "typeSource": "single",
    "isManga": true,
    "isNsfw": false,
    "version": "0.0.1",
    "dateFormat": "",
    "dateFormatLocale": "",
    "pkgPath": "",
    "userAgent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1 Edg/127.0.0.0"
}];

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
}

class DefaultExtension extends MProvider {
    async getItems(url) {
        const res = await new Client().get(url)
        const doc = new Document(res.body);
        const items = []
        const elements = doc.select('div.cy_list_mh>ul')
        for (const element of elements) {
            const name = element.select('li')[0].select('img')[0].attr('alt')
            const link = element.select("li")[0].select('a')[0].attr('href')
            const imageUrl = element.select('li')[0].select('img')[0].attr('src')
            items.push({
                name: name,
                imageUrl: imageUrl,
                link: link
            })
        }
        const pageArea = doc.select('div.NewPages>ul>li>a')
        return { items: items, hasNextPage: pageArea.some(e => e.text === '下一页') }
    }

    getHeaders(url) {
        throw new Error("getHeaders not implemented");
    }
    async getPopular(page) {
        const baseUrl = mangayomiSources[0]['baseUrl']
        let popUrl = baseUrl + `/rank/4-${page}.html`
        const result = await this.getItems(popUrl)

        return {
            list: result.items,
            hasNextPage: result.hasNextPage
        }
    }
    async getLatestUpdates(page) {
        const baseUrl = mangayomiSources[0]['baseUrl']
        const updateUrl = baseUrl + `/rank/5-${page}.html`
        const result = await this.getItems(updateUrl)

        return {
            list: result.items,
            hasNextPage: result.hasNextPage
        };

    }

    async search(query, page, filters) {
        const baseUrl = mangayomiSources[0]['baseUrl']
        const searchUrl = baseUrl + `/search.html?keyword=${query}`
        const result = await this.getItems(searchUrl)

        return {
            list: result.items,
            hasNextPage: false
        };
    }
    async getDetail(url) {
        //   https://www.zhuzhumh.com/book/wodenvpengyouyoudianqiguaidanshihenkeai.html
        const res = await new Client().get(url)
        const doc = new Document(res.body)

        const name = doc.select('div#intro_l>div.cy_title>h1')[0].text.trim()
        const detail_cover = doc.select('div#intro_l>div.cy_info_cover>img')[0].attr('src')
        const detail_desc = doc.select('p#comic-description')[0].text
        const detail_author = doc.select('div#intro_l>div.cy_xinxi>span')[0].text
        const detail_status = doc.select('div#intro_l>div.cy_xinxi>span')[1].text

        const item_list = doc.select('ul#mh-chapter-list-ol-0 >li >a')
        const chapters = []
        for (const li of item_list) {
            chapters.push({ name: li.text, url: li.attr('href') })
        }
        const apiChapter = []
        const bookID = url.match(/\/(\w*)\.html/)[1]
        const apiURL = `https://www.zhuzhumh.com/api/bookchapter?id=${bookID}&id2=1`
        const resApi = await new Client().get(apiURL)
        for(const r of JSON.parse(resApi.body)){
            apiChapter.push({name:r.chaptername,url:r.chapterurl})
        }
        return {
            name: name,
            imageUrl: detail_cover,
            description: detail_desc,
            author: detail_author,
            status: Util.checkStatus(detail_status),
            episodes: [...chapters,...apiChapter]
        }
    }

    // For anime episode video list
    async getPageList(url) {

        const res = await new Client().get(url)
        const doc = new Document(res.body)
        const picUrls = []
        const onePageImageUrl = doc.select('img.lazy').map(e => e.attr('src'))
        picUrls.push(...onePageImageUrl)
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
