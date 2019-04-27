/* Global Constants */

/* Global Variables */
var posX, posY; // Selected element coordinates
var startTime, endTime; // Timer references
var elementFound = false;

/* Objects */
function MyRect(x, y, w, h) {

    this.x = x;
    this.y = y;
    this.width = w;
    this.height = h;

    this.contains = function (x, y) {
        return this.x <= x && x <= this.x + this.width &&
            this.y <= y && y <= this.y + this.height;
    }
}

/* Functions */
function walkDOM(main) {
    var arr = [];
    var loop = function (main) {
        do {
            arr.push(main);
            if (main.hasChildNodes())
                loop(main.firstChild);
        }
        while (main = main.nextSibling);
    }
    loop(main);
    return arr;
}

function clickElementByCords(x, y) {
    var ev = document.createEvent("MouseEvent");
    var el = document.elementFromPoint(x, y);
    ev.initMouseEvent(
        "click",
        true /* bubble */, true /* cancelable */,
        window, null,
        x, y, 0, 0, /* coordinates */
        false, false, false, false, /* modifier keys */
        0 /*left*/, null
    );
    el.dispatchEvent(ev);
}

function resetGlobals() {
    startTime, endTime = null;
    elementFound = false;
}

function isShadowRoot(element) {
    return (element.shadowRoot instanceof ShadowRoot);
}

function getShadowRootsFromElement(element) {
    return walkDOM(element).filter(x => isShadowRoot(x));
}

/* Right click event listener */
document.addEventListener("mousedown", function (event) {
    // Right click
    if (event.button == 2) {
        /* Log coordinate */
        posX = event.pageX;
        posY = event.pageY;
    }
}, true);

/* Initialize */
chrome.extension.onMessage.addListener(function (message, sender, callback) {
    resetGlobals();
    if (message.functiontoInvoke == "getShadowPath") {
        startTime = performance.now();
        findShadowPath(document, []);
    }
});

function findShadowPath(parentElement, pathArray) {
    var element = parentElement.elementFromPoint(posX, posY);
    if (isShadowRoot(element) && !elementFound) {
        let children = getShadowRootsFromElement(element);
        if (children) {
            var desiredChildren = children.filter(isDesiredElementInParent);
            desiredChildren.forEach((value, index, array) => {
                // TODO: Logic to ignore overlays (zindex, what else?)
                pathArray.push(value);
                findShadowPath(value.shadowRoot, [...pathArray])
            });
        }
    } else if (!isShadowRoot(element)) { // visible dom
        endTime = performance.now();
        elementFound = true;
        console.log("THE DARKNESS COMPELS YOU! (found element in " + (endTime - startTime) + " ms)");
        console.log(pathArray);
        prompt("Copy the selector path below:");
        var path = generatePath(pathArray);
        path ?
            prompt("Copy the selector path below:", path) :
            alert("The following shadowpath is missing an ID: " + path);
        return;
    }
}

function isDesiredElementInParent(value, index, array) {
    var elArea = value.getBoundingClientRect();
    var rect = new MyRect(elArea.x, elArea.y, elArea.width, elArea.height);
    return rect.contains(posX, posY)
}

function generatePath(elementArray) {
    var pathString = "";
    for (var i = 0; i < elementArray.length; i++) {
        var elementID = elementArray[i].id;
        if (elementID) {
            pathString += "#" + elementID;
            if (i < elementArray.length - 1) {
                pathString += ";SR "
            }
        } else {
            console.log("Shadowroot without ID was found:");
            console.log(elementArray[i]);
            break;
        }
    }
    return pathString;
}