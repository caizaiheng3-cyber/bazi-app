#!/bin/bash
# 用万象 2.7 并行生成设计稿所需的图片素材
API_KEY="sk-8df0213368314d48a29e6a15119450a6"
API_URL="https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation"
OUT_DIR="/Users/caizaiheng/vscode/八字项目/app/public/images"
mkdir -p "$OUT_DIR"

generate_image() {
  local name="$1"
  local prompt="$2"
  local size="${3:-2K}"
  local tmpfile=$(mktemp /tmp/wan27_${name}_XXXX.json)
  local outfile=$(mktemp /tmp/wan27_resp_${name}_XXXX.json)

  cat > "$tmpfile" <<EOFJ
{
  "model": "wan2.7-image-pro",
  "input": {
    "messages": [
      {
        "role": "user",
        "content": [
          {"text": "$prompt"}
        ]
      }
    ]
  },
  "parameters": {
    "size": "$size",
    "n": 1,
    "watermark": false,
    "thinking_mode": true
  }
}
EOFJ

  echo "[${name}] 开始生成..."
  local http_code=$(curl -s -w "%{http_code}" -o "$outfile" \
    --location "$API_URL" \
    --header "Authorization: Bearer $API_KEY" \
    --header "Content-Type: application/json" \
    --data-binary "@$tmpfile" \
    --max-time 180)

  if [ "$http_code" != "200" ]; then
    echo "[${name}] ❌ HTTP $http_code"
    cat "$outfile"
    rm -f "$tmpfile" "$outfile"
    return 1
  fi

  # 提取图片 URL
  local img_url=$(python3 -c "
import json, sys
with open('$outfile') as f:
    r = json.load(f)
for c in r.get('output',{}).get('choices',[]):
    for item in c.get('message',{}).get('content',[]):
        if 'image' in item:
            print(item['image'])
            sys.exit(0)
print('')
")

  if [ -z "$img_url" ]; then
    echo "[${name}] ❌ 无法提取图片URL"
    cat "$outfile"
    rm -f "$tmpfile" "$outfile"
    return 1
  fi

  echo "[${name}] 下载: ${img_url:0:80}..."
  curl -s --location "$img_url" -o "${OUT_DIR}/${name}.png" --max-time 60

  local fsize=$(wc -c < "${OUT_DIR}/${name}.png" | tr -d ' ')
  if [ "$fsize" -gt 1000 ]; then
    echo "[${name}] ✅ 完成 (${fsize} bytes) -> ${OUT_DIR}/${name}.png"
  else
    echo "[${name}] ❌ 文件太小 (${fsize} bytes)"
  fi

  rm -f "$tmpfile" "$outfile"
}

# 并行生成 4 张图片
generate_image "chat-empty-desk" \
  "中国古典书房桌面静物画，俯视角度略偏，一张深色木质书桌上摆放着：展开的宣纸卷轴写着毛笔字，一只竹筒笔筒里插着毛笔，一方砚台旁放着墨锭，一只青铜香炉冒着袅袅青烟。背景是朦胧的水墨山水远景，暖黄色调，中国传统工笔淡彩风格，宁静禅意氛围，无人物" \
  "2K" &

generate_image "consumer-sea" \
  "中国传统水墨画风格的大海景象，巨大的海浪翻涌，蓝绿色海水层层叠叠，远处有一叶帆船在波涛中航行，天边是朦胧的远山和夕阳余晖，整体色调温暖偏金黄，水墨淡彩技法，有中国画的留白意境，宽幅横构图，壮阔深邃" \
  "2K" &

generate_image "bamboo-corner" \
  "中国水墨画风格的竹子，画面右下角构图，2-3根翠绿竹竿斜生，竹叶疏密有致随风轻摇，笔触潇洒写意，背景留白，传统水墨淡彩，清雅高洁的意境，适合作为页面角落装饰，透明感" \
  "1K" &

generate_image "mountain-header" \
  "中国水墨山水画，横幅宽构图，远山连绵起伏若隐若现，山间有一座古典亭台楼阁，薄雾缭绕松林点缀，右侧有一轮淡红色落日或朝阳，整体色调暖米黄偏古典，水墨淡彩写意风格，大面积留白，适合作为网页顶部banner背景" \
  "2K" &

echo "⏳ 4 张图片并行生成中，请等待..."
wait
echo "🎉 所有图片生成完成！"
ls -la "$OUT_DIR"/*.png 2>/dev/null
