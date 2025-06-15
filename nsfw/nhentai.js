const mangayomiSources = [
  {
    name: "Nhentai",
    lang: "zh",
    baseUrl: "https://nhentai.net", //https://nhentai.xxx  https://nhentai.online
    apiUrl: "",
    iconUrl: "https://nhentai.net/favicon.ico",
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
    const res = await new Client().get(url);
    const doc = new Document(res.body);
    const covers = doc.select("a.cover");
    const mangaList = covers.map((cover) => {
      return {
        name: cover.select("div.caption")[0].text.trim(),
        link: cover.attr("href"),
        imageUrl: cover.select("img")[0].attr("data-src"),
      };
    });
    return mangaList;
  }

  async getPopular(page) {
    const url = `${baseUrl}/language/chinese/popular-today?page=${page}`;

    return {
      list: await this.getItem(url),
      hasNextPage: true,
    };
  }
  get supportsLatest() {
    throw new Error("supportsLatest not implemented");
  }

  async getLatestUpdates(page) {
    const url = `${baseUrl}/language/chinese/?page=${page}`;

    return {
      list: await this.getItem(url),
      hasNextPage: true,
    };
  }

  async search(query, page, filters) {
    const url = `${baseUrl}/search/?q=${query}&page=${page}`;
    
    return {
      list: await this.getItem(url),
      hasNextPage: false,
    };
  }
  async getDetail(url) {
    const detail_url = `${baseUrl}${url}`;
    const res = await new Client().get(detail_url);
    const doc = new Document(res.body);

    const info = doc.select("#info")[0];
    const name = info.select('h2.title')[0] ? info.select('h2.title')[0].text.trim() : info.select('h1.title')[0].text.trim() ;
    const description = info.select('h1.title')[0].text.trim();
    const imageUrl = doc.select('div#cover img')[0].attr("data-src");
    const genre=doc.select('span.tags>a>span.name').map((tag) => {
      return tag.text.trim();
    });
    const pageNum= doc.select('.thumb-container').length;
    const pageID = doc.select('#cover img')[0].attr("data-src").match(/galleries\/(\d+)\/cover/)[1];
    const chapters =[{
        name: "只有这一章",
        url: JSON.stringify({
           pageNum,
           pageID,
        }, null)
      }];
    ;

    return {
      name: name,
      imageUrl: imageUrl,
      description: description,
      author: "",
      genre: genre,
      status: 1,
      chapters: chapters,
    };
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
    const tmp= JSON.parse(url);
    const pageID = tmp.pageID;
    const pageNum= tmp.pageNum;
    //https://i9.nhentai.net/galleries/3398059/1.webp
    const pageNumArray=Array.from({ length: pageNum }, (_, i) => i + 1);
    const picUrls=pageNumArray.map((num) => {
      return `https://i9.nhentai.net/galleries/${pageID}/${num}.webp`;
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
