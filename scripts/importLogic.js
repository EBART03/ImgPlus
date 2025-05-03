// importLogic.js - logic for importing

// function for implementing JSON data
export function importJSON(importedData) {
    chrome.storage.local.get({ storageData: { savedImages: [], globalTags: [] } }, (data) => {
        const current = data.storageData;

        // merge globalTags by tag string
        importedData.globalTags.forEach(importedTag => {
            const exists = current.globalTags.some(existing => existing.tag === importedTag.tag);
            if (!exists) {
                current.globalTags.push(importedTag);
            }
        });

        // deduplicate globalTags by tag string
        const seen = new Set();
        current.globalTags = current.globalTags.filter(tag => {
            if (seen.has(tag.tag)) return false;
            seen.add(tag.tag);
            return true;
        });

        // merge savedImages
        importedData.savedImages.forEach(importedImg => {
            let existing = current.savedImages.find(i => i.url === importedImg.url);
            if (!existing) {
                current.savedImages.push(importedImg);
            } else {
                importedImg.tags.forEach(tag => {
                    if (!existing.tags.includes(tag)) {
                        existing.tags.push(tag);
                    }
                });
            }
        });

        chrome.storage.local.set({ storageData: current }, () => {
            console.log("Data imported successfully.");
            alert("Import complete.");
        });
    });
}


// function for implementing images
export function importImageFile(imageUrl) {
    chrome.storage.local.get({ storageData: { savedImages: [], globalTags: [] } }, (data) => {
        const current = data.storageData;

        const existing  = current.savedImages.some(i => i.url === imageUrl);
        if (!existing) {
            current.savedImages.push({ url: imageUrl, tags:[]});
            chrome.storage.local.set({storageData: current}, () => {
                console.log("Image imported", imageUrl);
            });
        } else {
            console.log("Image already exists!!! Image:", imageUrl);
        }
    });
}

// clean json before parsing
export function sanitizeJSON(jsonString) {
    return jsonString
        .replace(/,\s*}/g,'}').replace(/,\s*]/g, ']');
}