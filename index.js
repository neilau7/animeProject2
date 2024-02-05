
const express = require('express');
const app = express();
const mongoose = require("mongoose"); //database
const cors = require('cors');
const bodyParser = require('body-parser');  
// 使用 axios 和 cheerio 的简单爬虫
const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const { stringify } = require('querystring');
const { google } = require('googleapis'); //google search
const { resolve } = require('path');

require('dotenv').config(); //load env

app.use(express.urlencoded({ extended: true })); //true means it can look for deep element
app.use(cors());
app.use('/public', express.static(process.cwd() + '/public'));

/////// api ////////
//const url = 'https://anime1.me/?s=p'; //test
const youtubeApi = process.env.youtubeApi;
//const aniOnePlayListId = "UU45ONEZZfMDZCnEhgYmVu";
const aniOneChannelId = "UC45ONEZZfMDZCnEhgYmVu-A";
const museChannelId = "UCgdwtyqBunlRb-i-7PnCssQ";
// google api
const cseId = '318d5abd9a11346c1'; // 你的 Custom Search Engine ID

// 创建 Custom Search API 客户端
const customsearch = google.customsearch('v1');

//create Schema
const animeSchema = {
    title:{type:String, require: true},
    imgUrl:{type:String},
    url:{type:String, require:true}, //playlist Url
    from:{type:String, require:true},
    count:{type:[Date],require:true},
    date:{type:Date,require:true}
};

//----<Create model (table)>----
const animeTable = mongoose.model("animeTable",animeSchema);


const processHtmlYoutube = (filePath, keyword, maxNum, page) => {
    return new Promise(async (resolve,reject)=>{
        try{
            console.log('');
            console.log(`processHtmlYoutube`);
            console.log(` page = ${page}`);
            //
            const pageInt = parseInt(page);
            const playLists = await readData(filePath);
            const playListFilters = playLists.filter(ele => ele.title.includes(keyword));
            console.log(`playlist length : ${playListFilters.length}`);
            //console.log(`playListFilters: ${playListFilters}`);
            var lastPage = (maxNum)? 
            (playListFilters.length % maxNum === 0)? parseInt( playListFilters.length)/maxNum : parseInt( playListFilters.length)/maxNum + 1 : playListFilters.length;
            

            if (playListFilters.length <= maxNum && pageInt === 1){ //數量不足以slice
                //console.log(`playlist length : ${playListFilters.length}`);
                //console.log(`playlist : ${playListFilters}`);
                resolve(playListFilters); 
            }
            else if (pageInt <= lastPage){
                resolve(playListFilters.slice( (pageInt - 1)*maxNum, pageInt*maxNum - 1 )); 
                
            }else{
                resolve([]); 
            }
                
        }catch(err){
            console.error(`read playlists err : ${err}`);
            reject(err);
        }
        
        
    })
}
// fetch anime1
const getDateImgAnime1 = (title) => { //get date and imgUrl
    return new Promise((resolve,reject)=>{
        const anime1Url = 'https://anime1.me/?s=' + encodeURIComponent(title);
        axios.get(anime1Url)
        .then(response => {
            console.log('');
            console.log(`<< getDateAnime1 >>`);
            const html = response.data;
            const $ = cheerio.load(html);

            // 在这里使用 cheerio 来解析 HTML 和提取数据
            const titleRes = $('h2.entry-title'); //jQuery Obj
            const date = new Date($(titleRes[0]).next().find("time").first().attr("datetime"));
            console.log(`date ${date}`);
            const resData = {
                imgUrl:'',
                date:date
            };
            //console.log(typeof(titleRes)); 
            // 执行搜索请求
            customsearch.cse.list({
                auth: youtubeApi,
                cx: cseId,
                q: encodeURIComponent(title),
                search_type: 'image' // 指定搜索类型为图片
            }, (err, res) => {
                if (err) {
                    console.log('Error searching images:', err);
                    resolve(resData);
                    return;
                }
            
                // 输出搜索结果
                try{
                    resData.imgUrl = res.data.items[0].link;
                    console.log('getDateImgAnime1 response : \n', resData);
                    resolve(resData);
                }catch(err){
                    console.log(`fetch anime1 imgUrl err :\n ${err}`);
                    resolve(resData);
                }
                
            });
            
        })
        .catch(error => {
            console.error('Error fetching the page:', error);
            //reject( error);
            resolve({});
        });
    })
}

function saveToDatabaseYoutube(filePath , keyword, maxNum, page){ 
    processHtmlYoutube(filePath, keyword, maxNum, page)
    .then(async (data) =>{
        //
        
        try{
            await mongoose.connect(process.env.mongooseUrl);
            console.log('database connected.');
        }
        catch (err){
            console.log(`database can't connect \n ${err}`);
        }
        
        Array.from(data).forEach(async (ele)=>{
            
            const urlTarget = await animeTable.findOne({"url":ele.url});
            if (!urlTarget){
                try{
                    console.log('Save Data Start');
                    const saveData = new animeTable(ele);
                    await saveData.save();
                    console.log(`upload finished : ${ele}`);
                }catch(err){
                    console.log(`save data err : \n ${err}`);
                }
            }else{
                console.log(`Data exists ${urlTarget}`);
            }
            
        });

    }).catch((err)=>{
        console.log(`Save to database err : ${err}`);
    })

}
async function saveAllToDatabaseYoutube(filePath){
    const data = await readData(filePath);

    try{
        await mongoose.connect(process.env.mongooseUrl);
        console.log('database connected.');
    }
    catch (err){
        console.log(`database can't connect \n ${err}`);
    }
    
    Array.from(data).forEach(async (ele)=>{
        
        const urlTarget = await animeTable.findOne({"url":ele.url});
        if (!urlTarget){
            try{
                console.log('Save Data Start');
                const saveData = new animeTable(ele);
                await saveData.save();
                console.log(`upload finished : ${ele}`);
            }catch(err){
                console.log(`save data err : \n ${err}`);
            }
        }else{
            console.log(`Data exists ${urlTarget}`);
        }
        
    });
    console.log(' saveAllToDatabaseYoutube finish');
    return ;
}

async function updateToDatabase(newData){     //if oldData doesn't exist, we add the new Data to database.
                                             //if oldData exist,we update the new data.
                                             //oldData is single data
    try{
        await mongoose.connect(process.env.mongooseUrl);
        console.log('database connected.');
    }
    catch (err){
        console.log(`database can't connect \n ${err}`);
    }
    Array.from(newData).forEach(async ele=>{
        try{
            const oldData = await animeTable.findOne({"url":ele.url});
            if (!oldData){
                const saveData = new animeTable(ele); //create data instance
                await saveData.save();
            }else if (oldData !== newData){
                if (newData.date > oldData.date){
                    oldData.title = newData.title;
                    oldData.from = newData.from;
                    oldData.date = newData.date;
                    if (!oldData.imgUrl){
                        oldData.imgUrl = newData.imgUrl; // if original img is null
                    }
                    
                }
            }
        }
        catch(err){
            console.log(`updateToDatabse Err : \n ${err}`);
        }
        

    });

    return;
}

async function updateCount(playlistUrl){
    const urlTarget = await animeTable.findOne({"url":playlistUrl});
    console.log(`urlTarget : ${urlTarget}`);
    if (!urlTarget){
        try{
            console.log('Save Data Start');
            const saveData = new animeTable(ele);
            saveData.save();
        }catch(err){
            console.log(`save data err : \n ${err}`);
        }
    }else{
        console.log(`Data exists ${urlTarget}`);
    }

};

/////////fetch playlists about youtube for saving to disk /////////
const getPlaylistsSingle = (url, filePath, from) => { //update and save playlists, and then submit nextPageToken for one time
    return new Promise((resolve,reject)=>{
        // simple func
        function isElementExists(newElement,elements) {
            return elements.some(element => element.url === newElement.url);
        }
        async function updateAndSaveData(oldData,newData){
            console.log(`update and save`);
            //console.log(`   olddata : ${oldData}`);
            //console.log(`   newdata : ${newData}`);

            var dataFilter = oldData.slice(); //It is a list after filter redundant element
            Array.from(newData).forEach((ele) =>{
                if(!isElementExists(ele,dataFilter)){
                    // 将新数据添加到 JavaScript 对象中
                    dataFilter.push(ele);
                }
            });
            
            // 将更新后的 JavaScript 对象转换为 JSON 字符串
            const dataFilterEncode = dataFilter.map((ele) => {
                const newEle = {...ele};
                
                newEle.title = encodeURIComponent(ele.title);
                //console.log(`new ele ${JSON.stringify(newEle)}`);
                return newEle;
            });
            

            const updatedJsonData = JSON.stringify(dataFilterEncode);
            //console.log(` updatedJsonData ${updatedJsonData}`);
            // 写入更新后的 JSON 字符串到文件中
            try{
                fs.writeFileSync(filePath, updatedJsonData, 'utf8');
            }
            catch (err){
                console.error(`Error at writing`);
            }
            
        }
        
        ///////////////////////get data and save//////////////
        fetch(url)
        .then(response => response.json())
        .then(async (data)=>{
            //console.log(data);
            if (!data){
                return;
            }
            console.log(`data = ${data}`);
            const completeData = Array.from(data.items).map(element => {
                const playlistId = element.id;

                //content detail in snippet
                const content = element.snippet;
                const title = content.title;
                const playlistUrl = `https://www.youtube.com/playlist?list=${playlistId}&maxResults=50`; //一次的上限是50
                const imgUrl = content.thumbnails.high.url;
                const date = new Date(content.publishedAt);

                const tempData = {
                    title:title,
                    url:playlistUrl,
                    imgUrl:imgUrl,
                    date:date,
                    from:from
                };
                //console.log(tempData);
                return tempData;
            });

            console.log(`nextPageToken : ${data.nextPageToken}`);
            const resData = {
                nextPageToken:(data.nextPageToken)?data.nextPageToken:null,
                playlists:completeData
            };

            //-----------------
            //// update and save data into disk

            var oldData = [];
            const newData = resData.playlists;

            console.log(`Start Save`);
            try{
                const oldDataJson = fs.readFileSync(filePath,'utf-8');
                oldData =(oldDataJson)? JSON.parse(oldDataJson):[]; 
                oldData = oldData.map((ele) => {
                    const newEle = {...ele};
                    newEle.title = decodeURIComponent(ele.title);
                    return newEle;
                });  
                
            }catch{
                console.log(`no exist path: ${filePath}`);
            }
            
            await updateAndSaveData(oldData,newData);
            console.log(`update and save playlists is finished : ${filePath}`);

            //------------------
            resolve(resData);
            
        })
        .catch(error => {
            console.error('Error fetching the page:', error);
            reject( error);
        });
    })
}
async function getPlaylists(url, filePath, from){ //For youtube
    var resData = await getPlaylistsSingle(url,filePath ,from); //no nextPageToken
    console.log(`length = ${resData.playlists.length}`);
    

    while(Object.keys(resData).includes('nextPageToken') && resData.nextPageToken){
        if(!url.includes('pageToken')){
            const newUrl = url + `&pageToken=${resData.nextPageToken}`;
            console.log(newUrl);
            resData = await getPlaylistsSingle(newUrl,filePath,from);
        }else{
            console.log(`pageToken can't be existed`);
            break;
        }
    }

}

function getPlaylistsAnime1(){
    const apiUrl = "https://d1zquzjgwo9yb.cloudfront.net/?_=1706859616074";
    fetch(apiUrl)
    .then(response => response.json())
    .then(data => {
        console.log(`anime1 api : \n `);
        //const jsonData = JSON.parse(data);
        
        Array.from(data).forEach(async ele => {
            const anime1Id = ele[0];
            const title = ele[1];
            var dateImgData = { //default
                imgUrl:'',
                date:null
            };
            
            try{
                dateImgData = await getDateImgAnime1(title);
            }catch(err){
                console.log(`getDateImgAnime1 Error :\n ${err}`);

            }
            
            const resdata = {
                title:title,
                url:`https://anime1.me/?cat=` + anime1Id,
                imgUrl:dateImgData.imgUrl,
                date:dateImgData.date,
                from:'anime1'

            }
            await updateToDatabase([resdata]);
            console.log(`final anime1 data \n ${JSON.stringify(resdata)}`);



        })
    })
}


// << simple func >>
function readData(filePath){                                     //read the data in disk of youtube playlists
    return new Promise((resolve, reject) => {                    // we need to do the decoding of 'title' key
        fs.readFile(filePath, 'utf8', (err, oldDataJson) => {
            if (err) {
              console.error('Error reading file:', err);
              resolve([]);
            }
            //console.log(`test path : ${filePath}`);
            // 解析 JSON 字符串为 JavaScript 对象
            //console.log(`oldDataJs : ${oldDataJson}`);
            const oldData = JSON.parse(oldDataJson);
            // Decode title
            const oldDataDecode = oldData.map((ele) => { 
                const newEle = {...ele};
                newEle.title = decodeURIComponent(ele.title); 
                return newEle;
            });
            
            //console.log(oldDataDecode); 
            resolve(oldDataDecode);
        });
    })
    
}
///////////////////////////////
//                           // 
//     <<  Start Run >>      //
//                           //
///////////////////////////////

mongoose.connect(process.env.mongooseUrl).then(async ()=>{
    console.log('database connected.')
    // Save youtube playlists to disk
    //await getPlaylists(`https://www.googleapis.com/youtube/v3/playlists?part=snippet&channelId=${aniOneChannelId}&key=${youtubeApi}`,'playlist_aniOne.json','aniOne');
    //await getPlaylists(`https://www.googleapis.com/youtube/v3/playlists?part=snippet&channelId=${museChannelId}&key=${youtubeApi}`,'playlist_muse.json','Muse');
    // upload to database
    //saveToDatabaseYoutube('playlist_aniOne.json','',0,1);
    //saveToDatabaseYoutube('playlist_muse.json','',0,1);    
    //saveAllToDatabaseYoutube('playlist_aniOne.json');
    //saveAllToDatabaseYoutube('playlist_muse.json');
    //getPlaylistsAnime1();

    //processHtmlAnime1('https://anime1.me/?s=%E7%95%B0%E4%BF%AE%E7%BE%85');

    /////////////
    app.get('/', function (req, res) {
        console.log("path = ",process.cwd());
        res.sendFile(process.cwd() + '/views/mainPage.html');
    });
    
    app.get('/api/new',async (req,res)=>{
        const num = (req.query.num)? parseInt(req.query.num) : 0;
        const skip = (req.query.skip)? parseInt(req.query.skip) : 0; //從skip開始選num筆
        try{
            const results = await animeTable.find()
            .sort({ date: -1 }) // 按照时间戳降序排序
            .skip(skip)
            .limit(num); // 限制结果数量
            res.json(results);
        }catch(err){
            console.log(`new router err`);
            res.json({});
        }
        
        
        
    });
    
    
    app.get('/api/hot',async (req,res)=>{
        console.log(` hot router`);
        const num = (req.query.num)? parseInt(req.query.num) : 0;
        const skip = (req.query.skip)? parseInt(req.query.skip) : 0; //從skip開始選num筆
    
        try{
            
            const results = await animeTable.find()
                .sort({ count: -1 }) // 按照降序排序
                .skip(skip)
                .limit(num); // 限制结果数量
            if (results.length === 0){
                const allResults = await animeTable.find().limit(num);
                res.json(allResults);
                
            }
            res.json(results);
        }catch(err){
            console.log(`hot router err : \n ${err}`);
            res.json({});
    
        }
        
    });
    
    
    app.get('/api/random',(req,res)=>{
        const num = (req.query.num)? parseInt(req.query.num) : 0;
        
        animeTable.aggregate([
            { $sample: { size: num } } // 从集合中随机获取 10 条数据
          ])
          .then(result => {
            console.log(result); // 输出随机获取的数据
            res.json(result);
          })
          .catch(err => {
            console.log(`random router Err : \n ${err}`); // 打印错误信息
            res.json({});
          });
          
      });
    ////////////
    app.post('/api/count',async (req,res)=>{
        console.log(`count start`);
        //console.log(`req : ${JSON.parse(req)}`);
        const url = req.body.url;
        const clickDate = (req.body.clickDate)? new Date(req.body.clickDate) : new Date();
        console.log(`url : ${url}`);
        if (url){

            try{
                
                const results = await animeTable.findOneAndUpdate(
                    {url:url},
                    {$push : {count : clickDate}} // means the date which is clicked
                );
                console.log(`Count is ${results.count}`);
                res.send(`Count is ${results.count}`);

                
                
            }catch(err){
                console.log(`count router err : \n ${err}`);
                //try add new count = 1;
                try{
                    const results = await animeTable.findOneAndUpdate(
                        {url:url},
                        {$set : {count:[clickDate]}} // means count = count + 1
                    );
                    console.log(`Build Count, Count is ${results.count}`);
                    res.send(`Build Count, Count is ${results.count}`);
                }
                catch(err){
                    console.log(`Add count key fail :\n ${err}`);
                    res.send(`Add count key fail`);

                }
                

                //res.send('Error about finding url for counting');
        
            }
            
        }


    });

}).catch((err) => {
    console.log(`Connect Mongoose fail`);
})




//listen port
const port = process.env.PORT || 3000;
app.listen(port, function () {
  console.log('Your app is listening on port ' + port)
});