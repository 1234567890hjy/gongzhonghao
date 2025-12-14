class FileManager {
    constructor() {
        this.files = JSON.parse(localStorage.getItem('fileManagerFiles')) || [];
        this.selectedFiles = [];
        this.currentViewingFile = null;
        // 分页相关属性
        this.pageSize = 10; // 每页显示10个文件
        this.currentPage = 1;
        this.totalPages = 1;
        this.totalItems = 0;
        this.init();
    }

    init() {
        this.bindEvents();
        this.renderFileList();
    }

    bindEvents() {
        const uploadBtn = document.getElementById('uploadBtn');
        const fileInput = document.getElementById('fileInput');
        const searchInput = document.getElementById('searchInput');
        const filterSelect = document.getElementById('filterSelect');
        const sortSelect = document.getElementById('sortSelect');
        const batchDeleteBtn = document.getElementById('batchDeleteBtn');
        const selectAllBtn = document.getElementById('selectAllBtn');
        const selectNoneBtn = document.getElementById('selectNoneBtn');
        const deleteAllBtn = document.getElementById('deleteAllBtn');
        const deleteBySuffixBtn = document.getElementById('deleteBySuffixBtn');

        // 添加调试日志
        console.log('Upload button element:', uploadBtn);
        console.log('File input element:', fileInput);

        // 确保事件监听器正确绑定
        uploadBtn.addEventListener('click', (e) => {
            console.log('Upload button clicked!');
            fileInput.click();
        });
        fileInput.addEventListener('change', (e) => {
            console.log('File selected:', e.target.files.length);
            this.handleFileUpload(e);
        });
        searchInput.addEventListener('input', (e) => {
            this.currentPage = 1; // 搜索时重置到第一页
            this.handleSearch(e);
        });
        filterSelect.addEventListener('change', () => {
            this.currentPage = 1; // 过滤时重置到第一页
            this.renderFileList();
        });
        sortSelect.addEventListener('change', () => {
            this.currentPage = 1; // 排序时重置到第一页
            this.renderFileList();
        });
        batchDeleteBtn.addEventListener('click', () => this.handleBatchDelete());
        selectAllBtn.addEventListener('click', () => this.selectAll());
        selectNoneBtn.addEventListener('click', () => this.selectNone());
        deleteAllBtn.addEventListener('click', () => this.handleDeleteAll());
        deleteBySuffixBtn.addEventListener('click', () => this.deleteFilesBySuffix());
        
        // 收藏夹按钮事件
        const favoriteBtn = document.getElementById('favoriteBtn');
        if (favoriteBtn) {
            favoriteBtn.addEventListener('click', () => this.openFavoriteWindow());
        }
    }

    // 打开收藏窗口
    openFavoriteWindow() {
        const favoriteWindow = document.getElementById('favoriteWindow');
        if (favoriteWindow) {
            favoriteWindow.style.display = 'block';
            this.renderFavoriteFileList();
        }
    }

    // 关闭收藏窗口
    closeFavoriteWindow() {
        const favoriteWindow = document.getElementById('favoriteWindow');
        if (favoriteWindow) {
            favoriteWindow.style.display = 'none';
        }
    }

    // 渲染收藏的文件列表
    renderFavoriteFileList() {
        const favoriteFileList = document.getElementById('favoriteFileList');
        if (!favoriteFileList) return;

        // 获取所有收藏的文件
        const favoriteFiles = this.files.filter(file => file.favorite);

        favoriteFileList.innerHTML = '';

        if (favoriteFiles.length === 0) {
            favoriteFileList.innerHTML = '<div style="text-align: center; padding: 2rem; color: #666; font-size: 1.1rem;">暂无收藏的文件</div>';
            return;
        }

        // 按照上传时间倒序排序
        const sortedFavoriteFiles = [...favoriteFiles].sort((a, b) => {
            return new Date(b.uploadedAt) - new Date(a.uploadedAt);
        });

        sortedFavoriteFiles.forEach(file => {
            const fileItem = this.createFileItem(file);
            favoriteFileList.appendChild(fileItem);
        });
    }

    handleFileUpload(event) {
        const fileList = event.target.files;
        console.log('实际选择的文件数量:', fileList.length);
        if (fileList.length === 0) return;

        // 添加上传进度显示
        this.showUploadProgress(fileList.length);

        // 实现分批上传，优化批次大小和处理逻辑
        const batchSize = 20; // 增加批次大小到20，提高上传速度
        let currentIndex = 0;
        const filesToUpload = Array.from(fileList);
        const uploadedFiles = [];
        const failedFiles = [];

        const processBatch = () => {
            const batch = filesToUpload.slice(currentIndex, currentIndex + batchSize);
            if (batch.length === 0) {
                // 所有文件上传完成
                this.finishBatchUpload(uploadedFiles, failedFiles, filesToUpload.length);
                event.target.value = '';
                return;
            }

            let batchProcessed = 0;
            
            // 批量处理当前批次的所有文件
            batch.forEach(file => {
                try {
                    this.uploadFile(file, (fileData) => {
                        uploadedFiles.push(fileData);
                        batchProcessed++;
                        
                        // 更新上传进度（每5个文件更新一次，减少DOM操作）
                        if (batchProcessed % 5 === 0 || batchProcessed === batch.length) {
                            this.updateUploadProgress(uploadedFiles.length, filesToUpload.length);
                        }
                        
                        if (batchProcessed === batch.length) {
                            // 当前批次上传完成，处理下一批
                            currentIndex += batchSize;
                            // 移除不必要的延迟，提高上传速度
                            requestAnimationFrame(processBatch);
                        }
                    });
                } catch (error) {
                    console.error('文件上传失败:', file.name, error);
                    failedFiles.push(file.name);
                    batchProcessed++;
                    
                    // 更新上传进度
                    if (batchProcessed % 5 === 0 || batchProcessed === batch.length) {
                        this.updateUploadProgress(uploadedFiles.length, filesToUpload.length);
                    }
                    
                    if (batchProcessed === batch.length) {
                        // 当前批次上传完成，处理下一批
                        currentIndex += batchSize;
                        requestAnimationFrame(processBatch);
                    }
                }
            });
        };

        processBatch();
    }

    uploadFile(file, onComplete) {
        const fileId = Date.now() + Math.random().toString(36).substr(2, 9) + Math.random().toString(36).substr(2, 5);
        
        // 提取文件名（如果是文件夹上传，file.name会包含相对路径）
        const fileName = file.webkitRelativePath ? file.webkitRelativePath.split('/').pop() : file.name;
        
        const fileType = this.getFileType(file.type, fileName);

        // 使用createObjectURL替代FileReader，减少内存占用
        const fileData = {
            id: fileId,
            name: fileName,
            type: fileType,
            size: file.size,
            uploadedAt: new Date().toISOString(),
            content: URL.createObjectURL(file),
            favorite: false
        };

        if (onComplete) {
            onComplete(fileData);
        }
    }

    finishBatchUpload(uploadedFiles, failedFiles, totalFiles) {
        // 获取最新的文件数据
        const updatedFiles = JSON.parse(localStorage.getItem('fileManagerFiles')) || this.files;
        
        // 批量添加所有上传的文件
        updatedFiles.push(...uploadedFiles);
        this.files = updatedFiles;
        
        // 只保存一次到localStorage
        this.saveToStorage();
        
        // 只更新一次界面
        this.renderFileList();
        
        // 隐藏上传进度
        this.hideUploadProgress();
        
        // 显示上传完成提示
        let message = '成功上传 ' + uploadedFiles.length + ' 个文件';
        if (failedFiles.length > 0) {
            message += '，失败 ' + failedFiles.length + ' 个文件';
        }
        alert(message);
    }

    showUploadProgress(totalFiles) {
        // 检查是否已存在进度元素
        let progressContainer = document.getElementById('uploadProgressContainer');
        if (!progressContainer) {
            progressContainer = document.createElement('div');
            progressContainer.id = 'uploadProgressContainer';
            progressContainer.style.cssText = `
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                background-color: rgba(255, 255, 255, 0.95);
                padding: 2rem;
                border-radius: 12px;
                box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
                z-index: 1000;
                text-align: center;
                min-width: 300px;
            `;
            
            const progressText = document.createElement('div');
            progressText.id = 'uploadProgressText';
            progressText.style.cssText = `
                margin-bottom: 1rem;
                font-size: 1.2rem;
                color: #333;
                font-weight: 500;
            `;
            progressText.textContent = '准备上传...';
            
            const progressBar = document.createElement('div');
            progressBar.id = 'uploadProgressBar';
            progressBar.style.cssText = `
                width: 100%;
                height: 12px;
                background-color: #e0e0e0;
                border-radius: 6px;
                overflow: hidden;
                margin-bottom: 0.5rem;
            `;
            
            const progressFill = document.createElement('div');
            progressFill.id = 'uploadProgressFill';
            progressFill.style.cssText = `
                height: 100%;
                background-color: #2196F3;
                width: 0%;
                transition: width 0.3s ease;
            `;
            
            const progressDetail = document.createElement('div');
            progressDetail.id = 'uploadProgressDetail';
            progressDetail.style.cssText = `
                font-size: 0.9rem;
                color: #666;
            `;
            progressDetail.textContent = `0/${totalFiles}`;
            
            progressBar.appendChild(progressFill);
            progressContainer.appendChild(progressText);
            progressContainer.appendChild(progressBar);
            progressContainer.appendChild(progressDetail);
            
            document.body.appendChild(progressContainer);
        } else {
            // 更新已存在的进度元素
            const progressDetail = document.getElementById('uploadProgressDetail');
            if (progressDetail) {
                progressDetail.textContent = `0/${totalFiles}`;
            }
            const progressText = document.getElementById('uploadProgressText');
            if (progressText) {
                progressText.textContent = '准备上传...';
            }
            const progressFill = document.getElementById('uploadProgressFill');
            if (progressFill) {
                progressFill.style.width = '0%';
            }
        }
    }

    updateUploadProgress(uploadedCount, totalFiles) {
        const progressText = document.getElementById('uploadProgressText');
        const progressFill = document.getElementById('uploadProgressFill');
        const progressDetail = document.getElementById('uploadProgressDetail');
        
        if (progressText) {
            progressText.textContent = `正在上传...`;
        }
        if (progressFill) {
            const percentage = Math.round((uploadedCount / totalFiles) * 100);
            progressFill.style.width = percentage + '%';
        }
        if (progressDetail) {
            progressDetail.textContent = `${uploadedCount}/${totalFiles}`;
        }
    }

    hideUploadProgress() {
        const progressContainer = document.getElementById('uploadProgressContainer');
        if (progressContainer) {
            document.body.removeChild(progressContainer);
        }
    }

    getFileType(mimeType, fileName) {
        const ext = fileName.split('.').pop().toLowerCase();
        if (mimeType.includes('pdf') || ext === 'pdf') return 'pdf';
        if (mimeType.includes('html') || ext === 'html') return 'html';
        if (mimeType.includes('image') || ['jpg', 'jpeg', 'png', 'gif', 'bmp'].includes(ext)) return 'image';
        if (mimeType.includes('zip') || ext === 'zip' || ext === 'rar') return 'zip';
        return 'other';
    }

    getFileIcon(type) {
        switch (type) {
            case 'pdf': return '📄';
            case 'html': return '🌐';
            case 'image': return '🖼️';
            case 'zip': return '🗜️';
            default: return '📁';
        }
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleString('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    sortFiles(files) {
        const sortBy = document.getElementById('sortSelect').value;
        
        return [...files].sort((a, b) => {
            switch (sortBy) {
                case 'newest':
                    return new Date(b.uploadedAt) - new Date(a.uploadedAt);
                case 'oldest':
                    return new Date(a.uploadedAt) - new Date(b.uploadedAt);
                case 'name_asc':
                    return a.name.localeCompare(b.name);
                case 'name_desc':
                    return b.name.localeCompare(a.name);
                default:
                    return 0;
            }
        });
    }

    filterFiles(files) {
        const filter = document.getElementById('filterSelect').value;
        if (filter === 'all') return files;
        
        return files.filter(file => {
            switch (filter) {
                case 'pdf': return file.type === 'pdf';
                case 'html': return file.type === 'html';
                case 'image': return file.type === 'image';
                case 'zip': return file.type === 'zip';
                default: return true;
            }
        });
    }

    searchFiles(files, searchTerm) {
        if (!searchTerm) return files;
        
        return files.filter(file => {
            return file.name.toLowerCase().includes(searchTerm.toLowerCase());
        });
    }

    renderFileList() {
        const fileListElement = document.getElementById('fileList');
        const searchTerm = document.getElementById('searchInput').value;
        
        let filteredFiles = this.filterFiles(this.files);
        let searchedFiles = this.searchFiles(filteredFiles, searchTerm);
        let sortedFiles = this.sortFiles(searchedFiles);

        // 计算分页信息
        this.totalItems = sortedFiles.length;
        this.totalPages = Math.ceil(this.totalItems / this.pageSize);
        
        // 确保当前页不超过总页数
        if (this.currentPage > this.totalPages) {
            this.currentPage = Math.max(1, this.totalPages);
        }

        fileListElement.innerHTML = '';

        if (sortedFiles.length === 0) {
            fileListElement.innerHTML = '<div style="text-align: center; padding: 2rem; color: #666; font-size: 1.1rem;">暂无文件</div>';
            document.getElementById('batchDeleteBtn').style.display = 'none';
            this.renderPagination();
            return;
        }

        // 获取当前页的文件
        const startIndex = (this.currentPage - 1) * this.pageSize;
        const endIndex = startIndex + this.pageSize;
        const currentPageFiles = sortedFiles.slice(startIndex, endIndex);

        currentPageFiles.forEach(file => {
            const fileItem = this.createFileItem(file);
            fileListElement.appendChild(fileItem);
        });

        this.updateBatchDeleteButton();
        this.renderPagination();
    }

    createFileItem(file) {
        const fileItem = document.createElement('div');
        fileItem.className = 'file-item';
        fileItem.dataset.id = file.id;

        const isSelected = this.selectedFiles.includes(file.id);

        fileItem.innerHTML = '<input type="checkbox" class="file-checkbox" ' + (isSelected ? 'checked' : '') + ' onchange="fileManager.toggleFileSelection(\'' + file.id + '\', this.checked)">' +
                             '<div class="file-icon ' + file.type + '">' + this.getFileIcon(file.type) + '</div>' +
                             '<div class="file-info">' +
                                 '<div class="file-name">' + file.name + '</div>' +
                                 '<div class="file-meta">' +
                                     this.formatFileSize(file.size) + ' • ' + this.formatDate(file.uploadedAt) +
                                 '</div>' +
                             '</div>' +
                             '<div class="file-actions">' +
                                 '<button class="btn-icon favorite ' + (file.favorite ? 'active' : '') + '" ' +
                                         'title="' + (file.favorite ? '取消收藏' : '收藏') + '" ' +
                                         'onclick="fileManager.toggleFavorite(\'' + file.id + '\')">★</button>' +
                                 '<button class="btn-icon" title="查看文件" onclick="fileManager.viewFile(\'' + file.id + '\')">👁️</button>' +
                                 '<button class="btn-icon" title="删除文件" onclick="fileManager.deleteFile(\'' + file.id + '\')">🗑️</button>' +
                             '</div>';

        return fileItem;
    }

    toggleFileSelection(fileId, checked) {
        if (checked) {
            if (!this.selectedFiles.includes(fileId)) {
                this.selectedFiles.push(fileId);
            }
        } else {
            this.selectedFiles = this.selectedFiles.filter(id => id !== fileId);
        }
        
        this.updateBatchDeleteButton();
        this.updateFileItemSelection(fileId, checked);
    }

    updateFileItemSelection(fileId, selected) {
        const fileItem = document.querySelector('[data-id="' + fileId + '"]');
        if (fileItem) {
            fileItem.classList.toggle('selected', selected);
        }
    }

    updateBatchDeleteButton() {
        const batchDeleteBtn = document.getElementById('batchDeleteBtn');
        batchDeleteBtn.style.display = this.selectedFiles.length > 0 ? 'inline-block' : 'none';
    }


    viewFile(fileId) {
        const file = this.files.find(f => f.id === fileId);
        if (!file) return;

        this.currentViewingFile = file;
        this.openFileViewer(file);
    }

    openFileViewer(file) {
        const viewerWindow = window.open('', '_blank', 'width=800,height=600');
        
        let viewerContent = '';
        
        switch (file.type) {
            case 'pdf':
                viewerContent = this.createPdfViewer(file);
                break;
            case 'html':
                viewerContent = this.createHtmlViewer(file);
                break;
            case 'image':
                viewerContent = this.createImageViewer(file);
                break;
            default:
                viewerContent = this.createDefaultViewer(file);
        }

        viewerWindow.document.write(viewerContent);
        viewerWindow.document.close();
    }

    createPdfViewer(file) {
        return '<!DOCTYPE html>' +
               '<html>' +
               '<head>' +
               '<title>查看 ' + file.name + '</title>' +
               '<style>' +
                   'body { margin: 0; padding: 20px; font-family: Arial, sans-serif; background-color: #f5f5f5; }' +
                   '.viewer-container { max-width: 100%; margin: 0 auto; background-color: white; padding: 20px; border-radius: 10px; box-shadow: 0 0 20px rgba(0,0,0,0.1); }' +
                   '.pdf-container { width: 100%; height: 70vh; border: 1px solid #ddd; border-radius: 8px; }' +
                   '.controls { margin-top: 20px; display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }' +
                   '.btn { padding: 8px 16px; border: none; border-radius: 6px; cursor: pointer; font-size: 14px; transition: all 0.3s; }' +
                   '.btn-primary { background-color: #2196F3; color: white; }' +
                   '.btn-primary:hover { background-color: #1976D2; }' +
                   '.control-group { display: flex; gap: 5px; align-items: center; }' +
                   '.control-label { font-size: 14px; color: #666; margin-right: 5px; }' +
                   'select { padding: 6px 10px; border: 1px solid #ddd; border-radius: 4px; font-size: 14px; }' +
               '</style>' +
               '</head>' +
               '<body>' +
               '<div class="viewer-container">' +
                   '<h2 style="margin-bottom: 20px; color: #333;">' + file.name + '</h2>' +
                   '<iframe id="pdfFrame" src="' + file.content + '" class="pdf-container" type="application/pdf"></iframe>' +
                   '<div class="controls">' +
                       '<div class="control-group">' +
                           '<span class="control-label">缩放:</span>' +
                           '<button class="btn btn-primary" onclick="zoomPDF(-0.1)">-</button>' +
                           '<button class="btn btn-primary" onclick="zoomPDF(0.1)">+</button>' +
                           '<button class="btn btn-primary" onclick="resetZoom()">重置</button>' +
                       '</div>' +
                       '<button class="btn btn-primary" onclick="window.close()">关闭</button>' +
                   '</div>' +
               '</div>' +
               '<script>' +
                   'let currentZoom = 1.0;' +
                   'const pdfFrame = document.getElementById("pdfFrame");' +
                   'function zoomPDF(amount) {' +
                       'currentZoom += amount;' +
                       'currentZoom = Math.max(0.5, Math.min(3.0, currentZoom));' +
                       'pdfFrame.style.transform = "scale(" + currentZoom + ")";' +
                       'pdfFrame.style.transformOrigin = "top left";' +
                   '}' +
                   'function resetZoom() {' +
                       'currentZoom = 1.0;' +
                       'pdfFrame.style.transform = "scale(1.0)";' +
                   '}' +
               '</script>' +
               '</body>' +
               '</html>';
    }

    createHtmlViewer(file) {
        return '<!DOCTYPE html>' +
               '<html>' +
               '<head>' +
               '<title>查看 ' + file.name + '</title>' +
               '<style>' +
                   'body { margin: 0; padding: 20px; font-family: Arial, sans-serif; background-color: #f5f5f5; }' +
                   '.viewer-container { max-width: 100%; margin: 0 auto; background-color: white; padding: 20px; border-radius: 10px; box-shadow: 0 0 20px rgba(0,0,0,0.1); }' +
                   '.html-container { width: 100%; height: 70vh; border: 1px solid #ddd; border-radius: 8px; overflow: auto; }' +
                   '.controls { margin-top: 20px; display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }' +
                   '.btn { padding: 8px 16px; border: none; border-radius: 6px; cursor: pointer; font-size: 14px; transition: all 0.3s; }' +
                   '.btn-primary { background-color: #2196F3; color: white; }' +
                   '.btn-primary:hover { background-color: #1976D2; }' +
                   '.control-group { display: flex; gap: 5px; align-items: center; }' +
                   '.control-label { font-size: 14px; color: #666; margin-right: 5px; }' +
                   'select { padding: 6px 10px; border: 1px solid #ddd; border-radius: 4px; font-size: 14px; }' +
               '</style>' +
               '</head>' +
               '<body>' +
               '<div class="viewer-container">' +
                   '<h2 style="margin-bottom: 20px; color: #333;">' + file.name + '</h2>' +
                   '<iframe id="htmlFrame" src="' + file.content + '" class="html-container"></iframe>' +
                   '<div class="controls">' +
                       '<div class="control-group">' +
                           '<span class="control-label">字体大小:</span>' +
                           '<select id="fontSizeSelect" onchange="changeFontSize(this.value)">' +
                               '<option value="12px">12px</option>' +
                               '<option value="14px" selected>14px</option>' +
                               '<option value="16px">16px</option>' +
                               '<option value="18px">18px</option>' +
                               '<option value="20px">20px</option>' +
                               '<option value="24px">24px</option>' +
                           '</select>' +
                       '</div>' +
                       '<div class="control-group">' +
                           '<span class="control-label">文字颜色:</span>' +
                           '<input type="color" id="textColorPicker" value="#000000" onchange="changeTextColor(this.value)">' +
                       '</div>' +
                       '<div class="control-group">' +
                           '<span class="control-label">背景颜色:</span>' +
                           '<input type="color" id="bgColorPicker" value="#ffffff" onchange="changeBgColor(this.value)">' +
                       '</div>' +
                       '<button class="btn btn-primary" onclick="window.close()">关闭</button>' +
                   '</div>' +
               '</div>' +
               '<script>' +
                   'const htmlFrame = document.getElementById("htmlFrame");' +
                   'htmlFrame.onload = function() {' +
                       'applyStyles();' +
                   '};' +
                   'function applyStyles() {' +
                       'const fontSize = document.getElementById("fontSizeSelect").value;' +
                       'const textColor = document.getElementById("textColorPicker").value;' +
                       'const bgColor = document.getElementById("bgColorPicker").value;' +
                       'const doc = htmlFrame.contentDocument || htmlFrame.contentWindow.document;' +
                       'const body = doc.body;' +
                       'body.style.fontSize = fontSize;' +
                       'body.style.color = textColor;' +
                       'body.style.backgroundColor = bgColor;' +
                       'const textElements = doc.querySelectorAll("p, span, div, h1, h2, h3, h4, h5, h6");' +
                       'textElements.forEach(function(el) {' +
                           'el.style.fontSize = fontSize;' +
                           'el.style.color = textColor;' +
                       '});' +
                   '}' +
                   'function changeFontSize(size) {' +
                       'const doc = htmlFrame.contentDocument || htmlFrame.contentWindow.document;' +
                       'const body = doc.body;' +
                       'body.style.fontSize = size;' +
                       'const textElements = doc.querySelectorAll("p, span, div, h1, h2, h3, h4, h5, h6");' +
                       'textElements.forEach(function(el) {' +
                           'el.style.fontSize = size;' +
                       '});' +
                   '}' +
                   'function changeTextColor(color) {' +
                       'const doc = htmlFrame.contentDocument || htmlFrame.contentWindow.document;' +
                       'const body = doc.body;' +
                       'body.style.color = color;' +
                       'const textElements = doc.querySelectorAll("p, span, div, h1, h2, h3, h4, h5, h6");' +
                       'textElements.forEach(function(el) {' +
                           'el.style.color = color;' +
                       '});' +
                   '}' +
                   'function changeBgColor(color) {' +
                       'const doc = htmlFrame.contentDocument || htmlFrame.contentWindow.document;' +
                       'const body = doc.body;' +
                       'body.style.backgroundColor = color;' +
                   '}' +
               '</script>' +
               '</body>' +
               '</html>';
    }

    createImageViewer(file) {
        return '<!DOCTYPE html>' +
               '<html>' +
               '<head>' +
               '<title>查看 ' + file.name + '</title>' +
               '<style>' +
                   'body { margin: 0; padding: 20px; font-family: Arial, sans-serif; background-color: #f5f5f5; }' +
                   '.viewer-container { max-width: 100%; margin: 0 auto; background-color: white; padding: 20px; border-radius: 10px; box-shadow: 0 0 20px rgba(0,0,0,0.1); text-align: center; }' +
                   '.image-container { margin: 20px 0; overflow: auto; height: 70vh; }' +
                   '.image-container img { max-width: 100%; max-height: 100%; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); transition: transform 0.3s ease; }' +
                   '.controls { margin-top: 20px; display: flex; gap: 10px; align-items: center; justify-content: center; flex-wrap: wrap; }' +
                   '.btn { padding: 8px 16px; border: none; border-radius: 6px; cursor: pointer; font-size: 14px; transition: all 0.3s; }' +
                   '.btn-primary { background-color: #2196F3; color: white; }' +
                   '.btn-primary:hover { background-color: #1976D2; }' +
                   '.control-group { display: flex; gap: 5px; align-items: center; }' +
                   '.control-label { font-size: 14px; color: #666; margin-right: 5px; }' +
               '</style>' +
               '</head>' +
               '<body>' +
               '<div class="viewer-container">' +
                   '<h2 style="margin-bottom: 20px; color: #333;">' + file.name + '</h2>' +
                   '<div class="image-container">' +
                       '<img id="viewerImage" src="' + file.content + '" alt="' + file.name + '">' +
                   '</div>' +
                   '<div class="controls">' +
                       '<div class="control-group">' +
                           '<span class="control-label">缩放:</span>' +
                           '<button class="btn btn-primary" onclick="zoomImage(-0.1)">-</button>' +
                           '<button class="btn btn-primary" onclick="zoomImage(0.1)">+</button>' +
                           '<button class="btn btn-primary" onclick="resetZoom()">重置</button>' +
                           '<button class="btn btn-primary" onclick="fitToScreen()">适应屏幕</button>' +
                       '</div>' +
                       '<button class="btn btn-primary" onclick="window.close()">关闭</button>' +
                   '</div>' +
               '</div>' +
               '<script>' +
                   'let currentZoom = 1.0;' +
                   'const image = document.getElementById("viewerImage");' +
                   'function zoomImage(amount) {' +
                       'currentZoom += amount;' +
                       'currentZoom = Math.max(0.1, Math.min(5.0, currentZoom));' +
                       'image.style.transform = "scale(" + currentZoom + ")";' +
                       'image.style.transformOrigin = "center center";' +
                   '}' +
                   'function resetZoom() {' +
                       'currentZoom = 1.0;' +
                       'image.style.transform = "scale(1.0)";' +
                       'image.style.maxWidth = "100%";' +
                       'image.style.maxHeight = "100%";' +
                   '}' +
                   'function fitToScreen() {' +
                       'const containerWidth = image.parentElement.clientWidth;' +
                       'const containerHeight = image.parentElement.clientHeight;' +
                       'const imageWidth = image.naturalWidth;' +
                       'const imageHeight = image.naturalHeight;' +
                       'const widthRatio = containerWidth / imageWidth;' +
                       'const heightRatio = containerHeight / imageHeight;' +
                       'const fitRatio = Math.min(widthRatio, heightRatio, 1.0);' +
                       'currentZoom = fitRatio;' +
                       'image.style.transform = "scale(" + currentZoom + ")";' +
                   '}' +
                   'window.onload = fitToScreen;' +
               '</script>' +
               '</body>' +
               '</html>';
    }

    createDefaultViewer(file) {
        return '<!DOCTYPE html>' +
               '<html>' +
               '<head>' +
               '<title>查看 ' + file.name + '</title>' +
               '<style>' +
                   'body { margin: 0; padding: 20px; font-family: Arial, sans-serif; background-color: #f5f5f5; }' +
                   '.viewer-container { max-width: 100%; margin: 0 auto; background-color: white; padding: 20px; border-radius: 10px; box-shadow: 0 0 20px rgba(0,0,0,0.1); text-align: center; }' +
                   '.message { padding: 40px 20px; color: #666; font-size: 1.2rem; }' +
                   '.btn { padding: 10px 20px; border: none; border-radius: 6px; cursor: pointer; font-size: 16px; background-color: #2196F3; color: white; transition: all 0.3s; }' +
                   '.btn:hover { background-color: #1976D2; }' +
               '</style>' +
               '</head>' +
               '<body>' +
               '<div class="viewer-container">' +
                   '<h2 style="margin-bottom: 20px; color: #333;">' + file.name + '</h2>' +
                   '<div class="message">该文件类型暂不支持在线查看</div>' +
                   '<button class="btn" onclick="window.close()">关闭</button>' +
               '</div>' +
               '</body>' +
               '</html>';
    }

    toggleFavorite(fileId) {
        const file = this.files.find(f => f.id === fileId);
        if (file) {
            file.favorite = !file.favorite;
            this.saveToStorage();
            this.renderFileList();
            
            // 如果收藏窗口是打开的，更新收藏文件列表
            const favoriteWindow = document.getElementById('favoriteWindow');
            if (favoriteWindow && favoriteWindow.style.display === 'block') {
                this.renderFavoriteFileList();
            }
        }
    }

    deleteFile(fileId) {
        if (confirm('确定要删除这个文件吗？')) {
            // 获取删除前的当前页文件数量
            const currentPageFilesCount = Math.min(this.currentPage * this.pageSize, this.totalItems) - (this.currentPage - 1) * this.pageSize;
            
            this.files = this.files.filter(file => file.id !== fileId);
            this.selectedFiles = this.selectedFiles.filter(id => id !== fileId);
            this.saveToStorage();
            
            // 如果当前页只有一个文件被删除，且不是第一页，则跳转到前一页
            if (currentPageFilesCount === 1 && this.currentPage > 1) {
                this.currentPage--;
            }
            
            this.renderFileList();
            
            // 如果收藏窗口是打开的，更新收藏文件列表
            const favoriteWindow = document.getElementById('favoriteWindow');
            if (favoriteWindow && favoriteWindow.style.display === 'block') {
                this.renderFavoriteFileList();
            }
        }
    }

    handleBatchDelete() {
        if (this.selectedFiles.length === 0) return;
        
        const selectedCount = this.selectedFiles.length;
        if (confirm('确定要删除选中的 ' + selectedCount + ' 个文件吗？')) {
            // 获取删除前的当前页文件数量
            const currentPageFilesCount = Math.min(this.currentPage * this.pageSize, this.totalItems) - (this.currentPage - 1) * this.pageSize;
            
            this.files = this.files.filter(file => !this.selectedFiles.includes(file.id));
            this.selectedFiles = [];
            this.saveToStorage();
            
            // 如果当前页的文件被删除完了，且不是第一页，则跳转到前一页
            if (selectedCount >= currentPageFilesCount && this.currentPage > 1) {
                this.currentPage--;
            }
            
            this.renderFileList();
            
            // 如果收藏窗口是打开的，更新收藏文件列表
            const favoriteWindow = document.getElementById('favoriteWindow');
            if (favoriteWindow && favoriteWindow.style.display === 'block') {
                this.renderFavoriteFileList();
            }
        }
    }

    handleSearch(event) {
        this.renderFileList();
    }

    selectAll() {
        const searchTerm = document.getElementById('searchInput').value;
        let filteredFiles = this.filterFiles(this.files);
        let searchedFiles = this.searchFiles(filteredFiles, searchTerm);
        let sortedFiles = this.sortFiles(searchedFiles);
        
        // 只选中当前页的文件
        const startIndex = (this.currentPage - 1) * this.pageSize;
        const endIndex = startIndex + this.pageSize;
        const currentPageFiles = sortedFiles.slice(startIndex, endIndex);
        
        currentPageFiles.forEach(file => {
            if (!this.selectedFiles.includes(file.id)) {
                this.selectedFiles.push(file.id);
            }
        });
        
        this.renderFileList();
    }

    selectNone() {
        this.selectedFiles = [];
        this.renderFileList();
    }

    handleDeleteAll() {
        if (this.files.length === 0) {
            alert('没有文件可以删除');
            return;
        }
        
        if (confirm('确定要删除所有文件吗？此操作不可恢复。')) {
            this.files = [];
            this.selectedFiles = [];
            this.currentPage = 1;
            this.saveToStorage();
            this.renderFileList();
            
            // 如果收藏窗口是打开的，更新收藏文件列表
            const favoriteWindow = document.getElementById('favoriteWindow');
            if (favoriteWindow && favoriteWindow.style.display === 'block') {
                this.renderFavoriteFileList();
            }
            
            alert('所有文件已删除');
        }
    }

    deleteFilesBySuffix() {
        const suffix = prompt('请输入要删除的文件后缀（如：pdf, jpg, html）：');
        if (!suffix) return;
        
        const normalizedSuffix = suffix.toLowerCase().replace(/^\./, '');
        const filesToDelete = this.files.filter(file => {
            const fileSuffix = file.name.split('.').pop().toLowerCase();
            return fileSuffix === normalizedSuffix;
        });
        
        if (filesToDelete.length === 0) {
            alert('没有找到后缀为 .' + normalizedSuffix + ' 的文件');
            return;
        }
        
        if (confirm('确定要删除所有后缀为 .' + normalizedSuffix + ' 的文件吗？共 ' + filesToDelete.length + ' 个文件。')) {
            const fileIdsToDelete = filesToDelete.map(file => file.id);
            this.files = this.files.filter(file => !fileIdsToDelete.includes(file.id));
            this.selectedFiles = this.selectedFiles.filter(id => !fileIdsToDelete.includes(id));
            
            // 更新当前页，如果当前页没有文件了，回到前一页
            const searchTerm = document.getElementById('searchInput').value;
            let filteredFiles = this.filterFiles(this.files);
            let searchedFiles = this.searchFiles(filteredFiles, searchTerm);
            let sortedFiles = this.sortFiles(searchedFiles);
            
            this.totalItems = sortedFiles.length;
            this.totalPages = Math.ceil(this.totalItems / this.pageSize);
            
            if (this.currentPage > this.totalPages) {
                this.currentPage = Math.max(1, this.totalPages);
            }
            
            this.saveToStorage();
            this.renderFileList();
            
            // 如果收藏窗口是打开的，更新收藏文件列表
            const favoriteWindow = document.getElementById('favoriteWindow');
            if (favoriteWindow && favoriteWindow.style.display === 'block') {
                this.renderFavoriteFileList();
            }
            
            alert('已删除 ' + filesToDelete.length + ' 个后缀为 .' + normalizedSuffix + ' 的文件');
        }
    }

    updateBatchDeleteButton() {
        const batchDeleteBtn = document.getElementById('batchDeleteBtn');
        batchDeleteBtn.style.display = this.selectedFiles.length > 0 ? 'inline-block' : 'none';
    }

    renderPagination() {
        const mainContainer = document.querySelector('.file-list-container');
        let paginationElement = document.getElementById('pagination');
        
        // 如果分页控件不存在，则创建它
        if (!paginationElement) {
            paginationElement = document.createElement('div');
            paginationElement.id = 'pagination';
            paginationElement.className = 'pagination';
            mainContainer.appendChild(paginationElement);
        }
        
        // 如果只有一页或没有文件，则隐藏分页控件
        if (this.totalPages <= 1) {
            paginationElement.innerHTML = '';
            paginationElement.style.display = 'none';
            return;
        }
        
        paginationElement.style.display = 'flex';
        
        let paginationHTML = '<div class="pagination-info">显示 ' + ((this.currentPage - 1) * this.pageSize + 1) + ' - ' + Math.min(this.currentPage * this.pageSize, this.totalItems) + ' 项，共 ' + this.totalItems + ' 项</div>';
        paginationHTML += '<div class="pagination-controls">';
        
        // 上一页按钮
        paginationHTML += '<button class="pagination-btn" onclick="fileManager.goToPage(' + (this.currentPage - 1) + ')"' + (this.currentPage === 1 ? ' disabled' : '') + '>上一页</button>';
        
        // 页码按钮
        const startPage = Math.max(1, this.currentPage - 2);
        const endPage = Math.min(this.totalPages, this.currentPage + 2);
        
        if (startPage > 1) {
            paginationHTML += '<button class="pagination-btn" onclick="fileManager.goToPage(1)">1</button>';
            if (startPage > 2) {
                paginationHTML += '<span class="pagination-ellipsis">...</span>';
            }
        }
        
        for (let i = startPage; i <= endPage; i++) {
            paginationHTML += '<button class="pagination-btn' + (i === this.currentPage ? ' active' : '') + '" onclick="fileManager.goToPage(' + i + ')">' + i + '</button>';
        }
        
        if (endPage < this.totalPages) {
            if (endPage < this.totalPages - 1) {
                paginationHTML += '<span class="pagination-ellipsis">...</span>';
            }
            paginationHTML += '<button class="pagination-btn" onclick="fileManager.goToPage(' + this.totalPages + ')">' + this.totalPages + '</button>';
        }
        
        // 下一页按钮
        paginationHTML += '<button class="pagination-btn" onclick="fileManager.goToPage(' + (this.currentPage + 1) + ')"' + (this.currentPage === this.totalPages ? ' disabled' : '') + '>下一页</button>';
        
        // 每页显示数量选择器
        paginationHTML += '<div class="page-size-selector">';
        paginationHTML += '<span>每页显示:</span>';
        paginationHTML += '<select onchange="fileManager.changePageSize(this.value)">';
        paginationHTML += '<option value="5"' + (this.pageSize === 5 ? ' selected' : '') + '>5</option>';
        paginationHTML += '<option value="10"' + (this.pageSize === 10 ? ' selected' : '') + '>10</option>';
        paginationHTML += '<option value="20"' + (this.pageSize === 20 ? ' selected' : '') + '>20</option>';
        paginationHTML += '<option value="50"' + (this.pageSize === 50 ? ' selected' : '') + '>50</option>';
        paginationHTML += '</select>';
        paginationHTML += '</div>';
        
        paginationHTML += '</div>';
        
        paginationElement.innerHTML = paginationHTML;
    }
    
    goToPage(page) {
        if (page >= 1 && page <= this.totalPages) {
            this.currentPage = page;
            this.renderFileList();
        }
    }
    
    changePageSize(size) {
        this.pageSize = parseInt(size);
        this.currentPage = 1; // 切换每页显示数量时，回到第一页
        this.renderFileList();
    }
    
    saveToStorage() {
        localStorage.setItem('fileManagerFiles', JSON.stringify(this.files));
    }
}

// 确保在DOM加载完成后初始化
let fileManager;
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        fileManager = new FileManager();
        window.fileManager = fileManager; // 确保全局可访问
    });
} else {
    fileManager = new FileManager();
    window.fileManager = fileManager; // 确保全局可访问
}

// 注册Service Worker实现PWA功能
if ('serviceWorker' in navigator) {
    window.addEventListener('load', function() {
        navigator.serviceWorker.register('/service-worker.js')
        .then(function(registration) {
            console.log('Service Worker 注册成功:', registration.scope);
        })
        .catch(function(error) {
            console.log('Service Worker 注册失败:', error);
        });
    });
}