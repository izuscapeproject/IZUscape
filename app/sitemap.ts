import { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl =
    "https://iz-uscape.vercel.app";

  // 主要ページ
  const staticPages = [
    "",
    "/post",
    "/saved",
    "/login",
    "/profile/me",

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

  return staticPages.map(
    (path) => ({
      url: `${baseUrl}${path}`,
      lastModified: new Date(),

      // SEO強化
      changeFrequency: "weekly",
      priority:
        path === "" ? 1.0 : 0.8,
    })
  );
}