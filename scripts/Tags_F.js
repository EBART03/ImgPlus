// Tags.js - Handles tag storage and manipulation

// function for adding tags to images
export function addTagToImage(url, tags) {
    if (!tags || tags.length === 0) {
        return;
    }

    chrome.storage.local.get({ storageData: { savedImages: [], globalTags: [] } }, (data) => {
        let storage  = data.storageData;
        let images = storage.savedImages;
        let storedTags = data.globalTags;

        let image = images.find(img => img.url === url);

        if (image) {
            tags.forEach(tag => {
                // normalize tag by converting to lowercase and replacing spaces with underscores
                let normalizedTag = tag.toLowerCase().replace(/\s+/g, '_');

                if (!image.tags.includes(normalizedTag)) {
                    image.tags.push(normalizedTag);
                    let existingTag = storedTags.find(t => t.tag === normalizedTag);
                    
                    if (existingTag) {
                        existingTag.count+= 1;
                    } else {
                        storedTags.push({ tag: normalizedTag, count: 1 });
                    }
                }
            });

            // store updated images and tags
            chrome.storage.local.set({ storageData: { savedImages: images, globalTags: storedTags } }, () => {
                console.log("Tags added to image and saved globally:", storedTags);
            });
        }
    });
}

// function to remove tag from images
export function removeTagFromImage(url, tag) {
    let normalizedTag = tag.toLowerCase().replace(/\s+/g, '_');

    chrome.storage.local.get({ storageData: { savedImages: [], globalTags: [] } }, (data) => {
        let storage = data.storageData;
        let images = storage.savedImages;
        let storedTags = storage.globalTags;
        let image = images.find(img => img.url === url);

        if (image) {
            image.tags = image.tags.filter(t => t !== normalizedTag);

            // decrement count
            let tagEntry = storedTags.find(t => t.tag === normalizedTag);
            if (tagEntry) {
                tagEntry.count = Math.max(0, tagEntry.count - 1);
            }

            img.tags.forEach(tag => {
                updatedTagCounts.set(tag, (updatedTagCounts.get(tag) || 0) + 1);
            });

            chrome.storage.local.set({ storageData: { savedImages: images, globalTags: storedTags } }, () => {
                console.log("Tag removed and global tag count updated:", storedTags);
            });
        }
    });
}

// Opens the tag creation popup
export function openTagPopup() {
    let popup = document.getElementById("tag-popup");
    
    // stops popup from opening multiple times
    if (!popup) {
        console.error("Popup element not found."); // debug
        return;
    }

    // ensure only one popup at a time
    if (popup.classList.contains("visible")) {
        console.warn("Popup is already open."); // debug
        return;
    }

    console.log("Opening tag creation popup..."); // debug
    popup.style.display = "block";
    popup.classList.add("visible");

    let newTagInput = document.getElementById("new-tag-input");
    let addTagBtn = document.getElementById("add-tag-btn");
    let cancelTagBtn = document.getElementById("cancel-tag-btn");

    if (!newTagInput || !addTagBtn || !cancelTagBtn) {
        console.error("One or more elements inside the tag popup are missing.");
        return;
    }
    
    newTagInput.focus();

    cancelTagBtn.onclick = () => {
        console.log("Closing tag popup..."); // debug
        popup.classList.remove("visible");
        newTagInput.value = "";
    };

    cancelTagBtn.onclick = () => {
        console.log("Closing tag popup..."); // debug
        popup.classList.remove("visible");
        popup.style.display = "none";
        newTagInput.value = "";
    };

    addTagBtn.onclick = () => {
        let newTag = newTagInput.value.trim();
        if (!newTag) {
            console.warn("No tag entered.");
            return;
        }

        let normalizedTag = newTag.toLowerCase().replace(/\s+/g, '_');
        console.log("Adding new tag:", normalizedTag);

        // Save to chrome.storage.local
        chrome.storage.local.get({ storageData: { savedImages: [], globalTags: [] } }, (data) => {
            let storedTags = data.storageData.globalTags;

            if (!storedTags.some(t => t.tag === normalizedTag)) {
                storedTags.push({ tag: normalizedTag, count: 0 });
                chrome.storage.local.set({ storageData: { savedImages: data.storageData.savedImages, globalTags: storedTags } }, () => {
                    console.log("Tag added to global tags:", normalizedTag);
                });
            }
        });

        newTagInput.value = "";
        popup.classList.remove("visible");
        popup.style.display = "none";
    }

    // Ensure only one event listener exists
    document.removeEventListener("click", closePopupOnOutsideClick);
    document.addEventListener("click", closePopupOnOutsideClick, {once: true} );

    // pressing enter
    newTagInput.addEventListener("keydown", function(event) {
        if (event.key === "Enter" && newTagInput.value.trim() !== "") {
            addTagBtn.click();
            event.preventDefault();
        }
    });
}

// function to close popup on outside click
function closePopupOnOutsideClick(event) {
    let popup = document.getElementById("tag-popup");
    if (popup && popup.classList.contains("visible")) {
        if (!popup.contains(event.target) && event.target.id !== "create-tag-btn") {
            console.log("❌ Clicked outside, closing popup...");
            popup.classList.remove("visible");
            document.removeEventListener("click", closePopupOnOutsideClick);
        }
    }
}

// load global tags
export function loadGlobalTags(callback) {
    chrome.storage.local.get({ storageData: { savedImages: [], globalTags: [] } }, (data) => {
        if (typeof callback === "function") {
            callback("Loaded global tags:", data.storageData.globalTags);
        }
    });
}

// Tag selection functions
export function openTagSelectionPopup(imageUrls) {
    console.log("🚀 Opening Tag Selection Popup for:", imageUrls);

    let existingPopup = document.getElementById("tag-selection-popup");
    if (existingPopup) existingPopup.remove();

    let popup = document.createElement("div");
    popup.id = "tag-selection-popup";
    popup.classList.add("tag-popup");

    let title = document.createElement("h3");
    title.textContent = "Select Tags";
    popup.appendChild(title);

    let searchInput = document.createElement("input");
    searchInput.type = "text";
    searchInput.id = "tag-search-bar";
    searchInput.placeholder = "Search tags...";
    popup.appendChild(searchInput);

    let tagList = document.createElement("div");
    tagList.classList.add("tag-list");
    popup.appendChild(tagList);

    let applyButton = document.createElement("button");
    applyButton.textContent = "Apply";
    applyButton.classList.add("apply-btn");

    let closeButton = document.createElement("button");
    closeButton.textContent = "Cancel";
    closeButton.classList.add("close-btn");
    closeButton.onclick = () => popup.remove();

    // load current local storage
    chrome.storage.local.get({ storageData: { savedImages: [], globalTags: [] } }, (data) => {
        let tags = data.storageData.globalTags;
        let images = data.storageData.savedImages;

        // matches selected images
        const selectedImages = images.filter(img => imageUrls.includes(img.url));

        let isMultiSelect = imageUrls.length > 1;
        console.log("Selected images:", selectedImages.map(i => i.url)); // debug

        function updateTagList(filter = "") {
            tagList.innerHTML = "";

            let filteredTags = tags.filter(tagObj =>
                tagObj.tag.toLowerCase().includes(filter.toLowerCase())
            );

            if (filteredTags.length === 0) {
                tagList.innerHTML = "<p>No matching tags found.</p>";
                return;
            }

            filteredTags.forEach(tagObj => {
                let normalizedTag = tagObj.tag.toLowerCase().replace(/\s+/g, '_');

                let tagWrapper = document.createElement("div");
                tagWrapper.classList.add("tag-item");

                let checkbox = document.createElement("input");
                checkbox.type = "checkbox";
                checkbox.value = normalizedTag;
                checkbox.id = `tag-${normalizedTag}`;

                if (!isMultiSelect) {
                    const image = selectedImages[0];
                    checkbox.checked = image.tags.includes(normalizedTag);
                } else {
                    const allHaveTag = selectedImages.every(img => img.tags.includes(normalizedTag));
                    checkbox.checked = allHaveTag;
                }

                let label = document.createElement("label");
                label.htmlFor = `tag-${normalizedTag}`;
                label.textContent = `#${normalizedTag}`;

                tagWrapper.appendChild(checkbox);
                tagWrapper.appendChild(label);
                tagList.appendChild(tagWrapper);
            });
        }

        updateTagList();
        searchInput.addEventListener("input", () => updateTagList(searchInput.value));

        applyButton.onclick = () => {
            const checkedTags = Array.from(tagList.querySelectorAll("input[type='checkbox']"))
                .map(input => ({
                    tag: input.value.toLowerCase().replace(/\s+/g, '_'),
                    checked: input.checked
                }));

            selectedImages.forEach(image => {
                checkedTags.forEach(({ tag, checked }) => {
                    const hasTag = image.tags.includes(tag);

                    if (checked && !hasTag) {
                        image.tags.push(tag);
                        const tagEntry = tags.find(t => t.tag === tag);
                        if (tagEntry) {
                            tagEntry.count += 1;
                        } else {
                            tags.push({tag, count: 1});
                        }
                    }

                    if (!checked && hasTag) {
                        image.tags = image.tags.filter(t => t !== tag);
                        const tagEntry = tags.find(t => t.tag === tag);
                        if (tagEntry) {
                            tagEntry.count = Math.max(0, tagEntry.count - 1);
                        }
                    }
                });
            });

            chrome.storage.local.set({
                storageData: {
                    savedImages: images,
                    globalTags: tags,
                }
            }, () => {
                console.log("Tags updated for selected images:", imageUrls);
            });

            popup.remove();
        };
    });

    popup.appendChild(applyButton);
    popup.appendChild(closeButton);
    document.body.appendChild(popup);
}
