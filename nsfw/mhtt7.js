const mangayomiSources = [{
    "name": "漫画天堂",
    "lang": "zh",
    "baseUrl": "https://mhtt7.com",
    "apiUrl": "",
    "iconUrl": "https://mhtt7.com/imgs/logo_black.png",
    "typeSource": "single",
    "itemType": 0,
    "isNsfw": true,
    "version": "0.0.3",
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
        const res = await new Client().get(url, headers)
        const doc = new Document(res.body);
        const items = []
        const elements = doc.select('li.hl-list-item')
        for (const element of elements) {
            const name = element.select('a')[0].attr('title')
            const link =  element.select('a')[0].attr('href')
            const imageUrl =  element.select('a')[0].attr('data-original')
            items.push({
                name: name,
                imageUrl: imageUrl,
                link: baseUrl + link
            })
        }

        return { items: items, hasNextPage: true }
    }

    getHeaders(url) {
        throw new Error("getHeaders not implemented");
    }
    async getPopular(page) {
        const popUrl = baseUrl + `/manhuafenlei/all/ob/hits/st/all/page/${page}`
        const result = await this.getItems(popUrl)

        return {
            list: result.items,
            hasNextPage: result.hasNextPage
        }
    }
    async getLatestUpdates(page) {
        const updateUrl = baseUrl + `/manhuafenlei/all/ob/time/st/all/page/${page}`
        const result = await this.getItems(updateUrl)

        return {
            list: result.items,
            hasNextPage: result.hasNextPage
        };

    }

    async search(query, page, filters) {
        const searchUrl = baseUrl + `/sousuomanhua/${query}/page/${page}`
        const result = await this.getItems(searchUrl)
        return {
            list: result.items,
            hasNextPage: true
        };
    }
    async getDetail(url) {
        //   https://mhtt7.com/manhuayuedu/1717.html
        const res = await new Client().get(url, headers)
        const doc = new Document(res.body)

        const name = doc.select('div.hl-detail-content>div.hl-dc-content h1')[0].text
        const detail_cover = doc.select('div.hl-detail-content>div.hl-dc-pic>span')[0].attr('data-original')
        const detail_desc = doc.select('div.hl-detail-content>div.hl-dc-content>div.hl-vod-data>div.hl-data-xs>span')[3].text
        const detail_author = doc.select('div.hl-detail-content>div.hl-dc-content>div.hl-vod-data>div.hl-data-xs>span')[1].text
        const detail_status = doc.select('div.hl-detail-content>div.hl-dc-content>div.hl-vod-data>div.hl-data-xs>span')[0].text

        const item_list = doc.select('div.hl-list-wrap>ul>li>a')
        const chapters = []
        for (const li of item_list) {
            chapters.push({ name: li.text, url: baseUrl + li.attr('href') })
        }

        return {
            name: name,
            imageUrl: detail_cover,
            description: detail_desc,
            author: detail_author,
            status: Util.checkStatus(detail_status),
            episodes: chapters.reverse()
        }
    }

    // For anime episode video list
    async getPageList(url) {

        const res = await new Client().get(url, headers)
        const doc = new Document(res.body)
        const picUrls = doc.select('img.lazy').map(e => e.attr('data-original'))
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
