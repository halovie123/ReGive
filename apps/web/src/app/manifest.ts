import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'ReGive — Chia sẻ để bền vững',
    short_name: 'ReGive',
    description: 'Cộng đồng chia sẻ đồ dùng không lãng phí tại Hóc Môn, TP.HCM.',
    start_url: '/',
    display: 'standalone',
    background_color: '#fbfcf8',
    theme_color: '#6faf68',
    lang: 'vi',
    icons: [
      {
        src: '/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'any',
      },
    ],
  };
}
