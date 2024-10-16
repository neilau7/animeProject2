
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


const sleep = (ms) => {
    return new Promise(resolve => setTimeout(resolve, ms));
};
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

        //console.log(imageUrls[0]);
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
        var newDataPromises = [];
        //var count = 1;

        for (const ele of Array.from(oldData)){
            console.log(`\n title : ${ele.title}`);
            const errImgLists = ["https://user-images.githubusercontent.com/27677166/206350787-721622cd-4e03-4a02-b90c-1118d66f8a11.png"
                ,"https://i.ytimg.com/img/no_thumbnail.jpg"
                ,"https://i.ytimg.com/vi/TYGyru4k9Hg/hqdefault.jpg"
                ,"https://imgv2-2-f.scribdassets.com/img/document/474721002/original/4aeaeca930/1707403649?v=1"
                
            ] ;
            var errLoc = 0;
            for ( const i of errImgLists ){
                if (ele.imgUrl == i) errLoc++; 
            }
            
            

            if (!ele.imgUrl || ele.imgUrl.includes('.webp') || errLoc || !await isImageURL(ele.imgUrl)){
                const imgUrl = await getImageUrl(page,ele.title);
                if (imgUrl != ''){
                    ele.imgUrl = imgUrl;
                    newDataPromises.push(ele);
                    
                    
                    const newData = newDataPromises;
                    for (const single of newData){
                        await animeTable.updateOne(
                            { url: single.url }, // 查找條件
                            { $set: { imgUrl: single.imgUrl } } // 更新內容
                        );
                    }
                    //const result = await animeTable.insertMany(newData);
                    console.log('updateAllNoImg Data saved successfully 50 items');
                    //await sleep(1000);

                    newDataPromises = [];//reset per 50
                    
                    
                }
                
            }
            
            
            
        }
            
        
        //const newData = await Promise.all(newDataPromises); //等待所有promise結束
        // 将处理后的数据保存回数据库
        
        const newData = newDataPromises;
        for (const single of newData){
            await animeTable.updateOne(
                { url: single.url }, // 查找條件
                { $set: { imgUrl: single.imgUrl } } // 更新內容
            );
        }
        //const result = await animeTable.insertMany(newData);
        console.log('updateAllNoImg Data saved successfully');
    }catch(err){
        console.log('Error updateAllNoImg:', err);

    }
    
}






