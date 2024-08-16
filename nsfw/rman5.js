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
    "pkgPath": ""
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
        const elements = doc.select('a.hl-item-thumb')
        for (const element of elements) {
            items.push({
                name: element.attr('title'),
                imageUrl: element.attr('data-original'),
                link: element.attr('href')
            })
        }
        return items
    }

    getHeaders(url) {
        throw new Error("getHeaders not implemented");
    }
    async getPopular(page) {
        const baseUrl = mangayomiSources[0]['baseUrl']
        const popUrl = baseUrl + '/bookrank/daily'

        return {
            list: await this.getItems(popUrl),
            hasNextPage: false
        };
    }
    async getLatestUpdates(page) {
        const baseUrl = mangayomiSources[0]['baseUrl']
        const updateUrl = baseUrl + '/newbooks'

        return {
            list: await this.getItems(updateUrl),
            hasNextPage: false
        };

    }
    async search(query, page, filters) {
        const baseUrl = mangayomiSources[0]['baseUrl']
        const searchUrl = baseUrl + `/cata.php?key=${query}`

        return {
            list: await this.getItems(searchUrl),
            hasNextPage: false
        };

    }
    async getDetail(url) {
        const baseUrl = mangayomiSources[0]['baseUrl']
        const detailUrl = baseUrl + url

        const res = await new Client().get(detailUrl)
        const doc = new Document(res.body)
        const name = doc.select('h1.hl-dc-title')[0].text
        const detail_cover = doc.select('div.hl-dc-pic>span')[0].attr('data-original')
        const detail_li = doc.select('li.hl-col-xs-12')

        const detail_desc = detail_li[4].text.trim()
        const detail_author = detail_li[3].text.trim()
        const chapter_list = doc.select('a.module-play-list-link')
        const chapters = []
        for (const l of chapter_list) {
            chapters.push({ name: l.attr('title'), url: l.attr('href') })
        }

        return {
            name: name,
            imageUrl: detail_cover,
            description: detail_desc,
            author: detail_author,
            status: 0,
            episodes: chapters.reverse()
        };

    }
    // For anime episode video list
    async getPageList(url) {
        const baseUrl = mangayomiSources[0]['baseUrl']
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
