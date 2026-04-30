/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // 中式古典风配色
        paper: '#F5EFE0', // 宣纸米黄（主背景）
        'paper-deep': '#EBE3D0', // 加深宣纸（卡片背景）
        cinnabar: '#C5392F', // 朱砂红（主强调色）
        'cinnabar-light': '#D9594F', // 浅朱砂
        ink: '#2C2A28', // 水墨黑（主文字）
        'ink-light': '#5A5651', // 浅墨色（次级文字）
        gold: '#B8860B', // 金色（点缀）
        'gold-light': '#D4A52A',
        celadon: '#7A8C7E', // 青瓷绿（辅助）
        'border-classic': '#C9BFA8', // 古典边框色
      },
      fontFamily: {
        song: ['"Noto Serif SC"', '"Songti SC"', 'STSong', 'serif'],
        hei: ['"Noto Sans SC"', '"PingFang SC"', 'system-ui', 'sans-serif'],
      },
      backgroundImage: {
        'paper-texture':
          "linear-gradient(135deg, #F5EFE0 0%, #EFE8D6 100%)",
      },
      boxShadow: {
        classic: '0 2px 8px rgba(44, 42, 40, 0.08)',
        'classic-hover': '0 4px 16px rgba(44, 42, 40, 0.15)',
      },
    },
  },
  plugins: [],
};
