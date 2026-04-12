// ==UserScript==
// @name         人教课本爬取器-极简版
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  批量下载指定范围的课本图片，纯文字界面，简单易用
// @author       You
// @match        https://book.pep.com.cn/*
// @grant        GM_download
// @connect      book.pep.com.cn
// ==/UserScript==

(function() {
    'use strict';

    // 调试信息数组
    let debugInfo = [];

    // 添加调试信息到界面
    function addDebugMessage(message) {
        const timestamp = new Date().toLocaleTimeString();
        const fullMessage = `[${timestamp}] ${message}`;
        debugInfo.push(fullMessage);

        // 立即更新调试框显示
        const debugBox = document.getElementById('debugBox');
        if (debugBox) {
            debugBox.textContent = debugInfo.join('\n');
            debugBox.scrollTop = debugBox.scrollHeight;
        }
    }

    // 创建极简下载界面
    function createDownloadInterface() {
        addDebugMessage('=== 开始创建极简下载界面 ===');

        // 检查是否已创建
        if (document.getElementById('batchDownloadContainer')) {
            return;
        }

        // 创建容器
        const container = document.createElement('div');
        container.id = 'batchDownloadContainer';
        container.style.cssText = 'position: fixed; top: 10px; right: 10px; z-index: 999999; width: 300px; height: 400px; overflow: hidden;';

        // 创建主内容区域
        const mainContainer = document.createElement('div');
        mainContainer.style.cssText = 'width: 100%; height: 100%; overflow-y: auto;';

        // 创建卡片
        const card = document.createElement('div');
        card.style.cssText = 'width: 100%; height: 100%; overflow-y: auto;';

        // 标题
        const title = document.createElement('h2');
        title.textContent = '批量下载';

        // 表单
        const form = document.createElement('form');
        form.style.cssText = 'padding: 10px;';

        // 起始页
        const startGroup = document.createElement('div');

        const startLabel = document.createElement('label');
        startLabel.textContent = '起始页:';

        const startInput = document.createElement('input');
        startInput.type = 'number';
        startInput.placeholder = '请输入起始页';

        startGroup.appendChild(startLabel);
        startGroup.appendChild(startInput);
        form.appendChild(startGroup);

        // 结束页
        const endGroup = document.createElement('div');

        const endLabel = document.createElement('label');
        endLabel.textContent = '结束页:';

        const endInput = document.createElement('input');
        endInput.type = 'number';
        endInput.placeholder = '请输入结束页';

        endGroup.appendChild(endLabel);
        endGroup.appendChild(endInput);
        form.appendChild(endGroup);

        // 按钮区域
        const buttonGroup = document.createElement('div');

        const startButton = document.createElement('button');
        startButton.textContent = '开始下载';

        const cancelButton = document.createElement('button');
        cancelButton.textContent = '取消';

        buttonGroup.appendChild(startButton);
        buttonGroup.appendChild(cancelButton);
        form.appendChild(buttonGroup);

        // 调试框
        const debugContainer = document.createElement('div');
        debugContainer.id = 'debugContainer';
        debugContainer.style.cssText = 'margin-top: 10px; padding: 5px;';

        const debugTitle = document.createElement('div');
        debugTitle.textContent = '调试信息';

        const debugBox = document.createElement('div');
        debugBox.id = 'debugBox';
        debugBox.style.cssText = 'width: 100%; height: 150px; overflow-y: auto; font-family: monospace; font-size: 10px; white-space: pre-wrap;';

        debugContainer.appendChild(debugTitle);
        debugContainer.appendChild(debugBox);
        form.appendChild(debugContainer);

        // 组装卡片
        card.appendChild(title);
        card.appendChild(form);
        mainContainer.appendChild(card);
        container.appendChild(mainContainer);

        // 添加到页面
        document.body.appendChild(container);

        // 绑定事件
        startButton.addEventListener('click', (e) => {
            e.preventDefault();
            handleStartDownload(startInput, endInput);
        });

        cancelButton.addEventListener('click', () => {
            document.body.removeChild(container);
        });

        // 立即显示调试框
        debugBox.style.display = 'block';
    }

    // 处理开始下载
    function handleStartDownload(startInput, endInput) {
        // 验证输入
        const startPage = parseInt(startInput.value);
        const endPage = parseInt(endInput.value);

        if (isNaN(startPage) || isNaN(endPage)) {
            alert('请输入有效的页码');
            return;
        }

        if (startPage > endPage) {
            alert('起始页不能大于结束页');
            return;
        }

        // 先嗅探ID
        addDebugMessage('开始嗅探当前页面的ID...');

        const imgElements = document.querySelectorAll('img');
        addDebugMessage(`找到 ${imgElements.length} 个图片元素`);

        let found = false;
        let bookId = '';
        let timeId = '';

        // 遍历图片元素查找符合格式的链接
        for (let i = 0; i < imgElements.length; i++) {
            const src = imgElements[i].src;
            addDebugMessage(`检查图片 ${i+1}: ${src}`);

            if (src.includes('book.pep.com.cn')) {
                const match = src.match(/book\.pep\.com\.cn\/(\d+)\/files\/mobile\/\d+\.jpg\?(\d+)/);
                if (match) {
                    bookId = match[1];
                    timeId = match[2];
                    found = true;
                    addDebugMessage(`找到符合格式的图片: ${src}`);
                    addDebugMessage(`提取的书本编号: ${bookId}`);
                    addDebugMessage(`提取的时间戳: ${timeId}`);
                    break;
                }
            }
        }

        if (!found) {
            addDebugMessage('错误: 未找到符合格式的图片链接');
            alert('未找到符合格式的图片链接');
            return;
        }

        // 开始下载
        startDownload(bookId, timeId, startPage, endPage);
    }

    // 开始下载
    function startDownload(bookId, timeId, startPage, endPage) {
        addDebugMessage(`开始下载: bookId=${bookId}, timeId=${timeId}`);
        addDebugMessage(`范围: ${startPage}-${endPage}`);

        // 生成URL列表
        const urls = [];
        for (let i = startPage; i <= endPage; i++) {
            const url = `https://book.pep.com.cn/${bookId}/files/mobile/${i}.jpg?${timeId}`;
            urls.push(url);
            addDebugMessage(`URL ${i}: ${url}`);
        }

        // 禁用按钮
        const startButton = document.querySelector('#batchDownloadContainer #startDownloadBtn') ||
                          document.querySelector('#batchDownloadContainer button[type="submit"]');
        if (startButton) {
            startButton.disabled = true;
            startButton.textContent = '下载中...';
        }

        // 下载图片
        downloadImage(0, urls, bookId);
    }

    // 下载图片
    function downloadImage(index, urls, bookId) {
        if (index >= urls.length) {
            addDebugMessage('下载完成');
            const startButton = document.querySelector('#batchDownloadContainer #startDownloadBtn') ||
                              document.querySelector('#batchDownloadContainer button[type="submit"]');
            if (startButton) {
                startButton.disabled = false;
                startButton.textContent = '开始下载';
            }
            return;
        }

        const url = urls[index];
        const page = index + 1;

        addDebugMessage(`下载第 ${page} 张图片: ${url}`);

        if (typeof GM_download !== 'undefined') {
            GM_download({
                url: url,
                name: `${bookId}_page_${page}.jpg`,
                headers: {
                    'Referer': 'https://book.pep.com.cn/',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                },
                onload: function() {
                    addDebugMessage(`第 ${page} 张图片下载成功`);
                    setTimeout(() => downloadImage(index + 1, urls, bookId), 500);
                },
                onerror: function(error) {
                    addDebugMessage(`GM_download失败: ${JSON.stringify(error)}`);
                    addDebugMessage(`尝试使用fetch方式下载第 ${page} 张图片`);

                    fetch(url, {
                        method: 'GET',
                        headers: {
                            'Referer': 'https://book.pep.com.cn/',
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                        }
                    })
                    .then(response => {
                        if (!response.ok) {
                            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                        }
                        return response.blob();
                    })
                    .then(blob => {
                        const downloadUrl = window.URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = downloadUrl;
                        a.download = `${bookId}_page_${page}.jpg`;

                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        window.URL.revokeObjectURL(downloadUrl);

                        addDebugMessage(`第 ${page} 张图片fetch下载成功`);
                        setTimeout(() => downloadImage(index + 1, urls, bookId), 500);
                    })
                    .catch(fetchError => {
                        addDebugMessage(`fetch下载失败: ${fetchError.message}`);
                        setTimeout(() => downloadImage(index + 1, urls, bookId), 500);
                    });
                }
            });
        } else {
            addDebugMessage('GM_download不可用，使用fetch方式');
            fetch(url, {
                method: 'GET',
                headers: {
                    'Referer': 'https://book.pep.com.cn/',
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                }
            })
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                return response.blob();
            })
            .then(blob => {
                const downloadUrl = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = downloadUrl;
                a.download = `${bookId}_page_${page}.jpg`;

                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                window.URL.revokeObjectURL(downloadUrl);

                addDebugMessage(`第 ${page} 张图片下载成功`);
                setTimeout(() => downloadImage(index + 1, urls, bookId), 500);
            })
            .catch(error => {
                addDebugMessage(`下载失败: ${error.message}`);
                setTimeout(() => downloadImage(index + 1, urls, bookId), 500);
            });
        }
    }

    // 创建下载按钮
    function createDownloadButton() {
        if (document.getElementById('batchDownloadBtn')) {
            return;
        }

        const button = document.createElement('button');
        button.id = 'batchDownloadBtn';
        button.textContent = '批量下载';

        button.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            createDownloadInterface();
        });

        document.body.appendChild(button);
    }

    // 初始化
    createDownloadButton();

    // 默认显示下载界面
    setTimeout(() => {
        createDownloadInterface();
    }, 100);
})();
