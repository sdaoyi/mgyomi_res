const mangayomiSources = [
  {
    name: "HentaiHand",
    lang: "zh",
    baseUrl: "https://hentaihand.com",
    apiUrl: "",
    iconUrl: "https://hentaihand.com/favicon.ico",
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

  async getPopular(page) {
    const url = `https://hentaihand.com/api/comics?page=${page}&lang=en&q=&sort=favorites&order=desc&languages[]=1&duration=day&nsfw=false`;
    const res = await new Client().get(url);
    const data = JSON.parse(res.body).data;
    const mangaList = data.map((item) => {
      return {
        name: item.alternative_title || item.title,
        link: item.slug,
        imageUrl: item.image_url,
      };
    });
    return {
      list: mangaList,
      hasNextPage: true,
    };
  }

  get supportsLatest() {
    throw new Error("supportsLatest not implemented");
  }

  async getLatestUpdates(page) {
    const url = `https://hentaihand.com/api/comics?page=${page}&lang=en&q=&sort=uploaded_at&order=asc&languages[]=1&duration=day&nsfw=false`;
    const res = await new Client().get(url);
    const data = JSON.parse(res.body).data;
    const mangaList = data.map((item) => {
      return {
        name: item.alternative_title || item.title,
        link: item.slug,
        imageUrl: item.image_url,
      };
    });
    return {
      list: mangaList,
      hasNextPage: true,
    };
  }

  async search(query, page, filters) {
    const url = `https://hentaihand.com/api/comics?page=${page}&lang=en&q=${query}&sort=uploaded_at&order=asc&languages[]=1&duration=day&nsfw=false`;
    const res = await new Client().get(url);
    const data = JSON.parse(res.body).data;
    const mangaList = data.map((item) => {
      return {
        name: item.alternative_title || item.title,
        link: item.slug,
        imageUrl: item.image_url,
      };
    });
    return {
      list: mangaList,
      hasNextPage: true,
    };
  }

  async getDetail(url) {
    const slug = url;
    const detail_url = `https://hentaihand.com/api/comics/${slug}?lang=en&nsfw=false`;
    const res = await new Client().get(detail_url);
    const data = JSON.parse(res.body);

    const name = data.alternative_title || data.title;
    const description = data.meta_description;
    const imageUrl = data.image_url;
    const genre = data.tags.map((tag) => tag.name);

    const chapters = [
      {
        name: "只有这一章",
        url: slug,
      },
    ];

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
    const slug = url;
    const pageUrl = `https://hentaihand.com/api/comics/${slug}/images?lang=en&nsfw=false`;
    const res = await new Client().get(pageUrl);
    const images = JSON.parse(res.body).images;
    const picUrls = images.map((image) => {
      return image.source_url;
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
