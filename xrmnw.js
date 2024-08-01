const mangayomiSources = [{
    "name": "秀人美女",
    "lang": "zh",
    "baseUrl": "https://www.xiu01.top",
    "apiUrl": "",
    "iconUrl": "https://www.xiu01.top/img/logo.png",
    "typeSource": "single",
    "isManga": true,
    "isNsfw": true,
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
}

class DefaultExtension extends MProvider {
    async getItems(url) {
        const res = await new Client().get(url)
        const doc = new Document(res.body);
        const items = []
        const elements = doc.select('li.i_list')
        for (const element of elements) {
            const name = element.select("a")[0].attr('title')
            const link = element.select("a")[0].attr('href')
            const imageUrl = element.select('img')[0].attr('src')
            items.push({
                name: Util.decodeZH(name),
                imageUrl: mangayomiSources[0]['baseUrl'] + imageUrl,
                link: link
            })
        }
        return items
    }

    getHeaders(url) {
        throw new Error("getHeaders not implemented");
    }
    async getPopular(page) {
        const endPage = 0
        const baseUrl = mangayomiSources[0]['baseUrl']
        const popUrl = `${baseUrl}/tj.html`
        return {
            list: await this.getItems(baseUrl),
            hasNextPage: page <= endPage
        }
    }
    async getLatestUpdates(page) {
        const baseUrl = mangayomiSources[0]['baseUrl']
        const endPage = 0
        const updateUrl = `${baseUrl}/zx.html`
        return {
            list: await this.getItems(updateUrl),
            hasNextPage: page <= endPage
        };
    }

    async search(query, page, filters) {

        const endPage = 100
        const baseUrl = mangayomiSources[0]['baseUrl']
        const searchUrl = baseUrl + `/plus/search/index.asp?keyword=${query}&searchtype=titlekeywords`
        const res = await new Client().get(searchUrl)
        const search_doc = new Document(res.body)
        const elements = search_doc.select('div.sousuo')
        const items = []
        for (const element of elements) {
            const name = element.select('span')[0].text
            const link = element.select('a')[0].attr('href')

            items.push({
                name: name,
                imageUrl: mangayomiSources[0]['baseUrl'] + '/uploadfile/pic/15070.jpg',
                link: link
            })
        }
        return {
            list: items,
            hasNextPage: page <= endPage
        };
    }
    async getDetail(url) {
        const baseUrl = mangayomiSources[0]['baseUrl']
        const res = await new Client().get(baseUrl + url)
        const doc = new Document(res.body)

        const detail_info_div = doc.select('div.item_title')[0]
        const name = detail_info_div.select('h1')[0].text
        const desc_p = detail_info_div.select('p')
        let description = ""
        for (let i = 0; i < desc_p.length; i++) {
            if (i < 2) { continue }
            description += desc_p[i].text
        }

        return {
            name: Util.decodeZH(name),
            imageUrl: baseUrl + doc.select('img')[1].attr("src"),
            description: Util.decodeZH(description),
            author: "",
            status: 0,
            episodes: [{ name: '只有这一个章节', url: url }]
        };
    }

    // For anime episode video list
    async getPageList(url) {
        const baseUrl = mangayomiSources[0]['baseUrl']
        const userAgent = mangayomiSources[0]['userAgent']
        let imageUrlLists = []
        const endPage = 30
        for (let i = 0; i < endPage; i++) {
            let pageListUrl = baseUrl + url
            if (i > 0) {
                pageListUrl = pageListUrl.replace(/\.html/, `_${i}.html`)
            }
            const imageUrls = await this.getImageFromXRW(pageListUrl)
            imageUrlLists.push(...imageUrls)
        }

        return imageUrlLists.map(i => baseUrl + i)
    }
    async getImageFromXRW(url) {
        const imageUrlLists = []
        const res = await new Client().get(url)
        if (res.statusCode !== 200) {
            return []
        }
        const doc = new Document(res.body)
        for (const element of doc.select('div.content img')) {
            imageUrlLists.push(element.attr('src'))
        }
        return imageUrlLists
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
