const mangayomiSources = [{
    "name": "韩漫天堂漫画",
    "lang": "zh",
    "baseUrl": "https://www.hmttmh.com",
    "apiUrl": "",
    "iconUrl": "https://www.hmttmh.com/favicon.ico",
    "typeSource": "single",
    "isManga": true,
    "isNsfw": false,
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
    static pureString(str) {
        return str.replace(/(\r\n|\n)/g, ' ').replace(/\s+/g, ' ').trim()
    }
}

class DefaultExtension extends MProvider {
    async getItems(url) {
        const res = await new Client().get(url, headers)
        const items = []
        const elements = JSON.parse(res.body)
        for (const element of elements) {
            const name = element['name']
            const link = `${mangayomiSources[0]['baseUrl']}/book/${element['book_uid']}`
            const imageUrl = element['imgurl']
            items.push({
                name: name,
                imageUrl: imageUrl,
                link: link
            })
        }

        return { items: items, hasNextPage: true }
    }

    getHeaders(url) {
        throw new Error("getHeaders not implemented");
    }
    async getPopular(page) {
        const baseUrl = mangayomiSources[0]['baseUrl']
        const popUrl = baseUrl + `/api/rankdata?page_num=${page}&type=1`
        const result = await this.getItems(popUrl)

        return {
            list: result.items,
            hasNextPage: result.hasNextPage
        }
    }
    async getLatestUpdates(page) {
        const baseUrl = mangayomiSources[0]['baseUrl']
        const updateUrl = baseUrl + `/api/rankdata?page_num=${page}&type=5`
        const result = await this.getItems(updateUrl)

        return {
            list: result.items,
            hasNextPage: result.hasNextPage
        };

    }

    async search(query, page, filters) {
        const baseUrl = mangayomiSources[0]['baseUrl']
        const searchUrl = baseUrl + `/search?keyword=${query}`
        const res = await new Client().get(searchUrl, headers)
        const doc = new Document(res.body)
        const items = []
        const elements = doc.select('ul.result-list>a')
        for (const element of elements) {
            const name = Util.pureString(element.select('h2')[0].text)
            const link = element.attr('href')
            const imageUrl = element.select('img')[0].attr('src')
            items.push({
                name: name,
                link: link,
                imageUrl: imageUrl
            })
        }

        return {
            list: items,
            hasNextPage: false
        };
    }
    async getDetail(url) {
        //  https://www.hmttmh.com/book/wodenvpengyouyoudianqiguaidanshihenkeai.html
        const baseUrl=mangayomiSources[0]['baseUrl']
        const res = await new Client().get(url, headers)
        const doc = new Document(res.body)

        const name = Util.pureString(doc.select('div.banner>h1')[0].text)
        const detail_cover = doc.select('div.banner>img')[0].attr('src')
        const detail_desc = doc.select('p.introduction')[0].text
        const detail_author = Util.pureString(doc.select('p.author')[0].text)

        const chapters = []
        const items = doc.select('div#chapter-list1>a')
        for (const li of items) {
            chapters.push({ name: li.select('p')[0].text, url: li.attr('href') })
        }
        const book_data_id=doc.select('dd.gengduo_dt1')[0].attr('data-id')
        const book_data_vid=doc.select('dd.gengduo_dt1')[0].attr('data-vid')
        const more_chapter_url=`${baseUrl}/api/bookchapter?id=${book_data_id}&id2=${book_data_vid}`
        const more_res=await new Client().get(more_chapter_url,headers)
        const more_json=JSON.parse(more_res.body)
        const more_chapters=more_json.map((v,i)=>{return {name:v['chaptername'],url:v['chapterurl']}})
        chapters.push(...more_chapters)

        return {
            name: name,
            imageUrl: detail_cover,
            description: detail_desc,
            author: detail_author,
            status: 5,
            episodes: chapters
        }
    }
    genImgSrc(str){
        p, a, c, k, e, d

        e = function(c) {
            return (c < a ? '' : e(parseInt(c / a))) + ((c = c % a) > 35 ? String.fromCharCode(c + 29) : c.toString(36))
        }
        ;
        while (c--) {
            if (k[c]) {
                p = p.replace(new RegExp('\\b' + e(c) + '\\b','g'), k[c])
            }
        }
        return p
    }
    // For anime episode video list
    async getPageList(url) {

        const res = await new Client().get(url, headers)
        const doc = new Document(res.body)
        const imgScript=doc.select('script').filter(v=>/eval/.test(v.text))[0]
        const scriptText=imgScript.text.match(/.*eval\((.*)\).*/)[1]
        const tt=`function(p,a,c,k,e,d){e=function(c){return c.toString(36)};if(!''.replace(/^/,String)){while(c--){d[c.toString(a)]=k[c]||c.toString(a)}k=[function(e){return d[e]}];e=function(){return'\\w+'};c=1};while(c--){if(k[c]){p=p.replace(new RegExp('\\b'+e(c)+'\\b','g'),k[c])}}return p}('$(g(){$(\'#2\').3(\'4-5\',\'6://7.1.8/a/b/c-d.e\');$(\'f.9\').0()});',17,17,'lazyload|npdn|img_0|attr|data|original|https|cdn2|top|lazy|douluodaludisanbulongwangchuanshuo|1484842|001|ea385|jpg|img|function'.split('|'),0,{})`
        console.log(tt)
       const z= eval('!'+tt)
       console.log(`--------${z}----------`)
        return []
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
