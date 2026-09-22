import { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://iz-uscape.vercel.app";

  // 検索エンジンに登録したい公開ページ
  const staticPages = [
    "",

    // 投稿ページ
    "/post",

    // エリアページ
    "/area/shimoda",
    "/area/atami",
    "/area/ito",
    "/area/izu",
    "/area/izunokuni",
    "/area/higashiizu",
    "/area/kawazu",
    "/area/minamiizu",
    "/area/matsuzaki",
    "/area/nishiizu",
    "/area/kannami",
    "/area/mishima",
    "/area/numazu",
  ];

  return staticPages.map((path) => ({
    url: `${baseUrl}${path}`,
    lastModified: new Date(),
    changeFrequency: "weekly",
    priority: path === "" ? 1.0 : 0.8,
  }));
}