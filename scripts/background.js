import { saveImage } from "./Images_F.js"; // Ensure correct import

chrome.runtime.onInstalled.addListener(() => {
    console.log("Extension Installed & Background Script Running");
    // Create context menu options
    chrome.contextMenus.create({
        id: "saveImage",
        title: "Save Image in ImagePlus",
        contexts: ["image"]
    });

    chrome.contextMenus.create({
        id: "addTagToImage",
        title: "Add Tag to Image",
        contexts: ["image"]
    });

    console.log("Context menus registered.");
});

// Listen for context menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
    console.log("Context menu clicked:", info);

    if (!info.srcUrl) {
        console.warn("No image URL detected.");
        return;
    }

    if (info.menuItemId === "saveImage") {
        console.log("'Save Image' clicked, saving:", info.srcUrl);
        saveImage(info.srcUrl);
    }

    if (info.menuItemId === "addTagToImage") {
        console.log("'Add Tag to Image' clicked, sending request to open tag selection popup for:", info.srcUrl);
        
        chrome.runtime.sendMessage({
                type: "OPEN_TAG_SELECTION_POPUP",
                fallbackImageUrl: info.srcUrl
                // imageUrl: info.srcUrl
            });
    }    
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "saveImage") {
        console.log("Background received image:", message.imageUrl);
        
        chrome.storage.local.get({ storageData: { savedImages: [], globalTags: [] } }, (data) => {
            let storage = data.storageData;
            let images = storage.savedImages;

            if (!images.find(img => img.url === message.imageUrl)) {
                images.push({ url: message.imageUrl, tags: [] });
                chrome.storage.local.set({ storageData: { savedImages: images, globalTags: storage.globalTags } }, () => {
                    console.log("Image saved:", message.imageUrl);
                });
            }
        });

    } else if (message.action === "exportData") {
        chrome.storage.local.get({ token: null }, async (data) => {
            const token = data.token;

            if (token) {
                try {
                    const res = await fetch("http://localhost:3000/api/fetch-storage", {
                        method: "GET",
                        headers: {
                            "Authorization": `Bearer ${token}`,
                        }
                    });

                    if (res.ok) {
                        const result = await res.json();
                        const cleaned = {
                            savedImages: result.savedImages || [],
                            globalTags: result.globalTags || []
                        };

                        const blob = new Blob([JSON.stringify(cleaned, null, 2)], { type: "application/json" });
                        const reader = new FileReader();
                        reader.onload = function () {
                            chrome.downloads.download({
                                url: reader.result,
                                filename: "ImagePlus_Export.json",
                                saveAs: false
                            }, () => console.log("Database JSON downloaded."));
                        };
                        reader.readAsDataURL(blob);
                        return;
                    } 
                } catch (err) {
                    console.error("Cloud fetch error:", err);
                }
            }

            // Local export
            chrome.storage.local.get({ storageData: { savedImages: [], globalTags: [] } }, (localData) => {
                 const blob = new Blob([JSON.stringify(localData.storageData, null, 2)], { type: "application/json" });
                 const reader = new FileReader();

                 reader.onload = () => {
                    chrome.downloads.download({
                        url: reader.result,
                        filename: "ImagePlus_Export.json",
                        saveAs: true
                    }, () => console.log("Local JSON downloaded."));    
                };
                reader.readAsDataURL(blob);
            });
        });
    } else if (message.action === "syncData") {
        chrome.storage.local.get(["token", "storageData"], async ({ token, storageData}) => {
            if (!token) {
                console.error("No token found.");
                return;
            }

            try {
                const res = await fetch("http://localhost:3000/api/fetch-storage", {
                    method: "GET",
                    headers: {
                        "Authorization": `Bearer ${token}`,
                    }
                });

                // first-time sync
                if (res.status === 404) {
                    console.warn("No cloud data found. Uploading local data.");

                    if (storageData && (storageData.savedImages.length > 0 || storageData.globalTags.length > 0)) {
                        fetch("http://localhost:3000/api/upload-storage", {
                            method: "POST",
                            headers: {
                                "Content-Type": "application/json",
                                "Authorization": `Bearer ${token}`
                            },
                            body: JSON.stringify(storageData)
                        })
                        .then(async (response) => {
                            const msg = await response.text();
                            console.log("Initial upload complete:", msg); // debug
                            chrome.runtime.sendMessage({ action: "refreshImages" });
                        })
                        .catch((error) => {
                            console.error("Upload error:", error);
                        });
                    } else {
                        console.warn("No local data to sync with cloud.");
                    }

                    return; // skip
                }
           
                // merge cloud and local
                const cloudData = await res.json();
                const cloudImages = Array.isArray(cloudData.savedImages) ? cloudData.savedImages : [];
                const cloudTags = Array.isArray(cloudData.globalTags) ? cloudData.globalTags : [];

                const merged = {
                    savedImages: [...(storageData?.savedImages || [])],
                    globalTags: [...(storageData?.globalTags || [])]
                };

                // merge global tags
                cloudTags.forEach(cloudTag => {
                    if (!merged.globalTags.some(localTag => localTag.tag === cloudTag.tag)) {
                        merged.globalTags.push(cloudTag);
                    }
                });

                cloudImages.forEach(cloudImage => {
                    const match = merged.savedImages.find(localImage => localImage.url === cloudImage.url);
                    if (!match) {
                        merged.savedImages.push(cloudImage);
                    } else {
                        cloudImage.tags.forEach(tag => {
                            if (!match.tags.includes(tag)) {
                                match.tags.push(tag);
                            }
                        });
                    }
                });

                console.log("Cloud Images:", cloudImages.length); // debug
                console.log("Local Images:", storageData?.savedImages?.length || 0); // debug
                console.log("Merged Images:", merged.savedImages.length); // debug

                // Save to local storage
                chrome.storage.local.set({ storageData: merged }, async () => {
                    console.log("Local Data updated. Uploading to cloud...");

                    // upload to cloud
                    fetch("http://localhost:3000/api/upload-storage", {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            "Authorization": `Bearer ${token}`
                        },
                        body: JSON.stringify(merged)
                    })
                    .then(async (response) => {
                        const msg = await response.text();
                        console.log("Upload complete:", msg);
                        chrome.runtime.sendMessage( { action: "refreshImages " });
                    })
                    .catch((error) => {
                        console.error("Upload error:", error);
                    });
                });
            } catch (error) {
                console.error("Sync Error:", error);
            }
        });
    }
});

// Image Selection Listener
// Shortcut
chrome.commands.onCommand.addListener((command) => {
    console.log("Executing script."); // debug

    if (command === "activate-image-selection") {
        console.log("Executing Image Selection Script"); // debug
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    
            if (tabs[0]) {
                const tabId = tabs[0].id;

                chrome.scripting.insertCSS({
                    target: {tabId},
                    files: ["popup/styles/base.css"]
                }, () => {
                    chrome.scripting.executeScript({
                        target: {tabId},
                        files: ["scripts/imageSelection.js"]
                    }).then(() => {
                        console.log("imageSelection.js injected successfully."); // debug
                       
                        chrome.scripting.executeScript({
                            target: {tabId},
                            func: () => {
                                if (window.initImageSelection) {
                                    console.log("Calling initImageSelection()");
                                    window.initImageSelection();
                                } else {
                                    console.error("IS not found!");
                                }
                            }
                        });
                    }).catch((error) =>{
                        console.error("Failed to inject imageSelection.js", error); 
                    });
                });
            }
        });
    }
});