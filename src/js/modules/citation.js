/* Global Constants */

/* Global Variables */
var posX, posY; // Selected element coordinates
var startTime, endTime; // Timer references
var elementFound = false;
var windowYOffset = 0;

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

/* Event listeners */
document.addEventListener("mousedown", function (event) {
    // Right click
    if (event.button == 2) {
        /* Log coordinate & offset */
        posX = event.pageX;
        posY = event.pageY;
        windowYOffset = window.pageYOffset;
    }
}, true);

chrome.extension.onMessage.addListener(function (message, sender, callback) {
    resetGlobals();
    if (message.functiontoInvoke == "getShadowPath") {
        startTime = performance.now();
        findShadowPath(document, []);
    }
});

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

function findShadowPath(parentElement, pathArray) {
    var element = parentElement.elementFromPoint(posX, posY - windowYOffset);
    if (isShadowRoot(element) && !elementFound) {
        let children = getShadowRootsFromElement(element);
        if (children) {
            // var desiredChildren = children.filter(isDesiredElementInParent);
            children.forEach((value, index, array) => {
                pathArray.push(value);
                findShadowPath(value.shadowRoot, [...pathArray])
            });
        }
    } else if (!isShadowRoot(element)) {
        endTime = performance.now();
        elementFound = true;
        pathArray.push(element);
        var path = "";
        if (pathArray.length > 0) {
            console.group("Locate That Element");
            console.log("Found element in " + (endTime - startTime) + " ms. Element path stack:");
            console.log(pathArray);
            console.groupEnd();
            path = generateShadowPath(pathArray);
        } else {
            path = generateCSSPath(element);
        }
        path ? prompt("Copy the selector path below:", path) : displayError(element);
        return;
    }
}

function isDesiredElementInParent(value, index, array) {
    var elArea = value.getBoundingClientRect();
    var rect = new MyRect(elArea.x, elArea.y, elArea.width, elArea.height);
    return rect.contains(posX, posY)
}

function generateShadowPath(elementArray) {
    var pathString = "";
    for (var i = 0; i < elementArray.length; i++) {
        var elementID = elementArray[i].id;
        if (elementID) {
            pathString += "#" + elementID;
        } else {
            // console.group("Locate That Element")
            // console.log("Element without ID was found:");
            // console.log(elementArray[i]);
            // console.groupEnd();
            pathString += generateCSSPath(elementArray[i]);
        }
        if (i < elementArray.length - 1) {
            pathString += ";SR "
        }
    }
    return pathString;
}

function generateCSSPath(el) {
    if (!(el instanceof Element))
        return;
    var path = [];
    while (el.nodeType === Node.ELEMENT_NODE) {
        var selector = '';
        if (el.id) {
            selector += '#' + el.id;
            path.unshift(selector);
            break;
        } else {
            selector = el.nodeName.toLowerCase();
            var sib = el, nth = 1;
            while (sib = sib.previousElementSibling) {
                if (sib.nodeName.toLowerCase() == selector)
                    nth++;
            }
            if (nth != 1)
                selector += ":nth-of-type(" + nth + ")";
        }
        path.unshift(selector);
        el = el.parentNode;
    }
    return path.join(" > ");
}

function displayError(element) {
    alert("Selected element is missing an ID. Refer to console for more information.");
    console.group("Locate That Element");
    console.log("ERROR: The following element is missing an ID");
    console.log("Please contact your developers.");
    console.log(element)
    console.groupEnd();
}