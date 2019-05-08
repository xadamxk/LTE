/* Global Variables */
var globaltabs;
const showForPages = [
    "*://*.bbvacompass.com/*",
    "*://*.polymer-project.org/*",
    "*://*.compassbnk.com/*"
];

function genericOnClick(info, tab) {
    /* DEBUG INFO */
    // console.log("item " + info.menuItemId + " was clicked");
    // console.log("info: " + JSON.stringify(info));
    // console.log("tab: " + JSON.stringify(tab));

    /* Send tab info (for future use) */
    chrome.tabs.query({
        "active": true,
        "currentWindow": true
    }, function (tabs) {
        globaltabs = tabs;
        console.log(tabs);
        // Message passing API
        chrome.tabs.sendMessage(tabs[0].id, {
            functiontoInvoke: "getShadowPath",
        });
    });

}

// Context Types: https://developer.chrome.com/extensions/contextMenus#type-ContextType
chrome.contextMenus.create({
    "title": "Locate This Element",
    "contexts": ["all"],
    "id": "shadowRoot",
    "documentUrlPatterns": showForPages
});

chrome.contextMenus.onClicked.addListener(genericOnClick);