// SearchFilter.js - Handles search, filtering, and dropdown logic
import { updateImageGallery } from "./Images_F.js";
import { confirmAction } from "./util.js";

let selectedTags = [];

// ensure dropdown appears when search-bar clicked
export function showDropdown() {
    let dropdown = document.getElementById("tag-dropdown");
    if (!dropdown) {
        return;
    }
        dropdown.classList.add("show");  // ensure dropdown becomes visible
        dropdown.style.display = "block";

        loadGlobalTags(); // load all tags initally
}

// fetch global tags from chrome.storage.local
function loadGlobalTags() {
    chrome.storage.local.get({ storageData: { savedImages: [], globalTags: [] } }, (data) => {
        const updatedTags = updateTagCounts(data.storageData.savedImages, data.storageData.globalTags);
        updateDropdown(updatedTags);
    });
}

// function to update the dropdown with global tags
export function updateDropdown(tags) {
    let dropdown = document.getElementById("tag-dropdown");
    if (!dropdown) {
        console.error("Dropdown not found!");
        return;
    }

    dropdown.innerHTML = "";

    if (tags.length === 0) {
        dropdown.innerHTML = "<div class='dropdown-item'>No matching tags</div>";
    } else {
        tags.forEach(tagObj => {
            let tagWrapper = document.createElement("div");
            tagWrapper.classList.add("dropdown-item");

            let tagText = document.createElement("span");
            tagText.textContent = `${tagObj.tag} (${tagObj.count || 0})`;
            // tagText.textContent = `${tagObj.tag}`
            tagText.style.flex = "1";
            tagWrapper.onclick = () => {
                addTagtoSearch(tagObj.tag);
                dropdown.style.display = "none";
            };

            let deleteBtn = document.createElement("button");
            deleteBtn.textContent = "X";
            deleteBtn.classList.add("delete-tag-btn");
            deleteBtn.style.margiinLeft = "5px";
            deleteBtn.onclick = (event) => {
                event.stopPropagation(); // prevent search selection
                removeTagFromGlobal(tagObj.tag);
            };

            tagWrapper.appendChild(tagText);
            tagWrapper.appendChild(deleteBtn);
            dropdown.appendChild(tagWrapper);
        });
    }
    dropdown.style.display = "block";
}

function updateTagCounts(savedImages, globalTags) {
    const tagMap = {};

    // count how many times each tag appears
    savedImages.forEach(image => {
        image.tags.forEach(tag => {
            if (!tagMap[tag]) {
                tagMap[tag] = 0;
            }
            tagMap[tag]++;
        });
    });

    // update counts in globalTags
    return globalTags.map(tagObj => {
        return {
            ...tagObj,
            count: tagMap[tagObj.tag] || 0
        };
    });
}

async function removeTagFromGlobal(tag) {
    const confirmed = await confirmAction("Are you sure?");

    if (!confirmed) {
        return;
    }
    console.log("Removing tag from global:", tag);

    chrome.storage.local.get({storageData: {savedImages: [], globalTags: [] }, token: null}, (data) => {
        let updatedTags = data.storageData.globalTags.filter(tagObj => tagObj.tag !== tag);
        let updatedImages = data.storageData.savedImages.map(image => {
            return {
                ...image,
                tags: image.tags.filter(t => t !== tag)
            };
        });
        
        chrome.storage.local.set({ storageData: {savedImages: updatedImages, globalTags: updatedTags} }, () => {
            console.log("Tag removed locally:", tag);
            updateDropdown(updatedTags);
            removeTagFromSearch(tag);
        });
        
        // cloud delete
        if (data.token) {
            fetch("http://localhost:3000/api/delete-tag", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${data.token}`
                },
                body: JSON.stringify({ tag: tag })
            })
            .then(res => res.json())
            .then(result => console.log("Cloud delete:", result.message))
            .catch(err => console.error("Cloud delete error:", err));
        }
    });
}

// function to remove tag from search bar
function removeTagFromSearch(tag) {
    selectedTags = selectedTags.filter(t => t !== tag);
    document.getElementById("search-bar").value = selectedTags.join(" ");
    updateImageGallery(selectedTags);
}

// Adds selected tag to search bar
function addTagtoSearch(tag) {
    if (!selectedTags.includes(tag)) {
        selectedTags.push(tag);
    }
    document.getElementById("search-bar").value = selectedTags.join(" ");
    filterImagesByTags();
}

// Filters images based on selected tags
function filterImagesByTags() {
    updateImageGallery(selectedTags);
}

// Filters dropdown list dynamically based on input
export function filterDropdown() {
    let input = document.getElementById("search-bar").value.toLowerCase();
    chrome.storage.local.get({ storageData: { savedImages: [], globalTags: [] } }, (data) => {
        let tags = data.storageData.globalTags.filter(tagObj => tagObj.tag.toLowerCase().includes(input));
        updateDropdown(tags);
    });
}

// refresh function to reset the search
function refreshSearch() {
    location.reload();
}

// listener
// Connect search-bar from display.html
window.onload = () => {
    let searchBar = document.getElementById("search-bar");
    if (searchBar) {
        searchBar.addEventListener("click", showDropdown);
        searchBar.addEventListener("input", filterDropdown);
    }

    document.addEventListener("click", (event) => {
        let dropdown = document.getElementById("tag-dropdown");
        if (dropdown && !dropdown.contains(event.target) && event.target !== searchBar) {
            dropdown.style.display = "none";
        }
    });

    let refreshButton = document.getElementById("refresh-search");
    if (refreshButton) {
        refreshButton.addEventListener("click", refreshSearch);
    }
};
