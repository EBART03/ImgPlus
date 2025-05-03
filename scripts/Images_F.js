// Images_F.js - Handles image storage and manipulation

import { openTagSelectionPopup } from "./Tags_F.js";
import { confirmAction } from "./util.js";

console.log("Running Images_F.js");

let selectedImages = new Set(); // keeps track of selected images
let isShiftPressed = false; // keeps track of shift key state

if (typeof document !== "undefined") {
    document.addEventListener("keydown", (event) => {
        if (event.key === "Shift") {
            isShiftPressed = true;
        }
    });

    document.addEventListener("keyup", (event) => {
        if (event.key === "Shift") {
            isShiftPressed = false;
        }
    });
}

export function saveImage(url) {
    chrome.storage.local.get({ storageData: { savedImages: [], globalTags: [] } }, (data) => {
        let storage = data.storageData;
        let images = storage.savedImages;


        if (!images.find(img => img.url === url)) {
            images.push({ url, tags: [] });
            chrome.storage.local.set({ storageData: { savedImages: images, globalTags: storage.globalTags } }, () => {
                console.log("Image saved:", url);
                console.log("Updated savedImages:", images);
            });
        }
    });
}

export async function deleteImage(url) {
    console.log("Opening popup...");
    const confirmed = await confirmAction("Delete this image?");
    if (!confirmed) {
        return false;
    }

    return new Promise((resolve) => {
        // local deletion
        chrome.storage.local.get(["storageData", "token"], (data) => {
            let storage = data.storageData;
            const token = data.token;
            let newImages = storage.savedImages.filter(img => img.url !== url);

            chrome.storage.local.set({ storageData: 
                { 
                    savedImages: newImages, 
                    globalTags: storage.globalTags } }, () => {
                console.log("Image deleted locally:", url);
                // cloud deletion
            
                if (data.token) {
                    fetch("http://localhost:3000/api/delete-image", {
                            method: "POST",
                            headers: {
                            "Content-Type": "application/json",
                            "Authorization": `Bearer ${data.token}`
                        },
                    body: JSON.stringify({ imageUrl: url })
                })
                .then(async res => {
                    if (!res.ok) {
                        const errorText = await res.text();
                        throw new Error(`Server error (${res.status}): ${errorText}`)
                    }
                    return res.json();
                })
                .then(data => console.log("Cloud delete", data.message))
                .catch(err => console.error("Cloud delete:", err));
            }
            resolve(true);           
        });
        
    });
    
});    

}

export function loadImages() {
    console.log("Fetching saved images from storage...");

    chrome.storage.local.get({ storageData: { savedImages: [], globalTags: [] } }, (data) => {
        let images = data.storageData.savedImages || [];
        console.log("Retrieved saved images:", images);

        let container = document.getElementById("image-gallery");

        if (!container) {
            console.error("Image gallery not found in DOM.");
            return;
        }

        container.innerHTML = ""; // Clear previous images

        if (images.length === 0) {
            console.warn("No images found in storage.");
            container.innerHTML = "<p>No images saved.</p>";
            return;
        }

        images.forEach(image => {
            let galleryItem = document.createElement("div");
            galleryItem.classList.add("gallery-item");

            // Image element
            let imgElement = document.createElement("img");
            imgElement.src = image.url;
            imgElement.classList.add("gallery-image");
            imgElement.alt = "Saved Image";
            imgElement.onerror = () => console.error("Failed to load image:", image.url); // debug

            
            // attach click event to open tag selection popup
            imgElement.addEventListener("click", (event) => {
                if (isShiftPressed) {
                    galleryItem.classList.toggle("selected");

                    if (selectedImages.has(image.url)) {
                        selectedImages.delete(image.url);
                    } else {
                        selectedImages.add(image.url);
                    }
                } else {
                    selectedImages.clear();
                    selectedImages.add(image.url);
                    document.querySelectorAll(".gallery-item").forEach(item => item.classList.remove("selected"));
                    galleryItem.classList.add("selected");
                }
            });

            imgElement.addEventListener("dblclick", (event) => {
                event.preventDefault();

                if (!selectedImages.has(image.url)) {
                    selectedImages.clear();
                    selectedImages.add(image.url);
                }

                const selected = [...selectedImages];
                openTagSelectionPopup(selected);
            });

            // Delete Button
            let deleteBtn = document.createElement("button");
            deleteBtn.classList.add("delete-btn");
            deleteBtn.textContent = "X";
            deleteBtn.onclick = async () => {
                const confirmed = await deleteImage(image.url);
                if (confirmed) {
                    loadImages(); // only remove it confirmed
                }
            };

            // Append elements to gallery item
            galleryItem.appendChild(imgElement);
            galleryItem.appendChild(deleteBtn);
            container.appendChild(galleryItem);
        });

        console.log("Images loaded into popup."); // debug
    });
}

export function getSelectedImages() {
    return [...selectedImages];
}

// Function to update images based on selected tags
export function updateImageGallery(selectedTags) {
    chrome.storage.local.get({ storageData: { savedImages: [], globalTags: [] } }, (data) => {
        let images = data.storageData.savedImages || [];
        let filteredImages = images.filter(image => selectedTags.every(tag => image.tags.includes(tag)));
        
        let container = document.getElementById("image-gallery");
        if (!container) return;
        
        container.innerHTML = "";
        if (filteredImages.length === 0) {
            container.innerHTML = "<p>No images match selected tags.</p>";
            return;
        }

        filteredImages.forEach(image => {
            let galleryItem = document.createElement("div");
            galleryItem.classList.add("gallery-item");

            let imgElement = document.createElement("img");
            imgElement.src = image.url;
            imgElement.classList.add("gallery-image");
            imgElement.alt = "Filtered Image";

            imgElement.addEventListener("dblclick", (event) => {
                event.preventDefault();

                if (selectedImages.size > 1 && isShiftPressed) {
                    openTagSelectionPopup([...selectedImages]);
                } else {
                    selectedImages.clear();
                    selectedImages.add(image.url);
                    openTagSelectionPopup([image.url]);
                }
            });

            let deleteBtn = document.createElement("button");
            deleteBtn.classList.add("delete-btn");
            deleteBtn.textContent = "X";
            
            deleteBtn.onclick = async () => {
                const confirmed = await deleteImage(image.url);
                if (confirmed) {
                    loadImages(); // only remove it confirmed
                }
            };

            galleryItem.appendChild(imgElement);
            galleryItem.appendChild(deleteBtn);
            container.appendChild(galleryItem);
        });
    });
}

// deselect all images if click outside

if (typeof document !== "undefined") {
    document.addEventListener("click", (event) => {
        const gallery = document.getElementById("image-gallery");
        if (!gallery) {
            return;
        }
    
        const clickedInsideGallery = gallery.contains(event.target);
        const clickedPopup = event.target.closest(".tag-popup");
    
        if (!clickedInsideGallery && !clickedPopup) {
            selectedImages.clear(); // clear selected images
            document.querySelectorAll(".gallery-item.selected").forEach(item => {
                item.classList.remove("selected");
            });
        }
    });
}
