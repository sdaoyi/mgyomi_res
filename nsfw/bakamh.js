const mangayomiSources = [
  {
    name: "BAKAMH",
    lang: "zh",
    baseUrl: "https://bakamh.com",
    apiUrl: "",
    iconUrl: "https://bakamh.com/favicon.ico",
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
    {
    name: "BAKAMH",
    lang: "zh",
    baseUrl: "https://bamatk.com",
    apiUrl: "",
    iconUrl: "https://bamatk.com/favicon.ico",
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
  async getItem(url, headers) {
    const res = await new Client().get(url, headers);
    const doc = new Document(res.body);
    const mangaList = doc.select("div.manga>div.item-thumb>a").map((item) => {
      return {
        link: item.attr("href"),
        name: item.attr("title"),
        imageUrl: item.select("img")[0].attr("src"),
      };
    });
    return mangaList;
  }

  async getPopular(page) {
    const url = `${baseUrl}/manga/page/${page}/?m_orderby=trending`;
    const headers = {
      referer: `${baseUrl}/manga/page/1/?m_orderby=trending`,
    };
    return {
      list: await this.getItem(url, headers),
      hasNextPage: true,
    };
  }
  get supportsLatest() {
    throw new Error("supportsLatest not implemented");
  }

  async getLatestUpdates(page) {
    const url = `${baseUrl}/manga/page/${page}/?m_orderby=latest`;
    const headers = {
      referer: `${baseUrl}/manga/page/1/?m_orderby=latest`,
    };
    return {
      list: await this.getItem(url, headers),
      hasNextPage: true,
    };

  }

  async search(query, page, filters) {
    const url = `${baseUrl}/page/${page}/?s=${query}&post_type=wp-manga`
    const headers = {'referer': `${baseUrl}/page/1/?s=${query}&post_type=wp-manga`};
    const res = await new Client().get(url, headers);
    const doc = new Document(res.body);
    const mangaList = doc.select("div.c-tabs-item__content div.c-image-hover>a").map((item) => {
      return {
        link: item.attr("href"),
        name: item.attr("title"),
        imageUrl: item.select("img")[0].attr("src"),
      };
    });
    return {
      list: mangaList,
      hasNextPage: false,
    };
  }

  async getDetail(url) {
    const headers = {referer: baseUrl}
    const res= await new Client().get(url, headers);
    const doc= new Document(res.body);

    const chapters = doc.select('li.wp-manga-chapter>a').map((item) => {
      return {
        url: item.attr('href'),
        name: item.text,
      };
    });

    return {
      name: doc.select('#manga-title')[0].text,
      imageUrl: doc.select('div.summary_image>a>img')[0].attr('src'),
      description: doc.select('div.post-content_item>div>p')[0].text,
      author: doc.select('div.author-content')[0].text,
      genre: doc.select('.tags-content>a').map((item) => item.text),
      status: Util.checkStatus(doc.select('div.summary-content')[7].text),
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
    const headers = {
      referer: `${baseUrl}`,
    };

    const res = await new Client().get(url,headers);
    const doc= new Document(res.body);
    const picUrls = doc.select('div.no-gaps>img').map((item) => {
      return {
        url: `${item.attr('src')}`,
        headers: {
          referer: `${baseUrl}`,
        },
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
