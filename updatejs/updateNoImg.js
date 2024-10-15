
const express = require('express');
const mongoose = require("mongoose"); //database
const router = express.Router();
module.exports = router;
const puppeteer = require('puppeteer');
const importTable = require("../index"); //include the parameter of index.js


//----<Create model (table)>----
//const animeTable = mongoose.model("animeTable",animeSchema);
const animeTable = importTable["animeTable"];


(async ()=>{
    
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    

    
    //const res = await getImageUrl(page,"笑容的代價｜Muse木棉花 動畫 線上看")
    //console.log(res);
    await updateAllNoImg(page);
    browser.close();
})(); //()結尾 代表立即執行


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

async function getImageUrl(page,query){

    // start
    try{
        
        // Google Images 搜尋 URL，將 'query' 替換成你的搜尋關鍵詞
        const searchUrl = `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(query)}`;
        await page.goto(searchUrl, { waitUntil: 'networkidle2' });


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
        return imageUrls[0];

        
    }catch (err){

        console.log(`err for query = ${query}`);
        console.log(err);
        return '';
    }
    
};

async function updateAllNoImg(page){
    try{
        const oldData = await animeTable.find({});
        const newDataPromises = [];
        
        for (const ele of Array.from(oldData)){
            const errImg = "https://user-images.githubusercontent.com/27677166/206350787-721622cd-4e03-4a02-b90c-1118d66f8a11.png";
            const errImg2 = "https://i.ytimg.com/img/no_thumbnail.jpg";

            if (!ele.imgUrl || ele.imgUrl != errImg || ele.imgUrl2 != errImg2 || !await isImageURL(ele.imgUrl)){
                const imgUrl = await getImageUrl(page,ele.title);
                if (imgUrl != ''){
                    ele.imgUrl = imgUrl;
                }
                
            }
            newDataPromises.push(ele);
        }
            
        
        //const newData = await Promise.all(newDataPromises); //等待所有promise結束
        // 将处理后的数据保存回数据库
        const newData = newDataPromises
        const result = await animeTable.insertMany(newData);
        console.log('updateAllNoImg Data saved successfully:', result);
    }catch(err){
        console.log('Error updateAllNoImg:', err);

    }
    
}






