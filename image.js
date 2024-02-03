const { google } = require('googleapis');

// 设置 Google Custom Search API 的参数
const cseId = '318d5abd9a11346c1'; // 替换为你的 Custom Search Engine ID
const apiKey = 'AIzaSyB7hDkPXe3mMX2JBHqU5jA7nidWiOluKKk'; // 替换为你的 API Key
const searchQuery = 'cats'; // 搜索关键词

// 创建 Custom Search API 客户端
const customsearch = google.customsearch('v1');

// 执行搜索请求
customsearch.cse.list({
  auth: apiKey,
  cx: cseId,
  q: searchQuery,
  search_type: 'image' // 指定搜索类型为图片
}, (err, res) => {
  if (err) {
    console.error('Error searching images:', err);
    return;
  }

  // 输出搜索结果
  console.log('Search results:', res.data.items);
});
