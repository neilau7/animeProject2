// 导入 WebDriver 模块
const { Builder, By, Key, until } = require('selenium-webdriver');

// 异步函数，用于执行爬虫逻辑
async function runExample() {
  // 创建 WebDriver 实例
  let driver = await new Builder().forBrowser('chrome').build();

  try {
    // 打开网页
    await driver.get('https://www.example.com');

    // 找到页面上的元素并执行操作
    let searchBox = await driver.findElement(By.name('q'));
    await searchBox.sendKeys('Selenium', Key.RETURN);

    // 等待页面加载完成
    await driver.wait(until.titleContains('Selenium'), 1000);

    // 获取页面标题并打印
    let pageTitle = await driver.getTitle();
    console.log('Page title:', pageTitle);
  } finally {
    // 关闭浏览器
    //await driver.quit();
    console.log('finish');

  }
}

// 调用函数执行爬虫逻辑
runExample();
