const mangayomiSources = [{
    "name": "头牌漫画",
    "lang": "zh",
    "baseUrl": "https://www.toupaimh.com",
    "apiUrl": "",
    "iconUrl": "https://www.toupaimh.com/favicon.ico",
    "typeSource": "single",
    "itemType": 0,
    "isNsfw": true,
    "version": "0.0.3",
    "dateFormat": "",
    "dateFormatLocale": "",
    "pkgPath": "",
    "userAgent": "Mozilla/5.0 (Linux; Android 13; SM-G981B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Mobile Safari/537.36 Edg/128.0.0.0"
}];

const baseUrl = mangayomiSources[0]['baseUrl']
const headers = { "referer": baseUrl, "content-type": "application/x-www-form-urlencoded", "user-agent": mangayomiSources[0]['userAgent'] }

class Util {
  static decodeZH(str) {
    const byteArray = new Uint8Array(
      Array.from(str).map((char) => char.charCodeAt(0))
    );
    const correctText = Util.utf8Decode(byteArray);
    return correctText;
  }
  static utf8Decode(bytes) {
    let string = "";
    let i = 0;

    while (i < bytes.length) {
      let byte1 = bytes[i++];
      if (byte1 < 0x80) {
        string += String.fromCharCode(byte1);
      } else if (byte1 < 0xe0) {
        let byte2 = bytes[i++];
        string += String.fromCharCode(((byte1 & 0x1f) << 6) | (byte2 & 0x3f));
      } else if (byte1 < 0xf0) {
        let byte2 = bytes[i++];
        let byte3 = bytes[i++];
        string += String.fromCharCode(
          ((byte1 & 0x0f) << 12) | ((byte2 & 0x3f) << 6) | (byte3 & 0x3f)
        );
      } else {
        let byte2 = bytes[i++];
        let byte3 = bytes[i++];
        let byte4 = bytes[i++];
        let codePoint =
          (((byte1 & 0x07) << 18) |
            ((byte2 & 0x3f) << 12) |
            ((byte3 & 0x3f) << 6) |
            (byte4 & 0x3f)) -
          0x10000;
        string += String.fromCharCode(
          0xd800 + (codePoint >> 10),
          0xdc00 + (codePoint & 0x3ff)
        );
      }
    }

    return string;
  }
  static checkStatus(str) {
    if (typeof str !== "string") return 5; // 非字符串输入处理

    const statusMap = [
      { patterns: [/(连载|連載|ongoing)/i], value: 0 },
      { patterns: [/(完结|完結|complete)/i], value: 1 },
      { patterns: [/(请假|請假|hiatus)/i], value: 2 },
      { patterns: [/(取消|取消|canceled)/i], value: 3 },
      { patterns: [/(出版|出版|publishingFinished)/i], value: 4 },
    ];

    const normalizedStr = str.toLowerCase();

    for (const status of statusMap) {
      if (status.patterns.some((pattern) => pattern.test(normalizedStr))) {
        return status.value;
      }
    }

    return 5; // 默认值
  }
  static pureString(str) {
    return str.replace(/(\r\n|\n)/g, " ").replace(/\s+/g, " ").trim();
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
                imageUrl: baseUrl + imageUrl,
                link: baseUrl + link
            })
        }
        return items
    }

    getHeaders(url) {
        throw new Error("getHeaders not implemented");
    }
    async getPopular(page) {
        let popUrl = baseUrl + `/hotmh/index_${page}.html`
        if (page < 2) {
            popUrl = baseUrl + `/hotmh`
        }
        return {
            list: await this.getItems(popUrl),
            hasNextPage: true
        }
    }
    async getLatestUpdates(page) {
        let updateUrl = baseUrl + `/latest/index_${page}.html`
        if (page < 2) {
            updateUrl = baseUrl + `/latest/index.html`
        }
        return {
            list: await this.getItems(updateUrl),
            hasNextPage: true
        };

    }

    async search(query, page, filters) {
        const current_page = page - 1
        const searchUrl = baseUrl + `/e/search/index.php`
        const res = await new Client().post(searchUrl, headers, { 'show': 'title', 'keyboard': query })
        const doc = new Document(res.body)
        const hasNextPage = doc.select('li.page-item>a').length > 0
        let finalDoc
        if (hasNextPage) {
            let redirectSearchUrl = doc.select('li.page-item>a')[0].attr('href').replace('_1.html', '')
            redirectSearchUrl = `${baseUrl}${redirectSearchUrl}_${current_page}.html`
            const redirectRes = await new Client().get(redirectSearchUrl)
            finalDoc = new Document(redirectRes.body)
        } else {
            finalDoc = doc
        }
        const elements = finalDoc.select('div.item-media>a')
        const items = []
        for (const element of elements) {
            const name = element.attr('data-title')
            const link = element.attr('href')
            const imageUrl = element.select('mip-img')[0].attr('src')
            items.push({
                name: name,
                imageUrl: mangayomiSources[0]['baseUrl'] + imageUrl,
                link: mangayomiSources[0]['baseUrl'] + link
            })
        }
        return {
            list: items,
            hasNextPage: hasNextPage
        };
    }

    async getDetail(url) {
        const res = await new Client().get(url)
        const doc = new Document(res.body)

        const name = doc.select('div.right>h1')[0].text
        const detail_cover = doc.select('div.left img')[0].attr('src')
        const detail_desc = doc.select('div.right>p.hidden-xs')[0].text
        const detail_author = doc.select('div.right>div>span>a')[0].text

        const item_list = doc.select('ul.bookAll-item-list')[1]
        const lists = item_list.select('li>a')
        const chapters = []
        for (const li of lists) {
            chapters.push({ name: li.text, url: baseUrl + li.attr('href') })
        }

        return {
            name: name,
            imageUrl: baseUrl + detail_cover,
            description: detail_desc,
            author: detail_author,
            status: 5,
            episodes: chapters.reverse()
        }
    }
    async getOnePage(pageUrl, header) {
        let pageRes = await new Client().get(pageUrl, header)
        let pageDoc = new Document(pageRes.body)
        let onePageImageSrc = pageDoc.select('img.lazy').map(e => e.attr('data-original'))
        return [onePageImageSrc, pageDoc.select('p.info>a.down-page').filter(e => e.text === '下一页').length > 0]
    }

    // For anime episode video list
    async getPageList(url) {
        const picSrcs = []
        let startPageNum = 1
        let hasNextPage
        let onePageImageSrc
        do {
            let pageUrl = url.replace(/\.html$/, `_${startPageNum}.html`);
            [onePageImageSrc, hasNextPage] = await this.getOnePage(pageUrl, headers)
            if (!/^http/.test(onePageImageSrc[0])) {
                if (startPageNum === 1) {
                    pageUrl = url
                }
                [onePageImageSrc, hasNextPage] = await this.getOnePage(pageUrl, header)
            }
            picSrcs.push(...onePageImageSrc)
            startPageNum += 1
        } while (hasNextPage);

        return picSrcs
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
