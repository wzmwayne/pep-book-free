// ==UserScript==
// @name         人教课本爬取器-通过打印PDF
// @namespace    http://tampermonkey.net/
// @version      0.9
// @description  极简样式，使用浏览器打印接口生成PDF
// @author       You
// @match        https://book.pep.com.cn/*
// @grant        GM_download
// @connect      book.pep.com.cn
// ==/UserScript==

(function() {
    'use strict';

    let debugInfo = [];

    function addDebugMessage(msg) {
        const time = new Date().toLocaleTimeString();
        const full = `[${time}] ${msg}`;
        debugInfo.push(full);
        const box = document.getElementById('debugBox');
        if (box) {
            box.textContent = debugInfo.join('\n');
            box.scrollTop = box.scrollHeight;
        }
    }

    function createMainPanel() {
        if (document.getElementById('pepPanel')) return;

        const panel = document.createElement('div');
        panel.id = 'pepPanel';
        panel.style.cssText = 'position:fixed;top:10px;right:10px;z-index:999999;background:white;border:1px solid black;padding:5px;';

        const title = document.createElement('b');
        title.textContent = '人教课本工具';
        panel.appendChild(title);
        panel.appendChild(document.createElement('br'));

        const startLabel = document.createElement('span');
        startLabel.textContent = '起始页: ';
        panel.appendChild(startLabel);

        const startInput = document.createElement('input');
        startInput.id = 'startInput';
        startInput.type = 'number';
        startInput.value = '1';
        startInput.size = 6;
        panel.appendChild(startInput);

        const endLabel = document.createElement('span');
        endLabel.textContent = ' 结束页: ';
        panel.appendChild(endLabel);

        const endInput = document.createElement('input');
        endInput.id = 'endInput';
        endInput.type = 'number';
        endInput.value = '10';
        endInput.size = 6;
        panel.appendChild(endInput);

        panel.appendChild(document.createElement('br'));

        const downloadBtn = document.createElement('button');
        downloadBtn.textContent = '下载图片';
        panel.appendChild(downloadBtn);

        const printBtn = document.createElement('button');
        printBtn.textContent = '调用打印生成PDF';
        panel.appendChild(printBtn);

        const closeBtn = document.createElement('button');
        closeBtn.textContent = '关闭';
        panel.appendChild(closeBtn);

        panel.appendChild(document.createElement('br'));

        const debugBox = document.createElement('textarea');
        debugBox.id = 'debugBox';
        debugBox.readOnly = true;
        debugBox.rows = 8;
        debugBox.cols = 50;
        debugBox.style.cssText = 'margin-top:5px;';
        panel.appendChild(debugBox);

        document.body.appendChild(panel);

        closeBtn.onclick = () => panel.remove();
        downloadBtn.onclick = handleDownload;
        printBtn.onclick = handleOpenPrintWindow;

        debugBox.value = debugInfo.join('\n');
    }

    function extractIds() {
        const imgs = document.querySelectorAll('img');
        for (let img of imgs) {
            const m = img.src.match(/book\.pep\.com\.cn\/(\d+)\/files\/mobile\/\d+\.jpg\?(\d+)/);
            if (m) return { bookId: m[1], timeId: m[2] };
        }
        return null;
    }

    function handleDownload() {
        const start = parseInt(document.getElementById('startInput').value);
        const end = parseInt(document.getElementById('endInput').value);
        if (isNaN(start) || isNaN(end) || start > end) {
            alert('页码无效');
            return;
        }
        const ids = extractIds();
        if (!ids) {
            alert('未检测到课本图片');
            return;
        }
        addDebugMessage(`开始下载: ${ids.bookId} 页码 ${start}-${end}`);
        startDownload(ids.bookId, ids.timeId, start, end);
    }

    function handleOpenPrintWindow() {
        const start = parseInt(document.getElementById('startInput').value);
        const end = parseInt(document.getElementById('endInput').value);
        if (isNaN(start) || isNaN(end) || start > end) {
            alert('页码无效');
            return;
        }
        const ids = extractIds();
        if (!ids) {
            alert('未检测到课本图片');
            return;
        }
        addDebugMessage(`打开打印样式窗口: ${ids.bookId} 页码 ${start}-${end}`);
        createPrintWindow(ids.bookId, ids.timeId, start, end);
    }

    function createPrintWindow(bookId, timeId, start, end) {
        let imgsHtml = '';
        for (let i = start; i <= end; i++) {
            // 每张图片直接放在 div 中，不做任何分页控制
            imgsHtml += `<div style="text-align:center; margin:0; padding:0;"><img id="img_${i}" src="https://book.pep.com.cn/${bookId}/files/mobile/${i}.jpg?${timeId}" style="width:100%; height:auto; display:block;" onerror="this.style.display='none'"></div>`;
        }

        const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>打印预览 - ${bookId}</title>
                <style>
                    /* 极简重置，完全依赖浏览器自动分页 */
                    * {
                        margin: 0;
                        padding: 0;
                        box-sizing: border-box;
                    }
                    body {
                        background: white;
                    }
                    /* 打印时去除默认页边距 */
                    @page {
                        margin: 0;
                    }
                    /* 悬浮状态面板 */
                    #statusArea {
                        position: fixed;
                        top: 10px;
                        right: 10px;
                        background: white;
                        padding: 6px 10px;
                        border: 1px solid #aaa;
                        font-family: monospace;
                        font-size: 14px;
                        z-index: 9999;
                    }
                    #controlPanel {
                        position: fixed;
                        top: 50px;
                        right: 10px;
                        background: white;
                        padding: 8px;
                        border: 1px solid #aaa;
                        font-family: sans-serif;
                        font-size: 14px;
                        z-index: 9999;
                    }
                    button {
                        margin: 2px;
                        padding: 4px 8px;
                    }
                </style>
            </head>
            <body>
                ${imgsHtml}
                <div id="statusArea">已加载 0 / ${end - start + 1}</div>
                <div id="controlPanel">
                    <button id="printActionBtn">强制调用打印</button>
                </div>
                <script>
                    const total = ${end - start + 1};
                    let loaded = 0;
                    const statusDiv = document.getElementById('statusArea');
                    const controlDiv = document.getElementById('controlPanel');
                    const printBtn = document.getElementById('printActionBtn');

                    function updateStatus() {
                        statusDiv.textContent = '已加载 ' + loaded + ' / ' + total;
                        if (loaded >= total) {
                            statusDiv.textContent = '全部加载完成，可调用打印';
                            printBtn.textContent = '调用打印';
                        }
                    }

                    function imageLoaded() {
                        loaded++;
                        updateStatus();
                    }

                    for (let i = ${start}; i <= ${end}; i++) {
                        const img = document.getElementById('img_' + i);
                        if (img) {
                            if (img.complete) {
                                imageLoaded();
                            } else {
                                img.addEventListener('load', imageLoaded);
                                img.addEventListener('error', function() {
                                    imageLoaded();
                                });
                            }
                        } else {
                            imageLoaded();
                        }
                    }

                    setTimeout(() => {
                        if (loaded < total) {
                            loaded = total;
                            updateStatus();
                        }
                    }, 30000);

                    function doPrint() {
                        statusDiv.style.display = 'none';
                        controlDiv.style.display = 'none';
                        setTimeout(() => {
                            window.print();
                            window.addEventListener('afterprint', function() {
                                statusDiv.style.display = 'block';
                                controlDiv.style.display = 'block';
                            }, { once: true });
                        }, 500);
                    }

                    printBtn.addEventListener('click', doPrint);
                </script>
            </body>
            </html>
        `;

        const w = window.open('', '_blank');
        if (!w) {
            alert('浏览器阻止了弹窗，请允许后重试');
            return;
        }
        w.document.write(html);
        w.document.close();
        addDebugMessage('打印样式窗口已打开');
    }

    function startDownload(bookId, timeId, start, end) {
        const urls = [];
        for (let i = start; i <= end; i++) {
            urls.push(`https://book.pep.com.cn/${bookId}/files/mobile/${i}.jpg?${timeId}`);
        }
        downloadImage(0, urls, bookId);
    }

    function downloadImage(idx, urls, bookId) {
        if (idx >= urls.length) {
            addDebugMessage('全部下载任务已提交');
            return;
        }
        const url = urls[idx];
        const page = idx + 1;
        if (typeof GM_down
