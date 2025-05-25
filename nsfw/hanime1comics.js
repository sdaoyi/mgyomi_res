const mangayomiSources = [
    {
        name: "Hanime1",
        lang: "zh",
        baseUrl: "https://hanime1.me/comics",
        apiUrl: "",
        iconUrl: "https://img4.qy0.ru/data/2205/36/cw1H1cD.png",
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
    async getItems(url) {
        const res = await new Client().get(url, headers);
        const doc = new Document(res.body);
        const items = [];
        const elements = doc.select("div.comic-rows-videos-div>a");
        for (const element of elements) {
            const name = element.select("div>div")[0].text;
            const link = element.attr("href");
            const imageUrl = element.select("img")[0].attr("data-srcset");
            items.push({
                name: name,
                imageUrl: imageUrl,
                link: link,
            });
        }

        return { items: items, hasNextPage: true };
    }

    getHeaders(url) {
        throw new Error("getHeaders not implemented");
    }
    async getPopular(page) {
        const popUrl = baseUrl + `?page=${page}`;
        const result = await this.getItems(popUrl);
        return {
            list: result.items,
            hasNextPage: result.hasNextPage,
        };
    }
    async getLatestUpdates(page) {
        const updateUrl = baseUrl + `?page=${page}`;
        const result = await this.getItems(updateUrl);
        return {
            list: result.items,
            hasNextPage: result.hasNextPage,
        };
    }

    async search(query, page, filters) {
        const searchUrl =
            baseUrl + `/search?sort=popular&query=${query}&page=${page}`;
        const result = await this.getItems(searchUrl);
        return {
            list: result.items,
            hasNextPage: true,
        };
    }
    async getDetail(url) {
        //   https://hanime1.me/comic/119039
        const res = await new Client().get(url, headers);
        const doc = new Document(res.body);

        const title1 = doc
            .select("h4")[0]
            .text.trim()
            .replace(/(\r\n|\n|\s+)/g, " ");
        const title2 = Util.pureString(doc.select("h3.title")[0].text);
        const name = title1 || title2;
        const detail_cover = doc.select("div.col-md-4>a>img")[0].attr("data-src");
        const detail_genre = doc
            .select("div.comics-metadata-margin-top>h5:first-child>a>div").map(item=>item.text)
        const detail_author = doc
            .select("div.comics-metadata-margin-top>h5")[1]
            .text.replace(/(\r\n|\n|\s+)/g, " ");

        return {
            name: name,
            imageUrl: detail_cover,
            description: "",
            author: detail_author,
            genre:detail_genre,
            status: 1,
            episodes: [{ name: "只有一章", url: url + "/1" }],
        };
    }

    // For anime episode video list
    async getPageList(url) {
        const detailUrl = url.replace(/\/\d+$/, "");
        const resDetail = await new Client().get(detailUrl, headers);
        const docDetail = new Document(resDetail.body);
        let image_ext_pre3 = docDetail
            .select("img.comic-rows-videos-div")
            .slice(0, 3)
            .map((e) => e.attr("data-srcset"))
            .map((e) => e.match(/\/\w+(\.\w+)$/)[1]);

        const res = await new Client().get(url, headers);
        const doc = new Document(res.body);
        const pageNum = doc.select("a.fast-forward")[0].attr("data-page") - 0;
        const pageUrl = doc.select("img#current-page-image")[0].attr("data-prefix");
        const image_ext = image_ext_pre3.pop();

        let picUrls = Array(pageNum)
            .fill()
            .map((_, i) => {
                return `${pageUrl}${i + 1}${image_ext}`;
            });
        picUrls = picUrls.map((e, i) =>
            i < image_ext_pre3.length ? e.replace(/\.\w+$/, image_ext_pre3[i]) : e
        );
        return picUrls;
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
