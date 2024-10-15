
//For unit test 
const express = require('express');
const router = express.Router();
module.exports = router;
const puppeteer = require('puppeteer');
const importTable = require("../index"); //include the parameter of index.js


//router path is showAllPage
router.get('/*', function (req, res) {
    console.log("path = ",__dirname); //process.cwd()
    res.sendFile(__dirname+'/views/view.html');
});

async function isImageURL(url) {
    try {
        const response = await fetch(url, { method: "HEAD" });
        const contentType = response.headers.get("Content-Type");
        return contentType.startsWith("image/");
    } catch (error) {
        console.error("Error checking image URL:", error);
        return false;
    }
}

async function getImageUrl(query){

    // start
    try{
        const browser = await puppeteer.launch({ headless: true });
        const page = await browser.newPage();

        // Google Images 搜尋 URL，將 'query' 替換成你的搜尋關鍵詞
        const searchUrl = `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(query)}`;

        await page.goto(searchUrl);

        // 等待圖片元素載入
        await page.waitForSelector('img');

        // 爬取圖片的 URL
        const imageUrls = await page.evaluate(() => {
            const imageBoxs = Array.from(document.querySelectorAll('#rso > div > div > div.wH6SXe.u32vCb > div > div > div'));

            return imageBoxs.map((ele) => {
                img = ele.querySelector('img').src;
                return img;
            });
        });

        console.log(imageUrls[0]);

        await browser.close();
    }catch (err){

        console.log(`err for query = ${query}`);
        console.log(err);
    }
    
    
    
};
getImageUrl("ok");




