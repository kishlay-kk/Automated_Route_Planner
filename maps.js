const fs = require('fs');
const puppeteer = require('puppeteer');
const path = require("path");
let htmlGenerator = require("./htmlGenerator.js");

let locFile = process.argv[2];//location file
let mode = process.argv[3];// mode of commute

let commutedetails={};
let top,right,bottom,left,Mhtml;

let MinRouteArr = [], Mintime = Number.MAX_VALUE, duration,Distance,BestURL;
(async function ReadCred() {
    try {
        const browser = await puppeteer.launch({
            headless: true,
            defaultViewport: null,
            disableDeviceEmulation: true,
            slowMo: 2,
            args: ['--start-maximized', '--disable-notifications']
        });
        //read loc file 
        let locFileStr = await fs.promises.readFile(locFile, "utf-8");
        let locJSON = JSON.parse(locFileStr);
        let startPt = locJSON.startPt;
        let endPt = locJSON.endPt;
        let URL = locJSON.URL;
        let locs = locJSON.stopages;

        //permutations
        let locPermute = perm(locs);
        console.log(" Total Possible Routes -  "+locPermute.length);
        //console.table(locPermute);

        let i=0;
        
        do{
            
            let Route = [];
            let idx = 0;

            //routeformation
            Route.push(startPt);
            if(locPermute.length>0) Route = Route.concat(locPermute[i]);
            Route.push(endPt);
            // console.log(Route);

            //open url
            let pages = await browser.pages();
            let page = pages[0];
            await page.setDefaultNavigationTimeout(0);

            await page.goto(URL, {waitUntil: 'networkidle0'});

            await page.waitForSelector("#directions-searchbox-0", { visible: true });

            //stops 
            for (idx = 0; idx <Route.length; idx++) {
                await addStops(page, Route[idx], idx);
            }

            //mode of transport
            switch(mode) {
                case "car":
                  // code block
                  await  page.click('div[data-travel_mode="0"]');
                  break;
                case "public transport":
                  // code block
                  await  page.click('div[data-travel_mode="3"]');
                  break;
                case "cycling":
                    await  page.click('div[data-travel_mode="1"]');
                    break;
                case "walking":
                    await  page.click('div[data-travel_mode="2"]');
                    break;
                default:
                    await  page.click('div[data-travel_mode="0"]');
            }
            await page.waitForSelector('div[class="section-directions-trip-numbers"]', { visible: true });


            //time calculation 
            let sectionArr = await page.$$('div[class="section-directions-trip-numbers"]');
            // await page.waitForSelector(".section-directions-trip-duration span", { visible: true });
            let timeObj = await sectionArr[0].$('.section-directions-trip-duration span');
            let distObj = await sectionArr[0].$('.section-directions-trip-distance.section-directions-trip-secondary-text div');
            let time = await timeObj.evaluate(el => el.textContent, timeObj);
            let dist = await distObj.evaluate(el => el.textContent, distObj);
            let time2 = time.replace(/\s/g, '');

            //time in min
            let timeinMin;
            let timeArr = time2.split("h");

            if (time.includes('h')) {
                timeArr[1] = timeArr[1].replace(/[a-zA-Z]/g, '');
                timeinMin = timeArr[0] * 60 + parseInt(timeArr[1]);
            }
            else {
                timeinMin = timeArr[0].replace(/[a-zA-Z]/g, '');
            }

            //update min time 
            if (Mintime > timeinMin) {
                MinRouteArr = Route.slice();
                Mintime = timeinMin;
                duration = time;
                Distance = dist;
                BestURL = page.url();
                BestURL = BestURL.slice(0,BestURL.indexOf("@"));
            }
            console.log(`Route-${i+1}    : ` + Route);
            console.log(`Time-${i+1}     :  `+ time);
            console.log(`Distance-${i+1} :  `+ dist);
            console.log("--------------------------------------------------");
            i++;
        }while(i < locPermute.length)

        console.log("Best Route : "+MinRouteArr);
        console.log("Time       : "+duration);
        console.log(`Distance   : `+ Distance);
        //console.log(`URL        : `+ BestURL);
        await browser.close();

        const browser2 = await puppeteer.launch({
            headless: false,
            defaultViewport: null,
            //disableDeviceEmulation: true,
            slowMo: 5,
            args: [`--window-size=${1366},${768}`,'--disable-notifications']
            // args: ['--start-maximized','--disable-notifications' ]
        });

        let pages2 = await browser2.pages();
        let page2 = pages2[0];
        await page2.setDefaultNavigationTimeout(0);
        await page2.goto(BestURL,{waitUntil: 'networkidle0'});

        await page2.waitForSelector('div.section-directions-trip.clearfix',{visible: true});
        let arr = await page2.$$('div.section-directions-trip.clearfix');

        await page2.waitForSelector('canvas.widget-scene-canvas',{visible: true});
        const header = await page2.$('canvas.widget-scene-canvas');
        const rect = await page2.evaluate((header) => {
          const {top, left, bottom, right} = header.getBoundingClientRect();
          return {top, left, bottom, right};
        }, header);
        
        const bar = await page2.$('div#omnibox-directions');
        const barD = await page2.evaluate((bar) => {
            const {top, left, bottom, right} = bar.getBoundingClientRect();
            return {top, left, bottom, right};
          }, bar);

        top = rect.top;
        bottom = rect.bottom;
        left = barD.right;
        right = rect.right;

        let name = await(await arr[0].$("div.section-directions-trip-description h1.section-directions-trip-title")).getProperty("textContent")
        name = await name.jsonValue();
        let summary = await(await arr[0].$("div.section-directions-trip-description div.section-directions-trip-summary")).getProperty("textContent")
        summary = await summary.jsonValue();
        let details = await(await arr[0].$("div.section-directions-trip-description div.section-directions-trip-numbers")).getProperty("textContent")
        details = await details.jsonValue();

        await page2.waitForSelector('button[aria-labelledby=section-directions-trip-details-msg-0]',{visible : true})
        await page2.click('button[aria-labelledby=section-directions-trip-details-msg-0]');

        commutedetails.name = name.trim();
        commutedetails.summary = summary.trim();
        commutedetails.details = details.replace("  Arrive around    Leave around  ","").trim();
        commutedetails.directions = await getDirections(page2);
        await page2.screenshot(getOptions(0));
        commutedetails.map = './Images/screenshot'+0+'.png';

        await fs.promises.writeFile('Directions.json', JSON.stringify(commutedetails));

        Mhtml = htmlGenerator(" Most Optimum Route from " + startPt + " to " + endPt + " via all Intermediate points :")
        await fs.promises.writeFile('Html.html', Mhtml);
        
        let path = __dirname
        path = path.split('\\').join('/');
        await browser2.close();

        const browser3 = await puppeteer.launch({
            headless: true,
            defaultViewport: null,
            //disableDeviceEmulation: true,
            slowMo: 5,
            args: ['--start-maximized', '--disable-notifications']
        });
        let pages3 = await browser3.pages();
        let page3 = pages3[0];
        await page3.goto('file://'+ path +'/Html.html',{ waitUntil: 'networkidle0' });
        await generatePDF(page3);
        await browser3.close();

    } 
    catch (err)
    {
        console.log(err);
    }




})();

async function getDirections(page)
{
    try
    {
        let route = [];
        await page.waitForSelector('div.directions-mode-nontransit-groups', {visible : true});
        let divs = await page.$$('div.directions-mode-nontransit-groups div.directions-mode-group');
        let j = 0;
        while(j < divs.length)
        {
            
            let sap,div,h2,extra;
            let cls = await ( await divs[j].getProperty('className') ).jsonValue();
            if(String(cls).includes("closed"))
            {
                let obj = {};
                h2 = await divs[j].$("div.directions-mode-group-summary h2.directions-mode-group-title")
                h2 = await ( await h2.getProperty('textContent') ).jsonValue()
                sap = await divs[j].$("div.directions-mode-group-summary div.directions-mode-separator")
                sap = await ( await sap.getProperty('textContent') ).jsonValue()
                obj.heading = h2.trim();
                obj.details = sap.trim();
                await divs[j].click();
                obj.steps = await getSteps(divs[j]);
                route.push(obj);
            }
            else
            {
                nodivs = await divs[j].$$(" div.directions-non-hideable-group div.directions-mode-step-container");
                for(let i=0;i<nodivs.length;i++)
                {
                    let obj = {};
                    div = await nodivs[i].$("div.directions-mode-step div.directions-mode-step-summary div.numbered-step");
                    div = await ( await div.getProperty('textContent') ).jsonValue();
                    sap = await nodivs[i].$("div.directions-mode-step div.directions-mode-separator div.directions-mode-distance-time");
                    sap = await ( await sap.getProperty('textContent') ).jsonValue();
                    extra = await nodivs[i].$(" div.directions-mode-step div.directions-mode-step-summary div.dirsegnote");
                    extra = await ( await extra.getProperty('textContent') ).jsonValue();
                    obj.heading = div.trim();
                    obj.details = sap.trim();
                    if(extra != null && extra.trim().length > 0)
                    {
                        obj.extra = extra.replace("Confidential","").trim();
                    }
                    route.push(obj);
                }    
            }

            j++;
        }

        return route;
    }
    catch(err)
    {
        console.log(err)
    }
}

async function getSteps(div)
{
    try{
        let arr = []
        steps = await div.$$("div.hideable.expand-print.padded-hideable div.directions-mode-step-container ")
        let i = 0
        while(i < steps.length)
        {
            let div , sap , extra
            let obj = {}
            div = await steps[i].$(" div.directions-mode-step-summary div.numbered-step")
            div = await ( await div.getProperty('textContent') ).jsonValue()
            extra = await steps[i].$(" div.directions-mode-step-summary div.dirsegnote")
            extra = await ( await extra.getProperty('textContent') ).jsonValue()
            sap = await steps[i].$$("div.directions-mode-separator")
            sap = await ( await sap[1].getProperty('textContent') ).jsonValue()
            obj.heading = div.trim()
            obj.details = sap.trim()
            if(extra != null && extra.trim().length > 0)
            obj.extra = extra.replace("Confidential","").trim()
            arr.push(obj)
            i++
        }

        return arr
    }
    catch(err)
    {
        console.log(err)
    }
}

function getOptions(i)
{
    if (!fs.existsSync('./Images')){
        fs.mkdirSync('./Images')
    }
let options = {
    path: './Images/screenshot'+i+'.png',  // set's the name of the output image'
    fullPage: false,
    // dimension to capture
    clip: {      
        x: left,  // x coordinate
        y: top,   // y coordinate
        width: right,      // width
        height: bottom  // height
    },
    omitBackground: true
  }
return options
}

async function generatePDF(page) {

    try
    {
    const pdfConfig = {
        path: 'Most-Optimum-Route.pdf',  
        format: 'A4',
        printBackground: true,
        margin: { 
            top: '1.00cm',
            bottom: '1.00cm',
            left: '0.20cm',
            right: '0.60cm'
        }
    };
    await page.emulateMedia('screen');
    const pdf = await page.pdf(pdfConfig); 
    return pdf
    }
    catch(err)
    {
        console.log(err)
    }
}

async function addStops(page, stop, idx) {
    try{
    //click add destination 
    if (idx > 1) {
        await page.waitForSelector(".widget-directions-searchbox-container", { visible: true });
        await page.click(`button.widget-directions-searchbox-container`);
        await page.waitForSelector(`#directions-searchbox-${idx} input`, { visible: true });
    }

    //update
    // console.log(stop);
    // console.log(idx);
    await page.click(`#directions-searchbox-${idx} input`);
    await page.keyboard.type(stop);
    await page.keyboard.press('Enter');
    
    }catch(err){

    }
}

function perm(xs) {
    let ret = [];

    for (let i = 0; i < xs.length; i = i + 1) {
        let rest = perm(xs.slice(0, i).concat(xs.slice(i + 1)));

        if (!rest.length) {
            ret.push([xs[i]])
        } else {
            for (let j = 0; j < rest.length; j = j + 1) {
                ret.push([xs[i]].concat(rest[j]))
            }
        }
    }
    return ret;
}
