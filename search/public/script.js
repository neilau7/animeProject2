createSearchLink();
window.addEventListener('load',async ()=> {
    try{
        // web params
        const currentUrl = document.URL;
        console.log(`current URL is ${currentUrl}`);

        //const apiSegment = Array.from( currentUrl.split('/')).slice(-2,-1)[0];// 從URL得到api路由關鍵字串
        const keyword = decodeURIComponent( currentUrl.split('/').slice(-1)[0] );
        
        // fetch data
        response = await fetch(`/search/api/?keyword=${keyword}`);
        responseData = await response.json();

        // element
        //TitleEle = document.getElementById('Title');
        resultEle = document.getElementById('result');

        // footer params
        totalNum = responseData.length;
        footerEle = document.getElementById('footer');
        pageNum = 15;
        totalPage = (totalNum%pageNum !== 0)? parseInt( totalNum/pageNum ) + 1 : parseInt( totalNum/pageNum );

        // run
        updateDisplayData(segmentData(1));
        showFooter(1);
        changeCurrentFooterColor(1,"blue");
        
    }catch(err){
        console.log(`fectch Err : \n ${err}`);
    }
    
})


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
    
    superLinkEle.addEventListener('click',()=>{
        
        updateDisplayData(segmentData(page));
        showFooter(page);
        changeCurrentFooterColor(page,"blue"); //current page is colorful
        

    });
    return superLinkEle;
    
}   
//simple func
function segmentData(page){
    if (page > totalPage) return [];
    const data = (page === 1 && totalNum < pageNum)? responseData : responseData.slice((page - 1)*pageNum, page*pageNum ); //取資料slice
    return data;
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
    //clear
    resultEle.innerHTML = '';

    Array.from(data).forEach(async (ele) => {
        console.log(ele);
        const articleEle = document.createElement('article');
        articleEle.className = "img-container";
        const urlEle = document.createElement('a');
        urlEle.href = ele.url;
        urlEle.target = "_blank";
        urlEle['data-click'] = false; //是否被點擊過
        urlEle['data-img'] = (ele.imgUrl)? ele.imgUrl: '';   //imgUrl 
        urlEle['data-title'] = ele.title;
        counter(urlEle);
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

        imgMaskEle.appendChild(imgEle); //like this : <article class="img-container"><a href="#"><div class="img-mask"><img src="imgUrl"></div><p class="img-title">Name</p></a></article>
        urlEle.appendChild(imgMaskEle);
        urlEle.appendChild(fromEle);
        urlEle.appendChild(titleEle);
        articleEle.appendChild(urlEle);
        resultEle.appendChild(articleEle);
    });

};

async function counter(element){ //Add Listener to link element
    element.addEventListener('click',async ()=>{
        
        if(element['data-click']){
            return;
        }else{
            try{
                console.log(`click url is ${element.href}`);     
                element['data-click'] = true;
                const params = new URLSearchParams({ //application/x-www-form-urlencoded 需要這樣才不會出錯
                    'url' :  element.href ,
                    'clickDate' : new Date()
                });   
                const response = await fetch('/api/count',{
                    method:'POST',
                    headers:{
                        Accept:'application/json',
                        'Content-Type' : 'application/x-www-form-urlencoded'
                    },
                    body:params
                });
                // Search image through google api
                try{
                    if (!element['data-img']){
                        const params = new URLSearchParams({ //application/x-www-form-urlencoded 需要這樣才不會出錯
                            'url' :  element.href ,
                            'title' : element['data-title'],
                            'imgUrl' : element['data-img']
                        });   
                        const response = await fetch('/api/imgUrlSearch',{
                            method:'POST',
                            headers:{
                                Accept:'application/json',
                                'Content-Type' : 'application/x-www-form-urlencoded'
                            },
                            body:params
                        });
                    }
                }catch(err){
                    console.log(`Error Search image through google api \n : ${err}`);

                }

                
            }catch(err){
                console.log(`count Err \n : ${err}`);
            }
            
        }
    });
};

function createSearchLink(){

    const searchInputEle = document.getElementById('search-input');
    const searchLinkEle = document.getElementById('search-link');
    searchLinkEle.addEventListener('click',()=>{
        
        const keyword = encodeURIComponent( searchInputEle.value);
        console.log(`Search ${searchInputEle.value}`);
        window.location.href = `/search/searchpage/${keyword}`;
    });
};


