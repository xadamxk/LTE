getHistory();

function getHistory() {
    chrome.storage.local.get({
        'LTE_History': []
    },
        function (data) {
            var storageObj = data['LTE_History'];
            var listGroup = $("<ul>")
                .addClass("list-group")
                .attr({
                    id: "LTEHistoryList",
                    role: "tablist"
                });
            storageObj.forEach((element, index) => {
                listGroup.append($("<li>")
                    .addClass("list-group-item list-group-item-action")
                    .text(element)
                    .attr({
                        href: "#LTEHistoryListItem1"
                    })
                    .click(function () {
                        prompt("Selector from History (CTRL+C):", $(this).text())
                    })
                );
            })
            $(document.body).append(listGroup);
        }
    );
}