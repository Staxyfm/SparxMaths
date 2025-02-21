const BASE_URL = 'https://vipe.varunaditya.xyz';
let cardCounter = 0;
let cardData = {};
let studentName;
let API_KEY = "XXXXXXXXXXXXX-XXXXXXXXX-XXXXXX" // REPLACE WITH YOUR OWN

const script = document.createElement('script');
script.src = chrome.runtime.getURL('helpers/h2c.js');
document.head.appendChild(script);

// --------------Uploading+Answers-------------- //

const showCard = (answer = '', explanation = '') => {
    let Card = document.getElementById('card');
    if (!Card) {
        Card = document.createElement('div');
        Card.id = 'card';
        Card.className = 'Card';

        Card.innerHTML = `
            <div id="dragHandle" class="dragHandle">
                <svg id="closeCard" class="closeCard" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12"></path>
                </svg>
                <div id="stopwatch" class="stopwatch">0.00s</div>
            </div>
            <div style="padding: 12px; max-height: 600px; overflow-y: auto;" id="answerContentContainer">
                <div id="answerContainer" class="answerContainer">.</div>
                <p id="explanationText" class="explanationText">${explanation}</p>
            </div>
        `;

        document.body.appendChild(Card);

        const closeBtn = document.getElementById('closeCard');
        closeBtn.addEventListener('click', () => {
            clearInterval(cardData.timerInterval);
            clearInterval(cardData.loadingInterval);
            cardData = {};
            document.body.removeChild(Card);
        });

        const dragHandle = document.getElementById('dragHandle');
        dragElement(Card, dragHandle);

        // Initialize cardData for stopwatch
        cardData.elapsedSeconds = 0;
        cardData.timerInterval = null;

        startStopwatch(cardData);
    }

    const answerContainer = document.getElementById('answerContainer');

    if (answer && answer !== "Loading...") {
        clearInterval(cardData.loadingInterval);  // Stop changing the loading states
        clearInterval(cardData.timerInterval);    // Stop the stopwatch
    }

    if (answer.startsWith('https://')) {
        const img = document.createElement('img');
        img.src = answer;
        img.alt = 'Uploaded Image';
        img.style.maxWidth = '100%';
        answerContainer.innerHTML = '';
        answerContainer.appendChild(img);
    } else {
        answerContainer.innerText = answer;
    }

    if (explanation.startsWith('https://')) {
        const img = document.createElement('img');
        img.src = explanation;
        img.alt = 'Uploaded Image';
        img.style.maxWidth = '100%';
        document.getElementById('explanationText').innerHTML = '';
        document.getElementById('explanationText').appendChild(img);
    } else {
        document.getElementById('explanationText').innerText = explanation;
    }
};

const Upload = async () => {
    const questionWrapper = document.querySelector('[class^="_QuestionWrapper_"]');
    const answerBtn = document.getElementById('answerBtn');
    if (!questionWrapper) { alert('No question element found :('); return; };

    cardData = {
        currentLoadingIndex: 0,
        elapsedSeconds: 0,
        timerInterval: null,
        loadingInterval: null
    };

    showCard('Loading...', '');
    answerBtn.disabled = true;

    try {
        await waitForImages(questionWrapper);
        const canvas = await html2canvas(questionWrapper, { useCORS: true, allowTaint: false, logging: true });
        const screenshotDataUrl = canvas.toDataURL('image/jpeg');
        const base64Data = screenshotDataUrl.split(',')[1];

        const generateResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                "contents": [{
                    "parts": [
                        { "text": "Give me the answer to this math question" },
                        {
                            "inline_data": {
                                "mime_type": "image/jpeg",
                                "data": base64Data
                            }
                        }
                    ]
                }]
            })
        });

        if (generateResponse.status === 503) {
            showCard('Answer not found', 'Gemini is overloaded. Try again in a few seconds');
            answerBtn.disabled = false;
            return;
        }

        const responseData = await generateResponse.json();
        const initialAnswer = responseData.candidates[0].content.parts[0].text;

        console.log("Initial answer: " + initialAnswer);

        const formatResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                "contents": [{
                    "parts": [{
                        "text": `Turn this answer to a math question into the format {"answer":"answer(s) goes here", "explanation": "explanation goes here"}. Do not use ''' or any formatting in your answer: ${initialAnswer}`
                    }]
                }]
            })
        });

        if (formatResponse.status === 503) {
            showCard('', initialAnswer);
            answerBtn.disabled = false;
            return;
        }

        const formattedData = await formatResponse.json();
        const formattedText = formattedData.candidates[0].content.parts[0].text;
        
        try {
            const parsedResponse = JSON.parse(formattedText);
            showCard(parsedResponse.answer, parsedResponse.explanation);
            answerBtn.disabled = false;
        } catch (parseError) {
            console.error('Error parsing JSON:', parseError);
            showCard(initialAnswer, 'Could not format explanation');
            answerBtn.disabled = false;
        }

    } catch (error) {
        console.error('Error uploading:', error);
        showCard('Error getting answer', error.toString());
        answerBtn.disabled = false;
    }
};

// --------------Buttons+Info-------------- //

const addAnswerBtn = () => {
    const previousBtn = document.querySelector('a[class*="_PreviousButton_"]');
    const bottomBar = document.querySelector('div[class^="_BottomBar_"] div');
    const submitButton = Array.from(document.querySelectorAll('[class^="_HiddenAt_"][class*="_Sm_"]')).find(el => el.innerText.includes('answer'));
    
    if (submitButton) {  console.log("User is on answering page."); return;  }
    if (!bottomBar) {  console.error("User is not on question page."); return;  }

    const emptyDiv = document.createElement('div');
    
    if (previousBtn) {
        previousBtn.remove();
        bottomBar.insertBefore(emptyDiv, bottomBar.firstChild);
    } else {
        if (!document.getElementById('answerBtn')) {  bottomBar.insertBefore(emptyDiv, bottomBar.firstChild);  }
    }

    const answerBtn = document.createElement('button');
    answerBtn.className = '_ButtonBase_nt2r3_1 _FocusTarget_1nxry_1 _ButtonMd_nt2r3_35 _ButtonBlue_nt2r3_76 _ButtonContained_nt2r3_111';
    answerBtn.id = 'answerBtn';
    answerBtn.tabIndex = 0;

    const buttonContent = document.createElement('div');
    buttonContent.className = '_Content_nt2r3_194';
    buttonContent.innerText = 'Need help?';

    emptyDiv.appendChild(answerBtn);
    answerBtn.appendChild(buttonContent);

    answerBtn.addEventListener('click', () => {
        Upload();
    });
};

const addVersion = () => {
    const versionDiv = document.createElement('div');
    versionDiv.id = 'SparxExt_version';
    versionDiv.innerText = 'SparxExt Lite v1.0.0';
    document.body.appendChild(versionDiv);
};

// --------------Bookworks-------------- //

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.message === "decoded_response") {
        const overlay = document.createElement('div');
        overlay.id = 'sparx-overlay';
        document.body.appendChild(overlay);

        const checkInterval = setInterval(() => {
            const resultContainer = document.querySelector('._ResultContainer_1ylu5_30._Correct_1ylu5_21');
            if (resultContainer) {
                const chipElement = document.querySelector('._Chip_bu06u_1');
                if (chipElement) {
                    const chipText = chipElement.innerText;
                    
                    const url = window.location.href;
                    const packageIdMatch = url.match(/package\/([^/]+)/);
                    const taskMatch = url.match(/task\/(\d+)/);
                    const itemMatch = url.match(/item\/(\d+)/);

                    if (packageIdMatch && taskMatch && itemMatch) {
                        const packageId = packageIdMatch[1];
                        const taskNumber = taskMatch[1];
                        const itemLetter = String.fromCharCode(64 + parseInt(itemMatch[1])).toUpperCase();
                        const bookwork = `${taskNumber}${itemLetter}`;

                        let savedData = JSON.parse(localStorage.getItem('sparxBookworks') || '[]');
                        let packageIndex = savedData.findIndex(p => p.packageid === packageId);
                        
                        if (packageIndex === -1) {
                            savedData.push({
                                packageid: packageId,
                                bookworks: [{
                                    bookwork: bookwork,
                                    answerxml: request.data
                                }]
                            });
                        } else {
                            const bookworkIndex = savedData[packageIndex].bookworks.findIndex(b => b.bookwork === bookwork);
                            if (bookworkIndex === -1) {
                                savedData[packageIndex].bookworks.push({
                                    bookwork: bookwork,
                                    answerxml: request.data
                                });
                            } else {
                                savedData[packageIndex].bookworks[bookworkIndex].answerxml = request.data;
                            }
                        }

                        localStorage.setItem('sparxBookworks', JSON.stringify(savedData));
                        console.log(`${chipText} : ${request.data}`);
                    }
                }

                const existingOverlay = document.getElementById('sparx-overlay');
                if (existingOverlay) { existingOverlay.remove(); }
                clearInterval(checkInterval);
            }
        }, 100);
    }
});

setInterval(() => {
    const dialogTitle = document.querySelector('[class^="_WACContainer_"] > [class^="_DialogTitle_"]');
    if (dialogTitle) {
        const bookworkElement = document.querySelector('[class*="_Bookwork_"]');
        if (bookworkElement) {
            const bookworkText = bookworkElement.innerText;
            const bookworkCode = bookworkText.replace('Bookwork ', '');

            const url = window.location.href;
            const packageIdMatch = url.match(/package\/([^/]+)/);
            
            if (packageIdMatch) {
                const packageId = packageIdMatch[1];
                const savedData = JSON.parse(localStorage.getItem('sparxBookworks') || '[]');
                const package = savedData.find(p => p.packageid === packageId);
                const bookwork = package.bookworks.find(b => b.bookwork === bookworkCode);
                
                if (bookwork) {
                    const targetElements = document.querySelectorAll('[data-test-target]');
                    targetElements.forEach(element => {
                        const encodedTarget = element.getAttribute('data-test-target');
                        const decodedTarget = atob(encodedTarget);
                        
                        if (decodedTarget === bookwork.answerxml) {
                            element.click();
                            const buttonElement = document.querySelector('[class*="_ButtonContained_"]');
                            if (buttonElement) {  buttonElement.click();  }
                            setTimeout(() => {
                                const buttonElement = document.querySelector('[class*="_ButtonContained_"]');
                                if (buttonElement) {  buttonElement.click();  }
                            }, 500);
                        }
                    });
                }
            }
        }
    }
}, 250);

// --------------Loops-------------- //

setInterval(() => {
    if (document.querySelector('[class^="_QuestionInfo_"][class$="_1"]') && !document.getElementById('answerBtn')) addAnswerBtn();
    if (!document.getElementById('SparxExt_version')) { addVersion();  }
}, 300);