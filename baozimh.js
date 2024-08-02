const mangayomiSources = [{
    "name": "包子漫画",
    "lang": "zh",
    "baseUrl": "https://bun.godamh.com",
    "apiUrl": "",
    "iconUrl": "https://bun.godamh.com/assets/images/Logo.png",
    "typeSource": "single",
    "isManga": true,
    "isNsfw": false,
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
        // 使用 TextDecoder 解码为 UTF-8 编码的字符串

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
        const elements = doc.select('div.pb-2 a')
        for (const element of elements) {
            items.push({
                name: Util.decodeZH(element.select('h3')[0].text),
                imageUrl: element.select('img')[0].attr('src'),
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
        const popUrl = baseUrl + '/hots'

        return {
            list: await this.getItems(popUrl),
            hasNextPage: false
        };
    }
    async getLatestUpdates(page) {
        const baseUrl = mangayomiSources[0]['baseUrl']
        const updateUrl = baseUrl + '/dayup'

        return {
            list: await this.getItems(updateUrl),
            hasNextPage: false
        };

    }

    async search(query, page, filters) {
        const endPage=50
        const baseUrl = mangayomiSources[0]['baseUrl']
        const searchUrl = baseUrl + `/s/${query}`

        return {
            list: await this.getItems(searchUrl),
            hasNextPage: page<endPage
        };

    }
    async getDetail(url) {
        const baseUrl = mangayomiSources[0]['baseUrl']
        const res = await new Client().get(url)
        const doc = new Document(res.body)
        const name = doc.select('div#MangaCard img')[0].attr('alt')
        const detail_cover = doc.select('div#MangaCard img')[0].attr('src')
        const detail_desc = doc.select('div#info p.text-medium')[0].text
        const detail_author = doc.select('div#info div.text-small')[0].text
        const detail_status = doc.select('div#info span.text-xs')[0].text
        const manga_id=doc.select('div#mangachapters')[0].attr('data-mid')

        const res_chapter=await new Client().get(`https://api-get.mgsearcher.com/api/manga/get?mid=${manga_id}&mode=all`,
            {"referer": url,"origin":baseUrl}
        )
        const chapter_json=JSON.parse(res_chapter.body).data.chapters
        const chapters = []
        for (const cp of chapter_json) {
            chapters.push({ name: Util.decodeZH(cp.attributes.title), url: url+'/'+cp.attributes.slug})
        }

        return {
            name: Util.decodeZH(name),
            imageUrl: detail_cover,
            description: Util.decodeZH(detail_desc),
            author: Util.decodeZH(detail_author),
            status: Util.checkStatus(Util.decodeZH(detail_status)),
            episodes: chapters.reverse()
        };

    }
    // For anime episode video list
    async getPageList(url) {
        const baseUrl = mangayomiSources[0]['baseUrl']
        const res=await new Client().get(url)
        const doc=new Document(res.body)
        const manga_id=doc.select('div#chapterContent')[0].attr('data-ms')
        const manga_cs=doc.select('div#chapterContent')[0].attr('data-cs')
        const headers={"referer": url,"origin":baseUrl}
        const res_chapter=await new Client().get(`https://api-get.mgsearcher.com/api/chapter/getinfo?m=${manga_id}&c=${manga_cs}`, headers )
        const chapter_data=JSON.parse(res_chapter.body).data
        console.log(chapter_data)
        const chapter_json=chapter_data.info.images
        const picUrls = []
        for (const cp of chapter_json) {
            picUrls.push(cp.url)
        }
      
        return picUrls.map(p=>{return {"url":p,"headers":headers}})
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
