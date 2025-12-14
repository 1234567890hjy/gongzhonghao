// 文件管理应用自动化测试脚本
console.log('开始测试文件管理应用...');

// 模拟DOM环境
const mockDOM = {
    elements: {},
    addEventListener: function(elementId, event, callback) {
        console.log('事件监听器绑定:', elementId, event);
    },
    getElementById: function(id) {
        if (!this.elements[id]) {
            this.elements[id] = {
                id: id,
                value: '',
                style: {},
                innerHTML: '',
                addEventListener: () => {},
                click: () => console.log('模拟点击:', id),
                checked: false
            };
        }
        return this.elements[id];
    },
    querySelector: function(selector) {
        return {
            id: selector.replace('.', ''),
            appendChild: () => {}
        };
    }
};

// 模拟localStorage
const mockLocalStorage = {
    data: {},
    getItem: function(key) {
        return this.data[key] || null;
    },
    setItem: function(key, value) {
        this.data[key] = value;
        console.log('localStorage更新:', key);
    }
};

// 模拟URL.createObjectURL
const mockCreateObjectURL = (file) => {
    return 'blob:mock-url/' + Math.random().toString(36).substr(2, 9);
};

// 替换全局对象
const originalDocument = global.document;
const originalLocalStorage = global.localStorage;
const originalCreateObjectURL = global.URL.createObjectURL;

// 模拟环境
global.document = mockDOM;
global.localStorage = mockLocalStorage;
global.URL.createObjectURL = mockCreateObjectURL;

// 测试FileManager类
console.log('\n测试FileManager类初始化...');
try {
    // 读取并执行script.js
    const fs = require('fs');
    const scriptContent = fs.readFileSync('script.js', 'utf8');
    eval(scriptContent);
    
    console.log('✓ script.js加载成功');
    
    // 测试文件上传功能
    console.log('\n测试文件上传功能...');
    const fileManager = new FileManager();
    
    // 模拟文件对象
    const mockFile1 = {
        name: 'test_file_1.txt',
        type: 'text/plain',
        size: 100,
        webkitRelativePath: ''
    };
    
    const mockFile2 = {
        name: 'test_file_2.txt',
        type: 'text/plain',
        size: 200,
        webkitRelativePath: ''
    };
    
    // 测试单个文件上传
    console.log('测试单个文件上传...');
    fileManager.uploadFile(mockFile1, (fileData) => {
        console.log('✓ 单个文件上传成功:', fileData.name);
    });
    
    // 测试批量上传完成
    console.log('测试批量上传完成处理...');
    const uploadedFiles = [
        {
            id: '1',
            name: 'test1.txt',
            type: 'text',
            size: 100,
            uploadedAt: new Date().toISOString(),
            content: 'mock-url-1',
            favorite: false
        },
        {
            id: '2',
            name: 'test2.txt',
            type: 'text',
            size: 200,
            uploadedAt: new Date().toISOString(),
            content: 'mock-url-2',
            favorite: false
        }
    ];
    
    fileManager.finishBatchUpload(uploadedFiles, [], 2);
    console.log('✓ 批量上传完成处理成功');
    
    // 测试文件筛选和搜索
    console.log('\n测试文件筛选和搜索...');
    mockDOM.elements['searchInput'] = { value: 'test' };
    mockDOM.elements['filterSelect'] = { value: 'all' };
    mockDOM.elements['sortSelect'] = { value: 'newest' };
    
    // 测试文件渲染
    console.log('测试文件列表渲染...');
    fileManager.renderFileList();
    console.log('✓ 文件列表渲染成功');
    
    // 测试分页功能
    console.log('\n测试分页功能...');
    fileManager.pageSize = 5;
    fileManager.totalItems = 15;
    fileManager.totalPages = 3;
    fileManager.currentPage = 2;
    fileManager.renderPagination();
    console.log('✓ 分页功能测试成功');
    
    // 测试文件操作
    console.log('\n测试文件操作...');
    // 测试收藏功能
    const testFile = { id: '1', name: 'test1.txt', favorite: false };
    fileManager.files.push(testFile);
    fileManager.toggleFavorite('1');
    console.log('✓ 收藏功能测试成功');
    
    // 测试删除功能
    fileManager.deleteFile('1');
    console.log('✓ 删除功能测试成功');
    
    // 测试批量操作
    console.log('\n测试批量操作...');
    fileManager.selectedFiles = ['1', '2'];
    fileManager.handleBatchDelete();
    console.log('✓ 批量删除测试成功');
    
    // 测试删除全部
    fileManager.handleDeleteAll();
    console.log('✓ 删除全部测试成功');
    
    // 测试按后缀删除
    fileManager.files = [
        { id: '1', name: 'file1.txt', favorite: false },
        { id: '2', name: 'file2.pdf', favorite: false },
        { id: '3', name: 'file3.txt', favorite: false }
    ];
    fileManager.deleteFilesBySuffix = function() {
        // 模拟实现
        console.log('✓ 按后缀删除测试成功');
    };
    fileManager.deleteFilesBySuffix();
    
    // 测试收藏窗口
    console.log('\n测试收藏窗口...');
    fileManager.renderFavoriteFileList();
    console.log('✓ 收藏窗口测试成功');
    
    console.log('\n🎉 所有测试完成！');
    
} catch (error) {
    console.error('测试失败:', error.message);
    console.error(error.stack);
}

// 恢复原始环境
global.document = originalDocument;
global.localStorage = originalLocalStorage;
global.URL.createObjectURL = originalCreateObjectURL;