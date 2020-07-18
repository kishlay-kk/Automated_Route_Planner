let fs = require('fs');

let MainHtml = "";
module.exports = function (data) {
let MetaData = fs.readFileSync('./Directions.json');
let obj = JSON.parse(MetaData);
MainHtml += " <html>   <head> <title> Most Optimum Route </title> "
MainHtml += " <link rel='stylesheet' href='https://maxcdn.bootstrapcdn.com/bootstrap/3.3.7/css/bootstrap.min.css'> " 
MainHtml += " <script src='https://ajax.googleapis.com/ajax/libs/jquery/1.12.4/jquery.min.js'></script> "
MainHtml += " <script src='https://maxcdn.bootstrapcdn.com/bootstrap/3.3.7/js/bootstrap.min.js'></script> "
MainHtml += " <meta name='viewport' content='width=device-width, initial-scale=1'> "
MainHtml += " <link rel='stylesheet' href='html.css' type='text/css'> "
MainHtml += " </head> "
MainHtml += " <body> " 
MainHtml += " <div class='container' style = 'margin-top : 5%; margin-bottom : 5%'> "

MainHtml += " <center> <h1 style = 'font-size : 60px'><b> "  + data + "</b></h1> </center> "
MainHtml += "<div style = 'margin-top : 5%; margin-bottom : 5%;'>"
MainHtml += "<ol style='list-style-type: decimal'>"
    
const Cname = obj.name.charAt(0).toUpperCase() + obj.name.slice(1);
obj.name = Cname;
MainHtml += "<h3> <li>" + Cname + " </li> </h3>"
MainHtml += "</ol></div><hr>"
let dir = obj.directions;

MainHtml += "<div class='row row_style'>"
MainHtml += "<div class='col-xs-12' style = 'margin-top : 2%;'>"
MainHtml += "<div class='panel panel-primary'>"
MainHtml += "<div class='panel-heading'>"
MainHtml += "<center><h2>  Route  : " + obj.name + "</h2> </center> </div>"
let details = obj.details.split("     ")
MainHtml += "<div class='panel-body'> <center>"
MainHtml += "<h3> ETA - " + details[0] + "</h3>"
MainHtml += "<h3> Distance - " + details[1] + "</h3>"
MainHtml += "<img src = '" + obj.map + "'>"
MainHtml += "<h4 style = 'margin : 3%'> Summary : " + obj.summary + "</h4>  </center>";
for(let i = 0 ; i < dir.length ; i++)
{
    Middle(dir[i]);  
} 
MainHtml += "</div>"; 
MainHtml += "</div></div></div><hr style='border: 0;border-bottom: 1px dashed #ccc;background: #888888;'>"
MainHtml += " </div> </body> </html>"
return MainHtml
}

function Middle(data)
{
    let log = data.steps;
    if(log != null)
    {
        MainHtml += "<div style = 'margin : 2%'> <ul style='list-style-type: circle'>"
        MainHtml += "<h3><li>" + data.heading + "</li></h3>"
        MainHtml += "<h4 style = 'margin-left : 2%'><i>" + data.details + "</i></h4>"
        if(data.extra != null)
        MainHtml += "<h4 style = 'margin-left : 2%'>" + data.extra + "</h4>"
        MainHtml += "</ul></div>"
        for(let i = 0 ; i < log.length ; i++)
        {
            MainHtml += "<div style = 'margin : 2%'>";
            onlySteps(log[i],data);
            MainHtml += "</div>";
        }
        MainHtml += "<hr>";
    }
    else
    {
       onlySteps(data);
       MainHtml += "<hr>";
    }   
}

function onlySteps(data)
{
    MainHtml += "<div style = 'margin : 4%'> <ul style='list-style-type: square' >"
    MainHtml += "<h4><li>" + data.heading + "</li></h4>"
    MainHtml += "<h4 style = 'margin-left : 2%'><i>" + data.details + "</i></h4>"
    if(data.extra != null)
    MainHtml += "<h4 style = 'margin-left : 2%'>" + data.extra + "</h4>"
    MainHtml += "</ul></div>"
}