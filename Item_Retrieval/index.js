const {Builder, By, Key, util, WebElement} = require("selenium-webdriver")
fs = require('fs');

const urlTypes = [
"https://2e.aonprd.com/Shields.aspx?ID=",    
"https://2e.aonprd.com/Vehicles.aspx?ID=",    
"https://2e.aonprd.com/Armor.aspx?ID=",
"https://2e.aonprd.com/Weapons.aspx?ID=",
"https://2e.aonprd.com/Equipment.aspx?ID="
];
//"https://2e.aonprd.com/Relics.aspx?ID=" to add

var itemsList = [];
////////////////////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////           Used Methods           /////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////

async function wait(timeInSeconds){
    await new Promise(resolve => setTimeout(resolve, 1000*timeInSeconds));
}

async function getElemAttrByXPathTC(driver,xPath,attrType,catchMsg = true){
    var attribute;
    try{
        attribute = await driver.findElement(By.xpath(xPath)).getAttribute(attrType);
    }
    catch{
        attribute = false;
        if(catchMsg) console.log("Attribute not found");
    }
    return attribute;
}

async function getElementAttributes(driver,xPath,attrType,catchMsg = true){
    var elements;
    var attributes = [];
    try{
        elements = await driver.findElements(By.xpath(xPath));
    }
    catch{
        if(catchMsg) console.log("Elements not found.");
        return null;
    }

    for(var i = 0; i<elements.length; i++){
        try{
            attributes.push(await elements[i].getAttribute(attrType));
        }
        catch{
            if(catchMsg) console.log("Attribute not found.");
            return null;
        }
    }

    return attributes;
}



async function getElementByXPathTC(driver,xPath,catchMsg = true){
    var attribute;
    try{
        attribute = await driver.findElement(By.xpath(xPath));
    }
    catch{
        attribute = false;
        if(catchMsg) console.log("ERROR: Element not found");
    }
    return attribute;
}

////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////              Pages               /////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////


////////////////////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////            Instagram             /////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////

////////////////////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////               Main               /////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////

async function translateBulk(bulkStr){
    if(bulkStr === false) return 0;

    const bulk = bulkStr.trim();
    if(bulk === "L") return 0.1;
    else if(!isNaN(bulk - parseFloat(bulk))) return Number(bulk);
    else{
        console.log("Difeerentao");
        return 0;
    }
}

async function translatePrice(priceStr){
    if(priceStr === false) return 0;
    console.log(priceStr);
    var auxPair;
    var price = 0;

    const regex = /\(.*?\)/;

    priceStr = await priceStr.replace(regex,"");
    
    console.log(priceStr);
    priceStr = await priceStr.replace(",","");
    priceStr = await priceStr.split("p");

    for(var i=0;i<priceStr.length;i++){
        priceStr[i] = await priceStr[i].trim();
        auxPair = await priceStr[i].split(" ");
        if(auxPair[1] === "g") auxPair[0] = Number(auxPair[0]);
        else if(auxPair[1] === "s") auxPair[0] = Number(auxPair[0]) * 0.1;
        else if(auxPair[1] === "c") auxPair[0] = Number(auxPair[0]) * 0.01;
        else auxPair[0] = 0;
        price += auxPair[0];
    }

    return Math.trunc(price*100)/100;
}

async function splitText(text,splitKeys){
    const splitKey = "**split key**";
    for(var i=0;i<splitKeys.length;i++){
        text = await text.replace(splitKeys[i],splitKey);
    }

    return await text.split(splitKey);
}

async function getKeyValues(splittedText,key,removeFirst,standardValue = "0"){
    var keyVals = [];
    
    if(!await splittedText[0].includes(key)) keyVals.push(standardValue);
    else keyVals.push(await splittedText[0].split(key)[1].split("\n")[0].split(";")[0].trim());

    for(var i = 1 ; i < splittedText.length ; i++){
        if(!await splittedText[i].includes(key)) keyVals.push(keyVals[0]);
        else keyVals.push(await splittedText[i].split(key)[1].split("\n")[0].split(";")[0].trim());
    }

    if(removeFirst) await keyVals.shift();

    return keyVals;
}


async function addItems(driver,mainName,mainLv,url){
    var itemNames = [];
    var itemLvs = [];
    var itemBulks = [];
    var itemPrices = [];
    const multipleLvs = await mainLv.includes("+");


    if(multipleLvs){
        var possibleItemNames = await getElementAttributes(driver,"//span//h2[@class='title']","innerText");
        //console.log(itemNames);
        for(var i = 0;i<possibleItemNames.length;i++){
            if(await possibleItemNames[i].includes("\nItem")){
                //console.log("Vou adicionar : " + possibleItemNames[i]);
                itemLvs.push(await possibleItemNames[i].split("\n")[1].split(" ")[1]);
                itemNames.push(await possibleItemNames[i].split("\n")[0]);
            }
            //console.log(itemNames);
        }
        itemNames.unshift(mainName);
    }
    else{
        itemNames.push(await mainName);
        itemLvs.push(await mainLv);
    }    
    //console.log("Os nome foda");
    //console.log(itemNames);

    var itemText = await getElemAttrByXPathTC(driver,"//span[.//h1[@class='title']]","innerText")

    var splittedText = await splitText(itemText,itemNames);
    await splittedText.shift();

    if(multipleLvs) itemNames.shift();

    itemBulks = await getKeyValues(splittedText,"Bulk",multipleLvs);
    console.log("Bulks => " + itemBulks);

    itemPrices = await getKeyValues(splittedText,"Price",multipleLvs);

    for(var i=0;i<itemBulks.length;i++) itemBulks[i] = await translateBulk(itemBulks[i]);
    for(var i=0;i<itemPrices.length;i++) itemPrices[i] = await translatePrice(itemPrices[i]);

    var addArray;
    for(var i=0;i<itemNames.length;i++){
        //addArray = [itemNames[i],mainName,itemPrices[i],itemBulks[i]];
        addArray = [itemNames[i],itemLvs[i],itemPrices[i],itemBulks[i],url];
        //itemsList.push(addArray);
        fs.appendFile('items.txt', addArray.toString() + "\n", (err) => { if (err) throw err; });
        console.log(addArray.toString() + "\n");
    }

    //await wait(2);
    //itemsList.push([mainName,mainName,mainLv,mainBulk,mainPrice]);
}

async function itemFound(driver,baseUrl,it){
    const url = baseUrl + it;
    await driver.get(url);

    if(await getElementByXPathTC(driver,"//h1[contains(.,'Server Error')]",false)){
        console.log("Page Not Found");
        return false;
    }

    const mainAttr = await getElemAttrByXPathTC(driver,"//h1[@class='title']","innerText");
    console.log(mainAttr);
    var mainName = mainAttr.split("\n")[0];
    var mainLv;
    if(mainAttr.split("\n").length === 1) mainLv = "0";
    else mainLv = mainAttr.split("\n")[1].split(" ")[1];

    await addItems(driver,mainName,mainLv,url);
    

    return true;
    //await wait(1);
}


async function manageWindow(driver){
    await driver.get(urlTypes[0] + "0");
    await driver.manage().window().minimize();
}


async function main(){
    let driver = await new Builder().forBrowser("firefox").build();
    
    await manageWindow(driver);
    
    var nethysSubsequentErrors = 0;
    var it = 0;

    fs.writeFile('items.txt','',(err) => { if (err) throw err; });


    for(var i=0;i<urlTypes.length;i++){
        it = 0;
        nethysSubsequentErrors = 0;
        while(nethysSubsequentErrors < 25){        
            console.log("iteration no. " + (it+1) + "\n");
            if(await itemFound(driver,urlTypes[i],++it)){
                nethysSubsequentErrors = 0;
            }
            else{
                nethysSubsequentErrors++;
            }
            console.log("\n");
        }
    }
}

main();