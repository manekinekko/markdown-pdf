var system = require("system")
  , page = require("webpage").create()
  , fs = require("fs")
  , os = require("system").os


// Read in arguments
var args = ["in", "out", "layout", "cwd", "runningsPath", "cssPath", "highlightCssPath", "paperFormat", "paperOrientation", "paperBorder", "renderDelay", "loadTimeout"].reduce(function (args, name, i) {
  args[name] = system.args[i + 1]
  return args
}, {})

// Resources don't load in windows with file protocol
var protocol = os.name == "windows" ? "" : "file://"

var layout = page.libraryPath + "/../html5bp/index.html"
var baseUrl = protocol + page.libraryPath + "/../html5bp/"


if(args.layout && args.layout !== 'null'){
  layout = args.layout + "/page.html"
  baseUrl = protocol + args.layout + '/'
}

args.in = fs.read(args.in);

// var toc = args.in.toString().match(/(<!--toc-->)([\w\W]+)(<!--endtoc-->)/);
var html = fs.read(layout)
  .replace("{{baseUrl}}", baseUrl)
  .replace("{{content}}", args.in)

  .replace("{{ repoUrl }}", baseUrl)
  .replace("{{~> content}}", args.in)
  .replace("{{~> toc}}", "")
  .replace("<!--toc-->", "")
  .replace("<!--endtoc-->", "")
  .replace(/\{\{asset '(.*)'\}\}/g, baseUrl+'assets/$1')
  .replace(/\{\{ imagePath \}\}/g, (protocol + args.cwd))

page.setContent(html, baseUrl)
fs.write('/tmp/readme.html', page.content, 'w')


// Add custom CSS to the page
page.evaluate(function (cssPaths) {
  var head = document.querySelector("head")

  cssPaths.forEach(function (cssPath) {
    var css = document.createElement("link")
    css.rel = "stylesheet"
    css.href = cssPath

    head.appendChild(css)
  })
}, [args.cssPath, args.highlightCssPath])

// Set the PDF paper size
page.paperSize = paperSize(args.runningsPath, {format: args.paperFormat, orientation: args.paperOrientation, border: args.paperBorder})

args.renderDelay = parseInt(args.renderDelay, 10)

if (args.renderDelay) {
  setTimeout(render, args.renderDelay)
} else {
  var loadTimeout = setTimeout(render, parseInt(args.loadTimeout, 10))
  page.onLoadFinished = function () {
    clearTimeout(loadTimeout)
    render()
  }
}

function render () {
  page.render(args.out)
  page.close()
  phantom.exit(0)
}

function paperSize (runningsPath, obj) {
  var runnings = require(runningsPath)

  // encapsulate .contents into phantom.callback()
  //   Why does phantomjs not support Array.prototype.forEach?!
  var keys = ["header", "footer"]
  for (var i = 0; i < keys.length; i++) {
    var which = keys[i]
    if (runnings[which]
      && runnings[which].contents
      && typeof runnings[which].contents === "function") {
      obj[which] = {
        contents: phantom.callback(runnings[which].contents)
      }
      if (runnings[which].height)
        obj[which].height = runnings[which].height
    }
  }
  
  return obj
}