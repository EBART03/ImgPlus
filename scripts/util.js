// util.js
// custom confirm popup
// made this as a bugfix
// it didn't work in "content.js" so i put it here

export function confirmAction(message = "Are you sure?") {
    return new Promise((resolve) => {
        console.log("Opening popup."); // debug

        const popup = document.getElementById("confirm-popup");
        const yesBtn = document.getElementById("confirm-yes-btn");
        const noBtn = document.getElementById("confirm-no-btn");

        if (!popup || !yesBtn || !noBtn) {
            console.error("Confirmation popup elements not found.");
            return resolve(false);
        }

        popup.querySelector("p").textContent = message;
        popup.style.display = "block";

        const cleanup = () => {
            popup.style.display = "none";
            yesBtn.onclick = null;
            noBtn.onclick = null;
        };

        noBtn.onclick = () => {
            console.log("Clicked 'NO'.")
            cleanup();
            resolve(false);
        };

        yesBtn.onclick = () => {
            console.log("Clicked 'YES'.")
            cleanup();
            resolve(true);
        };

        const onOutsideClick = (event) => {
            if (!popup.contains(event.target)) {
                console.log("Clicked outside popup.");
                cleanup();
                resolve(false);
            }
        };

        setTimeout(() => {
            document.addEventListener("click", onOutsideClick, {once: true});
        }, 0);
    });
}