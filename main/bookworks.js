// https://github.com/woody-willis

let currentTab;
let debuggerId;
let version = "1.0";

chrome.tabs.onUpdated.addListener(function (tabId, changeInfo, tab) {
    if (tab.url.indexOf("sparxmaths.uk") == -1) {
        chrome.debugger.detach(debuggerId);
        return;
    }

    currentTab = tab;

    chrome.debugger.attach({
        tabId: currentTab.id
    }, version, onAttach.bind(null, currentTab.id));
});

function onAttach(tabId) {
    chrome.debugger.sendCommand({
        tabId: tabId
    }, "Network.enable");

    chrome.debugger.onEvent.addListener(allEventHandler);
}

function allEventHandler(debuggeeId, message, params) {
    if (currentTab.id != debuggeeId.tabId) {
        return;
    }

    debuggerId = debuggeeId;

    if (message == "Network.responseReceived") {
        chrome.debugger.sendCommand({
            tabId: debuggeeId.tabId
        }, "Network.getResponseBody", {
            "requestId": params.requestId
        }, function (response) {
            if (response && response.base64Encoded) {
                const decodedBody = atob(response.body);
                
                if (decodedBody.includes("SUCCESS") && decodedBody.includes("steps")) {
                    const stepsMatch = decodedBody.match(/<steps.*?<\/steps>/s);
                    if (stepsMatch) {
                        const stepsContent = stepsMatch[0];
                        console.log("Steps Content:", stepsContent);
                        console.log(response.body)
                        
                        chrome.tabs.sendMessage(currentTab.id, {
                            message: "decoded_response",
                            url: params.response.url,
                            data: stepsContent
                        });
                    }
                }
            }
        });
    }
}
