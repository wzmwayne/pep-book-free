#!/usr/bin/env python3
"""
将当前目录下 <book_id>_page_<page_id> 图片合并为 <book_id>.pdf
缺页时询问是否强制合成，强制合成自动插入空白页。
依赖：Pillow (PIL)
"""

import os
import re
import sys
from collections import defaultdict
from PIL import Image

# 支持的图片扩展名（不区分大小写）
IMAGE_EXTENSIONS = {'.jpg', '.jpeg', '.png', '.bmp', '.gif', '.tif', '.tiff'}

def find_image_files(directory='.'):
    """
    扫描目录，返回一个字典：{book_id: {page_num: file_path}}
    """
    pattern = re.compile(
        r'^(.+)_page_(\d+)\.(' + '|'.join(ext.strip('.') for ext in IMAGE_EXTENSIONS) + r')$',
        re.IGNORECASE
    )
    
    books = defaultdict(dict)
    
    for filename in os.listdir(directory):
        match = pattern.match(filename)
        if not match:
            continue
        book_id = match.group(1)
        page_num = int(match.group(2))
        file_path = os.path.join(directory, filename)
        books[book_id][page_num] = file_path
    
    return books

def get_missing_pages(pages):
    """返回缺失的页码列表（假设从1开始连续）"""
    if not pages:
        return []
    max_page = max(pages)
    expected = set(range(1, max_page + 1))
    missing = sorted(expected - set(pages))
    return missing

def create_blank_page(size=None):
    """
    创建白色空白 PIL Image 对象。
    如果 size 为 None，默认使用 A4 纵向 (595x842 点 @72dpi)。
    """
    if size is None:
        size = (595, 842)  # A4 at 72 dpi
    return Image.new('RGB', size, color='white')

def get_image_size(file_path):
    """获取图片尺寸（宽, 高）"""
    with Image.open(file_path) as img:
        return img.size

def merge_to_pdf(book_id, page_dict, insert_blank=False):
    """
    将 page_dict 合并为一个 PDF 文件。
    若 insert_blank=True，缺失的页码处插入空白页。
    """
    if not page_dict:
        print(f"  警告：{book_id} 没有任何图片，跳过。")
        return
    
    pages = sorted(page_dict.keys())
    missing = get_missing_pages(pages)
    
    if not insert_blank and missing:
        print(f"  跳过 {book_id}（存在缺页且未强制合成）")
        return
    
    # 确定空白页尺寸：使用第一张图片的尺寸，若没有则用默认 A4
    first_page = pages[0]
    try:
        blank_size = get_image_size(page_dict[first_page])
    except Exception as e:
        print(f"  警告：无法读取第一张图片尺寸，使用默认 A4 尺寸。错误：{e}")
        blank_size = None
    
    # 构建要保存的图像列表（PIL Image 对象）
    image_objects = []
    max_page = max(pages) if pages else 0
    for p in range(1, max_page + 1):
        if p in page_dict:
            try:
                img = Image.open(page_dict[p])
                # 确保图像为 RGB 模式（PDF 要求）
                if img.mode != 'RGB':
                    img = img.convert('RGB')
                image_objects.append(img)
            except Exception as e:
                print(f"  错误：无法读取图片 {page_dict[p]}，跳过。{e}")
                continue
        elif insert_blank:
            image_objects.append(create_blank_page(blank_size))
    
    if not image_objects:
        print(f"  错误：没有可用的图像用于生成 PDF。")
        return
    
    output_pdf = f"{book_id}.pdf"
    try:
        # 使用 Pillow 的 save 方法保存为 PDF
        image_objects[0].save(
            output_pdf,
            "PDF",
            save_all=True,
            append_images=image_objects[1:],
            resolution=100.0  # 可调整分辨率
        )
        print(f"  成功生成：{output_pdf}")
    except Exception as e:
        print(f"  错误：无法生成 PDF {output_pdf}。{e}")
    finally:
        # 关闭所有打开的图像
        for img in image_objects:
            img.close()

def main():
    books = find_image_files('.')
    if not books:
        print("未找到任何符合格式的图片文件。")
        return
    
    print(f"发现 {len(books)} 个书号。")
    for book_id, page_dict in sorted(books.items()):
        pages = sorted(page_dict.keys())
        missing = get_missing_pages(pages)
        start_ok = (1 in pages) if pages else False
        
        print(f"\n书号: {book_id}")
        print(f"  现有页码: {pages}")
        
        if not missing and start_ok:
            print("  页码完整，直接合成。")
            merge_to_pdf(book_id, page_dict, insert_blank=False)
        else:
            if not start_ok:
                print("  警告：起始页码不是 1。")
            if missing:
                print(f"  缺失页码: {missing}")
            
            while True:
                ans = input("  是否强制合成（缺失处插入空白页）？(y/n): ").strip().lower()
                if ans in ('y', 'yes'):
                    merge_to_pdf(book_id, page_dict, insert_blank=True)
                    break
                elif ans in ('n', 'no'):
                    print("  已跳过。")
                    break
                else:
                    print("  请输入 y 或 n。")

if __name__ == "__main__":
    main()
