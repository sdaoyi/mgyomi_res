const mangayomiSources = [{
    "name": "包子漫画com",
    "lang": "zh",
    "baseUrl": "https://www.baozimh.com",
    "apiUrl": "",
    "iconUrl": "https://www.czmanga.com/bzmh/img/favicon.ico",
    "typeSource": "single",
    "isManga": true,
    "isNsfw": false,
    "version": "0.0.1",
    "dateFormat": "",
    "dateFormatLocale": "",
    "pkgPath": "",
    "userAgent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1 Edg/127.0.0.0"
}
];

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
    convertCoverSrc(imageID) {
        return `https://static-tw.baozimh.com/cover/${imageID}?w=285&h=375&q=100`
    }
    async getItems(url) {
        const res = await new Client().get(url)
        const doc = JSON.parse(res.body);
        const items = []
        for (const it of doc['items']) {
            items.push({
                name: it.name,
                imageUrl: this.convertCoverSrc(it.topic_img),
                link: `${baseUrl}/comic/${it.comic_id}`
            })
        }
        return { items: items, hasNextPage: true }
    }

    getHeaders(url) {
        throw new Error("getHeaders not implemented");
    }

    async getPopular(page) {
        const popUrl = baseUrl + `/api/bzmhq/amp_comic_list?type=all&region=all&filter=*&page=${page}&limit=36&language=tw&__amp_source_origin=https%3A%2F%2Fwww.baozimh.com`
        const result = await this.getItems(popUrl, headers)
        return {
            list: result.items,
            hasNextPage: result.hasNextPage
        };
    }

    async getLatestUpdates(page) {
        const updateUrl = baseUrl + `/api/bzmhq/amp_comic_list?type=all&region=all&filter=*&page=${page}&limit=36&language=tw&__amp_source_origin=https%3A%2F%2Fwww.baozimh.com`
        const result = await this.getItems(updateUrl, headers)
        return {
            list: result.items,
            hasNextPage: result.hasNextPage
        };
    }

    async search(query, page, filters) {
        const searchUrl = baseUrl + `/search?q=${query}`
        const res = await new Client().get(searchUrl, headers)
        const doc = new Document(res.body)
        const elements = doc.select('div.comics-card>a:first-child')
        const items = []
        for (const element of elements) {
            items.push({
                name: element.attr('title'),
                link: baseUrl + element.attr('href'),
                imageUrl: element.select('amp-img')[0].attr('src')
            })
        }
        return {
            list: items,
            hasNextPage: false
        };

    }
    async getDetail(url) {
        const res = await new Client().get(url, headers)
        const doc = new Document(res.body)
        const name = doc.select('h1.comics-detail__title')[0].text
        const detail_cover = doc.select('div.de-info__box amp-img')[0].attr('src')
        const detail_desc = doc.select('p.comics-detail__desc')[0].text
        const detail_author = doc.select('h2.comics-detail__author')[0].text
        const detail_status = doc.select('div.tag-list>span.tag')[0].text

        const chapters_doc=doc.select('#chapter-items>div.comics-chapters>a')  //24
        const chapters_doc_remainder=doc.select('#chapters_other_list>div.comics-chapters>a')  //24

        let chapters = []
        for (const cp of chapters_doc) {
            chapters.push({ name: Util.pureString(cp.text), url: baseUrl + cp.attr('href') })
        }
        for(const cpr of chapters_doc_remainder){
            chapters.push({ name: Util.pureString(cpr.text), url: baseUrl + cpr.attr('href') })
        }
        if(doc.select('#chapter-items').length===0){
            const chapters_last=doc.select('div.pure-g>div.comics-chapters>a')
            for(const cp of chapters_last){
                chapters.push({ name: Util.pureString(cp.text), url: baseUrl + cp.attr('href') })
            }
            chapters=chapters.reverse()
        }

        return {
            name: Util.pureString(name),
            imageUrl: detail_cover,
            description: Util.pureString(detail_desc),
            author: Util.pureString(detail_author),
            status: Util.checkStatus(detail_status),
            episodes: chapters.reverse()
        };

    }
    // For anime episode video list
    async getPageList(url) {
        const res = await new Client().get(url)
        const doc = new Document(res.body)
        const elements=doc.select('ul.comic-contain>div>amp-img')
        const picUrls = []
        for (const element of elements) {
            picUrls.push(element.attr('data-src'))
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
