// 简单的语法测试
class TestManager {
    constructor() {
        this.files = [];
    }
    
    testMethod() {
        console.log('测试方法执行成功');
    }
}

// 测试语法
const test = new TestManager();
test.testMethod();
console.log('语法测试通过');
