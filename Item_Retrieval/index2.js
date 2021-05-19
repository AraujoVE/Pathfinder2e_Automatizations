const rp = require('request-promise');
//const $ = require('cheerio');
const xpath = require("xpath-html");

var itemArrayStats = [];

async function wait(timeInSeconds){
    await new Promise(resolve => setTimeout(resolve, 1000*timeInSeconds));
}


async function getHtml(url,catchLog = true){
    var html = null;
    await rp(url)
        .then(function(value){
            html = value;
        })
        .catch(function(err){
            if(catchLog) console.log('ERROR: HTML of url:\n"' + url + '"\nnot found');
        });
    
    return html;
}

async function getElementByXPath(html,xPath,catchLog = true){
    var element = null;
    try{
        element = await xpath.fromPageSource(html).findElement(xPath);
    }
    catch{
        if(catchLog) console.log('ERROR: Element of xpath:\n"' + xPath + '"\nnot found');
    }
    
    return element;
}

async function getElementsByXPath(html,xPath,catchLog = true){
    var elements = null;
    try{
        elements = await xpath.fromPageSource(html).findElements(xPath);
    }
    catch{
        if(catchLog) console.log('ERROR: Elements of xpath:\n"' + xPath + '"\nnot found');
    }
    
    return elements;
}

async function getTextByXPath(html,xPath){
    const varElem = await getElementByXPath(html,xPath);
    if(varElem === null) return null;
    return await varElem.getText();
}

async function getTextsByXPath(html,xPath){
    var varElems = await getElementsByXPath(html,xPath);
    if(varElems === null) return null;
    for(var i=0;i<varElems.length;i++){
        varElems[i] = await varElems[i].getText();
    }
    return varElems;
}

async function getItemMainName(html){
    return await getTextByXPath(html,"//h1[@class='title']");
}

async function getItemsManyNames(html){
    return await getTextsByXPath(html,"//h2[@class='title']");
}

async function getItemMainLv(html){
    const itemLv = await getTextByXPath(html,"//h1[@class='title']/span");
    if(itemLv === null) return null;
    return await itemLv.split(" ")[1];
}

async function getItemsManyLvs(html){
    var itemLvs = await getTextsByXPath(html,"//h2[@class='title']/span");
    if(itemLvs === null) return null;
    for(var i=0;i<itemLvs.length;i++){
        itemLvs[i] = await itemLvs[i].split(" ")[1];
        itemLvs[i] = Number(itemLvs[i]);
    }
    return itemLvs;
}

async function stringToPrice(priceStr){
    var auxPair;
    var price = 0;

    priceStr = priceStr.split(",");

    for(var i=0;i<priceStr.length;i++){
        priceStr[i] = priceStr[i].trim();
        auxPair = priceStr[i].split(" ");
        if(auxPair[1] === "sp") auxPair[0] *= 0.1;
        else if(auxPair[1] === "cp") auxPair[0] *= 0.01;
        price += Number(auxPair[0]);
    }

    return Math.trunc(price*100)/100;

}

async function stringToBulk(bulkStr){
    const bulkValue = bulkStr.trim();
    if(bulkValue === "L") return 0.1;
    else if(!isNaN(bulkValue - parseFloat(bulkValue))) return Number(bulkValue);
    else{
        console.log("ERRADO!");
        return null;
    }
}

async function getItemMainPrice(html){
    //const previousElem = await getElementByXPath(html,"//span//h1[@class='title']/following-sibling::b[contains(.,'Price')]");
    const previousElem = await getElementByXPath(html,"//b[contains(.,'Price')]");
    if(previousElem === null) return 0.00;
    var priceStr = await previousElem.nextSibling.data;
    return await stringToPrice(priceStr);
}

async function getItemsManyPrices(html){
    var pricesStrs = await getElementsByXPath(html,"//b[contains(.,'Price')]");
    if(pricesStrs === null) return 0.00;
    for(var i=0;i<pricesStrs.length;i++){
        pricesStrs[i] = await pricesStrs[i].nextSibling.data;
        pricesStrs[i] = await stringToPrice(pricesStrs[i]);
    }
    return pricesStrs;
}

async function getItemMainBulk(html){
    const previousElem = await getElementByXPath(html,"//b[contains(.,'Bulk')]");
    if(previousElem === null) return 0.0;
    var bulkStr = await previousElem.nextSibling.data;
    return await stringToBulk(bulkStr);
}

async function getItemsManyBulks(html){
    var bulkStrs = await getElementsByXPath(html,"//b[contains(.,'Bulk')]");
    if(bulkStrs === null) return [0.0];
    for(var i=0;i<bulkStrs.length;i++){
        bulkStrs[i] = await bulkStrs[i].nextSibling.data;
        bulkStrs[i] = await stringToBulk(bulkStrs[i]);
    }
    return bulkStrs;
}


async function standardizeSize(initList,correctSize){
    if(initList.length === 1){
        for(var i=1;i<correctSize;i++){
            await initList.push(initList[0]);
        }
    }
    else if(initList.length === correctSize + 1){
        await initList.shift();
    }
    return initList;
}

async function addManyLvItems(html,itemName){
    const itemsNames = await getItemsManyNames(html);
    const itemLvs = await getItemsManyLvs(html);
    var itemsPrices = await getItemsManyPrices(html);
    var itemsBulks = await getItemsManyBulks(html);


    itemsPrices = await standardizeSize(itemsPrices,itemsNames.length);
    itemsBulks = await standardizeSize(itemsBulks,itemsNames.length);

    for(var i=0;i<itemsNames.length;i++){
        itemArrayStats.push([itemsNames[i],itemName,itemLvs[i],itemsPrices[i],itemsBulks[i]]);
    }
}

async function addOneLvItem(html,itemName,itemLvText){
    const itemPrice = await getItemMainPrice(html);
    const itemBulk = await getItemMainBulk(html);
    itemArrayStats.push([itemName,itemName,Number(itemLvText),itemPrice,itemBulk]);
}


async function getItemAttributes(html){
    const nameText =  await getItemMainName(html);
    const itemLvText = await getItemMainLv(html);

    console.log(nameText);
    if(itemLvText.includes("+")){
        await addManyLvItems(html,nameText);
    }
    else{
        await addOneLvItem(html,nameText,itemLvText);
    }
}


async function itemFound(it){
    const url = "https://2e.aonprd.com/Equipment.aspx?ID=" + it;
    const html = await getHtml(url,false);

    if(html === null){
        console.log("ERROR: Invalid Nethys page.");
        return false;
    }

    const itemLv = await getItemAttributes(html);
    console.log(itemArrayStats);


    return true;
}


async function main(){
    var nethysSubsequentErrors = 0;
    var it = 0;

    while(nethysSubsequentErrors < 6){        
        console.log("iteration no." + (it+1) + "\n");
        if(await itemFound(++it)){
            nethysSubsequentErrors = 0;
        }
        else{
            nethysSubsequentErrors++;
        }
        console.log("\n");
    }
    /*
    const xPath = "//h2[@id='mw-toc-heading']";
    const url = 'https://en.wikipedia.org/wiki/List_of_Presidents_of_the_United_States'
    const html = await getHtml(baseUrl + "3");
    const element = await getElementByXPath(html,xPath);
    console.log(element.getText());
    */
}

main();


