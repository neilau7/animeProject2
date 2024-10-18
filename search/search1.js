
const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const cors = require('cors');
module.exports = router;
const importTable = require("../index"); //include the parameter of index.js

router.use(cors()); // 跨源资源共享
router.use("/public", express.static(__dirname + '/public') );

router.get('/searchpage/:keyword?', function (req, res) { //?代表可無
    console.log("path = ",__dirname); //process.cwd()
    const keyword = (req.params.keyword)? decodeURIComponent( req.params.keyword  ) : '';
    const htmlContent = `
    <!DOCTYPE html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link href="/search/public/styles.css" rel="stylesheet" type="text/css">
        <title>瘋動畫-搜尋</title>
      
    </head>
    
    <body>
        <div id="top-bar">
    
            <ul>
                <li id="top-bar-title" class="top-bar-item inline"> <a href="/">瘋動畫</a></li>
                <li class="top-bar-item inline"><a href="https://www.youtube.com/@AniOneAnime" target="_blank">Ani-One</a></li>
                <li class="top-bar-item inline"><a href="https://www.youtube.com/@MuseTW" target="_blank">Muse</a></li>
                <li class="top-bar-item inline"><a href="https://anime1.me/" target="_blank">Anime1</a></li>
                <li class="inline" id="search-block"><label id="search-label" class="inline" for="search-input"><a href="#" id="search-link"><img class="inline" id="search-icon" src="/search/public/search.svg"></a><input class="inline" id="search-input" type="text"></label></li>
    
            </ul>
        </div>
        <div id="menu">
            <section >
                <h1 id="Title">搜尋 - ${keyword}</h1>
                <div id="result" class="img-area">    
                </div>
    
                <div id="footer">                
                </div>
            </section>
        </div>
    
           <script src="/search/public/script.js"></script>
    `;
    
    res.send(htmlContent);
});

// keyword search
router.get('/api', async (req,res) => { 
    
    const keyword = (req.query.keyword)? req.query.keyword : '';
    const num = (req.query.num)? parseInt(req.query.num) : 0;
    const skip = (req.query.skip)? parseInt(req.query.skip) : 0; //從skip開始選num筆
    const totalLoc = (req.query.totalLoc === 'Y')? true : false;
    console.log(`keyword router start : ${keyword}`);
    const regex = new RegExp(keyword,'i'); //會自動生成regex，包含特殊符號也一併處理

    try{
        if (totalLoc){
            const totalNum = await importTable.animeTable.countDocuments({
                title:{$regex:regex}
            })
            res.json(totalNum);
            return;
        }
        const results = await importTable.animeTable.find({
            title:{$regex:regex}
        })
        .sort({date:-1})
        .skip(skip)
        .limit(num);

        res.json(results);
    }
    catch (err){
        console.log(`Err keyword router : \n ${err}`);
        res.json({});
    }
    

})






