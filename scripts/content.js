// content.js - Handles messages from background.js
// handles sidebar functions and features

import { openTagSelectionPopup, loadGlobalTags } from "./Tags_F.js"; // Ensure correct import
import {importImageFile, importJSON, sanitizeJSON} from "./importLogic.js"
import {updateImageGallery, getSelectedImages} from "./Images_F.js";

console.log("Content script loaded and ready to receive messages.");

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log("Message received in content.js:", message);

    if (message.action === "saveImage") {
        console.log("Saving image:", message.imageUrl);
        saveImageLocally(message.imageUrl);
        sendResponse({ status: "Image saved" });

    } else if (message.action === "addTagToImage") {
        console.log("Opening tag selection popup for:", message.imageUrl);
        openTagSelectionPopup(message.imageUrl);

    } else if (message.type === "OPEN_TAG_SELECTION_POPUP") {
        console.log("Opening tag selection popup from context menu for:", message.imageUrl);
        openTagSelectionPopup([message.imageUrl]);
    }
});

document.addEventListener("DOMContentLoaded", () => {
    // sidebar handler
    let sidebarToggle = document.getElementById("sidebar-toggle");
    let sidebar = document.getElementById("sidebar");

    if (sidebarToggle && sidebar) {
        sidebarToggle.addEventListener("click", function(event) {
            sidebar.classList.toggle("open");
            event.stopPropagation(); // Prevents triggering document click
        });

        // Close sidebar when clicking outside of it
        document.addEventListener("click", function(event) {
            if (!sidebar.contains(event.target) && !sidebarToggle.contains(event.target)) {
                sidebar.classList.remove("open");
            }
        });
    } else {
        console.error("Sidebar or toggle button not found in DOM.");
    }

    // analytics dropdown handler
    const analyticsBtn = document.getElementById("analytics-btn");
    const analyticsDropdown = document.getElementById("analytics-dropdown");
    const imageCountEl = document.getElementById("imageCount");
    const tagCountEl = document.getElementById("tagCount");

    analyticsBtn.addEventListener("click", () => {
        if (analyticsDropdown.style.display === "none") {
            chrome.storage.local.get({ storageData: { savedImages: [], globalTags: [] } }, (data) => {
                const images = data.storageData.savedImages || [];
                const tags = data.storageData.globalTags || [];

                imageCountEl.innerHTML = `<strong>Images:</strong> ${images.length}`;
                tagCountEl.innerHTML = `<strong>Tags:</strong> ${tags.length}`;
                analyticsDropdown.style.display = "block";
            });
        } else {
            analyticsDropdown.style.display = "none";
        }
    });

    // instructions dropdown handler
    const instructionsBtn = document.getElementById("instructions-btn");
    const instructionsDropdown = document.getElementById("instructions-dropdown");

    instructionsBtn.addEventListener("click", () => {
        if (instructionsDropdown.style.display === "none") {
            instructionsDropdown.style.display = "block";
        } else {
            instructionsDropdown.style.display = "none";
        }
    });

    // import button handler
    const importBtn = document.getElementById("import-btn");
    const importFileInput = document.getElementById("importFile");

    importBtn.addEventListener("click", () => {
        importFileInput.click();
    });

    importFileInput.addEventListener("change", async (event) => {
        const files = event.target.files;
        if (!files || files.length === 0) {
            return;
        }

        for (let file of files) {
            if (file.type === "application/json") {
                const text = await file.text();
                try {
                    const cleanText = sanitizeJSON(text);
                    const json = JSON.parse(cleanText);
                    if (!json.globalTags || !json.savedImages) {
                        alert("File not supported.");
                        continue;
                    }
                    importJSON(json);
                } catch (e) {
                    alert("Invalid JSON file.");
                }
            } else if (file.type.startsWith("image/")) {
                const reader = new FileReader();
                reader.onload = function (e) {
                    const imageUrl = e.target.result;
                    importImageFile(imageUrl);
                };
                reader.readAsDataURL(file);
            } else {
                alert(`Unsupported file type: ${file.name}`);
            }
        }
        updateImageGallery("");
        loadGlobalTags();
        importFileInput.value = '';
    });

    // extension actions
    const popoutBtn = document.getElementById("popout-btn");
    const openTabBtn = document.getElementById("open-tab-btn");

    // for the popout
    if (popoutBtn) {
        popoutBtn.addEventListener("click", () => {
            chrome.windows.create({
                url: chrome.runtime.getURL("./popup/display.html"),
                type: "popup",
                width: 400,
                height: 600
            });
        });
    }

    if (openTabBtn) {
        openTabBtn.addEventListener("click", () => {
            chrome.tabs.create({
                url: chrome.runtime.getURL("./popup/display.html")
            });
        });
    }
});

document.getElementById("export-btn").addEventListener("click", () => {
    console.log("Sending export request..."); // debug
    chrome.runtime.sendMessage({ action: "exportData"});
});