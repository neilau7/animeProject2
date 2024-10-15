async function updateData(){
    try{
        const response = await fetch('https://animeproject2.onrender.com/update');
        
        console.log(`update data response : ${response}`);
        console.log('updateData finish');
    }catch(err){
        console.log(`updateData fail : ${err}`);
    }
    
}

async function updateNoImg(){
    try{
        const response = await fetch('https://animeproject2.onrender.com/updateNoImg');
        const data = await response.json();
        console.log(`update no image response : ${response}`);
        console.log('update no image finish');
    }catch(err){
        console.log(`updateNoImg fail : ${err}`);
    }
    
}
updateNoImg();