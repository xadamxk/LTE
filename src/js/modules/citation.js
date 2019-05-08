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
        console.group("Locate That Element");
        startTime = performance.now();
        findShadowPath(document, []);
        console.groupEnd();
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
            // Add logic to try searching for filtered and resorting to all if no filtered results are found
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
        if (pathArray.length > 1) {
            console.log("Found element in " + (endTime - startTime) + " ms.");
            console.log("Element path stack:");
            console.log(pathArray);
            path = generateShadowPath(pathArray);
        } else {
            path = generateCSSPath(element);
            console.log(path);
        }
        path ? prompt("Copy the selector path below (CTRL+C):", path) : displayError(element);
        historyLog(path);
        return;
    }
}

function historyLog(path) {
    // chrome.storage.local.clear();
    chrome.storage.local.get({
        'LTE_History': []
    },
        function (data) {
            var storageObj = data['LTE_History'];
            var date = new Date();
            var tempLog = {
                path: path,
                timestamp: date.getTime(),
                page: document.title,
            }
            storageObj.push(tempLog);
            chrome.storage.local.set({
                'LTE_History': storageObj.sort(compare).reverse().slice(0, 10)
            }, function () {
            });
        }
    );
}

function compare(a, b) {
    return a.timestamp - b.timestamp;
}

function isDesiredElementInParent(value, index, array) {
    var elArea = value.getBoundingClientRect();
    var rect = new MyRect(elArea.x, elArea.y, elArea.width, elArea.height);
    return rect.contains(posX, posY)
}

function generateShadowPath(elementArray) {
    var pathString = "";
    const getFullPath = false;
    if (getFullPath) { // Full Path
        for (var i = 0; i < elementArray.length; i++) {
            var elementID = elementArray[i].id;
            if (elementID) {
                pathString += "#" + elementID;
            } else {
                pathString += generateCSSPath(elementArray[i]);
            }
            if (i < elementArray.length - 1) {
                pathString += ";SR "
            }
        }
        return pathString;
    } else { // Relative Path
        // Potential Bug: If precision greater than shadowroot depth is needed,
        //                Need to add element variable here, set to last element in elementArray
        //                Then work up that element's parent rather than loop through elementArray
        //                Stop working if unique selector?
        for (var i = (elementArray.length - 1); i > 0; i--) {
            var elementID = elementArray[i].id;
            if (elementID) {
                // Additional logic if duplicate/nonunique shadow root
                if (isUniqueShadowRoot(elementArray, i, "#" + elementID)) {
                    var idString = elementArray[i].nodeName.toLowerCase() + ("#" + elementID);
                    pathString = (pathString ? [idString, pathString].join(" > ") : idString);
                    console.log("Selector Unique (ID)"); // Works? Might have to add logic for css select from each child to parent
                    return pathString;
                } else {
                    console.log("Selector Not Unique (ID)");// Does not work?
                    pathString = generateCSSPath(elementArray[i]) + (pathString ? " > " + pathString : "");
                }

            } else {
                pathString = generateCSSPath(elementArray[i]) + (pathString ? " > " + pathString : "");
                // Check if unique
                if (isUniqueShadowRoot(elementArray, i, pathString)) { // Potential Bug: If same ID's are direct siblings
                    // Found unique selector
                    console.log("Selector Unique (CSS)"); // Works
                    return pathString;
                } else {
                    console.log("Selector Not Unique (CSS)");
                    // Need to do work here, but what? (polymer project store list image to trigger)
                }
            }
        }
        console.log("Never found unique selector...")
        return pathString;
    }
}

function checkShadowForSelector(element, selector, matchesArray) {
    // Get shadow children of selector
    var jElement = (isShadowRoot(element) ? element.shadowRoot : element);
    var shadowChildren = getShadowRootsFromElement(jElement);
    // Check for match, and continue on
    if ($(jElement).find(selector).length > 0) {
        $(jElement).find(selector).toArray().map((matchedElement) => {
            matchesArray.push(matchedElement);
        })
    }
    shadowChildren.map((shadowGrandChildren) => {
        checkShadowForSelector(shadowGrandChildren, selector, matchesArray);
    })
    return matchesArray;
}

// Check if selector is unique in relation to shadow parent
function isUniqueShadowRoot(array, index, selector) {
    var matchesFinal = [];
    var matches = checkShadowForSelector(array[0], selector, []);
    matches.map((match) => { matchesFinal.push(match) });
    console.log("Elements matching selector(" + selector + "): " + matchesFinal.length)
    return (matches.length === 1 ? true : false);
}

// https://stackoverflow.com/a/3620374
function generateCSSPath(el) {
    if (!(el instanceof Element))
        return;
    var path = [];
    while (el.nodeType === Node.ELEMENT_NODE) {
        var selector = '';
        if (el.id) {
            selector += el.nodeName.toLowerCase() + '#' + el.id;
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
    console.log("ERROR: The following element is missing an ID");
    console.log("Please contact your developers.");
    console.log(element);
}