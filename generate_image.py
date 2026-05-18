#!/usr/bin/env python3
"""
AI 生图调用示例

用法:
    python generate_image.py --prompt "一只戴墨镜的猫" --output cat.png
    python generate_image.py --prompt "水墨山水画" --model wan2.7-image-pro --output landscape.png
    python generate_image.py --prompt "赛博朋克城市" --model jimeng_t2i_v40 --output city.png

支持的模型:
    gpt-image-2-0421-global  (默认) GPT Image 2 同步生图
    jimeng_t2i_v40                   即梦 v4.0 异步生图
    qwen-image                       通义万相 异步生图
    wan2.6-t2i                       万相 2.6 同步生图
    wan2.7-image-pro                 万相 2.7 Pro 同步生图
"""

import argparse
import os
import sys

from image_sdk import ImageClient, SUPPORTED_MODELS


def main():
    parser = argparse.ArgumentParser(description="AI 生图工具")
    parser.add_argument("--prompt", required=True, help="生图提示词")
    parser.add_argument("--model", default="gpt-image-2-0421-global",
                        choices=list(SUPPORTED_MODELS.keys()), help="模型名称")
    parser.add_argument("--size", default="1024x1024", help="图片尺寸")
    parser.add_argument("--quality", default="medium", help="图片质量 (low/medium/high)")
    parser.add_argument("--n", type=int, default=1, help="生成数量")
    parser.add_argument("--output", default="output.png", help="输出文件路径")
    parser.add_argument("--idealab-key", default=None, help="idealab API Key (默认读环境变量)")
    parser.add_argument("--dashscope-key", default=None, help="DashScope API Key (默认读环境变量)")
    args = parser.parse_args()

    client = ImageClient(
        idealab_api_key=args.idealab_key,
        dashscope_api_key=args.dashscope_key,
    )

    model_info = SUPPORTED_MODELS[args.model]
    print(f"🎨 开始生图...")
    print(f"   模型: {model_info.label} ({args.model})")
    print(f"   提示词: {args.prompt}")
    print(f"   尺寸: {args.size}  质量: {args.quality}  数量: {args.n}")

    result = client.generate(
        prompt=args.prompt,
        model=args.model,
        size=args.size,
        quality=args.quality,
        n=args.n,
    )

    if result.count == 0:
        print("❌ 未生成任何图片")
        sys.exit(1)

    for index, image_bytes in enumerate(result.images):
        if result.count == 1:
            filepath = args.output
        else:
            base, ext = os.path.splitext(args.output)
            filepath = f"{base}_{index + 1}{ext}"

        with open(filepath, "wb") as f:
            f.write(image_bytes)
        print(f"✅ 图片已保存: {filepath} ({len(image_bytes)} bytes)")

    print(f"\n🎉 共生成 {result.count} 张图片")


if __name__ == "__main__":
    main()
