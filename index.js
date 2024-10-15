
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
app.use('/public', express.static(__dirname + '/public'));

/////// api ////////
//const url = 'https://anime1.me/?s=p'; //test
const youtubeApi = process.env.youtubeApi;
const googleApi = process.env.googleApi;
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
    date:{type:Date,require:true},
    click:{type:Number}, //全部
    clickWeek:{type:Number}, // 本週
    clickMonth:{type:Number} // 本月
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
                resolve(playListFilters.slice( (pageInt - 1)*maxNum, pageInt*maxNum )); 
                
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
                auth: googleApi,
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

async function updateAllNoImg(){
    try{
        const oldData = await animeTable.find({});
        const newDataPromises = Array.from(oldData).map(async (ele) => {
            const errImg = "https://user-images.githubusercontent.com/27677166/206350787-721622cd-4e03-4a02-b90c-1118d66f8a11.png";
            const errImg2 = "https://i.ytimg.com/img/no_thumbnail.jpg";

            if (!ele.imgUrl || ele.imgUrl != errImg || ele.imgUrl2 != errImg2 || !await isImageURL(ele.url)){
                const imgUrl = await getImageUrl(ele.title);
                ele.imgUrl = imgUrl;
                
            }
            return ele;
        });
        const newData = await Promise.all(newDataPromises);
        // 将处理后的数据保存回数据库
        const result = await animeTable.insertMany(newData);
        console.log('updateAllNoImg Data saved successfully:', result);
    }catch(err){
        console.log('Error updateAllNoImg:', err);

    }
    
}

// simple func
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
async function getImageUrl(title){

    // start
    try{
        const response = await customsearch.cse.list({
            auth: googleApi,
            cx: cseId,
            q: title,
            search_type: 'image' // 指定搜索类型为图片
        });

        var indexImg = 0;
        var imgUrlNew = response.data.items[ indexImg ].link; 
        var loop = 1;
        const maxLoop = 5;
        while( !await isImageURL(imgUrlNew) && loop <= maxLoop){
            indexImg = indexImg + 1;
            imgUrlNew = response.data.items[indexImg].link; 

            loop = loop + 1;
        }

        console.log(`getImageUrl : ${imgUrlNew}`);
        return imgUrlNew;
    }catch(err){
        console.log(`Err getImageUrl : \n ${err}`);
        return '';
    }
    
    
};



async function checkUrlExist(url){
    try{
        const oldData = await animeTable.find({url:url});
        if (oldData && oldData.length >= 1){
            return true;
        }else{
            return false;
        }
    }catch(err){
        console.log(` Err checkUrlExist ${err}`);
        return false
    }
}

async function checkTitleExist(title){
    try{
        const oldData = await animeTable.find({title:title});
        if (oldData && oldData.length >= 1){
            return true;
        }else{
            return false;
        }
    }catch(err){
        console.log(` Err checkUrlExist ${err}`);
        return false
    }
}

// youtube update func
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
        console.log(`getPlaylistsSingle URl is :\n ${url}`);
        
        // Start
        ///////////////////////get data and save//////////////
        fetch(url)
        .then(response => response.json())
        .then(async (data)=>{
            console.log(`playList Data ${JSON.stringify( data )}`);
            if (!data || !data.hasOwnProperty( 'items' )){
                resolve({status:'No playLists exist'})
            }
            
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
// fetch anime1
function getPlaylistsAnime1(){ // if title key of mongoose doesn't exist, update it;

    return new Promise((resolve, reject) => {
        const apiUrl = "https://d1zquzjgwo9yb.cloudfront.net/?_=1706859616074";
        fetch(apiUrl)
        .then(response => response.json())
        .then(data => {
            console.log(`anime1 api : \n `);
            //const jsonData = JSON.parse(data);
            
            Array.from(data).forEach(async ele => {
                const anime1Id = ele[0];
                const title = ele[1];
                try{
                    if (await checkTitleExist(title)){ // check exist
                        return ;
                    }
                }catch(err){
                    console.error(`Error checkTitleExist : \n ${err}`);
                }
                
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



            });
            resolve({status:'finish'});


        }).catch((err)=>{
            console.error(`Error getPlaylistsAnime1 : \n ${err}`);
            reject({status:"Error"});
        })

    });
    
}
//////////////////////////////////////////////////////////////////

// Click Behavior
async function BuildKeyAndData(url,key,value){ //找到key 取代成value。 //修改項目，非新增一筆資料
    try{
        const params = {"url":url};
        const oldData = await animeTable.findOneAndUpdate(
            params, //query condition
            { $set : { [key] : value} } //[key] 讓他解讀成變數
        );
        console.log(` BuildKeyAndData finished : { ${key} : ${value}}`);
        return;
    }catch(err){
        console.log(`Error for updateData(BuildKeyAndData) \n :${err}`);
    }

};
async function updateClickWeekNum(url){
    try {
        // weekClick
        const today = new Date();
        const startOfWeek = new Date(today.getFullYear(), today.getMonth() , today.getDate() - today.getDay());
        const endOfWeek = new Date(today.getFullYear(), today.getMonth() , today.getDate() + (6 - today.getDay()));
      
        const weeklyData = await animeTable.aggregate([
          {
            $match: {
                "url":url,
              "count": {
                $gte: startOfWeek,
                $lte: endOfWeek
              }
            }
          },
          {
            $project: { //控制輸出
              "count": 1 // 1: 表示保留"count"的輸出，0: 表示排除
            }
          }
        ]).exec();

        console.log("Weekly Data:", weeklyData);
        const resultNum = (weeklyData.length !== 0)? weeklyData[0].count.length : 0;
        BuildKeyAndData(url,'clickWeek',resultNum);
        return resultNum;

      } catch (err) {
        console.log(`Err update clickWeek : \n ${err}`);
      }
      


};
async function updateClickMonthNum(url){
    try {
        // weekClick
        const today = new Date();
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
      
        // monthClick
        const monthlyData = await animeTable.aggregate([
          {
            $match: {
                "url":url,
              "count": {
                $gte: startOfMonth,
                $lte: endOfMonth
              }
            }
          },
          {
            $project: {
              "count": 1
            }
          }
        ]).exec();
      
        console.log("Monthly Data:", monthlyData);
        const resultNum = (monthlyData.length !== 0)? monthlyData[0].count.length : 0;
        BuildKeyAndData(url,'clickMonth',resultNum);
        return  resultNum;

      } catch (err) {
        console.log(`Err clickMonth : \n ${err}`);
      }
      
};

async function updateClickNum(url){
    try{
        console.log(`updateClickNum start`);
        const results = await animeTable.find({url:url});
        const clickNum = (results.length !== 0)? results[0].count.length : 0;
        BuildKeyAndData(url,'click',clickNum);
        return clickNum;
    }catch(err){
        console.log(`Err updateClickKey ${err}`);
        
    }
    
}

async function updateClickKey(url){ //update single specified url
 updateClickWeekNum(url);
 updateClickMonthNum(url);
 updateClickNum(url);
};

async function updateAllClickKey(){
    try{
        const results = await animeTable.find({})
        Array.from(results).forEach(async (ele)=>{

            await updateClickKey(ele.url);
            console.log(`updateClickKey finished : ${ele.url}`);
        })
    }
    catch(err){
        console.log(`Err updateClickKey : \n ${err}`);

    }
    
}
////////////////////////////////////////


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
            const results = await animeTable.find({})
                .sort({click:-1})
                .skip(skip)
                .limit(num);
            
            
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

    app.get('/api/week',async (req,res)=>{
        console.log(` week router`);
        const num = (req.query.num)? parseInt(req.query.num) : 0;
        const skip = (req.query.skip)? parseInt(req.query.skip) : 0; //從skip開始選num筆
    
        try{
            
            const results = await animeTable.find()
                .sort({ clickWeek: -1 }) // 按照降序排序
                .skip(skip)
                .limit(num); // 限制结果数量
            if (results.length === 0){
                const allResults = await animeTable.find().limit(num);
                res.json(allResults);
                
            }
            res.json(results);
        }catch(err){
            console.log(`week router err : \n ${err}`);
            res.json({});
    
        }
        
    });

    app.get('/api/month',async (req,res)=>{
        console.log(` month router`);
        const num = (req.query.num)? parseInt(req.query.num) : 0;
        const skip = (req.query.skip)? parseInt(req.query.skip) : 0; //從skip開始選num筆
    
        try{
            
            const results = await animeTable.find()
                .sort({ clickMonth: -1 }) // 按照降序排序
                .skip(skip)
                .limit(num); // 限制结果数量
            if (results.length === 0){
                const allResults = await animeTable.find().limit(num);
                res.json(allResults);
                
            }
            res.json(results);
        }catch(err){
            console.log(`week router err : \n ${err}`);
            res.json({});
    
        }
        
    });
    
    //////////// backend record //////////
    app.post('/api/count',async (req,res)=>{
        console.log(`count start`);
        
        const clickData = req.body;
        
        try{
            Array.from( Object.keys(clickData)).forEach(async (url) =>{
                if (url){
                    try{
                    
                        const results = await animeTable.findOneAndUpdate(
                            {url:url},
                            {$push : {count : Date(clickData[url]) }} // add clicked-date to mongoose
                        );
                        console.log(`Count date is finished`);
    
                        
                    }catch(err){
                        console.log(`count router err : \n ${err}`);
                        //try add new count = 1;
                        try{
                            const results = await animeTable.findOneAndUpdate(
                                {url:url},
                                {$set : {count: Date(clickData[url])}} 
                            );
                            console.log(`Build Count, Count is ${results.count}`);
                            
                        }
                        catch(err){
                            console.log(`Add count key fail :\n ${err}`);
                        }
                
                    }
                }else{
                    console.log(`No url Count Api`);
                }
                
                
            });
            console.log("count router finished");
            res.send("count router finished");
        }
        catch(err){
            console.log(`sever Err of count : \n ${err}`);
        }
        
        
        

    });

    app.post('/api/imgUrlSearch',async (req,res)=>{
        try{
            console.log(`imgUrlSearch Start`);

            const data = req.body;

            Array.from(Object.keys(data)).forEach(async (url) => {
                
                const title = data[url];
                console.log(`search image accept Data : \n`);
                console.log(`title ${title}`);
                console.log(`url ${url}`);
                const imgUrlnew = await getImageUrl(title);    
                await BuildKeyAndData(url,'imgUrl',imgUrlnew);
                console.log(`imgUrl Search finished : ${imgUrlnew}`);
            })

            res.send('imgUrl finished') ;
        }catch(err){
            console.log(`Err anime1UrlSearch router : \n ${err}`);
            res.send(`I can't look for image now`);
        }
        

    })
    //


}).catch((err) => {
    console.log(`Connect Mongoose fail`);
})

////////////// Update Router/////////////////////////////////////////////
app.get('/update',(req,res)=>{
    console.log(`update router`);
    mongoose.connect(process.env.mongooseUrl).then(async ()=>{
        console.log('database connected.');

        try{
            // Save youtube playlists to disk
            console.log(`download youtube playlists start`);
            await getPlaylists(`https://www.googleapis.com/youtube/v3/playlists?part=snippet&channelId=${aniOneChannelId}&key=${youtubeApi}`,'playlist_aniOne.json','aniOne');
            await getPlaylists(`https://www.googleapis.com/youtube/v3/playlists?part=snippet&channelId=${museChannelId}&key=${youtubeApi}`,'playlist_muse.json','Muse');
            // upload to database
            console.log(`Upload youtube playlists start`);
            //saveToDatabaseYoutube('playlist_aniOne.json','',0,1); //upload 部分
            //saveToDatabaseYoutube('playlist_muse.json','',0,1);    

            saveAllToDatabaseYoutube('playlist_aniOne.json');     //upload 全部
            saveAllToDatabaseYoutube('playlist_muse.json');

            //anime1
            console.log(`fetch anime1 playlists start`);
            await getPlaylistsAnime1();

            updateAllClickKey();

            res.send(`update accepted`);
        }catch(err){
            console.log(`Err update databse : \n ${err}`);
            res.send(`Err update databse : \n ${err}`);
        }
        

    });

});

app.get('/updateNoImg',async (req,res) => {
    mongoose.connect(process.env.mongooseUrl).then(async ()=>{
        console.log('database connected.');
        try{
            await updateAllNoImg();
            res.send(`updateAllNoImg finished`);
        }catch(err){
            console.log(`Error updateAllNoImg : \n ${err}`);
            res.send(`Error updateAllNoImg`);
        }
    });
    
    
    

})

//export variable to another js
module.exports = {
    animeTable
  };
//load another js
const routes_showAllPage = require('./showallpage/index2');
const routes_search = require('./search/search1');
app.use('/showallpage',routes_showAllPage);
app.use('/search',routes_search);


//listen port
const port = process.env.PORT || 3000;
app.listen(port, function () {
  console.log('Your app is listening on port ' + port)
});