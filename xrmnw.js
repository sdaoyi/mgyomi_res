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
    "userAgent":"Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1 Edg/127.0.0.0"
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
        const elements = doc.select('div.mipui-xs-item-list')
        for (const element of elements) {
            const name = element.select("h4.list-title>a")[0].text
            const link = element.select("h4.list-title>a")[0].attr('href')
            const imageUrl = element.select('img')[0].attr('src')
            items.push({
                name: Util.decodeZH(name),
                imageUrl: mangayomiSources[0]['baseUrl']+imageUrl,
                link: link
            })
        }
        return items
    }

    getHeaders(url) {
        throw new Error("getHeaders not implemented");
    }
    async getPopular(page) {
        //https://www.xiu01.top
        const baseUrl = mangayomiSources[0]['baseUrl']
        let popUrl = ""
        if (page < 2) {
            popUrl = baseUrl + `/finish`
        } else {
            popUrl = baseUrl + `/finish/index_${page}.html`
        }

        return {
            list: await this.getItems(popUrl),
            hasNextPage: page <= endPage
        }
    }
    async getLatestUpdates(page) {
        //https://www.xiu01.top/zx.html
        const baseUrl = mangayomiSources[0]['baseUrl']
        const endPage = 20
        let updateUrl = ""
        if (page < 2) {
            updateUrl = baseUrl + `/latest/index.html`
        } else {
            updateUrl = baseUrl + `/latest/index_${page}.html`
        }

        return {
            list: await this.getItems(updateUrl),
            hasNextPage: page <= endPage
        };

    }

    async search(query, page, filters) {
        const endPage=65
        const baseUrl = mangayomiSources[0]['baseUrl']
        const searchUrl = baseUrl + `/e/search/index.php`
        const res = await new Client().post(searchUrl, { "Content-Type": "application/x-www-form-urlencoded" }, { 'show': 'title', 'keyboard': query })
        let relocation = ''
        if (res.statusCode === 302) {
            relocation = res['headers']['location']
        }
        let redirect_url = baseUrl + relocation
        redirect_url = redirect_url.replace(/\.html$/, `_${page}.html`)
        const search_res=await new Client().get(redirect_url)
        const search_doc=new Document(search_res.body)
        const elements=search_doc.select('div.item-media>a')
        const items=[]
        for(const element of elements){
            const name=element.attr('data-title')
            const link=element.attr('href')
            const imageUrl=element.select('mip-img')[0].attr('src')
            items.push({
                name: name,
                imageUrl: mangayomiSources[0]['baseUrl']+imageUrl,
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
        const res=await new Client().get(baseUrl+url)
        const doc=new Document(res.body)

        const name=doc.select('div.right h1').text
        const detail_cover=doc.select('div.left img')[0].attr('src')
        const detail_desc=doc.select('div.right>p.hidden-xs')[0].text
        const detail_author=doc.select('div.right>div>span>a')[0].text

        const lists=doc.select('ul.bookAll-item-list>li>a')
        const chapters=[]
        for(const li of lists){
            chapters.push({name:li.attr('title'),url:li.attr('href')})
        }
        

        return {
            name: name,
            imageUrl: baseUrl+detail_cover,
            description: detail_desc,
            author: detail_author,
            status: 0,
            episodes: chapters.reverse()
        };
    }

    // For anime episode video list
    async getPageList(url) {
        const baseUrl = mangayomiSources[0]['baseUrl']
        const userAgent=mangayomiSources[0]['userAgent']
        const pageListUrl = baseUrl + url

        const res = await new Client().get(pageListUrl,{ "user-agent":userAgent  })

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
