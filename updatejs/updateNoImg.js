
const express = require('express');
const mongoose = require("mongoose"); //database
//const router = express.Router();
//module.exports = router;
const puppeteer = require('puppeteer');
const nodemailer = require('nodemailer');

const importTable = require("../index"); //include the parameter of index.js
const { timeout } = require('puppeteer');



//----<Create model (table)>----
const animeTable = importTable["animeTable"];


////////////////////////////////////////////////////////////////////////////////////
////////////////////////// function ////////////////////////////////////////

async function runUpdate(animeTable){
    const browser = await puppeteer.launch({ 
        headless: true, //dumpio:true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
});
    const page = await browser.newPage();
    
    await updateAllNoImg(page,animeTable);
    await sendEmail();
    browser.close();
}

const sleep = (ms) => {
    return new Promise(resolve => setTimeout(resolve, ms));
};

// 定義一個 async 函數來寄送郵件
async function sendEmail() {
    // 設定傳送郵件的伺服器資訊
    const transporter = nodemailer.createTransport({
        service: 'gmail', // 使用 Gmail 服務
        host: 'smtp.gmail.com',
        port:465,
        secure:true,
        auth: {
            user: process.env.EMAIL_USER, // 你的 Gmail 帳號
            pass: process.env.EMAIL_PASS   // 你的 Gmail 密碼或應用程式密碼
        }
    });
    // 設定郵件內容
    const mailOptions = {
        from: process.env.EMAIL_USER, // 寄件者
        to: process.env.EMAIL_USER,   // 收件者，可以是多個收件者，逗號分隔
        subject: 'anime update no img is end.',         // 郵件主旨
        text: 'anime update no img is end.',     // 郵件內容（純文字）
        // html: '<b>這是郵件內容，HTML 格式</b>' // 如果你想使用 HTML 格式
    };
    try {
        // 使用 await 等待 sendMail 完成
        const info = await transporter.sendMail(mailOptions);
        console.log('郵件發送成功:', info.response);
    } catch (error) {
        console.log('郵件發送失敗:', error);
    }
}

 
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

async function getImageUrlByCrawler(page,query){ //return imgurl

    // start
    try{
        query+=" anime"
        // Google Images 搜尋 URL，將 'query' 替換成你的搜尋關鍵詞
        const searchUrl = `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(query)}`;
        //await page.goto(searchUrl, { waitUntil: 'networkidle2',timeout: 30000 });
        await page.goto(searchUrl);


        // 等待圖片元素載入
        await page.waitForSelector('img',{timeout:10000});

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

async function updateAllNoImg(page,animeTable){
    try{
        const errImgLists = [
            "https://user-images.githubusercontent.com/27677166/206350787-721622cd-4e03-4a02-b90c-1118d66f8a11.png"
            ,"https://i.ytimg.com/img/no_thumbnail.jpg"
            ,"https://i.ytimg.com/vi/TYGyru4k9Hg/hqdefault.jpg"
            ,"https://imgv2-2-f.scribdassets.com/img/document/474721002/original/4aeaeca930/1707403649?v=1"
            ,"https://pbs.twimg.com/media/GX30K1sXgAAKW6d?format=jpg&name=large"
            ,"https://i.ytimg.com/vi/DeSEMcMcXWQ/hqdefault.jpg"
            ,"https://st4.depositphotos.com/14953852/24787/v/450/depositphotos_247872612-stock-illustration-no-image-available-icon-vector.jpg"
            
        ] ;
    

        const oldData = await animeTable.find({
            $or: [
                ...errImgLists.map(str => ({
                    // 对每个 URL 进行转义处理，以便正则表达式可以正确匹配
                    imgUrl: { $regex: str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' }
                })),
                { imgUrl: "" }, // 查找 imgUrl 为空字符串的情况
                { imgUrl: { $regex: '\\.webp$', $options: 'i' } } // 查找包含 .webp 的情况，不区分大小写
            ]
            
        });
        
        console.log(oldData);
        
        //const oldData = await animeTable.find({});

        var newDataPromises = [];
        //var count = 1;

        for (const ele of Array.from(oldData)){
            console.log(`\n title : ${ele.title}`);
            ////////////
            sleep(1000);
            const imgUrl = await getImageUrlByCrawler(page,ele.title.replace("《"," ").replace("》"," "));
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
                console.log('updateAllNoImg Data saved successfully 1 items');
                //await sleep(1000);

                newDataPromises = [];//reset per 50
                
                
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

module.exports = {
    sendEmail,
    runUpdate,
    getImageUrlByCrawler,
    updateAllNoImg
};




