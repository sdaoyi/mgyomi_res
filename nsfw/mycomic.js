const mangayomiSources = [
  {
    name: "mycomic",
    lang: "zh",
    baseUrl: "https://mycomic.com",
    apiUrl: "",
    iconUrl: "https://mycomic.com/favicon.ico",
    typeSource: "single",
    itemType: 0,
    isNsfw: true,
    version: "0.0.3",
    dateFormat: "",
    dateFormatLocale: "",
    pkgPath: "",
    userAgent:
      "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1 Edg/127.0.0.0",
  },
];

const baseUrl = mangayomiSources[0]["baseUrl"];
const headers = {
  referer: baseUrl,
  "user-agent": mangayomiSources[0]["userAgent"],
};

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
    return str
      .replace(/(\r\n|\n)/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }
}

class DefaultExtension extends MProvider {
  getHeaders(url) {
    throw new Error("getHeaders not implemented");
  }

  async getItem(url) {
    const headers = {
      referer: baseUrl,
      "user-agent": mangayomiSources[0]["userAgent"],
    };
    const res = await new Client().get(url, { headers });
    const doc = new Document(res.body);
    const mangaElements = doc.select("div.group a");
    const mangaList = mangaElements.map((item) => {
      return {
        link: item.attr('href'),
        name:  item.select('img')[0].attr('alt'),
        imageUrl: item.select('img')[0].attr('data-src') ||item.select('img')[0].attr('src'),
      };
    });
    return mangaList
  }

  async getPopular(page) {
    const url = `${baseUrl}/comics?sort=-views&page=${page}`;
    
    return {
      list: await this.getItem(url),
      hasNextPage: true,
    };
  }

  get supportsLatest() {
    throw new Error("supportsLatest not implemented");
  }

  async getLatestUpdates(page) {
    const url = `${baseUrl}/comics?sort=-update&page=${page}`;
    return {
      list: await this.getItem(url),
      hasNextPage: true,
    };
  }

  async search(query, page, filters) {
    const url = `https://mycomic.com/comics?q=${query}&sort=-views&page=${page}`;
    return {
      list: await this.getItem(url),
      hasNextPage: true,
    };
  }

  async getDetail(url) {
    const headers = {
      referer: baseUrl,
      "user-agent": mangayomiSources[0]["userAgent"],
    };
    const res = await new Client().get(url, { headers });
    const doc = new Document(res.body);
    const detail_info = doc.select("div.bg-white>div.grow>div")
    const name = Util.pureString(detail_info[1].text);
    const status = Util.checkStatus(detail_info[2].text);
    const author = Util.pureString(detail_info[3].select('div')[0].text);
   
    const description = Util.pureString(detail_info[4].text);
    const imageUrl = doc.select("img.object-cover")[0].attr("src");
    const chapterElements = doc.select('div.mb-12>div[x-data]')[0].attr('x-data');
    const chapterString=chapterElements.match(/(\[.+\])/)[1]
    const chapters=JSON.parse(chapterString).map((v)=>{ return {name:v.title,url:v.id+''}})
   
   return {
      name: name,
      imageUrl: imageUrl,
      description: description,
      author: author,
      status: status,
      chapters: chapters,
      }
  }

  // For novel html content
  async getHtmlContent(url) {
    throw new Error("getHtmlContent not implemented");
  }
  // Clean html up for reader
  async cleanHtmlContent(html) {
    throw new Error("cleanHtmlContent not implemented");
  }
  // For anime episode video list
  async getVideoList(url) {
    throw new Error("getVideoList not implemented");
  }
  // For manga chapter pages
  async getPageList(url) {
    const pageUrl = `https://mycomic.com/chapters/${url}`;
    const res = await new Client().get(pageUrl, { headers });
    const doc = new Document(res.body);
    const picUrls = doc.select('img[x-ref]').map((item) => {
      return {
        url:item.attr('data-src') || item.attr('src'),
        headers
      };
    });

    return picUrls;
  }
  getFilterList() {
    throw new Error("getFilterList not implemented");
  }
  getSourcePreferences() {
    throw new Error("getSourcePreferences not implemented");
  }
}
