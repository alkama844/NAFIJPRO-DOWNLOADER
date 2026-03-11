import { MetadataRoute } from 'next';

const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://downloader.nafij.me';

export default function robots(): MetadataRoute.Robots {
    return {
        rules: {
            userAgent: '*',
            allow: '/',
            disallow: ['/admin', '/api', '/settings', '/share'],
        },
        sitemap: `${baseUrl}/sitemap.xml`,
    };
}
