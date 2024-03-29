const worker = new Worker('background.js');

document.addEventListener('DOMContentLoaded', function () {
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        const currentTabUrl = tabs[0].url;
        if (!isSupportedWebsite(currentTabUrl)) {
            console.log("Extension is active only on Medium or DEV.to!");
            disableGenerateButton();
        }
    });
});

document.getElementById('generate-button').addEventListener('click', function (e) {
    e.stopPropagation();
    chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        const currentTabUrl = tabs[0].url;
        displaySkeletonLoaders();
        const url = `https://us-central1-articletoposts.cloudfunctions.net/article-to-posts?url=${currentTabUrl}`;
        worker.postMessage({ url: url });
    });
});

worker.addEventListener('message', function (event) {
    const data = event.data;
    const loaderContainer = document.getElementById('loader-container');
    if (data.error) {
        displayErrorMessage(loaderContainer);
    } else if (data) {
        removeSkeletonLoaders(loaderContainer);
        displayPosts(data);
        attachClickEvent();
    }
});

function isSupportedWebsite(url) {
    return /https:\/\/(www\.)?medium\.com\//.test(url) || url.startsWith("https://dev.to/");
}

function disableGenerateButton() {
    const generateButton = document.getElementById('generate-button');
    if (generateButton) {
        generateButton.disabled = true;
        generateButton.textContent = "⚠️ Supports only Medium and Dev.to";
    }
}

function displaySkeletonLoaders() {
    const loaderContainer = document.getElementById('loader-container');
    for (let i = 0; i < 2; i++) {
        const skeleton = document.createElement('div');
        skeleton.classList.add('skeleton');
        skeleton.innerHTML = `
            <div class="skeleton-header"></div>
            <div class="skeleton-content"></div>
            <div class="skeleton-content"></div>
            <div class="skeleton-content"></div>
        `;
        loaderContainer.appendChild(skeleton);
    }
}

function removeSkeletonLoaders(loaderContainer) {
    loaderContainer.innerHTML = '';
}

function displayErrorMessage(loaderContainer) {
    loaderContainer.innerHTML = '<p class="error-message">⚠️ Error while fetching data 😞 <br/> Make sure you are on a Medium or DEV.to article and try again.</p>';
}

function displayPosts(data) {
    const container = document.getElementById('dynamic-container');
    data.forEach((item, index) => {
        const card = createPostCard(item, index);
        container.appendChild(card);
    });
}

function createPostCard(item, index) {
    const card = document.createElement('div');
    card.classList.add('post');

    const header = document.createElement('div');
    header.classList.add('post-header');

    const span = document.createElement('span');
    span.classList.add('post-user');
    span.textContent = `Post ${index + 1}`;

    const button = document.createElement('button');
    button.classList.add('copy-button');
    button.setAttribute('data-post-id', `textBlock${index}`);
    button.textContent = '📋';

    const content = document.createElement('div');
    content.classList.add('post-content');
    content.innerHTML = item.replace(/\n/g, '<br>');
    content.id = `textBlock${index}`;

    header.appendChild(span);
    header.appendChild(button);

    card.appendChild(header);
    card.appendChild(content);

    return card;
}

function attachClickEvent() {
    document.querySelectorAll('.copy-button').forEach(button => {
        button.addEventListener('click', function (e) {
            e.stopPropagation();
            if (e.target && e.target.classList.contains('copy-button')) {
                const postId = e.target.getAttribute('data-post-id');
                const postContent = document.getElementById(postId).innerText;
                copyTextToClipboard(postContent, e.target);
            }
        });
    });
}

function copyTextToClipboard(text, button) {
    navigator.clipboard.writeText(text).then(() => {
        console.log('Text copied to clipboard');
        const originalText = button.textContent;
        button.textContent = '✅';
        setTimeout(() => {
            button.textContent = originalText;
        }, 1000);
    }).catch(err => {
        console.error('Failed to copy text: ', err);
    });
}
