// Main_F.js

import { loadGlobalTags, openTagPopup, openTagSelectionPopup } from "./Tags_F.js";
import { loadImages, getSelectedImages  } from "./Images_F.js";

document.addEventListener("DOMContentLoaded", () => {
    console.log("Popup loaded. Running scripts...");

    chrome.runtime.sendMessage({ action: "loadImages" });

    loadImages();
    loadGlobalTags();

    let createTagBtn = document.getElementById("create-tag-btn");
    if (createTagBtn) {
        createTagBtn.replaceWith(createTagBtn.cloneNode(true));
        createTagBtn = document.getElementById("create-tag-btn");
        createTagBtn.addEventListener("click", openTagPopup);
    } 
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log("Message received in Main:", message);

    if (message.action === "openTagSelectionPopup") {
        /*
        console.log("Opening Tag Selection Popup for:", message.imageUrl);
        openTagSelectionPopup(message.imageUrl);
        sendResponse({ status: "Popup opened" });*/

        const selected = getSelectedImages();
        console.log("Opening Tag Selection Popup for Selected:", selected);

        if (selected.length > 1) {
            openTagSelectionPopup(selected);
        } else {
            openTagSelectionPopup([message.imageUrl]);
        }
        sendResponse({status: "Popup opened"});
    }

    // refresh
    else if (message.action === "refreshImages") {
        console.log("Refreshing images...");
        loadImages();
    }
});

document.getElementById("sync-btn").addEventListener("click", () => {
    chrome.runtime.sendMessage({ action: "syncData" });
});

