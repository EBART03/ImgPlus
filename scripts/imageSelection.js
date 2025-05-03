// imageSelection.js - used for faster image selection within the browser
// repurposed code from xieby1's "FullscreenEverything"
// https://github.com/FullscreenEverything/FullscreenEverything/blob/main/fe.js

// ensure listeners are removed if set
// fixed previous bug

window.initImageSelection = function () {
    
    if (window.selecting && window.selectionActive) {
        console.log("Selection already active. Skipping.");
        return;
    }

    console.log("initImageSelectiion loaded.");
    console.log("Previous selectionActive:", window.selectionActive); // debug


    // cleans prior handlers
    if (window.selectionActive) {
        console.log("Removing listeners"); // debug
        document.removeEventListener("mouseover", window.iPmouseOver);
        document.removeEventListener("mouseout", window.iPmouseOut);
        document.removeEventListener("click", window.iPclick);
        document.removeEventListener("keydown", window.iPkeydown);
    }

    // variable sets
    // marks script as active and resets
    window.selectionActive = true;
    window.selecting = true;
    window.currentHover = null;

    // injection of CSS
    const cssPath = chrome.runtime.getURL("popup/styles/base.css");
    if (!document.querySelector(`link[href="${cssPath}"]`)) {
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.type = "text/css";
        link.href = cssPath;
        document.head.appendChild(link);   
        console.log("Injected base.css"); // debug
    } else {
        console.log("base.css already present"); // debug
    }

    window.iPmouseOver = window.iPmouseOver || function (event) {
        if (!window.selecting) {
            return;
        }

        const img = event.target.closest("img");
        if (img && img.src) {
            console.log("Hovered image:", event.target); // debug
            if (window.currentHover && window.currentHover !== img) {
                window.currentHover.classList.remove("ImageSelection_Hover");
            } 
            window.currentHover = event.target;
            img.classList.add("ImageSelection_Hover");
        }
    };

    window.iPmouseOut = window.iPmouseOut || function (event) {
        // console.log("mouseOut triggered"); // debug
        if (window.selecting || !window.currentHover) {
            return;
        }

        const related = event.relatedTarget;
        if (!related || !related.closest("img")) {
            window.currentHover.classList.remove("ImageSelection_Hover");
            window.currentHover = null;
        }
        // console.log("mouseOut ended"); // debug
    };

    window.iPclick = window.iPclick || function (event) {
        console.log("click Triggered"); // debug
        if (!window.selecting) {
            return;
        }

        event.preventDefault();
        event.stopPropagation();

        console.log("Image clicked."); // debug
        window.selecting = false;

        const img = event.target.closest("img");

        if (img && img.src) {
            chrome.runtime.sendMessage({
                action: "saveImage",
                imageUrl: img.src
            });  
            console.log("Saved image", img.src);
        }
        if (window.currentHover) {
            window.currentHover.classList.remove("ImageSelection_Hover");
        }
        iPcleanup();
    };

    window.iPkeydown = window.iPkeydown || function (event) {
        console.log("keydown triggered");
        if (event.key === "Escape" && window.selecting) {
            console.log("Escape pressed."); // debug
            window.selecting = false;
            if (window.currentHover) {
                window.currentHover.classList.remove("ImageSelection_Hover");
            }
            iPcleanup();
        }
    };

    // function to cleanup the attributes and listeners
    function iPcleanup() {
        console.log("Cleaning listeners"); // debug
        document.removeEventListener("mouseover", window.iPmouseOver);
        document.removeEventListener("mouseout", window.iPmouseOut);
        document.removeEventListener("click", window.iPclick);
        document.removeEventListener("keydown", window.iPkeydown);
        window.selectionActive = false;

        if (window.currentHover) {
            window.currentHover.classList.remove("ImageSelection_Hover");
            window.currentHover = null;
        }

        window.selectionActive = false;
    }


    // attaching event listeners
    console.log("Attaching listeners");
    document.addEventListener("mouseover", window.iPmouseOver);
    document.addEventListener("mouseout", window.iPmouseOut);
    document.addEventListener("click", window.iPclick);
    document.addEventListener("keydown", window.iPkeydown);
};

window.initImageSelection();