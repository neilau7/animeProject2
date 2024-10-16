const starUrl = "/public/star-full.svg";
const noStarUrl = "/public/star-black.svg";

createSearchLink();
//throttle for addListener
localStorage.removeItem('no-img'); //clear history
localStorage.removeItem('click');
fectchNoImg_throttle(1000);
recordThrottle(10000); // upload click and deal with Image Search
window.addEventListener('load',async ()=> {
    try{
        // web params
        const currentUrl = document.URL;
        console.log(`current URL is ${currentUrl}`);

        //const apiSegment = Array.from( currentUrl.split('/')).slice(-2,-1)[0];// 從URL得到api路由關鍵字串
        const keyword = decodeURIComponent( currentUrl.split('/').slice(-1)[0] );
        
        // fetch data
        const responseTotal = await fetch(`/search/api/?keyword=${keyword}&totalLoc=Y`);
        const totalNum = parseInt( await responseTotal.json());

        // element
        //TitleEle = document.getElementById('Title');
        resultEle = document.getElementById('result');

        // footer params
        
        footerEle = document.getElementById('footer');
        pageNum = 15;
        totalPage = (totalNum%pageNum !== 0)? parseInt( totalNum/pageNum ) + 1 : parseInt( totalNum/pageNum );

        // run
        updateDisplayData(await segmentData(1));
        showFooter(1);
        changeCurrentFooterColor(1,"blue");
        //////////////////////////////////////////////////
        //////////////////  載入後執行的函數  ///////////////
        //////////////////////////////////////////////////
        function showFooter(page){

            if(page > totalPage) return;
        
            footerEle.innerHTML = ''; //clear
        
            // page <= totalPage case
            if (totalPage <= 5){
                console.log('case <=5');
                for (let i=1;i<=totalPage;i++){
                    createSingleFooter(i);
                }
            }else{ // > 5 case
                //first page
                createSingleFooter(1);
                //previous page
                if (page - 1 > 1 ){ //是否需要previous page
                    if (page - 1 > 2){
                        createThreePoint();
                    }
                    createSingleFooter(page - 1);
                }
                //current page
                if (page !== 1 ){
                    createSingleFooter(page);
                }
                
                //next page
                if(page + 1 < totalPage){ 
                    createSingleFooter(page + 1);
                    if(page+1 < totalPage - 1){
                        createThreePoint();
                    }
                }
                // last page
                if(page !== totalPage){
                    createSingleFooter(totalPage);
                }
                
        
            }
        }
        
        function createSingleFooter(page){
        
            const superLinkEle = createListenerForFooter(page);
            const fieldsetEle = document.createElement('fieldset');
            fieldsetEle.className = "inline footerNum";
            fieldsetEle.textContent = page;
            superLinkEle.appendChild(fieldsetEle);
            footerEle.appendChild(superLinkEle);
        }
        function createThreePoint(){
            for (let i=0;i<3;i++){
                const pointEle = document.createElement('div');
                pointEle.textContent = '.';
                pointEle.className = 'inline footerNum';
                footerEle.appendChild(pointEle);
            }
            
            
        }
        function createListenerForFooter(page){
            const superLinkEle = document.createElement('a');
            superLinkEle.href = '#';
            if (page > totalPage){
                console.error(`page doesn't exist`);
                return superLinkEle;
            }
            
            superLinkEle.addEventListener('click',async ()=>{
                
                updateDisplayData(await segmentData(page));
                showFooter(page);
                changeCurrentFooterColor(page,"blue"); //current page is colorful
                
        
            });
            return superLinkEle;
            
        }   
        //simple func
        async function segmentData(page){ //需要讀取函數外的totalNum
                            
            if (page > pageNum) return [];
            
            var responseData = [];
            if (page === 1 && totalNum < pageNum){
                const response = await fetch(`/search/api/?keyword=${keyword}`);
                responseData = await response.json();
            }else{
                // 選取資料從(page - 1)*pageNum 到 page*pageNum 
                const response = await fetch(`/search/api/?keyword=${keyword}&skip=${(page - 1)*pageNum}&num=${pageNum}`);
                console.log(`skip = ${(page - 1)*pageNum}`);
                responseData = await response.json();
            }
            
            
            return responseData;
        };
        
        function changeCurrentFooterColor(page,color){
            const footerEles = document.getElementsByTagName('fieldset');
            Array.from(footerEles).forEach(ele=>{
                console.log(`ele=${ele}`);
                const itemPage = parseInt( ele.textContent);
                if (itemPage === page){
                    ele.style.backgroundColor = color;
                }
            });
        }
        function updateDisplayData(data){
            function createStarElement(url){
                        
                console.log(`<< createStarElement >>`);
                const starBlockEle = document.createElement('div');
                starBlockEle.className = "star-block";
                const starBackGroundEle = document.createElement('div');
                starBackGroundEle.className = "star-background";
                const starImageEle = document.createElement('img');
                starImageEle.className = "star-img";
        
                const data = JSON.parse( localStorage.getItem('starRecord') ); // {'url':...,'title':...,'imgUrl':,...},{...}
                
                if (!data || data.length === 0){
                    console.log(`data is null`);
                    starImageEle.src = noStarUrl;
        
                    
                }else {
                    console.log(`is star : \n ${JSON.stringify( data)}`);
                    const urls = Array.from( data ).map(ele => ele.url);
                    if (urls.includes(url)){
                        console.log("update star");
                        starImageEle.src = starUrl;
                    }else{
                        starImageEle.src = noStarUrl;
                    }
                }
        
                //starBlockEle.addEventListener('click', toggleStar);
        
                starBackGroundEle.appendChild(starImageEle);
                starBlockEle.appendChild(starBackGroundEle);
        
                return starBlockEle;
            };
            
            function urlListener(element){
                element.addEventListener('click',(event)=>{
                    event.preventDefault();
                    const currentNode = event.target;
                    console.log(`url trigger is ${currentNode.outerHTML}`);
        
                    
                    
                    
                    if (currentNode.matches(".star-img")){
                        console.log("star block triggers ");
                        toggleStar(currentNode.parentNode.parentNode.parentNode);   
                    }
                    else{
                        console.log(`create new web`);
                        window.open(element.href,'_blank'); // open new web
                    }
                    
                })
                return element;
            }
        
            //clear
            resultEle.innerHTML = '';
        
            Array.from(data).forEach(async (ele) => {
                console.log(ele);
                const articleEle = document.createElement('article');
                articleEle.className = "img-container";
                var urlEle = document.createElement('a');
                urlEle.href = ele.url;
                urlEle.target = "_blank";
                urlEle['data-click'] = false; //是否被點擊過
                urlEle['data-img'] = (ele.imgUrl)? ele.imgUrl: '';   //imgUrl 
                urlEle['data-title'] = ele.title;
                urlEle['data-date'] = ele.date;
                urlEle['data-from'] = ele.from;
                urlEle = urlListener(urlEle);
        
                
                const imgMaskEle = document.createElement('div');
                imgMaskEle.className = "img-mask";
                const imgEle = document.createElement('img');
                imgEle.src = (ele.imgUrl)? ele.imgUrl: 'https://st4.depositphotos.com/14953852/24787/v/450/depositphotos_247872612-stock-illustration-no-image-available-icon-vector.jpg';
                const fromEle = document.createElement('p');
                fromEle.className = "img-from";
                fromEle.textContent = ele.from;
                const titleEle = document.createElement('p');
                titleEle.textContent = ele.title;
                titleEle.className = "img-title";
                const starBlockEle = createStarElement(ele.url);
        
                imgMaskEle.appendChild(imgEle); //like this : <article class="img-container"><a href="#"><div class="img-mask"><img src="imgUrl"></div><p class="img-title">Name</p></a></article>
                imgMaskEle.appendChild(starBlockEle);
                urlEle.appendChild(imgMaskEle);
                urlEle.appendChild(fromEle);
                urlEle.appendChild(titleEle);
                articleEle.appendChild(urlEle);
                resultEle.appendChild(articleEle);
            });
        
        };
        function toggleStar(element){
                    
            //const completeNoStarUrl = "https://" + window.location.hostname + noStarUrl;
            //const completeStarUrl = "https://" + window.location.hostname + starUrl;
            
            const imgMaskEle = element;
            const aLinkEle = imgMaskEle.parentNode;
        
            const newData = {
                'url':aLinkEle.href,
                'title':aLinkEle['data-title'],
                'imgUrl':aLinkEle['data-img'],
                'date':aLinkEle['data-date'],
                'from':aLinkEle['data-from']
            }
        
            const currentStar = element.firstElementChild.nextElementSibling.firstElementChild.firstElementChild;
            const currentStarUrlObj = new URL( currentStar.src, window.location.origin);
            const currentStarUrl = currentStarUrlObj.pathname;
        
            var data = (JSON.parse( localStorage.getItem("starRecord") ))? JSON.parse( localStorage.getItem("starRecord") ) : [];
        
            console.log(`original data : \n ${data}`);
            const dataUrls = Array.from(data).map(ele => ele.url);
        
            console.log(`toggle star src : ${currentStar.src}`);
            if (!currentStar.src){
                return;
            }
            
            if ( currentStarUrl === noStarUrl){
                
                if (dataUrls.length === 0 || !dataUrls.includes(newData.url)){
                    data = Array.from(data);
                    data.push(newData);
                }
                currentStar.src = starUrl;
                console.log(`become star`);
            }else{
                console.log(`delete star`);
                data = Array.from(data).filter(ele => ele.url !== newData.url);
                
                currentStar.src = noStarUrl;
            }
            console.log(`final star data : \n ${data}`);
        
            localStorage.setItem("starRecord", JSON.stringify(data));
            
            
        }
        
    }catch(err){
        console.log(`fectch Err : \n ${err}`);
    }
    
})




function createSearchLink(){
            
    const searchInputEle = document.getElementById('search-input');
    const searchLinkEle = document.getElementById('search-link');
    searchLinkEle.addEventListener('click',()=>{
        
        const keyword = encodeURIComponent( searchInputEle.value);
        console.log(`Search ${searchInputEle.value}`);
        window.location.href = `/search/searchpage/${keyword}`;
    });
    searchInputEle.addEventListener('keydown',(event)=>{
        if (event.key === "Enter"){
            const keyword = encodeURIComponent( searchInputEle.value);
            console.log(`Search ${searchInputEle.value}`);
            window.location.href = `/search/searchpage/${keyword}`;
        }
        
    });

};






function fectchNoImg_throttle(delay){ 
    const menuEle = document.getElementById('menu');
    const fetchImg = throttle((element)=>{
        // Search image through google api
        try{
            
            if (element.hasAttribute('href') && !element['data-click'] && !element['data-img']  ){
                console.log(`fetch No img : ${element.href}`);
                const url = element.href;
                const title = element['data-title'];

                //const imgUrl = element['data-img'];

                const newData = {
                    [url]: title
                };

                //get data from disk
                const clickData = JSON.parse( localStorage.getItem('no-img'));
                console.log(`no-img data is ${JSON.stringify( clickData )}`);
                if (!clickData){
                    localStorage.setItem('no-img', JSON.stringify(newData));
                }else{
                    clickData[url] = newData[url];
                    localStorage.setItem('no-img', JSON.stringify(clickData));
                }

                
            }
        }catch(err){
            console.log(`Error Search image through google api \n : ${err}`);

        }


    }, delay );
    menuEle.addEventListener('click', (event)=>{
        
        const clickedEle = event.target;
        const linkEle = clickedEle.parentNode.parentNode;
        //console.log(`clicked menu element is ${clickedEle.parentNode.parentNode['data-img']}`);  
        fetchImg(linkEle); 
    });

}

function click_throttle(delay){ 
    const menuEle = document.getElementById('menu');
    const fetchImg = throttle((element)=>{
        // Search image through google api  
        try{
            if (element.hasAttribute('href') && !element['data-click'] ){
                console.log(`click url is ${element.href}`);     
                element['data-click'] = true;
                const nowDate = new Date();
                const nowUrl = element.href;
                
                const newData = {       // In localStorage, {'click':  {'http1':[date1,date2], 'http2': [date1,date2] } }
                    [nowUrl] : nowDate,
                };

                //get data from disk
                const clickData = JSON.parse( localStorage.getItem('click'));
                console.log(`click data is ${JSON.stringify( clickData )}`);
                 // save data
                if (!clickData ){
                    // save single data
                    localStorage.setItem('click',JSON.stringify( newData ));
                }else {

                    if (clickData.hasOwnProperty(nowUrl)){
                        clickData[nowUrl] = [...clickData[nowUrl], nowDate];
                        localStorage.setItem('click',JSON.stringify( clickData ));
                    }else{
                        clickData[nowUrl] = [ nowDate];
                        localStorage.setItem('click',JSON.stringify( clickData ));
                    }
                
                }
                
                
                /*
                const params = new URLSearchParams({ //application/x-www-form-urlencoded 需要這樣才不會出錯
                    'url' :  element.href ,
                    'clickDate' : new Date()
                });  
                const response = fetch('/api/count',{
                    method:'POST',
                    headers:{
                        Accept:'application/json',
                        'Content-Type' : 'application/x-www-form-urlencoded'
                    },
                    body:params
                });*/
            }
            
        }catch(err){
            console.log(`count Err \n : ${err}`);
        }


    }, delay );
    menuEle.addEventListener('click', (event)=>{
        
        const clickedEle = event.target;
        const linkEle = clickedEle.parentNode.parentNode;
        //console.log(`clicked menu element is ${clickedEle.parentNode.parentNode['data-img']}`);  
        fetchImg(linkEle); 
    });

}



function recordThrottle(delay){
    const recordRun = throttle(()=>{
        
        const clickData = JSON.parse( localStorage.getItem('click') );
        const noImgData = JSON.parse( localStorage.getItem('no-img') );
        
        // fetch click
        if (clickData){
            var params = new URLSearchParams(clickData);               //application/x-www-form-urlencoded 需要這樣才不會出錯  
            var response = fetch('/api/count',{
                method:'POST',
                headers:{
                    Accept:'application/json',
                    'Content-Type' : 'application/x-www-form-urlencoded'
                },
                body:params
            });
        }
        

        //fetch No image
        if (noImgData){
            params = new URLSearchParams(noImgData);               //application/x-www-form-urlencoded 需要這樣才不會出錯  
            response = fetch('/api/imgUrlSearch',{
                method:'POST',
                headers:{
                    Accept:'application/json',
                    'Content-Type' : 'application/x-www-form-urlencoded'
                },
                body:params
            });
        }
        localStorage.removeItem('no-img'); //clear history
        localStorage.removeItem('click');
    },delay); // ms

    const menuEle = document.getElementById('menu');
    menuEle.addEventListener('click', ()=>{
        recordRun();
    });
}

function throttle(func, limit) {
    let inThrottle;
    return function(...args) {
      const context = this;
      if (!inThrottle) {
        func.apply(context, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  }



