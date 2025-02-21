const waitForImages = (element) => {
    const images = element.querySelectorAll('img');
    return Promise.all(Array.from(images).map(img => {
        return img.complete ? Promise.resolve() : new Promise((resolve, reject) => {
            img.onload = resolve;
            img.onerror = reject;
        });
    }));
};

const dataUrlToBlob = (dataUrl) => {
    const [header, base64] = dataUrl.split(';base64,');
    const byteString = atob(base64);
    const mimeString = header.split(':')[1];
    const arrayBuffer = new ArrayBuffer(byteString.length);
    const intArray = new Uint8Array(arrayBuffer);
    for (let i = 0; i < byteString.length; i++) {
        intArray[i] = byteString.charCodeAt(i);
    }
    return new Blob([arrayBuffer], { type: mimeString });
};

function checkAndWrapImageUrl(url) {
    if (url.startsWith("https://")) {
        return `<img src="${url}" alt="Image" />`;
    } else {
        return url;
    }
}

const clickAnswerBtn = () => {
    const answerButton = Array.from(document.querySelectorAll('div[class^="_Content_"]')).find(el => el.innerText.includes('Answer'));
    if (answerButton) {  answerButton.click();  }
};

const startStopwatch = (cardData) => {
    cardData.elapsedSeconds = 0;
    cardData.timerInterval = setInterval(() => {
        cardData.elapsedSeconds += 0.0075;
        document.getElementById('stopwatch').innerText = cardData.elapsedSeconds.toFixed(1) + 's';
    }, 10);
};

const dragElement = (element, handle) => {
    let posX = 0, posY = 0, currentX = 0, currentY = 0;

    const onMouseDown = (e) => {
        // Prevent dragging when clicking on the close button
        if (e.target.id.endsWith('_closeAnswerCard')) {
            return;
        }
        e.preventDefault();
        currentX = e.clientX;
        currentY = e.clientY;
        document.addEventListener('mousemove', elementDrag);
        document.addEventListener('mouseup', stopDragElement);
    };

    const elementDrag = (e) => {
        e.preventDefault();
        posX = currentX - e.clientX;
        posY = currentY - e.clientY;
        currentX = e.clientX;
        currentY = e.clientY;
        element.style.top = (element.offsetTop - posY) + "px";
        element.style.left = (element.offsetLeft - posX) + "px";
    };

    const stopDragElement = () => {
        document.removeEventListener('mousemove', elementDrag);
        document.removeEventListener('mouseup', stopDragElement);
    };

    handle.addEventListener('mousedown', onMouseDown);
};