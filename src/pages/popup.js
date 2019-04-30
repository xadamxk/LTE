getHistory();

function getHistory() {
    chrome.storage.local.get({
        'LTE_History': []
    },
        function (data) {
            var storageObj = data['LTE_History'].sort(compare).reverse();
            var listGroup = $("<ul>")
                .addClass("list-group")
                .attr({
                    id: "LTEHistoryList",
                    role: "tablist"
                });
            storageObj.forEach((element, index) => {
                listGroup.append($("<li>")
                    .addClass("list-group-item list-group-item-action")
                    .attr({
                        href: "#LTEHistoryListItem1",
                        id: "LTEHistoryListItem" + index,
                    })
                    .click(function () {
                        prompt("Selector from History (CTRL+C):", element.path)
                    })
                    .append($("<div>")
                        .addClass("d-flex w-100 justify-content-between")
                        .append($("<h6>")
                            .addClass("mb-1")
                            .text(element.page)
                        )
                    )
                    .append($("<p>")
                        .text(element.path)
                        .css({ "font-size": "10pt" })
                    )
                    .append($("<small>").text(moment(element.timestamp).format('MM/DD/YYYY @ hh:mm A')))
                );
            })
            $(document.body).append(listGroup);
        }
    );
}

function compare(a, b) {
    return a.timestamp - b.timestamp;
}