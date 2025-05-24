const mangayomiSources = [
  {
    name: "Komiic",
    lang: "zh",
    baseUrl: "https://komiic.com",
    apiUrl: "",
    iconUrl: "https://komiic.com/favicon.ico",
    typeSource: "single",
    itemType: 0,
    isNsfw: true,
    version: "0.0.2",
    dateFormat: "",
    dateFormatLocale: "",
    pkgPath: "",
    userAgent:
      "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1 Edg/127.0.0.0",
  },
];

const baseUrl = mangayomiSources[0]["baseUrl"];
const headers = {
  referer: "https://komiic.com/comics/category/",
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
    return str.replace(/(\r\n|\n)/g, " ").replace(/\s+/g, " ");
  }
}

class DefaultExtension extends MProvider {
  getHeaders(url) {
    throw new Error("getHeaders not implemented");
  }

  async getPopular(page) {
    const popularUrl = "https://komiic.com/api/query";
    const headers = {
      referer: "https://komiic.com/comics/category/",
      "content-type": "application/json",
    };
    const postData = {
      operationName: "comicByCategories",
      variables: {
        categoryId: [],
        pagination: {
          limit: 30,
          offset: (page - 1) * 30,
          orderBy: "VIEWS",
          asc: false,
          status: "",
        },
      },
      query:
        "query comicByCategories($categoryId: [ID!]!, $pagination: Pagination!) {\n  comicByCategories(categoryId: $categoryId, pagination: $pagination) {\n    id\n    title\n    status\n    year\n    imageUrl\n    authors {\n      id\n      name\n      __typename\n    }\n    categories {\n      id\n      name\n      __typename\n    }\n    dateUpdated\n    monthViews\n    views\n    favoriteCount\n    lastBookUpdate\n    lastChapterUpdate\n    __typename\n  }\n}",
    };
    const res = await new Client().post(popularUrl, headers, postData);
    const resData = JSON.parse(res.body).data.comicByCategories;

    const mangaList = resData.map((item) => {
      return {
        name: item.title,
        link: `${item.id}`,
        imageUrl: item.imageUrl,
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
    const popularUrl = "https://komiic.com/api/query";
    const headers = {
      referer: "https://komiic.com/comics/category/",
      "content-type": "application/json",
    };
    const postData = {
      operationName: "comicByCategories",
      variables: {
        categoryId: [],
        pagination: {
          limit: 30,
          offset: (page - 1) * 30,
          orderBy: "DATE_UPDATED",
          asc: false,
          status: "",
        },
      },
      query:
        "query comicByCategories($categoryId: [ID!]!, $pagination: Pagination!) {\n  comicByCategories(categoryId: $categoryId, pagination: $pagination) {\n    id\n    title\n    status\n    year\n    imageUrl\n    authors {\n      id\n      name\n      __typename\n    }\n    categories {\n      id\n      name\n      __typename\n    }\n    dateUpdated\n    monthViews\n    views\n    favoriteCount\n    lastBookUpdate\n    lastChapterUpdate\n    __typename\n  }\n}",
    };

    const res = await new Client().post(popularUrl, headers, postData);
    const resData = JSON.parse(res.body).data.comicByCategories;

    const mangaList = resData.map((item) => {
      return {
        name: item.title,
        link: `${item.id}`,
        imageUrl: item.imageUrl,
      };
    });

    return {
      list: mangaList,
      hasNextPage: true,
    };
  }

  async search(query, page, filters) {
    const popularUrl = "https://komiic.com/api/query";
    const headers = {
      referer: `https://komiic.com/search/${encodeURIComponent(query)}`,
      "content-type": "application/json",
    };
    const postData = {
      operationName: "searchComicAndAuthorQuery",
      variables: { keyword: query },
      query:
        "query searchComicAndAuthorQuery($keyword: String!) {\n  searchComicsAndAuthors(keyword: $keyword) {\n    comics {\n      id\n      title\n      status\n      year\n      imageUrl\n      authors {\n        id\n        name\n        __typename\n      }\n      categories {\n        id\n        name\n        __typename\n      }\n      dateUpdated\n      monthViews\n      views\n      favoriteCount\n      lastBookUpdate\n      lastChapterUpdate\n      __typename\n    }\n    authors {\n      id\n      name\n      chName\n      enName\n      wikiLink\n      comicCount\n      views\n      __typename\n    }\n    __typename\n  }\n}",
    };
    const res = await new Client().post(popularUrl, headers, postData);
    const resData = JSON.parse(res.body).data.searchComicsAndAuthors.comics;
    const mangaList = resData.map((item) => {
      return {
        name: item.title,
        link: `${item.id}`,
        imageUrl: item.imageUrl,
      };
    });
    return {
      list: mangaList,
      hasNextPage: false,
    };
  }
  async getDetail(url) {
    const popularUrl = "https://komiic.com/api/query";
    const headers = {
      referer: "https://komiic.com/comics/category/",
      "content-type": "application/json",
    };
    const postData = {
      operationName: "comicById",
      variables: { comicId: `${url}` },
      query:
        "query comicById($comicId: ID!) {\n  comicById(comicId: $comicId) {\n    id\n    title\n    status\n    year\n    imageUrl\n    authors {\n      id\n      name\n      __typename\n    }\n    categories {\n      id\n      name\n      __typename\n    }\n    dateCreated\n    dateUpdated\n    views\n    favoriteCount\n    lastBookUpdate\n    lastChapterUpdate\n    __typename\n  }\n}",
    };

    const res = await new Client().post(popularUrl, headers, postData);
    const resData = JSON.parse(res.body).data.comicById;

    const chaptersUrl = "https://komiic.com/api/query";
    const chaptersPostData = {
      operationName: "chapterByComicId",
      variables: { comicId: url },
      query:
        "query chapterByComicId($comicId: ID!) {\n  chaptersByComicId(comicId: $comicId) {\n    id\n    serial\n    type\n    dateCreated\n    dateUpdated\n    size\n    __typename\n  }\n}",
    };
    const chaptersRes = await new Client().post(
      chaptersUrl,
      headers,
      chaptersPostData
    );
    const chaptersData = JSON.parse(chaptersRes.body).data.chaptersByComicId;
    const chapters = chaptersData.map((chapter) => {
      return {
        name: chapter.serial,
        url: JSON.stringify({ comicId: url, chapterId: chapter.id }),
        date: chapter.dateCreated,
        type: chapter.type,
      };
    });
    const descReqData = {
      operationName: "comicDetailedInfo",
      variables: { comicId: `${url}` },
      query:
        "query comicDetailedInfo($comicId: ID!) {\n  comicById(comicId: $comicId) {\n    description\n    reasons\n    sexyLevel\n    sexyLevelReason\n    sexualContent\n    ntr\n    warnings\n    otherTitles\n    __typename\n  }\n}",
    };
    const descRes = await new Client().post(
      popularUrl,
      {
        referer: `https://komiic.com/comic/${url}`,
        "content-type": "application/json",
      },
      descReqData
    );
    const resDescData = JSON.parse(descRes.body).data.comicById;
    const description = `${
      resDescData.description
    } \n  ${resDescData.reasons.join("\n")} \n ${resDescData.sexyLevelReason}`;
    return {
      name: resData.title,
      imageUrl: resData.imageUrl,
      description: description,
      author: resData.authors.map((author) => author.name).join(", "),
      genre: resData.categories.map((cat) => cat.name),
      status: Util.checkStatus(resData.status),
      chapters: chapters.reverse(),
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
    const comicId = JSON.parse(url).comicId;
    const chapterId = JSON.parse(url).chapterId;
    const pageUrl = "https://komiic.com/api/query";
    const headers = {
      referer: "https://komiic.com/comics/category/",
      "content-type": "application/json",
    };
    const postData = {
      operationName: "imagesByChapterId",
      variables: { chapterId: chapterId },
      query:
        "query imagesByChapterId($chapterId: ID!) {\n  imagesByChapterId(chapterId: $chapterId) {\n    id\n    kid\n    height\n    width\n    __typename\n  }\n}",
    };
    const res = await new Client().post(pageUrl, headers, postData);
    const resData = JSON.parse(res.body).data.imagesByChapterId;
    const picUrls = resData.map((item) => {
      return {
        url: `https://komiic.com/api/image/${item.kid}`,
        headers: {
          referer: `https://komiic.com/comic/${comicId}/chapter/${chapterId}/images/all`,
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
